using UnityEngine;
namespace Shanshui
{
    public sealed class CourtyardWaterRecovery : MonoBehaviour
    {
        void OnTriggerEnter(Collider other)
        {
            var player=other.GetComponentInParent<AtangPlayerController>();
            if(player)player.Reset(CourtyardWorld.Spawn,Quaternion.identity);
        }
    }
}
