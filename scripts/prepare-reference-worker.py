"""Build the metadata sidecar and normalize Blender's sampler for our no-mip GLB policy.
Uses stdlib plus SciPy for offline authoring-hull generation; no browser dependency.
Usage: python scripts/prepare-reference-worker.py
"""
import json, math, struct, sys
from pathlib import Path
from scipy.spatial import ConvexHull
root = Path(__file__).resolve().parents[1]
asset_folder=sys.argv[1] if len(sys.argv)>1 else 'reference-worker'
stem=sys.argv[2] if len(sys.argv)>2 else 'worker'
if asset_folder not in ['reference-worker','reference-scout','reference-bruiser'] or stem not in ['worker','scout','bruiser']: raise ValueError('Unknown project character')
folder = root / 'public/assets' / asset_folder
path = folder / (stem+'.glb')
raw = path.read_bytes()
size = struct.unpack_from('<I', raw, 12)[0]
doc = json.loads(raw[20:20+size])
bin_size, bin_type = struct.unpack_from('<II', raw, 20+size)
binary = raw[28+size:28+size+bin_size]
for node in doc['nodes']:
    if node.get('name','').startswith(stem+'_'): node['name']=node['name'][len(stem)+1:]
for sampler in doc.get('samplers', []):
    sampler['magFilter'] = sampler['minFilter'] = 9728
payload = json.dumps(doc, separators=(',', ':')).encode()
payload += b' ' * (-len(payload) % 4)
path.write_bytes(struct.pack('<III', 0x46546c67, 2, 28+len(payload)+len(binary)) + struct.pack('<II', len(payload), 0x4e4f534a) + payload + struct.pack('<II', len(binary), bin_type) + binary)

def vec(v): return dict(zip(('x','y','z'),v))
q= dict(x=0,y=0,z=0,w=1)
parts=[('head',(0,.76,0),(.115,.145,.105),5),('chest',(0,.435,0),(.235,.18,.125),22),('pelvis',(0,.16,0),(.19,.095,.13),12)]
for s in [-1,1]:
    parts += [(f'upperArm{s}',(s*.34,.43,0),(.07,.16,.075),3),(f'forearm{s}',(s*.34,.10,0),(.065,.16,.07),2),(f'thigh{s}',(s*.115,-.145,0),(.09,.21,.10),8),(f'shin{s}',(s*.115,-.61,.025),(.07,.25,.11),3.5)]

def cube(half,offset=(0,0,0)):
    x,y,z=half
    vs=[(-x,-y,-z),(x,-y,-z),(x,y,-z),(-x,y,-z),(-x,-y,z),(x,-y,z),(x,y,z),(-x,y,z)]
    fs=[(0,3,2,1),(4,5,6,7),(0,1,5,4),(3,7,6,2),(0,4,7,3),(1,2,6,5)]
    return dict(faces=[dict(vertices=[vec(tuple(vs[i][k]+offset[k] for k in range(3))) for i in f],uvs=[dict(u=0,v=0)]*4) for f in fs])
metadata=dict(schemaVersion=1,units='meters',upAxis='Y',parts=[],joints=[])
for name,center,half,mass in parts:
    bounds=list(half)
    if name=='chest': bounds[0]=.27
    if 'upperArm' in name or 'forearm' in name: bounds[1]=.165
    if 'thigh' in name: bounds[1]=.215
    metadata['parts'].append(dict(name=name,position=vec(center),rotation=q,mass=mass,hull=cube(bounds)))
by={p['name']:p for p in metadata['parts']}
links=[('chest','head',(0,.615,0),False,[[-30,30],[-40,40],[-30,30]]),('pelvis','chest',(0,.255,0),False,[[-20,20],[-15,15],[-20,20]])]
for s in [-1,1]:
    links += [('chest',f'upperArm{s}',(s*.265,.57,0),False,[[-55,55],[-40,40],[-55,55]]),(f'upperArm{s}',f'forearm{s}',(s*.34,.265,0),True,[[0,135]]),('pelvis',f'thigh{s}',(s*.115,.065,0),False,[[-25,65],[-25,25],[-35,35]]),(f'thigh{s}',f'shin{s}',(s*.115,-.36,0),True,[[-130,0]])]
# Conservative authoring hull = exported shell plus actual attachment points.
# Unlike boxes, this follows the bevels closely at end corners.
def accessor(index):
    a=doc['accessors'][index];b=doc['bufferViews'][a['bufferView']]
    offset=b.get('byteOffset',0)+a.get('byteOffset',0);stride=b.get('byteStride',12)
    return [tuple(round(x,8) for x in struct.unpack_from('<fff',binary,offset+i*stride)) for i in range(a['count'])]
def convex(points):
    points=list(dict.fromkeys(points));h=ConvexHull(points);faces=[]
    for ids,eq in zip(h.simplices,h.equations):
        a,b,c=[points[i] for i in ids];ab=[b[i]-a[i] for i in range(3)];ac=[c[i]-a[i] for i in range(3)]
        cross=(ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0])
        if sum(cross[i]*eq[i] for i in range(3))<0: ids=list(reversed(ids))
        faces.append(dict(vertices=[vec(points[i]) for i in ids],uvs=[dict(u=0,v=0)]*3))
    return dict(faces=faces)
for p in metadata['parts']:
    node=next(n for n in doc['nodes'] if n['name']==p['name']);primitive=doc['meshes'][node['mesh']]['primitives'][0]
    points=accessor(primitive['attributes']['POSITION'])
    for a,b,anchor,_,_ in links:
        if p['name'] in [a,b]: points.append(tuple(round(anchor[i]-p['position'][k],8) for i,k in enumerate(('x','y','z'))))
    p['hull']=convex(points)
for a,b,anchor,hinge,limits in links:
    anchors=[];tissues=[]
    for name in [a,b]:
        p=by[name];local=tuple(anchor[i]-p['position'][k] for i,k in enumerate(('x','y','z')));anchors.append(vec(local))
        verts=[v for f in p['hull']['faces'] for v in f['vertices']]
        lo=[min(v[k] for v in verts) for k in ('x','y','z')];hi=[max(v[k] for v in verts) for k in ('x','y','z')]
        low=[max(lo[i],local[i]-.012) for i in range(3)];high=[min(hi[i],local[i]+.012) for i in range(3)]
        inward=[local[i]*.92 for i in range(3)]
        tissue=[local,tuple(inward)]
        for axis in range(3):
            point=inward.copy();point[axis]+=.002;tissue.append(tuple(point))
            point=inward.copy();point[axis]-=.002;tissue.append(tuple(point))
        tissues.append(convex(tissue))
    metadata['joints'].append(dict(a=a,b=b,anchorA=anchors[0],anchorB=anchors[1],frameA=q,frameB=q,hinge=hinge,limits=[[math.radians(v) for v in r] for r in limits],connector=dict(a=tissues[0],b=tissues[1])))
(folder/(stem+'.metadata.json')).write_text(json.dumps(metadata,separators=(',',':')),encoding='utf8')
print(f'Prepared {path.stat().st_size} byte GLB, 11-part/10-joint metadata; nearest/no mipchain')
