import * as THREE from 'three';
import { CONFIG, PLAYER_SCALE } from '../core/Config';
import type { ReferenceCharacter } from '../assets/ReferenceCharacter';
import type { IndustrialShaft } from '../assets/IndustrialShaft';
import { PartBatches } from './PartBatches';
import { LowResShadows,shadowFragment } from './LowResShadows';
import { BloodDecals } from './BloodDecals';
import { DEFAULT_RETRO, RESOLUTIONS, validateRetro, type RetroSettings } from './RetroSettings';
import type { Part } from '../physics/PhysicsManager';
import { geometryUsage } from '../slicing/GeometryBudget';
import { legacyUv,validateFaceUvs } from '../slicing/SurfaceAttributes';
import type { ConvexPolyhedron } from '../slicing/ConvexClipper';
import { rotate, vec } from '../slicing/Math';
import type { Row } from '../grid/RowDetector';
import type { PlayerController } from '../player/PlayerController';
import type { SawController } from '../gameplay/SawController';
import type { GoreSystem } from '../gameplay/GoreSystem';
import type { ChaosEvent } from '../gameplay/ChaosDirector';
import type { SkyItem } from '../gameplay/SkyDrops';
import type { WeaponController, WeaponKind } from '../gameplay/WeaponController';
export function geometry(poly:ConvexPolyhedron,blood=true,atlasCaps=false):THREE.BufferGeometry {
  geometryUsage(poly);
  const positions:number[]=[],colors:number[]=[],uvs:number[]=[],cuts:number[]=[];
  for(const f of poly.faces){
    validateFaceUvs(f);
    for(let i=1;i<f.vertices.length-1;i++)for(const index of [0,i,i+1]) {
      const p=f.vertices[index],uv=f.cap&&atlasCaps?{u:.5,v:.03}:f.uvs?.[index]??legacyUv(p);
      positions.push(p.x,p.y,p.z);const color=f.cap&&blood?new THREE.Color('#c31424'):new THREE.Color('white');cuts.push(f.cap&&blood?1:0);colors.push(color.r,color.g,color.b);uvs.push(uv.u,uv.v);
    }
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  g.setAttribute('cut',new THREE.Float32BufferAttribute(cuts,1));
  g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.computeVertexNormals();return g;
}
export const surfaceVertex=`
  varying vec3 vWorldPosition;
  attribute float cut;varying float vCut;
  varying vec3 vNormal; varying vec3 vColor; varying vec2 vUvPerspective; varying vec2 vUvTimesW; varying float vClipW; varying float vDepth;
  uniform vec2 uResolution; uniform float uTime;uniform float uSnapPixels;uniform float uJitterPixels;
  void main(){
    vec4 localPosition=vec4(position,1.0);vec3 localNormal=normal;
    #ifdef USE_INSTANCING
      localPosition=instanceMatrix*localPosition;
      mat3 im=mat3(instanceMatrix);
      localNormal=im*(localNormal/vec3(dot(im[0],im[0]),dot(im[1],im[1]),dot(im[2],im[2])));
    #endif
    vWorldPosition=(modelMatrix*localPosition).xyz;
    vec4 view=modelViewMatrix*localPosition;vec4 clip=projectionMatrix*view;
    vec2 ndc=clip.xy/clip.w;
    vec2 grid=uResolution/max(uSnapPixels,.001);
    vec2 snap=floor(ndc*grid*.5+.5)/(grid*.5);
    clip.xy=mix(ndc,snap,step(.001,uSnapPixels))*clip.w;
    float noise=fract(sin(dot(position,vec3(12.9898,78.233,45.164))+floor(uTime*10.0))*43758.5453)-.5;
    clip.xy+=noise*uJitterPixels*(2.0/uResolution)*clip.w;
    gl_Position=clip;vCut=cut;vNormal=normalize(normalMatrix*localNormal);vColor=color;
    vUvPerspective=uv;vUvTimesW=uv*clip.w;vClipW=clip.w;vDepth=-view.z;
  }
`;
export const surfaceFragment=`
  #include <packing>
  ${shadowFragment}
  varying vec3 vWorldPosition;uniform float uLocalLighting;
  varying vec3 vNormal; varying vec3 vColor; varying vec2 vUvPerspective; varying vec2 vUvTimesW; varying float vClipW; varying float vDepth;
  varying float vCut;
  uniform vec3 uColor;uniform sampler2D uTexture;uniform float uTime;
  uniform float uAffineStrength;uniform float uWobbleTexels;uniform float uLightingLevels;uniform vec2 uTextureSize;uniform vec2 uFogRange;
  void main(){
    vec2 affine=vUvTimesW/max(vClipW,.0001);vec2 uv=mix(vUvPerspective,affine,uAffineStrength);
    uv+=sin(floor(uTime*10.0)+uv.yx*9.0)*(uWobbleTexels/uTextureSize);
    vec3 tex=texture2D(uTexture,uv).rgb;
    if(vCut>.5)tex=vec3(.78);
    float key=max(0.0,dot(normalize(vNormal),normalize(vec3(-.3,.85,.5))));
    float diffuse=.32+key*.68;
    float isCharacter=step(1.5,uLocalLighting);
    vec3 localColor=vec3(1.0);
    if(uLocalLighting>.5){
      float top=1.0-smoothstep(2.0,13.0,length(vWorldPosition-vec3(-1.5,10.8,2.0)));
      float floorPool=1.0-smoothstep(1.0,6.5,length(vWorldPosition-vec3(0.0,1.0,3.0)));
      float blue=1.0-smoothstep(1.0,9.0,length(vWorldPosition-vec3(-4.3,5.0,2.0)));
      diffuse=(.22+key*.60)*(.50+.42*top+.48*floorPool+.16*blue);
      diffuse=mix(diffuse,diffuse*1.65+.10,isCharacter);
      vec3 tint=mix(vec3(.55,.65,.57),vec3(1.0),isCharacter);
      localColor=(vec3(.76,.94,.79)+blue*vec3(.0,.06,.18))*tint;
    }
    float light=mix(diffuse,floor(diffuse*max(1.0,uLightingLevels))/max(1.0,uLightingLevels),step(1.0,uLightingLevels));
    vec3 c=mix(uColor*vColor,vColor,vCut)*tex*light*localColor*retroVisibility(vWorldPosition);
    float fog=smoothstep(uFogRange.x,uFogRange.y,vDepth);c=mix(c,vec3(.025,.04,.035),fog);
    gl_FragColor=vec4(c,1.0);
  }
`;
export const compositeFragment=`
  uniform sampler2D uScene;uniform vec2 uResolution;uniform float uTime;varying vec2 vUv;
  uniform float uIntensity;uniform float uColorLevels;uniform float uDither;uniform float uGrain;uniform float uVignette;uniform float uChromatic;
  float bayer(vec2 p){int x=int(mod(p.x,4.0)),y=int(mod(p.y,4.0));
    int i=x+y*4;float v=0.0;
    if(i==0)v=0.0;else if(i==1)v=8.0;else if(i==2)v=2.0;else if(i==3)v=10.0;
    else if(i==4)v=12.0;else if(i==5)v=4.0;else if(i==6)v=14.0;else if(i==7)v=6.0;
    else if(i==8)v=3.0;else if(i==9)v=11.0;else if(i==10)v=1.0;else if(i==11)v=9.0;
    else if(i==12)v=15.0;else if(i==13)v=7.0;else if(i==14)v=13.0;else v=5.0;return v/16.0-.5;}
  vec3 display(vec3 c){return mix(12.92*c,1.055*pow(max(c,vec3(0.0)),vec3(1.0/2.4))-.055,step(vec3(.0031308),c));}
  void main(){vec2 pixel=floor(vUv*uResolution),uv=(pixel+.5)/uResolution;
    vec3 c=texture2D(uScene,uv).rgb;
    c.r=texture2D(uScene,uv+vec2(uChromatic*uIntensity/uResolution.x,0.0)).r;
    c.b=texture2D(uScene,uv-vec2(uChromatic*uIntensity/uResolution.x,0.0)).b;
    c=display(c);float levels=max(2.0,uColorLevels)-1.0;
    vec3 quantized=c+bayer(pixel)/levels*uDither*uIntensity;
    quantized=floor(clamp(quantized,0.0,1.0)*levels+.5)/levels;c=mix(c,quantized,uIntensity);
    float grain=fract(sin(dot(pixel,vec2(12.9898,78.233))+floor(uTime*15.0))*43758.5453)-.5;
    c+=grain*uGrain*uIntensity;c*=1.0-uVignette*uIntensity*pow(length((vUv-.5)*1.4),2.0);gl_FragColor=vec4(c,1.0);
  }
`;
export class RetroRenderer {
  cameraShake=0;skyDrops:SkyItem[]=[];chaosWarning:ChaosEvent|null=null;
  private hazardLane:THREE.Mesh;
  private skyVisuals=new Map<number,THREE.Group>();
  batches=new PartBatches();
  shadows=new LowResShadows();
  renderStats={sceneCalls:0,sceneTriangles:0,shadowCalls:0,shadowTriangles:0,totalCalls:0,submissionMs:0,shadowSubmissionMs:0};
  renderer:THREE.WebGLRenderer;scene=new THREE.Scene();camera=new THREE.OrthographicCamera();
  settings:RetroSettings={...DEFAULT_RETRO};
  retro=true;target=new THREE.WebGLRenderTarget(320,240,{minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter,generateMipmaps:false});
  private screen=new THREE.Scene();private screenCamera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
  private composite:THREE.ShaderMaterial;private meshes=new Map<number,THREE.Mesh>();private materialPairs=new Map<string,[THREE.Material,THREE.ShaderMaterial]>();
  private bands:THREE.Mesh[]=[];private marker:THREE.Mesh;private markers:THREE.Mesh[]=[];private player:THREE.Group;private texture:THREE.DataTexture;
  private playerMeshes=new Map<string,THREE.Mesh>();
  private scratchPosition=new THREE.Vector3();private scratchRotation=new THREE.Quaternion();
  private playerDead=false;
  private sawVisual=new THREE.Group();private sawTeeth:THREE.Mesh[]=[];
  private weaponVisuals=new Map<WeaponKind,THREE.Group>();private grenadeVisuals:THREE.Mesh[]=[];private blastVisuals:THREE.Mesh[]=[];
  private sawProgress:THREE.Mesh;
  private bodyDecals=new BloodDecals();
  private bloodDrops:THREE.InstancedMesh;private bloodStains:THREE.InstancedMesh;
  private stainFresh=new THREE.Color('#8f0916');private stainDry=new THREE.Color('#321015');private stainColor=new THREE.Color();
  private effectPose=new THREE.Object3D();private seenGore:GoreSystem|null=null;
  private environmentMaterials:Array<{mesh:THREE.Mesh;pair:[THREE.Material,THREE.ShaderMaterial]}>=[];
  private rowLamps:THREE.Mesh[]=[];
  constructor(private canvas:HTMLCanvasElement,readonly character:ReferenceCharacter|null=null,readonly shaft:IndustrialShaft|null=null) {
    this.scene.add(this.batches.group);
    this.renderer=new THREE.WebGLRenderer({canvas,antialias:false});this.renderer.setPixelRatio(1);
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.scene.background=new THREE.Color(this.shaft?'#080e0c':'#16201f');
    this.scene.add(new THREE.HemisphereLight(this.shaft?'#8ea997':'#d3ddda',this.shaft?'#101c18':'#37423e',this.shaft?.85:2));
    const key=new THREE.DirectionalLight(this.shaft?'#acc7a4':'#dbe3da',this.shaft?1.4:2.4);key.position.set(-3,10,7);this.scene.add(key);
    const bytes=new Uint8Array(64*64*4);for(let y=0;y<64;y++)for(let x=0;x<64;x++) {
      const noise=((x*73+y*37+(x*y)%31)%25)/100;const v=Math.floor((.62+noise)*255),i=(y*64+x)*4;
      bytes[i]=v;bytes[i+1]=v;bytes[i+2]=v;bytes[i+3]=255;
    }this.texture=new THREE.DataTexture(bytes,64,64);this.texture.needsUpdate=true;this.texture.wrapS=this.texture.wrapT=THREE.RepeatWrapping;
    this.texture.minFilter=this.texture.magFilter=THREE.NearestFilter;
    this.composite=new THREE.ShaderMaterial({uniforms:{uScene:{value:this.target.texture},uResolution:{value:new THREE.Vector2(426,240)},uTime:{value:0},uIntensity:{value:.75},uColorLevels:{value:24},uDither:{value:.6},uGrain:{value:.015},uVignette:{value:.25},uChromatic:{value:.15}},
      vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}',fragmentShader:compositeFragment,depthTest:false,depthWrite:false});
    this.screen.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),this.composite));
    const wallMat=new THREE.MeshLambertMaterial({color:'#53605d'}),edgeMat=new THREE.MeshLambertMaterial({color:'#7a8580'});
    const addBox=(x:number,y:number,z:number,w:number,h:number,d:number,material:THREE.Material)=>{
      const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);mesh.castShadow=material instanceof THREE.MeshLambertMaterial;mesh.position.set(x,y,z);this.scene.add(mesh);return mesh;};
    this.shadows.attach(wallMat);this.shadows.attach(edgeMat);
    if(this.shaft)this.buildShaft();
    else{
    addBox(0,-.175,0,9.7,.35,3.1,wallMat);addBox(0,CONFIG.arena.height/2,-1.39,9,CONFIG.arena.height,.35,wallMat);
    for(const sign of [-1,1])addBox(sign*4.675,CONFIG.arena.height/2,0,.35,CONFIG.arena.height,2.4,edgeMat);
    const lineMat=new THREE.LineBasicMaterial({color:'#85958d',transparent:true,opacity:.35});
    const lines:number[]=[];for(let y=0;y<=CONFIG.arena.height;y++)lines.push(-4.5,y,-1.205,4.5,y,-1.205);
    for(let x=-4.5;x<=4.5;x++)lines.push(x,0,-1.205,x,CONFIG.arena.height,-1.205);
    const lineGeo=new THREE.BufferGeometry();lineGeo.setAttribute('position',new THREE.Float32BufferAttribute(lines,3));this.scene.add(new THREE.LineSegments(lineGeo,lineMat));
    }
    // Material placeholders are not retained when the Blender shaft replaces them.
    if(this.shaft){wallMat.dispose();edgeMat.dispose();}
    addBox(0,CONFIG.arena.critical,1.21,9,.025,.01,new THREE.MeshBasicMaterial({color:'#c78953'}));
    for(let row=0;row<CONFIG.rows.count;row++){
      const band=new THREE.Mesh(new THREE.PlaneGeometry(9,1),new THREE.MeshBasicMaterial({color:'#b95543',transparent:true,opacity:.22,depthWrite:false}));
      band.position.set(0,row+.5,1.24);band.visible=false;this.scene.add(band);this.bands.push(band);
    }
    this.marker=new THREE.Mesh(new THREE.ConeGeometry(.18,.35,3),new THREE.MeshBasicMaterial({color:'#e4a070'}));this.marker.rotation.z=Math.PI;this.marker.position.set(0,CONFIG.arena.height-.35,0);this.marker.visible=false;this.scene.add(this.marker);this.markers.push(this.marker);
    for(let i=1;i<CONFIG.spawn.maxPending;i++){const marker=this.marker.clone();this.scene.add(marker);this.markers.push(marker);}
    this.player=new THREE.Group();this.scene.add(this.player);
    this.bloodDrops=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,0),new THREE.MeshBasicMaterial({color:'#be091e'}),CONFIG.gore.maxDrops);
    this.bloodStains=new THREE.InstancedMesh(new THREE.CircleGeometry(1,9),new THREE.MeshBasicMaterial({color:'white',side:THREE.DoubleSide,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2}),CONFIG.gore.maxStains);
    for(const effect of [this.bloodDrops,this.bloodStains]){effect.count=0;effect.frustumCulled=false;effect.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.scene.add(effect);}
    this.scene.add(this.bodyDecals.group);
    const sawBox=(x:number,w:number,h:number,d:number,color:string)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshLambertMaterial({color}));mesh.position.x=x;this.sawVisual.add(mesh);};
    sawBox(-.08,.3,.23,.18,'#dd8426');sawBox(.47,.96,.095,.065,'#b5bdbe');sawBox(-.23,.12,.3,.07,'#292d2c');
    const toothGeo=new THREE.ConeGeometry(.035,.075,3),toothMat=new THREE.MeshBasicMaterial({color:'#343838'});
    for(let i=0;i<24;i++){const tooth=new THREE.Mesh(toothGeo,toothMat);this.sawVisual.add(tooth);this.sawTeeth.push(tooth);}
    this.sawVisual.scale.setScalar(PLAYER_SCALE);this.sawVisual.visible=false;this.scene.add(this.sawVisual);
    this.sawProgress=new THREE.Mesh(new THREE.RingGeometry(.08,.12,20,1,0,Math.PI*2),new THREE.MeshBasicMaterial({color:'#f2aa39',side:THREE.DoubleSide,depthTest:false,depthWrite:false}));
    this.sawProgress.name='SawCutProgress';
    this.sawProgress.visible=false;this.sawProgress.renderOrder=10;this.scene.add(this.sawProgress);
    this.buildWeapons();this.buildArenaMask();
    this.hazardLane=new THREE.Mesh(new THREE.PlaneGeometry(1.7,CONFIG.arena.height),new THREE.MeshBasicMaterial({color:'#ff603b',transparent:true,opacity:.13,depthTest:false,depthWrite:false}));
    this.hazardLane.name='ChaosHazardLane';this.hazardLane.position.set(0,CONFIG.arena.height/2,1.5);this.hazardLane.renderOrder=20;this.hazardLane.visible=false;this.scene.add(this.hazardLane);
    // Allocate the same 11-part player visual for upright and dynamic states on first render.
    this.resize();this.configure({});window.addEventListener('resize',this.resize);
  }
  private buildShaft(){
    this.shaft!.scene.scale.y=CONFIG.arena.height/11;
    this.scene.add(this.shaft!.scene);
    this.shaft!.scene.traverse(o=>{if(o instanceof THREE.Mesh){
      const original=Array.isArray(o.material)?o.material[0]:o.material,map=(original as THREE.MeshStandardMaterial).map!;
      o.geometry.userData.assetOwned=true;
      const count=o.geometry.getAttribute('position').count;
      o.geometry.setAttribute('color',new THREE.Float32BufferAttribute(new Array(count*3).fill(1),3));o.geometry.setAttribute('cut',new THREE.Float32BufferAttribute(new Array(count).fill(0),1));
      const plain=new THREE.MeshLambertMaterial({map,flatShading:true}),retro=new THREE.ShaderMaterial({vertexShader:surfaceVertex,fragmentShader:surfaceFragment,vertexColors:true,uniforms:{
        uResolution:{value:new THREE.Vector2(320,240)},uTime:{value:0},uColor:{value:new THREE.Color('white')},uTexture:{value:map},uTextureSize:{value:new THREE.Vector2(128,128)},
        uSnapPixels:{value:0},uJitterPixels:{value:0},uAffineStrength:{value:0},uWobbleTexels:{value:0},uLightingLevels:{value:8},uFogRange:{value:new THREE.Vector2(17,30)},uLocalLighting:{value:1}
      }});
      this.shadows.attach(plain);Object.assign(retro.uniforms,this.shadows.uniforms);o.castShadow=true;
      this.environmentMaterials.push({mesh:o,pair:[plain,retro]});o.material=retro;
    }});
    const cool=new THREE.PointLight('#487b8a',16,12,2);cool.position.set(-4,4,2);this.scene.add(cool);
    const pool=new THREE.PointLight('#aab987',24,10,2);pool.position.set(0,2,3);this.scene.add(pool);
    const lampGeo=new THREE.BoxGeometry(.09,.23,.06),lampMat=new THREE.MeshBasicMaterial({color:'#b7bb82'});
    for(const side of [-1,1])for(const y of [2.6,6.4,10.2]){const lamp=new THREE.Mesh(lampGeo,lampMat);lamp.position.set(side*4.37,y,1.14);this.scene.add(lamp);}
    const rowGeo=new THREE.BoxGeometry(.095,.15,.065);
    for(let i=0;i<CONFIG.rows.count;i++)for(const side of [-1,1]){const lamp=new THREE.Mesh(rowGeo,new THREE.MeshBasicMaterial({color:'#463c24'}));lamp.name=`RowLamp-${i}-${side}`;lamp.position.set(side*4.47,i+.5,1.255);lamp.userData.row=i;this.rowLamps.push(lamp);this.scene.add(lamp);}
  }
  private buildWeapons(){
    const box=(group:THREE.Group,x:number,y:number,w:number,h:number,d:number,color:string)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshLambertMaterial({color}));mesh.position.set(x,y,0);group.add(mesh);return mesh;};
    for(const kind of ['axe','sword','launcher','svarl','rotor','svarlHead'] as const){
      const g=new THREE.Group();g.name=`Weapon-${kind}`;g.visible=false;this.scene.add(g);this.weaponVisuals.set(kind,g);
      if(kind==='axe'){box(g,.65,0,1.6,.1,.1,'#835338');box(g,1.4,.05,.35,.8,.16,'#b8c4ca');box(g,1.65,.1,.2,.65,.07,'#e1e9ec');}
      if(kind==='sword'){box(g,1.45,0,2.4,.13,.075,'#d4e1e4');box(g,.2,0,.5,.11,.1,'#493930');box(g,.5,0,.12,.6,.12,'#b69b54');}
      if(kind==='launcher'){box(g,.7,0,1.6,.35,.38,'#3c5841');box(g,.1,-.24,.16,.35,.12,'#3b3430');box(g,1.45,0,.13,.45,.45,'#1e2623');box(g,.7,.22,.35,.1,.08,'#9aaf79');}
      if(kind==='rotor'){
        box(g,0,0,.16,.35,.16,'#665a36');
        for(const angle of [0,Math.PI/2]){const blade=box(g,0,.18,3.2,.055,.18,'#87958b');blade.rotation.y=angle;blade.castShadow=true;}
      }
      if(kind==='svarlHead'){
        const skull=new THREE.Mesh(new THREE.SphereGeometry(.7,8,6),new THREE.MeshLambertMaterial({color:'#62704b'}));skull.scale.set(1.2,1.05,.8);g.add(skull);skull.castShadow=true;
        const mouth=box(g,0,-.12,1.05,.6,.08,'#090b08');mouth.position.z=.59;
        for(const side of [-1,1])for(let i=0;i<8;i++){const tooth=new THREE.Mesh(new THREE.ConeGeometry(.055,.24,3),new THREE.MeshLambertMaterial({color:'#c1b18b'}));tooth.position.set(-.48+i*.14,side*.17,.64);tooth.rotation.z=side>0?Math.PI:0;g.add(tooth);}
      }
      if(kind==='svarl'){
        g.scale.setScalar(1.8);
        const mouth=new THREE.Mesh(new THREE.SphereGeometry(.33,10,6),new THREE.MeshLambertMaterial({color:'#611629'}));mouth.scale.set(1.45,1,.7);mouth.position.x=.5;g.add(mouth);
        const opening=box(g,.65,0,.6,.36,.015,'#090407');opening.position.z=.27;
        for(const side of [-1,1])for(let i=0;i<6;i++){const tooth=new THREE.Mesh(new THREE.ConeGeometry(.045,.15,3),new THREE.MeshLambertMaterial({color:'#eddbb5'}));tooth.position.set(.4+i*.09,side*.14,.31);tooth.rotation.z=side>0?Math.PI:0;g.add(tooth);}
      }
    }
    const grenadeGeo=new THREE.SphereGeometry(.12,6,4),grenadeMat=new THREE.MeshBasicMaterial({color:'#c5a344'}),blastGeo=new THREE.SphereGeometry(1,12,8);
    for(let i=0;i<8;i++){
      const grenade=new THREE.Mesh(grenadeGeo,grenadeMat),blast=new THREE.Mesh(blastGeo,new THREE.MeshBasicMaterial({color:'#ffb548',transparent:true,opacity:.5,depthWrite:false,wireframe:true}));
      grenade.visible=blast.visible=false;this.scene.add(grenade,blast);this.grenadeVisuals.push(grenade);this.blastVisuals.push(blast);
    }
  }
  /** Opaque foreground shutters hide ALL effects/geometry outside the cup. */
  private buildArenaMask(){
    const material=new THREE.MeshBasicMaterial({color:'#080e0c',depthTest:false,depthWrite:false});
    const width=CONFIG.arena.width/2+CONFIG.arena.wall,height=CONFIG.arena.height;
    const panel=(x:number,y:number,w:number,h:number)=>{const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h),material);mesh.position.set(x,y,3);mesh.renderOrder=1000;mesh.frustumCulled=false;this.scene.add(mesh);};
    panel(-width-30,height/2,60,100);panel(width+30,height/2,60,100);
    panel(0,-.35-30,100,60);panel(0,height+30,100,60);
  }
  private renderSky(){
    const live=new Set(this.skyDrops.map(i=>i.id));
    for(const [id,visual]of this.skyVisuals)if(!live.has(id)){this.scene.remove(visual);visual.traverse(o=>{if(o instanceof THREE.Mesh&&o.userData.skyOwned){o.geometry.dispose();(o.material as THREE.Material).dispose();}});this.skyVisuals.delete(id);}
    for(const item of this.skyDrops){
      let g=this.skyVisuals.get(item.id);
      if(!g){
        g=new THREE.Group();g.name=`Sky-${item.kind}-${item.id}`;
        const mesh=(geometry:THREE.BufferGeometry,color:string)=>{const m=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color}));m.userData.skyOwned=true;g!.add(m);return m;};
        if(item.kind==='weapon'||item.kind==='medkit'){
          mesh(new THREE.BoxGeometry(.85,.6,.5),item.kind==='medkit'?'#d9e1d5':'#3c906b');
          if(item.kind==='medkit'){
            const h=mesh(new THREE.BoxGeometry(.5,.12,.03),'#df4539'),v=mesh(new THREE.BoxGeometry(.12,.44,.03),'#df4539');h.position.z=v.position.z=.28;
          }
          const source=item.kind==='medkit'?null:item.weapon==='saw'?this.sawVisual:this.weaponVisuals.get(item.weapon!);
          if(source){const weapon=source.clone(true);weapon.visible=true;weapon.scale.setScalar(.38);weapon.position.set(-.28,0,.4);g.add(weapon);}
          const ring=mesh(new THREE.RingGeometry(.55,.62,16),item.kind==='medkit'?'#fff0cf':'#a6ffc4');ring.position.z=.5;ring.name='SupplyHalo';ring.material.depthTest=false;ring.material.depthWrite=false;ring.renderOrder=30;
        }else if(item.kind==='saw'){
          const disk=mesh(new THREE.CylinderGeometry(.48,.48,.12,16),'#c5d2d4');disk.rotation.x=Math.PI/2;
          for(let i=0;i<12;i++){const tooth=mesh(new THREE.ConeGeometry(.08,.2,3),'#faf3cc');const a=i/12*Math.PI*2;tooth.position.set(Math.sin(a)*.49,Math.cos(a)*.49,0);tooth.rotation.z=-a;}
          mesh(new THREE.SphereGeometry(.1,6,4),'#a23b2e').position.z=.12;
        }else if(item.kind==='bomb'){
          mesh(new THREE.SphereGeometry(.32,8,6),'#272c2c');const fuse=mesh(new THREE.BoxGeometry(.08,.23,.08),'#ffb645');fuse.position.y=.36;
        }else{mesh(new THREE.BoxGeometry(.85,.7,.55),'#927652');const stripe=mesh(new THREE.BoxGeometry(.9,.1,.57),'#e6c36c');stripe.rotation.z=.6;}
        this.scene.add(g);this.skyVisuals.set(item.id,g);
      }
      g.position.set(item.position.x,item.position.y,.35);g.rotation.z=item.kind==='weapon'||item.kind==='medkit'?Math.sin(item.spin)*.12:item.spin;
      const halo=g.getObjectByName('SupplyHalo');if(halo)halo.scale.setScalar(1+.1*Math.sin(item.spin*3));
    }
  }
  configure(input:Partial<RetroSettings>){
    this.settings=validateRetro(input,this.settings);this.shadows.configure(this.settings.shadowSize);const [width,height]=RESOLUTIONS[this.settings.resolution];
    if(this.target.width!==width||this.target.height!==height)this.target.setSize(width,height);
    const u=this.composite.uniforms,s=this.settings;u.uResolution.value.set(width,height);u.uIntensity.value=s.intensity;u.uColorLevels.value=s.colorLevels;
    u.uDither.value=s.dither;u.uGrain.value=s.grain;u.uVignette.value=s.vignette;u.uChromatic.value=s.chromatic;
    for(const [,material]of this.materialPairs.values())this.surfaceSettings(material);
    this.resize();
  }
  private surfaceSettings(material:THREE.ShaderMaterial){
    const s=this.settings,[w,h]=RESOLUTIONS[s.resolution],u=material.uniforms;
    u.uResolution.value.set(w,h);u.uSnapPixels.value=s.snap*s.intensity;u.uJitterPixels.value=s.jitter*s.intensity;
    u.uAffineStrength.value=s.affine*s.intensity;u.uWobbleTexels.value=s.wobble*s.intensity;
    u.uLightingLevels.value=s.intensity===0?0:Math.round(16+(s.lightingLevels-16)*s.intensity);
  }
  private materials(limb:string,npcId:number,owner:Part['owner']='npc'):[THREE.Material,THREE.ShaderMaterial] {
    const character=this.character?.modelFor(npcId,owner);
    const color=this.character?(owner==='player'?'#ffffff':npcId%3===0?'#a7b2a9':npcId%3===1?'#b5c5c6':'#b8b4a1'):owner==='player'?(limb==='head'?'#a7a783':limb.includes('thigh')||limb.includes('shin')?'#425c64':'#d2d1ac'):
      limb==='head'?'#a5ae91':limb.includes('thigh')||limb.includes('shin')?'#58626a':['#6e8790','#8a8979','#63847b'][npcId%3];
    const key=`${character?.name??'greybox'}:${color}`;
    if(!this.materialPairs.has(key))this.materialPairs.set(key,[new THREE.MeshLambertMaterial({color,map:character?.texture??null,vertexColors:true,flatShading:true}),new THREE.ShaderMaterial({
      vertexShader:surfaceVertex,fragmentShader:surfaceFragment,vertexColors:true,uniforms:{uResolution:{value:new THREE.Vector2(426,240)},uTime:{value:0},uLocalLighting:{value:this.shaft?2:0},uColor:{value:new THREE.Color(color)},uTexture:{value:character?.texture??this.texture},
      uSnapPixels:{value:.75},uJitterPixels:{value:.12},uAffineStrength:{value:.6},uWobbleTexels:{value:.12},uTextureSize:{value:new THREE.Vector2(this.character?128:64,this.character?128:64)},uLightingLevels:{value:8},uFogRange:{value:new THREE.Vector2(17,28)}}})]);
    const pair=this.materialPairs.get(key)!;
    Object.assign(pair[1].uniforms,this.shadows.uniforms);this.shadows.attach(pair[0] as THREE.MeshLambertMaterial);return pair;
  }
  resize=()=> {
    const rect=this.canvas.parentElement!.getBoundingClientRect();const aspect=this.target.width/this.target.height;
    let width=rect.width,height=width/aspect;if(height>rect.height){height=rect.height;width=height*aspect;}
    this.renderer.setSize(Math.floor(width),Math.floor(height));
    const h=CONFIG.arena.height+2.2;this.camera.left=-h*aspect/2;this.camera.right=h*aspect/2;this.camera.top=h/2;this.camera.bottom=-h/2;
    this.camera.position.set(0,CONFIG.arena.height/2,18);this.camera.lookAt(0,CONFIG.arena.height/2,0);this.camera.near=.1;this.camera.far=60;this.camera.updateProjectionMatrix();
  };
  worldPoint(clientX:number,clientY:number){
    const r=this.canvas.getBoundingClientRect(),p=new THREE.Vector3((clientX-r.left)/r.width*2-1,1-(clientY-r.top)/r.height*2,0).unproject(this.camera);
    const direction=new THREE.Vector3(0,0,-1).applyQuaternion(this.camera.quaternion);
    p.addScaledVector(direction,-p.z/direction.z);return vec(p.x,p.y,0);
  }
  render(parts:Iterable<Part>,player:PlayerController,rows:Row[],warningX:number[]|number|null,now:number,alpha:number,saw?:SawController,gore?:GoreSystem,weapons?:WeaponController) {
    this.camera.position.x=Math.sin(now*27)*this.cameraShake;this.camera.position.y=CONFIG.arena.height/2+Math.cos(now*31)*this.cameraShake;
    this.hazardLane.visible=this.chaosWarning?.kind==='bomb'&&!this.chaosWarning.started;
    if(this.hazardLane.visible){this.hazardLane.position.x=this.chaosWarning!.x;(this.hazardLane.material as THREE.MeshBasicMaterial).opacity=.1+.08*(.5+.5*Math.sin(now*10));}
    this.renderSky();this.batches.begin();
    const renderStart=performance.now();
    const blood=gore?.mode!=='off',visibleParts=new Map<number,Part>();
    const alive=new Set<number>();for(const p of parts){if(p.owner==='player'&&!player.ragdoll.dead&&player.ragdoll.parts.some(part=>part.id===p.id))continue;alive.add(p.id);visibleParts.set(p.id,p);let mesh=this.meshes.get(p.id);
      const surface=()=>this.character&&p.renderScale?this.character.modelFor(p.npcId,p.owner).surface(p.limb,p.renderScale,p.poly):p.poly;
      if(!mesh){mesh=new THREE.Mesh(geometry(surface()??{faces:[]},blood,!!this.character),this.materials(p.limb,p.npcId,p.owner)[0]);mesh.userData.poly=p.poly;mesh.userData.blood=blood;mesh.castShadow=true;this.meshes.set(p.id,mesh);this.scene.add(mesh);}
      if(mesh.userData.poly!==p.poly||mesh.userData.blood!==blood){mesh.geometry.dispose();mesh.geometry=geometry(surface()??{faces:[]},blood,!!this.character);mesh.userData.poly=p.poly;mesh.userData.blood=blood;}
      const materials=this.materials(p.limb,p.npcId,p.owner);mesh.material=materials[this.retro?1:0];
      mesh.position.set(p.previous.position.x,p.previous.position.y,p.previous.position.z).lerp(this.scratchPosition.set(p.current.position.x,p.current.position.y,p.current.position.z),alpha);
      mesh.quaternion.set(p.previous.rotation.x,p.previous.rotation.y,p.previous.rotation.z,p.previous.rotation.w).slerp(this.scratchRotation.set(p.current.rotation.x,p.current.rotation.y,p.current.rotation.z,p.current.rotation.w),alpha);
    }
    for(const [id,mesh]of this.meshes)if(!alive.has(id)){this.scene.remove(mesh);mesh.geometry.dispose();this.meshes.delete(id);}
    this.bodyDecals.update(gore?.stains??[],visibleParts,this.meshes,blood);
    this.renderPlayer(player,now,alpha);this.renderEffects(saw,gore,now,weapons);
    if(weapons?.selected==='svarlHead'&&weapons.enabled&&!weapons.unavailable){const head=this.playerMeshes.get('head');if(head)head.visible=false;}
    for(const [,material]of this.materialPairs.values()){this.surfaceSettings(material);material.uniforms.uTime.value=now;}
    for(const {mesh,pair}of this.environmentMaterials){mesh.material=pair[this.retro?1:0];this.surfaceSettings(pair[1]);pair[1].uniforms.uTime.value=now;pair[1].uniforms.uJitterPixels.value=0;}
    for(const lamp of this.rowLamps){const active=rows[lamp.userData.row]?.state==='ARMED';(lamp.material as THREE.MeshBasicMaterial).color.set(active?(Math.sin(now*12)>0?'#d26739':'#8a3828'):'#463c24');}
    for(const row of rows){this.bands[row.index].visible=row.state==='ARMED';if(row.state==='ARMED')(this.bands[row.index].material as THREE.MeshBasicMaterial).opacity=.18+.06*Math.sin(now*12);}
    const warnings=Array.isArray(warningX)?warningX:warningX===null?[]:[warningX];
    this.markers.forEach((marker,i)=>{marker.visible=i<warnings.length;if(marker.visible)marker.position.x=warnings[i];});
    this.scene.updateMatrixWorld(true);
    const batchSources=[...this.meshes.values(),...(!player.ragdoll.dead?[...this.playerMeshes.values()].filter(mesh=>mesh.visible):[])];
    this.batches.sync(batchSources);
    this.shadows.render(this.renderer,this.scene);
    if(this.retro){this.renderer.outputColorSpace=THREE.LinearSRGBColorSpace;this.renderer.setRenderTarget(this.target);this.renderer.render(this.scene,this.camera);
      this.renderStats.sceneCalls=this.renderer.info.render.calls;this.renderStats.sceneTriangles=this.renderer.info.render.triangles;
      this.renderer.setRenderTarget(null);this.composite.uniforms.uTime.value=now;this.renderer.render(this.screen,this.screenCamera);
    }else{this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.setRenderTarget(null);this.renderer.render(this.scene,this.camera);this.renderStats.sceneCalls=this.renderer.info.render.calls;this.renderStats.sceneTriangles=this.renderer.info.render.triangles;}
    this.renderStats.shadowCalls=this.shadows.drawCalls;this.renderStats.shadowTriangles=this.shadows.triangles;this.renderStats.totalCalls=this.renderStats.sceneCalls+this.shadows.drawCalls+(this.retro?1:0);
    this.renderStats.shadowSubmissionMs=this.shadows.submissionMs;this.renderStats.submissionMs=performance.now()-renderStart;
  }
  private renderEffects(saw:SawController|undefined,gore:GoreSystem|undefined,now:number,weapons?:WeaponController){
    this.sawVisual.visible=!!saw?.enabled&&!this.playerDead&&(!weapons||weapons.selected==='saw')&&!weapons?.unavailable;
    for(const [kind,g]of this.weaponVisuals){
      g.visible=!!weapons&&weapons.selected===kind&&weapons.enabled&&!weapons.unavailable&&!this.playerDead;
      if(g.visible&&weapons){
        if(kind==='rotor'||kind==='svarlHead'){
          const head=this.playerMeshes.get('head');
          if(head){g.position.copy(head.position);g.position.y+=kind==='rotor'?.25:0;g.position.z+=.1;g.quaternion.copy(head.quaternion);}
          if(kind==='rotor')g.rotation.y=weapons.rotorAngle;
          else{const open=weapons.active?1+Math.sin(now*22)*.08:1;g.scale.set(1,open,1);}
          continue;
        }
        const pose=weapons.pose(),melee=kind==='axe'||kind==='sword',thrust=melee&&weapons.attackMode==='thrust',extension=thrust?Math.sin(weapons.swing*Math.PI)*.35:0;
        g.position.set(pose.base.x+pose.direction.x*extension,pose.base.y+pose.direction.y*extension,.22);
        g.rotation.z=pose.angle+(melee&&!thrust?Math.sin(weapons.swing*Math.PI)*1.1:0);
        if(kind==='svarl')g.scale.set(1.8,1.8*(weapons.active?1+Math.sin(now*25)*.25:1),1.8);
      }
    }
    this.grenadeVisuals.forEach((mesh,i)=>{const g=weapons?.grenades[i];mesh.visible=!!g;if(g)mesh.position.set(g.position.x,g.position.y,g.position.z+.15);});
    this.blastVisuals.forEach((mesh,i)=>{const b=weapons?.blasts[i];mesh.visible=!!b;if(b){mesh.position.set(b.position.x,b.position.y,b.position.z);mesh.scale.setScalar(2.2*(1-b.life/.35));(mesh.material as THREE.MeshBasicMaterial).opacity=b.life/.35*.7;}});
    const cutPoint=saw?.cuttingPoint;
    this.sawProgress.visible=!!(saw?.active&&saw.progress>0&&cutPoint);
    if(cutPoint&&saw){this.sawProgress.position.set(cutPoint.x,cutPoint.y,cutPoint.z+.45);this.sawProgress.scale.setScalar(.6+.8*saw.progress);}
    if(this.sawVisual.visible&&saw){
      const pose=saw.pose();this.sawVisual.position.set(pose.base.x,pose.base.y,pose.base.z+.1);this.sawVisual.rotation.z=pose.angle;
      this.sawTeeth.forEach((tooth,i)=>{const t=((i/24+(saw.active?now*2:0))%1)*2,top=t<1;
        tooth.position.set(.02+(top?t:2-t)*.94,top?.075:-.075,0);tooth.rotation.z=top?0:Math.PI;});
    }
    if(!gore){this.bloodDrops.count=this.bloodStains.count=0;return;}
    if(this.seenGore!==gore){this.seenGore=gore;this.bloodDrops.count=this.bloodStains.count=0;}
    this.bloodDrops.count=gore.drops.length;
    gore.drops.forEach((drop,i)=>{this.effectPose.position.set(drop.position.x,drop.position.y,drop.position.z);this.effectPose.quaternion.identity();this.effectPose.scale.setScalar(drop.size);this.effectPose.updateMatrix();this.bloodDrops.setMatrixAt(i,this.effectPose.matrix);});
    const stains=gore.stains.filter(s=>s.partId===undefined);
    this.bloodStains.count=stains.length;
    stains.forEach((stain,i)=>{this.effectPose.position.set(stain.position.x,stain.position.y,stain.position.z);this.effectPose.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),new THREE.Vector3(stain.normal.x,stain.normal.y,stain.normal.z));this.effectPose.rotateZ(stain.angle);this.effectPose.scale.set(stain.size,stain.size*.65,1);this.effectPose.updateMatrix();this.bloodStains.setMatrixAt(i,this.effectPose.matrix);this.stainColor.copy(this.stainFresh).lerp(this.stainDry,Math.min(1,stain.age/30));this.bloodStains.setColorAt(i,this.stainColor);});
    this.bloodDrops.instanceMatrix.needsUpdate=true;this.bloodStains.instanceMatrix.needsUpdate=true;if(this.bloodStains.instanceColor)this.bloodStains.instanceColor.needsUpdate=true;
  }
  private renderPlayer(controller:PlayerController,now:number,alpha:number){
    this.playerDead=controller.ragdoll.dead;
    this.player.visible=!controller.ragdoll.dead;
    if(controller.ragdoll.dead)return;
    const down=controller.ragdoll.down;
    const x=controller.previous.x+(controller.current.x-controller.previous.x)*alpha,y=controller.previous.y+(controller.current.y-controller.previous.y)*alpha;
    const stride=Math.sin(now*11)*Math.min(1,Math.abs(controller.vx)/CONFIG.player.speed)*.4;
    for(const template of controller.ragdoll.standingParts){
      let mesh=this.playerMeshes.get(template.name);
      const renderGeometry=(poly:ConvexPolyhedron)=>geometry(this.character?.surface(template.name,vec(CONFIG.player.ragdollWidth,CONFIG.player.height/1.765,CONFIG.player.ragdollWidth),poly)??(this.character?{faces:[]}:poly),true,!!this.character);
      if(!mesh){mesh=new THREE.Mesh(renderGeometry(template.poly),this.materials(template.name,0,'player')[0]);mesh.castShadow=true;this.playerMeshes.set(template.name,mesh);this.player.add(mesh);}
      mesh.material=this.materials(template.name,0,'player')[this.retro?1:0];
      const part=down?controller.ragdoll.parts.find(p=>p.limb===template.name):null;
      mesh.visible=controller.damage.has(template.name)&&(!down||!!part);
      if(!mesh.visible)continue;
      if(part){
        if(mesh.userData.poly!==part.poly){mesh.geometry.dispose();mesh.geometry=renderGeometry(part.poly);mesh.userData.poly=part.poly;}
        mesh.position.set(part.previous.position.x,part.previous.position.y,part.previous.position.z).lerp(this.scratchPosition.set(part.current.position.x,part.current.position.y,part.current.position.z),alpha);
        mesh.quaternion.set(part.previous.rotation.x,part.previous.rotation.y,part.previous.rotation.z,part.previous.rotation.w).slerp(this.scratchRotation.set(part.current.rotation.x,part.current.rotation.y,part.current.rotation.z,part.current.rotation.w),alpha);
      }else{
        if(mesh.userData.poly!==template.poly){mesh.geometry.dispose();mesh.geometry=renderGeometry(template.poly);mesh.userData.poly=template.poly;}
        const limb=template.name,side=limb.endsWith('-1')?-1:1,arm=limb.includes('Arm')||limb.includes('forearm'),leg=limb.includes('thigh')||limb.includes('shin');
        if(leg){
          const pose=controller.footPose(side,stride*side);
          const shin=limb.includes('shin'),a=shin?pose.knee:pose.hip;
          const angle=shin?pose.shinAngle:pose.thighAngle;
          const original=controller.ragdoll.visualParts.find(p=>p.name===limb)!;
          const sy=CONFIG.player.height/1.765,pivotY=shin?(-.36-.0225)*sy:(.065-.0225)*sy;
          const offset=rotate(vec(0,original.position.y-pivotY,original.position.z),{x:0,y:0,z:Math.sin(angle/2),w:Math.cos(angle/2)});
          mesh.position.set(a.x+offset.x,a.y+offset.y,a.z+offset.z);
          mesh.rotation.set(0,0,angle);continue;
        }
        const angle=controller.grounded?(arm?-stride*side:leg?stride*side:0):arm?-.35*side:0;
        const local=template.position;
        const pivot=arm?vec(side*.34*CONFIG.player.ragdollWidth,(.57-.0225)*CONFIG.player.height/1.765,0):vec(side*.115*CONFIG.player.ragdollWidth,(.065-.0225)*CONFIG.player.height/1.765,0);
        const q={x:0,y:0,z:Math.sin(angle/2),w:Math.cos(angle/2)},offset=rotate(vec(local.x-pivot.x,local.y-pivot.y,local.z-pivot.z),q);
        mesh.position.set(x+pivot.x+offset.x,y+pivot.y+offset.y,offset.z+pivot.z);mesh.quaternion.set(q.x,q.y,q.z,q.w);
      }
    }
  }
  get bloodBodyDecals(){return this.bodyDecals.count;}
  get playerVisualParts(){return this.playerMeshes.size;}
  dispose(){window.removeEventListener('resize',this.resize);this.batches.dispose();this.scene.remove(this.batches.group);this.bodyDecals.dispose();
    const materials=new Set<THREE.Material>();
    for(const scene of [this.scene,this.screen])scene.traverse(o=>{if(o instanceof THREE.Mesh||o instanceof THREE.LineSegments){if(!o.geometry.userData.assetOwned)o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);}});
    for(const {pair}of this.environmentMaterials)pair.forEach(m=>materials.add(m));this.environmentMaterials=[];this.rowLamps=[];
    for(const pair of this.materialPairs.values())pair.forEach(m=>materials.add(m));for(const m of materials)m.dispose();
    this.shadows.dispose();
    this.bloodDrops.dispose();this.bloodStains.dispose();this.meshes.clear();this.playerMeshes.clear();this.materialPairs.clear();this.texture.dispose();this.character?.dispose();this.shaft?.dispose();this.target.dispose();this.renderer.dispose();}
}
