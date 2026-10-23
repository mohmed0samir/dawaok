function courierEmailBase(name) {
  const arabicMap={ا:'a',أ:'a',إ:'i',آ:'a',ب:'b',ت:'t',ث:'th',ج:'g',ح:'h',خ:'kh',د:'d',ذ:'th',ر:'r',ز:'z',س:'s',ش:'sh',ص:'s',ض:'d',ط:'t',ظ:'z',ع:'a',غ:'gh',ف:'f',ق:'q',ك:'k',ل:'l',م:'m',ن:'n',ه:'h',و:'w',ي:'y',ى:'a',ة:'h',ء:'a',ؤ:'w',ئ:'y'};
  const latin=String(name).toLowerCase().split('').map(char=>arabicMap[char]||char).join('');
  return latin.replace(/[^a-z0-9]+/g,'').slice(0,30) || 'courier';
}

function normalizeProductName(name) {
  return String(name).trim().toLowerCase().replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/\s+/g,' ');
}

function productSellingPrice(product) {
  return product.discount ? Math.round(product.price * (1 - product.discount / 100)) : Number(product.price || 0);
}

// Exported for Vitest testing; also assigned to window so admin.js (regular script tag) can call them
if (typeof window !== 'undefined') {
  window.courierEmailBase = courierEmailBase;
  window.normalizeProductName = normalizeProductName;
  window.productSellingPrice = productSellingPrice;
}
export { courierEmailBase, normalizeProductName, productSellingPrice };