// Vercel Serverless Function：同源代理 LLM 请求，解决浏览器直连
// api.kimi.com 无 CORS 头的问题。Web Request/Response 签名，直接透传
// 上游响应体，SSE 流式可用。

import { resolveUpstream, resolveApiKey, normalizeBody } from './_shared.js';

export const config = { maxDuration: 60 };

const jsonError = (status, message, type = 'server_config_error') =>
  new Response(JSON.stringify({ error: { message, type } }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export default async function handler(request) {
  if (request.method !== 'POST') {
    return jsonError(405, 'Method not allowed', 'invalid_request_error');
  }

  const apiKey = resolveApiKey(process.env, (name) => request.headers.get(name));
  if (!apiKey) {
    return jsonError(
      500,
      'Missing API key. Paste your Kimi Code API key (from kimi.com/code/console) in Settings, or set MOONSHOT_API_KEY on the server.'
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, 'Invalid JSON body', 'invalid_request_error');
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
    return jsonError(502, String(err?.message || err), 'upstream_fetch_error');
  }

  // 状态码与响应体（含 SSE 流）原样透传
  return new Response(upstreamRes.body, {
    status: upstreamRes.status,
    headers: {
      'Content-Type': upstreamRes.headers.get('content-type') || 'application/json',
      'Cache-Control': 'no-cache',
    },
  });
}
