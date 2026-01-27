// Vercel Serverless Function - API Proxy for Moonshot/Kimi
// This hides the API key from the client

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: { message: 'Method not allowed' } });
  }

  const apiKey = process.env.MOONSHOT_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: {
        message: 'Server missing MOONSHOT_API_KEY. Configure it in Vercel Environment Variables.',
        type: 'server_config_error',
      },
    });
  }

  const upstream =
    process.env.MOONSHOT_UPSTREAM || 'https://api.moonshot.cn/v1/chat/completions';

  try {
    const upstreamRes = await fetch(upstream, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(req.body ?? {}),
    });

    const contentType = upstreamRes.headers.get('content-type') || '';
    const raw = await upstreamRes.text();

    res.status(upstreamRes.status);
    
    if (contentType.includes('application/json')) {
      try {
        return res.json(JSON.parse(raw));
      } catch {
        return res.send(raw);
      }
    }

    return res.send(raw);
  } catch (err) {
    return res.status(502).json({
      error: {
        message: String(err?.message || err),
        type: 'upstream_fetch_error',
      },
    });
  }
}
