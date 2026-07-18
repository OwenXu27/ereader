// 共享的代理逻辑：本地开发服务器（server/index.mjs）与 Vercel
// Serverless Function（api/chat/completions.mjs）共用。
//
// 背景：公司内网可用 api.msh.team，但公网部署（Vercel）上用户只能走
// Kimi Code 端点 api.kimi.com，而该端点没有 CORS 头，浏览器无法直连，
// 必须由服务端转发。

/** Kimi Code 的 OpenAI 兼容路由（公网可达） */
export const KIMI_CODE_UPSTREAM =
  'https://api.kimi.com/coding/v1/chat/completions';

export const resolveUpstream = (env = process.env) =>
  env.MOONSHOT_UPSTREAM || KIMI_CODE_UPSTREAM;

/**
 * API key 优先级：服务端环境变量 > 客户端 X-API-Key 头 > Authorization。
 * 这样本地开发零配置（.env.local 提供 key），公网部署时用户在设置面板
 * 粘贴自己的 Kimi Code key 即可。
 */
export const resolveApiKey = (env, getHeader) => {
  if (env.MOONSHOT_API_KEY) return env.MOONSHOT_API_KEY.trim();
  const xKey = getHeader('x-api-key');
  if (xKey && xKey.trim()) return xKey.trim();
  const auth = getHeader('authorization');
  if (auth) {
    const m = /^Bearer\s+(.+)$/i.exec(auth.trim());
    if (m) return m[1].trim();
  }
  return null;
};

/** Kimi Code 已知的模型 ID（见 kimi.com/code/docs/kimi-code/models.html） */
const KIMI_CODE_MODELS = new Set(['k3', 'kimi-for-coding', 'kimi-for-coding-highspeed']);

const isKimiCodeUpstream = (upstream) => {
  try {
    return new URL(upstream).hostname === 'api.kimi.com';
  } catch {
    return false;
  }
};

/**
 * 按上游规范化请求体。仅当上游是 api.kimi.com 时生效：
 * - 模型 ID 映射：kimi-k2.6 / kimi-k2.7-* 等内网网关 ID 在 Kimi Code 上
 *   不存在，统一映射到 kimi-for-coding（可用 KIMI_CODE_MODEL 覆盖，
 *   例如高档位账号换成 kimi-for-coding-highspeed）
 * - thinking 开关翻译：客户端对 kimi-k2.6 会发 thinking:{type:'disabled'}
 *   （即「K2.7 Code 关闭思考」，实际路由 K2.6）；Kimi Code 的对应写法是
 *   reasoning_effort:'none'
 */
export const normalizeBody = (body, upstream, env = process.env) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return body;
  if (!isKimiCodeUpstream(upstream)) return body;

  const out = { ...body };

  if (!KIMI_CODE_MODELS.has(out.model)) {
    out.model = env.KIMI_CODE_MODEL || 'kimi-for-coding';
  }

  if (out.thinking && typeof out.thinking === 'object') {
    if (out.thinking.type === 'disabled') {
      out.reasoning_effort = 'none';
    }
    delete out.thinking;
  }

  // 实测 api.kimi.com 的 kimi-for-coding 系列只接受 temperature=1
  // （与 reasoning_effort:'none' 路由到 K2.6 无关，模型本身的约束）
  out.temperature = 1;

  return out;
};
