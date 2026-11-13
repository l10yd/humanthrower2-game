"""Original industrial shaft authoring. Run with Blender --background --python.
Then: python scripts/prepare-industrial-shaft.py. Runtime has no Blender dependency.
Replaces only HT_IndustrialShaft; other user objects are preserved.
"""
import bpy, random
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'public/assets/industrial-shaft';OUT.mkdir(parents=True,exist_ok=True)
old=bpy.data.collections.get('HT_IndustrialShaft')
if old:
    for o in list(old.objects): bpy.data.objects.remove(o,do_unlink=True)
    bpy.data.collections.remove(old)
col=bpy.data.collections.new('HT_IndustrialShaft');bpy.context.scene.collection.children.link(col)
pixels=[0,0,0,1.]*(128*128);rng=random.Random(320)
for y in range(128):
    for x in range(128):
        tx=x//64;ty=y//64;n=rng.randrange(-9,10);lx=x%64;ly=y%64
        if tx==0 and ty==0:
            base=(58,74,67)
            if lx%32<2 or ly%32<2: base=(22,34,29)
            if (lx*3+ly*7)%43<3: base=(44,60,49)
            if ly<9 and (lx//5)%3==0: base=(34,50,37)
        elif tx==1 and ty==0:
            base=(52,65,62)
            if (lx*5+ly*3)%37<11: base=(75,47,29)
            if lx in [4,5,58,59]: base=(95,79,48)
            if ly%16<2: base=(24,34,32)
        elif tx==0 and ty==1:
            base=(132,112,53) if (lx+ly)//10%2 else (19,29,27)
            if ly<3 or ly>60: base=(37,43,35)
        else: base=(37,53,49) if lx%8<3 and ly%8<3 else (11,21,19)
        i=(y*128+x)*4;pixels[i:i+4]=[max(0,min(255,c+n))/255 for c in base]+[1]
image=bpy.data.images.get('HT_Shaft_Atlas')
if image: bpy.data.images.remove(image)
image=bpy.data.images.new('HT_Shaft_Atlas',width=128,height=128,alpha=True);image.pixels.foreach_set(pixels);image.filepath_raw=str(OUT/'shaft-atlas.png');image.file_format='PNG';image.save();image.pack()
mat=bpy.data.materials.get('HT_Shaft_PixelMetal') or bpy.data.materials.new('HT_Shaft_PixelMetal');mat.use_nodes=True;nodes=mat.node_tree.nodes;nodes.clear();out=nodes.new('ShaderNodeOutputMaterial');shader=nodes.new('ShaderNodeBsdfPrincipled');tex=nodes.new('ShaderNodeTexImage');tex.image=image;tex.interpolation='Closest';shader.inputs['Roughness'].default_value=1;shader.inputs['Metallic'].default_value=0
mat.node_tree.links.new(tex.outputs['Color'],shader.inputs['Base Color']);mat.node_tree.links.new(shader.outputs['BSDF'],out.inputs['Surface'])
groups={name:[] for name in ['shaft_back','shaft_floor','shaft_left','shaft_right','shaft_rail_left','shaft_rail_right','shaft_header','shaft_vents','shaft_pipes','shaft_lamps','shaft_braces']}
def box(name,center,size,tile): groups[name].append((center,size,tile))
for row in range(4):
    for column in range(3): box('shaft_back',(-3+column*3,1.375+row*2.75,-1.39),(3,2.75,.35),0)
box('shaft_floor',(0,-.175,0),(9.7,.35,3.1),2)
for s in [-1,1]:
    side='left' if s<0 else 'right'
    box('shaft_'+side,(s*4.675,5.5,0),(.35,11,2.4),1);box('shaft_rail_'+side,(s*4.48,5.5,1.1),(.16,11,.24),1)
    for y in [1,3,5,7,9]: box('shaft_braces',(s*4.38,y,1.09),(.18,.11,.27),2)
    box('shaft_pipes',(s*3.85,5.45,-1.17),(.11,10.7,.12),1)
    for y in [1,4,7,10]: box('shaft_pipes',(s*3.85,y,-1.15),(.2,.12,.15),1)
    for y in [2.6,6.4,10.2]: box('shaft_lamps',(s*4.37,y,1.05),(.1,.35,.12),2)
box('shaft_header',(0,11.24,0),(9.7,.48,2.65),1);box('shaft_header',(0,11.02,1.31),(9.6,.14,.09),2)
for y in [2.6,5.6,9.5]: box('shaft_vents',(0,y,-1.18),(1.5,.7,.07),3)
for y in [1.6,5.6,9.5]: box('shaft_braces',(0,y+.4,-1.17),(1.7,.08,.08),1)
for y in [2.8,6.8,10.8]: box('shaft_braces',(0,y,-1.18),(7.4,.07,.075),1)
for name,boxes in groups.items():
    vertices=[];faces=[];tiles=[]
    for center,size,tile in boxes:
        cx,cy,cz=center;hx,hy,hz=[v/2 for v in size];offset=len(vertices)
        vertices += [(x+cx,-(z+cz),y+cy) for x,y,z in [(-hx,-hy,-hz),(hx,-hy,-hz),(hx,hy,-hz),(-hx,hy,-hz),(-hx,-hy,hz),(hx,-hy,hz),(hx,hy,hz),(-hx,hy,hz)]]
        for f in [(0,3,2,1),(4,5,6,7),(0,1,5,4),(3,7,6,2),(0,4,7,3),(1,2,6,5)]: faces.append(tuple(offset+i for i in f));tiles.append(tile)
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(vertices,[],faces);mesh.update();obj=bpy.data.objects.new(name,mesh);col.objects.link(obj);mesh.materials.append(mat);uv=mesh.uv_layers.new(name='UVMap')
    for p,tile in zip(mesh.polygons,tiles):
        tx=(tile%2)*64;ty=(tile//2)*64
        for li,value in zip(p.loop_indices,[(0,0),(0,1),(1,1),(1,0)]): uv.data[li].uv=((tx+2+value[0]*59)/128,(ty+2+value[1]*59)/128)
bpy.ops.object.select_all(action='DESELECT')
for obj in col.objects: obj.select_set(True)
bpy.context.view_layer.objects.active=bpy.data.objects['shaft_back']
bpy.ops.export_scene.gltf(filepath=str(OUT/'shaft.glb'),export_format='GLB',use_selection=True,export_yup=True,export_normals=True,export_texcoords=True,export_materials='EXPORT',export_animations=False,export_extras=False)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/blender/industrial-shaft.blend'))
print('11 mesh groups /648triangles; run sampler preparation before deployment')
