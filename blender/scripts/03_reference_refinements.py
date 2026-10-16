import bpy, math
from mathutils import Vector
C = bpy.data.collections.get('ATANG_CHARACTER_V2')
MASTER = bpy.data.objects.get('ATANG_Master')
def material(name, color, rough=.6, metal=0):
    name='Atang_'+name
    m=bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes=True
    m.node_tree.nodes.clear()
    p=m.node_tree.nodes.new('ShaderNodeBsdfPrincipled')
    o=m.node_tree.nodes.new('ShaderNodeOutputMaterial')
    p.inputs['Base Color'].default_value=(*color,1)
    p.inputs['Roughness'].default_value=rough
    p.inputs['Metallic'].default_value=metal
    m.node_tree.links.new(p.outputs['BSDF'],o.inputs['Surface'])
    m.diffuse_color=(*color,1)
    return m
def register(obj, name, mat, bone='head'):
    obj.name='Atang_'+name
    for collection in list(obj.users_collection): collection.objects.unlink(obj)
    C.objects.link(obj)
    obj.parent=MASTER
    if mat: obj.data.materials.append(mat)
    if obj.type=='MESH':
        for p in obj.data.polygons: p.use_smooth=True
        if bone:
            g=obj.vertex_groups.new(name=bone)
            g.add(list(range(len(obj.data.vertices))),1,'REPLACE')
    return obj
def uv(name, pos, scale, mat, bone='head', segments=24, rings=16):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=rings,location=pos)
    obj=bpy.context.object
    obj.scale=scale
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    return register(obj,name,mat,bone)
def mesh(name, vertices, faces, mat, bone='head', uvs=None):
    data=bpy.data.meshes.new('Atang_'+name+'_Mesh')
    data.from_pydata(vertices,[],faces)
    data.update()
    obj=bpy.data.objects.new('Atang_'+name,data)
    C.objects.link(obj);obj.parent=MASTER
    if mat:data.materials.append(mat)
    for p in data.polygons:p.use_smooth=True
    if bone:
        g=obj.vertex_groups.new(name=bone);g.add(list(range(len(data.vertices))),1,'REPLACE')
    if uvs:
        layer=data.uv_layers.new(name='UVMap')
        for poly,coords in zip(data.polygons,uvs):
            for idx,coord in zip(poly.loop_indices,coords):layer.data[idx].uv=coord
    return obj
def curve(name, points, radius, mat, bone='head', cyclic=False):
    data=bpy.data.curves.new('Atang_'+name,'CURVE')
    data.dimensions='3D';data.resolution_u=3;data.bevel_depth=radius;data.bevel_resolution=2
    spline=data.splines.new('POLY');spline.points.add(len(points)-1)
    for p,xyz in zip(spline.points,points):p.co=(*xyz,1)
    spline.use_cyclic_u=cyclic
    obj=bpy.data.objects.new('Atang_'+name,data);C.objects.link(obj)
    bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
    types={i.identifier for i in bpy.ops.object.convert.get_rna_type().properties['target'].enum_items}
    assert 'MESH' in types
    bpy.ops.object.convert(target='MESH')
    return register(bpy.context.object,name,mat,bone)
def bezier(points,t):
    a,b,c,d=[Vector(p) for p in points]
    return (1-t)**3*a+3*(1-t)**2*t*b+3*(1-t)*t*t*c+t**3*d
def lock(name, control, width, thickness, mat, bone='head'):
    vertices=[];faces=[];n=24;sides=8
    for j in range(n+1):
        t=j/n;p=bezier(control,t)
        tangent=(bezier(control,min(1,t+.005))-bezier(control,max(0,t-.005))).normalized()
        normal=Vector((0,-1,0));wide=tangent.cross(normal).normalized()
        depth=wide.cross(tangent).normalized()
        taper=max(.06,math.sin(math.pi*(t*.92+.035))**.45)*(1-.5*t)
        for k in range(sides):
            a=2*math.pi*k/sides;q=p+wide*(math.cos(a)*width*taper)+depth*(math.sin(a)*thickness*taper)
            vertices.append(tuple(q))
        if j<n:
            for k in range(sides):a=j*sides+k;b=j*sides+(k+1)%sides;faces.append((a,b,b+sides,a+sides))
    faces.extend([tuple(reversed(range(sides))),tuple(n*sides+k for k in range(sides))])
    return mesh(name,vertices,faces,mat,bone)
def face_y(x,z):
    rz=(z-1.275)/.195
    jaw=.77+.23*min(1,max(0,(z-1.08)/.18))
    rx=.16*jaw
    y=-.141*math.sqrt(max(.01,1-(x/rx)**2-rz*rz))
    y-=.023*math.exp(-(x/.025)**2-((z-1.255)/.042)**2)
    y-=.006*math.exp(-(x/.05)**2-((z-1.187)/.03)**2)
    y-=.005*(math.exp(-((x-.085)/.045)**2-((z-1.235)/.045)**2)+math.exp(-((x+.085)/.045)**2-((z-1.235)/.045)**2))
    return y

# Fit the collar to the blouse surface; remove only our preliminary collar pieces.
for obj in list(C.objects):
    if obj.name.startswith('Atang_CrossCollar') or obj.name.startswith('Atang_CollarSeam'):
        bpy.data.objects.remove(obj,do_unlink=True)
jade=bpy.data.materials['Atang_JadeFabric'];thread=bpy.data.materials['Atang_SilkThread']
rose=bpy.data.materials['Atang_RoseFabric'];ivory=bpy.data.materials['Atang_IvoryFabric']
for mat,col in [(ivory,(.86,.82,.74)),(rose,(.68,.43,.46)),(jade,(.24,.39,.32))]:
    shader=next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    shader.inputs['Base Color'].default_value=(*col,1)
    tex=next(n for n in mat.node_tree.nodes if n.type=='TEX_IMAGE')
    pixels=[]
    for y in range(128):
        for x in range(128):
            weave=1+.025*math.sin(x*math.pi/2)*math.cos(y*math.pi/2)+.012*math.sin(x*.47+y*.37)
            pixels.extend([min(1,c*weave) for c in col]+[1])
    tex.image.pixels.foreach_set(pixels);tex.image.update();tex.image.pack()
def blouse_y(x,z):
    rings=[(.77,.145,.106),(.82,.15,.11),(.9,.155,.104),(.98,.17,.091),(1.025,.174,.075),(1.065,.065,.052)]
    rx,ry=rings[-1][1:]
    for i in range(len(rings)-1):
        a,b=rings[i:i+2]
        if a[0]<=z<=b[0]:
            t=(z-a[0])/(b[0]-a[0]);rx=a[1]*(1-t)+b[1]*t;ry=a[2]*(1-t)+b[2]*t;break
    return -ry*math.sqrt(max(.02,1-(x/rx)**2))-.006
def collar_ribbon(name,path,width):
    verts=[];faces=[];uvs=[];n=32
    for i in range(n+1):
        t=i/n;p=bezier(path,t);tangent=(bezier(path,min(1,t+.01))-bezier(path,max(0,t-.01))).normalized()
        across=Vector((-tangent.z,0,tangent.x)).normalized()
        for sign in [-1,1]:
            q=p+across*sign*width*.5;verts.append((q.x,blouse_y(q.x,q.z),q.z))
        if i<n:
            k=i*2;faces.append((k,k+1,k+3,k+2));uvs.append(((0,t),(1,t),(1,(i+1)/n),(0,(i+1)/n)))
    obj=mesh(name,verts,faces,jade,'chest',uvs)
    for edge in [0,1]:
        pts=[tuple(Vector(verts[i*2+edge])+Vector((0,-.002,0))) for i in range(n+1)]
        curve(name+'Stitch'+str(edge),pts,.0014,thread,'chest')
    return obj
collar_ribbon('CollarLeft',[(-.048,0,1.064),(-.075,0,1.045),(-.05,0,.987),(.002,0,.947)],.028)
collar_ribbon('CollarRight',[(.048,0,1.064),(.072,0,1.035),(.03,0,.968),(-.11,0,.821)],.028)
# Gentle hairline, with visible forehead and brows.
cap=bpy.data.objects['Atang_FittedScalp']
for v in cap.data.vertices:
    if v.co.y<0 and v.co.z<1.4:
        front=max(0,min(1,-v.co.y/.15))
        v.co.z+=.038*front**3*max(0,min(1,(1.4-v.co.z)/.08))
hair=bpy.data.materials['Atang_Hair'];shine=bpy.data.materials['Atang_HairRidges']
for j in range(27):
    phi=.08+j*(math.pi-.16)/26;pts=[]
    for i in range(40):
        t=i/39;theta=.12+2.20*t;a=phi+.08*math.sin(t*math.pi)
        pts.append((.174*math.sin(theta)*math.cos(a),.156*math.sin(theta)*math.sin(a)+.008,1.285+.214*math.cos(theta)))
    curve('CombedBackHair'+str(j),pts,.0013,shine)
for s in [-1,1]:
    for j in range(2):
        control=[(s*.19,.045+j*.02,1.44),(s*.215,.065+j*.02,1.38),(s*.21,.085+j*.02,1.24),(s*.23,.08+j*.02,1.16+j*.035)]
        lock('HairSilkTail'+str(s)+'_'+str(j),control,.013,.002,jade)
eye=bpy.data.materials['Atang_EyeWhite']
next(n for n in eye.node_tree.nodes if n.type=='BSDF_PRINCIPLED').inputs['Base Color'].default_value=(.68,.72,.67,1)
print('REFERENCE_REFINEMENTS_COMPLETE',len(C.objects))

