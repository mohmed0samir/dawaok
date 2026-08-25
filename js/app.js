import { firebaseConfig } from './firebase-config.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, onSnapshot, addDoc, doc, setDoc, getDoc, getDocs,
  serverTimestamp, query, orderBy, deleteDoc, updateDoc, writeBatch, where
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged, updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

const app     = initializeApp(firebaseConfig);
const db      = getFirestore(app);
const auth    = getAuth(app);
const storage = getStorage(app);

// ══════════════════════════════════════════════
// STATE
// ══════════════════════════════════════════════
let allProducts = [];
let cart = JSON.parse(localStorage.getItem('cart') || '[]');
let currentCat = '';
let currentUser = null;
let myAddresses = [];
let selectedAddrId = null;
let editingAddrId = null;
let unsubMyOrders = null;

function rememberOrderId(id) {
  const ids = JSON.parse(localStorage.getItem('myOrderIds') || '[]');
  if (!ids.includes(id)) ids.unshift(id);
  localStorage.setItem('myOrderIds', JSON.stringify(ids.slice(0, 30)));
}

function orderInvoiceUrl(id) {
  return 'invoice?order=' + encodeURIComponent(id);
}

function statusLabel(s) {
  return ({pending:'⏳ في انتظار المراجعة', confirmed:'✅ مؤكد وجاهز للتوصيل', delivered:'🚚 تم التوصيل', cancelled:'❌ ملغي'})[s] || '—';
}

async function loadMyOrders() {
  const el = document.getElementById(currentUser ? 'myOrdersList' : 'guestOrdersList');
  if (!el) return;
  try {
    let docs = [];
    if (currentUser) {
      const snap = await getDocs(query(collection(db, 'orders'), where('userId', '==', currentUser.uid)));
      docs = snap.docs.map(d => ({id:d.id, ...d.data()}));
    } else {
      const ids = JSON.parse(localStorage.getItem('myOrderIds') || '[]');
      const snaps = await Promise.all(ids.map(id => getDoc(doc(db, 'orders', id))));
      docs = snaps.filter(s => s.exists()).map(s => ({id:s.id, ...s.data()}));
    }
    docs.sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    if (!docs.length) {
      el.innerHTML = '<div class="account-empty" style="padding:18px;"><div class="em">📦</div><p>مفيش طلبات لسه</p></div>';
      return;
    }
    const active = docs.filter(x => !['delivered','cancelled'].includes(x.status));
    const old = docs.filter(x => ['delivered','cancelled'].includes(x.status));
    const card = x => {
      const isRx = x.type === 'prescription';
      const price = x.total != null ? `${x.grandTotal != null ? x.grandTotal : x.total} جنيه` : 'في انتظار التسعير';
      return `<div class="my-order-card">
        <div class="my-order-top"><b>${isRx?'🧾 روشتة':'🛒 منتجات'}</b><span>${statusLabel(x.status)}</span></div>
        <div class="my-order-id">${x.orderId || x.id.slice(0,10)}</div>
        <div class="my-order-price">${price}</div>
        <button class="add-addr-btn" onclick="window.openOrderInvoice('${x.id}')">🧾 عرض الفاتورة / الطلب</button>
      </div>`;
    };
    el.innerHTML = (active.length ? `<div class="account-section-title"><span>🟢 الطلبات الحالية</span></div>${active.map(card).join('')}` : '')
      + (old.length ? `<div class="account-section-title" style="margin-top:14px;"><span>📚 الطلبات السابقة</span></div>${old.map(card).join('')}` : '');
  } catch (e) {
    console.error(e);
    el.innerHTML = '<div style="color:var(--danger);font-size:12px;padding:12px;">تعذر تحميل الطلبات</div>';
  }
}

window.openOrderInvoice = id => { window.location.href = orderInvoiceUrl(id); };

// ══════════════════════════════════════════════
// PRODUCTS (realtime)
// ══════════════════════════════════════════════
onSnapshot(collection(db, 'products'), snap => {
  allProducts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  renderProducts();
});

function renderProducts() {
  const q = document.getElementById('searchInput').value.trim().toLowerCase();
  let list = allProducts.filter(p => {
    const matchCat = !currentCat || p.category === currentCat;
    const matchQ   = !q || p.name.toLowerCase().includes(q) || (p.brand||'').toLowerCase().includes(q);
    return matchCat && matchQ;
  });
  const grid = document.getElementById('productsGrid');
  document.getElementById('productsCount').textContent = list.length + ' منتج';

  if (!list.length) {
    grid.innerHTML = `<div class="empty-products"><div class="em">🔍</div><p>مفيش منتجات هنا دلوقتي</p></div>`;
    return;
  }

  grid.innerHTML = list.map(p => {
    const inStock = p.stock > 0;
    const badgeHtml = p.discount ? `<span class="product-badge">-${p.discount}%</span>`
      : p.isNew ? `<span class="product-badge new">جديد</span>` : '';
    const oldPrice = p.discount ? `<div class="product-old">${p.price} جنيه</div>` : '';
    const finalPrice = p.discount ? Math.round(p.price * (1 - p.discount/100)) : p.price;
    return `
    <div class="product-card ${!inStock ? 'out-of-stock' : ''}">
      <div class="product-img" style="${p.imageUrl ? 'background:#1a2940;' : ''}">
        ${p.imageUrl
          ? `<img src="${p.imageUrl}" style="width:110px;height:110px;object-fit:contain;border-radius:8px;" alt="${p.name}">`
          : (p.emoji || '💊')}
        ${badgeHtml}
        ${!inStock ? '<div class="out-badge">نفد المخزون</div>' : ''}
      </div>
      <div class="product-body">
        <div class="product-brand">${p.brand || ''}</div>
        <div class="product-name">${p.name}</div>
        <div class="product-foot">
          <div>
            <div class="product-price">${finalPrice} جنيه</div>
            ${oldPrice}
          </div>
          <button class="add-btn" onclick="window.addToCart('${p.id}')">+</button>
        </div>
      </div>
    </div>`;
  }).join('');
}
window.filterProducts = renderProducts;

window.filterCat = (cat) => {
  currentCat = cat;
  document.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('active'));
  event.target.classList.add('active');
  renderProducts();
};

// ══════════════════════════════════════════════
// CART
// ══════════════════════════════════════════════
window.addToCart = (id) => {
  const p = allProducts.find(x => x.id === id);
  if (!p) return;
  const idx = cart.findIndex(x => x.id === id);
  if (idx > -1) cart[idx].qty++;
  else cart.push({ id, name: p.name, emoji: p.emoji || '💊', imageUrl: p.imageUrl||null, price: p.discount ? Math.round(p.price*(1-p.discount/100)) : p.price, qty: 1 });
  saveCart();
  toast(`✅ تم إضافة ${p.name}`);
};

window.changeQty = (id, delta) => {
  const idx = cart.findIndex(x => x.id === id);
  if (idx === -1) return;
  cart[idx].qty += delta;
  if (cart[idx].qty <= 0) cart.splice(idx, 1);
  saveCart();
  renderCart();
};

window.removeItem = (id) => {
  cart = cart.filter(x => x.id !== id);
  saveCart();
  renderCart();
};

function saveCart() {
  localStorage.setItem('cart', JSON.stringify(cart));
  document.getElementById('cartBadge').textContent = cart.reduce((s,x) => s+x.qty, 0);
}

function renderCart() {
  const el = document.getElementById('cartItems');
  const footer = document.getElementById('cartFooter');
  if (!cart.length) {
    el.innerHTML = `<div class="cart-empty"><div class="em">🛒</div><p>سلتك فارغة</p></div>`;
    footer.style.display = 'none';
    return;
  }
  footer.style.display = 'block';
  el.innerHTML = cart.map(item => `
    <div class="cart-item">
      <div class="cart-item-emoji">${item.emoji}</div>
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-price">${item.price * item.qty} جنيه</div>
        <div class="qty-ctrl">
          <button class="qty-btn" onclick="changeQty('${item.id}',-1)">−</button>
          <span class="qty-num">${item.qty}</span>
          <button class="qty-btn" onclick="changeQty('${item.id}',1)">+</button>
        </div>
      </div>
      <button class="remove-btn" onclick="removeItem('${item.id}')">🗑</button>
    </div>
  `).join('');
  const total = cart.reduce((s,x) => s + x.price*x.qty, 0);
  document.getElementById('cartTotal').textContent = total + ' جنيه';
  renderSavedAddrPicker();
}

window.openCart = () => {
  closeAccount(false);
  renderCart();
  prefillCheckoutFromProfile();
  document.getElementById('overlay').classList.add('open');
  document.getElementById('drawer').classList.add('open');
};
window.closeCart = () => {
  document.getElementById('drawer').classList.remove('open');
  maybeCloseOverlay();
};
window.closeAllPanels = () => {
  document.getElementById('drawer').classList.remove('open');
  document.getElementById('accountDrawer').classList.remove('open');
  document.getElementById('overlay').classList.remove('open');
};
function maybeCloseOverlay() {
  const anyOpen = document.getElementById('drawer').classList.contains('open') ||
                  document.getElementById('accountDrawer').classList.contains('open');
  if (!anyOpen) document.getElementById('overlay').classList.remove('open');
}

// address picker inside cart (only if logged in with saved addresses)
function renderSavedAddrPicker() {
  const wrap = document.getElementById('savedAddrPicker');
  const list = document.getElementById('savedAddrList');
  if (!currentUser || !myAddresses.length) { wrap.style.display = 'none'; return; }
  wrap.style.display = 'block';
  list.innerHTML = myAddresses.map(a => `
    <div class="saved-addr-pick ${a.id===selectedAddrId?'sel':''}" onclick="window.pickAddr('${a.id}')">
      <b>${a.label||'عنوان'}</b> ${a.isDefault?'⭐':''}<br>
      ${formatAddr(a)}
    </div>
  `).join('') + `<div class="saved-addr-pick ${selectedAddrId===null?'sel':''}" onclick="window.pickAddr(null)"><b>✍️ عنوان تاني (اكتبه تحت)</b></div>`;
}
window.pickAddr = (id) => {
  selectedAddrId = id;
  renderSavedAddrPicker();
  if (id) {
    const a = myAddresses.find(x => x.id === id);
    document.getElementById('custAddress').value = formatAddr(a);
  } else {
    document.getElementById('custAddress').value = '';
  }
};

function formatAddr(a) {
  return [a.street, `عمارة ${a.building||''}`, a.floor?`دور ${a.floor}`:'', a.apartment?`شقة ${a.apartment}`:'', a.area, a.city, a.governorate, a.landmark?`(${a.landmark})`:'']
    .filter(Boolean).join('، ');
}

function prefillCheckoutFromProfile() {
  if (!currentUser) return;
  document.getElementById('custName').value = document.getElementById('profName').textContent || '';
  const def = myAddresses.find(a => a.isDefault) || myAddresses[0];
  if (def) { selectedAddrId = def.id; document.getElementById('custAddress').value = formatAddr(def); }
}

// ══════════════════════════════════════════════
// PLACE ORDER
// ══════════════════════════════════════════════
window.placeOrder = async () => {
  const name    = document.getElementById('custName').value.trim();
  const phone   = document.getElementById('custPhone').value.trim();
  const address = document.getElementById('custAddress').value.trim();
  if (!name || !phone || !address) { toast('⚠️ اكتب اسمك وهاتفك وعنوانك'); return; }
  if (!cart.length) { toast('⚠️ السلة فارغة'); return; }

  const total = cart.reduce((s,x) => s + x.price*x.qty, 0);
  const orderId = 'ORD-' + Date.now();

  try {
    const ref = await addDoc(collection(db, 'orders'), {
      orderId,
      type: 'products',
      userId: currentUser ? currentUser.uid : null,
      customer: { name, phone, address },
      items: cart,
      total,
      status: 'pending',
      createdAt: serverTimestamp()
    });

    cart = [];
    saveCart();
    closeCart();
    toast('🎉 تم إرسال طلبك بنجاح!');

    setTimeout(() => {
      rememberOrderId(ref.id);
      window.location.href = orderInvoiceUrl(ref.id);
    }, 1200);

  } catch(e) {
    console.error(e);
    toast('❌ حصل خطأ، حاول تاني');
  }
};

// ══════════════════════════════════════════════
// AUTH — customer login / register / logout
// ══════════════════════════════════════════════
window.switchAuthTab = (tab) => {
  document.getElementById('tabLogin').classList.toggle('active', tab==='login');
  document.getElementById('tabRegister').classList.toggle('active', tab==='register');
  document.getElementById('panelLogin').classList.toggle('active', tab==='login');
  document.getElementById('panelRegister').classList.toggle('active', tab==='register');
  document.getElementById('authError').style.display = 'none';
};

function showAuthError(msg) {
  const el = document.getElementById('authError');
  el.textContent = '⚠️ ' + msg;
  el.style.display = 'block';
}

window.doCustomerRegister = async () => {
  const name  = document.getElementById('regName').value.trim();
  const phone = document.getElementById('regPhone').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const pass  = document.getElementById('regPassword').value;
  if (!name || !phone || !email || !pass) return showAuthError('اكتب كل الحقول');
  if (pass.length < 6) return showAuthError('كلمة المرور لازم 6 أحرف على الأقل');
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(cred.user, { displayName: name });
    await setDoc(doc(db, 'users', cred.user.uid), {
      name, phone, email, createdAt: serverTimestamp()
    });
    toast('🎉 تم إنشاء حسابك بنجاح!');
  } catch(e) {
    showAuthError(translateAuthErr(e));
  }
};

window.doCustomerLogin = async () => {
  const email = document.getElementById('loginEmail').value.trim();
  const pass  = document.getElementById('loginPassword').value;
  if (!email || !pass) return showAuthError('اكتب البريد وكلمة المرور');
  try {
    await signInWithEmailAndPassword(auth, email, pass);
    toast('👋 أهلاً بيك تاني!');
  } catch(e) {
    showAuthError(translateAuthErr(e));
  }
};

window.doCustomerLogout = async () => {
  await signOut(auth);
  toast('🚪 تم تسجيل الخروج');
  closeAccount();
};

function translateAuthErr(e) {
  const c = e.code || '';
  if (c.includes('email-already-in-use')) return 'البريد ده متسجل قبل كده';
  if (c.includes('invalid-email')) return 'البريد الإلكتروني مش صحيح';
  if (c.includes('user-not-found') || c.includes('invalid-credential') || c.includes('wrong-password')) return 'البيانات غلط';
  if (c.includes('weak-password')) return 'كلمة المرور ضعيفة';
  return e.message || 'حصل خطأ';
}

onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  document.getElementById('accountBtn').textContent = user ? '👤' : '👤';
  if (user) {
    document.getElementById('authView').style.display = 'none';
    document.getElementById('profileView').style.display = 'flex';
    let profile = { name: user.displayName || 'مستخدم', email: user.email };
    try {
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (snap.exists()) profile = { ...profile, ...snap.data() };
    } catch(e) { console.error(e); }
    document.getElementById('profName').textContent = profile.name || 'مستخدم';
    document.getElementById('profEmail').textContent = profile.email || '';
    document.getElementById('avatarInitial').textContent = (profile.name||'؟').trim()[0] || '؟';
    listenAddresses(user.uid);
    loadMyOrders();
  } else {
    document.getElementById('authView').style.display = 'block';
    document.getElementById('profileView').style.display = 'none';
    myAddresses = [];
    selectedAddrId = null;
    loadMyOrders();
  }
});

// ══════════════════════════════════════════════
// ACCOUNT DRAWER
// ══════════════════════════════════════════════
window.openAccount = () => {
  closeCart(false);
  document.getElementById('overlay').classList.add('open');
  document.getElementById('accountDrawer').classList.add('open');
  loadMyOrders();
};
window.closeAccount = (closeOverlay = true) => {
  document.getElementById('accountDrawer').classList.remove('open');
  if (closeOverlay) maybeCloseOverlay();
};

// ── addresses (subcollection: users/{uid}/addresses) ──
let unsubAddr = null;
function listenAddresses(uid) {
  if (unsubAddr) unsubAddr();
  const q = query(collection(db, 'users', uid, 'addresses'), orderBy('createdAt', 'desc'));
  unsubAddr = onSnapshot(q, snap => {
    myAddresses = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderAddresses();
  });
}

function renderAddresses() {
  const wrap = document.getElementById('addrListWrap');
  if (!myAddresses.length) {
    wrap.innerHTML = `<div class="account-empty" style="padding:20px;"><div class="em">📍</div><p>مفيش عناوين محفوظة</p></div>`;
    return;
  }
  wrap.innerHTML = myAddresses.map(a => `
    <div class="addr-card ${a.isDefault?'default':''}">
      <div class="addr-label">${a.label||'عنوان'} ${a.isDefault?'<span class="addr-default-chip">أساسي</span>':''}</div>
      <div class="addr-text">${formatAddr(a)}</div>
      <div class="addr-actions">
        ${!a.isDefault?`<button onclick="window.makeDefault('${a.id}')">⭐ اجعله أساسي</button>`:''}
        <button onclick="window.editAddr('${a.id}')">✏️ تعديل</button>
        <button class="danger" onclick="window.deleteAddr('${a.id}')">🗑 حذف</button>
      </div>
    </div>
  `).join('');
}

window.openAddressForm = () => {
  editingAddrId = null;
  document.getElementById('addrFormTitle').textContent = 'عنوان جديد';
  ['afLabel','afGov','afCity','afArea','afStreet','afBuilding','afFloor','afApt','afLandmark'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('afDefault').checked = myAddresses.length === 0;
  document.getElementById('addressFormWrap').style.display = 'block';
};
window.closeAddressForm = () => {
  document.getElementById('addressFormWrap').style.display = 'none';
};
window.editAddr = (id) => {
  const a = myAddresses.find(x => x.id === id);
  if (!a) return;
  editingAddrId = id;
  document.getElementById('addrFormTitle').textContent = 'تعديل العنوان';
  document.getElementById('afLabel').value = a.label||'';
  document.getElementById('afGov').value = a.governorate||'';
  document.getElementById('afCity').value = a.city||'';
  document.getElementById('afArea').value = a.area||'';
  document.getElementById('afStreet').value = a.street||'';
  document.getElementById('afBuilding').value = a.building||'';
  document.getElementById('afFloor').value = a.floor||'';
  document.getElementById('afApt').value = a.apartment||'';
  document.getElementById('afLandmark').value = a.landmark||'';
  document.getElementById('afDefault').checked = !!a.isDefault;
  document.getElementById('addressFormWrap').style.display = 'block';
};

window.saveAddressForm = async () => {
  if (!currentUser) return toast('⚠️ سجل دخول الأول');
  const data = {
    label: document.getElementById('afLabel').value.trim() || 'عنوان',
    governorate: document.getElementById('afGov').value.trim(),
    city: document.getElementById('afCity').value.trim(),
    area: document.getElementById('afArea').value.trim(),
    street: document.getElementById('afStreet').value.trim(),
    building: document.getElementById('afBuilding').value.trim(),
    floor: document.getElementById('afFloor').value.trim(),
    apartment: document.getElementById('afApt').value.trim(),
    landmark: document.getElementById('afLandmark').value.trim(),
    isDefault: document.getElementById('afDefault').checked
  };
  if (!data.city || !data.street) return toast('⚠️ اكتب على الأقل المدينة والشارع');
  try {
    const col = collection(db, 'users', currentUser.uid, 'addresses');
    if (data.isDefault) {
      // unset previous default
      const batch = writeBatch(db);
      myAddresses.forEach(a => { if (a.isDefault) batch.update(doc(col, a.id), { isDefault: false }); });
      await batch.commit();
    }
    if (editingAddrId) {
      await updateDoc(doc(col, editingAddrId), data);
    } else {
      await addDoc(col, { ...data, createdAt: serverTimestamp() });
    }
    toast('✅ تم حفظ العنوان');
    closeAddressForm();
  } catch(e) { console.error(e); toast('❌ حصل خطأ'); }
};

window.makeDefault = async (id) => {
  if (!currentUser) return;
  const col = collection(db, 'users', currentUser.uid, 'addresses');
  const batch = writeBatch(db);
  myAddresses.forEach(a => batch.update(doc(col, a.id), { isDefault: a.id === id }));
  await batch.commit();
  toast('⭐ اتحدد كعنوان أساسي');
};

window.deleteAddr = async (id) => {
  if (!currentUser) return;
  if (!confirm('حذف العنوان ده؟')) return;
  await deleteDoc(doc(db, 'users', currentUser.uid, 'addresses', id));
  toast('🗑 اتحذف');
};

// ══════════════════════════════════════════════
// PRESCRIPTION (روشتة) ORDERING
// ══════════════════════════════════════════════
let rxBase64 = null;
let rxMeds = [];

window.openRx = () => {
  document.getElementById('rxModal').classList.add('open');
  if (currentUser) {
    document.getElementById('rxName').value = document.getElementById('profName').textContent || '';
    const def = myAddresses.find(a => a.isDefault) || myAddresses[0];
    if (def) document.getElementById('rxAddress').value = formatAddr(def);
  }
};
window.closeRx = () => {
  document.getElementById('rxModal').classList.remove('open');
};

window.handleRxFile = (file) => {
  if (!file || !file.type.startsWith('image/')) return;
  const reader = new FileReader();
  reader.onload = e => {
    rxBase64 = e.target.result;
    document.getElementById('rxPreview').src = rxBase64;
    document.getElementById('rxPreviewWrap').style.display = 'block';
    document.getElementById('rxPlaceholder').style.display = 'none';
    document.getElementById('rxDrop').classList.add('has-img');
  };
  reader.readAsDataURL(file);
};

window.clearRx = () => {
  rxBase64 = null;
  document.getElementById('rxPreview').src = '';
  document.getElementById('rxPreviewWrap').style.display = 'none';
  document.getElementById('rxPlaceholder').style.display = 'block';
  document.getElementById('rxDrop').classList.remove('has-img');
  document.getElementById('rxInput').value = '';
};

window.submitRxOrder = async () => {
  const name = document.getElementById('rxName').value.trim();
  const phone = document.getElementById('rxPhone').value.trim();
  const address = document.getElementById('rxAddress').value.trim();

  if (!name || !phone || !address) return toast('⚠️ اكتب اسمك وهاتفك وعنوانك');
  if (!rxBase64) return toast('⚠️ ارفع صورة الروشتة الأول');

  toast('⏳ جاري حفظ الطلب وإرساله للصيدلي...');

  try {
    const imageBase64 = rxBase64.split(',')[1];
    const mimeType = rxBase64.split(';')[0].split(':')[1] || 'image/jpeg';
    const blob = await (await fetch(rxBase64)).blob();
    const fileName = `prescriptions/${Date.now()}-${Math.random().toString(36).slice(2)}.${mimeType.split('/')[1] || 'jpg'}`;
    const storageRef = ref(storage, fileName);
    await uploadBytes(storageRef, blob, { contentType: mimeType });
    const prescriptionImageUrl = await getDownloadURL(storageRef);

    const rxOrderCode = 'RX-' + Date.now();
    const orderRef = await addDoc(collection(db, 'orders'), {
      orderId: rxOrderCode,
      type: 'prescription',
      userId: currentUser ? currentUser.uid : null,
      customer: { name, phone, address },
      items: [],
      total: null,
      deliveryFee: 25,
      grandTotal: null,
      prescriptionImageUrl,
      pricingStatus: 'pending',
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    rememberOrderId(orderRef.id);

    // Keep Telegram notification as the pharmacist alert.
    const res = await fetch(
      'https://us-central1-pharmacy-b198d.cloudfunctions.net/sendPrescriptionToTelegram',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, address, imageBase64, mimeType, orderId: rxOrderCode })
      }
    );
    const result = await res.json();
    if (!res.ok || !result.success) console.warn('Telegram notification failed:', result);

    closeRx();
    clearRx();
    toast('🎉 تم استلام الروشتة! تقدر تفتح طلبك من «طلباتي» وتتابع السعر والحالة.');
    setTimeout(() => { window.location.href = orderInvoiceUrl(orderRef.id); }, 900);
  } catch (e) {
    console.error(e);
    toast('❌ حصل خطأ أثناء حفظ الروشتة، حاول تاني');
  }
};

// ══════════════════════════════════════════════
// TOAST
// ══════════════════════════════════════════════
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}
window.toast = toast;

// init badge
saveCart();
