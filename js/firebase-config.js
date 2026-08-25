// ══════════════════════════════════════════════
// إعدادات Firebase المشتركة — نفس المشروع لكل الصفحات
// ══════════════════════════════════════════════
export const firebaseConfig = {
  apiKey: "AIzaSyBcCT43XKkhgS3kmz-Elox4k9tns1wXQwY",
  authDomain: "pharmacy-b198d.firebaseapp.com",
  projectId: "pharmacy-b198d",
  storageBucket: "pharmacy-b198d.firebasestorage.app",
  messagingSenderId: "974383902275",
  appId: "1:974383902275:web:5dd88e49eb3675dceaaef6"
};

// رابط Cloud Function اللي بتعمل "قراءة الصورة" (منتج أو روشتة)
// بعد ما تعمل deploy لمجلد functions/ هتلاقي الرابط ده في الترمينال
// أو في Firebase Console > Functions
export const SCAN_FUNCTION_URL = "https://us-central1-pharmacy-b198d.cloudfunctions.net/scanImage";
