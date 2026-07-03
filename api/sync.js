/**
 * Server-side backup store — one Redis hash per player, one field per
 * data slice (srs / progression / round / pendingExperiment).
 *
 * A hash (rather than a single JSON blob) means each field can be updated
 * independently with HSET, so a write from one slice (e.g. an answered
 * question updating `srs`) never risks clobbering another slice that
 * happened to be mid-write (e.g. `round`).
 *
 * POST { player, field, value } — upserts one field. value may be null
 *   (used to represent "cleared", e.g. round-complete or experiment-consumed).
 * GET  ?player=NAME           — returns { srs, progression, round, pendingExperiment }
 *   with each present field parsed back out of its JSON string, or null
 *   if the player has no backup on record yet.
 */
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url:   process.env.REDIS_KV_REST_API_URL,
  token: process.env.REDIS_KV_REST_API_TOKEN,
});

function hashKey(player) {
  return `pudge:${player}`;
}

function safeParse(v) {
  if (typeof v !== 'string') return v; // client may already have deserialized it
  try { return JSON.parse(v); } catch { return v; }
}

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { player, field, value } = req.body ?? {};
    if (!player || !field) {
      return res.status(400).json({ error: 'missing player or field' });
    }
    await redis.hset(hashKey(player), { [field]: JSON.stringify(value ?? null) });
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'GET') {
    const { player } = req.query;
    if (!player) return res.status(400).json({ error: 'missing player' });

    const raw = await redis.hgetall(hashKey(player));
    if (!raw || Object.keys(raw).length === 0) return res.status(200).json(null);

    const data = {};
    for (const [key, value] of Object.entries(raw)) {
      data[key] = safeParse(value);
    }
    return res.status(200).json(data);
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'method not allowed' });
}
