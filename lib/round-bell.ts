/** Three damped, inharmonic metal strikes. Generated locally; no audio downloads. */
export function boxingBellSamples(sampleRate: number): Float32Array {
  if (!Number.isFinite(sampleRate) || sampleRate < 8000 || sampleRate > 192000) throw new RangeError('Unsupported sample rate');
  const length = 2.8,
    out = new Float32Array(Math.ceil(sampleRate * length));
  const partials = [[550, 1, .66], [817, .55, .45], [1149, .32, .32], [1557, .24, .24], [2272, .14, .17], [2987, .08, .12]];
  for (const onset of [0, .28, .56]) {
    const offset = Math.round(onset * sampleRate);
    for (let i = 0; i < out.length - offset; i++) {
      const t = i / sampleRate,
        attack = 1 - Math.exp(-t / .0015),
        damping = (1 - t / (length - onset)) ** 2;
      let value = 0;
      for (const [freq, gain, decay] of partials) value += gain * Math.sin(2 * Math.PI * freq * t) * Math.exp(-t / decay);
      out[offset + i] += value * attack * damping;
    }
  }
  let peak = 0;
  for (const value of out) peak = Math.max(peak, Math.abs(value));
  if (peak) for (let i = 0; i < out.length; i++) out[i] = out[i] / peak * .82;
  return out;
}
const buffers = new WeakMap<AudioContext, AudioBuffer>();
const active = new WeakMap<AudioContext, AudioBufferSourceNode>();
export async function playRoundBell(context: AudioContext) {
  if (context.state === 'suspended') await context.resume();
  if (context.state !== 'running') return false;
  let buffer = buffers.get(context);
  if (!buffer) {
    const samples = boxingBellSamples(context.sampleRate);
    buffer = context.createBuffer(1, samples.length, context.sampleRate);
    buffer.getChannelData(0).set(samples);
    buffers.set(context, buffer);
  }
  const old = active.get(context);
  if (old) {
    try {
      old.stop();
    } catch {}
  }
  const source = context.createBufferSource(),
    gain = context.createGain();
  source.buffer = buffer;
  gain.gain.value = .5;
  source.connect(gain);
  gain.connect(context.destination);
  active.set(context, source);
  source.onended = () => {
    source.disconnect();
    gain.disconnect();
    if (active.get(context) === source) active.delete(context);
  };
  source.start();
  return true;
}

export function stopRoundBell(context: AudioContext) {
  try { active.get(context)?.stop(); } catch {}
  active.delete(context);
}
/** Locally generated PCM clip, also playable without a running Web Audio context. */
export function boxingBellWav(sampleRate = 22050): ArrayBuffer {
  const samples=boxingBellSamples(sampleRate), data=new ArrayBuffer(44+samples.length*2), view=new DataView(data);
  const string=(offset:number,value:string)=>{for(let i=0;i<value.length;i++)view.setUint8(offset+i,value.charCodeAt(i));};
  string(0,'RIFF');view.setUint32(4,data.byteLength-8,true);string(8,'WAVE');string(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,sampleRate,true);view.setUint32(28,sampleRate*2,true);view.setUint16(32,2,true);view.setUint16(34,16,true);string(36,'data');view.setUint32(40,samples.length*2,true);
  samples.forEach((sample,i)=>view.setInt16(44+i*2,Math.round(Math.max(-1,Math.min(1,sample))*32767),true));return data;
}
