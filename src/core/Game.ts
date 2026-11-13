import { LOSS_LABELS,LOSS_TIPS,formatDuration,runBreakdown,type RunDetails } from '../gameplay/RunSummary';
import { bombPlayer } from '../gameplay/HazardDamage';
import { canCarryWeapon, WeaponSupplies } from '../gameplay/WeaponSupplies';
import { ChaosDirector, CHAOS_EVENTS } from '../gameplay/ChaosDirector';
import { SkyDrops } from '../gameplay/SkyDrops';
import { burstPlayer, DEATH_SECONDS } from '../gameplay/DeathSequence';
import type { WeaponKind } from '../gameplay/WeaponController';
import { PauseMenu,GameplayPreferences } from '../gameplay/PauseMenu';
import { browserGameplayStorage } from '../gameplay/GameplaySettings';
import { Tutorial,TUTORIAL_HINTS,browserTutorialStorage } from '../gameplay/Tutorial';
import { CONFIG, randomSeed, type NpcType } from './Config';
import { PhysicsManager } from '../physics/PhysicsManager';
import { RagdollFactory } from '../physics/RagdollFactory';
import { FreshDropMotion } from '../npc/FreshDropMotion';
import { LivingNpcs,DROP_FORMS,dropOptions } from '../npc/LivingNpcs';
import { Input } from '../player/Input';
import { PlayerController } from '../player/PlayerController';
import { RetroRenderer } from '../rendering/RetroRenderer';
import { RowDetector } from '../grid/RowDetector';
import { OccupancyRaster } from '../grid/OccupancyRaster';
import { clearRows } from '../slicing/ClearTransaction';
import { axisAngle, vec } from '../slicing/Math';
import { SpawnPlanner, type DropPlan } from '../npc/SpawnPlanner';
import { DropScheduler } from '../npc/DropScheduler';
import { ContinuousDropPlanner } from '../npc/ContinuousDropPlanner';
import { PlayerSurvival } from '../gameplay/PlayerSurvival';
import { ScoreManager } from '../gameplay/ScoreManager';
import { DifficultyManager } from '../gameplay/DifficultyManager';
import { LossDetector, type LossReason } from '../gameplay/LossDetector';
import { browserRecordStore, RULES_VERSION, type SessionRecord } from '../gameplay/RecordStore';
import { SqueezeProbe } from '../player/SqueezeProbe';
import { playerIntersectsRows } from '../player/RowHazard';
import { browserBloodStorage } from '../gameplay/BloodSettings';
import { GoreSystem } from '../gameplay/GoreSystem';
import { SawController } from '../gameplay/SawController';
import { WeaponController, WEAPONS } from '../gameplay/WeaponController';
import { massProperties } from '../slicing/ConvexClipper';
import { add, rotate } from '../slicing/Math';
import { GameAudio, browserAudioStorage } from '../audio/GameAudio';
import type { ReferenceCharacter } from '../assets/ReferenceCharacter';
import type { IndustrialShaft } from '../assets/IndustrialShaft';
export type GameState='TITLE'|'RUNNING'|'DYING'|'PAUSED'|'GAME_OVER'|'ERROR';
export class Game {
  preferences=new GameplayPreferences(browserGameplayStorage());pauseMenu:PauseMenu;
  physics=new PhysicsManager();factory=new RagdollFactory(this.physics,CONFIG.spawn.npcScale,CONFIG.spawn.npcMassMultiplier);player=new PlayerController(this.physics,true,this.preferences.settings.headControlFaults);
  tutorial=new Tutorial(browserTutorialStorage());
  npcMode:'twitch'|'hunt'='twitch';
  freshDrops=new FreshDropMotion(this.physics);
  living=new LivingNpcs(this.physics);spawnForms:Record<string,number>={};
  saw=new SawController(this.physics,this.player,true);weapons=new WeaponController(this.physics,this.player,this.saw,true);gore=new GoreSystem(browserBloodStorage());audio=new GameAudio(browserAudioStorage());
  detector=new RowDetector();occupancy=new OccupancyRaster();renderer:RetroRenderer;input:Input;
  scoring=new ScoreManager();difficulty=new DifficultyManager();loss=new LossDetector();
  squeeze=new SqueezeProbe(this.physics,this.player);records=browserRecordStore();result:SessionRecord|null=null;
  mode:'demo'|'technical'='demo';survival=new PlayerSurvival(this.player.damage);buried=false;
  readonly profile:'desktop'|'mobile'=window.matchMedia('(pointer: coarse)').matches?'mobile':'desktop';
  private gameplaySettingsChanged=false;
  private sessionStarted=false;
  private runDetails:RunDetails|null=null;
  private initialSettings={mode:'demo' as 'demo'|'technical',npcMode:'twitch' as 'twitch'|'hunt',headControlFaults:this.preferences.settings.headControlFaults};
  private completedSettings:typeof this.initialSettings|null=null;
  get recordProfile(){return {rulesVersion:RULES_VERSION,profile:this.profile,arenaPreset:`9x${CONFIG.arena.height}x2.4-chaos-v5-${this.mode}-${this.npcMode}${this.preferences.settings.headControlFaults?'-head-faults-on':''}`,assisted:this.gameplaySettingsChanged};}
  private deathReason:LossReason='IMPACT';
  chaos=new ChaosDirector(randomSeed(20261111^0xabcdef));sky=new SkyDrops();culled=0;
  private nextChaosDrop=0;private nextHazard=0;
  private medicalRandom=randomSeed(20261111^0x6d3d);
  medicalUsed=0;
  private supplies=new WeaponSupplies(randomSeed(20261111^0x51f15e));
  get visualTime(){return this.now+(this.deathAt!==null?DEATH_SECONDS-this.deathRemaining:0);}
  private deathRemaining=0;private deathAt:number|null=null;private pausedState:'RUNNING'|'DYING'='RUNNING';
  private contextLost=false;
  state:GameState='TITLE';now=0;drops=0;
  get rows(){return this.scoring.rows;}get score(){return this.scoring.points;}get health(){return this.mode==='demo'?this.survival.health:this.scoring.health;}
  scheduler=new DropScheduler(this.mode);warnings:DropPlan[]=[];
  get nextDrop(){return this.scheduler.next;}set nextDrop(value:number){this.scheduler.next=value;}
  get warning(){return this.warnings[0]??null;}set warning(value:DropPlan|null){this.warnings=value?[value]:[];}
  playerUpdateMs=0;playerUpdateP95=0;private playerTimings:number[]=[];
  private sessionSeed=20261111;
  get seed(){return this.sessionSeed;}
  private random=randomSeed(this.sessionSeed);private planner=new SpawnPlanner(this.physics,this.factory,this.random);
  private continuous=new ContinuousDropPlanner(this.physics,this.factory,this.random);
  private blockedSince:number|null=null;private accumulator=0;private lastFrame=0;private nextMeasure=0;private lastHud=0;private request=0;
  droppedTime=0;spawnBlocked=0;spawnCommitBlocks={budget:0,overlap:0};
  private cleanups:(()=>void)[]=[];
  private listen(target:EventTarget,event:string,handler:EventListener){target.addEventListener(event,handler);this.cleanups.push(()=>target.removeEventListener(event,handler));}
  constructor(canvas:HTMLCanvasElement,character:ReferenceCharacter|null=null,shaft:IndustrialShaft|null=null) {
    this.pauseMenu=new PauseMenu(document.querySelector<HTMLElement>('#pause-menu')!,canvas,document.querySelector<HTMLElement>('#touch')!,()=>{if(this.state==='PAUSED')this.togglePause();else this.pauseMenu.close();});
    this.renderer=new RetroRenderer(canvas,character,shaft);this.input=new Input(key=>{
      if(this.pauseMenu.open&&key==='Enter')return;
      if(key==='Escape'||key==='KeyP'){if(this.pauseMenu.open&&this.state!=='PAUSED')this.pauseMenu.close();else this.togglePause();}
      if(!this.pauseMenu.open&&(key==='KeyR'||key==='Enter'&&this.state==='GAME_OVER'))this.newSession();
      if(key==='KeyT'&&!this.pauseMenu.open&&this.state==='GAME_OVER')this.replaySession();
      if(key==='KeyF'&&!this.pauseMenu.open&&this.state==='RUNNING')this.toggleSaw();
      if(key==='KeyQ'&&!this.pauseMenu.open&&this.state==='RUNNING')this.cycleWeapon();
    },canvas,()=>!this.pauseMenu.open&&(this.state==='RUNNING'||this.state==='PAUSED'&&this.pausedState==='RUNNING'));
    this.listen(document,'pointerdown',e=>{if(e.isTrusted)this.audio.unlock();});
    this.listen(window,'keydown',e=>{if(e.isTrusted)this.audio.unlock();});
    this.listen(window,'blur',()=>{this.weapons.cancel();this.audio.saw(false,false);});
    this.listen(document.querySelector('#tutorial-dismiss')!,'click',()=>{this.tutorial.dismiss();this.syncTutorialUI();this.input.clear();});
    this.listen(document.querySelector('#tutorial-replay')!,'click',()=>{this.tutorial.replay();this.syncTutorialUI();this.input.clear();});
    this.listen(document.querySelector('#sound')!,'click',()=>{this.audio.configure({enabled:!this.audio.settings.enabled});this.audio.unlock();this.syncAudioUI();});
    this.listen(document.querySelector('#volume')!,'input',()=>{this.audio.configure({volume:Number(document.querySelector<HTMLInputElement>('#volume')!.value)});this.audio.unlock();this.syncAudioUI();});
    this.listen(document.querySelector('#blood')!,'change',()=>{this.gore.configure(document.querySelector<HTMLSelectElement>('#blood')!.value);});
    document.querySelector<HTMLSelectElement>('#blood')!.value=this.gore.mode;
    this.syncAudioUI();this.syncSawUI();this.saw.arcadeGuardEnabled=true;
    this.listen(document.querySelector('#next-weapon')!,'click',()=>{if(this.state==='RUNNING'||this.state==='PAUSED')this.cycleWeapon();});
    this.listen(document.querySelector('#weapon')!,'change',()=>{if(this.state!=='RUNNING'&&!(this.state==='PAUSED'&&this.pausedState==='RUNNING'))return;this.weapons.select(document.querySelector<HTMLSelectElement>('#weapon')!.value);this.audio.saw(false,false);this.syncSawUI();});
    this.listen(document.querySelector('#saw-mode')!,'click',()=>{if(this.state==='RUNNING')this.toggleSaw();});
    this.listen(canvas,'pointermove',e=>{if(this.pauseMenu.open)return;const p=e as PointerEvent;this.saw.aim=this.renderer.worldPoint(p.clientX,p.clientY);});
    this.listen(canvas,'pointerleave',()=>{this.saw.aim=null;});
    this.listen(document,'visibilitychange',()=>{if(document.hidden&&(this.state==='RUNNING'||this.state==='DYING'))this.pause();});
    this.listen(document.querySelector('#start')!,'click',()=>{if(this.state==='GAME_OVER'||this.state==='TITLE'&&this.sessionStarted)this.newSession();else if(this.state==='TITLE')this.start();});
    this.listen(document.querySelector('#replay-run')!,'click',()=>this.replaySession());
    this.listen(document.querySelector('#title')!,'click',()=>this.showTitle());
    this.listen(document.querySelector('#pause')!,'click',()=>this.togglePause());
    this.listen(document.querySelector('#settings')!,'click',()=>{if(this.state==='RUNNING'||this.state==='DYING')this.pause();else this.pauseMenu.show(this.state==='PAUSED');});
    this.listen(document.querySelector('#resume')!,'click',()=>{if(this.state==='PAUSED')this.togglePause();else this.pauseMenu.close();});
    this.listen(document.querySelector('#pause-restart')!,'click',()=>this.newSession());
    this.listen(document.querySelector('#pause-title')!,'click',()=>{this.pauseMenu.close();this.showTitle();});
    this.listen(document.querySelector('#head-control-faults')!,'change',()=>{
      if(this.now>0)this.gameplaySettingsChanged=true;
      this.preferences.setHeadControlFaults(document.querySelector<HTMLInputElement>('#head-control-faults')!.checked);
      this.player.trauma.configure(this.preferences.settings.headControlFaults);this.input.clear();this.weapons.cancel();this.syncQteUI();
    });
    document.querySelector<HTMLInputElement>('#head-control-faults')!.checked=this.preferences.settings.headControlFaults;
    this.listen(document.querySelector('#reset')!,'click',()=>this.newSession());
    this.listen(document.querySelector('#impact')!,'click',()=>this.dropOnPlayer());
    this.listen(document.querySelector('#drop')!,'click',()=>{if(this.state==='RUNNING'&&!this.warning)this.planDrop(.9);});
    this.listen(document.querySelector('#mode')!,'change',()=>{this.mode=document.querySelector<HTMLSelectElement>('#mode')!.value as typeof this.mode;this.restartFromSettings();});
    this.listen(document.querySelector('#npc-mode')!,'change',()=>{this.npcMode=document.querySelector<HTMLSelectElement>('#npc-mode')!.value as typeof this.npcMode;this.restartFromSettings();});
    this.listen(document.querySelector('#cut')!,'click',()=>{if(this.state==='RUNNING'&&this.mode==='technical')this.detector.arm(0,this.now);});
    this.listen(canvas,'webglcontextlost',e=>{e.preventDefault();this.contextLost=true;if(this.state==='RUNNING'||this.state==='DYING')this.pause();document.querySelector('#error')!.textContent='WebGL потерян. Игра на паузе; ждём восстановления графики.';});
    this.listen(canvas,'webglcontextrestored',()=>{this.contextLost=false;document.querySelector('#error')!.textContent='';document.querySelector('#hint')!.textContent='Графика восстановлена. Нажмите «Продолжить».';});
    this.listen(document.querySelector('#resolution')!,'change',()=>{this.renderer.configure({resolution:document.querySelector<HTMLSelectElement>('#resolution')!.value as typeof this.renderer.settings.resolution});});
    this.listen(document.querySelector('#shadows')!,'change',()=>{this.renderer.configure({shadowSize:Number(document.querySelector<HTMLSelectElement>('#shadows')!.value) as typeof this.renderer.settings.shadowSize});});
    this.listen(document.querySelector('#intensity')!,'input',()=>{this.renderer.configure({intensity:Number(document.querySelector<HTMLInputElement>('#intensity')!.value)});});
    this.listen(document.querySelector('#retro')!,'click',()=>{
      this.renderer.retro=!this.renderer.retro;document.querySelector('#retro')!.textContent=`PS1 spike: ${this.renderer.retro?'вкл.':'выкл.'}`;
    });
    document.querySelector<HTMLButtonElement>('#cut')!.disabled=true;
    document.querySelector<HTMLElement>('#app')!.dataset.state=this.state;
    document.querySelector<HTMLElement>('#app')!.dataset.debug=String(new URLSearchParams(location.search).has('debug'));
    const start=document.querySelector<HTMLButtonElement>('#start')!;start.disabled=false;start.textContent='Играть в демо';
    this.syncRecordUI();
    this.request=requestAnimationFrame(this.frame);
  }
  private syncRecordUI(){
    const panel=document.querySelector<HTMLElement>('#record-board')!,records=this.records.list({...this.recordProfile,assisted:false});
    panel.hidden=this.state!=='TITLE';panel.replaceChildren();
    const heading=document.createElement('strong');heading.textContent='ЛОКАЛЬНЫЕ РЕКОРДЫ · '+(this.mode==='demo'?'ДЕМО':'ТЕХНИЧЕСКИЙ РЕЖИМ');panel.append(heading);
    if(!records.length){const empty=document.createElement('p');empty.textContent='Пока нет забегов. Очищай ряды и поставь первый рекорд!';panel.append(empty);}
    else{const list=document.createElement('ol');for(const record of records.slice(0,5)){const item=document.createElement('li');item.textContent=`${record.score} очков · ${formatDuration(record.durationSeconds)} · ${record.rows} рядов`;list.append(item);}panel.append(list);}
    if(this.records.unavailable){const note=document.createElement('small');note.textContent='Хранение недоступно — рекорды только в этой вкладке.';panel.append(note);}
  }
  private syncTutorialUI(){
    const t=this.tutorial,hint=t.hint,visible=(this.state==='RUNNING'||this.state==='PAUSED')&&this.mode==='demo'&&t.enabled&&!t.completed&&hint!==null;
    const panel=document.querySelector<HTMLElement>('#tutorial-hint')!;panel.hidden=!visible;panel.dataset.lesson=hint??'';
    if(hint){const content=TUTORIAL_HINTS[hint];document.querySelector('#tutorial-heading')!.textContent=content.title;document.querySelector('#tutorial-text')!.textContent=content.text;}
  }
  private syncAudioUI(){const enabled=this.audio.settings.enabled;document.querySelector('#sound')!.textContent=`Звук: ${enabled?'вкл.':'выкл.'}`;document.querySelector('#sound')!.setAttribute('aria-pressed',String(enabled));document.querySelector<HTMLInputElement>('#volume')!.value=String(this.audio.settings.volume);}
  private syncSawUI(){
    const w=this.weapons,owned=!w.limited||w.inventory.has(w.selected),label=owned?WEAPONS[w.selected]:'Без оружия';
    const usable=this.state==='RUNNING'||this.state==='PAUSED'&&this.pausedState==='RUNNING';
    const mode=document.querySelector<HTMLButtonElement>('#saw-mode')!;mode.textContent=`${label}${owned?' [F]':''}: ${w.enabled?'вкл.':'выкл.'}`;mode.disabled=!owned||!usable;mode.setAttribute('aria-pressed',String(w.enabled));
    const select=document.querySelector<HTMLSelectElement>('#weapon')!;
    for(const option of Array.from(select.options)){const kind=option.value as WeaponKind;option.disabled=w.limited&&!w.inventory.has(kind);option.textContent=`${WEAPONS[kind]}${w.inventory.has(kind)&&!canCarryWeapon(this.player.damage,kind)?' · нет конечности':''}`;}
    select.value=owned?w.selected:'';select.disabled=!usable||w.limited&&!w.inventory.kinds.length;
    document.querySelector<HTMLButtonElement>('#next-weapon')!.disabled=!usable||w.limited&&w.inventory.kinds.length<2;
    const meter=document.querySelector('#weapon-durability');if(meter)meter.textContent=owned?(w.selected==='launcher'?`Заряды: ${Math.ceil(w.inventory.stock.launcher??8)}`:`Прочность: ${w.limited?w.inventory.percent(w.selected):100}%`):'Лови оружие сверху';
    const touch=document.querySelector('[data-action="saw"]');if(touch)touch.textContent='Атака';
  }
  private syncChaosUI(){
    const panel=document.querySelector<HTMLElement>('#chaos-banner')!,event=this.chaos.current;
    panel.hidden=this.mode!=='demo'||!event||this.state!=='RUNNING';
    if(event){panel.dataset.warning=String(!event.started);panel.textContent=`${event.started?'⚡':'⚠'} ${CHAOS_EVENTS[event.kind]} · ${Math.max(0,(event.started?event.endsAt:event.startsAt)-this.now).toFixed(1)} с${!event.started?' — берегись!':''}`;}
  }
  private syncQteUI(){
    const q=this.player.qte,shown=(this.state==='RUNNING'||this.state==='PAUSED')&&q.active;
    const panel=document.querySelector<HTMLElement>('#get-up-qte')!;panel.hidden=!shown;
    panel.setAttribute('aria-valuenow',String(Math.round(q.progress*100)));
    document.querySelector<SVGCircleElement>('#qte-fill')!.style.strokeDashoffset=String(1-q.progress);
    document.querySelector('#qte-percent')!.textContent=`${Math.round(q.progress*100)}%`;
    const phaseLabels={AIRBORNE:'ПАДЕНИЕ',BRACING:'УПИРАЕТСЯ',RISING:'ПОДНИМАЕТСЯ',BLOCKED:'РАЗДВИГАЕТ ЗАВАЛ',INTERRUPTED:'СБИТ С НОГ',STANDING:'ВСТАЛ'};
    const rollback=q.snapshot.rollbackVisible?` · ОТКАТ −${Math.round(q.rollback*100)}%`:'';
    document.querySelector('#qte-remaining')!.textContent=`${q.ready?'ПОДЪЁМ ЗА 1 СЕКУНДУ':phaseLabels[q.phase]}${rollback} · сверху ${Math.round(q.loadMass)} кг${q.ready?' · больше жать не нужно':q.overloaded?' · СЛИШКОМ ТЯЖЕЛО: разгрузи завал':' · жми быстро!'}`;
    panel.dataset.phase=q.phase;panel.style.setProperty('--effort-pulse',String(q.pulse));
    const labels:Record<string,string>={head:'Голова',chest:'Грудь',pelvis:'Таз','upperArm-1':'Л. плечо','forearm-1':'Л. рука',upperArm1:'П. плечо',forearm1:'П. рука','thigh-1':'Л. бедро','shin-1':'Л. голень',thigh1:'П. бедро',shin1:'П. голень'};
    const bodyMap=document.querySelector('#body-map')!;
    for(const [limb,amount] of Object.entries(this.player.damage.parts)){
      let item=bodyMap.querySelector<HTMLElement>(`[data-limb="${limb}"]`);
      if(!item){item=document.createElement('span');item.dataset.limb=limb;bodyMap.append(item);}
      const immune=limb==='head'&&this.player.damage.headImmune;
      item.textContent=`${labels[limb]} ${Math.round(amount*100)}%${immune?' · ЩИТ':''}`;item.dataset.immune=String(immune);item.dataset.hurt=String(amount<.98);item.title=`${immune?'Иммунитет головы: оружие активно · ':''}Прочность ${Math.round(amount*100)}% · осталось ткани ${Math.round(this.player.damage.tissue[limb as keyof typeof this.player.damage.tissue]*100)}%`;
    }
    document.querySelector('#mobility-mode')!.textContent={WALK:'Ходьба',LIMP:'Хромота',HOP:'Одна нога',CRAWL:'Ползание'}[this.player.damage.mobility];
    const traumaEnabled=this.preferences.settings.headControlFaults;
    document.querySelector('#trauma-status')!.textContent=traumaEnabled&&(this.player.trauma.keyboardInverted||this.player.trauma.mouseInverted)?`ДЕЗОРИЕНТАЦИЯ · ${this.player.trauma.keyboardInverted?'клавиши инвертированы ':''}${this.player.trauma.mouseInverted?'прицел инвертирован':''}`:this.player.damage.parts.head<.75?(traumaEnabled?'ТРАВМА ГОЛОВЫ — управление может сбоить':'ТРАВМА ГОЛОВЫ · сбои управления выкл.'):'';
  }
  private cycleWeapon(){if(this.state!=='RUNNING'&&!(this.state==='PAUSED'&&this.pausedState==='RUNNING'))return;this.weapons.cycle();this.audio.saw(false,false);this.syncSawUI();}
  private toggleSaw(){if(this.state!=='RUNNING')return;this.weapons.toggle();this.audio.saw(false,false);this.syncSawUI();}
  private restartFromSettings(){const keepPaused=this.state==='PAUSED';this.restart();if(keepPaused)this.pause();}
  start(){if(this.contextLost||this.state==='DYING'||this.state==='GAME_OVER'||this.state==='PAUSED'&&this.pausedState==='DYING')return;this.sessionStarted=true;document.querySelector<HTMLElement>('#record-board')!.hidden=true;document.querySelector<HTMLElement>('#run-details')!.hidden=true;document.querySelector<HTMLElement>('#replay-run')!.hidden=true;this.pauseMenu.close();this.state='RUNNING';this.audio.setRunning(true);this.input.clear();this.lastFrame=0;this.accumulator=0;
    document.querySelector<HTMLElement>('#app')!.dataset.state='RUNNING';
    document.querySelector<HTMLElement>('#app')!.dataset.dying='false';this.pausedState='RUNNING';
    document.querySelector<HTMLElement>('#overlay')!.hidden=true;document.querySelector<HTMLButtonElement>('#pause')!.disabled=false;
    document.querySelector('#hint')!.textContent='Выживай, собирай ряды. Оружие падает сверху — подойди к нему. Берегись случайных событий!';
    document.querySelector('#pause')!.textContent='Пауза';}
  pause(){if(this.state==='PAUSED'){this.weapons.cancel();this.audio.saw(false,false);this.input.clear();this.pauseMenu.show(true);return;}if(this.state!=='RUNNING'&&this.state!=='DYING')return;this.pausedState=this.state;document.querySelector<HTMLElement>('#app')!.dataset.dying=String(this.state==='DYING');this.audio.setRunning(false);this.weapons.cancel();this.state='PAUSED';this.accumulator=0;this.input.clear();document.querySelector('#pause')!.textContent='Продолжить';
    document.querySelector<HTMLElement>('#app')!.dataset.state='PAUSED';this.pauseMenu.show(true);
    document.querySelector('#hint')!.textContent='ПАУЗА — физика и все игровые таймеры остановлены.';}
  togglePause(){
    if(this.state==='RUNNING'||this.state==='DYING')this.pause();
    else if(this.state==='PAUSED'&&!this.contextLost){
      if(this.pausedState==='DYING'){this.pauseMenu.close();this.state='DYING';document.querySelector<HTMLElement>('#app')!.dataset.state='DYING';this.lastFrame=0;this.accumulator=0;document.querySelector('#pause')!.textContent='Пауза';}
      else this.start();
    }
  }
  replaySession(){
    if(this.state!=='GAME_OVER'||!this.result||!this.completedSettings)return;
    const seed=Number(this.result.seed),settings=this.completedSettings;
    this.mode=settings.mode;this.npcMode=settings.npcMode;this.preferences.setHeadControlFaults(settings.headControlFaults);
    document.querySelector<HTMLSelectElement>('#mode')!.value=this.mode;document.querySelector<HTMLSelectElement>('#npc-mode')!.value=this.npcMode;document.querySelector<HTMLInputElement>('#head-control-faults')!.checked=settings.headControlFaults;
    this.restart(seed);
  }
  newSession(){const seed=crypto.getRandomValues(new Uint32Array(1))[0];this.restart(seed);}
  restart(seed=this.sessionSeed){
    if(!Number.isInteger(seed)||seed<0||seed>0xffffffff)throw Error('Session seed must be an unsigned 32-bit integer');
    this.sessionSeed=seed;this.gameplaySettingsChanged=false;this.runDetails=null;this.completedSettings=null;
    this.initialSettings={mode:this.mode,npcMode:this.npcMode,headControlFaults:this.preferences.settings.headControlFaults};
    this.tutorial.reset();this.audio.resetSession();this.input.clear();this.player.dispose();this.physics.dispose();this.physics=new PhysicsManager();this.factory=new RagdollFactory(this.physics,CONFIG.spawn.npcScale,CONFIG.spawn.npcMassMultiplier);this.player=new PlayerController(this.physics,this.mode==='demo',this.preferences.settings.headControlFaults);
    this.saw=new SawController(this.physics,this.player,true);this.freshDrops=new FreshDropMotion(this.physics);this.living=new LivingNpcs(this.physics,this.npcMode);this.spawnForms={};this.weapons=new WeaponController(this.physics,this.player,this.saw,this.mode==='demo');this.chaos=new ChaosDirector(randomSeed(this.sessionSeed^0xabcdef));this.supplies=new WeaponSupplies(randomSeed(this.sessionSeed^0x51f15e));this.medicalRandom=randomSeed(this.sessionSeed^0x6d3d);this.medicalUsed=0;this.sky=new SkyDrops();this.culled=0;this.nextChaosDrop=this.nextHazard=0;this.renderer.cameraShake=0;this.saw.arcadeGuardEnabled=this.mode==='demo';this.gore.reset();this.syncSawUI();this.deathRemaining=0;this.deathAt=null;this.pausedState='RUNNING';this.syncQteUI();
    this.detector=new RowDetector();this.occupancy=new OccupancyRaster();this.random=randomSeed(this.sessionSeed);this.now=0;this.scoring=new ScoreManager();this.difficulty=new DifficultyManager();this.loss=new LossDetector();this.squeeze=new SqueezeProbe(this.physics,this.player);this.result=null;this.drops=0;this.scheduler=new DropScheduler(this.mode);this.playerTimings=[];this.playerUpdateMs=0;this.playerUpdateP95=0;
    this.warning=null;this.continuous=new ContinuousDropPlanner(this.physics,this.factory,this.random);this.survival=new PlayerSurvival(this.mode==='demo'?this.player.damage:null);this.buried=false;document.querySelector<HTMLButtonElement>('#cut')!.disabled=this.mode==='demo';this.planner=new SpawnPlanner(this.physics,this.factory,this.random);this.blockedSince=null;this.nextMeasure=0;this.droppedTime=0;this.spawnBlocked=0;this.spawnCommitBlocks={budget:0,overlap:0};this.input.clear();document.querySelector('#error')!.textContent='';this.state='TITLE';this.start();}
  showTitle(){
    this.pauseMenu.close();
    document.querySelector<HTMLElement>('#app')!.dataset.state='TITLE';
    this.audio.setRunning(false);this.weapons.cancel();this.state='TITLE';this.accumulator=0;this.input.clear();
    document.querySelector<HTMLElement>('#overlay')!.hidden=false;document.querySelector('#overlay h1')!.textContent='HUMANTHROWER';
    document.querySelector('#summary')!.textContent='Физическая survival-аркада · демо';
    document.querySelector<HTMLElement>('#instructions')!.hidden=false;document.querySelector<HTMLElement>('#title')!.hidden=true;
    this.syncRecordUI();document.querySelector<HTMLElement>('#run-details')!.hidden=true;document.querySelector<HTMLElement>('#replay-run')!.hidden=true;
    document.querySelector('#start')!.textContent='Новая сессия';document.querySelector<HTMLButtonElement>('#pause')!.disabled=true;
  }
  private finish(reason:LossReason){
    if(this.state!=='RUNNING'&&this.state!=='DYING')return;
    document.querySelector<HTMLElement>('#app')!.dataset.state='GAME_OVER';this.pauseMenu.close();
    this.audio.setRunning(false);this.weapons.cancel();this.player.qte.reset();this.state='GAME_OVER';this.input.clear();this.accumulator=0;
    const record:SessionRecord={...this.recordProfile,seed:String(this.sessionSeed),score:this.scoring.total(this.now),rows:this.rows,
      durationSeconds:this.deathAt??this.now,maxCombo:this.scoring.maxCombo,drops:this.drops,lossReason:reason};
    const previousBest=this.records.list(this.recordProfile)[0]?.score??null;
    this.result=Object.freeze(record);this.runDetails=Object.freeze({rowPoints:this.scoring.points,events:this.chaos.events,weapons:this.sky.collected,broken:this.weapons.inventory.broken,medkits:this.medicalUsed,escapes:this.player.qte.escapes});this.completedSettings={...this.initialSettings};
    const best=this.records.save(record)[0]?.score??record.score;
    const newBest=previousBest===null||record.score>previousBest;
    document.querySelector<HTMLElement>('#overlay')!.hidden=false;document.querySelector('#overlay h1')!.textContent=LOSS_LABELS[reason];
    document.querySelector<HTMLElement>('#instructions')!.hidden=true;document.querySelector<HTMLElement>('#title')!.hidden=false;
    document.querySelector('#summary')!.textContent=`${newBest?'НОВЫЙ РЕКОРД! · ':''}${record.score} очков · рекорд ${best}${record.assisted?' · настройки менялись в забеге':''}${this.records.unavailable?' · только эта вкладка':''}`;
    document.querySelector<HTMLElement>('#record-board')!.hidden=true;
    const details=document.querySelector<HTMLElement>('#run-details')!;details.hidden=false;details.replaceChildren();
    for(const entry of runBreakdown(record,this.runDetails)){const item=document.createElement('div'),label=document.createElement('small'),value=document.createElement('strong');label.textContent=entry.label;value.textContent=entry.value;item.append(label,value);details.append(item);}
    const tip=document.createElement('p');tip.className='run-tip';tip.textContent=LOSS_TIPS[reason];details.append(tip);
    const seed=document.createElement('small');seed.textContent=`Seed: ${record.seed} · T — повтор с исходными настройками. Тот же seed; физика зависит от твоих действий.`;details.append(seed);
    document.querySelector<HTMLElement>('#replay-run')!.hidden=false;
    document.querySelector('#hint')!.textContent=reason==='ROW_CLEAR'?'Голова или корпус попали в срез. Потеря конечности сама по себе не смертельна.':'Сессия завершена. Нажми Enter / R, чтобы попробовать ещё раз.';
    document.querySelector('#player-status')!.textContent='СЕССИЯ ЗАВЕРШЕНА';
    document.querySelector('#start')!.textContent='Ещё раз · Enter / R';document.querySelector<HTMLButtonElement>('#pause')!.disabled=true;
  }
  private beginDeath(reason:LossReason){
    if(this.state!=='RUNNING')return;
    if(this.mode!=='demo'){this.finish(reason);return;}
    this.weapons.cancel();this.saw.enabled=false;this.audio.saw(false,false);this.audio.cut();this.input.clear();
    burstPlayer(this.physics,this.player,this.gore,this.now);
    this.renderer.cameraShake=0;
    this.deathReason=reason;this.deathAt=this.now;this.deathRemaining=DEATH_SECONDS;this.state='DYING';
    document.querySelector<HTMLElement>('#app')!.dataset.state='DYING';
    document.querySelector('#hint')!.textContent='КРИТИЧЕСКОЕ ПОВРЕЖДЕНИЕ · управление потеряно';this.syncQteUI();
  }
  private updateChaos(){
    if(this.mode!=='demo')return;
    const {supply,medkit,started}=this.chaos.tick(this.now);
    if(medkit)this.sky.spawn('medkit',-3.6+this.medicalRandom()*7.2);
    const random=this.random;
    if(supply){const kind=this.supplies.next(this.player.damage);if(kind)this.sky.spawn('weapon',this.chaos.supplies===1?this.player.current.x:-3.6+random()*7.2,kind);}
    if(started){this.nextHazard=this.now;this.nextChaosDrop=this.now;}
    const active=this.chaos.active;
    this.physics.world.gravity=vec(0,active?.kind==='gravity'?-24:-9.81,0);
    this.renderer.cameraShake=active?.kind==='quake'?.045:0;
    if(active?.kind==='bodyRain'&&this.now>=this.nextChaosDrop){this.planDrop(.55);this.nextChaosDrop=this.now+.55;}
    if(active?.kind==='bomb'&&started)this.sky.spawn('bomb',active.x);
    if(active&&['saw','scrap'].includes(active.kind)&&this.now>=this.nextHazard){this.sky.spawn(active.kind==='saw'?'saw':'scrap',-3.5+random()*7);this.nextHazard=this.now+1.3;}
    if(active?.kind==='quake'||active?.kind==='wind'){
      const wave=active.kind==='quake'?Math.sin(this.now*21):Math.sign(active.x)||1;
      for(const part of [...this.physics.parts.values()].slice(0,240))if(part.owner==='npc')part.body.applyImpulse(vec(part.body.mass()*wave*(active.kind==='quake'?.055:.025),active.kind==='quake'?part.body.mass()*.015:0,0),true);
      this.player.vx+=wave*(active.kind==='wind'?.08:.035);
    }
    const outcome=this.sky.update(this.physics,this.player,CONFIG.dt,true,this.now);
    for(let i=0;i<outcome.medkits;i++)if(this.survival.medkit()){this.medicalUsed++;document.querySelector('#hint')!.textContent='АПТЕЧКА · +25% прочности сохранившихся частей · +2 с воздуха';}
    for(const kind of outcome.collected){this.weapons.collect(kind);document.querySelector('#hint')!.textContent=`ПОДОБРАНО: ${WEAPONS[kind]} · E / ЛКМ — атака · оружие изнашивается`;}
    for(const point of outcome.bombs){
      const oldCuts=this.weapons.cuts.length;this.weapons.detonate(point);
      for(const cut of this.weapons.cuts.slice(oldCuts)){this.gore.cut(cut,this.physics);this.audio.cut();}
      this.gore.burst(point,vec(0,1,0),35);this.audio.impact(15,45);
      bombPlayer(this.physics,this.player,point,this.now);
    }
    for(const cut of outcome.cuts){this.gore.cut(cut,this.physics);this.audio.cut();}
  }
  dropOnPlayer(){
    if(this.state!=='RUNNING'||this.warnings.length>=CONFIG.spawn.maxPending)return;
    const angle=1.4,x=this.factory.fitSpawnX('normal',this.player.current.x,axisAngle(vec(0,0,1),angle));
    if(x===null)return;
    this.warnings.push({x,type:'normal',angle,fireAt:this.now+1.4});
  }
  private planDrop(delay:number) {
    const level=this.difficulty.level(this.now,this.rows);
    const chosen=this.difficulty.pick(level,this.random),type=this.blockedSince!==null&&this.now-this.blockedSince>=2?'small':chosen;
    const angle=(this.random()<.2?.1:.8+this.random()*.65)*(this.random()<.5?-1:1);
    if(this.mode==='demo'){
      if(this.warnings.length>=CONFIG.spawn.maxPending)return;
      const types:NpcType[]=['normal','small','wide','tall','short','heavy','light'];
      const varied=types[Math.floor(this.random()*types.length)];
      const dropAngle=(this.random()<.2?this.random()*.65:.45+this.random()*2.3)*(this.random()<.5?-1:1);
      const plan=this.continuous.plan(varied,dropAngle,this.now,delay);
      plan.motionSeed=Math.floor(this.random()*0x7fffffff);
      const draw=this.random();plan.form=draw<.55?'whole':DROP_FORMS[1+Math.floor(this.random()*(DROP_FORMS.length-1))];
      plan.living=plan.form==='whole'&&this.random()<.38;
      this.warnings.push(plan);return;
    }
    const plan=this.planner.plan(type,angle,this.player.current,this.now,delay,level,this.warnings.map(w=>w.x));
    if(!plan){this.blockedSince??=this.now;this.spawnBlocked++;}
    else{this.warnings.push(plan);this.warnings.sort((a,b)=>a.fireAt-b.fireAt);this.blockedSince=null;}
  }
  private fixedUpdate() {
    if(this.state!=='RUNNING'&&this.state!=='DYING')return;
    if(this.state==='DYING'){
      if(this.contextLost||document.hidden)return;
      this.physics.snapshot();this.weapons.tickProjectiles(CONFIG.dt);
      const sky=this.sky.update(this.physics,this.player,CONFIG.dt,false);
      for(const point of sky.bombs){this.weapons.detonate(point);this.audio.impact(15,45);}
      for(const cut of [...sky.cuts,...this.weapons.cuts]){this.gore.cut(cut,this.physics);this.audio.cut();}
      this.physics.step();this.culled+=this.physics.cullOutsideArena();this.gore.update(this.physics,CONFIG.dt);this.deathRemaining=Math.max(0,this.deathRemaining-CONFIG.dt);
      if(this.deathRemaining<=1e-8){this.deathRemaining=0;this.finish(this.deathReason);}return;
    }
    this.physics.snapshot();
    const rawInput=this.input.consume();this.weapons.refreshHeadProtection(!!rawInput.saw);
    this.updateChaos();
    if(this.mode==='demo'&&!this.player.damage.alive){this.beginDeath('IMPACT');return;}
    const due=this.detector.due(this.now);
    if(due.length) {
      const playerHit=this.mode==='demo'?playerIntersectsRows(this.player,due):due.some(r=>this.player.current.y>=r&&this.player.current.y<r+1);
      const bloodSources=[...this.physics.parts.values()].filter(p=>p.owner==='npc'&&due.some(r=>{const c=add(p.body.translation(),rotate(massProperties(p.poly).center,p.body.rotation()));return c.y>=r&&c.y<=r+1;})).map(p=>({...p.body.worldCom()}));
      if(this.mode==='demo'&&playerHit){this.player.prepareRowDeath(this.now);this.physics.world.propagateModifiedBodyPositionsToColliders();}
      const result=clearRows(this.physics,due,this.mode==='demo'?'solver':'legacy',this.mode==='demo'&&playerHit,this.player.damage.headImmune?['head']:[]);bloodSources.forEach(p=>this.gore.burst(p,vec(0,1,0),30));this.detector.committed(due,this.now);
      this.scoring.clear(result,this.now,this.difficulty.level(this.now,this.rows),this.mode==='technical'&&playerHit);
      if(this.mode==='demo'&&playerHit&&this.player.resumeAfterCut(this.now)){
        document.querySelector('#hint')!.textContent=`ПОВРЕЖДЕНИЕ · ${this.player.damage.mobility==='CRAWL'?'ног нет — ползи A/D':this.player.damage.mobility==='HOP'?'одна нога — передвигайся A/D':'хромота — A/D'} · голова и корпус целы, игра продолжается`;
      }else if(this.mode==='demo'&&playerHit){
        this.beginDeath('ROW_CLEAR');return;
      }
      if(this.health<=0){this.beginDeath('RESILIENCE');return;}
      document.querySelector('#hint')!.textContent=`Очищено ${due.length} рядов · ${result.removedVolume.toFixed(3)} м³. Конечности и части вне полосы остаются — складывай следующий ряд.`;
    }
    const event=this.scheduler.tick(this.now,this.warnings.length,this.random);
    if(event){this.planDrop(event.delay);if(event.double)this.planDrop(event.delay);}
    // At most two actual allocations per fixed step. Failed geometry/budget waits, never
    // materializes inside another drop; all warnings keep their originally fixed columns.
    let committed=0;
    for(const spec of [...this.warnings])if(this.now+1e-8>=spec.fireAt&&committed<2){
      const budget=this.mode==='demo'?[...this.physics.parts.values()].filter(p=>p.owner==='npc').length+11<=CONFIG.physics.spawnReserve:this.planner.budgetAvailable();
      const parts=budget?this.continuous.spawn(spec,dropOptions(this.factory,spec.type,spec.form??'whole')):null;
      if(parts){this.drops++;if(this.mode==='demo')this.freshDrops.register(parts,this.now,spec.motionSeed??this.drops*7919);if(spec.living)this.living.register(parts,this.now);this.spawnForms[spec.form??'whole']=(this.spawnForms[spec.form??'whole']??0)+1;this.difficulty.committed(spec.type);this.warnings.splice(this.warnings.indexOf(spec),1);committed++;}
      else{spec.fireAt=this.now+.25;this.spawnBlocked++;this.spawnCommitBlocks[budget?'overlap':'budget']++;}
    }
    const input=this.player.controls(rawInput,this.now);this.weapons.update(input,CONFIG.dt);
    if(this.weapons.lastBroken)document.querySelector('#hint')!.textContent=`${WEAPONS[this.weapons.lastBroken]} сломалось! Лови следующую поставку.`;
    this.gore.sawContact(this.saw.contact,CONFIG.dt);
    this.audio.saw(this.saw.active,this.saw.contact!==null);
    for(const cut of this.weapons.cuts){this.gore.cut(cut,this.physics);this.audio.cut();}
    const playerStart=performance.now();this.player.update(input,this.now,CONFIG.dt);this.playerUpdateMs=performance.now()-playerStart;
    if(this.mode==='demo'&&this.survival.impact(this.player.lastImpact,this.now)&&this.survival.health===0){this.beginDeath('IMPACT');return;}
    if(this.player.ragdoll.down){
      this.playerTimings.push(this.playerUpdateMs);if(this.playerTimings.length>240)this.playerTimings.shift();
      const sorted=[...this.playerTimings].sort((a,b)=>a-b);this.playerUpdateP95=sorted[Math.floor(sorted.length*.95)];
    }
    this.living.update(this.now,CONFIG.dt,this.player.current);
    if(this.mode==='demo')this.freshDrops.update(this.now);
    this.physics.step();this.culled+=this.physics.cullOutsideArena();
    if(this.mode==='demo'&&this.player.ragdoll.down&&this.player.ragdoll.parts.some(p=>!this.physics.parts.has(p.id))){this.player.ragdoll.syncDamage();if(!this.player.damage.alive){this.beginDeath('IMPACT');return;}}
    for(const impact of this.physics.impacts.events){this.audio.impact(impact.speed,impact.mass);this.gore.collision(impact);}
    this.gore.update(this.physics,CONFIG.dt);this.now+=CONFIG.dt;this.player.afterStep(this.now);
    this.tutorial.observe({time:this.now,running:this.state==='RUNNING',demo:this.mode==='demo',x:this.player.current.x,
      down:this.player.ragdoll.down,jumped:!this.player.ragdoll.down&&!this.player.grounded&&this.player.jump.vy>0,
      attack:this.weapons.active,warning:this.warnings.length>0,drops:this.drops,armed:this.detector.rows.some(r=>r.state==='ARMED'),rows:this.rows,
      qteActive:this.player.qte.active,qteReady:this.player.qte.ready});
    if(this.physics.numericFaults)throw Error('Численная ошибка физики: сессия остановлена, перезапустите R.');
    if(this.now>=this.nextMeasure){
      this.detector.measure(this.occupancy.rebuild(this.physics.parts.values()),this.now);this.nextMeasure=this.now+.1;
      const trapped=this.squeeze.measure(this.now);if(this.mode==='technical')this.squeeze.assist(this.now);
      if(this.mode==='demo'){
        this.buried=this.squeeze.breathingBlocked();
        const protectedRecovery=this.player.ragdoll.down&&this.player.qte.ready||this.now<this.player.protectedUntil;
        const reason=this.survival.breathe(this.now,this.buried&&!protectedRecovery);if(reason){this.beginDeath(reason);return;}
        const overflow=this.loss.update(this.now,this.health,this.occupancy.criticalColumns(),this.detector.rows.filter(r=>r.state==='ARMED').map(r=>({fireAt:r.fireAt,canRelieve:r.index+1>CONFIG.arena.critical})));
        if(overflow)this.beginDeath(overflow);
        return;
      }
      const relief=this.detector.rows.filter(r=>r.state==='ARMED').map(r=>({fireAt:r.fireAt,canRelieve:r.index+1>CONFIG.arena.critical&&this.occupancy.rows[r.index].mean>0}));
      const reason=this.loss.update(this.now,this.health,this.occupancy.criticalColumns(),relief,trapped.trapped);
      if(reason)this.finish(reason);
    }
  }
  private frame=(timestamp:number)=>{
    this.request=requestAnimationFrame(this.frame);
    const delta=this.lastFrame?Math.min(.1,(timestamp-this.lastFrame)/1000):0;this.lastFrame=timestamp;
    if(this.state==='RUNNING'||this.state==='DYING') {
      this.accumulator+=delta;let steps=0;
      try {while((this.state==='RUNNING'||this.state==='DYING')&&this.accumulator>=CONFIG.dt&&steps<5){
        this.fixedUpdate();
        if(this.state==='RUNNING'||this.state==='DYING')this.accumulator-=CONFIG.dt;steps++;
      }}
      catch(e){this.pauseMenu.close();this.state='ERROR';this.audio.setRunning(false);this.weapons.cancel();this.input.clear();document.querySelector('#error')!.textContent=String(e);document.querySelector<HTMLElement>('#overlay')!.hidden=false;document.querySelector('#start')!.textContent='Сессия остановлена — нажмите R';}
      if(this.accumulator>=CONFIG.dt){this.droppedTime+=this.accumulator;this.accumulator%=CONFIG.dt;}
    }
    this.syncQteUI();this.syncTutorialUI();this.syncSawUI();this.syncChaosUI();
    this.renderer.skyDrops=this.sky.items;
    this.renderer.chaosWarning=this.state==='RUNNING'?this.chaos.current:null;
    if(!this.contextLost)this.renderer.render(this.physics.parts.values(),this.player,this.detector.rows,this.state==='DYING'||this.state==='GAME_OVER'?[]:this.warnings.map(w=>w.x),this.visualTime,this.state==='RUNNING'||this.state==='DYING'?this.accumulator/CONFIG.dt:1,this.saw,this.gore,this.weapons);
    if(timestamp-this.lastHud>200) {
      const sleeping=[...this.physics.parts.values()].filter(p=>p.body.isSleeping()).length;
      document.querySelector('#stats')!.textContent=document.querySelector<HTMLElement>('#app')!.dataset.debug==='true'?`${Math.floor(this.now)} с · ${this.drops} NPC · ${this.physics.parts.size} частей (${sleeping} спят) · ${this.rows} рядов · ${this.scoring.total(this.now)} очков · ×${this.scoring.multiplier(this.now).toFixed(2)} · L${this.difficulty.level(this.now,this.rows)} · ${this.mode==='demo'?`прочность ${this.health}% · воздух ${this.survival.air.toFixed(1)} с`:`стойкость ${this.health}/3`} · ${this.player.state}${this.weapons.enabled?` · ${WEAPONS[this.weapons.selected]} ${this.weapons.unavailable?'— нет руки':this.weapons.active?'атака':'[E / ЛКМ]'}`:''} · физика ${this.physics.stepMs.toFixed(1)} мс · игрок ${this.playerUpdateMs.toFixed(1)} мс${this.scheduler.burst?' · ШКВАЛ':''}`:`${this.scoring.total(this.now)} ОЧКОВ · ${Math.floor(this.now)} с · ${this.rows} РЯДОВ · ×${this.scoring.multiplier(this.now).toFixed(2)}\n${this.mode==='demo'?`ТЕЛО ${this.health}% · ВОЗДУХ ${this.survival.air.toFixed(1)} с`:`СТОЙКОСТЬ ${this.health}/3`} · ${this.drops} СБРОСОВ`;
      document.querySelector<HTMLElement>('#stats')!.dataset.danger=String(this.mode==='demo'&&(this.health<30||this.survival.air<2));
      const messages={ACTIVE:'',RAGDOLL:'УДАР — ragdoll',CRAWLING:'ПРИЖАТ — жми ПРОБЕЛ: заполни круг «ВСТАТЬ» для гарантированного выхода',GETTING_UP:'ПОДНИМАЕТСЯ — ПРОБЕЛ заполняет круг выхода',RECOVERING:'ВОССТАНАВЛИВАЕТСЯ — скорость снижена'};
      const overflow=this.loss.countdown(this.now),pressure=this.squeeze.pressureSeconds(this.now);
      const pressureMessage=pressure>=.8?`ДАВЛЕНИЕ · выход заблокирован ${pressure.toFixed(1)} с`:'';
      document.querySelector('#player-status')!.textContent=this.state==='DYING'?'УПРАВЛЕНИЕ ПОТЕРЯНО':this.state==='GAME_OVER'?'СЕССИЯ ЗАВЕРШЕНА':this.player.qte.active?`${this.player.qte.phase==='INTERRUPTED'?`СБИТ · −${Math.round(this.player.qte.rollback*100)}%`:`ВСТАТЬ ${Math.round(this.player.qte.progress*100)}% · ${this.player.qte.ready?'РАСПРЯМЛЯЕТСЯ':'ДОЛБИ ПРОБЕЛ'}`}${this.buried?` · воздух ${this.survival.air.toFixed(1)} с`:''}`:this.mode==='demo'&&this.buried?`ЗАДЫХАЕТСЯ · воздух ${this.survival.air.toFixed(1)} с · сверху ${Math.round(this.player.ragdoll.gameplayLoadMass)} кг · нужно ~${this.player.qte.requiredPressRate.toFixed(0)} нажатий/с`:overflow!==null?`КАМЕРА ПЕРЕПОЛНЕНА · ${overflow.toFixed(1)} с`:pressureMessage||
        (this.player.underPressure&&!this.player.ragdoll.down?'ПОД ДАВЛЕНИЕМ — движение замедлено':messages[this.player.state]);
      this.lastHud=timestamp;
    }
  };
  debugSnapshot(){return {runDetails:this.runDetails?{...this.runDetails}:null,medicalUsed:this.medicalUsed,visualTime:this.visualTime,chaos:this.chaos.snapshot,sky:this.sky.snapshot,culled:this.culled,deathRemaining:this.deathRemaining,arena:{...CONFIG.arena},seed:this.sessionSeed,tutorial:this.tutorial.snapshot,freshDrops:this.freshDrops.snapshot,living:this.living.snapshot,spawnForms:{...this.spawnForms},environment:this.renderer.shaft?.snapshot??null,character:this.renderer.character?.snapshot??null,state:this.state,time:this.now,parts:this.physics.parts.size,geometry:this.physics.geometryUsage,joints:this.physics.joints.size,rows:this.rows,drops:this.drops,
    player:{...this.player.current},playerState:this.player.state,playerParts:this.player.ragdoll.parts.length,knockdowns:this.player.ragdoll.knockdowns,
    getUpBlocked:this.player.ragdoll.blocked,underPressure:this.player.underPressure,grounded:this.player.grounded,maxSpeed:this.physics.maxSpeed,maxAngularSpeed:this.physics.maxAngularSpeed,
    numericFaults:this.physics.numericFaults,npcSelfContacts:this.physics.npcSelfContactsEnabled,solverSubsteps:this.physics.solverSubsteps,deferredContacts:this.physics.deferredContacts,pairSeparations:this.physics.pairSeparations,separationMs:this.physics.separationMs,droppedTime:this.droppedTime,spawnBlocked:this.spawnBlocked,spawnBlockReasons:{...this.planner.blocked},spawnCommitBlocks:{...this.spawnCommitBlocks},
    struggle:this.player.ragdoll.struggle,playerUpdateP95:this.playerUpdateP95,pendingDrops:this.warnings.length,burst:this.scheduler.burst,playerVisualParts:this.renderer.playerVisualParts,
    loadMass:this.player.ragdoll.loadMass,gameplayLoadMass:this.player.ragdoll.gameplayLoadMass,pressRate:this.player.ragdoll.pressRate,requiredPressRate:this.player.ragdoll.requiredPressRate,mobility:this.player.ragdoll.mobility,
    trauma:this.player.trauma.snapshot,
    damage:this.player.damage.snapshot,poseProgress:this.player.ragdoll.poseProgress,recoveryAssist:{axis:this.player.ragdoll.escapeAxis,impulse:this.player.ragdoll.spaceImpulse+this.player.recoverySpaceImpulse},
    qte:this.player.qte.snapshot,protectedUntil:this.player.protectedUntil,
    contactImpacts:this.physics.impacts.snapshot,contactLoad:this.physics.contactLoad.snapshot,
    saw:this.saw.snapshot,weapons:this.weapons.snapshot,audio:this.audio.snapshot,gore:this.gore.snapshot,npcMass:[...this.physics.parts.values()].filter(p=>p.owner==='npc').reduce((sum,p)=>sum+p.body.mass(),0),
    npcMode:this.npcMode,mode:this.mode,air:this.survival.air,buried:this.buried,impactHits:this.survival.hits,
    score:this.scoring.total(this.now),health:this.health,combo:this.scoring.multiplier(this.now),result:this.result,
    overflow:this.loss.countdown(this.now),squeeze:this.squeeze.snapshot};}
  dispose(){cancelAnimationFrame(this.request);this.pauseMenu.dispose();this.audio.dispose();this.input.dispose();for(const cleanup of this.cleanups)cleanup();this.cleanups=[];this.player.dispose();this.physics.dispose();this.renderer.dispose();}
}
