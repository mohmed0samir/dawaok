/* ─── ADMIN AUTH ─── */
let pendingAdminOrderId = new URLSearchParams(window.location.search).get('order') || null;
let pendingAdminOrderHandled = false;
let knownAdminOrderIds=null;
if(!firebase.apps.length) firebase.initializeApp(window.FIREBASE_CONFIG);
const adminApp=firebase.apps.find(app=>app.name==='adminPortal') || firebase.initializeApp(window.FIREBASE_CONFIG,'adminPortal');
const adminAuth=firebase.auth(adminApp);
const adminDb=firebase.firestore(adminApp);
let adminInitialized=false;
async function sha256(t){
  const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(t));
  return Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,'0')).join('');
}

function requestBrowserNotifications(){
  if('Notification' in window && Notification.permission==='default') Notification.requestPermission();
}

function notifyBrowser(title,body){
  if('Notification' in window && Notification.permission==='granted') new Notification(title,{body,icon:'./favicon.ico'});
}

/* Icon constants (SVG symbols defined in admin.html) */
const ICON_ERROR   = '<svg class="icon icon-sm" href="#icon-close"></svg>';
const ICON_LOCK    = '<svg class="icon icon-sm" href="#icon-lock"></svg>';
const ICON_WARNING = '<svg class="icon icon-sm" href="#icon-cancel"></svg>';
const ICON_SUCCESS = '<svg class="icon icon-sm" href="#icon-check"></svg>';
const ICON_DASHBOARD = '<svg class="icon icon-sm" href="#icon-dashboard"></svg>';
const ICON_BOX     = '<svg class="icon icon-sm" href="#icon-box"></svg>';
const ICON_PILL    = '<svg class="icon icon-sm" href="#icon-pill"></svg>';
const ICON_PLUS    = '<svg class="icon icon-sm" href="#icon-plus"></svg>';
const ICON_TRUCK   = '<svg class="icon icon-sm" href="#icon-truck"></svg>';
const ICON_HOME    = '<svg class="icon icon-sm" href="#icon-home"></svg>';
const ICON_KEY     = '<svg class="icon icon-sm" href="#icon-key"></svg>';
const ICON_LOGOUT  = '<svg class="icon icon-sm" href="#icon-logout"></svg>';
const ICON_MENU    = '<svg class="icon icon-sm" href="#icon-menu"></svg>';
const ICON_STATS   = '<svg class="icon icon-sm" href="#icon-stats"></svg>';
const ICON_MONEY   = '<svg class="icon icon-sm" href="#icon-money"></svg>';
const ICON_CLOCK   = '<svg class="icon icon-sm" href="#icon-clock"></svg>';
const ICON_TRASH   = '<svg class="icon icon-sm" href="#icon-trash"></svg>';
const ICON_RECEIPT = '<svg class="icon icon-sm" href="#icon-receipt"></svg>';
const ICON_MEDICAL = '<svg class="icon icon-sm" href="#icon-medical"></svg>';
const ICON_LEAF    = '<svg class="icon icon-sm" href="#icon-leaf"></svg>';
const ICON_BABY    = '<svg class="icon icon-sm" href="#icon-baby"></svg>';
const ICON_MUSCLE  = '<svg class="icon icon-sm" href="#icon-muscle"></svg>';
const ICON_SPINNER = '<svg class="icon icon-sm" href="#icon-spinner"></svg>';
const ICON_SEARCH  = '<svg class="icon icon-sm" href="#icon-search"></svg>';

async function doLogin(){
  const email=document.getElementById('loginEmail').value.trim();
  const v=document.getElementById('loginPass').value;
  if(!email||!v) return;
  const btn=document.querySelector('.login-btn');
  btn.textContent='جاري التحقق...';
  btn.disabled=true;
  try{
    await adminAuth.signInWithEmailAndPassword(email,v);
    const user=adminAuth.currentUser;
    const profile=await adminDb.collection('users').doc(user.uid).get();
    if(!profile.exists || profile.data().role!=='admin'){
      await adminAuth.signOut();
      throw new Error('هذا الحساب ليس حساب أدمن');
    }
    if(user){
      document.getElementById('loginScreen').style.display='none';
      document.getElementById('app').style.display='flex';
      document.getElementById('loginErr').style.display='none';
      document.getElementById('loginPass').value='';
      requestBrowserNotifications();
      showAdminApp();
    }
  } catch(e){
    document.getElementById('loginErr').style.display='block';
    document.getElementById('loginErr').textContent=ICON_ERROR+' خطأ: '+e.message;
  }
  btn.textContent=ICON_LOCK+' دخول';
  btn.disabled=false;
}

function showAdminApp(){
  document.getElementById('loginScreen').style.display='none';
  document.getElementById('app').style.display='flex';
  if(!adminInitialized){
    adminInitialized=true;
    initApp();
  }
}

adminAuth.onAuthStateChanged(async user=>{
  if(!user || adminInitialized) return;
  try{
    const profile=await adminDb.collection('users').doc(user.uid).get();
    if(profile.exists && profile.data().role==='admin') showAdminApp();
    else await adminAuth.signOut();
  }catch(e){ await adminAuth.signOut(); }
});

function doLogout(){
  adminAuth.signOut();
  adminInitialized=false;
  document.getElementById('loginScreen').style.display='flex';
  document.getElementById('app').style.display='none';
  document.getElementById('loginErr').style.display='none';
  document.getElementById('loginErr').textContent=ICON_ERROR+' كلمة المرور غلط';
}

async function doChangePass(){
  const o=document.getElementById('cpOld').value;
  const n=document.getElementById('cpNew').value;
  const cf=document.getElementById('cpCf').value;
  if(!o||!n||!cf){toast(ICON_WARNING+' اكتب كل الحقول');return;}
  if(n.length<6){toast(ICON_WARNING+' 6 أحرف على الأقل');return;}
  if(n!==cf){toast(ICON_WARNING+' مش متطابقة');return;}
  try{
    const user=adminAuth.currentUser;
    const credential=firebase.auth.EmailAuthProvider.credential(user.email,o);
    await user.reauthenticateWithCredential(credential);
    await user.updatePassword(n);
    closeModal('changePass');
    toast(ICON_SUCCESS+' تم تغيير كلمة المرور وحُفظت في Firebase');
  } catch(e){
    toast(ICON_ERROR+' '+e.message);
  }
}

/* ─── UI HELPERS ─── */
function toast(msg){
  const t=document.getElementById('toast');
  t.innerHTML=msg; t.classList.add('show');
  clearTimeout(t._t); t._t=setTimeout(()=>t.classList.remove('show'),3000);
}

function showPage(page,el){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById('page-'+page).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  if(el) el.classList.add('active');
  const T={
    dashboard:ICON_DASHBOARD+' لوحة التحكم',
    orders:ICON_BOX+' الطلبات',
    products:ICON_PILL+' المنتجات',
    addProduct:ICON_PLUS+' إضافة منتج',
    couriers:ICON_TRUCK+' إدارة المندوبين'
  };
  document.getElementById('topbarTitle').textContent=T[page]||'';
  closeSidebar();
}

function toggleSidebar(){
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('backdrop').classList.toggle('open');
}
function closeSidebar(){
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('backdrop').classList.remove('open');
}

function openModal(id){
  document.getElementById('modal-'+id).classList.add('open');
  if(id==='clearOrders') updateClearCount();
}
function closeModal(id){
  document.getElementById('modal-'+id).classList.remove('open');
}

function viewRx(url){
  const image=document.getElementById('rxViewImg');
  image.src = url;
  image.classList.remove('zoomed');
  openModal('rxView');
}

function toggleRxZoom(){
  document.getElementById('rxViewImg').classList.toggle('zoomed');
}

async function fullscreenRx(){
  const frame=document.querySelector('.rx-image-frame');
  if(!frame) return;
  if(document.fullscreenElement){
    await document.exitFullscreen();
  }else if(frame.requestFullscreen){
    await frame.requestFullscreen();
  }
}

/* ─── ICON PICKER (replaces emoji picker) ── */
const ICON_CATEGORIES = {
  'أدوية': ICON_PILL,
  'حقن': ICON_MEDICAL,
  'أجهزة طبية': ICON_MEDICAL,
  'لاصقات': ICON_MEDICAL,
  'مقاييس': ICON_MEDICAL,
  'عناية بالبشرة': ICON_MEDICAL,
  'مختبرات': ICON_MEDICAL,
  'فيتامينات': ICON_LEAF,
  'تكميل': ICON_MUSCLE,
  'صحة الطفل': ICON_BABY,
  'حليب أطفال': ICON_BABY,
  'أسنان': ICON_MEDICAL,
  'عيون': ICON_MEDICAL,
  'قلب': ICON_MEDICAL,
  'تحاليل': ICON_MEDICAL,
  'مختبر': ICON_MEDICAL,
  'أشعة': ICON_MEDICAL,
  'عناية': ICON_LEAF,
  'أعشاب': ICON_LEAF
};
let selIcon='أدوية';
(function initIconPicker(){
  const row=document.getElementById('emojiRow');
  if(!row)return;
  const cats=Object.keys(ICON_CATEGORIES);
  row.innerHTML=cats.map(c=>`<span class="emo" data-cat="${c}">${ICON_CATEGORIES[c]}${c}</span>`).join('');
  row.addEventListener('click',ev=>{
    const el=ev.target.closest('.emo');
    if(!el)return;
    selIcon=el.dataset.cat;
    document.getElementById('pEmoji').value=selIcon;
    row.querySelectorAll('.emo').forEach(el=>el.classList.remove('sel'));
    el.classList.add('sel');
  });
})();

/* ─── IMAGE UPLOAD ─── */
let imgBase64=null;

function handleFile(file){
  if(!file||!file.type.startsWith('image/')) return;
  const reader=new FileReader();
  reader.onload=async e=>{
    imgBase64=e.target.result;
    document.getElementById('imgPreview').src=imgBase64;
    document.getElementById('imgPreviewWrap').style.display='block';
    document.getElementById('imgPlaceholder').style.display='none';
    document.getElementById('imgDrop').classList.add('has-img');
  };
  reader.readAsDataURL(file);
}

function clearImg(){
  imgBase64=null;
  document.getElementById('imgPreview').src='';
  document.getElementById('imgPreviewWrap').style.display='none';
  document.getElementById('imgPlaceholder').style.display='block';
  document.getElementById('imgDrop').classList.remove('has-img');
  document.getElementById('imgInput').value='';
  document.getElementById('scanBadge').style.display='none';
}

/* ─── APP INIT (Firebase) ─── */
function initApp(){
  const db=adminDb;
  window._db=db;

  db.collection('orders').onSnapshot(snap=>{
    window._orders=snap.docs.map(d=>({docId:d.id,...d.data()}));
    window._orders.sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
    const newOrders=knownAdminOrderIds===null ? [] : window._orders.filter(order=>!knownAdminOrderIds.has(order.docId));
    newOrders.forEach(order=>notifyBrowser('طلب جديد في دواوك',`${order.orderId||order.docId} — ${order.customer?.name||'عميل'}`));
    knownAdminOrderIds=new Set(window._orders.map(order=>order.docId));
    updateStats();
    renderDashOrders();
    renderOrders();
    updateClearCount();
    openPendingAdminOrder();
  }, err=>toast(ICON_ERROR+' خطأ orders: '+err.message));

  db.collection('products').onSnapshot(snap=>{
    window._products=snap.docs.map(d=>({docId:d.id,...d.data()}));
    renderProducts();
  }, err=>toast(ICON_ERROR+' خطأ products: '+err.message));

  db.collection('deliveryAgents').onSnapshot(snap=>{
    window._couriers=snap.docs.map(d=>({uid:d.id,...d.data()}));
    renderCouriers();
  }, err=>toast(ICON_ERROR+' خطأ المندوبين: '+err.message));
}

function openPendingAdminOrder(){
  if(!pendingAdminOrderId || pendingAdminOrderHandled) return;
  const order=(window._orders||[]).find(x=>x.docId===pendingAdminOrderId);
  if(!order) return;

  pendingAdminOrderHandled=true;
  const ordersNav=document.querySelectorAll('.nav-item')[1];
  showPage('orders',ordersNav);

  if(order.type==='prescription'){
    setTimeout(()=>openRxPricing(order.docId),80);
  }else{
    toast('معلومات: تم فتح الطلب المطلوب. هذا الطلب ليس روشتة.');
  }

  // إزالة رقم الطلب من العنوان بعد فتحه، مع الإبقاء على الصفحة الحالية.
  try{
    const cleanUrl=window.location.pathname + window.location.hash;
    window.history.replaceState({},document.title,cleanUrl);
  }catch(e){}
}

/* ─── STATS ─── */
function updateStats(){
  const o=window._orders||[];
  document.getElementById('s1').textContent=o.length;
  document.getElementById('s2').textContent=o.filter(x=>x.status!=='cancelled').reduce((s,x)=>s+(x.grandTotal ?? x.total ?? 0),0)+' ج';
  document.getElementById('s3').textContent=o.filter(x=>x.status==='pending').length;
  document.getElementById('s4').textContent=o.filter(x=>x.status==='delivered').length;
}

/* ─── STATUS CHIP ─── */
function chip(s){
  const m={
    pending:ICON_WARNING+' جديد',
    priced:ICON_SUCCESS+' تم التسعير',
    ready:ICON_TRUCK+' جاهز للتوصيل',
    assigned:ICON_BOX+' تم تعيين مندوب',
    picked_up:ICON_BOX+' استلم المندوب',
    out_for_delivery:ICON_TRUCK+' جاري التوصيل',
    confirmed:ICON_SUCCESS+' مؤكد',
    delivered:ICON_SUCCESS+' تم التسليم',
    cancelled:ICON_ERROR+' ملغي'
  };
  return `<span class="chip ${s}">${m[s]||'—'}</span>`;
}
function typeChip(x){
  return x.type==='prescription'
    ? `<span class="order-type-chip rx">${ICON_RECEIPT} روشتة</span>`
    : `<span class="order-type-chip prod">${ICON_BOX} منتجات</span>`;
}

function prescriptionImageSrc(order){
  return order.prescriptionTelegramFileId
    ? `/api/getPrescriptionImage?fileId=${encodeURIComponent(order.prescriptionTelegramFileId)}`
    : order.prescriptionImageUrl || '';
}

function prescriptionImageFallback(order){
  return order.prescriptionTelegramFileId || order.prescriptionImageUrl ? 'الصورة لم يتم تحميلها' : 'صورة غير متاحة لهذا الطلب';
}

/* ─── DASHBOARD ORDERS ─── */
function renderDashOrders(){
  const o=window._orders||[];
  const tb=document.getElementById('dashTbody');
  if(!o.length){tb.innerHTML='<tr class="empty-row"><td colspan="6">لا توجد طلبات بعد</td></tr>';return;}
  tb.innerHTML=o.slice(0,6).map(x=>`<tr>
    <td>${typeChip(x)}</td>
    <td><code style="font-size:10px;color:var(--teal)">${x.orderId||x.docId.slice(0,10)}</code></td>
    <td>${x.customer?.name||'—'}</td>
    <td style="color:var(--gold);font-weight:800">${(x.grandTotal ?? x.total ?? 0)+' ج'}</td>
    <td>${chip(x.status)}</td>
    <td style="color:var(--muted);font-size:11px">${x.createdAt?.toDate?x.createdAt.toDate().toLocaleString('ar-EG'):'—'}</td>
  </tr>`).join('');
}

/* ─── ALL ORDERS ─── */
function renderOrders(){
  const filter=document.getElementById('statusFilter')?.value||'';
  const o=(window._orders||[]).filter(x=>!filter||x.status===filter);
  const tb=document.getElementById('ordersTbody');
  if(!o.length){tb.innerHTML='<tr class="empty-row"><td colspan="8">لا توجد طلبات</td></tr>';return;}
  tb.innerHTML=o.map(x=>{
    let itemsCell;
    let prescriptionSrc='';
    if(x.type==='prescription'){
      const medsTxt=(x.items||[]).map(i=>i.name).join('، ')||'—';
      prescriptionSrc=prescriptionImageSrc(x);
      itemsCell = medsTxt;
    } else {
      itemsCell = (x.items||[]).map(i=>`${i.name}×${i.qty}`).join('، ');
    }
    return `<tr>
      <td>${typeChip(x)}</td>
      <td><code style="font-size:10px;color:var(--teal)">${x.orderId||x.docId.slice(0,8)}</code></td>
      <td><b>${x.customer?.name||'—'}</b><br><small style="color:var(--muted)">${x.customer?.address||''}</small>${x.deliveredBy ? `<br><small style="color:var(--teal)">${ICON_TRUCK} سلّمها: ${x.deliveredBy.name||'—'} — ${x.deliveredBy.phone||'—'}</small>` : ''}</td>
      <td style="color:var(--teal)">${x.customer?.phone||'—'}</td>
      <td style="font-size:11px;color:var(--muted);max-width:170px;">${itemsCell}</td>
      <td style="color:var(--gold);font-weight:800">${x.type==='prescription'?(x.grandTotal!=null?(x.grandTotal)+' ج':x.total!=null?(x.total)+' ج':'يحدد لاحقاً'):(x.total||0)+' ج'}</td>
      <td>${chip(x.status)}</td>
      <td>
        ${x.type==='prescription' ? (prescriptionSrc ? `<button class="abtn inv" onclick="viewRx('${prescriptionSrc}')">${ICON_RECEIPT} صورة الروشتة</button>` : `<small style="color:var(--muted)">${prescriptionImageFallback(x)}</small>`) : ''}
        ${x.type==='prescription' && x.status!=='delivered' && x.status!=='cancelled'?`<button class="abtn ok" onclick="openRxPricing('${x.docId}')">${ICON_MONEY} ${x.total!=null?'تعديل السعر':'تسعير'}</button>`:''}
        ${x.type!=='prescription' && x.status==='pending'?`<button class="abtn ok" onclick="updOrder('${x.docId}','confirmed')">${ICON_SUCCESS} تأكيد</button>`:''}
        ${['confirmed','priced'].includes(x.status)?`<button class="abtn dlv" onclick="updOrder('${x.docId}','ready')">${ICON_TRUCK} تجهيز للتوصيل</button>`:''}
        ${['ready','assigned'].includes(x.status)?`<button class="abtn ok" onclick="broadcastOrder('${x.docId}')">${ICON_STATS} إرسال للمندوبين</button>`:''}
        ${x.status!=='cancelled'&&x.status!=='delivered'?`<button class="abtn cxl" onclick="updOrder('${x.docId}','cancelled')">${ICON_ERROR} إلغاء</button>`:''}
        <button class="abtn inv" onclick="viewInv('${x.docId}')">${ICON_RECEIPT} فاتورة</button>
      </td>
    </tr>`;
  }).join('');
}

async function updOrder(id,status){
  try{
    const updates={status,updatedAt:firebase.firestore.FieldValue.serverTimestamp()};
    if(['confirmed','ready'].includes(status)){
      updates.courierOffers=(window._couriers||[]).filter(x=>x.active!==false).map(x=>x.uid);
      updates.courier=null;
    }
    await window._db.collection('orders').doc(id).update(updates);
    toast(ICON_SUCCESS+' تم التحديث وإرسال الطلب للمندوبين');
  }
  catch(e){ toast(ICON_ERROR+' '+e.message); }
}

async function broadcastOrder(id){
  await updOrder(id,'ready');
}

async function assignCourier(id){
  const agents=window._couriers||[];
  if(!agents.length){toast(ICON_WARNING+' أضف مندوبًا من صفحة المندوبين أولًا');return;}
  const options=agents.map((a,i)=>`${i+1}. ${a.name} — ${a.phone||a.email||''}`).join('\n');
  const answer=prompt(`اختر رقم المندوب:\n${options}`);
  const courier=agents[Number(answer)-1];
  if(!courier) return toast(ICON_WARNING+' اختيار المندوب غير صحيح');
  try{
    await window._db.collection('orders').doc(id).update({
      courier:{uid:courier.uid,name:courier.name,phone:courier.phone||''}, status:'assigned', updatedAt:firebase.firestore.FieldValue.serverTimestamp()
    });
    toast(`${ICON_SUCCESS} تم تعيين ${courier.name} للطلب`);
  }catch(e){ toast(ICON_ERROR+' '+e.message); }
}

function renderCouriers(){
  const el=document.getElementById('couriersList');
  if(!el) return;
  const list=window._couriers||[];
  if(!list.length){el.innerHTML='<div style="text-align:center;padding:30px;color:var(--muted);">لا يوجد مندوبون بعد</div>';return;}
  el.innerHTML=list.map(c=>`<div class="prod-row"><div class="prod-thumb">${ICON_TRUCK}</div><div class="prod-info"><div class="prod-name">${c.name||'مندوب'}</div><div class="prod-meta">${c.phone||'—'} · ${c.email||''}</div></div><span class="stk ok">نشط</span><button class="btn-sm" onclick="resetCourierPassword('${c.uid}','${String(c.name||'مندوب').replace(/'/g,'')}')">${ICON_KEY} كلمة جديدة</button><button class="del-btn" onclick="deleteCourier('${c.uid}','${String(c.name||'مندوب').replace(/'/g,'')}')">${ICON_TRASH} حذف</button></div>`).join('');
}

async function resetCourierPassword(uid,name){
  if(!confirm(`توليد كلمة مرور جديدة للمندوب ${name}؟`)) return;
  try{
    const adminUser=adminAuth.currentUser;
    if(!adminUser) throw new Error('admin_session_expired');
    const idToken=await adminUser.getIdToken();
    const response=await fetch('/api/resetCourierPassword',{
      method:'POST',
      headers:{'Content-Type':'application/json',Authorization:`Bearer ${idToken}`},
      body:JSON.stringify({uid})
    });
    const result=await response.json();
    if(!response.ok) throw new Error(result.error||'reset_failed');
    document.getElementById('createdCourierEmail').value=(window._couriers||[]).find(c=>c.uid===uid)?.email||'';
    document.getElementById('createdCourierPassword').value=result.password;
    openModal('courierCredentials');
  }catch(e){toast(e.message==='admin_session_expired'?ICON_ERROR+' جلسة الأدمن منتهية':ICON_ERROR+' تعذر تغيير كلمة المرور');}
}

async function copyCourierCredential(id){
  const input=document.getElementById(id);
  try{
    await navigator.clipboard.writeText(input.value);
    toast(ICON_SUCCESS+' تم النسخ');
  }catch(e){input.select();document.execCommand('copy');toast(ICON_SUCCESS+' تم النسخ');}
}

async function deleteCourier(uid,name){
  const courier=(window._couriers||[]).find(c=>c.uid===uid);
  const email=courier?.email||'بدون بريد';
  if(!confirm(`تنبيه: سيتم حذف حساب المندوب نهائيًا\n\nالاسم: ${name}\nالبريد: ${email}\n\nهل أنت متأكد من المتابعة؟`)) return;
  try{
    const adminUser=adminAuth.currentUser;
    if(!adminUser) throw new Error('admin_session_expired');
    const idToken=await adminUser.getIdToken();
    const response=await fetch('/api/deleteCourier',{
      method:'POST',
      headers:{'Content-Type':'application/json',Authorization:`Bearer ${idToken}`},
      body:JSON.stringify({uid})
    });
    const result=await response.json();
    if(!response.ok) throw new Error(result.error||'delete_failed');
    toast(ICON_SUCCESS+' تم حذف حساب المندوب');
  }catch(e){toast(e.message==='admin_session_expired'?ICON_ERROR+' جلسة الأدمن منتهية':ICON_ERROR+' تعذر حذف حساب المندوب');}
}


function previewCourierEmail(){
  const name=document.getElementById('courierNewName').value.trim();
  document.getElementById('courierNewEmail').value=name ? `${courierEmailBase(name)}@dawaok.com` : '';
  if(name && !document.getElementById('courierNewPassword').value) generateCourierPassword();
}

function generateCourierPassword(){
  const chars='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  const values=new Uint32Array(12);
  crypto.getRandomValues(values);
  document.getElementById('courierNewPassword').value=Array.from(values,value=>chars[value%chars.length]).join('');
}

async function createCourier(){
  const name=document.getElementById('courierNewName').value.trim();
  const phone=document.getElementById('courierNewPhone').value.trim();
  const password=document.getElementById('courierNewPassword').value;
  if(!name){toast(ICON_WARNING+' اكتب اسم المندوب');return;}
  if(!password) generateCourierPassword();
  const generatedPassword=document.getElementById('courierNewPassword').value;
  const sameName=(window._couriers||[]).some(c=>String(c.name||'').trim().toLowerCase()===name.toLowerCase());
  const usedEmails=new Set((window._couriers||[]).map(c=>String(c.email||'').toLowerCase()));
  let email=`${courierEmailBase(name)}@dawaok.com`;
  if(sameName || usedEmails.has(email)){
    do { email=`${courierEmailBase(name)}${Math.floor(1000+Math.random()*9000)}@dawaok.com`; } while(usedEmails.has(email));
  }
  let createdCourierUser=null;
  try{
    const adminUser=adminAuth.currentUser;
    if(!adminUser) throw new Error('جلسة الأدمن منتهية، سجل الدخول مرة أخرى');
    const adminProfile=await window._db.collection('users').doc(adminUser.uid).get();
    if(!adminProfile.exists || adminProfile.data().role!=='admin') throw new Error('حساب الأدمن لا يملك صلاحية الإدارة');
    const courierApp=firebase.apps.find(app=>app.name==='courierCreation') || firebase.initializeApp(window.FIREBASE_CONFIG,'courierCreation');
    const credential=await courierApp.auth().createUserWithEmailAndPassword(email,generatedPassword);
    createdCourierUser=credential.user;
    await window._db.collection('deliveryAgents').doc(credential.user.uid).set({name,phone,email,active:true,createdAt:firebase.firestore.FieldValue.serverTimestamp()});
    await courierApp.auth().signOut();
    ['courierNewName','courierNewPhone','courierNewEmail'].forEach(id=>document.getElementById(id).value='');
    document.getElementById('createdCourierEmail').value=email;
    document.getElementById('createdCourierPassword').value=generatedPassword;
    openModal('courierCredentials');
  }catch(e){
    if(createdCourierUser) await createdCourierUser.delete().catch(() => {});
    toast(ICON_ERROR+' '+(e.code==='auth/email-already-in-use'?'البريد مستخدم بالفعل':e.message));
  }
}

function viewInv(docId){
  window.open('invoice.html?order='+encodeURIComponent(docId),'_blank');
}

let rxMedicationRows = [];

function findRxProduct(name){
  const normalized=normalizeProductName(name);
  return (window._products||[]).find(product=>normalizeProductName(product.name)===normalized);
}

function renderRxProductOptions(){
  const list=document.getElementById('rxProductOptions');
  if(!list) return;
  list.innerHTML=(window._products||[]).map(product=>`<option value="${String(product.name).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}"></option>`).join('');
}

function calcRxPricingTotals(){
  let total = 0;
  rxMedicationRows.forEach((_, i) => {
    const price = Number(document.getElementById(`rxMedPrice_${i}`)?.value || 0);
    const qty = Number(document.getElementById(`rxMedQty_${i}`)?.value || 0);
    if(Number.isFinite(price) && Number.isFinite(qty) && price >= 0 && qty >= 0) total += price * qty;
  });
  const delivery = Number(document.getElementById('rxDeliveryFee')?.value || 0);
  document.getElementById('rxMedsTotal').textContent = `${total.toFixed(2).replace(/\.00$/,'')} جنيه`;
  document.getElementById('rxGrandTotal').textContent = `${(total + (Number.isFinite(delivery) ? delivery : 0)).toFixed(2).replace(/\.00$/,'')} جنيه`;
  return { total, delivery };
}

function renderRxMedicationRows(){
  const wrap=document.getElementById('rxMedicationRows');
  if(!wrap) return;
  wrap.innerHTML=rxMedicationRows.map((row,i)=>`
    <div style="display:grid;grid-template-columns:1fr 58px 90px 38px;gap:7px;margin-bottom:8px;align-items:center;">
      <input class="modal-field" style="margin:0;" type="text" list="rxProductOptions" id="rxMedName_${i}" value="${String(row.name||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;')}" placeholder="ابحث واختر الدواء" oninput="updateRxMedicationRow(${i})">
      <input class="modal-field" style="margin:0;" type="number" id="rxMedQty_${i}" min="1" step="1" value="${row.qty!=null?row.qty:1}" placeholder="كم" oninput="updateRxMedicationRow(${i})">
      <input class="modal-field" style="margin:0;" type="number" id="rxMedPrice_${i}" min="0" step="0.01" value="${row.price!=null?row.price:''}" placeholder="السعر تلقائي" readonly>
      <button type="button" class="del-btn" style="height:42px;" onclick="removeRxMedicationRow(${i})">${ICON_TRASH}</button>
    </div>`).join('');
  calcRxPricingTotals();
}

function updateRxMedicationRow(i){
  const n=document.getElementById(`rxMedName_${i}`);
  const p=document.getElementById(`rxMedPrice_${i}`);
  const q=document.getElementById(`rxMedQty_${i}`);
  if(rxMedicationRows[i]){
    const product=findRxProduct(n?.value||'');
    rxMedicationRows[i].name=n?.value||'';
    rxMedicationRows[i].qty=q?.value||1;
    rxMedicationRows[i].productId=product?.docId||null;
    rxMedicationRows[i].price=product ? productSellingPrice(product) : '';
    if(p) p.value=rxMedicationRows[i].price;
  }
  calcRxPricingTotals();
}

function addRxMedicationRow(){
  rxMedicationRows.push({name:'',qty:1,price:''});
  renderRxMedicationRows();
  setTimeout(()=>document.getElementById(`rxMedName_${rxMedicationRows.length-1}`)?.focus(),0);
}

function removeRxMedicationRow(i){
  rxMedicationRows.splice(i,1);
  if(!rxMedicationRows.length) rxMedicationRows.push({name:'',qty:1,price:''});
  renderRxMedicationRows();
}

async function openRxPricing(id){
  const x=(window._orders||[]).find(o=>o.docId===id);
  if(!x) return;
  pricingOrderId=id;
  document.getElementById('rxPriceOrderInfo').textContent=`${x.orderId||id.slice(0,10)} — ${x.customer?.name||'—'} — ${x.customer?.phone||'—'}`;
  document.getElementById('rxDeliveryFee').value=x.deliveryFee!=null?x.deliveryFee:25;
  const prescriptionSrc=prescriptionImageSrc(x);
  document.getElementById('rxPriceItems').innerHTML = prescriptionSrc ? `<div style="font-size:12px;font-weight:800;color:var(--muted);margin-bottom:6px;">${ICON_RECEIPT} صورة الروشتة</div><img src="${prescriptionSrc}" style="max-width:100%;max-height:180px;border-radius:10px;object-fit:contain;background:#fff;"><br><button type="button" class="add-addr-btn" style="margin-top:8px;" onclick="viewRx('${prescriptionSrc}')">فتح الصورة</button>` : '<div style="font-size:12px;color:var(--muted);">صورة الروشتة غير متاحة لهذا الطلب</div>';
  renderRxProductOptions();
  rxMedicationRows = Array.isArray(x.items) && x.items.length
    ? x.items.map(i=>({name:i.name||'',qty:i.qty||1,price:i.price!=null?i.price:'',productId:i.productId||null}))
    : [{name:'',qty:1,price:''}];
  renderRxMedicationRows();
  rxMedicationRows.forEach((_,i)=>updateRxMedicationRow(i));
  openModal('rxPrice');
}

async function saveRxPricing(){
  if(!pricingOrderId) return;
  rxMedicationRows.forEach((_,i)=>updateRxMedicationRow(i));
  const items = rxMedicationRows
    .map(row=>{
      const product=findRxProduct(row.name);
      return {name:String(row.name||'').trim(),qty:Number(row.qty),price:product ? productSellingPrice(product) : Number(row.price),product};
    })
    .filter(row=>row.name);
  if(!items.length){toast(ICON_WARNING+' أضف اسم دواء واحد على الأقل');return;}
  if(items.some(row=>!row.product)){toast(ICON_WARNING+' اختار كل دواء من قائمة منتجات النظام');return;}
  if(items.some(row=>!Number.isFinite(row.price)||row.price<0||!Number.isInteger(row.qty)||row.qty<1)){toast(ICON_WARNING+' اكتب كمية وسعر صحيحين لكل دواء');return;}
  const total=items.reduce((sum,row)=>sum+row.price*row.qty,0);
  const delivery=Number(document.getElementById('rxDeliveryFee').value||0);
  if(!Number.isFinite(delivery)||delivery<0){toast(ICON_WARNING+' اكتب رسوم توصيل صحيحة');return;}
  const savedItems=items.map(row=>{
    return {name:row.name,price:row.price,qty:row.qty,icon:selIcon,imageUrl:null,productId:row.product.docId};
  });
  try{
    await window._db.collection('orders').doc(pricingOrderId).update({
      items:savedItems,
      total,
      deliveryFee:delivery,
      grandTotal:total+delivery,
      pricingStatus:'confirmed',
      status:'priced',
      courierOffers:(window._couriers||[]).filter(x=>x.active!==false).map(x=>x.uid),
      courier:null,
      inventoryItems:savedItems.filter(item=>item.productId).map(item=>({productId:item.productId,name:item.name,qty:item.qty})),
      updatedAt:firebase.firestore.FieldValue.serverTimestamp()
    });
    closeModal('rxPrice');
    toast(ICON_SUCCESS+' تم حفظ الأدوية والأسعار وتأكيد الطلب');
  }catch(e){toast(ICON_ERROR+' '+e.message);}
}

/* ─── PRODUCTS ─── */
function renderProducts(){
  const p=window._products||[];
  document.getElementById('prodCount').textContent=p.length;
  const el=document.getElementById('prodList');
  if(!p.length){el.innerHTML='<div style="text-align:center;padding:40px;color:var(--muted);">لا توجد منتجات بعد</div>';return;}
  el.innerHTML=p.map(x=>{
    const sc=x.stock>10?'ok':x.stock>0?'low':'out';
    const sl=x.stock>10?'متوفر':x.stock>0?x.stock+' فقط':'نفد';
    const thumb=x.imageUrl
      ?`<div class="prod-thumb"><img src="${x.imageUrl}"></div>`
      :`<div class="prod-thumb">${ICON_CATEGORIES[x.category]||ICON_PILL}</div>`;
    return `<div class="prod-row">
      ${thumb}
      <div class="prod-info">
        <div class="prod-name">${x.name}</div>
        <div class="prod-meta">${x.brand||''} · ${x.category||''}</div>
      </div>
      <div style="font-size:15px;font-weight:900;color:var(--gold);margin-left:8px;flex-shrink:0;">${x.price} ج</div>
      <span class="stk ${sc}">${sl} · مسحوب: ${Number(x.withdrawn||0)}</span>
      <button class="del-btn" onclick="delProduct('${x.docId}','${x.name.replace(/'/g,'')}')">${ICON_TRASH} حذف</button>
    </div>`;
  }).join('');
}

async function delProduct(id,name){
  if(!confirm(`حذف "${name}"؟`))return;
  try{ await window._db.collection('products').doc(id).delete(); toast(ICON_TRASH+' تم الحذف'); }
  catch(e){ toast(ICON_ERROR+' '+e.message); }
}

/* ─── ADD PRODUCT ─── */
async function addProduct(){
  const name=document.getElementById('pName').value.trim();
  const brand=document.getElementById('pBrand').value.trim();
  const cat=document.getElementById('pCat').value;
  const price=parseFloat(document.getElementById('pPrice').value)||0;
  const stock=parseInt(document.getElementById('pStock').value)||0;
  const discount=parseInt(document.getElementById('pDiscount').value)||0;
  const isNew=document.getElementById('pNew').value==='true';

  if(!name||!price||!stock){ toast(ICON_WARNING+' اكتب الاسم والسعر والكمية'); return; }
  if(price<0){ toast(ICON_WARNING+' السعر يجب أن يكون عدداً موجباً'); return; }
  if(stock<0){ toast(ICON_WARNING+' الكمية يجب أن تكون عدداً موجباً أو صفراً'); return; }
  if(discount<0||discount>90){ toast(ICON_WARNING+' الخصم يجب أن يكون بين 0 و 90'); return; }

  toast(ICON_SPINNER+' جاري الإضافة...');
  try{
    await window._db.collection('products').add({
      name, brand, category:cat, price, stock, discount, isNew,
      icon: selIcon,
      imageUrl: imgBase64 || null,
      withdrawn: 0,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    ['pName','pBrand','pPrice','pStock','pDiscount'].forEach(id=>document.getElementById(id).value='');
    document.getElementById('pNew').value='false';
    clearImg();
    selIcon='أدوية';
    document.getElementById('pEmoji').value='';
    document.querySelectorAll('.emo').forEach(e=>e.classList.remove('sel'));
    toast(ICON_SUCCESS+' تم إضافة المنتج!');
    showPage('products',document.querySelectorAll('.nav-item')[2]);
  } catch(e){
    toast(ICON_ERROR+' '+(e.code==='auth/email-already-in-use'?'البريد مستخدم بالفعل':e.message));
  }
}

/* ─── CLEAR ORDERS ─── */
let clearOpt='delivered';
let pricingOrderId = null;
document.getElementById('rxDeliveryFee')?.addEventListener('input', calcRxPricingTotals);
function selClearOpt(opt){
  clearOpt=opt;
  ['delivered','cancelled','all'].forEach(o=>{
    document.getElementById('opt-'+o).classList.toggle('sel',o===opt);
  });
  updateClearCount();
}
function updateClearCount(){
  const o=window._orders||[];
  const n=clearOpt==='all'?o.length:o.filter(x=>x.status===clearOpt).length;
  const el=document.getElementById('clearCountLbl');
  if(el) el.textContent=`سيتم مسح ${n} طلب`;
}
async function doClear(){
  const o=window._orders||[];
  const list=clearOpt==='all'?o:o.filter(x=>x.status===clearOpt);
  if(!list.length){toast('مفيش طلبات للمسح');return;}
  if(!confirm(`مسح ${list.length} طلب؟ مش هترجع.`))return;
  closeModal('clearOrders');
  toast(ICON_SPINNER+' جاري المسح...');
  const db=window._db;
  let done=0;
  for(const x of list){
    try{ await db.collection('orders').doc(x.docId).delete(); done++; }
    catch(e){ console.error(e); }
  }
  toast(`${ICON_SUCCESS} تم مسح ${done} طلب`);
}

/* ─── SEED PRODUCTS ─── */
async function seedProducts(){
  const db=window._db;
  const snap=await db.collection('products').limit(1).get();
  if(!snap.empty){toast(ICON_WARNING+' الداتا اتضافت قبل كده!');return;}
  const list=[
    {name:'باراسيتامول 500 مج – 20 قرص',brand:'EVA',category:'أدوية',price:12,stock:150,discount:0,isNew:false,icon:'أدوية'},
    {name:'أموكسيسيلين 500 مج – 12 كبسولة',brand:'Pharco',category:'أدوية',price:28,stock:80,discount:0,isNew:false,icon:'أدوية'},
    {name:'إيبوبروفين 400 مج – 20 قرص',brand:'Global',category:'أدوية',price:18,stock:100,discount:0,isNew:false,icon:'أدوية'},
    {name:'أوميبرازول 20 مج – 14 كبسولة',brand:'Kahira',category:'أدوية',price:35,stock:90,discount:10,isNew:false,icon:'أدوية'},
    {name:'لوراتادين 10 مج – 10 أقراص',brand:'Sigma',category:'أدوية',price:16,stock:120,discount:0,isNew:false,icon:'أدوية'},
    {name:'فيتامين C 1000 مج – 60 قرص',brand:"Nature's Best",category:'فيتامينات',price:85,stock:200,discount:20,isNew:false,icon:'فيتامينات'},
    {name:'فيتامين D3 5000 IU – 90 قرص',brand:'Solgar',category:'فيتامينات',price:320,stock:80,discount:0,isNew:true,icon:'فيتامينات'},
    {name:'أوميجا 3 – 60 كبسولة',brand:'Vitalife',category:'فيتامينات',price:180,stock:100,discount:15,isNew:false,icon:'فيتامينات'},
    {name:'واقي شمس SPF 50+ – 88 مل',brand:'Neutrogena',category:'عناية بالبشرة',price:280,stock:60,discount:18,isNew:false,icon:'عناية بالبشرة'},
    {name:'كريم مرطب CeraVe – 250 مل',brand:'CeraVe',category:'عناية بالبشرة',price:320,stock:50,discount:15,isNew:false,icon:'عناية بالبشرة'},
    {name:'حليب أطفال نان 1 – 400 جرام',brand:'NAN',category:'صحة الطفل',price:195,stock:80,discount:0,isNew:false,icon:'صحة الطفل'},
    {name:'جهاز قياس ضغط الدم',brand:'A&D Medical',category:'مستلزمات طبية',price:850,stock:20,discount:20,isNew:false,icon:'مستلزمات طبية'},
    {name:'جهاز قياس السكر OneTouch',brand:'OneTouch',category:'مستلزمات طبية',price:550,stock:25,discount:0,isNew:false,icon:'مستلزمات طبية'},
    {name:'بروتين واي جولد 2 كيلو',brand:'Optimum Nutrition',category:'تكميل عضلات',price:1450,stock:20,discount:0,isNew:true,icon:'تكميل عضلات'},
    {name:'كرياتين مونوهيدرات 300 جرام',brand:'MyProtein',category:'تكميل عضلات',price:380,stock:30,discount:0,isNew:false,icon:'تكميل عضلات'},
  ];
  toast(ICON_SPINNER+' جاري رفع الداتا...');
  for(const p of list){
    await db.collection('products').add({...p,imageUrl:null,createdAt:firebase.firestore.FieldValue.serverTimestamp()});
  }
  toast(ICON_SUCCESS+' تم رفع '+list.length+' منتج!');
}
