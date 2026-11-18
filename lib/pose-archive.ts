import poseMap from './exercise-pose-map.json';

export const exercisePoses: Readonly<Record<string, {file: string; label: string; bytes: number; sha256: string}>> = poseMap;
const expected = new Map(Object.values(exercisePoses).map(entry => [entry.file, entry]));
const base = 'com.primero.fleekfrontend.apk';
const prefix = 'assets/flutter_assets/assets/image/exercise/';
const decoder = new TextDecoder();
const invalid = () => new Error('지원하는 Fleek 3.7.46 XAPK 또는 기본 APK 파일인지 확인해 주세요.');

type Entry = { method: number; flags: number; size: number; compressed: number; offset: number; crc: number };
async function directory(file: Blob) {
  if (file.size < 22 || file.size > 180 * 1024 * 1024) throw invalid();
  const start = Math.max(0, file.size - 65557);
  const tail = new DataView(await file.slice(start).arrayBuffer());
  for (let i = tail.byteLength - 22; i >= 0; i--) {
    if (tail.getUint32(i, true) !== 0x06054b50 || i + 22 + tail.getUint16(i + 20, true) !== tail.byteLength) continue;
    const count = tail.getUint16(i + 10, true), size = tail.getUint32(i + 12, true), offset = tail.getUint32(i + 16, true);
    if (tail.getUint32(i + 4, true) || count !== tail.getUint16(i + 8, true) || count > 15000 || size > 5 * 1024 * 1024 || offset + size !== start + i) throw invalid();
    const dir = new DataView(await file.slice(offset, offset + size).arrayBuffer());
    const out = new Map<string, Entry>();
    let pos = 0;
    for (let n = 0; n < count; n++) {
      if (pos + 46 > size || dir.getUint32(pos, true) !== 0x02014b50) throw invalid();
      const length = dir.getUint16(pos + 28, true);
      const next = pos + 46 + length + dir.getUint16(pos + 30, true) + dir.getUint16(pos + 32, true);
      if (next > size) throw invalid();
      const name = decoder.decode(new Uint8Array(dir.buffer, pos + 46, length));
      const entry = { flags: dir.getUint16(pos + 8, true), method: dir.getUint16(pos + 10, true),
        crc: dir.getUint32(pos + 16, true), compressed: dir.getUint32(pos + 20, true),
        size: dir.getUint32(pos + 24, true), offset: dir.getUint32(pos + 42, true) };
      if (out.has(name) || entry.offset >= offset) throw invalid();
      out.set(name, entry);
      pos = next;
    }
    if (pos !== size) throw invalid();
    return out;
  }
  throw invalid();
}
async function entryData(file: Blob, name: string, e: Entry) {
  if (e.flags & 1 || ![0, 8].includes(e.method) || e.offset + 30 > file.size) throw invalid();
  const h = new DataView(await file.slice(e.offset, e.offset + 30).arrayBuffer());
  const len = h.getUint16(26, true), start = e.offset + 30 + len + h.getUint16(28, true);
  if (h.getUint32(0, true) !== 0x04034b50 || h.getUint16(8, true) !== e.method || start + e.compressed > file.size ||
      decoder.decode(await file.slice(e.offset + 30, e.offset + 30 + len).arrayBuffer()) !== name) throw invalid();
  const data = file.slice(start, start + e.compressed);
  if (e.method === 0 && data.size !== e.size) throw invalid();
  return data;
}
const crcTable = Uint32Array.from({length: 256}, (_, k) => {
  for (let i = 0; i < 8; i++) k = (k >>> 1) ^ (k & 1 ? 0xedb88320 : 0);
  return k;
});
function crc32(bytes: Uint8Array) {
  let c = 0xffffffff;
  for (const b of bytes) c = (c >>> 8) ^ crcTable[(c ^ b) & 255];
  return (c ^ 0xffffffff) >>> 0;
}
async function png(file: Blob, name: string, entry: Entry, sha256: string) {
  const src = await entryData(file, name, entry);
  if (src.size > 512 * 1024 || entry.size > 512 * 1024) throw invalid();
  const stream = entry.method === 0 ? src.stream() : src.stream().pipeThrough(new DecompressionStream('deflate-raw'));
  const reader = stream.getReader();
  const bytes = new Uint8Array(entry.size);
  let size = 0;
  try {
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      if (size + chunk.value.length > bytes.length) throw invalid();
      bytes.set(chunk.value, size);
      size += chunk.value.length;
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  const header = new DataView(bytes.buffer);
  if (size < 33 || size !== entry.size || header.getUint32(0) !== 0x89504e47 || header.getUint32(4) !== 0x0d0a1a0a ||
      header.getUint32(12) !== 0x49484452 || header.getUint32(16) !== 640 || header.getUint32(20) !== 360 || crc32(bytes) !== entry.crc) throw invalid();
  const actual = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  if (Array.from(actual, b => b.toString(16).padStart(2, '0')).join('') !== sha256) throw invalid();
  return new Blob([bytes], {type: 'image/png'});
}

export async function readPoseArchive(input: Blob, progress?: (done: number, total: number) => void) {
  let file = input, index = await directory(input);
  if (index.has(base)) {
    const embedded = index.get(base)!;
    if (embedded.method !== 0 || embedded.size > 150 * 1024 * 1024) throw invalid();
    file = await entryData(input, base, embedded);
    index = await directory(file);
  }
  const poses = new Map<string, Blob>();
  for (const [filename, asset] of expected) {
    const name = prefix + filename, entry = index.get(name);
    if (!entry || entry.size !== asset.bytes) throw invalid();
    poses.set(filename, await png(file, name, entry, asset.sha256));
    if (poses.size % 12 === 0 || poses.size === expected.size) progress?.(poses.size, expected.size);
  }
  return poses;
}
