/* ─── PASSWORD (hash stored in Firestore — nothing in code) ─── */
let pendingAdminOrderId = new URLSearchParams(window.location.search).get('order') || null;
let pendingAdminOrderHandled = false;
async function sha256(t){
  const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(t));
  return Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,'0')).join('');
}

async function getHashFromDB(){
  const db = firebase.firestore();
  const doc = await db.collection('settings').doc('admin').get();
  if(!doc.exists) throw new Error('settings/admin مش موجود في Firestore');
  return doc.data().passHash;
}

async function doLogin(){
  const v=document.getElementById('loginPass').value;
  if(!v) return;
  const btn=document.querySelector('.login-btn');
  btn.textContent='⏳ جاري التحقق...';
  btn.disabled=true;
  try{
    if(!firebase.apps.length){
      firebase.initializeApp(window.FIREBASE_CONFIG);
    }
    const [h, storedHashRaw] = await Promise.all([sha256(v), getHashFromDB()]);
    // Normalize the stored value so harmless whitespace/case differences do not reject a valid password.
    const storedHash = String(storedHashRaw ?? '').trim().toLowerCase();
    const inputHash = String(h).trim().toLowerCase();
    if(inputHash === storedHash){
      document.getElementById('loginScreen').style.display='none';
      document.getElementById('app').style.display='flex';
      document.getElementById('loginErr').style.display='none';
      document.getElementById('loginPass').value='';
      initApp();
    } else {
      document.getElementById('loginErr').style.display='block';
      document.getElementById('loginPass').value='';
    }
  } catch(e){
    document.getElementById('loginErr').style.display='block';
    document.getElementById('loginErr').textContent='❌ خطأ: '+e.message;
  }
  btn.textContent='🔐 دخول';
  btn.disabled=false;
}

function doLogout(){
  document.getElementById('loginScreen').style.display='flex';
  document.getElementById('app').style.display='none';
  document.getElementById('loginErr').style.display='none';
  document.getElementById('loginErr').textContent='❌ كلمة المرور غلط';
}

async function doChangePass(){
  const o=document.getElementById('cpOld').value;
  const n=document.getElementById('cpNew').value;
  const cf=document.getElementById('cpCf').value;
  if(!o||!n||!cf){toast('⚠️ اكتب كل الحقول');return;}
  if(n.length<6){toast('⚠️ 6 أحرف على الأقل');return;}
  if(n!==cf){toast('⚠️ مش متطابقة');return;}
  try{
    const [oldH, storedHash] = await Promise.all([sha256(o), getHashFromDB()]);
    if(oldH !== storedHash){toast('❌ كلمة المرور الحالية غلط');return;}
    const newHash = await sha256(n);
    await firebase.firestore().collection('settings').doc('admin').update({passHash: newHash});
    closeModal('changePass');
    toast('✅ تم تغيير كلمة المرور وحُفظت في Firebase');
  } catch(e){
    toast('❌ '+e.message);
  }
}

/* ─── UI HELPERS ─── */
function toast(msg){
  const t=document.getElementById('toast');
  t.textContent=msg; t.classList.add('show');
  clearTimeout(t._t); t._t=setTimeout(()=>t.classList.remove('show'),3000);
}

function showPage(page,el){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById('page-'+page).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  if(el) el.classList.add('active');
  const T={dashboard:'📊 لوحة التحكم',orders:'📦 الطلبات',products:'💊 المنتجات',addProduct:'➕ إضافة منتج',couriers:'🚚 إدارة المندوبين'};
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
  document.getElementById('rxViewImg').src = url;
  openModal('rxView');
}

/* ─── EMOJI PICKER ─── */
const EMOJIS='💊 💉 🩺 🩹 🌡️ 🧴 🧪 🌿 💪 👶 🍼 🦷 👁️ ❤️ 🧬 🔬 🩻 🫀 🌸 🍃'.split(' ').filter(Boolean);
let selEmoji='💊';
(function initEmoji(){
  const row=document.getElementById('emojiRow');
  if(!row)return;
  row.innerHTML=EMOJIS.map(e=>`<span class="emo">${e}</span>`).join('');
  row.addEventListener('click',ev=>{
    const em=ev.target.textContent.trim();
    if(!em)return;
    selEmoji=em;
    document.getElementById('pEmoji').value=em;
    row.querySelectorAll('.emo').forEach(el=>el.classList.remove('sel'));
    ev.target.classList.add('sel');
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
  const db=firebase.firestore();
  window._db=db;

  db.collection('orders').orderBy('createdAt','desc').onSnapshot(snap=>{
    window._orders=snap.docs.map(d=>({docId:d.id,...d.data()}));
    updateStats();
    renderDashOrders();
    renderOrders();
    updateClearCount();
    openPendingAdminOrder();
  }, err=>toast('❌ خطأ orders: '+err.message));

  db.collection('products').onSnapshot(snap=>{
    window._products=snap.docs.map(d=>({docId:d.id,...d.data()}));
    renderProducts();
  }, err=>toast('❌ خطأ products: '+err.message));

  db.collection('deliveryAgents').onSnapshot(snap=>{
    window._couriers=snap.docs.map(d=>({uid:d.id,...d.data()}));
    renderCouriers();
  }, err=>toast('❌ خطأ المندوبين: '+err.message));
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
    toast('ℹ️ تم فتح الطلب المطلوب. هذا الطلب ليس روشتة.');
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
  const m={pending:'🟡 جديد',priced:'🟢 تم التسعير',ready:'🔵 جاهز للتوصيل',assigned:'🟣 تم تعيين مندوب',picked_up:'📦 استلم المندوب',out_for_delivery:'🟠 جاري التوصيل',confirmed:'✅ مؤكد',delivered:'✅ تم التسليم',cancelled:'❌ ملغي'};
  return `<span class="chip ${s}">${m[s]||'—'}</span>`;
}
function typeChip(x){
  return x.type==='prescription'
    ? `<span class="order-type-chip rx">🧾 روشتة</span>`
    : `<span class="order-type-chip prod">🛒 منتجات</span>`;
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
    if(x.type==='prescription'){
      const medsTxt=(x.items||[]).map(i=>i.name).join('، ')||'—';
      itemsCell = x.prescriptionImageUrl
        ? `<img class="rx-thumb" src="${x.prescriptionImageUrl}" onclick="viewRx('${x.prescriptionImageUrl}')" title="اضغط لعرض الروشتة كاملة"><br><small style="color:var(--muted)">${medsTxt}</small>`
        : medsTxt;
    } else {
      itemsCell = (x.items||[]).map(i=>`${i.name}×${i.qty}`).join('، ');
    }
    return `<tr>
      <td>${typeChip(x)}</td>
      <td><code style="font-size:10px;color:var(--teal)">${x.orderId||x.docId.slice(0,8)}</code></td>
      <td><b>${x.customer?.name||'—'}</b><br><small style="color:var(--muted)">${x.customer?.address||''}</small>${x.deliveredBy ? `<br><small style="color:var(--teal)">🚚 سلّمها: ${x.deliveredBy.name||'—'} — ${x.deliveredBy.phone||'—'}</small>` : ''}</td>
      <td style="color:var(--teal)">${x.customer?.phone||'—'}</td>
      <td style="font-size:11px;color:var(--muted);max-width:170px;">${itemsCell}</td>
      <td style="color:var(--gold);font-weight:800">${x.type==='prescription'?(x.grandTotal!=null?(x.grandTotal)+' ج':x.total!=null?(x.total)+' ج':'يحدد لاحقاً'):(x.total||0)+' ج'}</td>
      <td>${chip(x.status)}</td>
      <td>
        ${x.type==='prescription' && x.status!=='delivered' && x.status!=='cancelled'?`<button class="abtn ok" onclick="openRxPricing('${x.docId}')">💰 ${x.total!=null?'تعديل السعر':'تسعير'}</button>`:''}
        ${x.type!=='prescription' && x.status==='pending'?`<button class="abtn ok" onclick="updOrder('${x.docId}','confirmed')">✅ تأكيد</button>`:''}
        ${['confirmed','priced'].includes(x.status)?`<button class="abtn dlv" onclick="updOrder('${x.docId}','ready')">🚚 تجهيز للتوصيل</button>`:''}
        ${['ready','assigned'].includes(x.status)?`<button class="abtn ok" onclick="broadcastOrder('${x.docId}')">📣 إرسال للمندوبين</button>`:''}
        ${x.status!=='cancelled'&&x.status!=='delivered'?`<button class="abtn cxl" onclick="updOrder('${x.docId}','cancelled')">❌ إلغاء</button>`:''}
        <button class="abtn inv" onclick="viewInv('${x.docId}')">🧾 فاتورة</button>
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
    toast('✅ تم التحديث وإرسال الطلب للمندوبين');
  }
  catch(e){ toast('❌ '+e.message); }
}

async function broadcastOrder(id){
  await updOrder(id,'ready');
}

async function assignCourier(id){
  const agents=window._couriers||[];
  if(!agents.length){toast('⚠️ أضف مندوبًا من صفحة المندوبين أولًا');return;}
  const options=agents.map((a,i)=>`${i+1}. ${a.name} — ${a.phone||a.email||''}`).join('\n');
  const answer=prompt(`اختر رقم المندوب:\n${options}`);
  const courier=agents[Number(answer)-1];
  if(!courier) return toast('⚠️ اختيار المندوب غير صحيح');
  try{
    await window._db.collection('orders').doc(id).update({
      courier:{uid:courier.uid,name:courier.name,phone:courier.phone||''}, status:'assigned', updatedAt:firebase.firestore.FieldValue.serverTimestamp()
    });
    toast(`✅ تم تعيين ${courier.name} للطلب`);
  }catch(e){ toast('❌ '+e.message); }
}

function renderCouriers(){
  const el=document.getElementById('couriersList');
  if(!el) return;
  const list=window._couriers||[];
  if(!list.length){el.innerHTML='<div style="text-align:center;padding:30px;color:var(--muted);">لا يوجد مندوبون بعد</div>';return;}
  el.innerHTML=list.map(c=>`<div class="prod-row"><div class="prod-thumb">🚚</div><div class="prod-info"><div class="prod-name">${c.name||'مندوب'}</div><div class="prod-meta">${c.phone||'—'} · ${c.email||''}</div></div><span class="stk ok">نشط</span><button class="del-btn" onclick="deleteCourier('${c.uid}','${String(c.name||'مندوب').replace(/'/g,'')}')">🗑 حذف</button></div>`).join('');
}

async function deleteCourier(uid,name){
  if(!confirm(`حذف حساب المندوب ${name}؟ لن يستطيع دخول بوابة التوصيل بعد ذلك.`)) return;
  try{
    await window._db.collection('deliveryAgents').doc(uid).delete();
    toast('✅ تم حذف حساب المندوب');
  }catch(e){toast('❌ تعذر حذف حساب المندوب');}
}

async function createCourier(){
  const name=document.getElementById('courierNewName').value.trim();
  const phone=document.getElementById('courierNewPhone').value.trim();
  const email=document.getElementById('courierNewEmail').value.trim();
  const password=document.getElementById('courierNewPassword').value;
  if(!name||!email||password.length<6){toast('⚠️ اكتب الاسم والبريد وكلمة مرور من 6 أحرف');return;}
  try{
    const courierApp=firebase.apps.find(app=>app.name==='courierCreation') || firebase.initializeApp(window.FIREBASE_CONFIG,'courierCreation');
    const credential=await courierApp.auth().createUserWithEmailAndPassword(email,password);
    await courierApp.firestore().collection('deliveryAgents').doc(credential.user.uid).set({name,phone,email,active:true,createdAt:firebase.firestore.FieldValue.serverTimestamp()});
    await courierApp.auth().signOut();
    ['courierNewName','courierNewPhone','courierNewEmail','courierNewPassword'].forEach(id=>document.getElementById(id).value='');
    toast('✅ تم إنشاء حساب المندوب وحفظه في Firebase');
  }catch(e){toast('❌ '+(e.code==='auth/email-already-in-use'?'البريد مستخدم بالفعل':e.message));}
}

function viewInv(docId){
  window.open('invoice.html?order='+encodeURIComponent(docId),'_blank');
}

let rxMedicationRows = [];

function normalizeProductName(name){
  return String(name).trim().toLowerCase().replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/\s+/g,' ');
}

function productSellingPrice(product){
  return product.discount ? Math.round(product.price * (1 - product.discount / 100)) : Number(product.price || 0);
}

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
      <button type="button" class="del-btn" style="height:42px;" onclick="removeRxMedicationRow(${i})">🗑</button>
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
  document.getElementById('rxPriceItems').innerHTML = x.prescriptionImageUrl ? `<img src="${x.prescriptionImageUrl}" style="max-width:100%;max-height:180px;border-radius:10px;object-fit:contain;background:#fff;">` : '';
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
  if(!items.length){toast('⚠️ أضف اسم دواء واحد على الأقل');return;}
  if(items.some(row=>!row.product)){toast('⚠️ اختار كل دواء من قائمة منتجات النظام');return;}
  if(items.some(row=>!Number.isFinite(row.price)||row.price<0||!Number.isInteger(row.qty)||row.qty<1)){toast('⚠️ اكتب كمية وسعر صحيحين لكل دواء');return;}
  const total=items.reduce((sum,row)=>sum+row.price*row.qty,0);
  const delivery=Number(document.getElementById('rxDeliveryFee').value||0);
  if(!Number.isFinite(delivery)||delivery<0){toast('⚠️ اكتب رسوم توصيل صحيحة');return;}
  const savedItems=items.map(row=>{
    return {name:row.name,price:row.price,qty:row.qty,emoji:'💊',imageUrl:null,productId:row.product.docId};
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
    toast('✅ تم حفظ الأدوية والأسعار وتأكيد الطلب');
  }catch(e){toast('❌ '+e.message);}
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
      :`<div class="prod-thumb">${x.emoji||'💊'}</div>`;
    return `<div class="prod-row">
      ${thumb}
      <div class="prod-info">
        <div class="prod-name">${x.name}</div>
        <div class="prod-meta">${x.brand||''} · ${x.category||''}</div>
      </div>
      <div style="font-size:15px;font-weight:900;color:var(--gold);margin-left:8px;flex-shrink:0;">${x.price} ج</div>
      <span class="stk ${sc}">${sl} · مسحوب: ${Number(x.withdrawn||0)}</span>
      <button class="del-btn" onclick="delProduct('${x.docId}','${x.name.replace(/'/g,'')}')">🗑</button>
    </div>`;
  }).join('');
}

async function delProduct(id,name){
  if(!confirm(`حذف "${name}"؟`))return;
  try{ await window._db.collection('products').doc(id).delete(); toast('🗑 تم الحذف'); }
  catch(e){ toast('❌ '+e.message); }
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

  if(!name||!price||!stock){ toast('⚠️ اكتب الاسم والسعر والكمية'); return; }

  toast('⏳ جاري الإضافة...');
  try{
    await window._db.collection('products').add({
      name, brand, category:cat, price, stock, discount, isNew,
      emoji: selEmoji,
      imageUrl: imgBase64 || null,
      withdrawn: 0,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    ['pName','pBrand','pPrice','pStock','pDiscount'].forEach(id=>document.getElementById(id).value='');
    document.getElementById('pNew').value='false';
    clearImg();
    selEmoji='💊';
    document.getElementById('pEmoji').value='';
    document.querySelectorAll('.emo').forEach(e=>e.classList.remove('sel'));
    toast('✅ تم إضافة المنتج!');
    showPage('products',document.querySelectorAll('.nav-item')[2]);
  } catch(e){
    toast('❌ '+e.message);
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
  toast('⏳ جاري المسح...');
  const db=window._db;
  let done=0;
  for(const x of list){
    try{ await db.collection('orders').doc(x.docId).delete(); done++; }
    catch(e){ console.error(e); }
  }
  toast(`✅ تم مسح ${done} طلب`);
}

/* ─── SEED PRODUCTS ─── */
async function seedProducts(){
  const db=window._db;
  const snap=await db.collection('products').limit(1).get();
  if(!snap.empty){toast('⚠️ الداتا اتضافت قبل كده!');return;}
  const list=[
    {name:'باراسيتامول 500 مج – 20 قرص',brand:'EVA',category:'أدوية',price:12,stock:150,discount:0,isNew:false,emoji:'💊'},
    {name:'أموكسيسيلين 500 مج – 12 كبسولة',brand:'Pharco',category:'أدوية',price:28,stock:80,discount:0,isNew:false,emoji:'💊'},
    {name:'إيبوبروفين 400 مج – 20 قرص',brand:'Global',category:'أدوية',price:18,stock:100,discount:0,isNew:false,emoji:'💊'},
    {name:'أوميبرازول 20 مج – 14 كبسولة',brand:'Kahira',category:'أدوية',price:35,stock:90,discount:10,isNew:false,emoji:'💊'},
    {name:'لوراتادين 10 مج – 10 أقراص',brand:'Sigma',category:'أدوية',price:16,stock:120,discount:0,isNew:false,emoji:'💊'},
    {name:'فيتامين C 1000 مج – 60 قرص',brand:"Nature's Best",category:'فيتامينات',price:85,stock:200,discount:20,isNew:false,emoji:'🌿'},
    {name:'فيتامين D3 5000 IU – 90 قرص',brand:'Solgar',category:'فيتامينات',price:320,stock:80,discount:0,isNew:true,emoji:'🌿'},
    {name:'أوميجا 3 – 60 كبسولة',brand:'Vitalife',category:'فيتامينات',price:180,stock:100,discount:15,isNew:false,emoji:'🌿'},
    {name:'واقي شمس SPF 50+ – 88 مل',brand:'Neutrogena',category:'عناية بالبشرة',price:280,stock:60,discount:18,isNew:false,emoji:'🧴'},
    {name:'كريم مرطب CeraVe – 250 مل',brand:'CeraVe',category:'عناية بالبشرة',price:320,stock:50,discount:15,isNew:false,emoji:'🧴'},
    {name:'حليب أطفال نان 1 – 400 جرام',brand:'NAN',category:'صحة الطفل',price:195,stock:80,discount:0,isNew:false,emoji:'🍼'},
    {name:'جهاز قياس ضغط الدم',brand:'A&D Medical',category:'مستلزمات طبية',price:850,stock:20,discount:20,isNew:false,emoji:'🩺'},
    {name:'جهاز قياس السكر OneTouch',brand:'OneTouch',category:'مستلزمات طبية',price:550,stock:25,discount:0,isNew:false,emoji:'🩺'},
    {name:'بروتين واي جولد 2 كيلو',brand:'Optimum Nutrition',category:'تكميل عضلات',price:1450,stock:20,discount:0,isNew:true,emoji:'💪'},
    {name:'كرياتين مونوهيدرات 300 جرام',brand:'MyProtein',category:'تكميل عضلات',price:380,stock:30,discount:0,isNew:false,emoji:'💪'},
  ];
  toast('⏳ جاري رفع الداتا...');
  for(const p of list){
    await db.collection('products').add({...p,imageUrl:null,createdAt:firebase.firestore.FieldValue.serverTimestamp()});
  }
  toast('🎉 تم رفع '+list.length+' منتج!');
}
