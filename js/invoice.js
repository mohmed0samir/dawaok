import { firebaseConfig } from './firebase-config.js';

import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getFirestore,
  doc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const el =
  document.getElementById('mainContent');


const params =
  new URLSearchParams(
    window.location.search
  );

const orderId =
  params.get('order');


if (!orderId) {

  showNotFound();

} else {

  loadOrder(orderId);

}


/* ─────────────────────────────
   LOAD ORDER
───────────────────────────── */

function loadOrder(id) {

  try {

    onSnapshot(
      doc(db, 'orders', id),

      snap => {

        if (!snap.exists()) {

          showNotFound();

          return;

        }

        const data = {
          docId: snap.id,
          ...snap.data()
        };

        renderInvoice(data);

      },

      e => {

        el.innerHTML = `
          <div class="center-state">
            <div class="em">❌</div>
            <p>حصل خطأ: ${e.message}</p>
          </div>
        `;

      }
    );

  } catch (e) {

    el.innerHTML = `
      <div class="center-state">
        <div class="em">❌</div>
        <p>حصل خطأ: ${e.message}</p>
      </div>
    `;

  }

}


/* ─────────────────────────────
   NOT FOUND
───────────────────────────── */

function showNotFound() {

  el.innerHTML = `
    <div class="center-state">

      <div class="em">🧾</div>

      <h2
        style="
          color:var(--text);
          margin-bottom:8px;
        ">

        مفيش فاتورة

      </h2>

      <p>
        اتجه للمتجر وأتم طلبك أولاً
      </p>

      <br>

      <button
        class="btn btn-teal"
        onclick="location.href='/'"
        style="margin:auto;">

        🏪 روح للمتجر

      </button>

    </div>
  `;

}


/* ─────────────────────────────
   STATUS
───────────────────────────── */

function statusInfo(s) {

  return {

    pending: [
      'في الانتظار',
      'status-pending'
    ],

    confirmed: [
      'مؤكد',
      'status-confirmed'
    ],

    delivered: [
      'تم التوصيل',
      'status-delivered'
    ],

    cancelled: [
      'ملغي',
      'status-cancelled'
    ]

  }[s] || [
    '—',
    'status-pending'
  ];

}


/* ─────────────────────────────
   INVOICE
───────────────────────────── */

function renderInvoice(data) {

  const isRx =
    data.type === 'prescription';


  const status =
    data.status || 'pending';


  const [
    sLabel,
    sCls
  ] =
    statusInfo(status);


  /*
    للروشتة:
    medicineTotal = سعر الأدوية
    deliveryFee   = التوصيل
    grandTotal    = الإجمالي النهائي
  */

  let medicineTotal = 0;

  let delivery = 0;

  let grandTotal = 0;


  if (isRx) {

    medicineTotal =
      Number(
        data.medicineTotal ??
        data.total ??
        0
      );


    delivery =
      Number(
        data.deliveryFee ??
        0
      );


    grandTotal =
      Number(
        data.grandTotal ??
        (
          medicineTotal +
          delivery
        )
      );

  } else {

    medicineTotal =
      Number(
        data.total ??
        0
      );


    delivery = 25;


    grandTotal =
      medicineTotal +
      delivery;

  }


  const createdAt =
    data.createdAt?.toDate

      ? data.createdAt
          .toDate()
          .toLocaleString('ar-EG')

      : (
          data.createdAt ||
          new Date()
            .toLocaleString('ar-EG')
        );


  /* ─────────────────────────
     ITEMS
  ───────────────────────── */

  const itemsHTML =
    (data.items || [])
      .map(item => {

        const thumb =
          item.imageUrl

            ? `
              <img
                class="item-img"
                src="${item.imageUrl}"
                alt="${item.name}">
            `

            : `
              <span class="item-emoji">
                ${item.emoji || '💊'}
              </span>
            `;


        const priceCell =
          isRx

            ? (
                status === 'confirmed' ||
                status === 'delivered'

                  ? `${Number(item.price || 0)} ج`

                  : 'يحدده الصيدلي'
              )

            : `${Number(item.price || 0)} ج`;


        const itemTotal =
          Number(item.price || 0) *
          Number(item.qty || 1);


        const totalCell =
          isRx

            ? (
                status === 'confirmed' ||
                status === 'delivered'

                  ? `${itemTotal} ج`

                  : '—'
              )

            : `${itemTotal} ج`;


        return `
          <tr>

            <td>

              ${thumb}

              ${item.name}

            </td>


            <td class="qty-cell">

              ${item.qty || 1}

            </td>


            <td class="price-cell">

              ${priceCell}

            </td>


            <td class="total-cell">

              ${totalCell}

            </td>

          </tr>
        `;

      })
      .join('');


  /* ─────────────────────────
     PRESCRIPTION IMAGE
  ───────────────────────── */

  const rxBoxHTML =
    isRx &&
    data.prescriptionImageUrl

      ? `
        <div class="rx-box">

          <img
            src="${data.prescriptionImageUrl}"
            alt="روشتة">

          <div class="rx-note">

            📋 صورة الروشتة المرفوعة

            ${
              status === 'pending'

                ? `
                  <br>
                  الصيدلي بيراجعها
                  وبيحدد الأسعار والتوافر
                `

                : status === 'confirmed'

                  ? `
                    <br>
                    ✅ تم مراجعة الروشتة
                    وتحديد السعر
                  `

                  : `
                    <br>
                    حالة الطلب:
                    ${sLabel}
                  `
            }

          </div>

        </div>
      `

      : '';


  /* ─────────────────────────
     RX STATE
  ───────────────────────── */

  const rxPending =
    isRx &&
    status === 'pending';


  const rxConfirmed =
    isRx &&
    (
      status === 'confirmed' ||
      status === 'delivered'
    );


  /* ─────────────────────────
     BANNER
  ───────────────────────── */

  const bannerHTML =

    isRx

      ? `

        <div class="success-banner rx">

          <div class="success-icon">

            ${
              rxPending
                ? '⏳'
                : rxConfirmed
                  ? '✅'
                  : status === 'cancelled'
                    ? '❌'
                    : '🧾'
            }

          </div>


          <div class="success-text">

            <h3>

              ${
                rxPending

                  ? 'تم استلام روشتتك بنجاح!'

                  : rxConfirmed

                    ? 'تمت مراجعة الروشتة وتحديد السعر'

                    : status === 'delivered'

                      ? 'تم توصيل طلب الروشتة'

                      : status === 'cancelled'

                        ? 'تم إلغاء طلب الروشتة'

                        : 'تحديث على طلب الروشتة'
              }

            </h3>


            <p>

              ${
                rxPending

                  ? `
                    الصيدلي بيراجع الروشتة دلوقتي.
                    الصفحة دي هتتحدث تلقائياً
                    لما يحدد الأدوية والأسعار.
                  `

                  : rxConfirmed

                    ? `
                      تم تحديد الأدوية والسعر
                      ومصاريف التوصيل.
                      الإجمالي النهائي ظاهر أسفل الفاتورة.
                    `

                    : status === 'delivered'

                      ? `
                        تم توصيل الطلب بنجاح.
                        وتقدر ترجع تشوف الفاتورة
                        والروشتة في أي وقت.
                      `

                      : status === 'cancelled'

                        ? `
                          تم إلغاء الطلب.
                        `

                        : `
                          تقدر تتابع حالة طلبك
                          من نفس الصفحة.
                        `
              }

            </p>

          </div>

        </div>

      `

      : `

        <div class="success-banner">

          <div class="success-icon">
            🎉
          </div>

          <div class="success-text">

            <h3>
              تم استلام طلبك بنجاح!
            </h3>

            <p>
              فريقنا بيجهز طلبك دلوقتي
              — هتوصلك في أقرب وقت
            </p>

          </div>

        </div>

      `;


  /* ─────────────────────────
     TOTALS
  ───────────────────────── */

  const totalsHTML =

    isRx

      ? `

        <div class="inv-totals">

          <div class="inv-total-row">

            <span class="lbl">
              إجمالي الأدوية
            </span>

            <span class="amt">

              ${
                rxConfirmed

                  ? medicineTotal +
                    ' جنيه'

                  : 'في انتظار التسعير'
              }

            </span>

          </div>


          <div class="inv-total-row">

            <span class="lbl">
              رسوم التوصيل
            </span>

            <span class="amt">

              ${
                rxConfirmed

                  ? delivery +
                    ' جنيه'

                  : 'تحدد عند التأكيد'
              }

            </span>

          </div>


          <div class="inv-total-row grand">

            <span class="lbl">
              الإجمالي الكلي
            </span>

            <span class="amt">

              ${
                rxConfirmed

                  ? grandTotal +
                    ' جنيه'

                  : 'في انتظار مراجعة الصيدلي'
              }

            </span>

          </div>

        </div>

      `

      : `

        <div class="inv-totals">

          <div class="inv-total-row">

            <span class="lbl">
              المجموع الفرعي
            </span>

            <span class="amt">
              ${medicineTotal} جنيه
            </span>

          </div>


          <div class="inv-total-row">

            <span class="lbl">
              رسوم التوصيل
            </span>

            <span class="amt">
              ${delivery} جنيه
            </span>

          </div>


          <div class="inv-total-row">

            <span class="lbl">
              الضريبة
            </span>

            <span class="amt">
              0 جنيه
            </span>

          </div>


          <div class="inv-total-row grand">

            <span class="lbl">
              الإجمالي الكلي
            </span>

            <span class="amt">
              ${grandTotal} جنيه
            </span>

          </div>

        </div>

      `;


  /* ─────────────────────────
     FINAL HTML
  ───────────────────────── */

  el.innerHTML = `

    ${bannerHTML}

    ${rxBoxHTML}


    <div
      class="invoice"
      id="invoicePrint">

      <div class="inv-header">

        <div>

          <div class="inv-brand-name">
            💊 دواؤك
          </div>

          <div class="inv-brand-sub">
            صيدليتك الإلكترونية
          </div>

          <div
            class="inv-brand-sub"
            style="margin-top:6px;">

            📞 19998
            &nbsp;|&nbsp;
            dawaok.com

          </div>

        </div>


        <div style="text-align:center;">

          <div class="inv-badge">

            <div class="inv-badge-label">
              رقم الطلب
            </div>

            <div class="inv-badge-val">

              ${
                data.orderId ||
                data.docId.slice(0,10)
              }

            </div>

          </div>


          <div
            style="
              color:rgba(255,255,255,.4);
              font-size:11px;
              margin-top:8px;
            ">

            ${createdAt}

          </div>

        </div>

      </div>


      <div class="inv-body">

        <div class="inv-meta">

          <div class="inv-meta-block">

            <label>
              بيانات العميل
            </label>

            <div class="val">
              ${data.customer?.name || '—'}
            </div>

            <div class="val hl">
              📞 ${data.customer?.phone || '—'}
            </div>

            <div
              style="
                font-size:12px;
                color:#7a8fa8;
                margin-top:4px;
              ">

              📍
              ${data.customer?.address || '—'}

            </div>

          </div>


          <div
            class="inv-meta-block"
            style="text-align:left;">

            <label>
              تفاصيل الفاتورة
            </label>

            <div class="val">

              تاريخ:
              ${createdAt}

            </div>


            <div
              style="margin-top:8px;">

              <span
                class="inv-status-chip ${sCls}">

                ${sLabel}

              </span>

            </div>

          </div>

        </div>


        ${
          itemsHTML

            ? `

              <table class="inv-table">

                <thead>

                  <tr>

                    <th>
                      المنتج
                    </th>

                    <th
                      style="text-align:center;">

                      الكمية

                    </th>

                    <th
                      style="text-align:center;">

                      سعر الوحدة

                    </th>

                    <th
                      style="text-align:center;">

                      الإجمالي

                    </th>

                  </tr>

                </thead>


                <tbody>

                  ${itemsHTML}

                </tbody>

              </table>

            `

            : ''
        }


        ${totalsHTML}

      </div>


      <div class="inv-footer">

        <div>

          <div class="inv-footer-note">

            شكراً لثقتك في دواؤك 💙

          </div>

          <div class="inv-footer-note">

            هذه فاتورة إلكترونية معتمدة

          </div>

        </div>


        <div
          style="
            font-size:36px;
          ">

          🔲

        </div>

      </div>

    </div>

  `;

}
