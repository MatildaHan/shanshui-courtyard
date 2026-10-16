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

import bmesh
scene=bpy.context.scene;scene.name='ATANG_ANIME_V3'
rig=bpy.data.objects['Atang_Rig'];body=bpy.data.objects['Atang_SkinnedCharacter']
rig.animation_data.action=None
for p in rig.pose.bones:p.rotation_quaternion=(1,0,0,0);p.location=(0,0,0)
# Replace the old head and all hair rather than layering a second face over it.
remove=[]
for v in body.data.vertices:
    if any(body.vertex_groups[g.group].name in ['head','braid.L','braid.R'] and g.weight>.01 for g in v.groups):remove.append(v.index)
bm=bmesh.new();bm.from_mesh(body.data);bm.verts.ensure_lookup_table()
bmesh.ops.delete(bm,geom=[bm.verts[i] for i in remove],context='VERTS');bm.to_mesh(body.data);bm.free()
skin=material('AnimeSkin',(.87,.65,.54),.94)
hair=material('AnimeHair',(.064,.037,.027),.58)
hlight=material('AnimeHairLight',(.11,.067,.046),.64)
hdark=material('AnimeHairShadow',(.032,.021,.020),.72)
lash=material('AnimeLash',(.023,.012,.014),.85)
pink=material('AnimeLip',(.46,.19,.19),.85)
ivory=bpy.data.materials['Atang_IvoryFabric'];jade=bpy.data.materials['Atang_JadeFabric']
gold=material('AnimeGold',(.57,.38,.16),.5,.35)
petal=material('AnimeFlower',(.87,.61,.58),.8)
green=material('AnimeJade',(.16,.35,.28),.7)
def face_y(x,z):
    rz=(z-1.29)/.194
    jaw=.72+.28*min(1,max(0,(z-1.105)/.165))
    front=-.148*math.sqrt(max(.015,1-(x/(.164*jaw))**2-rz*rz))
    front-=.012*math.exp(-(x/.024)**2-((z-1.267)/.029)**2)
    front-=.004*math.exp(-(x/.055)**2-((z-1.20)/.03)**2)
    return front
vs=[];fs=[];cols=80;rows=48
for j in range(rows+1):
    th=.002+(math.pi-.004)*j/rows;z=1.29+.194*math.cos(th)
    jaw=.72+.28*min(1,max(0,(z-1.105)/.165))
    for i in range(cols):
        ph=i*math.tau/cols;x=.164*jaw*math.sin(th)*math.cos(ph);y=.148*math.sin(th)*math.sin(ph)
        if y<0:y=face_y(x,z)
        vs.append((x,y,z))
    if j<rows:
        for i in range(cols):a=j*cols+i;b=j*cols+(i+1)%cols;fs.append((a,b,b+cols,a+cols))
face=mesh('AnimeFace',vs,fs,skin)
# Skin tint is a smooth vertex field, including subtle blush; it exports with glTF.
colors=face.data.color_attributes.new(name='FaceTint',type='FLOAT_COLOR',domain='POINT')
for v in face.data.vertices:
    x,y,z=v.co
    cheek=math.exp(-((abs(x)-.097)/.036)**2-((z-1.255)/.024)**2)*max(0,-y/.14)
    colors.data[v.index].color=(.87+.035*cheek,.65-.16*cheek,.54-.08*cheek,1)
shader=next(n for n in skin.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
color_node=skin.node_tree.nodes.new('ShaderNodeVertexColor');color_node.layer_name='FaceTint'
skin.node_tree.links.new(color_node.outputs['Color'],shader.inputs['Base Color'])
shader.inputs['Specular IOR Level'].default_value=.18
# Separate skin material for ears, so missing vertex colors cannot darken them.
earskin=material('AnimeEarSkin',(.87,.65,.54),.94)
for s in [-1,1]:
    uv('AnimeEar'+str(s),(s*.159,.005,1.275),(.023,.017,.038),earskin)
    curve('AnimeEarFold'+str(s),[(s*.17,-.01,1.293),(s*.177,-.012,1.276),(s*.169,-.01,1.26)],.002,pink)
# One painted iris/sclera atlas, geometrically fitted to each eye socket.
eye=material('AnimeEye',(.9,.9,.9),.65)
im=bpy.data.images.new('Atang_AmberEyePaint',width=256,height=256,alpha=True);pix=[]
for yy in range(256):
    v=yy/255
    for xx in range(256):
        u=xx/255;r=math.sqrt(((u-.5)/.235)**2+((v-.49)/.49)**2)
        col=[.94,.89,.83]
        if r<1:
            theta=math.atan2((v-.49)/.49,(u-.5)/.235)
            stripe=.04*math.sin(theta*45)+.025*math.sin(theta*77)
            shade=.32+.68*(1-v)
            col=[(.50+.22*(1-r)+stripe)*shade,(.24+.20*(1-r)+stripe*.5)*shade,(.07+.09*(1-r))*shade]
            if r>.88:col=[c*(.45+(1-r)*3) for c in col]
            pupil_r=math.sqrt(((u-.50)/.077)**2+((v-.56)/.26)**2)
            if pupil_r<1:col=[.032,.018,.020]
            if ((u-.43)/.043)**2+((v-.73)/.078)**2<1:col=[1,.98,.88]
            if ((u-.56)/.022)**2+((v-.29)/.037)**2<1:col=[.97,.83,.52]
        pix.extend(col+[1])
im.pixels.foreach_set(pix);im.pack()
shader=next(n for n in eye.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
tex=eye.node_tree.nodes.new('ShaderNodeTexImage');tex.image=im
eye.node_tree.links.new(tex.outputs['Color'],shader.inputs['Base Color'])
eye.node_tree.links.new(tex.outputs['Color'],shader.inputs['Emission Color']);shader.inputs['Emission Strength'].default_value=.12
for s in [-1,1]:
    cx=s*.067;cz=1.313;vs=[];fs=[];uvs=[];n=64
    for j in range(9):
        rr=j/8
        for i in range(n):
            a=i*math.tau/n;xx=math.cos(a)*rr;zz=math.sin(a)*rr
            x=cx+.051*xx;z=cz+.030*zz*(1-.10*abs(xx))+.004*s*xx
            y=face_y(x,z)-.0045-.003*(1-rr*rr)
            vs.append((x,y,z))
        if j<8:
            for i in range(n):
                k=j*n+i;kn=j*n+(i+1)%n;faceidx=(k,kn,kn+n,k+n);fs.append(faceidx)
                coords=[]
                for idx in faceidx:
                    x,y,z=vs[idx] if idx<len(vs) else (0,0,0)
                    # UV follows parametric ring, independent of face curvature.
                    jj=idx//n;ii=idx%n;angle=ii*math.tau/n
                    coords.append((.5+.5*math.cos(angle)*jj/8,.5+.5*math.sin(angle)*jj/8))
                uvs.append(tuple(coords))
    mesh('AnimeEyeSocket'+str(s),vs,fs,eye,'head',uvs)
    for upper in [True,False]:
        pts=[]
        for i in range(33):
            a=math.pi*i/32;x=cx+.051*math.cos(a)
            z=cz+(1 if upper else -1)*.030*math.sin(a)*(1-.10*abs(math.cos(a)))+.004*s*math.cos(a)
            pts.append((x,face_y(x,z)-.006,z))
        curve('AnimeUpperLash'+str(s) if upper else 'AnimeLowerLash'+str(s),pts,.0025 if upper else .0008,lash if upper else pink)
    # Tapered lash wing and fine eyebrow, no cylindrical eye bulges.
    x=cx+s*.047;z=cz+.013
    mesh('AnimeLashWing'+str(s),[(x,face_y(x,z)-.007,z),(x+s*.012,face_y(x,z)-.006,z+.008),(x+s*.003,face_y(x,z)-.007,z-.004)],[(0,1,2)],lash)
    points=[]
    for i in range(28):
        t=i/27;x=cx-.040+.080*t;z=1.36+.007*math.sin(math.pi*t)
        points.append((x,face_y(x,z)-.004,z))
    curve('AnimeBrow'+str(s),points,.0017,hdark)
mouth=[]
for i in range(25):
    x=-.018+.036*i/24;z=1.208-.0025*math.sin(math.pi*i/24)
    mouth.append((x,face_y(x,z)-.002,z))
curve('AnimeSmile',mouth,.0012,pink)
# Fitted dark scalp. Broad layered locks create a deliberate anime silhouette.
vs=[];fs=[];n=80;rows=28
for j in range(rows+1):
    for i in range(n):
        a=i*math.tau/n;end=1.89+.57*max(0,math.sin(a))-.60*max(0,-math.sin(a))
        th=.001+(end-.001)*j/rows
        vs.append((.173*math.sin(th)*math.cos(a),.153*math.sin(th)*math.sin(a)+.012,1.296+.207*math.cos(th)))
    if j<rows:
        for i in range(n):a=j*n+i;b=j*n+(i+1)%n;fs.append((a,b,b+n,a+n))
mesh('AnimeScalp',vs,fs,hair)
for s in [-1,1]:
    for j in range(6):
        control=[(s*(.012+j*.009),-.02+j*.012,1.498-j*.003),(s*.065,-.135,1.476-j*.007),(s*(.105+j*.01),-.165,1.41-j*.014),(s*(.128+j*.007),-.103+j*.005,1.324-j*.022)]
        lock('AnimeTempleLock'+str(s)+'_'+str(j),control,.026,.006,hair if j%3 else hlight)
    # Swept bang blades are asymmetric and lie on the forehead.
    for j in range(3):
        control=[(s*(.012+j*.023),-.040,1.493),(s*(.025+j*.035),-.133,1.46),(s*(.04+j*.03),-.167,1.40),(s*(.01+j*.035),-.153,1.354-j*.004)]
        lock('AnimeFringe'+str(s)+'_'+str(j),control,.025,.005,hair if j%2 else hlight)
    uv('AnimeBun'+str(s),(s*.158,.051,1.441),(.062,.061,.064),hair,segments=32,rings=20)
    for k in range(4):
        pts=[]
        for i in range(49):
            a=i*math.tau/48
            pts.append((s*.158+(.052+.005*math.sin(a*3+k))*math.cos(a),.051+(.053)*math.sin(a),1.416+k*.016+.01*math.sin(a)))
        curve('AnimeBunBraid'+str(s)+'_'+str(k),pts,.006,hlight,'head',True)
    # Side braids with three coherent strands.
    for strand in range(3):
        pts=[]
        for i in range(61):
            t=i/60;a=t*math.tau*3.2+strand*math.tau/3
            pts.append((s*(.161+.018*t)+.009*math.cos(a),-.008+.007*math.sin(a),1.303-.238*t))
        curve('AnimeSideBraid'+str(s)+'_'+str(strand),pts,.0055,hair,'braid.L' if s==1 else 'braid.R')
    # Long back hair composed of sculpted ribbons, not thin wires.
    for j in range(5):
        control=[(s*(.025+j*.028),.114,1.44),(s*(.08+j*.024),.18,1.30),(s*(.10+j*.028),.18,1.10),(s*(.08+j*.034),.10+.008*j,.94+.018*j)]
        lock('AnimeBackLock'+str(s)+'_'+str(j),control,.034,.008,hair if j%2 else hlight,'chest')
    # Jade ribbon tails and silk bow.
    uv('AnimeBowKnot'+str(s),(s*.195,.035,1.412),(.018,.018,.02),green)
    for q in [-1,1]:
        wing=uv('AnimeBowLoop'+str(s)+str(q),(s*(.195+q*.026),.033,1.416+q*.012),(.030,.008,.019),green)
        wing.rotation_euler.y=-s*q*.45
        lock('AnimeRibbonTail'+str(s)+str(q),[(s*.194,.05,1.41),(s*(.20+q*.02),.06,1.30),(s*(.23+q*.02),.08,1.22),(s*(.20+q*.04),.07,1.14)],.018,.0018,jade,'braid.L' if s==1 else 'braid.R')
    # Five-petal blossom clusters and hanging bead details.
    for fl in range(3):
        center=Vector((s*(.153+fl*.019),-.017,1.451-fl*.025))
        for k in range(5):
            a=k*math.tau/5
            uv('AnimePetal'+str(s)+str(fl)+str(k),tuple(center+Vector((math.cos(a)*.012,-.003,math.sin(a)*.012))),(.011,.004,.013),petal,segments=12,rings=8)
        uv('AnimeFlowerGold'+str(s)+str(fl),tuple(center+Vector((0,-.008,0))),(.005,.004,.005),gold,segments=12,rings=8)
print('ANIME_HEAD_COMPLETE',len(C.objects))

