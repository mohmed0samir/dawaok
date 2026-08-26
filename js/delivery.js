import { firebaseConfig } from './firebase-config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, collection, onSnapshot, query, where, updateDoc, doc, getDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const app=initializeApp(firebaseConfig), auth=getAuth(app), db=getFirestore(app);
let unsubscribe=null, courier=null;
const labels={assigned:'تم تعيينك',picked_up:'استلمت الطلب',out_for_delivery:'جاري التوصيل',delivered:'تم التسليم'};
const toast=m=>{const e=document.getElementById('toast');e.textContent=m;e.classList.add('show');setTimeout(()=>e.classList.remove('show'),2500)};

window.startDelivery=async()=>{
  const email=document.getElementById('courierEmail').value.trim(), password=document.getElementById('courierPassword').value;
  if(!email||!password)return toast('اكتب البريد وكلمة المرور');
  try{await signInWithEmailAndPassword(auth,email,password)}
  catch(e){toast(e.code==='auth/invalid-credential'?'بيانات الدخول غير صحيحة':'تعذر تسجيل الدخول')}
};
window.logoutDelivery=async()=>{unsubscribe?.();await signOut(auth);location.reload()};

onAuthStateChanged(auth,async user=>{
  if(!user)return;
  try{
    const snap=await getDoc(doc(db,'deliveryAgents',user.uid));
    if(!snap.exists()||snap.data().active===false){await signOut(auth);return toast('هذا الحساب ليس حساب مندوب نشط')}
    courier={uid:user.uid,...snap.data()}; load();
  }catch(e){toast('تعذر تحميل بيانات المندوب')}
});

function load(){
  document.getElementById('courierLogin').hidden=true; document.getElementById('deliveryApp').hidden=false;
  document.getElementById('courierTitle').textContent='أهلًا، '+courier.name;
  const q=query(collection(db,'orders'),where('courier.uid','==',courier.uid));
  unsubscribe=onSnapshot(q,s=>render(s.docs.map(d=>({id:d.id,...d.data()}))),()=>toast('تعذر تحميل الطلبات'));
}
function render(data){
  const open=data.filter(x=>x.status!=='delivered'&&x.status!=='cancelled');
  document.getElementById('ordersCount').textContent=`${open.length} طلب نشط`;
  const el=document.getElementById('orders');
  if(!open.length){el.innerHTML='<div class="empty">لا توجد طلبات مسندة إليك حاليًا.</div>';return}
  el.innerHTML=open.map(x=>{
    const loc=x.customer?.location;
    const map=loc?`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc.lat+','+loc.lng)}`:`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(x.customer?.address||'')}`;
    const next=x.status==='assigned'?['picked_up','📦 استلام الطلب']:x.status==='picked_up'?['out_for_delivery','🛵 بدء التوصيل']:x.status==='out_for_delivery'?['delivered','✅ تم التسليم']:null;
    return `<article class="order"><div class="order-top"><div><h3>${x.customer?.name||'عميل'} <small>#${x.orderId||x.id.slice(0,8)}</small></h3><p>📱 ${x.customer?.phone||'—'}<br>📍 ${x.customer?.address||'—'}</p></div><span class="pill">${labels[x.status]||x.status}</span></div><p>🧾 ${(x.items||[]).map(i=>`${i.name} ×${i.qty}`).join('، ')||'روشتة قيد المراجعة'}</p><div class="money">المطلوب تحصيله: ${x.grandTotal??x.total??'يحدد لاحقًا'} جنيه</div><div class="actions"><a class="map" target="_blank" rel="noopener" href="${map}">🗺️ فتح الموقع في Google Maps</a>${next?`<button onclick="moveOrder('${x.id}','${next[0]}')">${next[1]}</button>`:''}</div></article>`;
  }).join('');
}
window.moveOrder=async(id,status)=>{
  try{
    const updates={status,updatedAt:serverTimestamp(),paymentCollected:status==='delivered'?true:false};
    if(status==='delivered'){
      updates.deliveredBy={uid:courier.uid,name:courier.name||'',phone:courier.phone||''};
      updates.deliveredAt=serverTimestamp();
    }
    await updateDoc(doc(db,'orders',id),updates);
    toast(status==='delivered'?'تم تسجيل التسليم باسمك ورقمك':'تم تحديث حالة الطلب');
  }catch(e){toast('تعذر تحديث الطلب')}
};
