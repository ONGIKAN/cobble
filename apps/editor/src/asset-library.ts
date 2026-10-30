/**
 * 内置资源库：拖到舞台即可创建角色的素材。
 * 全部是内联 SVG（data URL），不依赖网络，也方便导出到 .gproj。
 */

function dataUrl(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export interface LibraryAsset {
  id: string;
  /** i18n key：library.items.<id> */
  nameKey: string;
  dataUrl: string;
}

const cat = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
<path d="M30 34 L22 8 L52 24 Z" fill="#f2a33c"/><path d="M90 34 L98 8 L68 24 Z" fill="#f2a33c"/>
<circle cx="60" cy="66" r="40" fill="#f2a33c"/><circle cx="46" cy="58" r="6" fill="#26262b"/>
<circle cx="74" cy="58" r="6" fill="#26262b"/><ellipse cx="60" cy="76" rx="6" ry="5" fill="#e07b39"/>
<path d="M48 84 q12 10 24 0" stroke="#8c4a1c" stroke-width="4" fill="none" stroke-linecap="round"/>
<path d="M22 70 h-14 M22 78 h-12 M98 70 h14 M98 78 h12" stroke="#8c4a1c" stroke-width="3" stroke-linecap="round"/></svg>`;

const coin = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">
<circle cx="40" cy="40" r="34" fill="#f2c13c" stroke="#c9961f" stroke-width="4"/>
<circle cx="40" cy="40" r="22" fill="none" stroke="#c9961f" stroke-width="3" stroke-dasharray="6 5"/>
<path d="M40 22 v36 M32 30 h12 a6 6 0 0 1 0 12 h-8" stroke="#a8791a" stroke-width="4" fill="none" stroke-linecap="round"/></svg>`;

const star = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">
<path d="M40 6 50 30 76 32 56 50 62 76 40 62 18 76 24 50 4 32 30 30 Z" fill="#f7d046" stroke="#c9a227" stroke-width="3" stroke-linejoin="round"/></svg>`;

const apple = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">
<circle cx="40" cy="46" r="28" fill="#e64b3c"/><path d="M40 20 q2 -12 12 -14" stroke="#7a4a26" stroke-width="5" fill="none"/>
<path d="M42 22 q14 -6 16 6 q-14 4 -16 -6" fill="#5aa64a"/><ellipse cx="30" cy="36" rx="6" ry="4" fill="#ffffff" opacity="0.35"/></svg>`;

const basket = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="80" viewBox="0 0 96 80">
<path d="M14 30 h68 l-8 40 q-2 6 -8 6 h-36 q-6 0 -8 -6 Z" fill="#c98d4b" stroke="#8f5f2c" stroke-width="4"/>
<path d="M24 30 q24 -26 48 0" stroke="#8f5f2c" stroke-width="6" fill="none"/>
<path d="M30 44 v20 M48 44 v20 M66 44 v20" stroke="#a9743a" stroke-width="4"/></svg>`;

const mole = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="110" viewBox="0 0 120 110">
<circle cx="60" cy="62" r="42" fill="#b57b58"/><circle cx="26" cy="40" r="14" fill="#a06b4b"/><circle cx="94" cy="40" r="14" fill="#a06b4b"/>
<circle cx="46" cy="52" r="6" fill="#2c2320"/><circle cx="74" cy="52" r="6" fill="#2c2320"/><ellipse cx="60" cy="72" rx="18" ry="12" fill="#f0d9bf"/>
<ellipse cx="60" cy="68" rx="6" ry="5" fill="#3a2b24"/></svg>`;

const ghost = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="100" viewBox="0 0 96 100">
<path d="M12 96 V44 a36 36 0 0 1 72 0 V96 l-12 -10 -12 10 -12 -10 -12 10 -12 -10 Z" fill="#b25cff" stroke="#7a2fd1" stroke-width="3"/>
<circle cx="34" cy="46" r="8" fill="#ffffff"/><circle cx="62" cy="46" r="8" fill="#ffffff"/>
<circle cx="36" cy="48" r="4" fill="#3a1c66"/><circle cx="64" cy="48" r="4" fill="#3a1c66"/></svg>`;

const pac = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">
<path d="M40 8 a32 32 0 1 1 -22 55 L40 40 Z" fill="#f7d046" stroke="#c9a227" stroke-width="3"/>
<circle cx="34" cy="24" r="5" fill="#2b2416"/></svg>`;

const hero = `<svg xmlns="http://www.w3.org/2000/svg" width="56" height="64" viewBox="0 0 56 64">
<rect x="8" y="2" width="8" height="8" fill="#8b5cf6"/><rect x="40" y="2" width="8" height="8" fill="#8b5cf6"/>
<rect x="8" y="6" width="40" height="34" fill="#8b5cf6"/><rect x="12" y="14" width="32" height="22" fill="#f2efe6"/>
<rect x="17" y="18" width="5" height="5" fill="#14101f"/><rect x="34" y="18" width="5" height="5" fill="#14101f"/>
<rect x="24" y="26" width="8" height="4" fill="#8b5cf6"/><rect x="16" y="40" width="24" height="18" fill="#6d4bc4"/>
<rect x="16" y="58" width="8" height="6" fill="#3a2370"/><rect x="32" y="58" width="8" height="6" fill="#3a2370"/></svg>`;

const knight = `<svg xmlns="http://www.w3.org/2000/svg" width="56" height="64" viewBox="0 0 56 64">
<rect x="10" y="4" width="36" height="30" fill="#d8dbe8" stroke="#7a8199" stroke-width="3"/>
<rect x="20" y="14" width="16" height="4" fill="#3a4152"/><rect x="26" y="8" width="4" height="16" fill="#3a4152"/>
<rect x="14" y="34" width="28" height="20" fill="#5a7fd6"/><rect x="14" y="54" width="10" height="8" fill="#3a4152"/>
<rect x="32" y="54" width="10" height="8" fill="#3a4152"/></svg>`;

const slime = `<svg xmlns="http://www.w3.org/2000/svg" width="72" height="56" viewBox="0 0 72 56">
<path d="M8 52 q0 -40 28 -44 q28 4 28 44 Z" fill="#7bd47e" stroke="#41964a" stroke-width="3"/>
<circle cx="26" cy="34" r="5" fill="#1d3a22"/><circle cx="46" cy="34" r="5" fill="#1d3a22"/>
<path d="M30 44 q6 5 12 0" stroke="#1d3a22" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`;

const platform = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="26" viewBox="0 0 240 26">
<rect width="240" height="26" fill="#8b5cf6"/><rect width="240" height="8" fill="#b79bff"/><rect y="18" width="240" height="8" fill="#5a39cc"/></svg>`;

const ground = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="90" viewBox="0 0 480 90">
<rect width="480" height="90" fill="#5f9440"/><rect y="14" width="480" height="76" fill="#7a4a2a"/>
<rect y="8" width="480" height="8" fill="#7fc95a"/></svg>`;

const cloud = `<svg xmlns="http://www.w3.org/2000/svg" width="140" height="64" viewBox="0 0 140 64">
<ellipse cx="40" cy="42" rx="30" ry="20" fill="#dfe3ee"/><ellipse cx="72" cy="30" rx="34" ry="24" fill="#eef1f8"/>
<ellipse cx="104" cy="44" rx="28" ry="18" fill="#dfe3ee"/></svg>`;

const tree = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="110" viewBox="0 0 80 110">
<rect x="34" y="60" width="12" height="46" fill="#7a4a26"/><circle cx="40" cy="44" r="30" fill="#4f9a4a"/>
<circle cx="20" cy="56" r="18" fill="#63b35c"/><circle cx="60" cy="54" r="20" fill="#63b35c"/></svg>`;

const house = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="130" viewBox="0 0 160 130">
<path d="M12 58 L80 8 L148 58 Z" fill="#c94f3d"/><rect x="26" y="58" width="108" height="64" fill="#f0dcc0"/>
<rect x="70" y="84" width="26" height="38" fill="#8a5a34"/><rect x="38" y="74" width="22" height="20" fill="#8fc7e8"/>
<rect x="104" y="74" width="22" height="20" fill="#8fc7e8"/></svg>`;

const potion = `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="56" viewBox="0 0 44 56">
<rect x="17" y="4" width="10" height="10" fill="#b9c1cf"/><path d="M12 18 h20 l6 22 a12 12 0 0 1 -32 0 Z" fill="#ff7f8a" stroke="#b3555e" stroke-width="3"/>
<circle cx="18" cy="34" r="3" fill="#ffd1d6"/></svg>`;

const ghostGreen = `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="66" viewBox="0 0 60 66">
<path d="M8 62 V28 a22 22 0 0 1 44 0 V62 l-8 -7 -8 7 -8 -7 -8 7 -8 -7 Z" fill="#7ab7ff" stroke="#3d78c9" stroke-width="3"/>
<circle cx="22" cy="30" r="5" fill="#fff"/><circle cx="38" cy="30" r="5" fill="#fff"/>
<circle cx="23" cy="31" r="2.5" fill="#22364f"/><circle cx="39" cy="31" r="2.5" fill="#22364f"/></svg>`;

export const LIBRARY_ASSETS: LibraryAsset[] = [
  { id: 'cat', nameKey: 'library.items.cat', dataUrl: dataUrl(cat) },
  { id: 'hero', nameKey: 'library.items.hero', dataUrl: dataUrl(hero) },
  { id: 'knight', nameKey: 'library.items.knight', dataUrl: dataUrl(knight) },
  { id: 'coin', nameKey: 'library.items.coin', dataUrl: dataUrl(coin) },
  { id: 'star', nameKey: 'library.items.star', dataUrl: dataUrl(star) },
  { id: 'apple', nameKey: 'library.items.apple', dataUrl: dataUrl(apple) },
  { id: 'basket', nameKey: 'library.items.basket', dataUrl: dataUrl(basket) },
  { id: 'mole', nameKey: 'library.items.mole', dataUrl: dataUrl(mole) },
  { id: 'slime', nameKey: 'library.items.slime', dataUrl: dataUrl(slime) },
  { id: 'ghost', nameKey: 'library.items.ghost', dataUrl: dataUrl(ghost) },
  { id: 'ghostGreen', nameKey: 'library.items.ghostGreen', dataUrl: dataUrl(ghostGreen) },
  { id: 'pac', nameKey: 'library.items.pac', dataUrl: dataUrl(pac) },
  { id: 'platform', nameKey: 'library.items.platform', dataUrl: dataUrl(platform) },
  { id: 'ground', nameKey: 'library.items.ground', dataUrl: dataUrl(ground) },
  { id: 'cloud', nameKey: 'library.items.cloud', dataUrl: dataUrl(cloud) },
  { id: 'tree', nameKey: 'library.items.tree', dataUrl: dataUrl(tree) },
  { id: 'house', nameKey: 'library.items.house', dataUrl: dataUrl(house) },
  { id: 'potion', nameKey: 'library.items.potion', dataUrl: dataUrl(potion) },
];
