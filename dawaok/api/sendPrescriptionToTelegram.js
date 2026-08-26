export default async function handler(req, res) {
  const allowedOrigin = 'https://dawaok.vercel.app';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  try {
    const { name, phone, address, location, imageBase64, mimeType, orderId, orderDocId } = req.body || {};
    if (!name || !phone || !address || !imageBase64 || !orderId || !orderDocId) {
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

    const adminUrl = `https://dawaok.vercel.app/admin?order=${encodeURIComponent(orderDocId)}`;
    const keyboard = {
      inline_keyboard: [[
        { text: '✏️ تعديل الطلب', url: adminUrl }
      ]]
    };

    // الرسالة الأولى: بيانات الطلب + زر يفتح الأدمن على نفس الطلب بعد تسجيل الدخول.
    const orderMessage = [
      '🧾 طلب روشتة جديد',
      '',
      `👤 الاسم: ${name}`,
      `📱 الهاتف: ${phone}`,
      `📍 العنوان: ${address}`,
      location?.lat != null && location?.lng != null ? `🗺️ الموقع: https://www.google.com/maps/search/?api=1&query=${location.lat},${location.lng}` : '',
      `🆔 رقم الطلب: ${orderId}`,
      '',
      '⏳ الحالة: في انتظار مراجعة الصيدلي'
    ].join('\n');

    const msgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: orderMessage,
        reply_markup: keyboard,
        disable_web_page_preview: true
      })
    });
    const msgResult = await msgRes.json();
    if (!msgRes.ok || !msgResult.ok) {
      console.error('Telegram sendMessage error:', msgResult);
      return res.status(502).json({ error: 'telegram_message_error' });
    }

    // الرسالة الثانية: صورة الروشتة نفسها بتنسيق منفصل.
    const photoCaption = [
      '📷 صورة الروشتة',
      '',
      `👤 الاسم: ${name}`,
      `📱 الهاتف: ${phone}`,
      `📍 العنوان: ${address}`,
      `🆔 رقم الطلب: ${orderId}`,
      '',
      '⏳ الحالة: طلب جديد'
    ].join('\n');

    const form = new FormData();
    form.append('chat_id', chatId);
    form.append('caption', photoCaption);
    form.append('photo', new Blob([buffer], { type: cleanMime }), `prescription.${ext}`);

    const telegramRes = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
      method: 'POST',
      body: form
    });
    const result = await telegramRes.json();

    if (!telegramRes.ok || !result.ok) {
      console.error('Telegram sendPhoto error:', result);
      return res.status(502).json({ error: 'telegram_photo_error' });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('sendPrescriptionToTelegram error:', error);
    return res.status(500).json({ error: 'internal_error' });
  }
}
