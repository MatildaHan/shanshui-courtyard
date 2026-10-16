using System;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEditor.SceneManagement;
using UnityEngine;

namespace Shanshui.Editor
{
    public static class CourtyardBuild
    {
        public const string ScenePath="Assets/Scenes/Courtyard.unity";

        [MenuItem("山水楼阁/生成庭院主场景")]
        public static void CreateScene()
        {
            var architecture=AssetDatabase.LoadAssetAtPath<GameObject>("Assets/Art/Architecture/courtyard.glb");
            var character=AssetDatabase.LoadAssetAtPath<GameObject>("Assets/Art/Characters/atang.glb");
            if(!architecture || !character)
                throw new InvalidOperationException("请先运行 tools/sync-unity-assets.ps1，并等待 glTFast 完成两个 GLB 的导入。");
            var scene=EditorSceneManager.NewScene(NewSceneSetup.EmptyScene,NewSceneMode.Single);
            var root=new GameObject("山水楼阁");
            var world=root.AddComponent<CourtyardWorld>();
            world.architecturePrefab=architecture;world.characterPrefab=character;
            world.characterAnimations=AssetDatabase.LoadAllAssetsAtPath("Assets/Art/Characters/atang.glb").OfType<AnimationClip>().Where(clip=>!clip.name.StartsWith("__preview__")).ToArray();
            var required=new[]{"Idle","Walk","Run","Sprint","Jump","Fall","Land","Climb","Glide"};
            foreach(var clip in required)if(!world.characterAnimations.Any(a=>a.name==clip))throw new InvalidOperationException("缺少角色动画："+clip);
            var camera=new GameObject("Main Camera",typeof(Camera),typeof(AudioListener));camera.tag="MainCamera";
            camera.transform.position=CourtyardWorld.P(0,12,32);camera.transform.LookAt(CourtyardWorld.P(0,4.7f,0));
            Directory.CreateDirectory("Assets/Scenes");
            EditorSceneManager.SaveScene(scene,ScenePath);
            EditorBuildSettings.scenes=new[]{new EditorBuildSettingsScene(ScenePath,true)};
            PlayerSettings.companyName="Shanshui Local";PlayerSettings.productName="山水楼阁 · 阿棠行记";
            PlayerSettings.defaultScreenWidth=1440;PlayerSettings.defaultScreenHeight=900;PlayerSettings.runInBackground=true;
            PlayerSettings.colorSpace=ColorSpace.Linear;
            // Old Input API is deliberately used; no cloud service or account is needed to play.
            var settings=new SerializedObject(AssetDatabase.LoadAllAssetsAtPath("ProjectSettings/ProjectSettings.asset")[0]);
            var handling=settings.FindProperty("activeInputHandler");if(handling!=null){handling.intValue=0;settings.ApplyModifiedPropertiesWithoutUndo();}
            var tags=new SerializedObject(AssetDatabase.LoadAllAssetsAtPath("ProjectSettings/TagManager.asset")[0]);
            var layers=tags.FindProperty("layers");if(layers!=null){layers.GetArrayElementAtIndex(9).stringValue="ArchitecturePick";tags.ApplyModifiedPropertiesWithoutUndo();}
            AssetDatabase.SaveAssets();
            Debug.Log("COURTYARD_SCENE_READY "+ScenePath);
        }

        [MenuItem("山水楼阁/构建 Windows 游戏")]
        public static void BuildWindows()
        {
            CreateScene();
            var output=Path.GetFullPath(Path.Combine(Application.dataPath,"../../dist/windows/ShanshuiCourtyard.exe"));
            Directory.CreateDirectory(Path.GetDirectoryName(output));
            var report=BuildPipeline.BuildPlayer(new BuildPlayerOptions{scenes=new[]{ScenePath},locationPathName=output,target=BuildTarget.StandaloneWindows64,options=BuildOptions.None});
            Debug.Log("COURTYARD_WINDOWS_BUILD "+report.summary.result+" "+output);
            if(report.summary.result!=BuildResult.Succeeded)throw new Exception("Windows build failed: "+report.summary.result);
        }
    }
}
