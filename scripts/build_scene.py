"""blender -b --python scripts/build_scene.py -- [--root PATH] [--styles B A C]"""
import argparse, json, math, random, sys
from pathlib import Path
import bpy
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view


def inside(x,y,ring):
    hit=False
    for a,b in zip(ring,ring[1:]+ring[:1]):
        if (a[1]>y)!=(b[1]>y) and x < (b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]:hit=not hit
    return hit


def main():
    p=argparse.ArgumentParser();p.add_argument('--root',type=Path,default=Path(__file__).resolve().parents[1]);p.add_argument('--styles',nargs='+',choices=['A','B','C'],default=['A','B','C']);p.add_argument('--resolution',type=int,default=1400)
    args=p.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
    root=args.root
    terrain=json.loads((root/'data/terrain.json').read_text());layers=json.loads((root/'data/projected.json').read_text())
    out=root/'public/renders';out.mkdir(parents=True,exist_ok=True);(root/'blender').mkdir(exist_ok=True)
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
    scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=48
    # Distribution Blender has no OpenImageDenoise; use ordinary verified CPU sampling.
    scene.cycles.use_denoising=False
    scene.render.threads_mode='FIXED';scene.render.threads=4
    scene.render.resolution_x=args.resolution;scene.render.resolution_y=round(args.resolution*.72);scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG';scene.render.film_transparent=True
    scene.world.use_nodes=True
    scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.72,.80,.9,1)
    scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.5
    scene.view_settings.view_transform='AgX'
    z=terrain['z'];xs=terrain['x'];ys=terrain['y'];n=len(xs);base=terrain['elevation_min']
    verts=[(x,y,z[j][i]-base) for j,y in enumerate(ys) for i,x in enumerate(xs)]
    faces=[(j*n+i,j*n+i+1,(j+1)*n+i+1,(j+1)*n+i) for j in range(n-1) for i in range(n-1)]
    # The raster rows run north to south; reverse face winding for upward normals.
    faces=[tuple(reversed(f)) for f in faces]
    mesh=bpy.data.meshes.new('Real DEM metre grid');mesh.from_pydata(verts,[],faces);mesh.update()
    mountain=bpy.data.objects.new('Mratkino — actual DEM (1:1)',mesh);scene.collection.objects.link(mountain)
    for poly in mesh.polygons:poly.use_smooth=True
    def material(name,color,roughness=1):
        m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
        bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*color,1);bs.inputs['Roughness'].default_value=roughness
        return m
    snow=material('Snow',(.86,.91,.96));mountain.data.materials.append(snow)
    # A presentation plinth below the measured surface, not additional terrain.
    boundary=[verts[i] for i in range(n)]+[verts[j*n+n-1] for j in range(1,n)]+[verts[(n-1)*n+i] for i in range(n-2,-1,-1)]+[verts[j*n] for j in range(n-2,0,-1)]
    m=len(boundary);wall_verts=boundary+[(v[0],v[1],-150) for v in boundary]
    wall_faces=[(i,(i+1)%m,(i+1)%m+m,i+m) for i in range(m)]+[tuple(range(m,2*m))]
    wall_mesh=bpy.data.meshes.new('Presentation edge, not elevation data');wall_mesh.from_pydata(wall_verts,[],wall_faces);wall_mesh.update()
    wall=bpy.data.objects.new('Neutral presentation plinth',wall_mesh);scene.collection.objects.link(wall);wall_mesh.materials.append(material('Edge',(.55,.64,.62)))

    bark=material('Forest from OSM mask',(.035,.12,.095))
    # A single linked mesh per tree; these are stylised woodland symbols, not surveyed individual trees.
    bpy.ops.mesh.primitive_cone_add(vertices=8,radius1=9,radius2=0,depth=30)
    prototype=bpy.context.object;prototype.name='Tree prototype';prototype.data.materials.append(bark);prototype.hide_render=True
    rng=random.Random(2026)
    forests=[f['geometry']['coordinates'] for f in layers['forest']['features'] if f['geometry']['type']=='Polygon']
    trails=[f['geometry']['coordinates'] for f in layers['trails']['features'] if f['geometry']['type']=='LineString']
    def distance_segment(x,y,a,b):
        dx,dy=b[0]-a[0],b[1]-a[1];den=dx*dx+dy*dy
        t=max(0,min(1,((x-a[0])*dx+(y-a[1])*dy)/den)) if den else 0
        return math.hypot(x-a[0]-t*dx,y-a[1]-t*dy)
    for attempt in range(5000):
        x=rng.uniform(xs[0],xs[-1]);y=rng.uniform(ys[-1],ys[0])
        if not any(inside(x,y,rings[0]) and not any(inside(x,y,h) for h in rings[1:]) for rings in forests):continue
        if any(distance_segment(x,y,a,b)<28 for trail in trails for a,b in zip(trail,trail[1:])):continue
        ix=max(0,min(n-1,round((x-xs[0])/(xs[-1]-xs[0])*(n-1))));iy=max(0,min(n-1,round((ys[0]-y)/(ys[0]-ys[-1])*(n-1))))
        tree=bpy.data.objects.new('OSM woodland symbol',prototype.data);scene.collection.objects.link(tree);tree.location=(x,y,z[iy][ix]-base+15);s=rng.uniform(.7,1.5);tree.scale=(s,s,s)
    bpy.ops.object.light_add(type='AREA',location=(-2000,-4000,6500));light=bpy.context.object;light.data.energy=180000000;light.data.shape='DISK';light.data.size=4500
    light.rotation_euler=(Vector((0,0,0))-light.location).to_track_quat('-Z','Y').to_euler()
    bpy.ops.object.light_add(type='SUN',location=(0,0,5000));bpy.context.object.data.energy=1.5;bpy.context.object.rotation_euler=(.4,-.5,-.4)
    bpy.ops.object.camera_add();camera=bpy.context.object;scene.camera=camera;camera.data.type='ORTHO';camera.data.clip_end=50000
    width=max(xs)-min(xs);height=max(ys)-min(ys);span=max(width,height);camera.data.ortho_scale=span*1.48
    target=Vector((0,0,(terrain['elevation_max']-base)*.35))
    def project(coords):
        if isinstance(coords[0],(float,int)):
            if coords[2] is None:return None
            v=world_to_camera_view(scene,camera,Vector((coords[0],coords[1],coords[2]-base+5)))
            return [round(v.x*scene.render.resolution_x,2),round((1-v.y)*scene.render.resolution_y,2),v.z>0]
        return [project(c) for c in coords]
    for style in args.styles:
        color={'A':(.85,.91,.98),'B':(.91,.93,.94),'C':(.86,.91,.85)}[style]
        snow.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(*color,1)
        bark.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(*{'A':(.025,.095,.07),'B':(.14,.22,.21),'C':(.07,.19,.12)}[style],1)
        # Style C deliberately retains the same geographic mesh and camera calibration.
        for view, direction in [('south',(0.55,-1,.8)),('north',(-.55,1,.8))]:
            camera.location=target+Vector(direction)*span
            camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler();bpy.context.view_layer.update()
            scene.render.filepath=str(out/f'{style}-{view}.png');bpy.ops.render.render(write_still=True)
            overlays={k:[{'type':'Feature','id':f['id'],'properties':{k:f['properties'][k] for k in ['name','osm_id','verification'] if k in f['properties']},'geometry':dict(f['geometry'],coordinates=project(f['geometry']['coordinates']))} for f in v['features']] for k,v in layers.items() if k in ['trails','lifts','facilities']}
            (out/f'{style}-{view}.json').write_text(json.dumps({'width':scene.render.resolution_x,'height':scene.render.resolution_y,'style':style,'view':view,'vertical_exaggeration':1,'layers':overlays,'projection':'Blender orthographic, same camera and DEM as image; no manual offsets'},ensure_ascii=False,separators=(',',':')))
    bpy.ops.wm.save_as_mainfile(filepath=str(root/'blender/mratkino.blend'))
    status_path=root/'public/data/status.json';status=json.loads(status_path.read_text());status.update(ready=True,styles=args.styles,views=['south','north'],message='Рельеф по DEM. Объекты OSM требуют независимой проверки.')
    status_path.write_text(json.dumps(status,ensure_ascii=False,indent=2))

if __name__=='__main__':main()
