import { firebaseConfig } from './firebase-config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, setPersistence, browserLocalPersistence } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, collection, onSnapshot, query, where, updateDoc, doc, getDoc, runTransaction, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const app=initializeApp(firebaseConfig,'deliveryPortal'), auth=getAuth(app), db=getFirestore(app);
const authPersistenceReady=setPersistence(auth,browserLocalPersistence).catch(e=>console.error('تعذر حفظ جلسة المندوب:',e));
let unsubscribe=null, courier=null;
let assignedOrders=[], offeredOrders=[];
let knownOfferedOrderIds=null;
const labels={assigned:'تم تعيينك',picked_up:'استلمت الطلب',out_for_delivery:'جاري التوصيل',delivered:'تم التسليم'};
const toast=m=>{const e=document.getElementById('toast');e.textContent=m;e.classList.add('show');setTimeout(()=>e.classList.remove('show'),2500)};

window.startDelivery=async()=>{
  const email=document.getElementById('courierEmail').value.trim(), password=document.getElementById('courierPassword').value;
  if(!email||!password)return toast('اكتب البريد وكلمة المرور');
  try{
    await authPersistenceReady;
    if('Notification' in window && Notification.permission==='default') Notification.requestPermission();
    await signInWithEmailAndPassword(auth,email,password)
  }
  catch(e){toast(e.code==='auth/invalid-credential'?'بيانات الدخول غير صحيحة':'تعذر تسجيل الدخول')}
};
window.logoutDelivery=async()=>{unsubscribe?.();await signOut(auth);location.reload()};

onAuthStateChanged(auth,async user=>{
  if(!user)return;
  try{
    const snap=await getDoc(doc(db,'deliveryAgents',user.uid));
    if(!snap.exists()||snap.data().active===false){await signOut(auth);return toast('بيانات الدخول غير صحيحة')}
    courier={uid:user.uid,...snap.data()}; load();
  }catch(e){toast('تعذر تحميل بيانات المندوب')}
});

function load(){
  document.getElementById('courierLogin').hidden=true; document.getElementById('deliveryApp').hidden=false;
  document.getElementById('courierTitle').textContent='أهلًا، '+courier.name;
  const assignedQuery=query(collection(db,'orders'),where('courier.uid','==',courier.uid));
  const offeredQuery=query(collection(db,'orders'),where('courierOffers','array-contains',courier.uid));
  const renderOrders=()=>render([...assignedOrders,...offeredOrders.filter(offer=>!assignedOrders.some(order=>order.id===offer.id))]);
  const unsubscribeAssigned=onSnapshot(assignedQuery,s=>{assignedOrders=s.docs.map(d=>({id:d.id,...d.data()}));renderOrders()},()=>toast('تعذر تحميل الطلبات'));
  const unsubscribeOffered=onSnapshot(offeredQuery,s=>{
    offeredOrders=s.docs.map(d=>({id:d.id,...d.data()}));
    const newOffers=knownOfferedOrderIds===null ? [] : offeredOrders.filter(order=>!knownOfferedOrderIds.has(order.id));
    newOffers.forEach(order=>{
      toast(`📦 طلب جديد متاح: ${order.orderId||order.id.slice(0,8)}`);
      if('Notification' in window && Notification.permission==='granted') new Notification('طلب توصيل جديد', {body:`${order.orderId||order.id.slice(0,8)} — ${order.customer?.name||'عميل'}`});
    });
    knownOfferedOrderIds=new Set(offeredOrders.map(order=>order.id));
    renderOrders();
  },()=>toast('تعذر تحميل عروض الطلبات'));
  unsubscribe=()=>{unsubscribeAssigned();unsubscribeOffered();};
}
function render(data){
  const open=data.filter(x=>x.status!=='delivered'&&x.status!=='cancelled' && (x.courier?.uid===courier.uid || (x.courierOffers||[]).includes(courier.uid)));
  document.getElementById('ordersCount').textContent=`${open.length} طلب نشط`;
  const el=document.getElementById('orders');
  if(!open.length){el.innerHTML='<div class="empty">لا توجد طلبات مسندة إليك حاليًا.</div>';return}
  el.innerHTML=open.map(x=>{
    const loc=x.customer?.location;
    const map=loc?`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc.lat+','+loc.lng)}`:`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(x.customer?.address||'')}`;
    const isOffer=!x.courier;
    const next=x.status==='assigned'?['picked_up','📦 استلام الطلب']:x.status==='picked_up'?['out_for_delivery','🛵 بدء التوصيل']:x.status==='out_for_delivery'?['delivered','✅ تم التسليم']:null;
    return `<article class="order"><div class="order-top"><div><h3>${x.customer?.name||'عميل'} <small>#${x.orderId||x.id.slice(0,8)}</small></h3><p>📱 ${x.customer?.phone||'—'}<br>📍 ${x.customer?.address||'—'}</p></div><span class="pill">${isOffer?'طلب متاح':labels[x.status]||x.status}</span></div><p>🧾 ${(x.items||[]).map(i=>`${i.name} ×${i.qty}`).join('، ')||'روشتة قيد المراجعة'}</p><div class="money">المطلوب تحصيله: ${x.grandTotal??x.total??'يحدد لاحقًا'} جنيه</div><div class="actions"><a class="map" target="_blank" rel="noopener" href="${map}">🗺️ فتح الموقع في Google Maps</a>${isOffer?`<button onclick="acceptOrder('${x.id}')">✅ قبول الطلب</button>`:next?`<button onclick="moveOrder('${x.id}','${next[0]}')">${next[1]}</button>`:''}</div></article>`;
  }).join('');
}
window.acceptOrder=async(id)=>{
  try{
    await runTransaction(db,async transaction=>{
      const ref=doc(db,'orders',id);
      const snap=await transaction.get(ref);
      const order=snap.data();
      if(!snap.exists() || order.courier || !(order.courierOffers||[]).includes(courier.uid)) throw new Error('already_taken');
      transaction.update(ref,{courier:{uid:courier.uid,name:courier.name||'',phone:courier.phone||''},courierOffers:[],status:'assigned',updatedAt:serverTimestamp()});
    });
    toast('✅ تم قبول الطلب وأصبح معك');
  }catch(e){toast(e.message==='already_taken'?'الطلب اتاخد من مندوب تاني':'تعذر قبول الطلب')}
};
window.moveOrder=async(id,status)=>{
  try{
    const updates={status,updatedAt:serverTimestamp(),paymentCollected:status==='delivered'?true:false};
    if(status==='delivered'){
      updates.deliveredBy={uid:courier.uid,name:courier.name||'',phone:courier.phone||''};
      updates.deliveredAt=serverTimestamp();
    }
    await runTransaction(db,async transaction=>{
      const orderRef=doc(db,'orders',id);
      const orderSnap=await transaction.get(orderRef);
      if(!orderSnap.exists()) throw new Error('missing_order');
      const order=orderSnap.data();
      const items=order.inventoryDeducted ? [] : (order.items||[]);
      if(status==='delivered' && order.type==='prescription' && items.some(item=>!item.productId)) throw new Error('medicine_not_registered');
      const productIds=[...new Set(items.map(item=>item.productId||item.id).filter(Boolean))];
      const productRefs=productIds.map(productId=>doc(db,'products',productId));
      const productSnaps=[];
      for(const productRef of productRefs) productSnaps.push(await transaction.get(productRef));
      if(status==='delivered' && !order.inventoryDeducted){
        const quantities={};
        items.forEach(item=>{const productId=item.productId||item.id;if(productId) quantities[productId]=(quantities[productId]||0)+Number(item.qty||0)});
        updates.inventoryByProduct=Object.fromEntries(Object.entries(quantities).map(([productId,qty])=>[productId,{qty}]));
        productRefs.forEach((productRef,index)=>{
          const productSnap=productSnaps[index];
          if(!productSnap.exists()) return;
          const qty=quantities[productRef.id]||0;
          const stock=Number(productSnap.data().stock||0);
          if(stock<qty) throw new Error('out_of_stock');
          transaction.update(productRef,{stock:stock-qty,withdrawn:Number(productSnap.data().withdrawn||0)+qty,lastInventoryOrderId:id,updatedAt:serverTimestamp()});
        });
        updates.inventoryDeducted=true;
      }
      transaction.update(orderRef,updates);
    });
    toast(status==='delivered'?'تم تسجيل التسليم باسمك ورقمك':'تم تحديث حالة الطلب');
  }catch(e){
    console.error('moveOrder failed:',e);
    toast(e.message==='out_of_stock'?'الكمية غير متاحة في المخزون':e.message==='medicine_not_registered'?'يوجد دواء في الروشتة غير مسجل في المنتجات':e.code==='permission-denied'?'لا توجد صلاحية لتحديث الطلب':'تعذر تحديث الطلب');
  }
};
