// Vercel Serverless Function（Node.js req/res 签名）：同源代理 LLM 请求，
// 解决浏览器直连 api.kimi.com 无 CORS 头的问题。SSE 流式逐块透传。

import { resolveUpstream, resolveApiKey, normalizeBody } from '../_shared.js';

export const config = { maxDuration: 60 };

const sendJson = (res, status, obj) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(obj));
};

const readBody = (req) =>
  new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: { message: 'Method not allowed', type: 'invalid_request_error' } });
    return;
  }

  const apiKey = resolveApiKey(process.env, (name) => req.headers[name]);
  if (!apiKey) {
    sendJson(res, 500, {
      error: {
        message:
          'Missing API key. Paste your Kimi Code API key (from kimi.com/code/console) in Settings, or set MOONSHOT_API_KEY on the server.',
        type: 'server_config_error',
      },
    });
    return;
  }

  let body;
  try {
    const raw = await readBody(req);
    body = raw ? JSON.parse(raw) : {};
  } catch {
    sendJson(res, 400, { error: { message: 'Invalid JSON body', type: 'invalid_request_error' } });
    return;
  }

  const upstream = resolveUpstream(process.env);

  let upstreamRes;
  try {
    upstreamRes = await fetch(upstream, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(normalizeBody(body, upstream, process.env)),
    });
  } catch (err) {
    sendJson(res, 502, { error: { message: String(err?.message || err), type: 'upstream_fetch_error' } });
    return;
  }

  res.statusCode = upstreamRes.status;
  res.setHeader('Content-Type', upstreamRes.headers.get('content-type') || 'application/json');
  res.setHeader('Cache-Control', 'no-cache');

  if (!upstreamRes.ok) {
    // 排障用：在 Vercel 日志里留下游状态与报错摘要（不含 key）
    const snippet = (await upstreamRes.clone().text().catch(() => '')).slice(0, 300);
    console.error(`[proxy] upstream ${upstreamRes.status} from ${new URL(upstream).hostname}: ${snippet}`);
  }

  if (upstreamRes.body) {
    // 客户端断开时取消上游流
    req.on('close', () => upstreamRes.body.cancel().catch(() => {}));
    for await (const chunk of upstreamRes.body) {
      res.write(chunk);
    }
  }
  res.end();
}
