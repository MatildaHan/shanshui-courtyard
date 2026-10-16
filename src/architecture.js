import * as THREE from 'three';
import { GLTFLoader } from '../vendor/GLTFLoader.js';

const PARTS = ['roof', 'dougong', 'column', 'window', 'corridor'];

/** Editable local Blender architecture, in the same world coordinates as the explorer. */
export function createArchitecture({ scene, pickables, onLoaded }) {
  const group = new THREE.Group();
  group.name = '听雨阁 · Blender 建筑';
  scene.add(group);
  const state = {
    loaded: false, error: null, source: 'Blender GLB', meshes: 0,
    triangles: 0, materials: 0, tileCount: null, parts: {}, bounds: null
  };
  const luminous = new Set();
  let glow = .10;
  const status = document.createElement('div');
  status.id = 'architecture-status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  Object.assign(status.style, {
    position: 'absolute', zIndex: '25', top: '15px', left: '50%',
    transform: 'translateX(-50%)', maxWidth: 'calc(100% - 30px)',
    padding: '10px 16px', border: '1px solid #d8b87866', borderRadius: '8px',
    color: '#f1e9d3', background: '#233b34ee', fontSize: '12px', textAlign: 'center'
  });
  status.textContent = '正在载入听雨阁建筑…';
  document.body.appendChild(status);

  function partOf(object) {
    for (let node = object; node; node = node.parent) {
      if (PARTS.includes(node.userData.part)) return node.userData.part;
    }
    return null;
  }
  function setLighting(intensity) {
    glow = intensity;
    for (const material of luminous) material.emissiveIntensity = glow;
  }
  const loader = new GLTFLoader();
  async function load() {
    const embedded = globalThis.__COURTYARD_GLB__;
    if (embedded) {
      const buffer = typeof embedded === 'string'
        ? Uint8Array.from(atob(embedded), c => c.charCodeAt(0)).buffer
        : embedded;
      return loader.parseAsync(buffer, '');
    }
    return loader.loadAsync(new URL('../assets/architecture/courtyard.glb', import.meta.url).href);
  }
  let timer;
  const ready = Promise.race([
    load(),
    new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('建筑文件加载超时')), 60000); })
  ]).then(gltf => {
    const materials = new Set(), meshes = [], parts = Object.fromEntries(PARTS.map(part => [part, 0]));
    let triangles = 0;
    let tileCount = gltf.scene.userData.tileCount ?? gltf.asset?.extras?.tileCount;
    let assetVersion = null;
    gltf.scene.traverse(object => {
      if (Number.isFinite(object.userData.tileCount)) tileCount = object.userData.tileCount;
      if (object.userData.assetVersion) assetVersion = object.userData.assetVersion;
      if (!object.isMesh) return;
      meshes.push(object);
      object.castShadow = object.receiveShadow = true;
      const part = partOf(object);
      if (part) { object.userData.part = part; parts[part]++; }
      const count = object.geometry.index?.count ?? object.geometry.attributes.position?.count ?? 0;
      triangles += count / 3 * (object.isInstancedMesh ? object.count : 1);
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        materials.add(material);
        if (material.emissive && /paper|window_glow|lantern|窗纸|灯纸/i.test(material.name)) {
          luminous.add(material);
          if (material.emissive.getHex() === 0) material.emissive.set(0xffc78b);
        }
      }
    });
    if (!meshes.length) throw new Error('建筑文件未包含可显示的几何体');
    const missing = PARTS.filter(part => parts[part] === 0);
    if (missing.length) throw new Error('建筑文件缺少构件标识：' + missing.join(', '));
    group.add(gltf.scene);
    group.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(group);
    for (const mesh of meshes) if (mesh.userData.part) pickables.push(mesh);
    Object.assign(state, {
      loaded: true, meshes: meshes.length, triangles: Math.round(triangles),
      materials: materials.size, tileCount: Number.isFinite(tileCount) ? tileCount : null,
      parts, assetVersion, bounds: { min: bounds.min.toArray(), max: bounds.max.toArray() }
    });
    setLighting(glow);
    status.remove();
    onLoaded?.(group);
  }).catch(reason => {
    state.error = reason.message || String(reason);
    status.setAttribute('role', 'alert');
    status.textContent = '听雨阁建筑加载失败，请刷新页面或重新启动本地服务。';
    status.title = state.error;
    status.style.borderColor = '#d69d86';
    console.error('Courtyard architecture:', reason);
  }).finally(() => clearTimeout(timer));

  return {
    group, ready, setLighting,
    getState: () => ({ ...state, parts: { ...state.parts }, windowLightMaterials: luminous.size, windowGlow: glow })
  };
}
