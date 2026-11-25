export const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
export const lerp = (a,b,t) => a + (b-a)*t;
export const TAU = 2*Math.PI;
export function lerpAngle(a,b,t) { return a + (((b-a+Math.PI)%TAU+TAU)%TAU-Math.PI)*t; }
export function seededRandom(seed) {
  let x=2166136261;
  for (const c of String(seed)) {x ^= c.charCodeAt(0); x=Math.imul(x,16777619);}
  return () => {x=(x+0x6D2B79F5)|0;let t=Math.imul(x^(x>>>15),1|x);t^=t+Math.imul(t^(t>>>7),61|t);return ((t^(t>>>14))>>>0)/4294967296;};
}
