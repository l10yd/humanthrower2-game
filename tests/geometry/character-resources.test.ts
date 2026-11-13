import { it,expect,vi } from 'vitest';
import { BufferGeometry,MeshBasicMaterial,Texture,Mesh,Group } from 'three';
import { CharacterResources,CharacterTasks } from '../../src/assets/CharacterResources';
it('owned shared geometry/material/texture/bitmap are released exactly once on repeated disposal',()=>{
 const resources=new CharacterResources(),g=new BufferGeometry(),bitmap={close:vi.fn()},t=new Texture(bitmap),m=new MeshBasicMaterial({map:t}),group=new Group();group.add(new Mesh(g,m),new Mesh(g,m));
 const gd=vi.spyOn(g,'dispose'),md=vi.spyOn(m,'dispose'),td=vi.spyOn(t,'dispose');resources.track(group);resources.track(t);resources.image(bitmap);resources.dispose();resources.dispose();resources.track(group);
 expect(gd).toHaveBeenCalledTimes(1);expect(md).toHaveBeenCalledTimes(1);expect(td).toHaveBeenCalledTimes(1);expect(bitmap.close).toHaveBeenCalledTimes(1);
});
it('resources arriving after a sibling failure are drained and released, including late bitmaps',async()=>{
 const resources=new CharacterResources(),tasks=new CharacterTasks(),g=new BufferGeometry(),dispose=vi.spyOn(g,'dispose'),bitmap={close:vi.fn()};let resolve!:(value:BufferGeometry)=>void;
 const pending=tasks.own(new Promise<BufferGeometry>(r=>{resolve=r;}),value=>resources.track(value));
 let settled=false;const drain=tasks.settle().then(()=>{settled=true;resources.dispose();});await Promise.resolve();expect(settled).toBe(false);resolve(g);await pending;await drain;expect(dispose).toHaveBeenCalledTimes(1);
 resources.image(bitmap);resources.image(bitmap);expect(bitmap.close).toHaveBeenCalledTimes(1);
});
