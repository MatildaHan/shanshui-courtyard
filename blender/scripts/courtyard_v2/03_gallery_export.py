# Execute common + this file after body/roof. Owns gallery and final asset export.
gallery_tiles=0
for gx,gz,length,rotation in [(-10,-.5,13.5,math.pi*.5),(10,-.5,13.5,math.pi*.5),(0,-9.5,22,0)]:
    # Build a local complete timber gallery, then rigidly transform its batches.
    before={key:len(value[0]) for key,value in B.items()}
    box('corridor','stoneDark',(0,.075,0),(length,.35,2.65))
    box('corridor','stone',(0,.235,0),(length+.10,.10,2.70))
    n=round(length/2.4)
    for i in range(n+1):
        xx=-length*.5+i*length/n
        for zz in [-.95,.95]:
            column(xx,zz,.285,2.06,'corridor',.123)
            box('corridor','wood',(xx,2.72,zz),(.24,.14,.24))
            for axis in ['x','z']:
                curved_bracket(xx,2.83,zz,.61,axis,'red','corridor',.09)
            for sign in [-1,1]:
                box('corridor','goldDark',(xx+sign*.24,2.97,zz),(.15,.055,.16))
        beam('corridor','wood',(xx,2.69,-.99),(xx,2.69,.99),.15,.20)
    for zz in [-.95,.95]:
        beam('corridor','wood',(-length*.5-.12,2.72,zz),(length*.5+.12,2.72,zz),.21,.24)
        for yy in [2.62,2.82]:
            beam('corridor','goldDark',(-length*.5-.12,yy,zz),(length*.5+.12,yy,zz),.225,.022)
        rail((-length*.5,0,zz),(length*.5,0,zz),.285,'corridor')
    # Roof timber and visible floor joints are not texture-painted.
    for i in range(math.ceil(length/.46)):
        xx=-length*.5+(i+.5)*length/math.ceil(length/.46)
        box('corridor','stoneDark',(xx,.289,0),(.013,.005,2.54))
    co=math.cos(rotation);si=math.sin(rotation)
    for key,(vv,ff) in B.items():
        first=before.get(key,0)
        for i in range(first,len(vv)):
            x,y,z=vv[i];vv[i]=(gx+x*co+z*si,y,gz-x*si+z*co)
    gallery_tiles+=roof_geometry(length*.5+.55,1.62,.95,3.04,'corridor',origin=(gx,0,gz),rot=rotation,density=.70)
# Quiet plaster perimeter with raised stone feet, layered grey tile caps.
for sx in [-1,1]:
    box('corridor','stoneDark',(sx*16.3,.11,-2),(.57,.32,25.2))
    box('corridor','wall',(sx*16.3,1.35,-2),(.40,2.36,25.0))
    box('corridor','stone',(sx*16.3,.39,-2),(.48,.16,25.1))
    box('corridor','tileDark',(sx*16.3,2.57,-2),(.61,.16,25.5))
    for j in range(101):
        zz=-14.5+j*.25
        # Convex coping tile split into a curved top and lower lip.
        pts=[(sx*16.3-.33,2.65,zz),(sx*16.3,2.74,zz),(sx*16.3+.33,2.65,zz)]
        tube('corridor','tile'+str(j%4),pts,.078,6)
    for zz in [-14.3,10.5]:
        box('corridor','stone',(sx*16.3,1.33,zz),(.72,2.92,.72))
        box('corridor','tileDark',(sx*16.3,2.86,zz),(.94,.17,.94))
for x,w in [(-10.30,12),(0,5.90),(10.30,12)]:
    box('corridor','stoneDark',(x,.13,-14.3),(w,.32,.58))
    box('corridor','wall',(x,1.35,-14.3),(w,2.40,.40))
    box('corridor','tileDark',(x,2.61,-14.3),(w+.16,.17,.66))
    for j in range(math.ceil(w/.25)):
        xx=x-w*.5+(j+.5)*w/math.ceil(w/.25)
        tube('corridor','tile'+str(j%4),[(xx,2.70,-14.64),(xx,2.79,-14.3),(xx,2.70,-13.96)],.078,6)
# Small openwork circular windows enrich the rear wall without adding signage.
for x in [-10.5,10.5]:
    for zz in [-14.525,-14.075]:
        pts=[(x+.70*math.cos(i*math.tau/48),1.50+.70*math.sin(i*math.tau/48),zz) for i in range(49)]
        tube('corridor','stone',pts,.080,8)
        for j in range(-2,3):
            off=j*.21;reach=math.sqrt(.64*.64-off*off)
            beam('corridor','wood',(x+off,1.50-reach,zz),(x+off,1.50+reach,zz),.035,.04)
            beam('corridor','wood',(x-reach,1.50+off,zz),(x+reach,1.50+off,zz),.035,.04)
flush('gallery')
ROOT['corridorTileCount']=gallery_tiles
ROOT['tileCount']=ROOT.get('mainTileCount',0)+gallery_tiles
ROOT['modelingReference']='assets/concepts/courtyard-atang-anime-v2.png : left architectural half'
ROOT['construction']='real solid mesh tiles, columns, curved dougong, timber lattice, furniture and stairs; no external textures'
ROOT['collisionContract']='main walls x+-5.42/z+-3.44; upper x+-3.93/z+-2.4; side galleries x+-10,z-.5; rear z-9.5'
ROOT['reservedActionArea']='x 6.35..8.85, z 7.8..10.2: no architecture geometry'
# Select only this architecture collection. Existing character scenes survive.
bpy.context.window.scene=S
for ob in S.objects:ob.select_set(False)
for ob in C.objects:ob.select_set(True)
bpy.context.view_layer.objects.active=ROOT
mesh_objects=[ob for ob in C.objects if ob.type=='MESH']
triangles=sum(sum(len(poly.vertices)-2 for poly in ob.data.polygons) for ob in mesh_objects)
ROOT['meshCount']=len(mesh_objects)
ROOT['triangleCount']=triangles
ROOT['materialCount']=len(set(mat.name for ob in mesh_objects for mat in ob.data.materials))
# No cameras, lights or world settings are exported into the game asset.
bpy.ops.wm.save_as_mainfile(filepath=OUT+'blender/Courtyard.blend')
bpy.ops.export_scene.gltf(filepath=OUT+'assets/architecture/courtyard.glb',export_format='GLB',use_selection=True,use_active_scene=True,export_animations=False,export_extras=True,export_apply=True,export_materials='EXPORT',export_yup=True)
print('COURTYARD_COMPLETE',{'meshes':len(mesh_objects),'triangles':triangles,'tiles':ROOT['tileCount'],'materials':ROOT['materialCount'],'blend':OUT+'blender/Courtyard.blend','glb':OUT+'assets/architecture/courtyard.glb'})
