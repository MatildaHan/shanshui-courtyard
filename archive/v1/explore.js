import * as THREE from 'three';

/** A small kinematic character controller. No network or physics dependency. */
export function createExplorer({scene,camera,controls,canvas}){
  const vec=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
  const skin=new THREE.MeshStandardMaterial({color:0xf1c6a4,roughness:.8});
  const hair=new THREE.MeshStandardMaterial({color:0x241f23,roughness:.76});
  const ivory=new THREE.MeshStandardMaterial({color:0xe8dfc5,roughness:.9});
  const pink=new THREE.MeshStandardMaterial({color:0xbd6e75,roughness:.85});
  const teal=new THREE.MeshStandardMaterial({color:0x497d78,roughness:.8});
  const shoe=new THREE.MeshStandardMaterial({color:0x483b40,roughness:.9});
  const dark=new THREE.MeshStandardMaterial({color:0x332729,roughness:.6});
  const gold=new THREE.MeshStandardMaterial({color:0xc6a763,roughness:.45,metalness:.3});
  const girl=new THREE.Group();girl.name='小女孩 · 阿棠';scene.add(girl);
  const sphere=new THREE.SphereGeometry(1,16,12),unit=new THREE.CylinderGeometry(1,1,1,16);
  function m(geo,mat,pos,scale,parent=girl){const o=new THREE.Mesh(geo,mat);o.position.copy(pos);if(scale)o.scale.copy(scale);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
  const skirt=m(new THREE.CylinderGeometry(.16,.32,.44,28),pink,vec(0,.64,0));
  m(new THREE.CylinderGeometry(.17,.19,.28,20),ivory,vec(0,.94,0));
  m(unit,teal,vec(0,.79,0),vec(.19,.065,.19));
  for(const s of [-1,1]){const sash=m(new THREE.BoxGeometry(.045,.38,.015),teal,vec(s*.075,.97,.166));sash.rotation.z=s*.35;}
  // Hem pleats and embroidered lower band are geometry, not a character sprite.
  for(let i=0;i<24;i++){const a=i*Math.PI/12,top=vec(Math.sin(a)*.174,.83,Math.cos(a)*.174),bottom=vec(Math.sin(a)*.305,.445,Math.cos(a)*.305),direction=bottom.clone().sub(top);const pleat=m(new THREE.BoxGeometry(.012,direction.length(),.014),i%3===0?ivory:pink,top.clone().add(bottom).multiplyScalar(.5));pleat.quaternion.setFromUnitVectors(vec(0,1,0),direction.normalize());}
  m(new THREE.CylinderGeometry(.302,.316,.035,28),ivory,vec(0,.435,0));
  m(sphere,skin,vec(0,1.24,.015),vec(.225,.25,.215));
  m(new THREE.SphereGeometry(.237,24,16,0,Math.PI*2,0,Math.PI*.53),hair,vec(0,1.27,0));
  m(sphere,hair,vec(0,1.23,-.125),vec(.225,.25,.12));
  for(let i=-2;i<=2;i++){const bang=m(sphere,hair,vec(i*.073,1.365,.16),vec(.056,.095,.06));bang.rotation.z=i*.16;}
  for(const s of [-1,1]){m(sphere,hair,vec(s*.245,1.4,-.045),vec(.12,.12,.12));m(sphere,teal,vec(s*.248,1.41,.04),vec(.12,.045,.025));
    for(let i=0;i<3;i++)m(sphere,hair,vec(s*(.205+i*.012),1.23-i*.075,-.08),vec(.055,.068,.055));
    m(sphere,skin,vec(s*.218,1.24,.018),vec(.042,.062,.042));m(sphere,dark,vec(s*.077,1.255,.211),vec(.021,.028,.011));m(sphere,ivory,vec(s*.073,1.265,.22),vec(.006,.008,.005));
    m(sphere,pink,vec(s*.122,1.21,.192),vec(.036,.014,.008));}
  const smile=new THREE.CatmullRomCurve3([vec(-.035,1.195,.219),vec(0,1.181,.226),vec(.035,1.195,.219)]);m(new THREE.TubeGeometry(smile,12,.007,5,false),dark,vec());
  const arms=[],legs=[];
  for(const s of [-1,1]){const arm=new THREE.Group();arm.position.set(s*.215,1.02,0);girl.add(arm);arm.rotation.z=s*.12;arms.push(arm);
    m(new THREE.CylinderGeometry(.075,.095,.27,12),ivory,vec(0,-.135,0),null,arm);m(unit,teal,vec(0,-.27,0),vec(.098,.045,.098),arm);m(sphere,skin,vec(0,-.32,0),vec(.062,.068,.055),arm);
    const leg=new THREE.Group();leg.position.set(s*.105,.44,0);girl.add(leg);legs.push(leg);m(unit,ivory,vec(0,-.16,0),vec(.064,.31,.064),leg);m(sphere,shoe,vec(0,-.385,.037),vec(.087,.05,.14),leg);m(sphere,pink,vec(0,-.365,.1),vec(.032,.012,.026),leg);}
  m(sphere,gold,vec(0,.795,.197),vec(.03,.035,.012));
  const sc=document.createElement('canvas');sc.width=sc.height=64;const ctx=sc.getContext('2d'),gradient=ctx.createRadialGradient(32,32,3,32,32,31);gradient.addColorStop(0,'rgba(0,0,0,.36)');gradient.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);
  const shadow=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(sc),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2}));shadow.rotation.x=-Math.PI/2;scene.add(shadow);

  const spawn=vec(-1.4,.08,11.8),position=spawn.clone();girl.position.copy(position);
  const keys=new Set();let enabled=false,yaw=0,pitch=.12,distance=6.2,phase=0,moving=false,level=0,onStairs=false,drag=null,area='庭院',previousArea='';
  const radius=.23;
  const walls=[
    [-5.54,-5.31,-3.55,3.55,.8,4.1],[5.31,5.54,-3.55,3.55,.8,4.1],[-5.54,5.54,-3.55,-3.32,.8,4.1],
    [-5.54,-2.51,3.32,3.59,.8,4.1],[-.29,5.54,3.32,3.59,.8,4.1],
    [-4.05,-3.82,-2.52,2.52,5.5,8.4],[3.82,4.05,-2.52,2.52,5.5,8.4],[-4.05,4.05,-2.52,-2.3,5.5,8.4],
    [-4.05,-1.2,2.3,2.55,5.5,8.4],[1.2,4.05,2.3,2.55,5.5,8.4],
    [-2.1,-.1,-1.3,-.1,.9,1.9],[-3.3,-2.7,-1.1,-.3,.9,1.9],[.5,1.1,-1.1,-.3,.9,1.9],
    [-4.8,-2.8,-3.05,-2.48,.9,3.1],[-1.7,-.3,-.5,.5,5.5,6.6]
  ];
  const columns=[];for(const x of [-5.6,-2.8,0,2.8,5.6])for(const z of [-3.8,3.8])columns.push([x,z,.83,4.3]);for(const x of [-5.6,5.6])for(const z of [-1.25,1.25])columns.push([x,z,.83,4.3]);for(const x of [-4.15,-1.4,1.4,4.15])for(const z of [-2.72,2.72])columns.push([x,z,5.55,8.3]);
  for(const side of [-1,1])for(let i=0;i<=6;i++)for(const xx of [-.95,.95])columns.push([side*10+xx,-7.25+i*2.25,.25,3]);
  function onBridge(x,z){return x>-8.58&&x<-6.52&&z>4.8&&z<13.2;}
  function groundHeight(x,z){if(level===1&&!onStairs)return 5.68;if(onStairs)return 1.04+THREE.MathUtils.clamp((3-z)/5,0,1)*4.64;if(onBridge(x,z))return .35+.9*(1-Math.pow((z-9)/4.1,2));
    if(x>-2.6&&x<2.6&&z>4.55&&z<6.0)return .08+(6-z)/1.45*.77;
    if(Math.abs(x)<6.6&&Math.abs(z)<4.8)return Math.abs(x)<5.55&&Math.abs(z)<3.55?1.04:.83;
    if(Math.abs(Math.abs(x)-10)<1.32&&z>-7.25&&z<6.25)return .25;
    if(Math.abs(x)<11&&z>-10.82&&z<-8.18)return .25;return .08;}
  function isBlocked(x,z,old){if(level===1&&!onStairs&&(Math.abs(x)>4.40||z<-2.23||z>2.91))return true;if(level===0&&(x<-15.7||x>15.7||z<-13.8||z>15.8))return true;
    if(level===0&&x>7.2&&z>13.05&&z<13.85)return true;
    if(level===0&&x>-13.45&&x<-2.65&&z>5.55&&z<12.45&&!onBridge(x,z))return true;
    const y=groundHeight(x,z);if(!onStairs&&y-old.y>.3)return true;
    for(const [x0,x1,z0,z1,y0,y1] of walls)if(y+1.25>y0&&y+.1<y1&&x>x0-radius&&x<x1+radius&&z>z0-radius&&z<z1+radius)return true;
    for(const [cx,cz,y0,y1] of columns)if(y+1.25>y0&&y+.1<y1&&Math.hypot(x-cx,z-cz)<.19+radius)return true;
    if(!onStairs&&x>2.72&&x<4.25&&z>-1.7&&z<2.65)return true;
    return false;}
  function updateStairs(){const stairX=position.x>2.92&&position.x<3.79;if(!onStairs&&stairX&&((level===0&&position.z>=2.65&&position.z<=3.10)||(level===1&&position.z> -1.98&&position.z<=-1.75)))onStairs=true;
    if(onStairs){position.x=THREE.MathUtils.clamp(position.x,3.0,3.72);if(position.z>3.05){onStairs=false;level=0;}else if(position.z<-1.98){onStairs=false;level=1;position.z=-2.02;}}
  }
  function currentArea(){if(onStairs)return '木梯 · 通往'+(level===0?'二楼':'一楼');if(level===1)return position.z>2.25?'二层 · 檐下露台':'二层 · 观景茶室';if(Math.abs(position.x)<5.3&&position.z>-3.3&&position.z<3.3)return '一层 · 会客厅';if(onBridge(position.x,position.z))return '清池 · 石拱桥';return '庭院';}
  function update(dt){dt=Math.min(dt,.04);let dx=0,dz=0;if(enabled){const forward=Number(keys.has('w')||keys.has('arrowup'))-Number(keys.has('s')||keys.has('arrowdown')),right=Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft'));dx=-Math.sin(yaw)*forward+Math.cos(yaw)*right;dz=-Math.cos(yaw)*forward-Math.sin(yaw)*right;const len=Math.hypot(dx,dz);moving=len>0;
      if(moving){dx/=len;dz/=len;const speed=keys.has('shift')?4.0:2.45;const old=position.clone();updateStairs();const nx=position.x+dx*speed*dt,nz=position.z+dz*speed*dt;if(!isBlocked(nx,position.z,old))position.x=nx;if(!isBlocked(position.x,nz,old))position.z=nz;updateStairs();position.y=groundHeight(position.x,position.z);const angle=Math.atan2(dx,dz);girl.rotation.y+=Math.atan2(Math.sin(angle-girl.rotation.y),Math.cos(angle-girl.rotation.y))*Math.min(1,dt*12);phase+=dt*speed*4.3;}
      girl.position.copy(position);girl.position.y+=moving?Math.abs(Math.sin(phase))*.025:Math.sin(performance.now()*.002)*.006;
      arms.forEach((arm,i)=>arm.rotation.x=moving?Math.sin(phase+i*Math.PI)*.48:0);legs.forEach((leg,i)=>leg.rotation.x=moving?Math.sin(phase+i*Math.PI)*.55:0);skirt.rotation.z=moving?Math.sin(phase)*.022:0;
      const inside=(level===0&&Math.abs(position.x)<5.25&&position.z>-3.2&&position.z<3.15)||(level===1&&Math.abs(position.x)<3.8&&position.z<2.25);const corridor=Math.abs(Math.abs(position.x)-10)<1.3&&position.z<6.3&&position.z>-7.3;
      const target=position.clone().add(vec(0,inside?1.05:1.65,0));const d=inside?Math.min(distance,2.35):distance;const desired=target.clone().add(vec(Math.sin(yaw)*d*Math.cos(pitch),Math.sin(pitch)*d,Math.cos(yaw)*d*Math.cos(pitch)));
      if(inside){const clampRoom=p=>{p.y=Math.min(p.y,level===1?8.15:3.55);p.x=THREE.MathUtils.clamp(p.x,level===1?-3.6:-5.0,level===1?3.6:5.0);p.z=THREE.MathUtils.clamp(p.z,level===1?-2.1:-3.12,level===1?2.12:3.15);return p;};clampRoom(desired);
        if(desired.distanceTo(target)<1.95&&!onStairs){let best=desired.clone(),score=desired.distanceTo(target);for(const offset of [Math.PI/3,-Math.PI/3,Math.PI/2,-Math.PI/2,Math.PI]){const candidate=clampRoom(target.clone().add(vec(Math.sin(yaw+offset)*d*Math.cos(pitch),Math.sin(pitch)*d,Math.cos(yaw+offset)*d*Math.cos(pitch))));const candidateScore=candidate.distanceTo(target)-Math.abs(offset)*.025;if(candidateScore>score){score=candidateScore;best=candidate;}}desired.copy(best);}}
      if(corridor)desired.y=Math.min(desired.y,2.76);
      if(onStairs){desired.set(position.x,position.y+1.65,position.z+1.35);if(desired.z>1.82)desired.y=Math.min(desired.y,3.5);else if(desired.z>1.2)desired.y=Math.min(desired.y,5.2);desired.y=Math.min(desired.y,8.1);}
      // Camera obstruction is independent from body movement. Pull it in before a wall.
      const direction=desired.clone().sub(target),length=direction.length(),ray=new THREE.Ray(target,direction.normalize());let nearest=length;
      for(const [x0,x1,z0,z1,y0,y1] of walls){const hit=ray.intersectBox(new THREE.Box3(vec(x0,y0,z0),vec(x1,y1,z1)),vec());if(hit){const distance=hit.distanceTo(target);if(distance>.15&&distance<nearest)nearest=Math.max(.45,distance-.15);}}
      desired.copy(target).addScaledVector(direction,nearest);camera.position.lerp(desired,1-Math.exp(-dt*10));controls.target.copy(target);camera.lookAt(target);
      const opacity=camera.position.distanceTo(position.clone().add(vec(0,1.05,0)))<1.6?.30:1;for(const mat of [skin,hair,ivory,pink,teal,shoe,dark,gold]){mat.transparent=true;mat.opacity=THREE.MathUtils.lerp(mat.opacity,opacity,Math.min(1,dt*10));}
    }else{moving=false;girl.position.y=position.y;for(const mat of [skin,hair,ivory,pink,teal,shoe,dark,gold])mat.opacity=1;}
    shadow.position.copy(position).add(vec(0,.015,0));area=currentArea();if(area!==previousArea){document.querySelector('#walk-location').textContent=area;previousArea=area;}
  }
  function setEnabled(value){enabled=value;controls.enabled=!enabled;keys.clear();camera.fov=enabled?70:42;camera.updateProjectionMatrix();document.body.classList.toggle('walking',enabled);document.querySelector('#walk-toggle').classList.toggle('active',enabled);document.querySelector('#walk-toggle').setAttribute('aria-pressed',String(enabled));document.querySelector('#walk-toggle').textContent=enabled?'◉ 少女漫游':'♡ 少女漫游';document.querySelector('#walk-hud').hidden=!enabled;
    document.querySelector('.hint').textContent=enabled?'WASD / 方向键移动 · Shift 慢跑 · 拖动视角 · 滚轮调节跟随距离':'左键旋转 · 滚轮缩放 · 右键平移 · 点击建筑认识构件';
    if(enabled){camera.position.copy(position).add(vec(Math.sin(yaw)*distance,2.4,Math.cos(yaw)*distance));controls.target.copy(position).add(vec(0,1.65,0));camera.lookAt(controls.target);}else{arms.forEach(a=>a.rotation.x=0);legs.forEach(l=>l.rotation.x=0);}}
  function reset(){position.copy(spawn);level=0;onStairs=false;yaw=0;pitch=.12;distance=6.2;girl.rotation.y=Math.PI;girl.position.copy(position);if(enabled)setEnabled(true);}
  addEventListener('keydown',e=>{if(!enabled||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;const key=e.key.toLowerCase();if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright','shift'].includes(key)){keys.add(key);e.preventDefault();}});
  addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));addEventListener('blur',()=>keys.clear());document.addEventListener('visibilitychange',()=>{if(document.hidden)keys.clear();});
  canvas.addEventListener('pointerdown',e=>{if(enabled){drag={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);}});
  canvas.addEventListener('pointermove',e=>{if(enabled&&drag){yaw-=(e.clientX-drag.x)*.004;pitch=THREE.MathUtils.clamp(pitch+(e.clientY-drag.y)*.003,-.12,.58);drag={x:e.clientX,y:e.clientY};}});
  canvas.addEventListener('pointerup',()=>drag=null);canvas.addEventListener('pointercancel',()=>drag=null);
  canvas.addEventListener('wheel',e=>{if(enabled){distance=THREE.MathUtils.clamp(distance+e.deltaY*.004,2.4,8);e.preventDefault();}},{passive:false});
  document.querySelectorAll('[data-move]').forEach(b=>{b.addEventListener('pointerdown',e=>{keys.add(b.dataset.move);b.setPointerCapture(e.pointerId);e.preventDefault();});for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,()=>keys.delete(b.dataset.move));});
  girl.rotation.y=Math.PI;
  return {update,setEnabled,reset,get enabled(){return enabled;},get moving(){return moving;},getState:()=>({enabled,position:position.toArray(),area,level,onStairs,moving,yaw,pitch})};
}
