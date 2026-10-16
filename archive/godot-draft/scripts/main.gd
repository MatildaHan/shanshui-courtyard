extends Node3D

const WORLD_SCRIPT = preload("res://scripts/world.gd")
const HUD_SCRIPT = preload("res://scripts/hud.gd")
var world: Node3D
var player: Node3D
var hud: CanvasLayer
var overview: Camera3D
var selected_part := ""
var elapsed := 0.0
var saved_test := false

func _ready() -> void:
	name = "ShanshuiCourtyard"
	world = WORLD_SCRIPT.new()
	world.name = "World"
	add_child(world)
	overview = Camera3D.new()
	overview.name = "OverviewCamera"
	overview.fov = 45
	overview.far = 350
	add_child(overview)
	hud = HUD_SCRIPT.new()
	add_child(hud)
	hud.mode_requested.connect(world.set_mode)
	hud.view_requested.connect(set_view)
	hud.reset_requested.connect(reset_player)
	hud.explore_requested.connect(resume_exploration)
	_spawn_player()
	world.set_mode("dusk")
	print("COURTYARD_READY ", JSON.stringify(get_status()))

func _spawn_player() -> void:
	if not ResourceLoader.exists("res://scripts/player.gd"):
		set_view("front")
		hud.set_notice("角色控制器准备中；可查看庭院环境。")
		return
	var player_script = load("res://scripts/player.gd")
	player = player_script.new()
	player.name = "Atang"
	add_child(player)
	if player.has_method("configure"):
		var character_scene = load("res://assets/characters/atang.glb") if ResourceLoader.exists("res://assets/characters/atang.glb") else null
		player.configure(character_scene, world)
	resume_exploration()

func _process(delta: float) -> void:
	elapsed += delta
	var state := get_status()
	hud.update_status(state)
	if not world.architecture_loaded:
		hud.set_notice(world.architecture_error)
	if "--smoke-test" in OS.get_cmdline_user_args() and elapsed > 2.0 and not saved_test:
		saved_test = true
		var output = FileAccess.open("res://../tests/results/godot-smoke.json", FileAccess.WRITE)
		if output:
			output.store_string(JSON.stringify(state, "\t"))
		print("COURTYARD_SMOKE ", JSON.stringify(state))
		get_tree().quit(0 if world.architecture_loaded and player != null else 2)

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and event.pressed and overview.current:
		var from := overview.project_ray_origin(event.position)
		var to := from + overview.project_ray_normal(event.position) * 200
		var hit := get_world_3d().direct_space_state.intersect_ray(PhysicsRayQueryParameters3D.create(from, to))
		if hit and hit.collider.has_meta("part"):
			selected_part = str(hit.collider.get_meta("part"))
			hud.show_part(selected_part)

func set_view(view_name: String) -> void:
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	if player and player.has_method("set_controls_enabled"):
		player.set_controls_enabled(false)
	overview.global_position = Vector3(0, 12, 32) if view_name == "front" else Vector3(21, 40, 26)
	overview.look_at(Vector3(0, 4.5, 0) if view_name == "front" else Vector3(0, 0, 0))
	overview.make_current()

func resume_exploration() -> void:
	if player and player.has_method("set_controls_enabled"):
		player.set_controls_enabled(true)
	elif player:
		var cameras := player.find_children("*", "Camera3D", true, false)
		if not cameras.is_empty():
			cameras[0].make_current()
	else:
		set_view("front")

func reset_player() -> void:
	if player and player.has_method("reset_player"):
		player.reset_player()
	elif player and player.has_method("reset"):
		player.reset()
	resume_exploration()

func get_status() -> Dictionary:
	var player_state: Dictionary = {}
	if player and player.has_method("get_status"):
		player_state = player.get_status()
	elif player:
		player_state = {"position": [player.position.x, player.position.y, player.position.z]}
	return {"engine": "Godot", "architecture": world.get_status(), "player": player_state, "mode": world.mode, "view": "overview" if overview.current else "explore", "selected": selected_part, "fps": Engine.get_frames_per_second()}
