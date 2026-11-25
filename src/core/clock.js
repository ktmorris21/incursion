import {CONFIG} from '../config.js';
import {clamp} from './math.js';
export class FixedClock {
  constructor(onStep, options=CONFIG.clock){this.onStep=onStep;this.options=options;this.dt=1/options.hz;this.speed=1;this.paused=false;this.accumulator=0;this.lastTime=null;this.steps=0;this.droppedSeconds=0;}
  setSpeed(speed){if(!this.options.speeds.includes(speed))return false;this.speed=speed;return true;}
  setPaused(value){this.paused=Boolean(value);this.lastTime=null;this.accumulator=0;}
  reset(){this.lastTime=null;this.accumulator=0;this.steps=0;this.droppedSeconds=0;}
  advance(seconds){
    if(this.paused)return {steps:0,alpha:1};
    const safe=Number.isFinite(seconds)?Math.max(0,seconds):0;
    const wall=Math.min(safe,this.options.maxFrameSeconds);
    this.droppedSeconds+=(safe-wall)*this.speed;
    this.accumulator+=wall*this.speed;
    let n=0;
    while(this.accumulator+1e-10>=this.dt&&n<this.options.maxStepsPerFrame){this.onStep(this.dt);this.accumulator=Math.max(0,this.accumulator-this.dt);n++;this.steps++;}
    if(this.accumulator+1e-10>=this.dt){const excess=Math.floor((this.accumulator+1e-10)/this.dt)*this.dt;this.accumulator=Math.max(0,this.accumulator-excess);this.droppedSeconds+=excess;}
    return {steps:n,alpha:clamp(this.accumulator/this.dt,0,1)};
  }
  frame(timestampMs){if(!Number.isFinite(timestampMs))return {steps:0,alpha:this.paused?1:0};if(this.lastTime===null){this.lastTime=timestampMs;return {steps:0,alpha:this.paused?1:0};}const delta=(timestampMs-this.lastTime)/1000;this.lastTime=timestampMs;return this.advance(delta);}
  singleStep(){if(!this.paused)return false;this.onStep(this.dt);this.steps++;return true;}
}
