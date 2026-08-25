/* ─── PASSWORD (hash stored in Firestore — nothing in code) ─── */
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
    const [h, storedHash] = await Promise.all([sha256(v), getHashFromDB()]);
    if(h === storedHash){
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
  const T={dashboard:'📊 لوحة التحكم',orders:'📦 الطلبات',products:'💊 المنتجات',addProduct:'➕ إضافة منتج'};
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
  }, err=>toast('❌ خطأ orders: '+err.message));

  db.collection('products').onSnapshot(snap=>{
    window._products=snap.docs.map(d=>({docId:d.id,...d.data()}));
    renderProducts();
  }, err=>toast('❌ خطأ products: '+err.message));
}

/* ─── STATS ─── */
function updateStats(){
  const o=window._orders||[];
  document.getElementById('s1').textContent=o.length;
  document.getElementById('s2').textContent=o.filter(x=>x.status!=='cancelled').reduce((s,x)=>s+(x.total||0),0)+' ج';
  document.getElementById('s3').textContent=o.filter(x=>x.status==='pending').length;
  document.getElementById('s4').textContent=o.filter(x=>x.status==='delivered').length;
}

/* ─── STATUS CHIP ─── */
function chip(s){
  const m={pending:'معلق',confirmed:'مؤكد',delivered:'تم التوصيل',cancelled:'ملغي'};
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
    <td style="color:var(--gold);font-weight:800">${x.type==='prescription'?'—':(x.total||0)+' ج'}</td>
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
      <td><b>${x.customer?.name||'—'}</b><br><small style="color:var(--muted)">${x.customer?.address||''}</small></td>
      <td style="color:var(--teal)">${x.customer?.phone||'—'}</td>
      <td style="font-size:11px;color:var(--muted);max-width:170px;">${itemsCell}</td>
      <td style="color:var(--gold);font-weight:800">${x.type==='prescription'?'يحدد لاحقاً':(x.total||0)+' ج'}</td>
      <td>${chip(x.status)}</td>
      <td>
        ${x.type==='prescription' && x.status==='pending'
          ? `<button class="abtn ok" onclick="openRxReview('${x.docId}')">💰 مراجعة وتسعير</button>`
          : x.status==='pending'
            ? `<button class="abtn ok" onclick="updOrder('${x.docId}','confirmed')">✅ تأكيد</button>`
            : ''}
        ${x.type==='prescription' && x.status==='confirmed'
          ? `<button class="abtn inv" onclick="openRxReview('${x.docId}')">✏️ تعديل الفاتورة</button>`
          : ''}
        ${x.status==='confirmed'?`<button class="abtn dlv" onclick="updOrder('${x.docId}','delivered')">🚚 تسليم</button>`:''}
        ${x.status!=='cancelled'&&x.status!=='delivered'?`<button class="abtn cxl" onclick="updOrder('${x.docId}','cancelled')">❌ إلغاء</button>`:''}
        <button class="abtn inv" onclick="viewInv('${x.docId}')">🧾 فاتورة</button>
      </td>
    </tr>`;
  }).join('');
}

async function updOrder(id,status){
  try{ await window._db.collection('orders').doc(id).update({status}); toast('✅ تم التحديث'); }
  catch(e){ toast('❌ '+e.message); }
}

function viewInv(docId){
  window.open('/invoice.html?order='+encodeURIComponent(docId),'_blank');
}

/* ─── PRESCRIPTION REVIEW / PRICING ─── */
let currentRxReviewId = null;

function escHtml(v){
  return String(v ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
  }[c]));
}

function openRxReview(id){
  const x = (window._orders || []).find(o => o.docId === id);
  if(!x) return toast('❌ الطلب غير موجود');

  currentRxReviewId = id;

  document.getElementById('rxReviewCustomer').innerHTML =
    `<b>${escHtml(x.customer?.name || '—')}</b> · ${escHtml(x.customer?.phone || '—')}<br>
     <span style="color:var(--muted)">${escHtml(x.customer?.address || '')}</span>`;

  const items = Array.isArray(x.items) && x.items.length ? x.items : [{name:'',qty:1,price:0}];
  const rows = items.map((i,idx)=>rxReviewRow(i,idx)).join('');
  document.getElementById('rxReviewRows').innerHTML = rows;
  recalcRxReview();
  openModal('rxReview');
}

function rxReviewRow(item, idx){
  return `<div class="rx-review-row" data-index="${idx}">
    <input class="modal-field rx-med-name" placeholder="اسم الدواء" value="${escHtml(item.name)}">
    <input class="modal-field rx-med-qty" type="number" min="1" value="${Number(item.qty)||1}" oninput="recalcRxReview()">
    <input class="modal-field rx-med-price" type="number" min="0" step="0.01" value="${Number(item.price)||0}" oninput="recalcRxReview()">
    <button type="button" class="abtn cxl" onclick="this.parentElement.remove();recalcRxReview()">✕</button>
  </div>`;
}

window.addRxReviewRow = function(){
  const rows = document.querySelectorAll('#rxReviewRows .rx-review-row');
  document.getElementById('rxReviewRows').insertAdjacentHTML(
    'beforeend',
    rxReviewRow({name:'',qty:1,price:0}, rows.length)
  );
};

window.recalcRxReview = function(){
  let total = 0;
  document.querySelectorAll('#rxReviewRows .rx-review-row').forEach(row=>{
    const qty = Number(row.querySelector('.rx-med-qty')?.value) || 0;
    const price = Number(row.querySelector('.rx-med-price')?.value) || 0;
    total += qty * price;
  });
  document.getElementById('rxReviewTotal').textContent = total.toFixed(2) + ' ج';
};

window.saveRxReview = async function(){
  const id = currentRxReviewId;
  if(!id) return;

  const items = [];
  document.querySelectorAll('#rxReviewRows .rx-review-row').forEach(row=>{
    const name = row.querySelector('.rx-med-name')?.value.trim();
    const qty = Number(row.querySelector('.rx-med-qty')?.value) || 0;
    const price = Number(row.querySelector('.rx-med-price')?.value) || 0;
    if(name && qty > 0) items.push({name, qty, price, total: qty * price});
  });

  if(!items.length){
    toast('⚠️ أضف دواء واحد على الأقل');
    return;
  }

  const total = items.reduce((s,i)=>s+i.total,0);
  const deliveryFee = Number(document.getElementById('rxReviewDelivery').value) || 0;

  try{
    await window._db.collection('orders').doc(id).update({
      items,
      total,
      deliveryFee,
      status: 'confirmed',
      pricedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    closeModal('rxReview');
    toast('✅ تم تسعير الروشتة وتحديث فاتورة العميل');
  }catch(e){
    toast('❌ '+e.message);
  }
};

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
      <span class="stk ${sc}">${sl}</span>
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
