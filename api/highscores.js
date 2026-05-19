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

export default async function handler(req) {
  const requestOrigin = req.headers.get('origin');
  const fallbackHost = req.headers.get('host') || 'localhost';
  const origin = getAllowedOrigin(requestOrigin, fallbackHost);

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { 'access-control-allow-origin': origin, 'access-control-allow-methods': 'GET,POST,OPTIONS', 'access-control-allow-headers': 'content-type' } });
  }

  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    return json({ error: 'Vercel KV is not configured. Add KV_REST_API_URL and KV_REST_API_TOKEN.' }, 503, origin);
  }

  const key = 'vector-galaxy:highscores';

  if (req.method === 'GET') {
    const read = await fetch(`${process.env.KV_REST_API_URL}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}` }
    });
    const payload = await read.json();
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

    const read = await fetch(`${process.env.KV_REST_API_URL}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}` }
    });
    const payload = await read.json();
    const existing = Array.isArray(payload.result) ? payload.result : [];

    const entry = { name, score: Math.floor(score), wave: Math.floor(wave), createdAt: new Date().toISOString() };
    const scores = [...existing, entry]
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_SCORES);

    await fetch(`${process.env.KV_REST_API_URL}/set/${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify(scores)
    });

    return json({ scores }, 201, origin);
  }

  return json({ error: 'Method not allowed.' }, 405, origin);
}
