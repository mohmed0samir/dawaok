import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

function getAdminApp() {
  if (getApps().length) return getApps()[0];
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '{}');
  if (!serviceAccount.project_id || !serviceAccount.client_email || !serviceAccount.private_key) throw new Error('firebase_service_account_missing');
  return initializeApp({ credential: cert(serviceAccount) });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    const authorization = String(req.headers.authorization || '');
    if (!authorization.startsWith('Bearer ')) return res.status(401).json({ error: 'unauthorized' });
    const app = getAdminApp();
    const user = await getAuth(app).verifyIdToken(authorization.slice(7));
    const orderId = String(req.body?.orderDocId || '').trim();
    const orderSnap = await getFirestore(app).collection('orders').doc(orderId).get();
    if (!orderSnap.exists || orderSnap.data().userId !== user.uid) return res.status(403).json({ error: 'order_access_denied' });
    const order = orderSnap.data();
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!token || !chatId) return res.status(500).json({ error: 'telegram_env_missing' });
    const message = [
      '📦 طلب جديد',
      '',
      `🆔 رقم الطلب: ${order.orderId || orderId}`,
      `👤 العميل: ${order.customer?.name || '—'}`,
      `📱 الهاتف: ${order.customer?.phone || '—'}`,
      `📍 العنوان: ${order.customer?.address || '—'}`,
      `💰 الإجمالي: ${order.grandTotal ?? order.total ?? 'يحدد لاحقًا'} جنيه`
    ].join('\n');
    const telegramResponse = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message, disable_web_page_preview: true })
    });
    const result = await telegramResponse.json();
    if (!telegramResponse.ok || !result.ok) return res.status(502).json({ error: 'telegram_message_error' });
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('notifyNewOrder error:', error);
    return res.status(500).json({ error: 'notification_failed' });
  }
}
