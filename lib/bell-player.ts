import { boxingBellWav, playRoundBell, stopRoundBell } from './round-bell';
const bounded = async (operation:Promise<unknown>,ms:number):Promise<boolean> => {
  let timer:ReturnType<typeof setTimeout>|undefined;
  try{return await Promise.race([operation.then(()=>true,()=>false),new Promise<boolean>(resolve=>{timer=setTimeout(()=>resolve(false),ms);})]);}
  finally{clearTimeout(timer);}
};
export class BellPlayer {
  private context:AudioContext|null=null;
  private media:HTMLAudioElement|null=null;
  private url='';
  private generation=0;
  constructor(private createContext:()=>AudioContext=()=>new (window.AudioContext||(window as any).webkitAudioContext)(),private createMedia:(url:string)=>HTMLAudioElement=url=>new Audio(url)){}
  private prepare(){
    const state=this.context?.state as string|undefined;
    if(!this.context||state==='closed'||state==='interrupted'){
      if(this.context)void this.context.close().catch(()=>{});
      try{this.context=this.createContext();}catch{this.context=null;}
    }
    if(!this.media){try{this.url=URL.createObjectURL(new Blob([boxingBellWav()],{type:'audio/wav'}));this.media=this.createMedia(this.url);this.media.preload='auto';this.media.volume=1;}catch{if(this.url)URL.revokeObjectURL(this.url);this.url='';}}
  }
  /** Run directly in a tap handler, before promises or React effects. */
  prime(){
    this.prepare();const token=this.generation,context=this.context;
    try{const session=(navigator as any).audioSession;if(session)session.type='playback';}catch{}
    if(context){
      try{void context.resume().catch(()=>{});const source=context.createBufferSource();source.buffer=context.createBuffer(1,1,context.sampleRate);source.connect(context.destination);source.onended=()=>source.disconnect();source.start();}catch{}
    }
    if(this.media){
      const media=this.media;media.muted=true;
      try{void media.play().then(()=>{if(token===this.generation){media.pause();media.currentTime=0;media.muted=false;}}).catch(()=>{if(token===this.generation)media.muted=false;});}catch{media.muted=false;}
    }
  }
  async play():Promise<boolean>{
    this.stop();this.prepare();const token=this.generation,media=this.media;
    if(media){
      let played=false;try{media.muted=false;media.currentTime=0;played=await bounded(media.play(),1000);}catch{}
      if(token!==this.generation)return false;
      if(played)return true;
      media.pause();
    }
    const context=this.context;
    if(!context)return false;
    try{if(context.state!=='running')await bounded(context.resume(),800);
      if(token!==this.generation||context.state!=='running')return false;
      return await playRoundBell(context);
    }catch{return false;}
  }
  stop(){this.generation++;this.media?.pause();if(this.context)stopRoundBell(this.context);}
  dispose(){this.stop();if(this.context)void this.context.close().catch(()=>{});this.context=null;this.media=null;if(this.url)URL.revokeObjectURL(this.url);this.url='';}
}
