"""Normalize the original Blender shaft GLB to the game's nearest/no-mip policy.
Usage: python scripts/prepare-industrial-shaft.py
"""
import json, struct
from pathlib import Path
path=Path(__file__).resolve().parents[1]/'public/assets/industrial-shaft/shaft.glb'
raw=path.read_bytes();size=struct.unpack_from('<I',raw,12)[0];doc=json.loads(raw[20:20+size]);bin_size,kind=struct.unpack_from('<II',raw,20+size);binary=raw[28+size:28+size+bin_size]
for sampler in doc.get('samplers',[]): sampler['minFilter']=sampler['magFilter']=9728
payload=json.dumps(doc,separators=(',',':')).encode();payload+=b' '*(-len(payload)%4)
path.write_bytes(struct.pack('<III',0x46546c67,2,28+len(payload)+len(binary))+struct.pack('<II',len(payload),0x4e4f534a)+payload+struct.pack('<II',len(binary),kind)+binary)
print(f'Prepared industrial-shaft: {path.stat().st_size} bytes, 11 rigid mesh groups, nearest/no mipchain')
