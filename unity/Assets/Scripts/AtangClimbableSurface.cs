using UnityEngine;

namespace Shanshui
{
    /// <summary>Explicit permission to climb this object and its child colliders.</summary>
    [DisallowMultipleComponent]
    public sealed class AtangClimbableSurface : MonoBehaviour
    {
        public bool allowClimbing = true;
        public bool allowMantle = true;
        [Range(0f, 40f)] public float maxSlopeFromVertical = 22f;

        public bool Allows(Vector3 normal)
        {
            return enabled && allowClimbing &&
                Mathf.Abs(Vector3.Dot(normal.normalized, Vector3.up)) <=
                Mathf.Sin(maxSlopeFromVertical * Mathf.Deg2Rad);
        }
    }
}
