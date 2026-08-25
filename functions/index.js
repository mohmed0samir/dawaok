const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");

const TELEGRAM_BOT_TOKEN = defineSecret("TELEGRAM_BOT_TOKEN");
const TELEGRAM_CHAT_ID = defineSecret("TELEGRAM_CHAT_ID");

exports.sendPrescriptionToTelegram = onRequest(
  {
    secrets: [TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID],
    cors: true,
    region: "us-central1"
  },
  async (req, res) => {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "POST only" });
    }

    try {
      const { name, phone, address, imageBase64, mimeType, orderId } = req.body || {};

      if (!name || !phone || !address || !imageBase64) {
        return res.status(400).json({ error: "missing_data" });
      }

      const token = TELEGRAM_BOT_TOKEN.value();
      const chatId = TELEGRAM_CHAT_ID.value();

      if (!token || !chatId) {
        return res.status(500).json({ error: "telegram_secrets_missing" });
      }

      const caption = [
        "🧾 طلب روشتة جديد",
        "",
        `👤 الاسم: ${name}`,
        `📱 الهاتف: ${phone}`,
        `📍 العنوان: ${address}`,
        `🆔 رقم الطلب: ${orderId || '—'}`,
        "",
        "⏳ الحالة: طلب جديد"
      ].join("\\n");

      const buffer = Buffer.from(imageBase64, "base64");
      const form = new FormData();
      form.append("chat_id", chatId);
      form.append("caption", caption);
      form.append(
        "photo",
        new Blob([buffer], { type: mimeType || "image/jpeg" }),
        "prescription.jpg"
      );

      const telegramRes = await fetch(
        `https://api.telegram.org/bot${token}/sendPhoto`,
        { method: "POST", body: form }
      );

      const result = await telegramRes.json();

      if (!telegramRes.ok || !result.ok) {
        console.error("Telegram API error:", result);
        return res.status(502).json({ error: "telegram_error" });
      }

      return res.status(200).json({ success: true });
    } catch (e) {
      console.error("sendPrescriptionToTelegram error:", e);
      return res.status(500).json({ error: "internal", message: String(e.message || e) });
    }
  }
);
