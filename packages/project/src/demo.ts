import type { ProjectDoc } from './types';

/** POC 素材：内嵌 SVG data URI，避免依赖外部文件 */
function svg(source: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(source)}`;
}

const CAT_OPEN = svg(`<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
  <path d="M26 52 L14 14 L48 32 Z" fill="#f2a343"/>
  <path d="M94 52 L106 14 L72 32 Z" fill="#f2a343"/>
  <path d="M22 46 L18 24 L40 34 Z" fill="#e08b2a"/>
  <path d="M98 46 L102 24 L80 34 Z" fill="#e08b2a"/>
  <ellipse cx="60" cy="68" rx="44" ry="38" fill="#f7b45c"/>
  <ellipse cx="60" cy="86" rx="20" ry="14" fill="#ffe2bd"/>
  <circle cx="44" cy="62" r="7" fill="#20232a"/>
  <circle cx="76" cy="62" r="7" fill="#20232a"/>
  <circle cx="46" cy="59" r="2" fill="#ffffff"/>
  <circle cx="78" cy="59" r="2" fill="#ffffff"/>
  <path d="M55 74 Q60 80 65 74" stroke="#20232a" stroke-width="3" fill="none" stroke-linecap="round"/>
  <path d="M60 78 l-5 6 M60 78 l5 6" stroke="#e05a5a" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M18 66 H4 M18 74 H6 M102 66 H116 M102 74 H114" stroke="#d98c33" stroke-width="2"/>
</svg>`);

const CAT_BLINK = svg(`<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
  <path d="M26 52 L14 14 L48 32 Z" fill="#f2a343"/>
  <path d="M94 52 L106 14 L72 32 Z" fill="#f2a343"/>
  <path d="M22 46 L18 24 L40 34 Z" fill="#e08b2a"/>
  <path d="M98 46 L102 24 L80 34 Z" fill="#e08b2a"/>
  <ellipse cx="60" cy="68" rx="44" ry="38" fill="#f7b45c"/>
  <ellipse cx="60" cy="86" rx="20" ry="14" fill="#ffe2bd"/>
  <path d="M37 62 Q44 68 51 62" stroke="#20232a" stroke-width="3" fill="none" stroke-linecap="round"/>
  <path d="M69 62 Q76 68 83 62" stroke="#20232a" stroke-width="3" fill="none" stroke-linecap="round"/>
  <path d="M55 74 Q60 80 65 74" stroke="#20232a" stroke-width="3" fill="none" stroke-linecap="round"/>
  <path d="M60 78 l-5 6 M60 78 l5 6" stroke="#e05a5a" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M18 66 H4 M18 74 H6 M102 66 H116 M102 74 H114" stroke="#d98c33" stroke-width="2"/>
</svg>`);

const COIN = svg(`<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">
  <circle cx="40" cy="40" r="34" fill="#ffd23f" stroke="#e0a800" stroke-width="4"/>
  <circle cx="40" cy="40" r="24" fill="none" stroke="#e0a800" stroke-width="3"/>
  <path d="M40 24 V56 M32 32 Q40 26 48 32 Q40 38 32 44 Q40 50 48 54" stroke="#b8860b" stroke-width="4" fill="none" stroke-linecap="round"/>
</svg>`);

export const DEMO_SPRITE_CAT = 'sprite_cat';
export const DEMO_SPRITE_COIN = 'sprite_coin';
export const DEMO_VAR_SCORE = 'var_score';

export function createDemoProject(): ProjectDoc {
  return {
    schemaVersion: 1,
    meta: {
      id: 'demo-cat-coin',
      name: '小猫吃金币',
      updatedAt: new Date().toISOString(),
    },
    stage: { width: 960, height: 540, background: '#8fd3ff' },
    assets: [
      { id: 'asset_cat_open', name: '小猫-睁眼', kind: 'image', dataUrl: CAT_OPEN },
      { id: 'asset_cat_blink', name: '小猫-眨眼', kind: 'image', dataUrl: CAT_BLINK },
      { id: 'asset_coin', name: '金币', kind: 'image', dataUrl: COIN },
    ],
    variables: [{ id: DEMO_VAR_SCORE, name: '分数', value: 0 }],
    sprites: [
      {
        id: DEMO_SPRITE_CAT,
        name: '小猫',
        x: -180,
        y: -60,
        rotation: 90,
        size: 100,
        visible: true,
        zIndex: 2,
        rotationStyle: 'left-right',
        costumes: [
          { name: '睁眼', assetId: 'asset_cat_open' },
          { name: '眨眼', assetId: 'asset_cat_blink' },
        ],
        sounds: [],
      },
      {
        id: DEMO_SPRITE_COIN,
        name: '金币',
        x: 150,
        y: 80,
        rotation: 90,
        size: 100,
        visible: true,
        zIndex: 1,
        rotationStyle: 'none',
        costumes: [{ name: '金币', assetId: 'asset_coin' }],
        sounds: [],
      },
    ],
    scripts: {},
  };
}
