using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Rendering;

namespace Shanshui
{
    /// <summary>Local Blender architecture plus the courtyard's landscape and physics.</summary>
    public sealed class CourtyardWorld : MonoBehaviour
    {
        public GameObject architecturePrefab;
        public GameObject characterPrefab;
        public AnimationClip[] characterAnimations;
        public bool ArchitectureLoaded { get; private set; }
        public string LoadNotice { get; private set; } = "";
        public string Mode { get; private set; } = "dusk";
        public AtangPlayerController Player { get; private set; }
        public Camera ViewCamera { get; private set; }
        public bool Overview { get; private set; }
        public static readonly Vector3 Spawn = new Vector3(-1.4f, .08f, -11.8f);
        readonly List<Light> lamps = new List<Light>();
        readonly List<Material> papers = new List<Material>();
        Light sun;
        Material grass, stone, wood, leaf, red, water;
        Transform environmentRoot;

        public static Vector3 P(float x, float y, float threeZ) => new Vector3(x, y, -threeZ);

        void Awake()
        {
            ViewCamera = Camera.main;
            if (!ViewCamera)
            {
                ViewCamera = new GameObject("Main Camera", typeof(Camera), typeof(AudioListener)).GetComponent<Camera>();
                ViewCamera.tag = "MainCamera";
            }
            ViewCamera.nearClipPlane = .08f;
            ViewCamera.farClipPlane = 400;
            ViewCamera.allowHDR = true;
            environmentRoot = new GameObject("Landscape and Collisions").transform;
            environmentRoot.SetParent(transform);
            grass = Mat("青苔草地", new Color(.26f,.36f,.22f), .12f);
            stone = Mat("青石", new Color(.62f,.66f,.60f), .18f);
            wood = Mat("深木", new Color(.23f,.14f,.09f), .24f);
            red = Mat("朱红木漆", new Color(.53f,.16f,.10f), .3f);
            leaf = Mat("松竹叶", new Color(.19f,.32f,.21f), .15f);
            water = Mat("清池", new Color(.20f,.40f,.38f), .88f);
            BuildLandscape();
            BuildArchitecture();
            BuildLights();
            SpawnPlayer();
            gameObject.AddComponent<CourtyardHUD>().world = this;
            SetMode("dusk");
        }

        void BuildArchitecture()
        {
            if (!architecturePrefab)
            {
                LoadNotice = "精细建筑资源尚未导入；请同步 courtyard.glb 并重新生成场景。";
                return;
            }
            var building = Instantiate(architecturePrefab, transform);
            building.name = "听雨阁 · Blender 精细建筑";
            // glTFast reflects X. Rotation Y=180 makes the combined conversion reflect Z.
            building.transform.localRotation = Quaternion.Euler(0, 180, 0);
            ArchitectureLoaded = building.GetComponentsInChildren<Renderer>().Length > 0;
            if (!ArchitectureLoaded) { LoadNotice = "建筑资源没有可显示的网格。"; return; }
            // Detailed meshes serve camera and inspection rays. Simpler room colliders serve the body.
            Physics.IgnoreLayerCollision(0,9,true);
            foreach(var filter in building.GetComponentsInChildren<MeshFilter>())
            {
                if(!filter.sharedMesh)continue;
                filter.gameObject.layer=9;
                var picker=filter.gameObject.AddComponent<MeshCollider>();picker.sharedMesh=filter.sharedMesh;
            }
            foreach (var renderer in building.GetComponentsInChildren<Renderer>())
                foreach (var material in renderer.materials)
                    if (material.name.IndexOf("paper", StringComparison.OrdinalIgnoreCase) >= 0 || material.name.Contains("窗纸")) papers.Add(material);
            BuildRoomCollisions();
        }

        void SpawnPlayer()
        {
            if (!characterPrefab) { LoadNotice += " 角色模型尚未导入。"; SetView("front"); return; }
            var root = new GameObject("阿棠");
            root.transform.position = Spawn;
            Player = root.AddComponent<AtangPlayerController>();
            Player.collisionLayers = ~(1 << 9);
            Player.cameraObstacles = ~0;
            var model = Instantiate(characterPrefab, root.transform);
            model.name = "Atang Blender Model";
            Player.Configure(model.transform, ViewCamera);
            if(characterAnimations!=null && characterAnimations.Length>0)Player.ConfigureAnimations(characterAnimations);
            Player.Reset(Spawn, Quaternion.identity);
        }

        void BuildLandscape()
        {
            Box("Ground", P(0,-.2f,0), new Vector3(200,.4f,200), grass);
            // A real arched bridge, with 32 short, walkable sections.
            Box("Pond water", P(-8,.035f,9), new Vector3(10.75f,.05f,6.75f), water, false);
            foreach (float x in new[]{-13.6f,-2.4f}) Box("池岸", P(x,.10f,9), new Vector3(.35f,.3f,7.4f), stone);
            foreach (float z in new[]{5.4f,12.6f}) Box("池岸", P(-8,.10f,z), new Vector3(11.55f,.3f,.35f), stone);
            var hazard = new GameObject("Pond shallow water recovery");
            hazard.transform.SetParent(environmentRoot);
            hazard.transform.position = P(-8,.065f,9);
            var trigger = hazard.AddComponent<BoxCollider>(); trigger.size = new Vector3(10.6f,.15f,6.6f); trigger.isTrigger = true;
            hazard.AddComponent<CourtyardWaterRecovery>();
            for (int i=0;i<32;i++)
            {
                float za=4.9f+i*8.2f/32, zb=za+8.2f/32;
                float ya=BridgeY(za), yb=BridgeY(zb);
                var section=Box("石拱桥桥面", P(-7.55f,(ya+yb)*.5f-.10f,(za+zb)*.5f), new Vector3(2.1f,.20f,Mathf.Sqrt((zb-za)*(zb-za)+(yb-ya)*(yb-ya))+.02f), stone);
                section.transform.rotation=Quaternion.Euler(Mathf.Atan2(yb-ya,zb-za)*Mathf.Rad2Deg,0,0);
            }
            for(int i=0;i<11;i++) foreach(float side in new[]{-1f,1f})
            {
                float z=5+i*.8f, y=BridgeY(z);
                Box("桥栏望柱", P(-7.55f+side*1.12f,y+.42f,z),new Vector3(.13f,.84f,.13f),stone);
                if(i<10) Beam("桥栏扶手",P(-7.55f+side*1.12f,y+.8f,z),P(-7.55f+side*1.12f,BridgeY(z+.8f)+.8f,z+.8f),.09f,stone);
            }
            for(int x=-6;x<=6;x++) for(int z=0;z<9;z++)
            {
                float xx=x*.83f,zz=5.9f+z*.83f;
                if(xx<-2.2f && zz<12.9f)continue;
                Box("石板路",P(xx,.035f,zz),new Vector3(.78f,.07f,.78f),stone,false);
            }
            foreach(float side in new[]{-1f,1f})for(int j=0;j<22;j++)Box("侧院石路",P(side*8,.025f,-8+j*.8f),new Vector3(1.55f,.05f,.74f),stone,false);
            Pine(-12.8f,-4.1f,8.8f); Pine(13,-9.8f,8); Pine(-13,12.8f,5.7f); Pine(15,7,6.7f);
            Bamboo(13.1f,-3.5f,22); Bamboo(-13.2f,-10.8f,13); Bamboo(12.7f,10.1f,11);
            for(int i=0;i<11;i++)
            {
                float x=-65+i*13, h=12+Mathf.Sin(i*2.1f)*6;
                var mountain=Primitive("远山",PrimitiveType.Sphere,P(x,h*.25f,-45-(i%3)*13),new Vector3(18,h,12),Mat("山岚",new Color(.28f+i%3*.05f,.38f+i%3*.04f,.35f+i%3*.05f),0),false);
                mountain.transform.rotation=Quaternion.Euler(0,i*41,12);
            }
            // Purpose-built ledge: distinct collision faces and enough room to launch a glider.
            for(int i=0;i<3;i++)
            {
                var rock=Box("可攀爬叠石",P(7.6f,.775f+i*1.515f,9),new Vector3(2.5f-i*.15f,1.55f,2.4f-i*.12f),stone);
                rock.AddComponent<AtangClimbableSurface>();
            }
            for(int i=0;i<6;i++)
            {
                var positions=new[]{new Vector2(-2,8),new Vector2(4.8f,8),new Vector2(-12,4.6f),new Vector2(12,4.6f),new Vector2(-4.8f,-6.8f),new Vector2(4.8f,-6.8f)};
                StoneLantern(positions[i].x,positions[i].y);
            }
            // Perimeter collision is deliberately lower than the mountains and never blocks the sky.
            Box("西侧边界",P(-16.3f,1.2f,-2),new Vector3(.4f,2.7f,25),null);
            Box("东侧边界",P(16.3f,1.2f,-2),new Vector3(.4f,2.7f,25),null);
            Box("北侧边界",P(0,1.2f,-14.3f),new Vector3(33,2.7f,.4f),null);
        }

        float BridgeY(float z)=>.35f+.9f*(1-Mathf.Pow((z-9)/4.1f,2));

        void BuildRoomCollisions()
        {
            Box("台基碰撞",P(0,.415f,0),new Vector3(13.2f,.83f,9.6f),null);
            Box("一层地板",P(0,.935f,0),new Vector3(11.1f,.21f,7.1f),null);
            Ramp("入户台阶平滑碰撞",P(0,.08f,6),P(0,.83f,4.55f),5.2f);
            Box("二层西楼板",P(-1.2f,5.55f,0),new Vector3(7.4f,.26f,6.7f),null);
            Box("二层东南楼板",P(3.7f,5.55f,2.3f),new Vector3(2.4f,.26f,2.1f),null);
            Box("二层东北楼板",P(3.7f,5.55f,-2.84f),new Vector3(2.4f,.26f,1.02f),null);
            // Start the landing at the slope crest; its earlier visual overhang must not block the capsule.
            Box("楼梯上平台",P(3.2f,5.55f,-2.325f),new Vector3(1.4f,.26f,.65f),null);
            Ramp("楼梯平滑碰撞",P(3.35f,1.04f,3),P(3.35f,5.68f,-2),.96f);
            float[,] walls={
                {-5.54f,-5.31f,-3.55f,3.55f,.8f,4.1f},{5.31f,5.54f,-3.55f,3.55f,.8f,4.1f},{-5.54f,5.54f,-3.55f,-3.32f,.8f,4.1f},
                {-5.54f,-2.51f,3.32f,3.59f,.8f,4.1f},{-.29f,5.54f,3.32f,3.59f,.8f,4.1f},
                {-4.05f,-3.82f,-2.52f,2.52f,5.5f,8.4f},{3.82f,4.05f,-2.52f,2.52f,5.5f,8.4f},{-4.05f,4.05f,-2.52f,-2.3f,5.5f,8.4f},
                {-4.05f,-1.2f,2.3f,2.55f,5.5f,8.4f},{1.2f,4.05f,2.3f,2.55f,5.5f,8.4f},
                {-2.1f,-.1f,-1.3f,-.1f,.9f,1.9f},{-3.3f,-2.7f,-1.1f,-.3f,.9f,1.9f},{.5f,1.1f,-1.1f,-.3f,.9f,1.9f},
                {-4.8f,-2.8f,-3.05f,-2.48f,.9f,3.1f},{-1.7f,-.3f,-.5f,.5f,5.5f,6.6f}};
            for(int i=0;i<walls.GetLength(0);i++)Box("房间墙体/家具碰撞",P((walls[i,0]+walls[i,1])/2,(walls[i,4]+walls[i,5])/2,(walls[i,2]+walls[i,3])/2),new Vector3(walls[i,1]-walls[i,0],walls[i,5]-walls[i,4],walls[i,3]-walls[i,2]),null);
            foreach(float x in new[]{-5.6f,-2.8f,0,2.8f,5.6f}) foreach(float z in new[]{-3.8f,3.8f})ColumnCollider(x,z,.83f,4.3f);
            foreach(float x in new[]{-5.6f,5.6f}) foreach(float z in new[]{-1.25f,1.25f})ColumnCollider(x,z,.83f,4.3f);
            foreach(float x in new[]{-4.15f,-1.4f,1.4f,4.15f})foreach(float z in new[]{-2.72f,2.72f})ColumnCollider(x,z,5.55f,8.3f);
            foreach(float side in new[]{-1f,1f})
            {
                Box("回廊地板",P(side*10,.125f,-.5f),new Vector3(2.65f,.25f,13.5f),null);
                for(int i=0;i<=6;i++)foreach(float x in new[]{-.95f,.95f})ColumnCollider(side*10+x,-7.25f+i*2.25f,.25f,3);
            }
            Box("后回廊地板",P(0,.125f,-9.5f),new Vector3(22,.25f,2.65f),null);
        }

        void ColumnCollider(float x,float z,float bottom,float top)=>Box("木柱碰撞",P(x,(bottom+top)/2,z),new Vector3(.38f,top-bottom,.38f),null);
        void Ramp(string label,Vector3 start,Vector3 end,float width)
        {
            var delta=end-start;
            var ramp=Box(label,(start+end)/2-Vector3.up*.08f,new Vector3(width,.16f,delta.magnitude+.08f),null);
            ramp.transform.rotation=Quaternion.LookRotation(delta.normalized,Vector3.up);
        }
        void Pine(float x,float z,float height)
        {
            Primitive("古松树干",PrimitiveType.Cylinder,P(x,height/2,z),new Vector3(.45f,height/2,.45f),wood);
            for(int i=0;i<8;i++)
            {
                float angle=i*2.4f, spread=1.6f-i*.12f;
                var end=P(x+Mathf.Cos(angle)*spread,height*(.43f+i*.065f),z+Mathf.Sin(angle)*spread);
                Beam("松枝",P(x,height*(.4f+i*.065f),z),end,.12f,wood);
                Primitive("松针冠",PrimitiveType.Sphere,end,new Vector3(2.6f,.75f,2.0f),leaf,false);
            }
        }
        void Bamboo(float x,float z,int count)
        {
            var random=new System.Random((int)((x+30)*101+(z+30)*17));
            for(int i=0;i<count;i++)
            {
                float xx=x+(float)random.NextDouble()*3-1.5f,zz=z+(float)random.NextDouble()*3-1.5f,h=3.5f+(float)random.NextDouble()*3;
                Primitive("竹竿",PrimitiveType.Cylinder,P(xx,h/2,zz),new Vector3(.09f,h/2,.09f),leaf,false);
                for(int j=0;j<3;j++) Primitive("竹叶",PrimitiveType.Sphere,P(xx+.35f*(j%2==0?1:-1),h*.55f+j*.6f,zz),new Vector3(1.1f,.20f,.60f),leaf,false);
            }
        }
        void StoneLantern(float x,float z)
        {
            Box("石灯笼基座",P(x,.13f,z),new Vector3(.8f,.26f,.8f),stone);
            Primitive("石灯笼柱",PrimitiveType.Cylinder,P(x,.62f,z),new Vector3(.28f,.4f,.28f),stone);
            Box("石灯笼灯室",P(x,1.3f,z),new Vector3(.55f,.55f,.55f),stone);
            Box("石灯笼顶盖",P(x,1.65f,z),new Vector3(.8f,.13f,.8f),stone);
            AddLamp(P(x,1.35f,z),4);
        }
        void AddLamp(Vector3 position,float range)
        {
            var lamp=new GameObject("Warm lantern").AddComponent<Light>(); lamp.transform.SetParent(environmentRoot);lamp.transform.position=position;
            lamp.type=LightType.Point;lamp.range=range;lamp.color=new Color(1,.64f,.30f);lamp.shadows=LightShadows.None;lamps.Add(lamp);
        }
        void BuildLights()
        {
            sun=new GameObject("Sun").AddComponent<Light>();sun.type=LightType.Directional;sun.shadows=LightShadows.Soft;sun.shadowBias=.035f;sun.shadowNormalBias=.25f;
            RenderSettings.ambientMode=AmbientMode.Trilight; RenderSettings.fog=true;RenderSettings.fogMode=FogMode.Exponential;RenderSettings.fogDensity=.009f;
            foreach(float x in new[]{-4.2f,4.2f})AddLamp(P(x,3.18f,4),7);
            AddLamp(P(0,3.35f,0),8);AddLamp(P(-1,7.9f,0),7);
            QualitySettings.shadows=ShadowQuality.All;QualitySettings.shadowDistance=65;QualitySettings.shadowResolution=ShadowResolution.High;
        }
        public void SetMode(string value)
        {
            Mode=value;bool night=value=="night",day=value=="day";
            sun.color=night?new Color(.60f,.73f,1):day?new Color(1,.95f,.83f):new Color(1,.69f,.40f);
            sun.intensity=night?.35f:day?1.25f:1.4f;sun.transform.rotation=Quaternion.Euler(night?55:day?58:26,night?-40:-58,0);
            var sky=night?new Color(.035f,.085f,.14f):day?new Color(.49f,.68f,.72f):new Color(.43f,.57f,.58f);
            ViewCamera.backgroundColor=sky;RenderSettings.fogColor=sky;RenderSettings.ambientSkyColor=sky;RenderSettings.ambientEquatorColor=sky*.75f;RenderSettings.ambientGroundColor=new Color(.18f,.22f,.15f)*(night?.4f:1);
            foreach(var lamp in lamps)lamp.intensity=night?2.3f:day?.1f:.65f;
            foreach(var paper in papers){paper.EnableKeyword("_EMISSION");if(paper.HasProperty("_EmissionColor"))paper.SetColor("_EmissionColor",new Color(1,.59f,.25f)*(night?1.1f:day?.02f:.1f));if(paper.HasProperty("emissiveFactor"))paper.SetColor("emissiveFactor",new Color(1,.59f,.25f)*(night?1.1f:.05f));}
        }
        public void SetView(string view)
        {
            Overview=true;if(Player)Player.SetEnabled(false);Cursor.lockState=CursorLockMode.None;Cursor.visible=true;
            ViewCamera.transform.position=view=="front"?P(0,12,32):P(21,40,26);
            ViewCamera.transform.LookAt(view=="front"?P(0,4.7f,0):Vector3.zero);ViewCamera.fieldOfView=45;
        }
        public void Resume(){Overview=false;if(Player)Player.SetEnabled(true);}
        public void ResetPlayer(){if(Player){Player.Reset(Spawn,Quaternion.identity);Resume();}}
        static Material Mat(string name,Color color,float smoothness)
        {
            var m=new Material(Shader.Find("Standard")){name=name,color=color};m.SetFloat("_Glossiness",smoothness);return m;
        }
        GameObject Box(string label,Vector3 position,Vector3 size,Material mat,bool collision=true)=>Primitive(label,PrimitiveType.Cube,position,size,mat,collision);
        GameObject Primitive(string label,PrimitiveType type,Vector3 position,Vector3 scale,Material mat,bool collision=true)
        {
            var g=GameObject.CreatePrimitive(type);g.name=label;g.transform.SetParent(environmentRoot);g.transform.position=position;g.transform.localScale=scale;
            var renderer=g.GetComponent<Renderer>();if(mat)renderer.sharedMaterial=mat;else renderer.enabled=false;
            if(!collision)Destroy(g.GetComponent<Collider>());return g;
        }
        void Beam(string label,Vector3 a,Vector3 b,float width,Material mat)
        {
            var beam=Box(label,(a+b)/2,new Vector3(width,width,(b-a).magnitude),mat,false);beam.transform.rotation=Quaternion.LookRotation(b-a);
        }
    }
}
