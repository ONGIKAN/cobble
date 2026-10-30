import * as Blockly from 'blockly';
import type { AssetDef, ProjectDoc, SpriteDef } from '@cobble/project';
import {
  attachStatement,
  attachValue,
  chain,
  connectNext,
  makeBlock,
  num,
  randomRange,
} from './block-builder';
import { spritePlaceholderSvg } from './sprite-assets';

export interface TemplateDefinition {
  id: string;
  nameKey: string;
  taglineKey: string;
  build: () => { project: ProjectDoc; workspaces: Record<string, unknown> };
}

function dataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const CAT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
  <path d="M26 46 L22 14 L50 32 Z" fill="#f5a623"/>
  <path d="M94 46 L98 14 L70 32 Z" fill="#f5a623"/>
  <circle cx="60" cy="66" r="42" fill="#f5a623"/>
  <circle cx="46" cy="60" r="5.5" fill="#2b1d14"/>
  <circle cx="74" cy="60" r="5.5" fill="#2b1d14"/>
  <ellipse cx="60" cy="82" rx="16" ry="12" fill="#fff2e0"/>
  <ellipse cx="60" cy="76" rx="4.5" ry="3.5" fill="#c96f5c"/>
  <path d="M30 78 h14 M30 86 h14 M76 78 h14 M76 86 h14" stroke="#2b1d14" stroke-width="2.4" stroke-linecap="round"/>
</svg>`;

const COIN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">
  <circle cx="40" cy="40" r="36" fill="#f2b93b"/>
  <circle cx="40" cy="40" r="36" fill="none" stroke="#d19a24" stroke-width="4"/>
  <circle cx="40" cy="40" r="24" fill="none" stroke="#d19a24" stroke-width="3"/>
  <path d="M40 26 v28 M32 34 h16 M32 46 h16" stroke="#d19a24" stroke-width="4" stroke-linecap="round"/>
</svg>`;

const MOLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">  <ellipse cx="60" cy="110" rx="34" ry="7" fill="rgba(0,0,0,.16)"/>
  <circle cx="60" cy="64" r="46" fill="#a9744f"/>
  <ellipse cx="60" cy="80" rx="24" ry="18" fill="#e8c9a8"/>
  <circle cx="46" cy="52" r="6" fill="#2b1d14"/>
  <circle cx="74" cy="52" r="6" fill="#2b1d14"/>
  <ellipse cx="60" cy="74" rx="5" ry="4" fill="#7a4a30"/>
  <path d="M60 78 q-8 8 0 12 q8 -4 0 -12" fill="#c96f5c"/>
  <path d="M24 30 q10 -12 22 -8" stroke="#8a5c3c" stroke-width="5" fill="none" stroke-linecap="round"/>
  <path d="M96 30 q-10 -12 -22 -8" stroke="#8a5c3c" stroke-width="5" fill="none" stroke-linecap="round"/>
</svg>`;

const APPLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
  <path d="M50 24 q-8 -14 4 -20" stroke="#7a4a30" stroke-width="6" fill="none" stroke-linecap="round"/>
  <path d="M54 10 q20 0 22 16 q-20 4 -22 -16" fill="#5aa955"/>
  <path d="M50 26 c22 0 34 18 32 36 c-2 20 -16 30 -32 30 c-16 0 -30 -10 -32 -30 c-2 -18 10 -36 32 -36" fill="#e0473c"/>
  <ellipse cx="38" cy="44" rx="6" ry="9" fill="rgba(255,255,255,.45)"/>
</svg>`;

const BASKET_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="110" viewBox="0 0 160 110">
  <path d="M44 52 q36 -40 72 0" stroke="#8a5a2c" stroke-width="9" fill="none"/>
  <rect x="30" y="50" width="100" height="50" rx="6" fill="#b5793f"/>
  <path d="M36 64 h88 M36 80 h88" stroke="#8a5a2c" stroke-width="5"/>
  <rect x="24" y="44" width="112" height="10" fill="#c98d4e"/>
</svg>`;

function nowMeta(id: string, name: string): ProjectDoc['meta'] {
  return { id, name, updatedAt: new Date().toISOString() };
}

type SpriteInput = Pick<SpriteDef, 'id' | 'name' | 'costumes'> & Partial<SpriteDef>;

function sprite(input: SpriteInput): SpriteDef {
  return {
    x: 0,
    y: 0,
    rotation: 90,
    size: 100,
    visible: true,
    zIndex: 1,
    rotationStyle: 'none',
    sounds: [],
    ...input,
  };
}

function imageAsset(id: string, name: string, svg: string): AssetDef {
  return { id, name, kind: 'image', dataUrl: dataUrl(svg) };
}

/** 在一个临时 workspace 里拼脚本并序列化 */
function serialize(build: (ws: Blockly.Workspace) => void): Record<string, unknown> {
  const ws = new Blockly.Workspace();
  try {
    build(ws);
    // 模板里多个 hat 脚本默认都堆在原点，横向错开，打开时看着整齐
    ws.getTopBlocks(true).forEach((block, index) => {
      block.moveBy(40 + index * 800, 40);
    });
    return Blockly.serialization.workspaces.save(ws) as Record<string, unknown>;
  } finally {
    ws.dispose();
  }
}

function keyIf(ws: Blockly.Workspace, key: string, actionType: string, delta: number): Blockly.Block {
  const ifBlock = makeBlock(ws, 'control_if');
  attachValue(ifBlock, 'COND', makeBlock(ws, 'sensing_keydown', { KEY: key }));
  const action = makeBlock(ws, actionType);
  attachValue(action, 'VALUE', num(ws, delta));
  attachStatement(ifBlock, 'DO', action);
  return ifBlock;
}

function flagForever(ws: Blockly.Workspace, first: Blockly.Block): void {
  const forever = makeBlock(ws, 'control_forever');
  attachStatement(forever, 'DO', first);
  const flag = makeBlock(ws, 'event_whenflag');
  connectNext(flag, forever);
}

function waitBlock(ws: Blockly.Workspace, seconds: number): Blockly.Block {
  const wait = makeBlock(ws, 'control_wait');
  attachValue(wait, 'SECS', num(ws, seconds));
  return wait;
}

function randomWait(ws: Blockly.Workspace, min: number, max: number): Blockly.Block {
  const wait = makeBlock(ws, 'control_wait');
  attachValue(wait, 'SECS', randomRange(ws, min, max));
  return wait;
}

// ── 空白工程 ────────────────────────────────────────────────
function buildBlank(): { project: ProjectDoc; workspaces: Record<string, unknown> } {
  const project: ProjectDoc = {
    schemaVersion: 1,
    meta: nowMeta('blank', '未命名工程'),
    stage: { width: 960, height: 540, background: '#8fd3ff' },
    assets: [{ id: 'asset_blank_1', name: '角色', kind: 'image', dataUrl: spritePlaceholderSvg(0) }],
    variables: [],
    sprites: [sprite({ id: 'sprite_1', name: '角色 1', costumes: [{ name: '造型 1', assetId: 'asset_blank_1' }] })],
    scripts: {},
  };
  return { project, workspaces: {} };
}

// ── 小猫吃金币 ──────────────────────────────────────────────
function buildCatCoin(): { project: ProjectDoc; workspaces: Record<string, unknown> } {
  const catId = 'sprite_cat';
  const coinId = 'sprite_coin';
  const score = 'var_score';
  const project: ProjectDoc = {
    schemaVersion: 1,
    meta: nowMeta('cat-coin', '小猫吃金币'),
    stage: { width: 960, height: 540, background: '#8fd3ff' },
    assets: [
      imageAsset('asset_cat', '小猫', CAT_SVG),
      imageAsset('asset_coin', '金币', COIN_SVG),
    ],
    variables: [{ id: score, name: '分数', value: 0 }],
    sprites: [
      sprite({
        id: catId,
        name: '小猫',
        x: -180,
        y: -60,
        zIndex: 2,
        rotationStyle: 'left-right',
        costumes: [{ name: '小猫', assetId: 'asset_cat' }],
      }),
      sprite({ id: coinId, name: '金币', x: 150, y: 80, costumes: [{ name: '金币', assetId: 'asset_coin' }] }),
    ],
    scripts: {},
  };

  const cat = serialize((ws) => {
    const right = keyIf(ws, 'ArrowRight', 'motion_changex', 7);
    const left = keyIf(ws, 'ArrowLeft', 'motion_changex', -7);
    const up = keyIf(ws, 'ArrowUp', 'motion_changey', 7);
    const down = keyIf(ws, 'ArrowDown', 'motion_changey', -7);
    const touch = makeBlock(ws, 'control_if');
    attachValue(touch, 'COND', makeBlock(ws, 'sensing_touching', { TARGET: coinId }));
    const change = makeBlock(ws, 'var_change', { VAR: score });
    attachValue(change, 'VALUE', num(ws, 1));
    const broadcast = makeBlock(ws, 'event_broadcast', { MESSAGE: 'hit' });
    attachStatement(touch, 'DO', change);
    connectNext(change, broadcast);
    chain([right, left, up, down, touch]);
    flagForever(ws, right);
  });

  const coin = serialize((ws) => {
    const hat = makeBlock(ws, 'event_whenmessage', { MESSAGE: 'hit' });
    const hide = makeBlock(ws, 'looks_hide');
    const goTo = makeBlock(ws, 'motion_gotoxy');
    attachValue(goTo, 'X', randomRange(ws, -380, 380));
    attachValue(goTo, 'Y', randomRange(ws, -180, 180));
    const show = makeBlock(ws, 'looks_show');
    chain([hide, waitBlock(ws, 0.3), goTo, show]);
    connectNext(hat, hide);
  });

  return { project, workspaces: { [catId]: cat, [coinId]: coin } };
}

// ── 打地鼠 ─────────────────────────────────────────────────
function buildWhackMole(): { project: ProjectDoc; workspaces: Record<string, unknown> } {
  const moleId = 'sprite_mole';
  const score = 'var_score';
  const project: ProjectDoc = {
    schemaVersion: 1,
    meta: nowMeta('whack-mole', '打地鼠'),
    stage: { width: 960, height: 540, background: '#b7d9a8' },
    assets: [imageAsset('asset_mole', '地鼠', MOLE_SVG)],
    variables: [{ id: score, name: '分数', value: 0 }],
    sprites: [
      sprite({
        id: moleId,
        name: '地鼠',
        x: 0,
        y: -80,
        size: 110,
        costumes: [{ name: '地鼠', assetId: 'asset_mole' }],
      }),
    ],
    scripts: {},
  };

  const mole = serialize((ws) => {
    const goTo = makeBlock(ws, 'motion_gotoxy');
    attachValue(goTo, 'X', randomRange(ws, -320, 320));
    attachValue(goTo, 'Y', randomRange(ws, -200, -40));
    const show = makeBlock(ws, 'looks_show');
    const hide = makeBlock(ws, 'looks_hide');
    chain([goTo, show, waitBlock(ws, 0.9), hide, randomWait(ws, 0.2, 0.5)]);
    flagForever(ws, goTo);

    const clickHat = makeBlock(ws, 'event_whenclick');
    const change = makeBlock(ws, 'var_change', { VAR: score });
    attachValue(change, 'VALUE', num(ws, 1));
    const hideOnHit = makeBlock(ws, 'looks_hide');
    connectNext(clickHat, change);
    connectNext(change, hideOnHit);
  });

  return { project, workspaces: { [moleId]: mole } };
}

// ── 接苹果 ─────────────────────────────────────────────────
function buildCatchApple(): { project: ProjectDoc; workspaces: Record<string, unknown> } {
  const basketId = 'sprite_basket';
  const appleId = 'sprite_apple';
  const score = 'var_score';
  const project: ProjectDoc = {
    schemaVersion: 1,
    meta: nowMeta('catch-apple', '接苹果'),
    stage: { width: 960, height: 540, background: '#8fd3ff' },
    assets: [
      imageAsset('asset_apple', '苹果', APPLE_SVG),
      imageAsset('asset_basket', '篮子', BASKET_SVG),
    ],
    variables: [{ id: score, name: '分数', value: 0 }],
    sprites: [
      sprite({
        id: basketId,
        name: '篮子',
        x: 0,
        y: -210,
        size: 110,
        zIndex: 2,
        costumes: [{ name: '篮子', assetId: 'asset_basket' }],
      }),
      sprite({
        id: appleId,
        name: '苹果',
        x: 0,
        y: 250,
        size: 80,
        zIndex: 1,
        costumes: [{ name: '苹果', assetId: 'asset_apple' }],
      }),
    ],
    scripts: {},
  };

  const basket = serialize((ws) => {
    const right = keyIf(ws, 'ArrowRight', 'motion_changex', 12);
    const left = keyIf(ws, 'ArrowLeft', 'motion_changex', -12);
    chain([right, left]);
    flagForever(ws, right);
  });

  const apple = serialize((ws) => {
    const goTo = makeBlock(ws, 'motion_gotoxy');
    attachValue(goTo, 'X', randomRange(ws, -380, 380));
    attachValue(goTo, 'Y', num(ws, 250));
    const show = makeBlock(ws, 'looks_show');
    const glide = makeBlock(ws, 'motion_glide');
    attachValue(glide, 'SECS', num(ws, 1.8));
    attachValue(glide, 'X', randomRange(ws, -320, 320));
    attachValue(glide, 'Y', num(ws, -215));
    const touch = makeBlock(ws, 'control_if');
    attachValue(touch, 'COND', makeBlock(ws, 'sensing_touching', { TARGET: basketId }));
    const change = makeBlock(ws, 'var_change', { VAR: score });
    attachValue(change, 'VALUE', num(ws, 1));
    attachStatement(touch, 'DO', change);
    const hide = makeBlock(ws, 'looks_hide');
    chain([goTo, show, glide, touch, hide, waitBlock(ws, 0.1)]);
    flagForever(ws, goTo);
  });

  return { project, workspaces: { [basketId]: basket, [appleId]: apple } };
}

export const TEMPLATES: TemplateDefinition[] = [
  { id: 'blank', nameKey: 'templates.blank', taglineKey: 'templates.blankTagline', build: buildBlank },
  { id: 'cat-coin', nameKey: 'templates.catCoin', taglineKey: 'templates.catCoinTagline', build: buildCatCoin },
  { id: 'whack-mole', nameKey: 'templates.whackMole', taglineKey: 'templates.whackMoleTagline', build: buildWhackMole },
  { id: 'catch-apple', nameKey: 'templates.catchApple', taglineKey: 'templates.catchAppleTagline', build: buildCatchApple },
];

/** 模板封面：取第一个图片素材 */
export function templateThumb(project: ProjectDoc): string | undefined {
  return project.assets.find((asset) => asset.kind === 'image' && asset.dataUrl)?.dataUrl;
}
