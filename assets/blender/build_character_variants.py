"""Two original dark character variants inspired by image2.png / image3.JPG.
Run in Blender: blender --background --python assets/blender/build_character_variants.py
Then prepare each export:
 python scripts/prepare-reference-worker.py reference-scout scout
 python scripts/prepare-reference-worker.py reference-bruiser bruiser
Does not replace the existing worker or environment collection.
"""
import bpy,bmesh,random,math
from pathlib import Path
from mathutils import Vector,Quaternion
ROOT=Path(__file__).resolve().parents[2]
parts=[('head',(0,.76,0),(.115,.145,.105),5),('chest',(0,.435,0),(.235,.18,.125),22),('pelvis',(0,.16,0),(.19,.095,.13),12)]
for s in [-1,1]:
    parts += [(f'upperArm{s}',(s*.34,.43,0),(.07,.16,.075),3),(f'forearm{s}',(s*.34,.10,0),(.065,.16,.07),2),(f'thigh{s}',(s*.115,-.145,0),(.09,.21,.10),8),(f'shin{s}',(s*.115,-.61,.025),(.07,.25,.11),3.5)]
for variant in ['scout','bruiser']:
    folder=ROOT/('public/assets/reference-'+variant);folder.mkdir(parents=True,exist_ok=True)
    old=bpy.data.collections.get('HT_'+variant)
    if old:
        for obj in list(old.objects): bpy.data.objects.remove(obj,do_unlink=True)
        bpy.data.collections.remove(old)
    col=bpy.data.collections.new('HT_'+variant);bpy.context.scene.collection.children.link(col)
    pixels=[.04,.055,.055,1.]*(128*128);rng=random.Random(342 if variant=='scout' else 343)
    for i,(name,center,half,mass) in enumerate(parts):
        tx=(i%4)*32;ty=(i//4)*40
        for y in range(40):
            for x in range(32):
                n=rng.randrange(-10,11)
                if variant=='scout':
                    base=(86,79,41)
                    if name=='head':
                        base=(83,87,57)
                        if y>30: base=(96,30,37)
                        elif y>25: base=(37,39,30)
                        elif y<18: base=(31,39,41)
                        if 19<=y<=22 and (4<=x<=12 or 19<=x<=27): base=(13,22,23)
                        if 13<=x<=17 and 17<=y<=27: base=(117,108,63)
                        if y in [10,11,14,15]: base=(62,73,64)
                    elif name=='chest':
                        base=(72,73,42)
                        if x<7 or x>25: base=(39,48,40)
                        if 8<x<24 and y>18: base=(111,99,47)
                        if y%9<3 and 6<x<27: base=(36,43,32)
                        if x in [14,15,16]: base=(22,32,29)
                        if y<7: base=(26,32,34)
                    elif name=='pelvis':
                        base=(36,36,42)
                        if y>25: base=(84,31,42)
                        if 12<x<21 and y>25: base=(134,110,52)
                    elif 'upperArm' in name:
                        base=(92,91,61)
                        if y>24: base=(108,93,45)
                        if y in [24,25,32]: base=(40,46,35)
                    elif 'forearm' in name:
                        base=(80,87,61) if y>17 else (35,42,44)
                        if y in [9,10,22,23]: base=(103,86,43)
                    elif 'thigh' in name:
                        base=(44,42,49)
                        if x<6 or x>25: base=(88,76,40)
                        if y<9: base=(72,69,49)
                    elif 'shin' in name:
                        base=(38,43,41)
                        if y<16: base=(97,83,41)
                        if y in [6,7,18,19]: base=(24,32,29)
                else:
                    base=(108,57,47)
                    if name=='head':
                        base=(115,69,51)
                        if y>30: base=(33,25,27)
                        if y<10: base=(39,33,32)
                        if 17<=y<=21 and (5<=x<=12 or 20<=x<=27): base=(32,25,27)
                        if 13<=x<=17 and 11<y<25: base=(132,87,61)
                        if y in [10,11] and 10<x<24: base=(55,36,33)
                        if x in [7,8] and y>22: base=(97,31,30)
                    elif name=='chest':
                        base=(106,48,41)
                        if 15<y<29: base=(139,67,51)
                        if 14<=x<=17 or y in [10,11,20,21]: base=(65,34,32)
                        if y>32: base=(79,40,38)
                        if 5<x<10 and 23<y<29: base=(46,34,35)
                    elif name=='pelvis':
                        base=(29,35,35)
                        if y>25: base=(110,90,41)
                        if 12<x<21 and y>25: base=(156,122,51)
                        if 12<x<19 and y<25: base=(74,66,50)
                    elif 'upperArm' in name:
                        base=(124,59,45)
                        if y>29: base=(87,37,38)
                        if y in [10,11,27,28]: base=(75,36,33)
                    elif 'forearm' in name:
                        base=(34,34,38) if y<25 else (101,51,40)
                        if y in [23,24]: base=(127,97,40)
                    elif 'thigh' in name:
                        base=(30,37,38)
                        if x in [5,6,16,17,26,27]: base=(47,51,48)
                        if y<8: base=(59,59,49)
                    elif 'shin' in name:
                        base=(34,40,39)
                        if y<14: base=(86,76,49)
                        if y<5: base=(90,28,33)
                        if x in [10,11,19,20] and y>17: base=(18,27,27)
                offset=((ty+y)*128+tx+x)*4;pixels[offset:offset+4]=[max(0,min(255,c+n))/255 for c in base]+[1]
    for y in range(120,128):
        for x in range(128): pixels[(y*128+x)*4:(y*128+x)*4+4]=[1,1,1,1]
    image=bpy.data.images.get('HT_'+variant+'_atlas')
    if image: bpy.data.images.remove(image)
    image=bpy.data.images.new('HT_'+variant+'_atlas',width=128,height=128,alpha=True);image.pixels.foreach_set(pixels);image.filepath_raw=str(folder/(variant+'-atlas.png'));image.file_format='PNG';image.save();image.pack()
    mat=bpy.data.materials.get('HT_'+variant+'_cloth') or bpy.data.materials.new('HT_'+variant+'_cloth');mat.use_nodes=True;nodes=mat.node_tree.nodes;nodes.clear();output=nodes.new('ShaderNodeOutputMaterial');shader=nodes.new('ShaderNodeBsdfPrincipled');tex=nodes.new('ShaderNodeTexImage');tex.image=image;tex.interpolation='Closest';shader.inputs['Roughness'].default_value=1
    mat.node_tree.links.new(tex.outputs['Color'],shader.inputs['Base Color']);mat.node_tree.links.new(shader.outputs['BSDF'],output.inputs['Surface'])
    ring=[(-1,-.6),(-.6,-1),(.6,-1),(1,-.6),(1,.6),(.6,1),(-.6,1),(-1,.6)]
    for i,(name,center,half,mass) in enumerate(parts):
        hx,hy,hz=half;levels=[(-1,.72),(-.78,1),(.78,1),(1,.72)]
        if variant=='scout':
            if name=='chest': hx*=.94;hz*=.95
            if 'thigh' in name: hx*=.84;hz*=.87
            if 'shin' in name: hx*=.88
            if 'upperArm' in name: hx*=1.09
            if name=='head': levels=[(-1,.69),(-.65,.96),(.2,1),(.73,.9),(1,.46)]
        else:
            if name=='chest': hx*=1.025;hz*=1.1
            if 'upperArm' in name: hx*=1.28;hz*=1.18
            if 'forearm' in name: hx*=1.12
            if 'thigh' in name: hx*=1.17;hz*=1.09
            if name=='head': hx*=1.06;levels=[(-1,.80),(-.7,1),(.7,1),(1,.84)]
        bm=bmesh.new()
        for y,factor in levels:
            for x,z in ring:
                width=factor*(1+.05*y if name=='chest' else 1+.08*y if 'upperArm' in name else 1)
                xx=x*hx*width;yy=y*hy;zz=z*hz*factor
                if variant=='scout' and name=='head' and y==1: yy+=.014;xx*=.5
                bm.verts.new((xx,-zz,yy))
        bmesh.ops.convex_hull(bm,input=list(bm.verts),use_existing_faces=False);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
        mesh=bpy.data.meshes.new('HT_'+variant+'_'+name);bm.to_mesh(mesh);bm.free();mesh.materials.append(mat)
        obj=bpy.data.objects.new(variant+'_'+name,mesh);col.objects.link(obj);obj.location=(center[0],-center[2],center[1]);obj['game_limb']=name;obj['mass_kg']=mass
        tx=(i%4)*32;ty=(i//4)*40;uv=mesh.uv_layers.new(name='UVMap')
        for p in mesh.polygons:
            for li,vi in zip(p.loop_indices,p.vertices):
                vtx=mesh.vertices[vi].co;x,y,z=vtx.x,vtx.z,-vtx.y;n=p.normal
                u=x/(2*hx)+.5 if abs(n.y)>=abs(n.x) else z/(2*hz)+.5;v=y/(2*hy)+.5
                if abs(n.z)>max(abs(n.x),abs(n.y)): v=z/(2*hz)+.5
                uv.data[li].uv=((tx+2+max(0,min(1,u))*27)/128,(ty+2+max(0,min(1,v))*35)/128)
    bpy.ops.object.select_all(action='DESELECT')
    for obj in col.objects: obj.select_set(True)
    bpy.context.view_layer.objects.active=col.objects[0]
    bpy.ops.export_scene.gltf(filepath=str(folder/(variant+'.glb')),export_format='GLB',use_selection=True,export_yup=True,export_normals=True,export_texcoords=True,export_materials='EXPORT',export_animations=False,export_extras=False)
    print(variant,sum(len(p.vertices)-2 for obj in col.objects for p in obj.data.polygons),'triangles')
# Only viewport visibility changes; old worker/shaft datablocks are retained.
for obj in bpy.context.scene.objects: obj.hide_set(obj.name not in [o.name for v in ['scout','bruiser'] for o in bpy.data.collections['HT_'+v].objects])
for obj in bpy.data.collections['HT_scout'].objects: obj.location.x-=.6
for obj in bpy.data.collections['HT_bruiser'].objects: obj.location.x+=.6
if bpy.context.screen:
    for area in bpy.context.screen.areas:
        if area.type=='VIEW_3D':
            area.spaces.active.region_3d.view_rotation=Quaternion((1,0,0),math.radians(90));area.spaces.active.region_3d.view_location=Vector((0,0,.05));area.spaces.active.region_3d.view_distance=4.8;area.spaces.active.shading.type='MATERIAL'
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/blender/character-variants.blend'))
