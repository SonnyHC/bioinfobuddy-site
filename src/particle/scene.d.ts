export const themes: Record<string,Record<string,number[]>>;
export type ParticleScene = 'double-helix' | 'protein';
export function mountHelix(canvas: HTMLCanvasElement, options?: {theme?:string;onState?:(state:string)=>void;onScene?:(scene:ParticleScene)=>void}): {
  dispose():void;
  next():void;
  pause(value?:boolean):void;
  refresh():void;
  configure(value:{brush?:number;projection?:string;materials?:Record<string,number[]>}):void;
} | null;
