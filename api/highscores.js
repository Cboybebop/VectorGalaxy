const MAX_SCORES = 10;
const SORTED_SET_KEY = 'vector-galaxy:highscores:zset';

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

async function kv(path, options = {}) {
  const response = await fetch(`${process.env.KV_REST_API_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`,
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    throw new Error(`KV request failed: ${response.status}`);
  }

  return response.json();
}

function toLeaderboard(items = []) {
  return items
    .map((raw) => {
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .slice(0, MAX_SCORES);
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

  try {
    if (req.method === 'GET') {
      const payload = await kv(`/zrange/${encodeURIComponent(SORTED_SET_KEY)}/0/${MAX_SCORES - 1}/REV`);
      return json({ scores: toLeaderboard(payload.result) }, 200, origin);
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

      if (!Number.isFinite(score) || score < 0) {
        return json({ error: 'Score must be a positive number.' }, 400, origin);
      }

      const entry = {
        id: crypto.randomUUID(),
        name,
        score: Math.floor(score),
        wave: Math.max(1, Math.floor(wave)),
        createdAt: new Date().toISOString()
      };

      // Atomic insertion: each submission is a single ZADD operation.
      await kv(`/zadd/${encodeURIComponent(SORTED_SET_KEY)}/${entry.score}/${encodeURIComponent(JSON.stringify(entry))}`, {
        method: 'POST'
      });

      // Keep storage bounded; remove low scorers beyond top N.
      await kv(`/zremrangebyrank/${encodeURIComponent(SORTED_SET_KEY)}/0/-${MAX_SCORES + 1}`, { method: 'POST' });

      const payload = await kv(`/zrange/${encodeURIComponent(SORTED_SET_KEY)}/0/${MAX_SCORES - 1}/REV`);
      return json({ scores: toLeaderboard(payload.result) }, 201, origin);
    }
  } catch {
    return json({ error: 'Leaderboard service temporarily unavailable.' }, 503, origin);
  }

  return json({ error: 'Method not allowed.' }, 405, origin);
}
