export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  try {
    const {
      orderDocId,
      orderId,
      name,
      phone,
      address,
      imageBase64,
      mimeType,
      siteUrl
    } = req.body || {};

    if (!orderDocId || !orderId || !name || !phone || !address || !imageBase64) {
      return res.status(400).json({ error: "missing_data" });
    }

    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
      console.error("Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID");
      return res.status(500).json({ error: "telegram_config_missing" });
    }

    const safeSiteUrl = String(siteUrl || "").replace(/\/+$/, "");
    const invoiceUrl = safeSiteUrl
      ? `${safeSiteUrl}/invoice.html?order=${encodeURIComponent(orderDocId)}`
      : null;

    const caption = [
      "🧾 طلب روشتة جديد",
      "",
      `🔢 رقم الطلب: ${orderId}`,
      `👤 الاسم: ${name}`,
      `📱 الهاتف: ${phone}`,
      `📍 العنوان: ${address}`,
      "",
      "⏳ الحالة: في انتظار مراجعة الصيدلي",
      "💰 السعر: لم يتم تحديده بعد"
    ].join("\n");

    const buffer = Buffer.from(imageBase64, "base64");

    const form = new FormData();
    form.append("chat_id", chatId);
    form.append("caption", caption);
    form.append(
      "photo",
      new Blob([buffer], { type: mimeType || "image/jpeg" }),
      "prescription.jpg"
    );

    if (invoiceUrl) {
      form.append(
        "reply_markup",
        JSON.stringify({
          inline_keyboard: [
            [{ text: "🧾 فتح فاتورة / متابعة الطلب", url: invoiceUrl }]
          ]
        })
      );
    }

    const telegramRes = await fetch(
      `https://api.telegram.org/bot${token}/sendPhoto`,
      {
        method: "POST",
        body: form
      }
    );

    const result = await telegramRes.json();

    if (!telegramRes.ok || !result.ok) {
      console.error("Telegram API error:", result);
      return res.status(502).json({ error: "telegram_error" });
    }

    return res.status(200).json({
      success: true,
      telegramMessageId: result.result?.message_id || null
    });
  } catch (error) {
    console.error("sendPrescriptionToTelegram error:", error);
    return res.status(500).json({
      error: "internal",
      message: String(error?.message || error)
    });
  }
}
