import bpy, addon_utils
addon_utils.modules_refresh()
addon_utils.enable('blender_mcp', default_set=False, persistent=False)
bpy.context.preferences.addons['blender_mcp'].preferences.telemetry_consent = False
bpy.context.scene.blendermcp_auto_start_server = True
if not getattr(bpy.types, 'blendermcp_server', None):
    bpy.ops.blendermcp.start_server()
print('ATANG_MCP_READY', bpy.app.version_string)
