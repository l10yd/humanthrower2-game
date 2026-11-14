// Isolated Jolt adapter for comparison only. Never imported by src/runtime.
export function createJoltWorld(J,{velocitySteps=8,positionSteps=2,preservePrincipal=false}={}){
 const settings=new J.JoltSettings(),pair=new J.ObjectLayerPairFilterTable(2),broad=new J.BroadPhaseLayerInterfaceTable(2,2);
 pair.EnableCollision(0,1);pair.EnableCollision(1,1);
 const b0=new J.BroadPhaseLayer(0),b1=new J.BroadPhaseLayer(1);broad.MapObjectToBroadPhaseLayer(0,b0);broad.MapObjectToBroadPhaseLayer(1,b1);J.destroy(b0);J.destroy(b1);
 settings.mObjectLayerPairFilter=pair;settings.mBroadPhaseLayerInterface=broad;settings.mObjectVsBroadPhaseLayerFilter=new J.ObjectVsBroadPhaseLayerFilterTable(broad,2,pair,2);
 settings.mMaxWorkerThreads=0;settings.mMaxBodies=1024;
 const world=new J.JoltInterface(settings);J.destroy(settings);const system=world.GetPhysicsSystem(),bi=system.GetBodyInterface(),ps=system.GetPhysicsSettings();
 ps.mNumVelocitySteps=velocitySteps;ps.mNumPositionSteps=positionSteps;system.SetPhysicsSettings(ps);J.destroy(ps);
 const filters=[],bodies=[],constraints=[],mapping=[];let destroyed=false;
 // Binding-returned vectors/quaternions are borrowed scratch values: copy them
 // immediately, never destroy them (only explicitly allocated new objects).
 const read=v=>({x:v.GetX(),y:v.GetY(),z:v.GetZ()}),readQ=q=>({x:q.GetX(),y:q.GetY(),z:q.GetZ(),w:q.GetW()});
 const allocV=p=>new J.Vec3(p.x,p.y,p.z),allocP=p=>new J.RVec3(p.x,p.y,p.z),allocQ=q=>new J.Quat(q.x,q.y,q.z,q.w);
 const makeBody=(shape,p,q,{mass=0,tensor,velocity={x:0,y:0,z:0},angular={x:0,y:0,z:0},linearDamping=.12,angularDamping=4.5,friction=.8,filter,npc=0,index=0}={})=>{
  const pos=allocP(p),rotation=allocQ(q),desc=new J.BodyCreationSettings(shape,pos,rotation,mass?J.EMotionType_Dynamic:J.EMotionType_Static,mass?1:0);J.destroy(pos);J.destroy(rotation);
  desc.mFriction=friction;desc.mRestitution=0;
  if(mass){
   desc.mOverrideMassProperties=J.EOverrideMassProperties_MassAndInertiaProvided;desc.mMassPropertiesOverride.mMass=mass;
   const matrix=new J.Mat44();for(let c=0;c<3;c++){const column=allocV({x:tensor[0][c],y:tensor[1][c],z:tensor[2][c]});matrix.SetColumn3(c,column);J.destroy(column);}desc.mMassPropertiesOverride.mInertia=matrix;J.destroy(matrix);
   desc.mLinearDamping=linearDamping;desc.mAngularDamping=angularDamping;desc.mMaxLinearVelocity=3.402823e38;desc.mMaxAngularVelocity=3.402823e38;
   desc.mMotionQuality=J.EMotionQuality_LinearCast;
   const v=allocV(velocity),w=allocV(angular);desc.mLinearVelocity=v;desc.mAngularVelocity=w;J.destroy(v);J.destroy(w);
   if(filter){const group=new J.CollisionGroup(filter,npc,index);desc.mCollisionGroup=group;J.destroy(group);}
  }
  const body=bi.CreateBody(desc);J.destroy(desc);if(!body)throw Error('Jolt body allocation failed');bi.AddBody(body.GetID(),mass?J.EActivation_Activate:J.EActivation_DontActivate);bodies.push(body);return body;
 };
 const box=(half,p,friction=.65)=>{const v=allocV(half),shape=new J.BoxShape(v,0);J.destroy(v);return makeBody(shape,p,{x:0,y:0,z:0,w:1},{friction});};
 const hull=(points)=>{
  const settings=new J.ConvexHullShapeSettings();settings.mMaxConvexRadius=0;settings.mMaxErrorConvexRadius=0;settings.mHullTolerance=0;
  for(const p of points){const v=allocV(p);settings.mPoints.push_back(v);J.destroy(v);}
  const result=settings.Create();
  if(result.HasError()){const error=result.GetError().c_str();J.destroy(result);J.destroy(settings);throw Error(`Jolt hull rejected: ${error}`);}
  const shape=result.Get();shape.AddRef();J.destroy(result);J.destroy(settings);return shape;
 };
 const nativeTensor=(principal,frame)=>{
  // Reconstruct the supplied native tensor; not corrected geometry/inertia.
  const {x,y,z,w}=frame,rotation=[[1-2*(y*y+z*z),2*(x*y-z*w),2*(x*z+y*w)],[2*(x*y+z*w),1-2*(x*x+z*z),2*(y*z-x*w)],[2*(x*z-y*w),2*(y*z+x*w),1-2*(x*x+y*y)]],values=[principal.x,principal.y,principal.z];
  return rotation.map((row,i)=>row.map((_,j)=>values.reduce((s,v,k)=>s+rotation[i][k]*v*rotation[j][k],0)));
 };
 const sourceBody=(part,points,filter,npc,index)=>{
  const shape=hull(points);try{
   const body=makeBody(shape,part.pose.position,part.pose.rotation,{mass:part.mass,tensor:part.tensor??nativeTensor(part.principal,part.frame),velocity:part.velocity,angular:part.angular,linearDamping:part.linearDamping,angularDamping:part.angularDamping,friction:part.friction,filter,npc,index});
   const motion=body.GetMotionProperties();
   if(preservePrincipal){
    // Bypass the engine's near-zero decomposition fallback using exactly the
    // supplied principal values/frame, not a proxy or inertia multiplier.
    const inverse=allocV({x:1/part.principal.x,y:1/part.principal.y,z:1/part.principal.z}),frame=allocQ(part.frame);
    motion.SetInverseInertia(inverse,frame);J.destroy(inverse);J.destroy(frame);
   }
   const inverse=motion.GetInverseInertiaDiagonal(),rotation=motion.GetInertiaRotation();
   const inv=read(inverse),q=readQ(rotation),actualTensor=nativeTensor({x:inv.x?1/inv.x:0,y:inv.y?1/inv.y:0,z:inv.z?1/inv.z:0},q);
   mapping.push({id:part.id,preservePrincipal,mass:part.mass,actualMass:1/motion.GetInverseMass(),suppliedTensor:part.tensor??nativeTensor(part.principal,part.frame),actualTensor,sourceCom:part.com,shapeCom:read(shape.GetCenterOfMass()),sourcePointCount:points.length,volume:shape.GetVolume(),innerRadius:shape.GetInnerRadius(),maxAngular:motion.GetMaxAngularVelocity(),maxLinear:motion.GetMaxLinearVelocity()});
   return body;
  }finally{shape.Release();}
 };
 const groupFilter=count=>{const f=new J.GroupFilterTable(count);f.AddRef();filters.push(f);return f;};
 const joint=(data,a,b,centerA,centerB)=>{
  const c=new J.SixDOFConstraintSettings();c.mSpace=J.EConstraintSpace_LocalToBodyCOM;c.mSwingType=J.ESwingType_Pyramid;
  const aa=allocP({x:data.anchorA.x-centerA.x,y:data.anchorA.y-centerA.y,z:data.anchorA.z-centerA.z}),bb=allocP({x:data.anchorB.x-centerB.x,y:data.anchorB.y-centerB.y,z:data.anchorB.z-centerB.z}),x=allocV({x:1,y:0,z:0}),y=allocV({x:0,y:1,z:0});
  c.mPosition1=aa;c.mPosition2=bb;c.mAxisX1=c.mAxisX2=x;c.mAxisY1=c.mAxisY2=y;
  for(let axis=0;axis<3;axis++)c.MakeFixedAxis(axis);
  for(let axis=0;axis<3;axis++){
   if(data.hinge&&axis>0){c.MakeFixedAxis(axis+3);continue;}
   const limit=data.limits[data.hinge?0:axis];c.SetLimitedAxis(axis+3,limit[0],limit[1]);
   const motor=c.get_mMotorSettings(axis+3);motor.mSpringSettings.mMode=J.ESpringMode_StiffnessAndDamping;motor.mSpringSettings.mStiffness=0;motor.mSpringSettings.mDamping=1.8;motor.mMinTorqueLimit=-2;motor.mMaxTorqueLimit=2;
  }
  const created=c.Create(a,b),constraint=J.castObject(created,J.SixDOFConstraint);constraint.AddRef();system.AddConstraint(constraint);constraints.push(constraint);
  for(let axis=0;axis<3;axis++)if(!data.hinge||axis===0)constraint.SetMotorState(axis+3,J.EMotorState_Velocity);
  const zero=allocV({x:0,y:0,z:0});constraint.SetTargetAngularVelocityCS(zero);J.destroy(zero);
  J.destroy(aa);J.destroy(bb);J.destroy(x);J.destroy(y);J.destroy(c);return constraint;
 };
 const dispose=()=>{if(destroyed)return;destroyed=true;for(const c of constraints){system.RemoveConstraint(c);c.Release();}for(const b of bodies){bi.RemoveBody(b.GetID());bi.DestroyBody(b.GetID());}for(const f of filters)f.Release();J.destroy(world);};
 return {world,system,bi,bodies,mapping,box,sourceBody,groupFilter,joint,read,readQ,dispose};
}
