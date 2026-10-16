import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { test } from 'node:test';

const source = await readFile(new URL('../src/model-loader.js', import.meta.url), 'utf8');
const { loadModel } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
const original = Buffer.from('glTF preserved model bytes');
const loader = { parseAsync: async (bytes, base) => ({ bytes: Buffer.from(bytes), base }) };
const url = 'https://example.test/assets/model.glb.gz';

test('gzip transfers decode to the original GLB and report progress', async t => {
  const packed = gzipSync(original), progress = [];
  t.mock.method(globalThis, 'fetch', async () => new Response(packed, {
    headers: { 'Content-Length': String(packed.length) }
  }));
  const result = await loadModel(loader, url, { onProgress: event => progress.push(event) });
  assert.deepEqual(result.bytes, original);
  assert.equal(result.base, 'https://example.test/assets/');
  assert.deepEqual(progress.map(event => event.phase), ['download', 'decompress', 'parse']);
  assert.equal(progress[0].loaded, packed.length);
  assert.equal(progress[0].total, packed.length);
});

test('host-decoded gzip and ordinary source GLB do not get decompressed twice', async t => {
  t.mock.method(globalThis, 'fetch', async () => new Response(original));
  for (const path of [url, url.slice(0, -3)]) {
    assert.deepEqual((await loadModel(loader, path)).bytes, original);
  }
});

test('missing, HTML and damaged compressed assets fail explicitly', async t => {
  const stub = t.mock.method(globalThis, 'fetch', async () => new Response('', { status: 404 }));
  await assert.rejects(loadModel(loader, url), /HTTP 404/);
  stub.mock.mockImplementation(async () => new Response('<html>fallback</html>'));
  await assert.rejects(loadModel(loader, url), /模型内容无效/);
  stub.mock.mockImplementation(async () => new Response(gzipSync(original).subarray(0, 12)));
  await assert.rejects(loadModel(loader, url));
});

test('stalled requests abort instead of leaving the loading screen pending', async t => {
  let aborted = false;
  t.mock.method(globalThis, 'fetch', (_, { signal }) => new Promise((resolve, reject) => {
    signal.addEventListener('abort', () => { aborted = true; reject(signal.reason); });
  }));
  await assert.rejects(loadModel(loader, url, { timeoutMs: 20 }), /没有响应/);
  assert.equal(aborted, true);
});

test('continuous download progress can outlast the idle deadline', async t => {
  const chunks = [original.subarray(0, 4), original.subarray(4, 8), original.subarray(8)];
  t.mock.method(globalThis, 'fetch', async () => new Response(new ReadableStream({
    async start(controller) {
      for (const chunk of chunks) {
        await new Promise(resolve => setTimeout(resolve, 35));
        controller.enqueue(chunk);
      }
      controller.close();
    }
  })));
  assert.deepEqual((await loadModel(loader, url, { timeoutMs: 80 })).bytes, original);
});

test('older-browser glTF fallback stays on the normal local GLTFLoader path', async () => {
  let requested;
  const fallback = { loadAsync: async path => { requested = path; return 'gltf model'; } };
  assert.equal(await loadModel(fallback, 'https://example.test/model.gltf'), 'gltf model');
  assert.equal(requested, 'https://example.test/model.gltf');
});
