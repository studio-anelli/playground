/** Records only rendered canvas pixels. No microphone, camera, or screen permissions. */
export function recordCanvas(canvas: HTMLCanvasElement, seconds: number, onFinish: (blob: Blob | null, error?: string) => void) {
  if (typeof MediaRecorder === 'undefined' || !canvas.captureStream) throw new Error('Video recording is unavailable in this browser.');
  const stream = canvas.captureStream(30);
  let recorder: MediaRecorder;
  try {
    const mimeType = ['video/mp4;codecs=avc1.42E01E', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find(type => MediaRecorder.isTypeSupported(type));
    recorder = new MediaRecorder(stream, { ...(mimeType ? { mimeType } : {}), videoBitsPerSecond: Math.min(60000000, Math.max(12000000, canvas.width * canvas.height * 6)) });
  } catch (error) { stream.getTracks().forEach(track => track.stop()); throw error; }
  const chunks: Blob[] = [];
  let done = false, failure: string | undefined, timer: ReturnType<typeof setTimeout> | undefined;
  const cleanup = () => { if (timer) clearTimeout(timer); stream.getTracks().forEach(track => track.stop()); };
  const finish = () => { if (done) return; done = true; cleanup(); const blob = chunks.length ? new Blob(chunks, { type: recorder.mimeType || chunks[0].type }) : null; onFinish(failure ? null : blob, failure || (!blob?.size ? 'No video frames were captured.' : undefined)); };
  recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
  recorder.onstop = finish;
  recorder.onerror = () => { failure = 'Video encoding failed. Try a smaller output size.'; finish(); };
  const stop = () => { if (done) return; if (timer) clearTimeout(timer); if (recorder.state !== 'inactive') recorder.stop(); else finish(); };
  try { recorder.start(1000); timer = setTimeout(stop, seconds * 1000); }
  catch (error) { done = true; cleanup(); throw error; }
  return { stop, cancel: () => { if (done) return; done = true; cleanup(); if (recorder.state !== 'inactive') recorder.stop(); }, width: canvas.width, height: canvas.height };
}
