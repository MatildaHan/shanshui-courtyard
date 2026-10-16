from pathlib import Path
import zipfile,json,struct,hashlib
root=Path(__file__).resolve().parents[1]
raw=(root/'assets/characters/atang.glb').read_bytes()
magic,version,length=struct.unpack_from('<III',raw)
assert magic==0x46546c67 and version==2 and length==len(raw)
chunk_length,chunk_type=struct.unpack_from('<II',raw,12)
doc=json.loads(raw[20:20+chunk_length])
clips=[a['name'] for a in doc['animations']]
assert set(clips)=={'Idle','Walk','Run','Sprint','Jump','Fall','Land','Climb','Glide'},clips
assert len(doc['skins'])==1 and len(doc['skins'][0]['joints'])==25
assert all('bufferView' in image for image in doc.get('images',[]))
assert all('uri' not in b for b in doc['buffers'])
report={'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest(),'bones':len(doc['skins'][0]['joints']),'animations':clips,'materials':len(doc['materials']),'embeddedImages':len(doc.get('images',[]))}
(root/'tests/results/model-validation.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
out=root/'dist/山水楼阁-Unity准备版.zip'
with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
    for name in ['src','assets','blender','docs','tests','tools','vendor','unity']:
        for p in (root/name).rglob('*'):
            if p.is_file() and p.suffix not in ['.blend1','.pyc'] and not any(part in p.parts for part in ['__pycache__','Library','Temp','obj','Logs','UserSettings']):
                z.write(p,p.relative_to(root))
    for name in ['index.html','README.txt','start.py','dist/shanshui-courtyard-single.html']:
        z.write(root/name,name)
with zipfile.ZipFile(out) as z:
    assert z.testzip() is None
    assert 'assets/characters/atang.glb' in z.namelist()
print(json.dumps(report))
print('Package:',out,out.stat().st_size,'bytes')

