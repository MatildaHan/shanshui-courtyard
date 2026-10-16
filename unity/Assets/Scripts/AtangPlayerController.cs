using System;
using UnityEngine;

namespace Shanshui
{
    /// <summary>
    /// Feet-origin, +Z-forward character controller. All movement, including mantle,
    /// goes through CharacterController.Move; world geometry supplies real colliders.
    /// Uses the built-in Input Manager (Active Input Handling: Input Manager or Both).
    /// </summary>
    [DisallowMultipleComponent, RequireComponent(typeof(CharacterController))]
    public sealed class AtangPlayerController : MonoBehaviour
    {
        [Serializable]
        public struct PlayerStatus
        {
            public bool Enabled, Grounded, Climbing, Gliding, Mantling, Moving, Sprinting;
            public float Stamina, MaxStamina, Speed, VerticalSpeed;
            public Vector3 Position;
            public string Area, Action;
            public float NormalizedStamina => MaxStamina > 0f ? Stamina / MaxStamina : 0f;
        }

        [Header("Movement (metres / second)")]
        [Min(0.1f)] public float walkSpeed = 1.45f;
        [Min(0.1f)] public float runSpeed = 2.8f;
        [Min(0.1f)] public float sprintSpeed = 4.6f;
        [Min(0.1f)] public float jumpHeight = 1.15f;
        [Min(1f)] public float gravity = 20f;
        [Min(0.1f)] public float turnSharpness = 14f;
        public Vector3 spawnPosition = new Vector3(-1.4f, 0.08f, -11.8f);
        public float respawnBelowY = -12f;

        [Header("Climbing / gliding")]
        public LayerMask climbableLayers;
        public LayerMask collisionLayers = ~0;
        [Min(0.1f)] public float climbSpeed = 1.0f;
        [Min(0.1f)] public float glideSpeed = 3.9f;
        [Min(0.1f)] public float glideSinkSpeed = 1.15f;
        [Min(0.1f)] public float climbReach = 0.7f;

        [Header("Stamina")]
        [Min(1f)] public float maxStamina = 100f;
        [Min(0f)] public float sprintDrain = 22f;
        [Min(0f)] public float climbDrain = 16f;
        [Min(0f)] public float glideDrain = 9f;
        [Min(0f)] public float staminaRecovery = 24f;

        [Header("Camera / imported model")]
        [SerializeField] private Transform model;
        [SerializeField] private Camera viewCamera;
        [SerializeField] private float modelYawOffset;
        public float cameraDistance = 5.0f;
        public float cameraPitch = 16f;
        public float cameraYaw;
        public float cameraSensitivity = 2.7f;
        public float cameraMinDistance = 1.3f;
        public float cameraMaxDistance = 8f;
        public LayerMask cameraObstacles = ~0;

        public event Action<PlayerStatus> StatusChanged;
        public float ModelYawOffset
        {
            get => modelYawOffset;
            set { modelYawOffset = value; ApplyModelFacing(); }
        }
        public bool IsEnabled => inputEnabled;
        public Camera ViewCamera => viewCamera;

        private CharacterController body;
        private AtangMotionAnimator motion;
        private AtangPaperGlider glider;
        private bool inputEnabled = true, grounded, climbing, gliding, mantling, exhausted;
        private bool sprinting, moving, configured;
        private bool wasDragging;
        private float stamina, verticalSpeed, actualSpeed, airborneTime, coyoteTime;
        private float staminaWait, actionTime, statusTime, jumpBuffer, regrabDelay;
        private Vector3 horizontalVelocity, climbNormal, mantleStart, mantleLift, mantleEnd;
        private Vector3 previousMousePosition;
        private float mantleTime;
        private Collider climbCollider;
        private string action = "Idle", lastPublishedAction;
        private PlayerStatus status;
        private readonly RaycastHit[] castHits = new RaycastHit[64];
        private readonly Collider[] overlapHits = new Collider[64];

        private void Awake()
        {
            body = GetComponent<CharacterController>();
            body.height = 1.55f;
            body.radius = 0.25f;
            body.center = new Vector3(0f, 0.775f, 0f);
            body.skinWidth = 0.025f;
            body.stepOffset = 0.25f;
            body.slopeLimit = 48f;
            body.minMoveDistance = 0f;
            stamina = maxStamina;
            glider = GetComponent<AtangPaperGlider>();
            if (!glider) glider = gameObject.AddComponent<AtangPaperGlider>();
        }

        private void Start()
        {
            if (!configured) Configure(model, viewCamera);
            PublishStatus(true);
        }

        public void Configure(Transform characterModel, Camera followCamera = null)
        {
            if (!body) body = GetComponent<CharacterController>();
            model = characterModel;
            if (model && model != transform && !model.IsChildOf(transform)) model.SetParent(transform, false);
            ApplyModelFacing();
            if (followCamera) viewCamera = followCamera;
            if (!viewCamera) viewCamera = Camera.main;
            if (!viewCamera)
            {
                var cameraObject = new GameObject("Atang Follow Camera", typeof(Camera), typeof(AudioListener));
                viewCamera = cameraObject.GetComponent<Camera>();
                cameraObject.tag = "MainCamera";
            }
            viewCamera.nearClipPlane = 0.045f;
            viewCamera.fieldOfView = 60f;
            motion = GetComponent<AtangMotionAnimator>();
            if (!motion) motion = gameObject.AddComponent<AtangMotionAnimator>();
            motion.Configure(model);
            if (!glider) glider = gameObject.AddComponent<AtangPaperGlider>();
            glider.Configure(model);
            configured = true;
            UpdateCamera(true);
            PublishStatus(true);
        }

        public void ConfigureAnimations(AnimationClip[] clips)
        {
            if (!motion) motion = gameObject.AddComponent<AtangMotionAnimator>();
            motion.Configure(model, clips);
        }

        public PlayerStatus GetStatus() => BuildStatus();

        public void SetEnabled(bool value)
        {
            inputEnabled = value;
            wasDragging = false;
            jumpBuffer = 0f;
            horizontalVelocity = Vector3.zero;
            if (!value)
            {
                climbing = gliding = mantling = sprinting = false;
                moving = false;
                verticalSpeed = actualSpeed = 0f;
                SetAction("Idle");
                if (motion) motion.SetMotion("Idle");
                if (glider) glider.SetDeployed(false);
            }
            else UpdateCamera(true);
            PublishStatus(true);
        }

        public void Reset() => Reset(spawnPosition, Quaternion.identity);

        public void Reset(Vector3 position, Quaternion rotation)
        {
            if (!body) body = GetComponent<CharacterController>();
            bool wasEnabled = body.enabled;
            body.enabled = false;
            transform.SetPositionAndRotation(position, rotation);
            body.enabled = wasEnabled;
            horizontalVelocity = Vector3.zero;
            verticalSpeed = actualSpeed = airborneTime = jumpBuffer = regrabDelay = 0f;
            climbing = gliding = mantling = exhausted = sprinting = moving = false;
            grounded = false;
            wasDragging = false;
            stamina = maxStamina;
            staminaWait = coyoteTime = 0f;
            cameraYaw = rotation.eulerAngles.y;
            cameraPitch = 16f;
            SetAction("Idle");
            if (motion) motion.SetMotion("Idle");
            if (glider) glider.SetDeployed(false);
            if (configured && inputEnabled) UpdateCamera(true);
            PublishStatus(true);
        }

        private void Update()
        {
            if (!configured || !inputEnabled || !body.enabled) return;
            float dt = Mathf.Min(Time.deltaTime, 0.05f);
            if (dt <= 0f) return;
            Vector3 before = transform.position;
            Vector2 input = ReadMoveInput();
            Vector3 desiredDirection = CameraRelative(input);
            bool wasGrounded = grounded;
            float previousAirborneTime = airborneTime;
            bool jumpPressed = Input.GetKeyDown(KeyCode.Space);
            bool dropPressed = Input.GetKeyDown(KeyCode.X);
            regrabDelay = Mathf.Max(0f, regrabDelay - dt);
            actionTime += dt;
            grounded = !climbing && !mantling && verticalSpeed <= 0f && ProbeGround(out _);
            if (grounded)
            {
                if (!wasGrounded && previousAirborneTime > 0.18f) SetAction("Land");
                airborneTime = 0f;
                coyoteTime = 0.12f;
                gliding = false;
                if (verticalSpeed < 0f) verticalSpeed = -2f;
            }
            else
            {
                airborneTime += dt;
                coyoteTime = Mathf.Max(0f, coyoteTime - dt);
            }

            if (mantling) UpdateMantle(dt);
            else if (climbing)
            {
                if (dropPressed || stamina <= 0f)
                    LeaveClimb(false);
                else if (jumpPressed)
                    LeaveClimb(true);
                else UpdateClimb(input, dt);
            }
            else
            {
                if (jumpPressed)
                {
                    if (grounded || coyoteTime > 0f) jumpBuffer = 0.12f;
                    else if (gliding) gliding = false;
                    else if (airborneTime > 0.12f && stamina > 8f && !exhausted && HasGlideClearance())
                    {
                        gliding = true;
                        verticalSpeed = Mathf.Min(0f, verticalSpeed);
                    }
                    else jumpBuffer = 0.12f;
                }
                if (dropPressed) gliding = false;
                Vector3 climbDirection = desiredDirection.sqrMagnitude > 0.01f ? desiredDirection : transform.forward;
                if (Input.GetKeyDown(KeyCode.E) && stamina > 8f && !exhausted && regrabDelay <= 0f &&
                    FindClimbSurface(climbDirection, out RaycastHit surface))
                    BeginClimb(surface);
                else UpdateLocomotion(input, desiredDirection, dt);
            }

            Vector3 displacement = transform.position - before;
            actualSpeed = new Vector2(displacement.x, displacement.z).magnitude / dt;
            moving = displacement.sqrMagnitude > 0.000001f;
            if (!climbing && !mantling && verticalSpeed <= 0f && ProbeGround(out _))
            {
                grounded = true;
                gliding = false;
                if (!wasGrounded && airborneTime > 0.18f) SetAction("Land");
                airborneTime = 0f;
            }
            UpdateStamina(dt);
            UpdateAction();
            if (motion) motion.SetMotion(action, AnimationSpeed());
            if (glider) glider.SetDeployed(gliding);
            PublishStatus(false);
            if (transform.position.y < respawnBelowY) Reset();
        }

        private static Vector2 ReadMoveInput()
        {
            float x = (Input.GetKey(KeyCode.D) || Input.GetKey(KeyCode.RightArrow) ? 1f : 0f) -
                      (Input.GetKey(KeyCode.A) || Input.GetKey(KeyCode.LeftArrow) ? 1f : 0f);
            float y = (Input.GetKey(KeyCode.W) || Input.GetKey(KeyCode.UpArrow) ? 1f : 0f) -
                      (Input.GetKey(KeyCode.S) || Input.GetKey(KeyCode.DownArrow) ? 1f : 0f);
            return Vector2.ClampMagnitude(new Vector2(x, y), 1f);
        }

        private Vector3 CameraRelative(Vector2 input)
        {
            Quaternion rotation = Quaternion.Euler(0f, cameraYaw, 0f);
            return rotation * new Vector3(input.x, 0f, input.y);
        }

        private void UpdateLocomotion(Vector2 input, Vector3 direction, float dt)
        {
            bool wantsSprint = Input.GetKey(KeyCode.LeftControl) || Input.GetKey(KeyCode.RightControl);
            bool wantsRun = Input.GetKey(KeyCode.LeftShift) || Input.GetKey(KeyCode.RightShift);
            sprinting = grounded && wantsSprint && !exhausted && stamina > 0f && input.sqrMagnitude > 0.01f;
            float speed = sprinting ? sprintSpeed : wantsRun ? runSpeed : walkSpeed;
            if (gliding)
            {
                if (stamina <= 0f) gliding = false;
                else
                {
                    if (direction.sqrMagnitude < 0.01f) direction = transform.forward;
                    speed = glideSpeed;
                    verticalSpeed = Mathf.MoveTowards(verticalSpeed, -glideSinkSpeed, 8f * dt);
                }
            }
            if (!gliding)
            {
                if (jumpBuffer > 0f && coyoteTime > 0f)
                {
                    verticalSpeed = Mathf.Sqrt(2f * gravity * jumpHeight);
                    grounded = false;
                    coyoteTime = jumpBuffer = 0f;
                    SetAction("Jump");
                }
                verticalSpeed = Mathf.Max(verticalSpeed - gravity * dt, -32f);
            }
            jumpBuffer = Mathf.Max(0f, jumpBuffer - dt);
            horizontalVelocity = Vector3.MoveTowards(horizontalVelocity, direction * speed, (grounded ? 18f : 8f) * dt);
            if (direction.sqrMagnitude > 0.01f) Face(direction, dt);
            var flags = body.Move((horizontalVelocity + Vector3.up * verticalSpeed) * dt);
            if ((flags & CollisionFlags.Above) != 0 && verticalSpeed > 0f) verticalSpeed = 0f;
            if ((flags & CollisionFlags.Below) != 0 && verticalSpeed < 0f) verticalSpeed = -2f;
        }

        private bool FindClimbSurface(Vector3 direction, out RaycastHit result)
        {
            direction.y = 0f;
            if (direction.sqrMagnitude < 0.001f) direction = transform.forward;
            bool found = CastNearest(transform.position + Vector3.up * 0.94f, 0.1f,
                direction.normalized, climbReach, collisionLayers, out result);
            if (!found || Vector3.Dot(direction.normalized, -result.normal) < 0.35f) return false;
            var surface = result.collider.GetComponentInParent<AtangClimbableSurface>();
            if (surface) return surface.Allows(result.normal);
            return (climbableLayers.value & (1 << result.collider.gameObject.layer)) != 0 &&
                   Mathf.Abs(result.normal.y) <= Mathf.Sin(22f * Mathf.Deg2Rad);
        }

        private void BeginClimb(RaycastHit hit)
        {
            climbing = true;
            grounded = gliding = sprinting = false;
            climbCollider = hit.collider;
            climbNormal = Vector3.ProjectOnPlane(hit.normal, Vector3.up).normalized;
            horizontalVelocity = Vector3.zero;
            verticalSpeed = coyoteTime = jumpBuffer = 0f;
            transform.rotation = Quaternion.LookRotation(-climbNormal, Vector3.up);
            SetAction("Climb");
        }

        private void UpdateClimb(Vector2 input, float dt)
        {
            if (input.y > 0.1f && TryStartMantle()) return;
            if (!FindClimbSurface(-climbNormal, out RaycastHit surface))
            {
                LeaveClimb(false);
                return;
            }
            climbCollider = surface.collider;
            climbNormal = Vector3.ProjectOnPlane(surface.normal, Vector3.up).normalized;
            Vector3 right = Vector3.Cross(Vector3.up, -climbNormal).normalized;
            Vector3 movement = (Vector3.up * input.y + right * input.x) * climbSpeed;
            float wallDistance = Vector3.Dot(transform.position - surface.point, climbNormal);
            Vector3 correction = climbNormal * (body.radius + body.skinWidth + 0.02f - wallDistance);
            body.Move(movement * dt + correction * Mathf.Min(1f, dt * 12f));
            Face(-climbNormal, dt);
            verticalSpeed = movement.y;
            if (input.y < -0.1f && ProbeGround(out _)) LeaveClimb(false);
        }

        private void LeaveClimb(bool jumpAway)
        {
            climbing = mantling = false;
            grounded = false;
            regrabDelay = 0.45f;
            horizontalVelocity = climbNormal * (jumpAway ? 2.8f : 0.6f);
            verticalSpeed = jumpAway ? Mathf.Sqrt(2f * gravity * jumpHeight * 0.75f) : -0.5f;
            if (jumpAway) transform.rotation = Quaternion.LookRotation(climbNormal, Vector3.up);
            SetAction(jumpAway ? "Jump" : "Fall");
        }

        private bool TryStartMantle()
        {
            var permission = climbCollider ? climbCollider.GetComponentInParent<AtangClimbableSurface>() : null;
            if (permission && (!permission.enabled || !permission.allowClimbing || !permission.allowMantle)) return false;
            Vector3 intoWall = -climbNormal;
            // A clear head probe distinguishes a real top edge from a vertical wall.
            if (CastNearest(transform.position + Vector3.up * (body.height + 0.08f), 0.07f,
                intoWall, body.radius + 0.45f, collisionLayers, out _)) return false;
            Vector3 origin = transform.position + Vector3.up * (body.height + 0.4f) + intoWall * (body.radius + 0.6f);
            if (!CastNearest(origin, 0.08f, Vector3.down, body.height + 0.35f, collisionLayers, out RaycastHit top)) return false;
            if (top.normal.y < Mathf.Cos(body.slopeLimit * Mathf.Deg2Rad)) return false;
            var topPermission = top.collider.GetComponentInParent<AtangClimbableSurface>();
            bool sameSurface = permission ? topPermission == permission : top.collider == climbCollider;
            if (!sameSurface) return false;
            float rise = top.point.y - transform.position.y;
            if (rise < 0.08f || rise > 1.35f) return false;
            Vector3 destination = top.point + Vector3.up * 0.06f;
            if (!CapsuleFits(destination)) return false;
            mantleStart = transform.position;
            mantleLift = new Vector3(mantleStart.x, destination.y + 0.04f, mantleStart.z);
            mantleEnd = destination;
            mantleTime = 0f;
            mantling = true;
            climbing = gliding = false;
            verticalSpeed = 0f;
            SetAction("Climb");
            return true;
        }

        private void UpdateMantle(float dt)
        {
            mantleTime += dt;
            float t = Mathf.Clamp01(mantleTime / 0.65f);
            Vector3 destination = t < 0.55f
                ? Vector3.Lerp(mantleStart, mantleLift, Mathf.SmoothStep(0f, 1f, t / 0.55f))
                : Vector3.Lerp(mantleLift, mantleEnd, Mathf.SmoothStep(0f, 1f, (t - 0.55f) / 0.45f));
            CollisionFlags flags = body.Move(destination - transform.position);
            if ((flags & CollisionFlags.Above) != 0 || stamina <= 0f)
            {
                LeaveClimb(false);
                return;
            }
            if (t >= 1f)
            {
                mantling = false;
                verticalSpeed = -2f;
                horizontalVelocity = Vector3.zero;
                grounded = ProbeGround(out _);
                SetAction(grounded ? "Land" : "Fall");
            }
        }

        private bool CapsuleFits(Vector3 feet)
        {
            float radius = body.radius - 0.02f;
            int count = Physics.OverlapCapsuleNonAlloc(feet + Vector3.up * (body.radius + 0.04f),
                feet + Vector3.up * (body.height - body.radius), radius, overlapHits,
                collisionLayers, QueryTriggerInteraction.Ignore);
            if (count == overlapHits.Length) return false; // Conservatively reject a crowded or truncated query.
            for (int i = 0; i < count; i++) if (!IsOwnCollider(overlapHits[i])) return false;
            return true;
        }

        private bool ProbeGround(out RaycastHit hit)
        {
            return CastNearest(transform.position + Vector3.up * (body.radius + 0.09f),
                body.radius - 0.035f, Vector3.down, 0.19f, collisionLayers, out hit) &&
                hit.normal.y >= Mathf.Cos(body.slopeLimit * Mathf.Deg2Rad);
        }

        private bool HasGlideClearance()
        {
            // A second press near the ground remains a buffered jump, never a ground glide.
            return !CastNearest(transform.position + Vector3.up * 0.12f, 0.1f,
                Vector3.down, 0.48f, collisionLayers, out _);
        }

        private bool CastNearest(Vector3 origin, float radius, Vector3 direction, float distance,
            LayerMask layers, out RaycastHit nearest)
        {
            int count = Physics.SphereCastNonAlloc(origin, radius, direction, castHits, distance,
                layers, QueryTriggerInteraction.Ignore);
            nearest = default;
            float nearestDistance = float.PositiveInfinity;
            if (count == castHits.Length)
            {
                // Rare dense geometry: use the complete result instead of missing a nearer wall.
                foreach (var hit in Physics.SphereCastAll(origin, radius, direction, distance, layers,
                    QueryTriggerInteraction.Ignore))
                {
                    if (!IsOwnCollider(hit.collider) && hit.distance < nearestDistance)
                    { nearest = hit; nearestDistance = hit.distance; }
                }
            }
            else for (int i = 0; i < count; i++)
            {
                RaycastHit hit = castHits[i];
                if (!IsOwnCollider(hit.collider) && hit.distance < nearestDistance)
                { nearest = hit; nearestDistance = hit.distance; }
            }
            return nearest.collider != null;
        }

        private bool IsOwnCollider(Collider candidate)
        {
            return candidate && (candidate.transform == transform || candidate.transform.IsChildOf(transform));
        }

        private void UpdateStamina(float dt)
        {
            float drain = climbing || mantling ? climbDrain : gliding ? glideDrain : sprinting && actualSpeed > 0.1f ? sprintDrain : 0f;
            if (drain > 0f)
            {
                stamina = Mathf.Max(0f, stamina - drain * dt);
                staminaWait = 0.8f;
            }
            else
            {
                staminaWait -= dt;
                if (grounded && staminaWait <= 0f) stamina = Mathf.Min(maxStamina, stamina + staminaRecovery * dt);
            }
            if (stamina <= 0f) exhausted = true;
            if (stamina >= maxStamina * 0.25f) exhausted = false;
        }

        private void UpdateAction()
        {
            if (climbing || mantling) SetAction("Climb");
            else if (gliding) SetAction("Glide");
            else if (!grounded) SetAction(verticalSpeed > 0.2f ? "Jump" : "Fall");
            else if (action == "Land" && actionTime < 0.18f && actualSpeed < 0.15f) return;
            else if (actualSpeed < 0.1f) SetAction("Idle");
            else SetAction(sprinting ? "Sprint" : actualSpeed > walkSpeed + 0.35f ? "Run" : "Walk");
        }

        private float AnimationSpeed()
        {
            if (action == "Walk") return Mathf.Clamp(actualSpeed / walkSpeed, 0.45f, 1.6f);
            if (action == "Run") return Mathf.Clamp(actualSpeed / runSpeed, 0.45f, 1.6f);
            if (action == "Sprint") return Mathf.Clamp(actualSpeed / sprintSpeed, 0.45f, 1.6f);
            if (action == "Climb") return mantling ? 1.1f : moving ? 1f : 0f;
            return 1f;
        }

        private void SetAction(string next)
        {
            if (action == next) return;
            action = next;
            actionTime = 0f;
        }

        private void Face(Vector3 direction, float dt)
        {
            direction.y = 0f;
            if (direction.sqrMagnitude > 0.001f)
                transform.rotation = Quaternion.Slerp(transform.rotation, Quaternion.LookRotation(direction),
                    1f - Mathf.Exp(-turnSharpness * dt));
        }

        private void ApplyModelFacing()
        {
            if (model && model != transform) model.localRotation = Quaternion.Euler(0f, modelYawOffset, 0f);
        }

        private void LateUpdate()
        {
            if (!configured || !inputEnabled || !viewCamera) return;
            bool dragging = Input.GetMouseButton(0) || Input.GetMouseButton(1);
            Vector3 mousePosition = Input.mousePosition;
            if (dragging && wasDragging)
            {
                Vector3 delta = mousePosition - previousMousePosition;
                cameraYaw += delta.x * cameraSensitivity * 0.1f;
                cameraPitch = Mathf.Clamp(cameraPitch - delta.y * cameraSensitivity * 0.1f, -18f, 68f);
            }
            previousMousePosition = mousePosition;
            wasDragging = dragging;
            cameraDistance = Mathf.Clamp(cameraDistance - Input.mouseScrollDelta.y * 0.45f, cameraMinDistance, cameraMaxDistance);
            UpdateCamera(false);
        }

        private void UpdateCamera(bool snap)
        {
            if (!viewCamera) return;
            Vector3 pivot = transform.position + Vector3.up * 1.15f;
            Vector3 direction = -(Quaternion.Euler(cameraPitch, cameraYaw, 0f) * Vector3.forward);
            float safeDistance = cameraDistance;
            if (CastNearest(pivot, 0.16f, direction, cameraDistance, cameraObstacles, out RaycastHit wall))
                safeDistance = Mathf.Max(0.06f, wall.distance - 0.04f);
            Vector3 target = pivot + direction * safeDistance;
            Vector3 proposed = snap ? target : Vector3.Lerp(viewCamera.transform.position, target,
                1f - Mathf.Exp(-Time.deltaTime * 15f));
            Vector3 proposedDirection = proposed - pivot;
            // Recheck the smoothed position: smoothing must never leave the camera behind a wall.
            if (proposedDirection.sqrMagnitude > 0.001f && CastNearest(pivot, 0.16f,
                proposedDirection.normalized, proposedDirection.magnitude, cameraObstacles, out wall))
                proposed = pivot + proposedDirection.normalized * Mathf.Max(0.06f, wall.distance - 0.04f);
            viewCamera.transform.SetPositionAndRotation(proposed, Quaternion.LookRotation(pivot - proposed, Vector3.up));
        }

        private PlayerStatus BuildStatus()
        {
            return new PlayerStatus
            {
                Enabled = inputEnabled, Grounded = grounded, Climbing = climbing, Gliding = gliding,
                Mantling = mantling, Moving = moving, Sprinting = sprinting, Stamina = stamina,
                MaxStamina = maxStamina, Speed = actualSpeed, VerticalSpeed = verticalSpeed,
                Position = transform.position, Area = CurrentArea(), Action = action
            };
        }

        private void PublishStatus(bool force)
        {
            statusTime += Time.deltaTime;
            if (!force && statusTime < 0.1f && action == lastPublishedAction) return;
            statusTime = 0f;
            lastPublishedAction = action;
            status = BuildStatus();
            StatusChanged?.Invoke(status);
        }

        private string CurrentArea()
        {
            Vector3 p = transform.position;
            if (p.x > 6.1f && p.x < 9.1f && p.z > -10.5f && p.z < -7.5f) return "东南 · 望景台";
            if (p.x > 2.7f && p.x < 4.2f && p.z > -3.3f && p.z < 2.4f && p.y > 1.25f && p.y < 5.6f) return "木梯 · 上下楼";
            if (Mathf.Abs(p.x) < 4.5f && p.z > -3.1f && p.z < 2.6f && p.y > 4.8f) return p.z < -2.25f ? "二层 · 檐下露台" : "二层 · 观景茶室";
            if (Mathf.Abs(p.x) < 5.3f && p.z > -3.3f && p.z < 3.3f && p.y < 4.5f) return "一层 · 会客厅";
            if (p.x > -8.58f && p.x < -6.52f && p.z > -13.2f && p.z < -4.8f) return "清池 · 石拱桥";
            return "庭院";
        }
    }
}
