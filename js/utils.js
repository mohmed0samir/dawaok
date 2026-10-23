export function formatAddr(a) {
  const parts = [a.street];
  if (a.building) parts.push(`عمارة ${a.building}`);
  if (a.floor) parts.push(`دور ${a.floor}`);
  if (a.apartment) parts.push(`شقة ${a.apartment}`);
  if (a.area) parts.push(a.area);
  if (a.city) parts.push(a.city);
  if (a.governorate) parts.push(a.governorate);
  if (a.landmark) parts.push(`(${a.landmark})`);
  return parts.filter(Boolean).join('، ');
}

export function statusLabel(s, order) {
  if (s === 'cancelled' && order?.type === 'prescription') {
    return '❌ تم إلغاء الروشتة — الدواء غير متاح في الوقت الحالي';
  }
  if (['picked_up', 'out_for_delivery', 'delivered'].includes(s)) {
    const courier = order?.deliveredBy || order?.courier;
    if (courier) {
      return `✅ تم الاستلام من المندوب ${courier.name || '—'} ورقمه ${courier.phone || '—'}`;
    }
  }
  return ({ pending: '🟡 طلب جديد / قيد المراجعة', priced: '🟢 تم التسعير', ready: '🔵 جاهز للتوصيل', assigned: '🟣 تم تعيين مندوب', picked_up: '📦 استلم المندوب الطلب', out_for_delivery: '🟠 جاري التوصيل', confirmed: '✅ مؤكد وجاهز للتوصيل', delivered: '✅ تم التسليم', cancelled: '❌ ملغي' })[s] || '—';
}

export function translateAuthErr(e) {
  const c = e.code || '';
  if (c.includes('email-already-in-use')) return 'البريد ده متسجل قبل كده';
  if (c.includes('invalid-email')) return 'البريد الإلكتروني مش صحيح';
  if (c.includes('user-not-found') || c.includes('invalid-credential') || c.includes('wrong-password')) return 'البيانات غلط';
  if (c.includes('weak-password')) return 'كلمة المرور ضعيفة';
  return e.message || 'حصل خطأ';
}
