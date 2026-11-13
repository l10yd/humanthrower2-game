"""Original low-poly art prototype. Run in Blender's scripting workspace or:
blender --background --python assets/blender/build_reference_worker.py
Then run: python scripts/prepare-reference-worker.py (offline SciPy required).
Only HT_ReferenceWorker is replaced; the user's other objects are preserved.
"""
import bpy, bmesh, math, random
from pathlib import Path
from mathutils import Quaternion, Vector
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'public/assets/reference-worker';OUT.mkdir(parents=True,exist_ok=True)
old=bpy.data.collections.get('HT_ReferenceWorker')
if old:
    for obj in list(old.objects): bpy.data.objects.remove(obj,do_unlink=True)
    bpy.data.collections.remove(old)
col=bpy.data.collections.new('HT_ReferenceWorker');bpy.context.scene.collection.children.link(col)
parts=[('head',(0,.76,0),(.115,.145,.105),5),('chest',(0,.435,0),(.235,.18,.125),22),('pelvis',(0,.16,0),(.19,.095,.13),12)]
for s in [-1,1]:
    parts += [(f'upperArm{s}',(s*.34,.43,0),(.07,.16,.075),3),(f'forearm{s}',(s*.34,.10,0),(.065,.16,.07),2),(f'thigh{s}',(s*.115,-.145,0),(.09,.21,.10),8),(f'shin{s}',(s*.115,-.61,.025),(.07,.25,.11),3.5)]
pixels=[.04,.065,.065,1.]*(128*128);rng=random.Random(311);tiles={}
for i,(name,_,_,_) in enumerate(parts):
    tx=(i%4)*32;ty=(i//4)*40;tiles[name]=(tx,ty)
    for y in range(40):
        for x in range(32):
            n=rng.randrange(-10,11);base=(105,116,82) if name=='head' else (44,72,77) if 'Arm' in name else (34,52,59)
            if name=='head':
                if y>31: base=(18,27,26)
                elif 26<=y<=31: base=(30,73,105)
                elif y<7: base=(58,79,66)
                if 17<=y<=20 and (5<=x<=10 or 20<=x<=26): base=(28,40,31)
                if 10<=y<=11 and 10<=x<=23: base=(51,58,43)
                if 12<=x<=17 and 12<=y<=22: base=(123,130,91)
            elif name=='chest':
                base=(29,48,54)
                if 5<x<27 and 5<y<32: base=(45,72,77) if y%8>2 else (17,32,37)
                if x in [5,6,25,26]: base=(18,31,36)
                if x in [15,16]: base=(69,83,77)
                if y>32: base=(24,43,54)
                if 10<x<14 and 24<y<29: base=(92,107,96)
            elif name=='pelvis':
                if 25<=y<=31: base=(14,25,29)
                if 12<=x<=18 and 25<=y<=31: base=(117,111,76)
                if x in [5,6,24,25] and y<22: base=(16,30,36)
            elif 'forearm' in name:
                if y<11: base=(17,28,31)
                if y in [12,13,21,22]: base=(15,29,35)
            elif 'upperArm' in name:
                if y>26: base=(24,39,45)
                if y in [24,25]: base=(71,88,84)
            elif 'shin' in name:
                if y<13: base=(17,26,27)
                if y in [6,7]: base=(58,65,55)
                if 25<y<35 and 8<x<24: base=(49,66,70)
            elif 'thigh' in name:
                if x in [6,7,24,25]: base=(17,30,36)
                if 10<y<25 and 9<x<24: base=(43,64,67)
            offset=((ty+y)*128+tx+x)*4;pixels[offset:offset+4]=[max(0,min(255,c+n))/255 for c in base]+[1]
for y in range(120,128):
    for x in range(128): pixels[(y*128+x)*4:(y*128+x)*4+4]=[1,1,1,1]
image=bpy.data.images.get('HT_Worker_Atlas')
if image: bpy.data.images.remove(image)
image=bpy.data.images.new('HT_Worker_Atlas',width=128,height=128,alpha=True);image.pixels.foreach_set(pixels)
image.filepath_raw=str(OUT/'worker-atlas.png');image.file_format='PNG';image.save();image.pack()
mat=bpy.data.materials.get('HT_Worker_PixelCloth') or bpy.data.materials.new('HT_Worker_PixelCloth');mat.use_nodes=True;nodes=mat.node_tree.nodes;nodes.clear()
output=nodes.new('ShaderNodeOutputMaterial');bsdf=nodes.new('ShaderNodeBsdfPrincipled');tex=nodes.new('ShaderNodeTexImage');tex.image=image;tex.interpolation='Closest';bsdf.inputs['Roughness'].default_value=1
mat.node_tree.links.new(tex.outputs['Color'],bsdf.inputs['Base Color']);mat.node_tree.links.new(bsdf.outputs['BSDF'],output.inputs['Surface'])
ring=[(-1,-.6),(-.6,-1),(.6,-1),(1,-.6),(1,.6),(.6,1),(-.6,1),(-1,.6)]
for name,center,half,mass in parts:
    hx,hy,hz=half;levels=[(-1,.72),(-.78,1),(.78,1),(1,.72)]
    if name=='head': levels=[(-1,.65),(-.74,.9),(.14,1),(.8,.94),(1,.70)]
    bm=bmesh.new()
    for y,factor in levels:
        for x,z in ring:
            width=factor*(1+.06*y if name=='chest' else 1+.08*y if 'upperArm' in name else 1)
            bm.verts.new((x*hx*width,-z*hz*factor,y*hy))
    bmesh.ops.convex_hull(bm,input=list(bm.verts),use_existing_faces=False)
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
    mesh=bpy.data.meshes.new('HT_Convex_'+name);bm.to_mesh(mesh);bm.free();mesh.materials.append(mat)
    obj=bpy.data.objects.new(name,mesh);col.objects.link(obj);obj.location=(center[0],-center[2],center[1]);obj['game_limb']=name;obj['mass_kg']=mass
    tx,ty=tiles[name];uv=mesh.uv_layers.new(name='UVMap')
    for p in mesh.polygons:
        for li,vi in zip(p.loop_indices,p.vertices):
            vtx=mesh.vertices[vi].co;x,y,z=vtx.x,vtx.z,-vtx.y;n=p.normal
            u=x/(2*hx)+.5 if abs(n.y)>=abs(n.x) else z/(2*hz)+.5;v=y/(2*hy)+.5
            if abs(n.z)>max(abs(n.x),abs(n.y)): v=z/(2*hz)+.5
            uv.data[li].uv=((tx+2+max(0,min(1,u))*27)/128,(ty+2+max(0,min(1,v))*35)/128)
bpy.ops.object.select_all(action='DESELECT')
for obj in col.objects: obj.select_set(True)
bpy.context.view_layer.objects.active=bpy.data.objects['chest']
bpy.ops.export_scene.gltf(filepath=str(OUT/'worker.glb'),export_format='GLB',use_selection=True,export_yup=True,export_normals=True,export_texcoords=True,export_materials='EXPORT',export_animations=False,export_extras=False)
cube=bpy.data.objects.get('Cube')
if cube: cube.hide_set(True);cube.hide_render=True
if bpy.context.screen:
    for area in bpy.context.screen.areas:
        if area.type=='VIEW_3D':
            area.spaces.active.region_3d.view_rotation=Quaternion((1,0,0),math.radians(90));area.spaces.active.region_3d.view_location=Vector((0,0,.05));area.spaces.active.region_3d.view_distance=2.8;area.spaces.active.shading.type='MATERIAL'
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/blender/reference-worker.blend'))
print('11 rigid convex shells exported. Run scripts/prepare-reference-worker.py before deployment.')
