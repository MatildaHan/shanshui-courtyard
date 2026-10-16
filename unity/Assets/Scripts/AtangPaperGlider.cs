using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Rendering;

namespace Shanshui
{
    /// <summary>Original curved ivory-paper swallow kite, built once and shown only during glide.</summary>
    [DisallowMultipleComponent]
    public sealed class AtangPaperGlider : MonoBehaviour
    {
        private Transform rig, leftWing, rightWing;
        private bool deployed;
        private float opening;
        private Material paper, jade, bamboo, trim;
        private Mesh rodMesh;
        private readonly List<Object> ownedResources = new List<Object>();

        public void Configure(Transform model)
        {
            // Intentionally uses the feet-origin controller, independent of imported bone names/orientation.
            if (rig) return;
            rig = new GameObject("Original bamboo paper kite").transform;
            rig.SetParent(transform, false);
            rig.localPosition = new Vector3(0f, 1.27f, -0.14f);
            paper = MakeMaterial("Ivory paper", new Color(0.94f, 0.86f, 0.66f), 0.12f);
            jade = MakeMaterial("Jade paper inlay", new Color(0.19f, 0.44f, 0.39f), 0.25f);
            bamboo = MakeMaterial("Warm bamboo ribs", new Color(0.42f, 0.27f, 0.12f), 0.23f);
            trim = MakeMaterial("Antique gold binding", new Color(0.64f, 0.48f, 0.21f), 0.4f);
            rodMesh = CreateRodMesh();
            ownedResources.Add(rodMesh);
            leftWing = BuildWing(-1f);
            rightWing = BuildWing(1f);
            Rod(new Vector3(0f, 0.015f, -0.68f), new Vector3(0f, 0.025f, 0.24f), 0.028f, bamboo, rig);
            Rod(new Vector3(-0.16f, -0.17f, -0.12f), new Vector3(0.16f, -0.17f, -0.12f), 0.025f, bamboo, rig);
            Rod(new Vector3(-0.16f, -0.17f, -0.12f), new Vector3(-0.32f, 0.025f, -0.18f), 0.013f, trim, rig);
            Rod(new Vector3(0.16f, -0.17f, -0.12f), new Vector3(0.32f, 0.025f, -0.18f), 0.013f, trim, rig);
            rig.gameObject.SetActive(false);
        }

        public void SetDeployed(bool value)
        {
            if (!rig) Configure(null);
            if (deployed == value) return;
            deployed = value;
            if (value)
            {
                opening = 0f;
                rig.gameObject.SetActive(true);
                PoseWings();
            }
            else
            {
                opening = 0f;
                rig.gameObject.SetActive(false);
            }
        }

        private void LateUpdate()
        {
            if (!deployed || !rig) return;
            opening = Mathf.MoveTowards(opening, 1f, Time.deltaTime / 0.22f);
            PoseWings();
        }

        private void PoseWings()
        {
            float folded = 1f - Mathf.SmoothStep(0f, 1f, opening);
            float bank = Mathf.Sin(Time.time * 2.1f) * 1.2f * opening;
            leftWing.localRotation = Quaternion.Euler(0f, 0f, -folded * 72f + bank);
            rightWing.localRotation = Quaternion.Euler(0f, 0f, folded * 72f - bank);
        }

        private Transform BuildWing(float side)
        {
            Transform wing = new GameObject(side < 0f ? "Left curved paper wing" : "Right curved paper wing").transform;
            wing.SetParent(rig, false);
            // A swept leading edge and scalloped swallow tail; no rectangular flat wing planes.
            Vector2[] outline =
            {
                new Vector2(0.08f, 0.05f), new Vector2(0.37f, 0.19f),
                new Vector2(0.72f, 0.17f), new Vector2(1.07f, 0.02f),
                new Vector2(1.38f, -0.22f), new Vector2(1.57f, -0.52f),
                new Vector2(1.26f, -0.46f), new Vector2(1.08f, -0.64f),
                new Vector2(0.90f, -0.52f), new Vector2(0.69f, -0.85f),
                new Vector2(0.51f, -0.64f), new Vector2(0.29f, -0.79f),
                new Vector2(0.08f, -0.40f)
            };
            Vector3 center = WingPoint(new Vector2(0.57f, -0.29f), side);
            var vertices = new List<Vector3>();
            var triangles = new List<int>();
            const int rings = 5;
            vertices.Add(center);
            for (int ring = 1; ring <= rings; ring++)
                for (int i = 0; i < outline.Length; i++)
                {
                    Vector2 p = Vector2.Lerp(new Vector2(0.57f, -0.29f), outline[i], ring / (float)rings);
                    vertices.Add(WingPoint(p, side));
                }
            for (int i = 0; i < outline.Length; i++)
                AddTriangle(triangles, 0, 1 + i, 1 + (i + 1) % outline.Length, side);
            for (int ring = 1; ring < rings; ring++)
                for (int i = 0; i < outline.Length; i++)
                {
                    int a = 1 + (ring - 1) * outline.Length + i;
                    int b = 1 + (ring - 1) * outline.Length + (i + 1) % outline.Length;
                    int c = 1 + ring * outline.Length + i;
                    int d = 1 + ring * outline.Length + (i + 1) % outline.Length;
                    AddTriangle(triangles, a, c, b, side);
                    AddTriangle(triangles, b, c, d, side);
                }
            // A separate underside provides real thin-sheet volume and correct back-face lighting.
            int topCount = vertices.Count;
            for (int i = 0; i < topCount; i++) vertices.Add(vertices[i] - Vector3.up * 0.015f);
            int topIndices = triangles.Count;
            for (int i = 0; i < topIndices; i += 3)
            {
                triangles.Add(triangles[i] + topCount);
                triangles.Add(triangles[i + 2] + topCount);
                triangles.Add(triangles[i + 1] + topCount);
            }
            for (int i = 0; i < outline.Length; i++)
            {
                int a = 1 + (rings - 1) * outline.Length + i;
                int b = 1 + (rings - 1) * outline.Length + (i + 1) % outline.Length;
                AddTriangle(triangles, a, a + topCount, b, side);
                AddTriangle(triangles, b, a + topCount, b + topCount, side);
            }
            MeshObject("Curved ivory paper", vertices, triangles, paper, wing);
            Vector3 hub = WingPoint(new Vector2(0.08f, -0.20f), side) - Vector3.up * 0.02f;
            foreach (int tip in new[] { 1, 3, 5, 7, 9, 11 })
            {
                Vector2 start = new Vector2(0.08f, -0.20f);
                Vector3 previous = hub;
                for (int segment = 1; segment <= 6; segment++)
                {
                    Vector3 next = WingPoint(Vector2.Lerp(start, outline[tip], segment / 6f), side) - Vector3.up * 0.024f;
                    Rod(previous, next, 0.014f, bamboo, wing);
                    previous = next;
                }
            }
            for (int i = 0; i < outline.Length; i++)
            {
                Vector2 a = outline[i], b = outline[(i + 1) % outline.Length];
                for (int segment = 0; segment < 3; segment++)
                    Rod(WingPoint(Vector2.Lerp(a, b, segment / 3f), side),
                        WingPoint(Vector2.Lerp(a, b, (segment + 1) / 3f), side), 0.012f, trim, wing);
            }
            // Narrow jade feather inlays follow the curvature, rather than using an external texture.
            AddInlay(new[] { new Vector2(0.29f, -0.16f), new Vector2(0.75f, -0.04f),
                new Vector2(1.29f, -0.31f), new Vector2(0.78f, -0.18f), new Vector2(0.41f, -0.26f) }, side, wing);
            AddInlay(new[] { new Vector2(0.34f, -0.38f), new Vector2(0.59f, -0.49f),
                new Vector2(0.69f, -0.76f), new Vector2(0.48f, -0.53f) }, side, wing);
            return wing;
        }

        private static Vector3 WingPoint(Vector2 point, float side)
        {
            float arch = 0.12f * Mathf.Sin(Mathf.Clamp01(point.x / 1.57f) * Mathf.PI);
            float chord = 0.035f * Mathf.Cos((point.y + 0.28f) * 4f);
            return new Vector3(point.x * side, arch + chord, point.y);
        }

        private void AddInlay(Vector2[] outline, float side, Transform parent)
        {
            var vertices = new List<Vector3>();
            var triangles = new List<int>();
            foreach (Vector2 point in outline) vertices.Add(WingPoint(point, side) + Vector3.up * 0.004f);
            for (int i = 1; i < outline.Length - 1; i++) AddTriangle(triangles, 0, i, i + 1, side);
            MeshObject("Jade feather inlay", vertices, triangles, jade, parent);
        }

        private static void AddTriangle(List<int> indices, int a, int b, int c, float side)
        {
            indices.Add(a);
            indices.Add(side > 0f ? b : c);
            indices.Add(side > 0f ? c : b);
        }

        private void MeshObject(string name, List<Vector3> vertices, List<int> triangles, Material material, Transform parent)
        {
            var mesh = new Mesh { name = name };
            mesh.SetVertices(vertices);
            mesh.SetTriangles(triangles, 0);
            mesh.RecalculateNormals();
            mesh.RecalculateBounds();
            ownedResources.Add(mesh);
            var part = new GameObject(name, typeof(MeshFilter), typeof(MeshRenderer));
            part.transform.SetParent(parent, false);
            part.GetComponent<MeshFilter>().sharedMesh = mesh;
            part.GetComponent<MeshRenderer>().sharedMaterial = material;
        }

        private Material MakeMaterial(string name, Color color, float smoothness)
        {
            Shader shader = GraphicsSettings.currentRenderPipeline ? Shader.Find("Universal Render Pipeline/Lit") : Shader.Find("Standard");
            if (!shader) shader = Shader.Find("Standard");
            if (!shader) shader = Shader.Find("Universal Render Pipeline/Unlit");
            if (!shader) shader = Shader.Find("Unlit/Color");
            var material = new Material(shader) { name = name, color = color };
            if (material.HasProperty("_BaseColor")) material.SetColor("_BaseColor", color);
            if (material.HasProperty("_Smoothness")) material.SetFloat("_Smoothness", smoothness);
            if (material.HasProperty("_Glossiness")) material.SetFloat("_Glossiness", smoothness);
            ownedResources.Add(material);
            return material;
        }

        private void Rod(Vector3 a, Vector3 b, float radius, Material material, Transform parent)
        {
            var rod = new GameObject("Bamboo / binding", typeof(MeshFilter), typeof(MeshRenderer));
            rod.transform.SetParent(parent, false);
            rod.transform.localPosition = (a + b) * 0.5f;
            rod.transform.localRotation = Quaternion.FromToRotation(Vector3.up, (b - a).normalized);
            rod.transform.localScale = new Vector3(radius, Vector3.Distance(a, b), radius);
            rod.GetComponent<MeshFilter>().sharedMesh = rodMesh;
            rod.GetComponent<MeshRenderer>().sharedMaterial = material;
        }

        private static Mesh CreateRodMesh()
        {
            const int sides = 6;
            var vertices = new List<Vector3>();
            var indices = new List<int>();
            for (int end = 0; end < 2; end++)
                for (int i = 0; i < sides; i++)
                {
                    float angle = i * Mathf.PI * 2f / sides;
                    vertices.Add(new Vector3(Mathf.Cos(angle), end - 0.5f, Mathf.Sin(angle)));
                }
            for (int i = 0; i < sides; i++)
            {
                int next = (i + 1) % sides;
                indices.AddRange(new[] { i, i + sides, next, next, i + sides, next + sides });
            }
            var mesh = new Mesh { name = "Six-sided bamboo rod" };
            mesh.SetVertices(vertices);
            mesh.SetTriangles(indices, 0);
            mesh.RecalculateNormals();
            mesh.RecalculateBounds();
            return mesh;
        }

        private void OnDestroy()
        {
            foreach (Object resource in ownedResources) if (resource) Destroy(resource);
            ownedResources.Clear();
        }
    }
}
