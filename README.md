# 山水楼阁 · 阿棠行记

包含 Unity 游戏项目、Blender 建模源文件和浏览器预览版。

## 克隆项目

公开仓库，任何人都可以克隆或通过 GitHub 的 **Code → Download ZIP** 下载。

```sh
git clone https://github.com/landepend/shanshui-courtyard.git
cd shanshui-courtyard
```

已有本地副本可在项目目录运行 `git pull` 获取更新。

## 浏览器预览

安装 Python 3.9 或更新版本，然后运行：

```sh
python start.py
```

启动后会自动打开浏览器。第三方 JavaScript 库和模型已包含在仓库内，无需 npm 安装。

## Unity 项目

使用 Unity Hub 打开 `unity` 文件夹。编辑器版本见 `unity/ProjectSettings/ProjectVersion.txt`，依赖见 `unity/Packages/manifest.json`；首次打开需要联网安装依赖，并在系统中安装 Git。

具体操作和项目状态见 [项目说明](README.txt) 和 [Unity 说明](unity/README.txt)。现有记录尚未确认 Unity 编译、Play Mode 或 Windows EXE 构建成功。

## 目录

- `unity/`：Unity 项目源码与模型资源。
- `blender/`：Blender 源文件与建模脚本。
- `assets/`：跨引擎模型和设定图。
- `src/`、`index.html`、`vendor/`：浏览器预览版及依赖。
- `docs/`、`tests/`：说明、截图、测试脚本与已有验证记录。
- `tools/`：资源同步、打包及辅助工具。
- `archive/`：历史版本。

构建输出 `dist/`、编辑器缓存、日志和 Blender 自动备份未纳入版本控制。预览版可直接从源码启动。
