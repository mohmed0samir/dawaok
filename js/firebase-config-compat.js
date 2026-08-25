// ══════════════════════════════════════════════
// نفس إعدادات Firebase لكن كمتغيرات عامة (للاستخدام مع compat SDK في admin.js)
// ══════════════════════════════════════════════
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyBcCT43XKkhgS3kmz-Elox4k9tns1wXQwY",
  authDomain: "pharmacy-b198d.firebaseapp.com",
  projectId: "pharmacy-b198d",
  storageBucket: "pharmacy-b198d.firebasestorage.app",
  messagingSenderId: "974383902275",
  appId: "1:974383902275:web:5dd88e49eb3675dceaaef6"
};

// رابط Cloud Function اللي بتقرأ صورة المنتج / الروشتة بالذكاء الاصطناعي
window.SCAN_FUNCTION_URL = "https://us-central1-pharmacy-b198d.cloudfunctions.net/scanImage";
