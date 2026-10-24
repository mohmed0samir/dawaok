import { describe, it, expect } from 'vitest';
import { formatAddr, statusLabel, translateAuthErr } from './utils.js';

describe('formatAddr', () => {
  it('formats a complete address with all fields', () => {
    const addr = {
      street: 'شارع الرئيسي',
      building: '5',
      floor: '3',
      apartment: '2',
      area: 'المهندسين',
      city: 'القاهرة',
      governorate: 'القاهرة',
      landmark: 'قرب المطعم'
    };
    expect(formatAddr(addr)).toBe('شارع الرئيسي، عمارة 5، دور 3، شقة 2، المهندسين، القاهرة، القاهرة، (قرب المطعم)');
  });

  it('omits empty fields', () => {
    const addr = {
      street: 'شارع النيل',
      building: '',
      floor: '',
      apartment: '',
      area: 'زمالك',
      city: 'القاهرة',
      governorate: 'القاهرة',
      landmark: ''
    };
    expect(formatAddr(addr)).toBe('شارع النيل، زمالك، القاهرة، القاهرة');
  });

  it('handles missing optional fields gracefully', () => {
    const addr = {
      street: 'شارع التحرير',
      area: 'وسط البلد',
      city: 'القاهرة',
      governorate: 'القاهرة'
    };
    expect(formatAddr(addr)).toBe('شارع التحرير، وسط البلد، القاهرة، القاهرة');
  });
});

describe('statusLabel', () => {
  it('returns pending label for new orders', () => {
    expect(statusLabel('pending', {})).toBe('طلب جديد / قيد المراجعة');
  });

  it('returns priced label', () => {
    expect(statusLabel('priced', {})).toBe('تم التسعير');
  });

  it('returns ready label', () => {
    expect(statusLabel('ready', {})).toBe('جاهز للتوصيل');
  });

  it('returns assigned label', () => {
    expect(statusLabel('assigned', {})).toBe('تم تعيين مندوب');
  });

  it('returns picked_up label', () => {
    expect(statusLabel('picked_up', {})).toBe('استلم المندوب الطلب');
  });

  it('returns out_for_delivery label', () => {
    expect(statusLabel('out_for_delivery', {})).toBe('جاري التوصيل');
  });

  it('returns confirmed label', () => {
    expect(statusLabel('confirmed', {})).toBe('مؤكد وجاهز للتوصيل');
  });

  it('returns delivered label', () => {
    expect(statusLabel('delivered', {})).toBe('تم التسليم');
  });

  it('returns cancelled label', () => {
    expect(statusLabel('cancelled', {})).toBe('ملغي');
  });

  it('returns special prescription cancelled message', () => {
    expect(statusLabel('cancelled', { type: 'prescription' })).toBe('تم إلغاء الروشتة — الدواء غير متاح في الوقت الحالي');
  });

  it('includes courier info when deliveredBy present for terminal statuses', () => {
    const order = { deliveredBy: { name: 'أحمد', phone: '0123456789' } };
    expect(statusLabel('delivered', order)).toBe('تم الاستلام من المندوب أحمد ورقمه 0123456789');
  });

  it('includes courier info from courier field when deliveredBy absent', () => {
    const order = { courier: { name: 'سارة', phone: '01987654321' } };
    expect(statusLabel('picked_up', order)).toBe('تم الاستلام من المندوب سارة ورقمه 01987654321');
  });

  it('returns dash for unknown status', () => {
    expect(statusLabel('unknown_status', {})).toBe('—');
  });

  it('does not include courier info for non-terminal statuses', () => {
    const order = { deliveredBy: { name: 'أحمد', phone: '0123456789' } };
    expect(statusLabel('pending', order)).toBe('طلب جديد / قيد المراجعة');
  });
});

describe('translateAuthErr', () => {
  it('translates email-already-in-use error', () => {
    expect(translateAuthErr({ code: 'auth/email-already-in-use' })).toBe('البريد ده متسجل قبل كده');
  });

  it('translates invalid-email error', () => {
    expect(translateAuthErr({ code: 'auth/invalid-email' })).toBe('البريد الإلكتروني مش صحيح');
  });

  it('translates user-not-found error', () => {
    expect(translateAuthErr({ code: 'auth/user-not-found' })).toBe('البيانات غلط');
  });

  it('translates invalid-credential error', () => {
    expect(translateAuthErr({ code: 'auth/invalid-credential' })).toBe('البيانات غلط');
  });

  it('translates wrong-password error', () => {
    expect(translateAuthErr({ code: 'auth/wrong-password' })).toBe('البيانات غلط');
  });

  it('translates weak-password error', () => {
    expect(translateAuthErr({ code: 'auth/weak-password' })).toBe('كلمة المرور ضعيفة');
  });

  it('returns message for unknown error codes', () => {
    expect(translateAuthErr({ code: 'auth/network-request-failed', message: 'شبكة غير متاحة' })).toBe('شبكة غير متاحة');
  });

  it('returns fallback for error without code or message', () => {
    expect(translateAuthErr({})).toBe('حصل خطأ');
  });
});
