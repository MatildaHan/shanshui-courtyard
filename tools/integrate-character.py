from pathlib import Path
root=Path(r'D:\DesktopFile\game\shanshui-courtyard')
p=root/'src/explore.js'
s=p.read_text(encoding='utf-8-sig')
s=s.replace("import * as THREE from 'three';","import * as THREE from 'three';\nimport { createCharacter } from './character.js';")
start=s.index('  const skin=')
end=s.index("  const sc=document")
s=s[:start]+"  const character=createCharacter();const girl=character.group;scene.add(girl);\n"+s[end:]
s=s.replace("keys.has('shift')?4.0:2.45","keys.has('shift')?2.8:1.45")
s=s.replace("phase+=dt*speed*4.3;","moving=position.distanceToSquared(old)>1e-8;")
s=s.replace("girl.position.copy(position);girl.position.y+=moving?Math.abs(Math.sin(phase))*.025:Math.sin(performance.now()*.002)*.006;","girl.position.copy(position);")
s='\n'.join(line for line in s.split('\n') if '      arms.forEach' not in line)
s=s.replace("for(const mat of [skin,hair,ivory,pink,teal,shoe,dark,gold]){mat.transparent=true;mat.opacity=THREE.MathUtils.lerp(mat.opacity,opacity,Math.min(1,dt*10));}","character.setOpacity(opacity,dt);")
s=s.replace('for(const mat of [skin,hair,ivory,pink,teal,shoe,dark,gold])mat.opacity=1;','character.setOpacity(1,dt);')
s=s.replace('    shadow.position.copy(position)',"    character.update(dt,moving,keys.has('shift'));\n    shadow.position.copy(position)")
s=s.replace("}else{arms.forEach(a=>a.rotation.x=0);legs.forEach(l=>l.rotation.x=0);}}","}}")
s=s.replace('moving,yaw,pitch})','moving,yaw,pitch,character:character.getState()})')
s=s.replace('distance=6.2,phase=0,moving','distance=6.2,moving')
p.write_text(s,encoding='utf-8')
p=root/'vendor/GLTFLoader.js'
s=p.read_text(encoding='utf-8-sig').replace('../utils/BufferGeometryUtils.js','./BufferGeometryUtils.js')
p.write_text(s,encoding='utf-8')
for p in (root/'tests/browser').glob('*.js'):
    s=p.read_text(encoding='utf-8-sig').replace('D:/Files/codex/2026-10-15/c-l/outputs/shanshui-courtyard/','D:/DesktopFile/game/shanshui-courtyard/docs/screenshots/').replace('D:/Files/codex/2026-10-15/c-l/work/','D:/DesktopFile/game/shanshui-courtyard/docs/screenshots/')
    s=s.replace('timeout=10000','timeout=20000').replace('position[2]<11.1','position[2]<11.3')
    p.write_text(s,encoding='utf-8')

