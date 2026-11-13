import './style.css';
import { RAPIER } from './physics/PhysicsManager';
import { Game } from './core/Game';
import { loadReferenceCharacter } from './assets/ReferenceCharacter';
import { loadIndustrialShaft } from './assets/IndustrialShaft';
declare global { interface Window { humanthrower:Game } }
async function boot(){try {
  await RAPIER.init();
  // A gameplay class change must replace the live Game too, rather than leave
  // instances created with the previous prototype in a half-updated module graph.
  if(import.meta.hot){import.meta.hot.dispose(()=>window.humanthrower?.dispose());import.meta.hot.accept(()=>location.reload());}
  const options=new URLSearchParams(location.search);
  const art=options.get('art')!=='off';
  const jobs=art?[
    loadReferenceCharacter(),
    ...(options.get('variants')==='off'?[]:[loadReferenceCharacter('reference-scout','scout'),loadReferenceCharacter('reference-bruiser','bruiser')]),
  ]:[];
  const environment=art&&options.get('environment')!=='off'?loadIndustrialShaft():Promise.resolve(null);
  const [models,scene]=await Promise.all([Promise.allSettled(jobs),environment.then(value=>({value,error:null}),error=>({value:null,error}))]);
  let character=models[0]?.status==='fulfilled'?models[0].value:null;
  if(character){for(const result of models.slice(1))if(result.status==='fulfilled')character.variants.push(result.value);else console.warn('Optional character variant unavailable.',result.reason);}
  else if(art){for(const result of models)if(result.status==='fulfilled')result.value.dispose();console.warn('Reference model unavailable; using greybox.');document.querySelector('#error')!.textContent='Модель не загрузилась — доступен технический greybox.';}
  if(scene.error)console.warn('Industrial shaft unavailable; using greybox arena.',scene.error);
  window.humanthrower=new Game(document.querySelector<HTMLCanvasElement>('#scene')!,character,scene.value);
}catch(e){document.querySelector('#error')!.textContent=`Не удалось запустить прототип: ${String(e)}. Нужен браузер с WebGL2.`;
  document.querySelector('#start')!.textContent='Ошибка запуска';console.error(e);}}
void boot();
