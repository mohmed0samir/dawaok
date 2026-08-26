const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const crypto = require("crypto");

if (!admin.apps.length) admin.initializeApp();
const bucket = admin.storage().bucket();

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

      const cleanMime = /^image\/(jpeg|jpg|png|webp|heic)$/i.test(mimeType || "")
        ? mimeType.toLowerCase()
        : "image/jpeg";
      const ext = cleanMime === "image/png" ? "png" : cleanMime === "image/webp" ? "webp" : cleanMime === "image/heic" ? "heic" : "jpg";
      const buffer = Buffer.from(imageBase64, "base64");

      if (!buffer.length || buffer.length > 10 * 1024 * 1024) {
        return res.status(413).json({ error: "image_too_large" });
      }

      // Upload from the server instead of the browser. This removes the
      // Firebase Storage CORS problem that was blocking prescription orders.
      const filePath = `prescriptions/${Date.now()}-${crypto.randomUUID()}.${ext}`;
      const file = bucket.file(filePath);
      const downloadToken = crypto.randomUUID();

      await file.save(buffer, {
        resumable: false,
        metadata: {
          contentType: cleanMime,
          metadata: {
            firebaseStorageDownloadTokens: downloadToken
          }
        }
      });

      const prescriptionImageUrl =
        `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(filePath)}?alt=media&token=${downloadToken}`;

      const caption = [
        "🧾 طلب روشتة جديد",
        "",
        `👤 الاسم: ${name}`,
        `📱 الهاتف: ${phone}`,
        `📍 العنوان: ${address}`,
        `🆔 رقم الطلب: ${orderId || '—'}`,
        "",
        "⏳ الحالة: طلب جديد"
      ].join("\n");

      const form = new FormData();
      form.append("chat_id", chatId);
      form.append("caption", caption);
      form.append(
        "photo",
        new Blob([buffer], { type: cleanMime }),
        `prescription.${ext}`
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

      return res.status(200).json({ success: true, prescriptionImageUrl });
    } catch (e) {
      console.error("sendPrescriptionToTelegram error:", e);
      return res.status(500).json({ error: "internal", message: String(e.message || e) });
    }
  }
);
