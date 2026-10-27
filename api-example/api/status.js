// Example Vercel serverless function — polls a fal.ai queue job.
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  let endpoint, id;
  try { ({ endpoint, id } = JSON.parse(Buffer.from(String(req.query.id), 'base64url').toString())); }
  catch { return res.status(400).json({ error: 'Bad id' }); }
  // fal's request URLs use the app id (first two path segments) only.
  const app = endpoint.split('/').slice(0, 2).join('/');
  const headers = { Authorization: `Key ${process.env.FAL_KEY}` };

  const s = await fetch(`https://queue.fal.run/${app}/requests/${id}/status`, { headers }).then((r) => r.json());
  if (s.status === 'COMPLETED') {
    const out = await fetch(`https://queue.fal.run/${app}/requests/${id}`, { headers }).then((r) => r.json());
    return res.json({ status: 'done', url: out.video?.url });
  }
  if (s.status === 'IN_QUEUE') return res.json({ status: 'pending', progress: 0.1, stage: 'Waiting in queue' });
  if (s.status === 'IN_PROGRESS') return res.json({ status: 'pending', progress: 0.5, stage: 'Rendering' });
  return res.json({ status: 'error', error: s.error || 'Unknown status' });
}
