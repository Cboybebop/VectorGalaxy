const MAX_SCORES = 10;

function getAllowedOrigin(requestOrigin, fallbackHost) {
  if (!requestOrigin) return `https://${fallbackHost}`;
  return requestOrigin;
}

function json(data, status = 200, origin = '*') {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': origin,
      'access-control-allow-methods': 'GET,POST,OPTIONS',
      'access-control-allow-headers': 'content-type'
    }
  });
}

function getKvConfig() {
  const url = process.env.KV_REST_API_URL || process.env.vercil_KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.vercil_KV_REST_API_TOKEN;

  return { url, token };
}

async function kvGet(url, token, key) {
  const response = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) throw new Error(`KV get failed: ${response.status}`);
  return response.json();
}

async function kvSet(url, token, key, value) {
  const response = await fetch(`${url}/set/${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify(value)
  });

  if (!response.ok) throw new Error(`KV set failed: ${response.status}`);
}

export default async function handler(req) {
  const requestOrigin = req.headers.get('origin');
  const fallbackHost = req.headers.get('host') || 'localhost';
  const origin = getAllowedOrigin(requestOrigin, fallbackHost);

  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'access-control-allow-origin': origin,
        'access-control-allow-methods': 'GET,POST,OPTIONS',
        'access-control-allow-headers': 'content-type'
      }
    });
  }

  const { url, token } = getKvConfig();
  if (!url || !token) {
    return json(
      {
        error:
          'Vercel KV is not configured. Add KV_REST_API_URL + KV_REST_API_TOKEN (or vercil_KV_REST_API_URL + vercil_KV_REST_API_TOKEN).'
      },
      503,
      origin
    );
  }

  const key = 'vector-galaxy:highscores';

  try {
    if (req.method === 'GET') {
      const payload = await kvGet(url, token, key);
      return json({ scores: payload.result || [] }, 200, origin);
    }

    if (req.method === 'POST') {
      let body;
      try {
        body = await req.json();
      } catch {
        return json({ error: 'Invalid JSON payload.' }, 400, origin);
      }

      const name = String(body?.name || 'Pilot').slice(0, 24).trim() || 'Pilot';
      const score = Number(body?.score || 0);
      const wave = Number(body?.wave || 1);
      if (!Number.isFinite(score) || score < 0) return json({ error: 'Score must be a positive number.' }, 400, origin);

      const payload = await kvGet(url, token, key);
      const existing = Array.isArray(payload.result) ? payload.result : [];

      const entry = { name, score: Math.floor(score), wave: Math.floor(wave), createdAt: new Date().toISOString() };
      const scores = [...existing, entry]
        .sort((a, b) => b.score - a.score)
        .slice(0, MAX_SCORES);

      await kvSet(url, token, key, scores);

      return json({ scores }, 201, origin);
    }

    return json({ error: 'Method not allowed.' }, 405, origin);
  } catch {
    return json({ error: 'Leaderboard backend unavailable.' }, 503, origin);
  }
}
