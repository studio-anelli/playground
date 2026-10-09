const bytes = (...items: Uint8Array[]) => { const out = new Uint8Array(items.reduce((n, item) => n + item.length, 0)); let offset = 0; for (const item of items) { out.set(item, offset); offset += item.length; } return out; };
const u32 = (...values: number[]) => { const out = new Uint8Array(values.length * 4), view = new DataView(out.buffer); values.forEach((value, i) => view.setUint32(i * 4, value)); return out; };
const u16 = (...values: number[]) => { const out = new Uint8Array(values.length * 2), view = new DataView(out.buffer); values.forEach((value, i) => view.setUint16(i * 2, value)); return out; };
const ascii = (value: string) => new TextEncoder().encode(value);
const box = (name: string, ...data: Uint8Array[]) => { const payload = bytes(...data); return bytes(u32(payload.length + 8), ascii(name), payload); };
const full = (name: string, data: Uint8Array, flags = 0) => box(name, u32(flags), data);
export type VideoSample = { data: Uint8Array; timestamp: number; duration: number };
/** Single-track AVC MP4. All samples are independently decodable keyframes. */
export function muxAVC(width: number, height: number, description: Uint8Array, samples: VideoSample[]) {
  if (!samples.length || !description.length) throw new Error('The encoder returned no video data.');
  if (samples.some((s, i) => i && s.timestamp <= samples[i - 1].timestamp)) throw new Error('The encoder returned reordered frames.');
  const duration = samples.reduce((n, sample) => n + sample.duration, 0), timescale = 1000000;
  const matrix = u32(0x10000, 0, 0, 0, 0x10000, 0, 0, 0, 0x40000000);
  const ftyp = box('ftyp', ascii('isom'), u32(512), ascii('isomiso2avc1mp41'));
  const mdat = box('mdat', ...samples.map(sample => sample.data));
  const mvhd = full('mvhd', bytes(u32(0, 0, timescale, duration, 0x10000), u16(0x100, 0), u32(0, 0), matrix, new Uint8Array(24), u32(2)));
  const tkhd = full('tkhd', bytes(u32(0, 0, 1, 0, duration, 0, 0), u16(0, 0, 0, 0), matrix, u32(width * 65536, height * 65536)), 7);
  const mdhd = full('mdhd', bytes(u32(0, 0, timescale, duration), u16(0x55c4, 0)));
  const hdlr = full('hdlr', bytes(u32(0), ascii('vide'), u32(0, 0, 0), ascii('Video\0')));
  const avc1 = box('avc1', new Uint8Array(6), u16(1), new Uint8Array(16), u16(width, height), u32(0x480000, 0x480000, 0), u16(1), new Uint8Array(32), u16(24, 65535), box('avcC', description));
  const stsd = full('stsd', bytes(u32(1), avc1));
  const runs: number[] = []; samples.forEach(sample => { if (runs.length && runs[runs.length - 1] === sample.duration) runs[runs.length - 2]++; else runs.push(1, sample.duration); });
  const stts = full('stts', bytes(u32(runs.length / 2), u32(...runs)));
  const stsc = full('stsc', u32(1, 1, samples.length, 1));
  const stsz = full('stsz', bytes(u32(0, samples.length), u32(...samples.map(sample => sample.data.length))));
  const stco = full('stco', u32(1, ftyp.length + 8));
  const stbl = box('stbl', stsd, stts, stsc, stsz, stco);
  const dinf = box('dinf', full('dref', bytes(u32(1), full('url ', new Uint8Array(), 1))));
  const minf = box('minf', full('vmhd', bytes(u16(0, 0, 0, 0)), 1), dinf, stbl);
  const moov = box('moov', mvhd, box('trak', tkhd, box('mdia', mdhd, hdlr, minf)));
  return new Blob([ftyp.buffer as ArrayBuffer, mdat.buffer as ArrayBuffer, moov.buffer as ArrayBuffer], { type: 'video/mp4' });
}
export async function renderVideo(canvas: HTMLCanvasElement, seconds: number, signal: AbortSignal, drawFrame: (index: number) => void, progress: (done: number, total: number) => void, fps: 30 | 60 = 30) {
  if (typeof VideoEncoder === 'undefined' || typeof VideoFrame === 'undefined') throw new Error('Frame rendering is unavailable in this browser. Live Record is still available.');
  const width = canvas.width, height = canvas.height, total = seconds * fps;
  let config: VideoEncoderConfig | undefined;
  for (const codec of ['avc1.64003c', 'avc1.640034', 'avc1.42003c', 'avc1.420034']) {
    const candidate: VideoEncoderConfig = { codec, width, height, framerate: fps, bitrate: Math.min(60000000, Math.max(16000000, width * height * 6)), latencyMode: 'realtime', avc: { format: 'avc' } };
    try { if ((await VideoEncoder.isConfigSupported(candidate)).supported) { config = candidate; break; } } catch { /* Try another AVC profile. */ }
  }
  signal.throwIfAborted();
  if (!config) throw new Error('This browser cannot encode MP4 at this size. Try HD or 2K.');
  const samples: VideoSample[] = []; let description = new Uint8Array(), failure: Error | undefined, encodedBytes = 0;
  const encoder = new VideoEncoder({ output: (chunk, metadata) => {
    const data = new Uint8Array(chunk.byteLength); chunk.copyTo(data); encodedBytes += data.length;
    if (encodedBytes > 512 * 1024 * 1024) { failure = new Error('Video exceeded 512 MB. Try a shorter duration.'); return; }
    if (chunk.type !== 'key') { failure = new Error('The encoder did not honour independent-frame encoding.'); return; }
    const index = Math.round(chunk.timestamp * fps / 1000000);
    samples.push({ data, timestamp: chunk.timestamp, duration: Math.round((index + 1) * 1000000 / fps) - Math.round(index * 1000000 / fps) });
    const configData = metadata?.decoderConfig?.description;
    if (configData) description = (ArrayBuffer.isView(configData) ? new Uint8Array(configData.buffer, configData.byteOffset, configData.byteLength) : new Uint8Array(configData as ArrayBuffer)).slice();
  }, error: error => { failure = error; } });
  const abort = () => { if (encoder.state !== 'closed') encoder.close(); };
  signal.addEventListener('abort', abort, { once: true });
  try {
    encoder.configure(config);
    for (let i = 0; i < total; i++) {
      signal.throwIfAborted(); if (failure) throw failure;
      drawFrame(i);
      const frame = new VideoFrame(canvas, { timestamp: Math.round(i * 1000000 / fps), duration: Math.round((i + 1) * 1000000 / fps) - Math.round(i * 1000000 / fps) });
      try { encoder.encode(frame, { keyFrame: true }); } finally { frame.close(); }
      // Bounded encoder queue; wall-clock delays never advance the animation timeline.
      await encoder.flush(); signal.throwIfAborted(); if (failure) throw failure;
      progress(i + 1, total); await new Promise(resolve => setTimeout(resolve, 0));
    }
    if (samples.length !== total) throw new Error('The encoder did not return every frame.');
    signal.throwIfAborted(); return muxAVC(width, height, description, samples);
  } finally { signal.removeEventListener('abort', abort); if (encoder.state !== 'closed') encoder.close(); }
}
