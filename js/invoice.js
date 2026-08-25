import { firebaseConfig } from './firebase-config.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

const el = document.getElementById('mainContent');

const params  = new URLSearchParams(window.location.search);
const orderId = params.get('order');

if (!orderId) {
  showNotFound();
} else {
  loadOrder(orderId);
}

async function loadOrder(id) {
  try {
    const snap = await getDoc(doc(db, 'orders', id));
    if (!snap.exists()) { showNotFound(); return; }
    const data = { docId: snap.id, ...snap.data() };
    renderInvoice(data);
  } catch (e) {
    el.innerHTML = `<div class="center-state"><div class="em">❌</div><p>حصل خطأ: ${e.message}</p></div>`;
  }
}

function showNotFound() {
  el.innerHTML = `
    <div class="center-state">
      <div class="em">🧾</div>
      <h2 style="color:var(--text);margin-bottom:8px;">مفيش فاتورة</h2>
      <p>اتجه للمتجر وأتم طلبك أولاً</p><br>
      <button class="btn btn-teal" onclick="location.href='https://exquisite-entremet-a37eef.netlify.app/'" style="margin:auto;">🏪 روح للمتجر</button>
    </div>`;
}

function statusInfo(s) {
  return {
    pending:   ['في الانتظار', 'status-pending'],
    confirmed: ['مؤكد', 'status-confirmed'],
    delivered: ['تم التوصيل', 'status-delivered'],
    cancelled: ['ملغي', 'status-cancelled']
  }[s] || ['—', 'status-pending'];
}

function renderInvoice(data) {
  const isRx = data.type === 'prescription';
  const [sLabel, sCls] = statusInfo(data.status || 'pending');
  const subtotal   = Number(data.total || 0);
  const delivery   = Number(data.deliveryFee ?? (isRx ? 25 : 25));
  const grandTotal = data.grandTotal != null ? Number(data.grandTotal) : (subtotal + delivery);
  const createdAt  = data.createdAt?.toDate
    ? data.createdAt.toDate().toLocaleString('ar-EG')
    : (data.createdAt || new Date().toLocaleString('ar-EG'));

  const itemsHTML = (data.items || []).map(item => {
    const thumb = item.imageUrl
      ? `<img class="item-img" src="${item.imageUrl}" alt="${item.name}">`
      : `<span class="item-emoji">${item.emoji || '💊'}</span>`;
    const priceCell = isRx ? (item.price != null ? `${item.price} ج` : 'يحدده الصيدلي') : `${item.price} ج`;
    const totalCell = isRx ? (item.price != null ? `${item.price * item.qty} ج` : '—') : `${item.price * item.qty} ج`;
    return `<tr>
      <td>${thumb}${item.name}</td>
      <td class="qty-cell">${item.qty}</td>
      <td class="price-cell">${priceCell}</td>
      <td class="total-cell">${totalCell}</td>
    </tr>`;
  }).join('');

  const rxBoxHTML = isRx && data.prescriptionImageUrl ? `
    <div class="rx-box">
      <img src="${data.prescriptionImageUrl}" alt="روشتة">
      <div class="rx-note">📋 صورة الروشتة اللي اترفعت — الصيدلي هيراجعها ويأكد الأسعار والتوافر</div>
    </div>` : '';

  const bannerHTML = isRx ? `
    <div class="success-banner rx">
      <div class="success-icon">🧾</div>
      <div class="success-text">
        <h3>تم استلام روشتتك بنجاح!</h3>
        <p>${data.total != null ? 'تمت مراجعة الروشتة وتحديد السعر والتوصيل. تقدر تراجع الفاتورة من طلباتك في أي وقت.' : 'الصيدلي بيراجعها دلوقتي وهيحدد السعر والتوصيل. تقدر ترجع للطلب من «طلباتي» في أي وقت.'}</p>
      </div>
    </div>` : `
    <div class="success-banner">
      <div class="success-icon">🎉</div>
      <div class="success-text">
        <h3>تم استلام طلبك بنجاح!</h3>
        <p>فريقنا بيجهز طلبك دلوقتي — هتوصلك في أقرب وقت</p>
      </div>
    </div>`;

  const totalsHTML = isRx ? `
    <div class="inv-totals">
      ${data.total != null ? `<div class="inv-total-row"><span class="lbl">إجمالي الأدوية</span><span class="amt">${subtotal} جنيه</span></div><div class="inv-total-row"><span class="lbl">رسوم التوصيل</span><span class="amt">${delivery} جنيه</span></div><div class="inv-total-row grand"><span class="lbl">الإجمالي الكلي</span><span class="amt">${grandTotal} جنيه</span></div>` : `<div class="inv-total-row"><span class="lbl">حالة التسعير</span><span class="amt">في انتظار مراجعة الصيدلي</span></div>`} 
    </div>` : `
    <div class="inv-totals">
      <div class="inv-total-row"><span class="lbl">المجموع الفرعي</span><span class="amt">${subtotal} جنيه</span></div>
      <div class="inv-total-row"><span class="lbl">رسوم التوصيل</span><span class="amt">${delivery} جنيه</span></div>
      <div class="inv-total-row"><span class="lbl">الضريبة</span><span class="amt">0 جنيه</span></div>
      <div class="inv-total-row grand"><span class="lbl">الإجمالي الكلي</span><span class="amt">${grandTotal} جنيه</span></div>
    </div>`;

  el.innerHTML = `
    ${bannerHTML}
    ${rxBoxHTML}
    <div class="invoice" id="invoicePrint">
      <div class="inv-header">
        <div>
          <div class="inv-brand-name">💊 دواؤك</div>
          <div class="inv-brand-sub">صيدليتك الإلكترونية</div>
          <div class="inv-brand-sub" style="margin-top:6px;">📞 19998 &nbsp;|&nbsp; dawaok.com</div>
        </div>
        <div style="text-align:center;">
          <div class="inv-badge">
            <div class="inv-badge-label">رقم الطلب</div>
            <div class="inv-badge-val">${data.orderId || data.docId.slice(0,10)}</div>
          </div>
          <div style="color:rgba(255,255,255,.4);font-size:11px;margin-top:8px;">${createdAt}</div>
        </div>
      </div>
      <div class="inv-body">
        <div class="inv-meta">
          <div class="inv-meta-block">
            <label>بيانات العميل</label>
            <div class="val">${data.customer?.name || '—'}</div>
            <div class="val hl">📞 ${data.customer?.phone || '—'}</div>
            <div style="font-size:12px;color:#7a8fa8;margin-top:4px;">📍 ${data.customer?.address || '—'}</div>
          </div>
          <div class="inv-meta-block" style="text-align:left;">
            <label>تفاصيل الفاتورة</label>
            <div class="val">تاريخ: ${createdAt}</div>
            <div style="margin-top:8px;"><span class="inv-status-chip ${sCls}">${sLabel}</span></div>
          </div>
        </div>
        ${itemsHTML ? `<table class="inv-table">
          <thead><tr><th>المنتج</th><th style="text-align:center;">الكمية</th><th style="text-align:center;">سعر الوحدة</th><th style="text-align:center;">الإجمالي</th></tr></thead>
          <tbody>${itemsHTML}</tbody>
        </table>` : ''}
        ${totalsHTML}
      </div>
      <div class="inv-footer">
        <div>
          <div class="inv-footer-note">شكراً لثقتك في دواؤك 💙</div>
          <div class="inv-footer-note">هذه فاتورة إلكترونية معتمدة</div>
        </div>
        <div style="font-size:36px;">🔲</div>
      </div>
    </div>`;
}
