export default async function handler(req, res) {
  const allowedOrigin = 'https://dawaok.vercel.app';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  try {
    const { name, phone, address, imageBase64, mimeType, orderId } = req.body || {};
    if (!name || !phone || !address || !imageBase64) {
      return res.status(400).json({ error: 'missing_data' });
    }

    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!token || !chatId) {
      return res.status(500).json({ error: 'telegram_env_missing' });
    }

    const cleanMime = /^image\/(jpeg|jpg|png|webp|heic)$/i.test(mimeType || '')
      ? mimeType.toLowerCase()
      : 'image/jpeg';
    const ext = cleanMime === 'image/png' ? 'png'
      : cleanMime === 'image/webp' ? 'webp'
      : cleanMime === 'image/heic' ? 'heic' : 'jpg';

    const buffer = Buffer.from(imageBase64, 'base64');
    if (!buffer.length || buffer.length > 10 * 1024 * 1024) {
      return res.status(413).json({ error: 'image_too_large' });
    }

    const caption = [
      '🧾 طلب روشتة جديد',
      '',
      `👤 الاسم: ${name}`,
      `📱 الهاتف: ${phone}`,
      `📍 العنوان: ${address}`,
      `🆔 رقم الطلب: ${orderId || '—'}`,
      '',
      '⏳ الحالة: طلب جديد'
    ].join('\n');

    const form = new FormData();
    form.append('chat_id', chatId);
    form.append('caption', caption);
    form.append('photo', new Blob([buffer], { type: cleanMime }), `prescription.${ext}`);

    const telegramRes = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
      method: 'POST',
      body: form
    });
    const result = await telegramRes.json();

    if (!telegramRes.ok || !result.ok) {
      console.error('Telegram API error:', result);
      return res.status(502).json({ error: 'telegram_error' });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('sendPrescriptionToTelegram error:', error);
    return res.status(500).json({ error: 'internal_error' });
  }
}
