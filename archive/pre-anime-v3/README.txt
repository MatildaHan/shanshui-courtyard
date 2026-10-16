东方古韵 · 山水楼阁 — 阿棠角色版
================================

项目根目录：D:\DesktopFile\game\shanshui-courtyard

启动
在项目目录运行 python start.py，自动选择空闲端口并打开浏览器；Ctrl+C 结束。
也可直接双击 dist/shanshui-courtyard-single.html。
该单文件内嵌 Three.js、官方扩展、角色 GLB 和纹理，无需联网。
开发版 index.html 使用本地 ES 模块，需要通过 HTTP 服务访问。

操作
WASD / 方向键移动，Shift 慢跑；拖动调整镜头，滚轮调整跟随距离。
手机使用屏幕方向按钮。走正面台阶和敞开的门进入一层，右侧木梯通往二层。
墙体、池水有碰撞边界，石桥可通行；近墙镜头避让，必要时角色淡化。
“少女漫游”切换角色控制和建筑总览；正面/鸟瞰切换建筑视角。
重置回到入口或恢复建筑视角；白昼/黄昏/夜景切换光照。
总览时左键旋转、右键平移、滚轮缩放；点击建筑查看构件说明。

文件分类
src/                   场景、移动碰撞及角色动画代码
  scene.js             建筑、植物、水面、光照、交互
  explore.js           第三人称移动、房间/楼梯碰撞、相机
  character.js         GLB 加载、Idle/Walk/Run 动画过渡和淡化
assets/concepts/       阿棠角色设定图及提示词
assets/characters/     atang.glb，含骨骼、动画、纹理
assets/textures/       外置纹理预留；本角色纹理已嵌入 GLB
blender/Atang.blend    可编辑角色、材质、25 根骨骼及三个动画
blender/scripts/       按序编号的 MCP 建模、绑定、修正及导出源码
docs/screenshots/      Blender 实际渲染及游戏验收截图
tests/browser/         Playwright 验收脚本
tests/results/         实际验收记录与模型验证报告
tools/build-single.py  根据当前源码和模型重新生成离线单文件
tools/package.py       生成当前版交付压缩包
vendor/                Three.js 0.170.0、官方扩展及 MIT 许可证
dist/                  当前离线单文件及交付压缩包
archive/v1/            旧版源码和交付包
start.py               仅监听 127.0.0.1 的静态服务

角色制作
先制作符合“东方古韵 · 山水楼阁”的设定图，再用本机 Blender 5.2.2
通过 Blender MCP 建模。脸部轮廓、杏眼、双髻、发辫、交领宽袖、褶裙、
梅花绣边、布鞋为实际三维几何；织物纹理由本地程序生成并嵌入模型。
风格为古风卡通，与设定图保持主要设计和配色一致，并非照片级复刻。
Blender 网格共 53,420 顶点、25 根骨骼、20 个材质分区。
动作包含 Idle 待机、Walk 步行、Run 慢跑及裙摆、发辫、飘带摆动。
运行时采用骨骼动画，不用图片替代角色。

制作与费用
代码由当前 Codex 助手编写，角色通过本地 Blender MCP 制作。
设定图用了用户要求的一次内置图像生成。
未调用 Gemini / OpenCode Go、Meshy、Tripo、Hyper3D 或收费云端 3D 生成。
游戏不包含 API Key、推理接口、计费调用或外部网络资源。

验收（2026-10-15）
角色加载和 Idle/Walk/Run 切换、停止回 Idle 已实测。
实际键盘走通入口、一层、上楼、二层、下楼；墙体、池水边界与石桥通过。
总览切换、手机移动、三种光照、视角、构件点选、旋转缩放平移通过。
1440×1000 与 390×844 布局检查，验收期间无 JavaScript 运行错误。
具体记录见 tests/results，截图见 docs/screenshots。

边界
庭院建筑仍为原有 Three.js 程序化几何，本次重建的是角色。
斗拱和屋顶是艺术化表达，并非历史建筑测绘复原。
碰撞是本庭院适用的运动学控制，没有跳跃、战斗或完整刚体物理。
需要 WebGL 2 浏览器。低性能设备可降低像素比、反射或阴影尺寸。

