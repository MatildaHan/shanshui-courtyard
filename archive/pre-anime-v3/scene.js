import * as THREE from 'three';
import { OrbitControls } from 'three/addons/OrbitControls.js';
import { Reflector } from 'three/addons/Reflector.js';
import { RoomEnvironment } from 'three/addons/RoomEnvironment.js';
import { createExplorer } from './explore.js';

const $ = s => document.querySelector(s), TAU = Math.PI * 2;
const V = (x=0,y=0,z=0) => new THREE.Vector3(x,y,z);
let seed=7391; const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
const scene=new THREE.Scene(); scene.fog=new THREE.FogExp2(0x9baca0,.011);
const camera=new THREE.PerspectiveCamera(42,innerWidth/innerHeight,.15,350);
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.setSize(innerWidth,innerHeight);
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.12;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
$('#scene').appendChild(renderer.domElement);
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.065;
controls.minDistance=13;controls.maxDistance=110;controls.maxPolarAngle=Math.PI*.474;controls.minPolarAngle=.12;controls.target.set(0,4,1);
controls.enablePan=true;controls.panSpeed=.7;controls.rotateSpeed=.55;
const initial={pos:V(24,18,30),target:V(0,4,1)};function responsivePosition(pos,target){return target.clone().add(pos.clone().sub(target).multiplyScalar(Math.max(1,.85/camera.aspect)));}camera.position.copy(responsivePosition(initial.pos,initial.target));
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const root=new THREE.Group();scene.add(root);
const hemi=new THREE.HemisphereLight(0xcbdad0,0x505540,2);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xffd2a0,3.8);sun.position.set(-24,32,18);sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-34,right:34,top:30,bottom:-30,near:1,far:100});sun.shadow.camera.updateProjectionMatrix();sun.shadow.normalBias=.035;sun.shadow.bias=-.00015;sun.target.position.set(0,0,0);scene.add(sun,sun.target);
const fill=new THREE.DirectionalLight(0x9ebbc0,.8);fill.position.set(24,16,-10);scene.add(fill);
const pmrem=new THREE.PMREMGenerator(renderer);const room=new RoomEnvironment();scene.environment=pmrem.fromScene(room,.025).texture;scene.environmentIntensity=.22;room.dispose();pmrem.dispose();

function texture(kind){const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d');
  g.fillStyle=kind==='wood'?'#b29b7b':'#bdb9ac';g.fillRect(0,0,256,256);
  for(let i=0;i<3500;i++){const a=rand()*.13;g.fillStyle=`rgba(${kind==='wood'?'40,24,12':'57,62,53'},${a})`;const x=rand()*256,y=rand()*256;g.fillRect(x,y,kind==='wood'?1+rand()*2:rand()*5,kind==='wood'?30+rand()*160:rand()*4);}
  if(kind==='wood'){g.strokeStyle='#54442b25';for(let x=2;x<256;x+=8){g.beginPath();g.moveTo(x,0);for(let y=0;y<=256;y+=8)g.lineTo(x+Math.sin(y*.045+x)*3,y);g.stroke();}}
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());return t;}
const grain=texture('wood'),stoneTex=texture('stone');
function material(name,color,roughness=.8,extra={}){const m=new THREE.MeshStandardMaterial({color,roughness,...extra});m.name=name;return m;}
const M={wood:material('深色木梁',0x58382b,.86,{map:grain}),red:material('朱漆',0xb54a32,.6,{map:grain}),gold:material('铜饰',0xb49754,.37,{metalness:.65}),stone:material('青石',0xb2b6a5,.92,{map:stoneTex}),stoneDark:material('石缝',0x626f64,.98),paper:material('窗纸',0xcec6a6,.9,{emissive:0xffbb68,emissiveIntensity:.03}),wall:material('灰白墙',0xc3c8b1,1,{map:stoneTex}),tile:material('青灰筒瓦',0x50706b,.64,{metalness:.08}),tileDark:material('屋面',0x334e4c,.9),grass:material('草地',0x667754,1),leaf:material('松叶',0x476541,.95),bamboo:material('竹干',0x65825a,.85),black:material('室内暗部',0x182824,1),glow:new THREE.MeshBasicMaterial({color:0xffd694}),waterEdge:material('池岸',0x929e89,.95,{map:stoneTex})};
const G={box:new THREE.BoxGeometry(1,1,1),cylinder:new THREE.CylinderGeometry(1,1,1,12),sphere:new THREE.SphereGeometry(1,12,8),foliage:new THREE.IcosahedronGeometry(1,1)};
M.grass.color.set(0x425a39);M.leaf.color.set(0x46683e);M.paper.color.set(0xb9b494);M.stone.color.set(0xa9afa2);
function pineNeedles(){const v=[];for(let i=0;i<140;i++){const angle=rand()*TAU,r=Math.sqrt(rand()),x=Math.cos(angle)*r,z=Math.sin(angle)*r,y=(rand()-.5)*.48,len=.14+rand()*.18,w=.025+rand()*.025;v.push(x-w,y,z,x+w,y,z,x+.07,y+len,z+.04,x,y,z-w,x,y,z+w,x+.07,y+len,z+.04);}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(v,3));geo.computeVertexNormals();return geo;}
G.pine=pineNeedles();M.leaf.side=THREE.DoubleSide;
const info={
 roof:['01 / 屋顶','重檐歇山顶','上下两重出檐，山面上部为悬山式三角山花，下部转为四面坡。曲面筒瓦逐行搭接，翼角抬升，脊端设鸱吻意象。','黛瓦 · 飞檐 · 山花',V(0,10.2,2.6)],
 dougong:['02 / 承托','层叠斗拱','柱头之上，以斗、拱、升层层出跳，承接挑檐。这里采用多层交错的三维构件表达传统斗拱的空间秩序。','坐斗 · 拱臂 · 出跳',V(5.6,4.1,3.8)],
 column:['03 / 构架','朱柱与木梁','柱网围合出对称的开间，柱脚坐落在石础上，额枋与梁架连接各柱。朱漆与深木色形成清晰的结构层次。','石础 · 立柱 · 额枋',V(5.6,2.7,3.8)],
 window:['04 / 围护','中式格栅门窗','木框、横棂和回纹格栅均为立体构件。暖色窗纸退在木棂之后，夜间透出柔和灯光，呈现前后深度。','木棂 · 回纹 · 窗纸',V(2.8,2.5,3.45)],
 bridge:['05 / 庭院','清池与石桥','低拱石桥跨过清池，桥面和两侧栏杆沿同一弧线生成。水面实时反射庭院，以缓慢波纹打散倒影。','弧形桥面 · 水波 · 倒影',V(-8,.9,9)],
 corridor:['06 / 回廊','环院回廊','低矮回廊环抱主楼，以柱列与栏杆组织步行空间。檐线与主楼呼应，开放的院落保留池水和树影。','柱列 · 檐廊 · 栏杆',V(11,2.7,1)]
};
function group(tag,parent=root){const g=new THREE.Group();if(tag)g.userData.part=tag;parent.add(g);return g;}
function mesh(geo,mat,pos,scale,parent=root,rot=null){const m=new THREE.Mesh(geo,mat);if(pos)m.position.copy(pos);if(scale)m.scale.copy(scale);if(rot)m.rotation.set(...rot);m.castShadow=true;m.receiveShadow=true;m.userData.batch=Object.values(G).includes(geo);parent.add(m);return m;}
const box=(x,y,z,w,h,d,mat,parent=root,rot=null)=>mesh(G.box,mat,V(x,y,z),V(w,h,d),parent,rot);
const cyl=(x,y,z,r,h,mat,parent=root)=>mesh(G.cylinder,mat,V(x,y,z),V(r,h,r),parent);
function beam(a,b,width,depth,mat,parent=root){const mid=a.clone().add(b).multiplyScalar(.5),m=mesh(G.box,mat,mid,V(width,a.distanceTo(b),depth),parent);m.quaternion.setFromUnitVectors(V(0,1,0),b.clone().sub(a).normalize());return m;}
function tube(points,r,mat,parent=root){return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),Math.max(12,points.length*7),r,6,false),mat,null,null,parent);}
function column(x,z,base,height,parent){cyl(x,base+.15,z,.29,.3,M.stone,parent);cyl(x,base+.34,z,.24,.16,M.stone,parent);cyl(x,base+.38+height/2,z,.17,height,M.red,parent);cyl(x,base+.48,z,.19,.15,M.gold,parent);cyl(x,base+height+.34,z,.2,.13,M.wood,parent);}
function dougong(x,y,z,scale=1){const p=group('dougong');p.position.set(x,y,z);p.scale.setScalar(scale);
  box(0,0,0,.46,.22,.46,M.wood,p);box(0,.14,0,.31,.1,.31,M.gold,p);
  for(let level=0;level<3;level++){const yy=.27+level*.22,length=.7+level*.34;for(const axis of [0,1]){const arm=group(null,p);arm.rotation.y=axis*Math.PI/2;box(0,yy,0,length,.13,.15,M.red,arm);for(const sign of [-1,1]){beam(V(sign*length*.25,yy,0),V(sign*length*.49,yy+.12,0),.14,.16,M.wood,arm);box(sign*length*.43,yy+.15,0,.21,.13,.23,M.wood,arm);box(sign*length*.43,yy+.23,0,.18,.035,.19,M.gold,arm);}}}
}
function railing(a,b,y,parent=root){const length=a.distanceTo(b),n=Math.ceil(length/.75),g=group(null,parent);const aa=a.clone(),bb=b.clone();aa.y=bb.y=y+.7;beam(aa,bb,.1,.13,M.red,g);aa.y=bb.y=y+.17;beam(aa,bb,.09,.1,M.wood,g);for(let i=0;i<=n;i++){const p=a.clone().lerp(b,i/n);box(p.x,y+.43,p.z,.085,.7,.085,M.red,g);box(p.x,y+.34,p.z,.17,.12,.17,M.gold,g);}}
function latticeWindow(x,y,z,width,height,rotation=0,parent=root){const g=group('window',parent);g.position.set(x,y,z);g.rotation.y=rotation;
  box(0,0,-.045,width,height,.055,M.paper,g);for(const sx of [-1,1])box(sx*width/2,0,.015,.10,height+.15,.13,M.red,g);for(const sy of [-1,1])box(0,sy*height/2,.015,width+.10,.11,.13,M.red,g);
  const cols=Math.max(3,Math.round(width/.3)),rows=Math.max(3,Math.round(height/.38));for(let i=1;i<cols;i++)box(-width/2+i*width/cols,0,.06,.035,height,.065,M.wood,g);for(let j=1;j<rows;j++)box(0,-height/2+j*height/rows,.06,width,.035,.065,M.wood,g);
  for(let i=0;i<cols-1;i+=2)for(let j=0;j<rows-1;j+=2){const xx=-width/2+(i+1)*width/cols,yy=-height/2+(j+1)*height/rows;const a=.12;box(xx-a/2,yy,.09,.028,a*2,.04,M.gold,g);box(xx,yy+a,.09,a,.025,.04,M.gold,g);}return g;
}

// Barrel tile: a closed, thin half-cylinder, not a flat textured plane.
function barrelTile(){const vertices=[],indices=[],segments=7;for(let shell=0;shell<2;shell++)for(let end=0;end<2;end++)for(let i=0;i<=segments;i++){const angle=i*Math.PI/segments,r=.105-shell*.018;vertices.push(Math.cos(angle)*r,Math.sin(angle)*r,end? .22:-.22);}
 const ring=segments+1;for(let shell=0;shell<2;shell++)for(let i=0;i<segments;i++){const a=shell*ring*2+i,b=a+ring;indices.push(a,b,a+1,b,b+1,a+1);}for(let end=0;end<2;end++)for(let i=0;i<segments;i++){const a=end*ring+i,b=a+ring*2;indices.push(a,a+1,b,a+1,b+1,b);}for(let i of [0,segments])indices.push(i,i+ring,i+ring*2,i+ring,i+ring*3,i+ring*2);
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setIndex(indices);geo.computeVertexNormals();return geo;}
const tileGeo=barrelTile(),tileMatrices=[],tileColors=[],dummy=new THREE.Object3D();
function roofPoint(a,b,r,h,base,side,u,t){const expand=Math.max(0,(t-.38)/.62),xx=r+(a-r)*expand;const lift=.36*Math.pow(t,9)+.48*Math.pow(Math.abs(u),9)*Math.pow(t,5);const yy=base+h*Math.pow(1-t,1.68)+lift;
 return side<2?V(u*xx,yy,(side===0?1:-1)*b*t):V((side===2?1:-1)*xx,yy,u*b*t);}
function roof(a,b,height,base,parent=root,hole=0){const g=group('roof',parent),r=a*(hole>0?.5:.65);
 for(let side=0;side<4;side++){const t0=side<2?hole:Math.max(.38,hole),nu=48,nt=24,verts=[],idx=[];
  for(let j=0;j<=nt;j++)for(let i=0;i<=nu;i++){const p=roofPoint(a,b,r,height,base,side,-1+2*i/nu,t0+(1-t0)*j/nt);verts.push(...p);}
  for(let j=0;j<nt;j++)for(let i=0;i<nu;i++){const k=j*(nu+1)+i;idx.push(k,k+nu+1,k+1,k+1,k+nu+1,k+nu+2);}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));geo.setIndex(idx);geo.computeVertexNormals();const mat=M.tileDark.clone();mat.side=THREE.DoubleSide;mesh(geo,mat,null,null,g);
  const rows=Math.ceil((side<2?Math.hypot(b,height):Math.hypot(a-r,height*.7))*(1-t0)/.37);
  for(let j=0;j<rows;j++){const t=t0+(1-t0)*(j+.5)/rows,span=side<2?r+(a-r)*Math.max(0,(t-.38)/.62):b*t,columns=Math.ceil(2*span/.21);
   for(let i=0;i<columns;i++){const u=-1+2*(i+.5)/columns,p=roofPoint(a,b,r,height,base,side,u,t),du=roofPoint(a,b,r,height,base,side,u+.001,t).sub(p).normalize(),dt=roofPoint(a,b,r,height,base,side,u,t+.001).sub(p).normalize();let normal=dt.clone().cross(du).normalize();if(normal.y<0){du.negate();normal.negate();}const slope=du.clone().cross(normal).normalize();dummy.position.copy(p).addScaledVector(normal,.016);dummy.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(du,normal,slope));dummy.scale.set(2*span/columns/.21,1,1.07);dummy.updateMatrix();g.updateWorldMatrix(true,false);tileMatrices.push(new THREE.Matrix4().multiplyMatrices(g.matrixWorld,dummy.matrix));tileColors.push(new THREE.Color().setHSL(.455+rand()*.025,.12+rand()*.13,.25+rand()*.12));}
  }
  const edge=[];for(let i=0;i<=36;i++)edge.push(roofPoint(a,b,r,height,base,side,-1+i/18,1).add(V(0,-.06,0)));tube(edge,.105,M.wood,g);tube(edge.map(p=>p.clone().add(V(0,.11,0))),.025,M.gold,g);
 }
 if(hole===0){tube([V(-r,base+height+.12,0),V(0,base+height+.16,0),V(r,base+height+.12,0)],.14,M.tileDark,g);
  for(const sign of [-1,1]){const pts=[];for(let i=0;i<=12;i++){const t=i/12;pts.push(V(sign*(r+.55*t),base+height+.12+.75*t*t,0));}tube(pts,.105,M.gold,g);mesh(G.sphere,M.gold,V(sign*(r+.55),base+height+.92,0),V(.17,.23,.12),g);
   const shape=new THREE.Shape();shape.moveTo(0,base+height-.08);for(let i=1;i<=12;i++){const t=.38*i/12;shape.lineTo(b*t,base+height*Math.pow(1-t,1.68)-.05);}shape.lineTo(-b*.38,base+height*Math.pow(.62,1.68)-.05);for(let i=11;i>=0;i--){const t=.38*i/12;shape.lineTo(-b*t,base+height*Math.pow(1-t,1.68)-.05);}const sh=new THREE.ShapeGeometry(shape);const sm=mesh(sh,M.wood,V(sign*r,0,0),null,g,[0,sign*Math.PI/2,0]);sm.material=M.wood.clone();sm.material.side=THREE.DoubleSide;
   for(let k=1;k<6;k++){const z=-b*.31+k*b*.104,yy=base+height*Math.pow(1-Math.abs(z)/b,1.68);beam(V(sign*(r+.02),base+height*.46,z),V(sign*(r+.02),yy-.1,z),.045,.045,M.gold,g);}
  }
 }
 return g;}

// Stone terrace and two-storey timber structure.
const temple=group('column');box(0,.15,0,14,.6,10.2,M.stoneDark,temple);box(0,.53,0,13.6,.28,9.9,M.stone,temple);box(0,.74,0,13.2,.17,9.6,M.stone,temple);
for(let i=0;i<5;i++)box(0,.07+i*.14,5.5-i*.31,5.2,.16,.6,M.stone,temple);
const xs=[-5.6,-2.8,0,2.8,5.6],zs=[-3.8,3.8];for(const x of xs)for(const z of zs){column(x,z,.83,3.0,temple);dougong(x,4.16,z,.85);}for(const x of [-5.6,5.6])for(const z of [-1.25,1.25]){column(x,z,.83,3,temple);dougong(x,4.16,z,.85);}
for(const z of zs){box(0,4.02,z,11.7,.28,.26,M.red,temple);box(0,4.3,z,11.9,.16,.35,M.wood,temple);}for(const x of [-5.6,5.6])box(x,4.07,0,.25,.28,7.9,M.red,temple);
box(0,2.45,-3.44,10.9,3.1,.18,M.wall,temple);box(0,.96,0,11.1,.16,7.1,M.wood,temple);box(-1.55,3.8,0,7.8,.15,7.1,M.wood,temple);box(3.9,3.8,2.7,3.1,.15,1.7,M.wood,temple);
for(const x of [-5.42,5.42])box(x,2.46,0,.17,3.0,6.9,M.wall,temple);
for(const x of [-4.2,-1.4,1.4,4.2]){if(x!==-1.4)latticeWindow(x,2.45,3.46,2.12,2.64,0,temple);latticeWindow(x,2.5,-3.55,2.08,2.4,Math.PI,temple);}
for(const s of [-1,1]){const hinge=group('window',temple);hinge.position.set(-1.4+s*1.1,2.45,3.46);hinge.rotation.y=s*Math.PI*.43;latticeWindow(-s*.53,0,0,1.06,2.64,0,hinge);}
for(const side of [-1,1])for(const z of [-2.05,.45,2.5])latticeWindow(side*5.53,2.5,z,1.7,2.3,side*Math.PI/2,temple);
box(0,4.32,3.95,2,.54,.13,M.wood,temple);
// Procedural calligraphy plaque; the architectural details remain real geometry.
const plaqueCanvas=document.createElement('canvas');plaqueCanvas.width=512;plaqueCanvas.height=128;const pg=plaqueCanvas.getContext('2d');pg.fillStyle='#27372e';pg.fillRect(0,0,512,128);pg.strokeStyle='#c9b078';pg.lineWidth=6;pg.strokeRect(8,8,496,112);pg.fillStyle='#e5c886';pg.font='64px SimSun,serif';pg.textAlign='center';pg.textBaseline='middle';pg.fillText('听 雨 阁',256,68);const plaqueTex=new THREE.CanvasTexture(plaqueCanvas);plaqueTex.colorSpace=THREE.SRGBColorSpace;mesh(new THREE.PlaneGeometry(1.85,.46),new THREE.MeshStandardMaterial({map:plaqueTex,roughness:.8}),V(0,4.32,4.03),null,temple);
roof(7.5,5.3,2.7,4.82,root,.50);
box(-1.2,5.51,0,7.4,.25,6.7,M.wood,temple);box(3.7,5.51,2.3,2.4,.25,2.1,M.wood,temple);box(3.7,5.51,-2.84,2.4,.25,1.02,M.wood,temple);box(3.2,5.55,-2.03,1.4,.25,.65,M.wood,temple);const upper=group('column');for(const x of [-4.15,-1.4,1.4,4.15])for(const z of [-2.72,2.72]){column(x,z,5.55,2.35,upper);dougong(x,8.25,z,.72);}for(const z of [-2.72,2.72])box(0,8.17,z,8.6,.24,.25,M.red,upper);for(const x of [-4.15,4.15])box(x,8.17,0,.25,.24,5.7,M.red,upper);
box(0,6.88,-2.4,7.9,2.5,.14,M.wall,upper);for(const x of [-2.8,0,2.8]){if(x!==0)latticeWindow(x,6.95,2.42,2.32,2.1,0,upper);latticeWindow(x,6.95,-2.5,2.32,2.1,Math.PI,upper);}for(const s of [-1,1]){box(s*3.93,6.9,0,.12,2.5,4.7,M.wall,upper);for(const z of [-1.25,1.25])latticeWindow(s*4.01,6.95,z,1.95,2.1,s*Math.PI/2,upper);}
for(const z of [-3.05,3.05])railing(V(-4.62,0,z),V(4.62,0,z),5.65,upper);for(const x of [-4.62,4.62])railing(V(x,0,-3.05),V(x,0,3.05),5.65,upper);
roof(6.1,4.45,3.0,8.85);

// Enterable rooms, furniture and a real stair opening between the two floors.
const indoors=group('window');const interiorLights=[];
function table(x,y,z,w,d,h){box(x,y+h,z,w,.09,d,M.wood,indoors);for(const sx of [-1,1])for(const sz of [-1,1])box(x+sx*(w/2-.12),y+h/2,z+sz*(d/2-.1),.09,h,.09,M.wood,indoors);}
table(-1.1,1.04,-.7,2,1.2,.65);for(const x of [-3,.8]){table(x,1.04,-.7,.6,.65,.42);box(x,1.9,-1,.6,.8,.07,M.wood,indoors);}
const ceramic=material('青瓷',0x93b5a5,.3,{metalness:.05});cyl(-1.1,1.8,-.7,.12,.16,ceramic,indoors);for(const x of [-1.5,-.7])cyl(x,1.77,-.45,.07,.09,ceramic,indoors);
for(const y of [1.22,1.9,2.6])box(-3.8,y,-2.78,2,.09,.55,M.wood,indoors);for(const x of [-4.7,-2.9])box(x,1.96,-2.78,.1,1.65,.55,M.wood,indoors);for(let i=0;i<8;i++)box(-4.5+i*.19,2.13,-2.76,.12,.35,.29,i%2?M.red:M.paper,indoors);
table(-1,5.68,0,1.4,1,.44);for(const z of [-.95,.95])table(-1,5.68,z,.7,.45,.22);cyl(-1,6.23,0,.11,.16,ceramic,indoors);
for(let i=0;i<25;i++){const z=3-(i+.5)*.2,top=1.04+(i+1)*4.64/25;box(3.35,top-.055,z,.96,.11,.235,M.wood,indoors);box(3.35,top-.145,z+.10,.96,.18,.035,M.red,indoors);if(i%3===0)for(const x of [2.83,3.87]){box(x,top+.4,z,.055,.8,.055,M.red,indoors);}}
for(const x of [2.83,3.87]){beam(V(x,1.1,3),V(x,5.5,-2),.12,.13,M.wood,indoors);beam(V(x,1.91,3),V(x,6.45,-2),.065,.08,M.wood,indoors);}
for(const [x,y,z] of [[0,3.35,0],[-1,7.9,0]]){const l=new THREE.PointLight(0xffd8a6,7,9,2);l.position.set(x,y,z);scene.add(l);interiorLights.push(l);}

// Covered galleries around the sides of the courtyard.
function corridor(x,z,length,rotation=0){const p=group('corridor');p.position.set(x,0,z);p.rotation.y=rotation;box(0,.05,0,length,.4,2.65,M.stone,p);
 for(let i=0;i<=Math.round(length/2.4);i++){const xx=-length/2+i*length/Math.round(length/2.4);for(const zz of [-.95,.95])column(xx,zz,.25,2.3,p);}
 for(const zz of [-.95,.95]){box(0,2.91,zz,length+.3,.2,.2,M.red,p);railing(V(-length/2,0,zz),V(length/2,0,zz),.25,p);}
 roof(length/2+.6,1.65,.9,3.15,p);}
corridor(-10,-.5,13.5,Math.PI/2);corridor(10,-.5,13.5,Math.PI/2);corridor(0,-9.5,22,0);

// Courtyard paving, boundary walls and a moon gate.
const ground=mesh(new THREE.PlaneGeometry(400,400),M.grass,V(0,-.25,0),null,root,[-Math.PI/2,0,0]);ground.castShadow=false;
box(0,-.11,0,35,.22,33,M.grass);const paving=group();
for(let x=-6;x<=6;x++)for(let z=0;z<9;z++){const xx=x*.83,zz=5.9+z*.83;if(xx<-2.2&&zz<12.9)continue;box(xx,.02+rand()*.012,zz,.78,.12,.78,M.stone,paving);}
for(const side of [-1,1])for(let j=0;j<22;j++)box(side*8,.015,-8+j*.8,1.55,.13,.74,M.stone,paving);
for(let i=0;i<27;i++)box(-10.5+i*.8,-.015,-7.7,.75,.15,1.2,M.stone,paving);
const wall=group('corridor');for(const x of [-16.3,16.3]){box(x,1.16,-2,.4,2.7,25,M.wall,wall);box(x,2.56,-2,.61,.16,25.5,M.tileDark,wall);for(let z=-14;z<=10;z+=2.1)box(x,2.66,z,.66,.15,2,M.tile,wall);}
box(-10.3,1.18,-14.3,12,2.8,.4,M.wall,wall);box(10.3,1.18,-14.3,12,2.8,.4,M.wall,wall);box(0,1.18,-14.3,5.9,2.8,.4,M.wall,wall);
// Open front boundary, with three-dimensional curved entrance opening on one side.
box(11.8,.55,13.4,8.7,1.6,.45,M.wall,wall);box(11.8,1.39,13.4,8.9,.14,.58,M.tileDark,wall);
for(const x of [-16.3,16.3])for(const z of [-14.3,10.5]){box(x,1.3,z,.72,3,.72,M.wall,wall);box(x,2.86,z,.94,.17,.94,M.tileDark,wall);}

function roundedShape(w,h,r){const s=new THREE.Shape();s.moveTo(-w/2+r,-h/2);s.lineTo(w/2-r,-h/2);s.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r);s.lineTo(w/2,h/2-r);s.quadraticCurveTo(w/2,h/2,w/2-r,h/2);s.lineTo(-w/2+r,h/2);s.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);s.lineTo(-w/2,-h/2+r);s.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);return s;}
const pond=group('bridge');pond.position.set(-8,0,9);
const border=roundedShape(11.6,7.6,2.1),hole=new THREE.Path(roundedShape(10.75,6.75,1.8).getPoints(64).reverse());border.holes.push(hole);
mesh(new THREE.ExtrudeGeometry(border,{depth:.33,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.06,bevelThickness:.06}),M.waterEdge,V(0,-.02,0),null,pond,[-Math.PI/2,0,0]);
mesh(new THREE.ShapeGeometry(roundedShape(10.8,6.8,1.8),48),material('池底',0x25463e,1),V(0,-.12,0),null,pond,[-Math.PI/2,0,0]);
const water=new Reflector(new THREE.ShapeGeometry(roundedShape(10.75,6.75,1.8),48),{clipBias:.003,textureWidth:768,textureHeight:768,color:0x668e7c});water.rotation.x=-Math.PI/2;water.position.y=.11;water.userData.part='bridge';pond.add(water);
water.material.uniforms.uTime={value:0};water.material.fragmentShader='uniform float uTime;\n'+water.material.fragmentShader;
water.material.fragmentShader=water.material.fragmentShader.replace('vec4 base = texture2DProj( tDiffuse, vUv );','vec4 uv = vUv; uv.xy += vec2(sin(vUv.x*37.0 + uTime*.8), cos(vUv.y*41.0 + uTime*.6)) * .0012 * vUv.w; vec4 base = texture2DProj(tDiffuse, uv);');
const waterFilm=mesh(new THREE.ShapeGeometry(roundedShape(10.75,6.75,1.8),48),new THREE.MeshStandardMaterial({color:0x34685d,roughness:.3,metalness:.25,transparent:true,opacity:.18,depthWrite:false}),V(0,.115,0),null,pond,[-Math.PI/2,0,0]);waterFilm.castShadow=false;
// A curved solid bridge, with posts and handrails following the same arch.
const bridge=group('bridge',pond);bridge.position.x=.45;
const archY=z=>.35+.9*(1-Math.pow(z/4.1,2));const verts=[],ind=[];
for(let j=0;j<=32;j++){const z=-4.1+j*8.2/32,y=archY(z);verts.push(-1.05,y,z,1.05,y,z,-1.05,y-.25,z,1.05,y-.25,z);if(j<32){const k=j*4;ind.push(k,k+4,k+1,k+1,k+4,k+5,k+2,k+3,k+6,k+3,k+7,k+6,k,k+2,k+4,k+2,k+6,k+4,k+1,k+5,k+3,k+3,k+5,k+7);}}
const bg=new THREE.BufferGeometry();bg.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));bg.setIndex(ind);bg.computeVertexNormals();mesh(bg,M.stone,null,null,bridge);
for(const side of [-1,1]){const pts=[];for(let i=0;i<=24;i++){const z=-4.1+i*8.2/24;pts.push(V(side*1.09,archY(z)+.8,z));}tube(pts,.075,M.stone,bridge);for(let i=0;i<10;i++){const z=-4.0+i*8/9,y=archY(z);box(side*1.09,y+.36,z,.13,.77,.13,M.stone,bridge);mesh(G.sphere,M.stone,V(side*1.09,y+.84,z),V(.12,.12,.12),bridge);}}
for(let j=0;j<22;j++){const z=-3.95+j*7.9/21;box(0,archY(z)+.008,z,2.08,.018,.022,M.stoneDark,bridge);}
const padMat=material('荷叶',0x688644,.76,{side:THREE.DoubleSide}),petalMat=material('荷花',0xdcb2a6,.62,{side:THREE.DoubleSide});
for(let i=0;i<18;i++){const x=(rand()-.5)*8.9,z=(rand()-.5)*5.5;if(Math.abs(x-.45)<1.6)continue;const r=.22+rand()*.2;const pad=mesh(new THREE.CircleGeometry(r,18,0,Math.PI*1.88),padMat,V(x,.14,z),null,pond,[-Math.PI/2,0,rand()*6]);pad.castShadow=false;
 if(i%3===0){cyl(x,.23,z,.018,.18,M.bamboo,pond);for(let j=0;j<7;j++)mesh(G.sphere,petalMat,V(x+Math.cos(j*TAU/7)*.10,.32,z+Math.sin(j*TAU/7)*.1),V(.055,.12,.07),pond,[.25*Math.cos(j),0,.25*Math.sin(j)]);}}

// Stone lanterns and warm lights beneath the eaves.
const lanternLights=[];
function stoneLantern(x,z){const p=group('bridge');p.position.set(x,0,z);box(0,.13,0,.8,.26,.8,M.stone,p);cyl(0,.62,0,.17,.78,M.stone,p);box(0,1.03,0,.68,.13,.68,M.stone,p);box(0,1.35,0,.48,.52,.48,M.black,p);box(0,1.35,0,.35,.39,.35,M.glow,p);
 for(const xx of [-.23,.23])for(const zz of [-.23,.23])box(xx,1.36,zz,.08,.61,.08,M.stone,p);const cap=mesh(new THREE.ConeGeometry(.58,.34,4),M.stone,V(0,1.8,0),null,p,[0,Math.PI/4,0]);cyl(0,2.02,0,.09,.15,M.stone,p);const light=new THREE.PointLight(0xffb763,0,5,2);light.position.set(0,1.45,0);p.add(light);lanternLights.push(light);}
for(const [x,z] of [[-2,8],[4.8,8],[-12,4.6],[12,4.6],[-4.8,-6.8],[4.8,-6.8]])stoneLantern(x,z);
const hang=group('window');for(const x of [-4.2,4.2]){cyl(x,3.55,4,.013,.4,M.gold,hang);mesh(G.sphere,M.glow,V(x,3.18,4),V(.23,.3,.23),hang);for(const yy of [2.9,3.44])cyl(x,yy,4,.18,.065,M.gold,hang);const l=new THREE.PointLight(0xffb15a,0,7,2);l.position.set(x,3.05,4);scene.add(l);lanternLights.push(l);}

// Procedural trees: bending trunks, branching limbs and clustered needle crowns.
function pine(x,z,height=8){const p=group();p.position.set(x,0,z);const bend=(rand()-.5)*1.5;const trunk=[V(0,-.1,0),V(.2,height*.3,.1),V(bend,height*.64,-.2),V(bend+.5,height,-.35)];tube(trunk,.24,M.wood,p);
 for(let i=0;i<11;i++){const angle=i*2.4,y=height*(.40+i*.045),spread=(1-i*.055)*(1.7+rand()*.6),end=V(bend*.6+Math.cos(angle)*spread,y+.45,Math.sin(angle)*spread);
  tube([V(bend*.4,y-.5,0),end.clone().multiply(V(.65,1,.65)),end],.065+(.05*(1-i/11)),M.wood,p);
  for(let j=0;j<9;j++){const xx=end.x+(rand()-.5)*1.35,zz=end.z+(rand()-.5)*1.2,yy=end.y+rand()*.45;mesh(G.pine,M.leaf,V(xx,yy,zz),V(.65+rand()*.35,.8+rand()*.4,.65+rand()*.35),p);}
 }
 mesh(G.pine,M.leaf,V(bend+.45,height+.1,-.35),V(1.2,1.2,1.2),p);
 for(let i=0;i<5;i++)beam(V(Math.cos(i*1.3)*.8,0,Math.sin(i*1.3)*.8),V(0,.7,0),.14,.14,M.wood,p);
}
pine(-12.8,-4.1,8.8);pine(13,-9.8,8);pine(-13,12.8,5.7);pine(15,7,6.7);
const leafShape=new THREE.Shape();leafShape.moveTo(0,0);leafShape.quadraticCurveTo(.14,.3,0,.75);leafShape.quadraticCurveTo(-.12,.3,0,0);const leafGeo=new THREE.ShapeGeometry(leafShape,4);const bambooLeaf=material('竹叶',0x63804b,.9,{side:THREE.DoubleSide});const bambooMatrices=[];
function bambooGrove(cx,cz,count){for(let i=0;i<count;i++){const x=cx+(rand()-.5)*3,z=cz+(rand()-.5)*3,h=3.5+rand()*3.8,lean=(rand()-.5)*.5;const p=group();p.position.set(x,0,z);p.rotation.z=lean*.16;cyl(0,h/2,0,.06,h,M.bamboo,p);
 for(let j=1;j<h/.5;j++){cyl(0,j*.5,0,.078,.045,M.leaf,p);if(j%2===0&&j>3){for(let side of [-1,1]){const angle=rand()*TAU,tip=V(Math.cos(angle)*.8,j*.5+.25,Math.sin(angle)*.8);beam(V(0,j*.5,0),tip,.022,.022,M.bamboo,p);for(let k=0;k<5;k++){dummy.position.copy(tip.clone().multiplyScalar(.45+k*.1));dummy.position.y=j*.5+.15+k*.05;dummy.rotation.set(.6+rand(),rand()*TAU,side*(.6+rand()));dummy.scale.setScalar(.65+rand()*.5);dummy.updateMatrix();p.updateWorldMatrix(true,false);bambooMatrices.push(new THREE.Matrix4().multiplyMatrices(p.matrixWorld,dummy.matrix));}}}}
}}
bambooGrove(13.1,-3.5,22);bambooGrove(-13.2,-10.8,13);bambooGrove(12.7,10.1,11);
const bambooMesh=new THREE.InstancedMesh(leafGeo,bambooLeaf,bambooMatrices.length);bambooMatrices.forEach((m,i)=>bambooMesh.setMatrixAt(i,m));bambooMesh.instanceMatrix.needsUpdate=true;bambooMesh.castShadow=true;root.add(bambooMesh);
// Small irregular stones and grass tufts anchor the landscaping to the ground.
for(let i=0;i<95;i++){const x=(rand()-.5)*34,z=(rand()-.5)*31;if(Math.abs(x)<7&&z<13&&z>-6)continue;if(x<-2.3&&x>-14&&z>5&&z<13)continue;mesh(G.foliage,M.stoneDark,V(x,-.08,z),V(.14+rand()*.5,.13+rand()*.4,.18+rand()*.4),root);}
const grassGeo=new THREE.ConeGeometry(.12,.4,3);const grassMat=material('地被',0x6e8651,1);const grassInst=new THREE.InstancedMesh(grassGeo,grassMat,1600);let grassCount=0;
for(let i=0;i<2400&&grassCount<1600;i++){const x=(rand()-.5)*38,z=(rand()-.5)*36;if(Math.abs(x)<7.2&&z>-5.8&&z<14)continue;if(x<-2&&x>-14&&z>4.8&&z<13.3)continue;if(Math.abs(Math.abs(x)-10)<1.8&&z<7&&z>-8)continue;dummy.position.set(x,-.01,z);dummy.rotation.set(rand()*.2,rand()*TAU,rand()*.3);dummy.scale.set(.5+rand(),.5+rand(),.5+rand());dummy.updateMatrix();grassInst.setMatrixAt(grassCount++,dummy.matrix);}grassInst.count=grassCount;grassInst.receiveShadow=true;root.add(grassInst);

// Multiple continuous mountain ranges, with atmospheric perspective.
for(let layer=0;layer<3;layer++){const geo=new THREE.PlaneGeometry(150,24,100,18);geo.rotateX(-Math.PI/2);const a=geo.attributes.position;for(let i=0;i<a.count;i++){const x=a.getX(i),z=a.getZ(i),peaks=8*Math.exp(-((x+32)**2)/240)+11*Math.exp(-((x-8)**2)/350)+9*Math.exp(-((x-48)**2)/210);const noise=Math.sin(x*.24+layer)*1.5+Math.sin(x*.65+z*.35)*.65;const fade=Math.max(0,1-Math.abs(z)/13);a.setY(i,Math.max(0,(peaks+noise+layer*2)*Math.pow(fade,.72))-1);}
 geo.computeVertexNormals();const mat=material('远山',new THREE.Color().setHSL(.46,.12,.32+layer*.09),1);const mountain=mesh(geo,mat,V(layer*9-10,-1,-35-layer*18),null,root);mountain.castShadow=false;}
const skyUniforms={top:{value:new THREE.Color(0x6f9594)},bottom:{value:new THREE.Color(0xe4c3a0)}};
const sky=new THREE.Mesh(new THREE.SphereGeometry(180,32,16),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:skyUniforms,vertexShader:'varying vec3 vPosition; void main(){vPosition=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec3 vPosition;uniform vec3 top;uniform vec3 bottom;void main(){float h=pow(max(normalize(vPosition).y,0.),.6);gl_FragColor=vec4(mix(bottom,top,h),1.);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}'}));scene.add(sky);
const sunDisc=mesh(new THREE.SphereGeometry(3.3,24,16),new THREE.MeshBasicMaterial({color:0xffe1aa,fog:false}),V(-70,43,-110),null,scene);sunDisc.castShadow=false;

// Consolidate static repeated primitives by geometry/material/component label.
root.updateMatrixWorld(true);const buckets=new Map(),remove=[];
function partOf(o){for(let p=o;p;p=p.parent)if(p.userData.part)return p.userData.part;return null;}
root.traverse(o=>{if(o.isMesh&&!o.isInstancedMesh&&o.userData.batch){const part=partOf(o),key=o.geometry.uuid+'|'+o.material.uuid+'|'+part;let b=buckets.get(key);if(!b){b={geo:o.geometry,mat:o.material,part,matrices:[],cast:o.castShadow};buckets.set(key,b);}b.matrices.push(o.matrixWorld.clone());remove.push(o);}});
for(const o of remove)o.removeFromParent();for(const b of buckets.values()){const batch=new THREE.InstancedMesh(b.geo,b.mat,b.matrices.length);b.matrices.forEach((m,i)=>batch.setMatrixAt(i,m));batch.castShadow=b.cast;batch.receiveShadow=true;batch.userData.part=b.part;scene.add(batch);}
const roofTileMaterial=M.tile.clone();roofTileMaterial.color.set(0xc4d7c9);const tiles=new THREE.InstancedMesh(tileGeo,roofTileMaterial,tileMatrices.length);tileMatrices.forEach((m,i)=>{tiles.setMatrixAt(i,m);tiles.setColorAt(i,tileColors[i]);});tiles.userData.part='roof';tiles.castShadow=true;tiles.receiveShadow=true;scene.add(tiles);
const pickables=[];scene.traverse(o=>{if(o.isMesh&&partOf(o))pickables.push(o);});

let mode='dusk',selected=null,selectedPoint=null,transition=null,explorer;const configurations={
 day:{top:0x6a9dab,bottom:0xb6c6ba,fog:0xa3b8ae,sun:0xfff1dc,light:3.7,hemi:1.0,fill:.4,pos:V(-20,40,22),exposure:1.0,lamps:0,glow:.02,label:'晴光 · 白昼'},
 dusk:{top:0x698d91,bottom:0xc9bba3,fog:0xa9b6a7,sun:0xffc78b,light:4.5,hemi:.65,fill:.24,pos:V(-30,22,16),exposure:.92,lamps:2,glow:.10,label:'夕照 · 黄昏'},
 night:{top:0x081724,bottom:0x304f5e,fog:0x263e48,sun:0xa2c2e1,light:1.4,hemi:.35,fill:.2,pos:V(-18,38,-15),exposure:1.1,lamps:17,glow:1.1,label:'灯火 · 夜景'}
};
function setMode(next){mode=next;const c=configurations[next];skyUniforms.top.value.set(c.top);skyUniforms.bottom.value.set(c.bottom);scene.fog.color.set(c.fog);sun.color.set(c.sun);sun.intensity=c.light;sun.position.copy(c.pos);hemi.intensity=c.hemi;fill.intensity=c.fill;renderer.toneMappingExposure=c.exposure;M.paper.emissiveIntensity=c.glow;M.glow.color.set(next==='night'?0xffbe65:0xe8c38e);lanternLights.forEach(l=>l.intensity=c.lamps);interiorLights.forEach(l=>l.intensity=next==='night'?12:next==='dusk'?8:5);sunDisc.visible=next!=='night';$('#mode-label').textContent=c.label;document.querySelectorAll('[data-mode]').forEach(b=>{b.classList.toggle('active',b.dataset.mode===next);b.setAttribute('aria-pressed',String(b.dataset.mode===next));});sun.shadow.needsUpdate=true;}
function changeView(pos,target){transition={from:camera.position.clone(),to:pos.clone(),start:performance.now(),fromTarget:controls.target.clone(),target:target.clone()};if(reduced){camera.position.copy(pos);controls.target.copy(target);transition=null;}}
function view(name){if(explorer?.enabled)explorer.setEnabled(false);let p=initial.pos,t=initial.target;if(name==='front'){p=V(0,12,32);t=V(0,4.7,0);}else if(name==='bird'){p=V(21,40,26);t=V(0,0,0);}changeView(responsivePosition(p,t),t);}
function inspect(key,point){const item=info[key];if(!item)return;selected=key;selectedPoint=point?point.clone():item[4].clone();$('#info').hidden=false;$('#info-number').textContent=item[0];$('#info-title').textContent=item[1];$('#info-body').textContent=item[2];$('#info-tag').textContent=item[3];$('#pin').style.display='block';}
function closeInfo(){selected=null;selectedPoint=null;$('#info').hidden=true;$('#pin').style.display='none';}
document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.mode)));
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>view(b.dataset.view)));
document.querySelectorAll('[data-part]').forEach(b=>b.addEventListener('click',()=>inspect(b.dataset.part)));
$('#reset').addEventListener('click',()=>{if(explorer?.enabled)explorer.reset();else view('reset');closeInfo();});$('#close-info').addEventListener('click',closeInfo);
const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();let down=null;
renderer.domElement.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY,time:performance.now()};transition=null;});
renderer.domElement.addEventListener('pointerup',e=>{if(!down||e.button!==0||Math.hypot(e.clientX-down.x,e.clientY-down.y)>6||performance.now()-down.time>600)return;pointer.set(e.clientX/innerWidth*2-1,-e.clientY/innerHeight*2+1);raycaster.setFromCamera(pointer,camera);const hit=raycaster.intersectObjects(pickables,false)[0];if(hit)inspect(partOf(hit.object),hit.point);else closeInfo();down=null;});
controls.addEventListener('start',()=>transition=null);
addEventListener('resize',()=>{const oldFactor=Math.max(1,.85/camera.aspect);camera.aspect=innerWidth/innerHeight;const factor=Math.max(1,.85/camera.aspect)/oldFactor;if(!explorer?.enabled)camera.position.sub(controls.target).multiplyScalar(factor).add(controls.target);transition=null;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
explorer=createExplorer({scene,camera,controls,canvas:renderer.domElement});explorer.setEnabled(true);
$('#walk-toggle').addEventListener('click',()=>{transition=null;closeInfo();if(explorer.enabled){explorer.setEnabled(false);view('reset');}else explorer.setEnabled(true);});
setMode('dusk');const clock=new THREE.Clock();let frames=0,lastTick=performance.now(),fps=0;
function animate(){requestAnimationFrame(animate);const dt=clock.getDelta(),t=clock.elapsedTime;if(transition){const p=Math.min(1,(performance.now()-transition.start)/1100),s=p*p*(3-2*p);camera.position.lerpVectors(transition.from,transition.to,s);controls.target.lerpVectors(transition.fromTarget,transition.target,s);if(p===1)transition=null;}if(!explorer.enabled)controls.update();explorer.update(dt);water.material.uniforms.uTime.value=reduced?0:t;if(explorer.moving&&frames%4===0)sun.shadow.needsUpdate=true;
 if(selectedPoint){const p=selectedPoint.clone().project(camera);$('#pin').style.left=(p.x*.5+.5)*innerWidth+'px';$('#pin').style.top=(-p.y*.5+.5)*innerHeight+'px';$('#pin').style.visibility=p.z>1?'hidden':'visible';}
 renderer.render(scene,camera);frames++;if(performance.now()-lastTick>1000){fps=Math.round(frames*1000/(performance.now()-lastTick));frames=0;lastTick=performance.now();}}
animate();renderer.shadowMap.autoUpdate=false;sun.shadow.needsUpdate=true;
window.__courtyard={ready:true,getState:()=>({mode,selected,camera:camera.position.toArray(),target:controls.target.toArray(),explorer:explorer.getState(),tiles:tileMatrices.length,bambooLeaves:bambooMatrices.length,instancedBatches:buckets.size,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,fps}),screenPoint:key=>{const p=info[key][4].clone().project(camera);return{x:(p.x*.5+.5)*innerWidth,y:(-p.y*.5+.5)*innerHeight};}};
$('#loading').classList.add('hide');setTimeout(()=>$('#loading').remove(),900);
