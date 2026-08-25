/**
 * scanImage — Cloud Function
 * ══════════════════════════════════════════════
 * ليه محتاجين الفنكشن دي أصلاً؟
 * الكود القديم كان بينادي https://api.anthropic.com/v1/messages
 * *من المتصفح مباشرة* من غير ما يبعت مفتاح API خالص — عشان كده كانت
 * القراءة من الصورة مش شغالة (٤٠١ Unauthorized). وحتى لو حطينا المفتاح
 * في كود admin.html، أي حد يفتح "Inspect" في المتصفح هياخده ويستخدمه
 * على حسابنا. الحل الصح: المفتاح يتخزن كـ Secret على السيرفر (هنا)،
 * والمتصفح يكلم الفنكشن دي بس، والفنكشن هي اللي تكلم Claude بالمفتاح.
 */

const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");

const ANTHROPIC_API_KEY = defineSecret("ANTHROPIC_API_KEY");

const PRODUCT_PROMPT =
  'انت خبير صيدلاني. اقرأ الصورة واستخرج اسم الدواء والماركة والفئة. ' +
  'الفئة لازم تكون واحدة من: أدوية | فيتامينات | عناية بالبشرة | صحة الطفل | مستلزمات طبية | تكميل عضلات | عروض. ' +
  'رد بـ JSON فقط بدون أي نص إضافي: {"name":"...","brand":"...","category":"..."}';

const PRESCRIPTION_PROMPT =
  'انت صيدلي خبير. دي صورة روشتة طبية (خط دكتور ممكن يكون صعب القراءة). ' +
  'اقرأ كل الأدوية المكتوبة واستخرجهم في قائمة. لو في جرعة أو تعليمات اكتبها في note. ' +
  'لو مش قادر تقرأ اسم دواء بوضوح، اكتب أقرب تخمين ومتتجاهلوش. ' +
  'رد بـ JSON فقط بدون أي نص إضافي وبدون Markdown: ' +
  '{"medicines":[{"name":"...","note":"..."}],"patientNote":"..."}';

exports.scanImage = onRequest(
  { secrets: [ANTHROPIC_API_KEY], cors: true, region: "us-central1" },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ error: "POST only" });
      return;
    }

    try {
      const { mode, imageBase64, mimeType } = req.body || {};
      if (!imageBase64) {
        res.status(400).json({ error: "imageBase64 required" });
        return;
      }
      const prompt = mode === "prescription" ? PRESCRIPTION_PROMPT : PRODUCT_PROMPT;

      const apiRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY.value(),
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 500,
          messages: [
            {
              role: "user",
              content: [
                { type: "image", source: { type: "base64", media_type: mimeType || "image/jpeg", data: imageBase64 } },
                { type: "text", text: prompt }
              ]
            }
          ]
        })
      });

      if (!apiRes.ok) {
        const errText = await apiRes.text();
        console.error("Anthropic API error:", apiRes.status, errText);
        res.status(502).json({ error: "anthropic_error", status: apiRes.status });
        return;
      }

      const data = await apiRes.json();
      const raw = (data.content?.[0]?.text || "").replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(raw);
      res.status(200).json(parsed);
    } catch (e) {
      console.error("scanImage error:", e);
      res.status(500).json({ error: "internal", message: String(e.message || e) });
    }
  }
);
