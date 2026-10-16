using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Animations;
using UnityEngine.Playables;

namespace Shanshui
{
    /// <summary>Plays imported generic clips with crossfades, without an Animator asset.</summary>
    [DisallowMultipleComponent]
    public sealed class AtangMotionAnimator : MonoBehaviour
    {
        [Min(0.01f)] public float crossfadeSeconds = 0.16f;
        public string CurrentClipName { get; private set; } = string.Empty;
        public int ClipCount => clips.Count;

        private readonly List<AnimationClip> clips = new List<AnimationClip>();
        private readonly List<AnimationClip> ownedClips = new List<AnimationClip>();
        private readonly Dictionary<string, int> resolved = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        private PlayableGraph graph;
        private AnimationMixerPlayable mixer;
        private AnimationClipPlayable[] playables;
        private float[] weights, times;
        private bool[] loops;
        private int selected = -1;
        private float playbackSpeed = 1f;

        public void Configure(Transform model, AnimationClip[] suppliedClips = null)
        {
            ReleaseGraph();
            if (!model) return;
            Animator animator = model.GetComponentInChildren<Animator>(true);
            Animation legacy = model.GetComponentInChildren<Animation>(true);
            if (suppliedClips != null)
                foreach (AnimationClip clip in suppliedClips) AddClip(clip);
            if (animator && animator.runtimeAnimatorController)
                foreach (AnimationClip clip in animator.runtimeAnimatorController.animationClips) AddClip(clip);
            if (legacy)
            {
                foreach (AnimationState state in legacy) AddClip(state.clip);
                legacy.Stop();
                legacy.enabled = false;
            }
            // glTFast can import no Animation component when clips were not requested.
            // In that case ConfigureAnimations(clips) can supply them later; movement still works.
            if (clips.Count == 0)
            {
                Debug.LogWarning("Atang: no imported animation clips found. Supply the GLB clips through ConfigureAnimations after import.", this);
                return;
            }
            if (!animator) animator = (legacy ? legacy.gameObject : model.gameObject).AddComponent<Animator>();
            animator.enabled = true;
            animator.applyRootMotion = false;
            animator.cullingMode = AnimatorCullingMode.AlwaysAnimate;

            graph = PlayableGraph.Create("Atang imported motion");
            graph.SetTimeUpdateMode(DirectorUpdateMode.Manual);
            mixer = AnimationMixerPlayable.Create(graph, clips.Count);
            var output = AnimationPlayableOutput.Create(graph, "Atang pose", animator);
            output.SetSourcePlayable(mixer);
            playables = new AnimationClipPlayable[clips.Count];
            weights = new float[clips.Count];
            times = new float[clips.Count];
            loops = new bool[clips.Count];
            for (int i = 0; i < clips.Count; i++)
            {
                AnimationClip clip = clips[i];
                // Legacy importer clips are cloned; project assets are never modified in play mode.
                if (clip.legacy)
                {
                    clip = Instantiate(clip);
                    clip.name = clips[i].name;
                    clip.legacy = false;
                    ownedClips.Add(clip);
                }
                playables[i] = AnimationClipPlayable.Create(graph, clip);
                playables[i].SetApplyFootIK(false);
                playables[i].SetApplyPlayableIK(false);
                playables[i].SetSpeed(0d);
                graph.Connect(playables[i], 0, mixer, i);
                string name = Normalize(clip.name);
                loops[i] = !name.EndsWith("jump", StringComparison.Ordinal) &&
                           !name.EndsWith("land", StringComparison.Ordinal);
            }
            graph.Play();
            SetMotion("Idle", 1f);
            weights[selected] = 1f;
            mixer.SetInputWeight(selected, 1f);
            graph.Evaluate(0f);
        }

        private void AddClip(AnimationClip clip)
        {
            if (!clip) return;
            foreach (AnimationClip existing in clips)
                if (existing == clip || existing.name == clip.name) return;
            clips.Add(clip);
        }

        public void SetMotion(string state, float speed = 1f)
        {
            if (!graph.IsValid() || clips.Count == 0) return;
            int next = Resolve(state);
            playbackSpeed = Mathf.Clamp(speed, 0f, 2f);
            if (selected == next) return;
            selected = next;
            times[next] = 0f;
            CurrentClipName = clips[next].name;
        }

        private int Resolve(string state)
        {
            if (resolved.TryGetValue(state, out int found)) return found;
            found = Find(state);
            if (found < 0)
            {
                string fallback = state == "Sprint" ? "Run" : state == "Run" ? "Walk" :
                    state == "Glide" ? "Fall" : state == "Land" ? "Idle" : "Idle";
                found = Find(fallback);
                if (found < 0) found = Find("Idle");
                if (found < 0) found = 0;
            }
            resolved[state] = found;
            return found;
        }

        private int Find(string state)
        {
            string key = Normalize(state);
            for (int i = 0; i < clips.Count; i++)
                if (Normalize(clips[i].name) == key) return i;
            for (int i = 0; i < clips.Count; i++)
                if (Normalize(clips[i].name).EndsWith(key, StringComparison.Ordinal)) return i;
            return -1;
        }

        private static string Normalize(string value)
        {
            return (value ?? string.Empty).Replace("_", string.Empty).Replace(" ", string.Empty).ToLowerInvariant();
        }

        private void LateUpdate()
        {
            if (!graph.IsValid() || selected < 0) return;
            float dt = Mathf.Min(Time.deltaTime, 0.05f);
            float total = 0f;
            for (int i = 0; i < clips.Count; i++)
            {
                weights[i] = Mathf.MoveTowards(weights[i], i == selected ? 1f : 0f, dt / Mathf.Max(0.01f, crossfadeSeconds));
                total += weights[i];
                if (weights[i] <= 0f) continue;
                times[i] += dt * (i == selected ? playbackSpeed : 1f);
                float length = Mathf.Max(0.001f, clips[i].length);
                float time = loops[i] ? Mathf.Repeat(times[i], length) : Mathf.Min(times[i], length - 0.001f);
                playables[i].SetTime(time);
            }
            for (int i = 0; i < clips.Count; i++) mixer.SetInputWeight(i, total > 0f ? weights[i] / total : 0f);
            graph.Evaluate(0f);
        }

        private void OnDisable()
        {
            if (graph.IsValid()) graph.Stop();
        }

        private void OnEnable()
        {
            if (graph.IsValid()) graph.Play();
        }

        private void OnDestroy() => ReleaseGraph();

        private void ReleaseGraph()
        {
            if (graph.IsValid()) graph.Destroy();
            foreach (AnimationClip clip in ownedClips) if (clip) Destroy(clip);
            ownedClips.Clear();
            clips.Clear();
            resolved.Clear();
            selected = -1;
            CurrentClipName = string.Empty;
        }
    }
}
