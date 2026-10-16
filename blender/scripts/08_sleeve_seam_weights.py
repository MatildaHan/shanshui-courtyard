import bpy,bmesh
body=bpy.data.objects['Atang_SkinnedCharacter'];rig=bpy.data.objects['Atang_Rig']
rig.animation_data.action=None
for p in rig.pose.bones:p.rotation_quaternion=(1,0,0,0);p.location=(0,0,0)
# Remove the two temporary shoulder cover spheres; blend the actual sleeve seam instead.
bm=bmesh.new();bm.from_mesh(body.data)
bm.verts.ensure_lookup_table()
bmesh.ops.delete(bm,geom=[v for v in bm.verts if v.index>=53338],context='VERTS')
bm.to_mesh(body.data);bm.free()
chest=body.vertex_groups['chest']
count=0
for v in body.data.vertices:
    if v.co.z<.975:continue
    for side in ['L','R']:
        vg=body.vertex_groups['upper_arm.'+side]
        matches=[g for g in v.groups if g.group==vg.index and g.weight>.001]
        if not matches:continue
        weight=matches[0].weight
        blend=max(0,min(1,(v.co.z-.975)/.04))
        vg.add([v.index],weight*(1-blend),'REPLACE')
        chest.add([v.index],weight*blend,'ADD')
        count+=1
rig.animation_data.action=bpy.data.actions['Idle'];bpy.context.scene.frame_set(1)
bpy.ops.object.select_all(action='DESELECT')
for o in [rig,body,bpy.data.objects['ATANG_Master']]:o.select_set(True)
bpy.context.view_layer.objects.active=rig
bpy.ops.export_scene.gltf(filepath='D:/DesktopFile/game/shanshui-courtyard/assets/characters/atang.glb',export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIONS',export_anim_single_armature=True,export_skins=True,export_yup=True)
bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath='D:/DesktopFile/game/shanshui-courtyard/blender/Atang.blend')
print('SEAM_BLEND',count,'VERTICES',len(body.data.vertices))

