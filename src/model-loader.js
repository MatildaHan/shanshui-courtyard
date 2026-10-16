/** Read local GLB assets with progress and an idle timeout; no external decoder. */
export async function loadModel(loader, url, { onProgress = () => {}, timeoutMs = 30000 } = {}) {
  const controller = new AbortController();
  let timer, timedOut = false;
  const armTimeout = (duration = timeoutMs) => {
    clearTimeout(timer);
    timer = setTimeout(() => { timedOut = true; controller.abort(); }, duration);
  };
  try {
    // Compatibility path for browsers without native gzip decompression.
    if (new URL(url).pathname.endsWith('.gltf')) {
      const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('模型加载超时，请检查网络后重试。')), 180000);
      });
      return await Promise.race([loader.loadAsync(url), timeout]);
    }
    armTimeout();
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`模型下载失败（HTTP ${response.status}），请重试。`);
    const total = Number(response.headers.get('Content-Length')) || 0;
    const chunks = [];
    let loaded = 0;
    const reader = response.body.getReader();
    while (true) {
      armTimeout();
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      loaded += value.byteLength;
      onProgress({ phase: 'download', loaded, total });
    }
    clearTimeout(timer);
    const bytes = new Uint8Array(loaded);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    let buffer = bytes.buffer;
    // Some hosts decode Content-Encoding themselves; inspect bytes to avoid double decoding.
    if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
      onProgress({ phase: 'decompress', loaded, total });
      buffer = await new Response(new Blob([bytes]).stream()
        .pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
    }
    if (new Uint8Array(buffer, 0, Math.min(4, buffer.byteLength)).join(',') !== '103,108,84,70') {
      throw new Error('模型内容无效，请检查发布资源后重试。');
    }
    onProgress({ phase: 'parse', loaded, total });
    const parseTimeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('模型解析超时，请重新加载。')), 60000);
    });
    return await Promise.race([loader.parseAsync(buffer, new URL('.', url).href), parseTimeout]);
  } catch (error) {
    if (timedOut) throw new Error('模型下载连续 30 秒没有响应，请检查网络后重试。');
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export function modelProgress(name, { phase, loaded, total }) {
  if (phase === 'decompress') return `正在解压${name}…`;
  if (phase === 'parse') return `正在构筑${name}…`;
  const mb = bytes => (bytes / 1024 / 1024).toFixed(1);
  return `正在下载${name}：${mb(loaded)}${total ? ' / ' + mb(total) : ''} MB`;
}
