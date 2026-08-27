import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

function getAdminApp() {
  if (getApps().length) return getApps()[0];
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '{}');
  if (!serviceAccount.project_id || !serviceAccount.client_email || !serviceAccount.private_key) {
    throw new Error('firebase_service_account_missing');
  }
  return initializeApp({ credential: cert(serviceAccount) });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    const authorization = String(req.headers.authorization || '');
    if (!authorization.startsWith('Bearer ')) return res.status(401).json({ error: 'unauthorized' });
    const app = getAdminApp();
    const auth = getAuth(app);
    const db = getFirestore(app);
    const adminUser = await auth.verifyIdToken(authorization.slice(7));
    const adminProfile = await db.collection('users').doc(adminUser.uid).get();
    if (!adminProfile.exists || adminProfile.data().role !== 'admin') return res.status(403).json({ error: 'admin_only' });

    const courierUid = String(req.body?.uid || '').trim();
    if (!courierUid || courierUid === adminUser.uid) return res.status(400).json({ error: 'invalid_courier' });
    await auth.deleteUser(courierUid);
    await db.collection('deliveryAgents').doc(courierUid).delete();
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('deleteCourier error:', error);
    if (error.code === 'auth/user-not-found') return res.status(404).json({ error: 'courier_not_found' });
    if (error.message === 'firebase_service_account_missing') return res.status(500).json({ error: error.message });
    if (error.code === 'auth/id-token-expired' || error.code === 'auth/argument-error') return res.status(401).json({ error: 'unauthorized' });
    return res.status(500).json({ error: 'delete_failed' });
  }
}
