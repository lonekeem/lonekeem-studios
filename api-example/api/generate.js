// Example Vercel serverless function — NOT used by the demo build.
// Copy the api-example/api folder to the root of a Vercel project, set FAL_KEY
// in Vercel → Settings → Environment Variables, and build the site with
// VITE_GEN_MODE=real and VITE_API_BASE=https://<your-project>.vercel.app
//
// The provider key lives only here (server-side). Never put it in VITE_* vars.

// Map app model ids → provider endpoints. Check fal.ai/models for the current
// endpoint ids and their input fields before going live; they change often.
const FAL_MODELS = {
  auto: 'fal-ai/minimax/hailuo-02/standard/text-to-video',
  seedance: 'fal-ai/bytedance/seedance/v1/pro/text-to-video',
  wan: 'fal-ai/wan/v2.2-a14b/text-to-video',
  minimax: 'fal-ai/minimax/hailuo-02/standard/text-to-video',
  kling: 'fal-ai/kling-video/v2.1/standard/text-to-video',
  'mood-fx': 'fal-ai/wan/v2.2-a14b/text-to-video',
  // 'grok-imagine': call xAI's video API here instead (XAI_API_KEY).
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { prompt, model = 'auto', length = 5, quality = '480p', character } = req.body || {};
  if (!prompt || prompt.length > 600) return res.status(400).json({ error: 'Bad prompt' });

  // TODO before launch: authenticate the user, check + deduct their credits in a
  // database, run prompt moderation, and rate-limit. The client is untrusted.

  const endpoint = FAL_MODELS[model] || FAL_MODELS.auto;
  const fullPrompt = character?.look
    ? `${prompt}. Main character "${character.name}": ${character.look}`
    : prompt;

  const r = await fetch(`https://queue.fal.run/${endpoint}`, {
    method: 'POST',
    headers: { Authorization: `Key ${process.env.FAL_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: fullPrompt, duration: String(length), resolution: quality }),
  });
  if (!r.ok) return res.status(502).json({ error: 'Provider error', detail: await r.text() });
  const job = await r.json();
  // Encode endpoint + request id so /api/status can look it up without a DB.
  res.json({ jobId: Buffer.from(JSON.stringify({ endpoint, id: job.request_id })).toString('base64url') });
}
