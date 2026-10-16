import bpy, math
from mathutils import Vector
if bpy.data.collections.get('ATANG_CHARACTER_V2'):
    raise RuntimeError('Atang collection already exists; inspect before rebuilding')
C=bpy.data.collections.new('ATANG_CHARACTER_V2')
bpy.context.scene.collection.children.link(C)
MASTER=bpy.data.objects.new('ATANG_Master',None)
C.objects.link(MASTER)
for name in ['Cube','Light','Camera']:
    obj=bpy.data.objects.get(name)
    if obj:obj.hide_set(True);obj.hide_render=True
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

skin=material('Skin',(.72,.46,.32),.67)
hair=material('Hair',(.022,.013,.011),.32)
shine=material('HairRidges',(.048,.027,.018),.4)
white=material('EyeWhite',(.85,.88,.84),.27)
iris=material('Iris',(.11,.052,.022),.3)
pupil=material('Pupil',(.008,.005,.004),.2)
catch=material('Catchlight',(.95,.98,1),.15)
lip=material('Lip',(.32,.105,.09),.68)
inner=material('EarInner',(.61,.31,.25),.8)
jade=material('HairRibbon',(.045,.23,.21),.8)
gold=material('Gold',(.54,.31,.085),.32,.65)
petal=material('Blossom',(.63,.32,.30),.7)
vertices=[];faces=[];n=64;rows=40
for j in range(rows+1):
    theta=.001+(math.pi-.002)*j/rows;z=1.275+.195*math.cos(theta)
    jaw=.77+.23*min(1,max(0,(z-1.08)/.18))
    for i in range(n):
        phi=2*math.pi*i/n;x=.16*jaw*math.sin(theta)*math.cos(phi);y=.141*math.sin(theta)*math.sin(phi)
        if y<0:
            target=face_y(x,z);blend=max(0,-math.sin(phi))**6;y=y*(1-blend)+target*blend
        vertices.append((x,y,z))
    if j<rows:
        for i in range(n):a=j*n+i;b=j*n+(i+1)%n;faces.append((a,b,b+n,a+n))
faces.extend([tuple(reversed(range(n))),tuple(rows*n+i for i in range(n))])
mesh('SculptedFace',vertices,faces,skin)
for sign in [-1,1]:
    uv('Ear'+str(sign),(sign*.157,.0,1.259),(.027,.018,.043),skin)
    uv('EarFold'+str(sign),(sign*.173,-.008,1.26),(.010,.007,.023),inner,segments=16,rings=10)
    cx=sign*.066;cz=1.294
    vs=[(cx,face_y(cx,cz)-.007,cz)];fs=[]
    for i in range(40):
        a=2*math.pi*i/40;x=cx+.043*math.cos(a);z=cz+.019*math.sin(a)*abs(math.sin(a))**.25
        vs.append((x,face_y(x,z)-.004,z))
    for i in range(40):fs.append((0,i+1,(i+1)%40+1))
    mesh('AlmondEye'+str(sign),vs,fs,white)
    cy=face_y(cx,cz)-.010
    uv('Iris'+str(sign),(cx,cy,cz-.002),(.016,.004,.0175),iris,segments=24,rings=12)
    uv('Pupil'+str(sign),(cx,cy-.0037,cz-.001),(.008,.002,.011),pupil,segments=20,rings=12)
    uv('EyeGlint'+str(sign),(cx-.005,cy-.0053,cz+.005),(.004,.0015,.004),catch,segments=12,rings=8)
    uv('EyeGlintSmall'+str(sign),(cx+.005,cy-.005,cz-.008),(.0016,.001,.0016),catch,segments=8,rings=6)
    for upper in [True,False]:
        points=[]
        for i in range(25):
            a=math.pi*i/24;x=cx+.043*math.cos(a);z=cz+(1 if upper else -1)*.019*math.sin(a)**1.25
            points.append((x,face_y(x,z)-.005,z))
        curve(('UpperLid' if upper else 'LowerLid')+str(sign),points,.0023 if upper else .0011,hair if upper else inner)
    brow=[]
    for i in range(20):
        t=i/19;x=cx-.038+.076*t;z=1.336+.008*math.sin(t*math.pi)
        brow.append((x,face_y(x,z)-.005,z))
    curve('Brow'+str(sign),brow,.0034,shine)
    nostril=[]
    for i in range(10):
        t=i/9;x=sign*(.008+.009*t);z=1.237-.0015*math.sin(t*math.pi)
        nostril.append((x,face_y(x,z)-.001,z))
    curve('Nostril'+str(sign),nostril,.001,inner)
mouth=[]
for i in range(33):
    x=-.028+.056*i/32;z=1.180+.004*(abs(x)/.028)**1.7
    mouth.append((x,face_y(x,z)-.0025,z))
curve('GentleSmile',mouth,.0016,lip)
curve('LowerLip',[(x,face_y(x,1.175)-.002,1.175-.0015*math.cos(x/.021*math.pi/2)) for x in [-.021+i*.042/24 for i in range(25)]],.0011,inner)
# Scalp is fitted to the face and neck, with an irregular swept hairline.
vs=[];fs=[];n=64;rows=24
for j in range(rows+1):
    for i in range(n):
        a=i*2*math.pi/n;end=1.93+.53*max(0,math.sin(a))-.58*max(0,-math.sin(a))
        theta=.002+(end-.002)*j/rows
        vs.append((.171*math.sin(theta)*math.cos(a),.152*math.sin(theta)*math.sin(a)+.008,1.285+.211*math.cos(theta)))
    if j<rows:
        for i in range(n):a=j*n+i;b=j*n+(i+1)%n;fs.append((a,b,b+n,a+n))
mesh('FittedScalp',vs,fs,hair)
for s in [-1,1]:
    for j in range(7):
        control=[(s*(.008+j*.009),-.025+j*.012,1.489-j*.002),(s*.060,-.105,1.48-j*.007),(s*(.12+j*.004),-.157+j*.004,1.41-j*.016),(s*(.146+j*.002),-.096+j*.008,1.32-j*.016)]
        lock('SweptFringe'+str(s)+'_'+str(j),control,.022,.009,hair)
        points=[tuple(bezier(control,i/28)+Vector((0,-.008,0))) for i in range(29)]
        curve('HairStrand'+str(s)+'_'+str(j),points,.0009,shine)
    uv('BraidedBun'+str(s),(s*.154,.043,1.432),(.075,.068,.078),hair)
    for j in range(5):
        points=[]
        for i in range(49):
            a=i*2*math.pi/48;rr=.063+math.cos(a*2+j)*.006
            points.append((s*.154+math.cos(a)*rr,.043+math.sin(a)*.055,1.432+(j-2)*.017+.010*math.cos(a*3)))
        curve('BunBraid'+str(s)+'_'+str(j),points,.006,shine if j%2==0 else hair,cyclic=True)
    for strand in range(3):
        pts=[]
        for i in range(35):
            t=i/34;a=t*math.pi*6+strand*2*math.pi/3
            pts.append((s*(.168+.012*t)+.010*math.sin(a),.018+.010*math.cos(a),1.285-t*.215))
        curve('SideBraid'+str(s)+'_'+str(strand),pts,.0075,hair,'braid.L' if s>0 else 'braid.R')
    uv('BraidTie'+str(s),(s*.18,.018,1.079),(.025,.024,.012),jade,'braid.L' if s>0 else 'braid.R')
    for wing in [-1,1]:
        lock('RibbonBow'+str(s)+'_'+str(wing),[(s*.187,-.005,1.44),(s*.187+wing*.055,-.015,1.48),(s*.187+wing*.055,-.025,1.405),(s*.187,-.005,1.43)],.018,.003,jade)
    for j in range(5):
        a=j*2*math.pi/5;uv('HairFlower'+str(s)+'_'+str(j),(s*.202+math.cos(a)*.017,-.012,1.44+math.sin(a)*.017),(.010,.005,.014),petal,segments=12,rings=8)
    uv('FlowerCenter'+str(s),(s*.202,-.018,1.44),(.006,.005,.006),gold,segments=12,rings=8)
print('HEAD_COMPLETE',len(C.objects),'objects; all local geometry')

