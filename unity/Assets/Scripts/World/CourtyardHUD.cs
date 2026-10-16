using UnityEngine;

namespace Shanshui
{
    public sealed class CourtyardHUD : MonoBehaviour
    {
        public CourtyardWorld world;
        GUIStyle title, text, small, panel, button;
        string partText = "";
        Font chineseFont;

        void Start()
        {
            chineseFont=Font.CreateDynamicFontFromOSFont(new[]{"Microsoft YaHei","SimSun","Arial"},20);
        }
        void Styles()
        {
            if(title!=null)return;
            title=new GUIStyle(GUI.skin.label){font=chineseFont,fontSize=32,fontStyle=FontStyle.Bold};title.normal.textColor=new Color(.94f,.87f,.70f);
            text=new GUIStyle(GUI.skin.label){font=chineseFont,fontSize=17,wordWrap=true};text.normal.textColor=new Color(.92f,.93f,.86f);
            small=new GUIStyle(text){fontSize=13};
            panel=new GUIStyle(GUI.skin.box){padding=new RectOffset(18,18,14,14)};
            button=new GUIStyle(GUI.skin.button){font=chineseFont,fontSize=15,margin=new RectOffset(4,4,4,4),padding=new RectOffset(12,12,9,9)};
        }
        void OnGUI()
        {
            if(!world)return;
            Styles();
            float factor=Mathf.Max(.7f,Screen.height/900f);
            GUI.matrix=Matrix4x4.Scale(new Vector3(factor,factor,1));
            float width=Screen.width/factor,height=Screen.height/factor;
            GUI.Label(new Rect(35,30,500,45),"山水楼阁 · 阿棠行记",title);
            GUI.Label(new Rect(39,77,600,25),"一庭山水 · 半卷清风",small);
            if(!string.IsNullOrEmpty(world.LoadNotice))
            {
                GUI.Box(new Rect(width/2-290,25,580,75),"",panel);
                GUI.Label(new Rect(width/2-272,37,544,55),world.LoadNotice,text);
            }
            if(world.Player)
            {
                var state=world.Player.GetStatus();
                GUI.Box(new Rect(32,height-190,360,104),"",panel);
                GUI.Label(new Rect(49,height-180,325,30),"阿棠   "+state.Area,text);
                GUI.Label(new Rect(49,height-149,320,23),state.Action+"   体力 "+Mathf.CeilToInt(state.Stamina)+" / "+Mathf.CeilToInt(state.MaxStamina),small);
                GUI.backgroundColor=new Color(.18f,.25f,.20f);GUI.Box(new Rect(49,height-118,310,8),GUIContent.none);
                GUI.backgroundColor=new Color(.65f,.78f,.37f);GUI.Box(new Rect(49,height-118,310*state.NormalizedStamina,8),GUIContent.none);GUI.backgroundColor=Color.white;
            }
            GUILayout.BeginArea(new Rect(width/2-335,height-66,670,52));
            GUILayout.BeginHorizontal();
            if(GUILayout.Button("白昼",button))world.SetMode("day");
            if(GUILayout.Button("黄昏",button))world.SetMode("dusk");
            if(GUILayout.Button("夜景",button))world.SetMode("night");
            if(GUILayout.Button("正面",button))world.SetView("front");
            if(GUILayout.Button("鸟瞰",button))world.SetView("bird");
            if(GUILayout.Button("继续漫游",button))world.Resume();
            if(GUILayout.Button("回到入口",button))world.ResetPlayer();
            GUILayout.EndHorizontal();GUILayout.EndArea();
            GUI.Label(new Rect(35,height-225,width-70,30),"WASD 移动 · Shift 奔跑 · Ctrl 冲刺 · Space 跳跃/开伞 · E 攀爬 · X 松手 · 鼠标拖动视角 · 滚轮缩放",small);
            if(!string.IsNullOrEmpty(partText)){GUI.Box(new Rect(width-340,130,305,145),"",panel);GUI.Label(new Rect(width-322,145,269,116),partText,text);}
            GUI.matrix=Matrix4x4.identity;
        }
        void Update()
        {
            if(!world || !world.Overview || !Input.GetMouseButtonDown(0))return;
            var ray=world.ViewCamera.ScreenPointToRay(Input.mousePosition);
            if(Physics.Raycast(ray,out var hit,200,1<<9))
            {
                string name=hit.collider.name.ToLowerInvariant();
                partText=name.Contains("roof")?"重檐歇山顶\n曲面筒瓦、飞檐与屋脊组成两重屋面。":name.Contains("dougong")?"层叠斗拱\n柱头承托的多层斗、拱、升均为三维构件。":name.Contains("window")?"中式格栅门窗\n木框与窗棂分层构造，窗纸在夜间透出暖光。":name.Contains("corridor")?"环院回廊\n连通侧院的柱廊与檐下步行空间。":"朱柱木梁\n木构架、石础与梁枋连接两层庭院楼阁。";
            }
            else partText="";
        }
    }
}
