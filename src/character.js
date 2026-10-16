import * as THREE from 'three';
import { GLTFLoader } from '../vendor/GLTFLoader.js';

/** Blender-authored character and a locally modelled folding bamboo kite. */
export function createCharacter() {
  const group = new THREE.Group(); group.name = '小女孩 · 阿棠';
  const materials = new Map(), actions = {};
  let mixer, active, error = null, loaded = false, skinnedMeshes = 0;
  let requestedClip = 'Idle', wingOpen = 0, elapsed = 0;
  const rememberMaterial = material => {
    if (!materials.has(material)) materials.set(material, {opacity: material.opacity, transparent: material.transparent, depthWrite: material.depthWrite});
  };
  const kite = new THREE.Group(); kite.name = '竹骨纸鸢 · 滑翔翼'; kite.position.set(0,1.19,-.13); kite.visible = false; group.add(kite);
  const silk = new THREE.MeshStandardMaterial({color:0xc9d8c2,roughness:.82,side:THREE.DoubleSide});
  const jade = new THREE.MeshStandardMaterial({color:0x4d8076,roughness:.7,side:THREE.DoubleSide});
  const bamboo = new THREE.MeshStandardMaterial({color:0xb79d68,roughness:.68});
  const wingPivots = [];
  for (const side of [-1,1]) {
    const wing = new THREE.Group(); kite.add(wing); wingPivots.push(wing);
    const points = [[0,.12,0],[side*.43,.27,-.08],[side*1.14,.28,-.45],[side*1.50,.08,-.75],[side*.95,-.04,-.60],[side*.42,-.04,-.45],[0,-.06,-.24]];
    const vertices = [], indices = []; points.forEach(p=>vertices.push(...p));
    for(let i=1;i<points.length-1;i++) indices.push(0,i,i+1);
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3)); geometry.setIndex(indices); geometry.computeVertexNormals();
    const membrane = new THREE.Mesh(geometry,silk); membrane.castShadow=true; wing.add(membrane);
    const patchGeometry = new THREE.BufferGeometry(); patchGeometry.setAttribute('position',new THREE.Float32BufferAttribute([...points[2],...points[3],...points[4]],3)); patchGeometry.computeVertexNormals();
    const patch = new THREE.Mesh(patchGeometry,jade); patch.position.y=.004; wing.add(patch);
    for (const [a,b] of [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,0],[0,2],[0,3],[0,4],[0,5]]) {
      const from=new THREE.Vector3(...points[a]),to=new THREE.Vector3(...points[b]),direction=to.clone().sub(from);
      const rib=new THREE.Mesh(new THREE.CylinderGeometry(.013,.013,direction.length(),5),bamboo);
      rib.position.copy(from).add(to).multiplyScalar(.5);rib.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());wing.add(rib);
    }
  }
  for(const material of [silk,jade,bamboo])rememberMaterial(material);
  const loader = new GLTFLoader(), source = globalThis.__ATANG_GLB__;
  const ready = (source
    ? loader.parseAsync(Uint8Array.from(atob(source),c=>c.charCodeAt(0)).buffer,'')
    : loader.loadAsync(new URL('../assets/characters/atang.glb',import.meta.url).href))
    .then(gltf=>{
      gltf.scene.traverse(object=>{
        if(!object.isMesh)return;
        object.castShadow=object.receiveShadow=true;
        if(object.isSkinnedMesh){skinnedMeshes++;object.frustumCulled=false;}
        for(const material of Array.isArray(object.material)?object.material:[object.material])rememberMaterial(material);
      });
      group.add(gltf.scene);mixer=new THREE.AnimationMixer(gltf.scene);
      for(const clip of gltf.animations)actions[clip.name]=mixer.clipAction(clip);
      for(const name of ['Idle','Walk','Run'])if(!actions[name])throw new Error('缺少角色动画：'+name);
      for(const name of ['Jump','Land'])if(actions[name]){actions[name].setLoop(THREE.LoopOnce,1);actions[name].clampWhenFinished=true;}
      active=actions.Idle;active.play();loaded=true;
    }).catch(reason=>{
      error=reason.message;
      const label=document.querySelector('#walk-hud small');
      if(label)label.textContent='角色加载失败，请重新启动本地服务并刷新。';
      console.error('Atang model:',reason);
    });
  const fallback={Sprint:'Run',Jump:'Idle',Fall:'Idle',Land:'Idle',Climb:'Walk',Glide:'Idle'};
  function update(dt,state={},legacyRunning=false) {
    // The boolean form keeps existing embedders compatible while their controller updates.
    if(typeof state==='boolean')state={action:state?(legacyRunning?'Run':'Walk'):'Idle'};
    requestedClip=state.action||'Idle';elapsed+=dt;
    wingOpen=THREE.MathUtils.damp(wingOpen,requestedClip==='Glide'?1:0,14,dt);
    kite.visible=wingOpen>.015;kite.scale.set(Math.max(.01,wingOpen),1,Math.max(.08,wingOpen));
    kite.rotation.x=.05+Math.sin(elapsed*2.3)*.015;
    wingPivots.forEach((wing,i)=>wing.rotation.z=(i===0?1:-1)*((1-wingOpen)*1.28+Math.sin(elapsed*3.3)*.018));
    if(!mixer||!loaded)return;
    const next=actions[requestedClip]||actions[fallback[requestedClip]]||actions.Idle;
    if(next!==active){
      active.fadeOut(.13);next.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).fadeIn(.13).play();active=next;
    }
    if(requestedClip==='Climb')active.setEffectiveTimeScale(state.moving?Math.max(.3,Math.abs(state.verticalSpeed||.7)/.7):0);
    else if(!['Jump','Land'].includes(requestedClip))active.setEffectiveTimeScale(1);
    mixer.update(dt);
  }
  function setOpacity(target,dt=1){
    for(const [material,base] of materials){
      material.opacity=THREE.MathUtils.lerp(material.opacity,base.opacity*target,Math.min(1,dt*10));
      const faded=material.opacity<base.opacity*.995;
      const transparent=base.transparent||faded,depthWrite=faded?false:base.depthWrite;
      if(material.transparent!==transparent||material.depthWrite!==depthWrite){material.transparent=transparent;material.depthWrite=depthWrite;material.needsUpdate=true;}
    }
  }
  return {group,ready,update,setOpacity,getState:()=>({loaded,error,clip:active?.getClip().name??null,requestedClip,
    fallback:loaded&&active?.getClip().name!==requestedClip,animationTime:active?.time??0,skinnedMeshes,materials:materials.size,clips:Object.keys(actions),gliderOpen:wingOpen})};
}
