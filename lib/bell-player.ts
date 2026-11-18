import { playRoundBell, stopRoundBell } from './round-bell';
/** Notification audio must never claim exclusive playback or prime a media element. */
export class BellPlayer {
  private context: AudioContext|null = null;
  private generation = 0;
  constructor(private createContext:()=>AudioContext=()=>new (window.AudioContext||(window as any).webkitAudioContext)()) {}
  private prepare() {
    try { const session=(navigator as any).audioSession; if(session) session.type='ambient'; } catch {}
    if (!this.context || ['closed','interrupted'].includes(this.context.state)) {
      if(this.context) void this.context.close().catch(()=>{});
      this.context=this.createContext();
    }
    return this.context;
  }
  // Explicit gesture only. No silent media play and no buffer starts here.
  prime() { try { void this.prepare().resume().catch(()=>{}); } catch {} }
  async play(volume=.5):Promise<boolean> {
    this.stop(); const token=this.generation;
    try {
      const context=this.prepare();
      if(context.state!=='running') {
        let timeout:ReturnType<typeof setTimeout>|undefined;
        try { await Promise.race([context.resume(),new Promise((_,reject)=>{timeout=setTimeout(()=>reject(Error('Audio unavailable')),800);})]); }
        finally { clearTimeout(timeout); }
      }
      if(token!==this.generation||context.state!=='running') return false;
      return await playRoundBell(context,volume);
    } catch { return false; }
  }
  stop(){this.generation++;if(this.context)stopRoundBell(this.context);}
  dispose(){this.stop();if(this.context)void this.context.close().catch(()=>{});this.context=null;}
}
