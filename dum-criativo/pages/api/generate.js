export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { prompt, format, imageBase64, imageMime, strength } = req.body;
  const apiKey = process.env.FAL_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'FAL_API_KEY nao configurada' });
  const dims = { feed:{width:1080,height:1080}, stories:{width:1080,height:1920}, landscape:{width:1080,height:1350}, banner:{width:1920,height:1080} };
  const d = dims[format] || dims.feed;
  const body = { prompt, image_size: d, num_inference_steps: 28, seed: Math.floor(Math.random()*999999), enable_safety_checker: false };
  if (imageBase64 && strength !== 'free') {
    body.image_url = `data:${imageMime};base64,${imageBase64}`;
    body.image_prompt_strength = strength === 'strong' ? 0.35 : 0.2;
  }
  try {
    const r = await fetch('https://fal.run/fal-ai/flux/dev', { method:'POST', headers:{'Content-Type':'application/json','Authorization':`Key ${apiKey}`}, body: JSON.stringify(body) });
    if (!r.ok) return res.status(r.status).json({ error: await r.text() });
    const data = await r.json();
    return res.status(200).json({ url: data.images?.[0]?.url });
  } catch(e) { return res.status(500).json({ error: e.message }); }
}
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '20mb',
    },
  },
}
