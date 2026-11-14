/** Presentation-only cadence. Simulation clocks/input/QTE are never throttled. */
export class HudCadence {
 private last=-Infinity;private state='';
 updates=0;
 due(timestamp:number,state:string){
  if(state===this.state&&timestamp>=this.last&&timestamp-this.last<1000/30)return false;
  this.state=state;this.last=timestamp;this.updates++;return true;
 }
}
