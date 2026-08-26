export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  const fileId = String(req.query?.fileId || '').trim();
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!fileId) return res.status(400).json({ error: 'missing_file_id' });
  if (!token) return res.status(500).json({ error: 'telegram_env_missing' });

  try {
    const fileResponse = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${encodeURIComponent(fileId)}`);
    const fileResult = await fileResponse.json();
    const filePath = fileResult.result?.file_path;
    if (!fileResponse.ok || !fileResult.ok || !filePath) {
      return res.status(502).json({ error: 'telegram_file_error' });
    }

    const imageResponse = await fetch(`https://api.telegram.org/file/bot${token}/${filePath}`);
    if (!imageResponse.ok) return res.status(502).json({ error: 'telegram_image_error' });

    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('Content-Type', imageResponse.headers.get('content-type') || 'image/jpeg');
    const buffer = Buffer.from(await imageResponse.arrayBuffer());
    return res.status(200).send(buffer);
  } catch (error) {
    console.error('getPrescriptionImage error:', error);
    return res.status(500).json({ error: 'internal_error' });
  }
}
