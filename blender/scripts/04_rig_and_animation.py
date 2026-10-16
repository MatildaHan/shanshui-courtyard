import bpy, math
from mathutils import Vector, Quaternion
C=bpy.data.collections['ATANG_CHARACTER_V2']
master=bpy.data.objects['ATANG_Master']
bpy.ops.object.select_all(action='DESELECT')
meshes=[o for o in C.objects if o.type=='MESH']
for o in meshes:o.select_set(True)
bpy.context.view_layer.objects.active=bpy.data.objects['Atang_SculptedFace']
bpy.ops.object.join()
body=bpy.context.object
body.name='Atang_SkinnedCharacter'
bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
arm=bpy.data.armatures.new('Atang_Skeleton')
rig=bpy.data.objects.new('Atang_Rig',arm)
C.objects.link(rig)
rig.parent=master
bpy.ops.object.select_all(action='DESELECT')
rig.select_set(True)
bpy.context.view_layer.objects.active=rig
bpy.ops.object.mode_set(mode='EDIT')
def bone(name,head,tail,parent=None):
    b=arm.edit_bones.new(name);b.head=head;b.tail=tail
    if parent:b.parent=arm.edit_bones[parent]
bone('root',(0,0,0),(0,0,.1))
bone('pelvis',(0,0,.62),(0,0,.79),'root')
bone('spine',(0,0,.79),(0,0,.94),'pelvis')
bone('chest',(0,0,.94),(0,0,1.04),'spine')
bone('neck',(0,0,1.04),(0,0,1.13),'chest')
bone('head',(0,0,1.13),(0,0,1.42),'neck')
for s,side in [(1,'L'),(-1,'R')]:
    bone('upper_arm.'+side,(s*.165,0,1.025),(s*.24,-.005,.86),'chest')
    bone('forearm.'+side,(s*.24,-.005,.86),(s*.244,-.014,.739),'upper_arm.'+side)
    bone('hand.'+side,(s*.244,-.014,.739),(s*.244,-.02,.65),'forearm.'+side)
    bone('thigh.'+side,(s*.086,0,.62),(s*.086,0,.35),'pelvis')
    bone('shin.'+side,(s*.086,0,.35),(s*.086,0,.09),'thigh.'+side)
    bone('foot.'+side,(s*.086,0,.09),(s*.086,-.14,.055),'shin.'+side)
    bone('skirt.'+side,(s*.07,0,.78),(s*.17,0,.25),'pelvis')
    bone('braid.'+side,(s*.168,.018,1.285),(s*.18,.018,1.07),'head')
bone('skirt.front',(0,-.08,.78),(0,-.14,.25),'pelvis')
bone('skirt.back',(0,.08,.78),(0,.14,.25),'pelvis')
bone('sash',(.1,-.12,.79),(.12,-.2,.34),'pelvis')
bpy.ops.object.mode_set(mode='OBJECT')
mod=body.modifiers.new('Atang skeletal deformation','ARMATURE');mod.object=rig
body.parent=rig
unweighted=[]
for v in body.data.vertices:
    valid=[g for g in v.groups if body.vertex_groups[g.group].name in arm.bones]
    total=sum(g.weight for g in valid)
    if total<.001:unweighted.append(v.index)
    elif abs(total-1)>.0001:
        for g in valid:body.vertex_groups[g.group].add([v.index],g.weight/total,'REPLACE')
assert not unweighted, str(len(unweighted))+' unweighted vertices'
rig.animation_data_create()
scene=bpy.context.scene;scene.render.fps=30
def rot(name,angle,axis=(1,0,0)):
    p=rig.pose.bones[name];p.rotation_mode='QUATERNION'
    q=p.bone.matrix_local.to_quaternion()
    p.rotation_quaternion=q.inverted() @ Quaternion(axis,angle) @ q
for clip,frames,amplitude in [('Idle',60,0),('Walk',32,.115),('Run',24,.18)]:
    action=bpy.data.actions.new(clip);action.use_fake_user=True
    rig.animation_data.action=action
    for frame in range(1,frames+2):
        t=(frame-1)/frames*math.tau
        for p in rig.pose.bones:p.rotation_mode='QUATERNION';p.rotation_quaternion=Quaternion();p.location=(0,0,0)
        bob=(.004*math.sin(t) if clip=='Idle' else .008*(1-math.cos(2*t)))
        rig.pose.bones['root'].location=(0,bob,0)
        rot('chest',.012*math.sin(t), (0,0,1))
        rot('head',.018*math.sin(t-.5),(0,0,1))
        for s,side in [(1,'L'),(-1,'R')]:
            phase=t+(0 if s==1 else math.pi)
            if amplitude:
                dy=amplitude*math.cos(phase)
                lift=(.045 if clip=='Walk' else .075)*max(0,math.sin(phase))
                dz=-.515+lift-bob
                length=min(.529,math.hypot(dy,dz))
                hip=math.atan2(dy,-dz)-math.acos(max(-1,min(1,(.27**2+length**2-.26**2)/(2*.27*length))))
                knee=math.pi-math.acos(max(-1,min(1,(.27**2+.26**2-length**2)/(2*.27*.26))))
                rot('thigh.'+side,hip);rot('shin.'+side,knee);rot('foot.'+side,-hip-knee)
                rot('upper_arm.'+side,-.20*math.cos(phase))
                rot('forearm.'+side,-.07-.055*math.sin(phase))
                rot('skirt.'+side,.095*math.cos(phase))
            rot('braid.'+side,(.018 if not amplitude else .05)*math.sin(phase-.5))
        rot('skirt.front',(.008 if not amplitude else .035)*math.sin(2*t-.5))
        rot('skirt.back',(.008 if not amplitude else .035)*math.sin(2*t+.5))
        rot('sash',(.01 if not amplitude else .05)*math.sin(t-.8))
        for p in rig.pose.bones:
            p.keyframe_insert(data_path='rotation_quaternion',frame=frame,group=p.name)
            p.keyframe_insert(data_path='location',frame=frame,group=p.name)
    print('CLIP',clip, len(action.slots),list(action.frame_range))
rig.animation_data.action=bpy.data.actions['Walk']
scene.frame_start=1;scene.frame_end=33;scene.frame_set(9)
print('RIG_OK',len(arm.bones),'bones',len(body.data.vertices),'vertices',len(body.data.materials),'materials')

