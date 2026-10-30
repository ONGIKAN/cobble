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
  /** 只构造工程数据（不依赖 Blockly 积木是否已注册） */
  project: () => ProjectDoc;
  /** 模板自带的脚本组数（用于弹层预览，不依赖 Blockly） */
  scriptGroups: number;
  /** 构造积木脚本；需先以该工程调用 defineGameBlocks 注册积木 */
  workspaces: () => Record<string, unknown>;
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
  attachValue(ifBlock, 'COND', makeBlock(ws, 'sensing_input', { INPUT: key }));
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

// ── v0.7.0 变量/逻辑辅助 ────────────────────────────────────
function seq(first: Blockly.Block, ...rest: Blockly.Block[]): Blockly.Block {
  chain([first, ...rest]);
  return first;
}

function varGet(ws: Blockly.Workspace, varId: string): Blockly.Block {
  return makeBlock(ws, 'var_get', { VAR: varId });
}

function setVar(ws: Blockly.Workspace, varId: string, value: Blockly.Block): Blockly.Block {
  const block = makeBlock(ws, 'var_set', { VAR: varId });
  attachValue(block, 'VALUE', value);
  return block;
}

function changeVar(ws: Blockly.Workspace, varId: string, delta: Blockly.Block): Blockly.Block {
  const block = makeBlock(ws, 'var_change', { VAR: varId });
  attachValue(block, 'VALUE', delta);
  return block;
}

function compareBlock(ws: Blockly.Workspace, op: string, left: Blockly.Block, right: Blockly.Block): Blockly.Block {
  const block = makeBlock(ws, 'operators_compare', { OP: op });
  attachValue(block, 'A', left);
  attachValue(block, 'B', right);
  return block;
}

function logicAnd(ws: Blockly.Workspace, left: Blockly.Block, right: Blockly.Block): Blockly.Block {
  const block = makeBlock(ws, 'operators_logic', { OP: 'and' });
  attachValue(block, 'A', left);
  attachValue(block, 'B', right);
  return block;
}

// ── 平台跳跃（v0.7.0 示例游戏）──────────────────────────────
const HERO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="56" height="64" viewBox="0 0 56 64">
  <ellipse cx="28" cy="60" rx="19" ry="4" fill="rgba(0,0,0,.28)"/>
  <path d="M40 46 q14 -6 14 -20" stroke="#8b5cf6" stroke-width="7" fill="none" stroke-linecap="round"/>
  <ellipse cx="28" cy="42" rx="17" ry="15" fill="#8b5cf6"/>
  <rect x="17" y="52" width="8" height="8" fill="#6d4bd8"/>
  <rect x="31" y="52" width="8" height="8" fill="#6d4bd8"/>
  <path d="M13 14 L9 0 L24 8 Z" fill="#8b5cf6"/>
  <path d="M43 14 L47 0 L32 8 Z" fill="#8b5cf6"/>
  <circle cx="28" cy="22" r="16" fill="#9d7bff"/>
  <rect x="20" y="17" width="5" height="6" fill="#1b1330"/>
  <rect x="31" y="17" width="5" height="6" fill="#1b1330"/>
  <rect x="25" y="27" width="6" height="3" fill="#e8dcff"/>
  <rect x="14" y="27" width="6" height="2" fill="#6d4bd8"/>
  <rect x="16" y="31" width="6" height="2" fill="#6d4bd8"/>
  <rect x="36" y="27" width="6" height="2" fill="#6d4bd8"/>
  <rect x="34" y="31" width="6" height="2" fill="#6d4bd8"/>
  <rect x="24" y="10" width="3" height="3" fill="#6d4bd8"/>
  <rect x="30" y="12" width="3" height="3" fill="#6d4bd8"/>
</svg>`;

const HERO_JUMP_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="56" height="64" viewBox="0 0 56 64">
  <path d="M40 34 q14 2 16 16" stroke="#8b5cf6" stroke-width="7" fill="none" stroke-linecap="round"/>
  <ellipse cx="28" cy="40" rx="17" ry="15" fill="#8b5cf6" transform="rotate(-8 28 40)"/>
  <rect x="14" y="46" width="9" height="7" fill="#6d4bd8" transform="rotate(-18 18 49)"/>
  <rect x="33" y="46" width="9" height="7" fill="#6d4bd8" transform="rotate(18 38 49)"/>
  <path d="M13 14 L9 0 L24 8 Z" fill="#8b5cf6"/>
  <path d="M43 14 L47 0 L32 8 Z" fill="#8b5cf6"/>
  <circle cx="28" cy="22" r="16" fill="#9d7bff"/>
  <rect x="20" y="16" width="5" height="7" fill="#1b1330"/>
  <rect x="31" y="16" width="5" height="7" fill="#1b1330"/>
  <rect x="25" y="27" width="6" height="3" fill="#e8dcff"/>
  <rect x="24" y="10" width="3" height="3" fill="#6d4bd8"/>
  <rect x="30" y="12" width="3" height="3" fill="#6d4bd8"/>
</svg>`;

const GROUND_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="90" viewBox="0 0 960 90">
  <rect width="960" height="90" fill="#241f3d"/>
  <rect width="960" height="16" fill="#4fbf7a"/>
  <rect y="16" width="960" height="6" fill="#3d9c60"/>
  <g fill="#332a52">
    <rect x="40" y="36" width="26" height="10"/><rect x="120" y="52" width="34" height="12"/>
    <rect x="210" y="34" width="20" height="10"/><rect x="300" y="60" width="28" height="10"/>
    <rect x="380" y="40" width="30" height="10"/><rect x="470" y="56" width="22" height="10"/>
    <rect x="560" y="36" width="26" height="10"/><rect x="650" y="58" width="30" height="10"/>
    <rect x="740" y="42" width="24" height="10"/><rect x="830" y="60" width="28" height="10"/>
  </g>
</svg>`;

const CLOUD_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="60" viewBox="0 0 220 60">
  <path d="M40 52 q-26 0 -26 -18 q0 -16 18 -16 q4 -14 22 -14 q14 0 20 10 q10 -8 24 -2 q16 6 14 22 q14 2 14 10 q0 8 -12 8 Z" fill="rgba(226,220,255,.28)"/>
</svg>`;

const GOAL_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="140" viewBox="0 0 80 140">
  <rect x="14" y="6" width="7" height="130" fill="#c9c2e8"/>
  <path d="M21 12 L74 30 L21 52 Z" fill="#9d7bff"/>
  <circle cx="21" cy="10" r="6" fill="#e8dcff"/>
  <rect x="4" y="130" width="34" height="8" fill="#6d4bd8"/>
</svg>`;

function projectPlatformer(): ProjectDoc {
  const project: ProjectDoc = {
    schemaVersion: 1,
    meta: nowMeta('platformer', '平台跳跃'),
    stage: { width: 960, height: 540, background: '#1d1b33' },
    assets: [
      imageAsset('asset_hero', '英雄站立', HERO_SVG),
      imageAsset('asset_hero_jump', '英雄跳跃', HERO_JUMP_SVG),
      imageAsset('asset_ground', '地面', GROUND_SVG),
      imageAsset('asset_cloud', '云朵', CLOUD_SVG),
      imageAsset('asset_coin', '金币', COIN_SVG),
      imageAsset('asset_goal', '终点旗', GOAL_SVG),
    ],
    variables: [
      { id: 'var_vy', name: '速度', value: 0 },
      { id: 'var_ground', name: '落地', value: 1 },
      { id: 'var_score', name: '分数', value: 0 },
    ],
    sprites: [
      sprite({
        id: 'sprite_hero',
        name: '英雄',
        x: -380,
        y: -148,
        zIndex: 3,
        rotationStyle: 'left-right',
        costumes: [
          { name: '站立', assetId: 'asset_hero' },
          { name: '跳跃', assetId: 'asset_hero_jump' },
        ],
      }),
      sprite({ id: 'sprite_ground', name: '地面', y: -225, zIndex: 1, costumes: [{ name: '地面', assetId: 'asset_ground' }] }),
      sprite({ id: 'sprite_cloud_a', name: '云朵 A', x: -180, y: 110, zIndex: 1, costumes: [{ name: '云朵', assetId: 'asset_cloud' }] }),
      sprite({ id: 'sprite_cloud_b', name: '云朵 B', x: 160, y: 60, zIndex: 1, costumes: [{ name: '云朵', assetId: 'asset_cloud' }] }),
      sprite({ id: 'sprite_coin_a', name: '金币 A', x: -120, y: -40, zIndex: 2, costumes: [{ name: '金币', assetId: 'asset_coin' }] }),
      sprite({ id: 'sprite_coin_b', name: '金币 B', x: 60, y: -90, zIndex: 2, costumes: [{ name: '金币', assetId: 'asset_coin' }] }),
      sprite({ id: 'sprite_goal', name: '终点', x: 360, y: -150, zIndex: 2, costumes: [{ name: '旗子', assetId: 'asset_goal' }] }),
    ],
    scripts: {},
  };
  return project;
}

function workspacesPlatformer(): Record<string, unknown> {
  const heroId = 'sprite_hero';
  const coinA = 'sprite_coin_a';
  const coinB = 'sprite_coin_b';
  const goalId = 'sprite_goal';
  const score = 'var_score';
  const vy = 'var_vy';
  const grounded = 'var_ground';

  const hero = serialize((ws) => {
    const right = makeBlock(ws, 'control_if');
    attachValue(right, 'COND', makeBlock(ws, 'sensing_input', { INPUT: 'right' }));
    const faceRight = makeBlock(ws, 'motion_point');
    attachValue(faceRight, 'DIRECTION', num(ws, 90));
    const stepRight = makeBlock(ws, 'motion_changex');
    attachValue(stepRight, 'VALUE', num(ws, 7));
    attachStatement(right, 'DO', seq(faceRight, stepRight));

    const left = makeBlock(ws, 'control_if');
    attachValue(left, 'COND', makeBlock(ws, 'sensing_input', { INPUT: 'left' }));
    const faceLeft = makeBlock(ws, 'motion_point');
    attachValue(faceLeft, 'DIRECTION', num(ws, 270));
    const stepLeft = makeBlock(ws, 'motion_changex');
    attachValue(stepLeft, 'VALUE', num(ws, -7));
    attachStatement(left, 'DO', seq(faceLeft, stepLeft));

    const jump = makeBlock(ws, 'control_if');
    attachValue(
      jump,
      'COND',
      logicAnd(ws, makeBlock(ws, 'sensing_input', { INPUT: 'jump' }), compareBlock(ws, '=', varGet(ws, grounded), num(ws, 1))),
    );
    attachStatement(jump, 'DO', seq(setVar(ws, vy, num(ws, 15)), setVar(ws, grounded, num(ws, 0))));

    const gravity = changeVar(ws, vy, num(ws, -1));
    const applyY = makeBlock(ws, 'motion_changey');
    attachValue(applyY, 'VALUE', varGet(ws, vy));

    const land = makeBlock(ws, 'control_if');
    attachValue(land, 'COND', compareBlock(ws, '<', makeBlock(ws, 'motion_ypos'), num(ws, -152)));
    const landX = makeBlock(ws, 'motion_gotoxy');
    attachValue(landX, 'X', makeBlock(ws, 'motion_xpos'));
    attachValue(landX, 'Y', num(ws, -148));
    attachStatement(land, 'DO', seq(landX, setVar(ws, vy, num(ws, 0)), setVar(ws, grounded, num(ws, 1))));

    const costume = makeBlock(ws, 'control_ifelse');
    attachValue(costume, 'COND', compareBlock(ws, '>', varGet(ws, vy), num(ws, 0)));
    attachStatement(costume, 'DO', makeBlock(ws, 'looks_switchcostume', { COSTUME: '跳跃' }));
    attachStatement(costume, 'ELSE', makeBlock(ws, 'looks_switchcostume', { COSTUME: '站立' }));

    chain([right, left, jump, gravity, applyY, land, costume]);
    flagForever(ws, right);
  });

  const coinScript = (): Record<string, unknown> =>
    serialize((ws) => {
      const collect = makeBlock(ws, 'control_if');
      attachValue(collect, 'COND', makeBlock(ws, 'sensing_touching', { TARGET: heroId }));
      const hide = makeBlock(ws, 'looks_hide');
      const add = changeVar(ws, score, num(ws, 10));
      const cheer = makeBlock(ws, 'control_if');
      attachValue(cheer, 'COND', compareBlock(ws, '=', varGet(ws, score), num(ws, 20)));
      const say = makeBlock(ws, 'looks_say', { TEXT: '金币收集完成，冲向终点！' });
      attachValue(say, 'SECS', num(ws, 3));
      attachStatement(cheer, 'DO', say);
      const stopThis = makeBlock(ws, 'control_stop', { MODE: 'this' });
      attachStatement(collect, 'DO', seq(hide, add, cheer, stopThis));
      chain([collect]);
      flagForever(ws, collect);
    });

  const goal = serialize((ws) => {
    const win = makeBlock(ws, 'control_if');
    attachValue(win, 'COND', makeBlock(ws, 'sensing_touching', { TARGET: heroId }));
    const say = makeBlock(ws, 'looks_say', { TEXT: '🎉 到达终点，恭喜通关！' });
    attachValue(say, 'SECS', num(ws, 5));
    attachStatement(win, 'DO', say);
    chain([win]);
    flagForever(ws, win);
  });

  return { [heroId]: hero, [coinA]: coinScript(), [coinB]: coinScript(), [goalId]: goal };
}

// ── 空白工程 ────────────────────────────────────────────────
function projectBlank(): ProjectDoc {
  const project: ProjectDoc = {
    schemaVersion: 1,
    meta: nowMeta('blank', '未命名工程'),
    stage: { width: 960, height: 540, background: '#8fd3ff' },
    assets: [{ id: 'asset_blank_1', name: '角色', kind: 'image', dataUrl: spritePlaceholderSvg(0) }],
    variables: [],
    sprites: [sprite({ id: 'sprite_1', name: '角色 1', costumes: [{ name: '造型 1', assetId: 'asset_blank_1' }] })],
    scripts: {},
  };
  return project;
}

function workspacesBlank(): Record<string, unknown> {
  return {};
}

// ── 小猫吃金币 ──────────────────────────────────────────────
function projectCatCoin(): ProjectDoc {
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

  return project;
}

function workspacesCatCoin(): Record<string, unknown> {
  const catId = 'sprite_cat';
  const coinId = 'sprite_coin';
  const score = 'var_score';
  const cat = serialize((ws) => {
    const right = keyIf(ws, 'right', 'motion_changex', 7);
    const left = keyIf(ws, 'left', 'motion_changex', -7);
    const up = keyIf(ws, 'up', 'motion_changey', 7);
    const down = keyIf(ws, 'down', 'motion_changey', -7);
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

  return { [catId]: cat, [coinId]: coin };
}

// ── 打地鼠 ─────────────────────────────────────────────────
function projectWhackMole(): ProjectDoc {
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

  return project;
}

function workspacesWhackMole(): Record<string, unknown> {
  const moleId = 'sprite_mole';
  const score = 'var_score';
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

  return { [moleId]: mole };
}

// ── 接苹果 ─────────────────────────────────────────────────
function projectCatchApple(): ProjectDoc {
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

  return project;
}

function workspacesCatchApple(): Record<string, unknown> {
  const basketId = 'sprite_basket';
  const appleId = 'sprite_apple';
  const score = 'var_score';
  const basket = serialize((ws) => {
    const right = keyIf(ws, 'right', 'motion_changex', 12);
    const left = keyIf(ws, 'left', 'motion_changex', -12);
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

  return { [basketId]: basket, [appleId]: apple };
}

// ── 吃豆豆（v0.8.0 示例游戏）────────────────────────────────
const PAC_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44">
  <circle cx="22" cy="22" r="20" fill="#ffd93b"/>
  <path d="M22 22 L44 13 L44 31 Z" fill="#0e0b1a"/>
  <circle cx="24" cy="13" r="3" fill="#3a2c00"/>
</svg>`;

const GHOST_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="48" viewBox="0 0 44 48">
  <path d="M4 46 V20 a18 18 0 0 1 36 0 V46 l-6 -5 -6 5 -6 -5 -6 5 -6 -5 Z" fill="#b39cff"/>
  <circle cx="16" cy="21" r="5" fill="#1b1330"/>
  <circle cx="29" cy="21" r="5" fill="#1b1330"/>
  <circle cx="17" cy="20" r="1.6" fill="#fff"/>
  <circle cx="30" cy="20" r="1.6" fill="#fff"/>
</svg>`;

const DOT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18">
  <circle cx="9" cy="9" r="7" fill="#ffe27a"/>
  <circle cx="9" cy="9" r="7" fill="none" stroke="#d9b23c" stroke-width="2"/>
</svg>`;

function wallSvg(width: number, height: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="#43356f"/>
  <rect width="${width}" height="4" fill="#7b63d1"/>
  <rect y="${height - 4}" width="${width}" height="4" fill="#2c2350"/>
</svg>`;
}

/** 多个目标里任意一个被碰到：or 串联 sensing_touching */
function touchingAny(ws: Blockly.Workspace, targets: string[]): Blockly.Block {
  const checks = targets.map((target) => makeBlock(ws, 'sensing_touching', { TARGET: target }));
  let acc = checks[0];
  for (const check of checks.slice(1)) {
    const logic = makeBlock(ws, 'operators_logic', { OP: 'or' });
    attachValue(logic, 'A', acc);
    attachValue(logic, 'B', check);
    acc = logic;
  }
  return acc;
}

function projectDotMaze(): ProjectDoc {
  const dots: Array<[string, number, number]> = [
    ['sprite_dot_a', -60, 170],
    ['sprite_dot_b', 60, 170],
    ['sprite_dot_c', -60, -170],
    ['sprite_dot_d', 60, -170],
    ['sprite_dot_e', -350, 0],
    ['sprite_dot_f', 350, 0],
  ];
  const project: ProjectDoc = {
    schemaVersion: 1,
    meta: nowMeta('dot-maze', '吃豆豆'),
    stage: { width: 960, height: 540, background: '#0e0b1a' },
    assets: [
      imageAsset('asset_pac', '吃豆人', PAC_SVG),
      imageAsset('asset_ghost', '幽灵', GHOST_SVG),
      imageAsset('asset_dot', '豆子', DOT_SVG),
      imageAsset('asset_wall_h', '横墙', wallSvg(320, 20)),
      imageAsset('asset_wall_v', '竖墙', wallSvg(20, 300)),
      imageAsset('asset_border_h', '上边框', wallSvg(940, 20)),
      imageAsset('asset_border_v', '侧边框', wallSvg(20, 500)),
    ],
    variables: [
      { id: 'var_score', name: '分数', value: 0 },
      { id: 'var_prev_x', name: '上次 X', value: 0 },
      { id: 'var_prev_y', name: '上次 Y', value: 0 },
    ],
    sprites: [
      sprite({ id: 'sprite_player', name: '吃豆人', x: -300, y: -60, zIndex: 3, costumes: [{ name: '吃豆人', assetId: 'asset_pac' }] }),
      sprite({ id: 'sprite_ghost', name: '幽灵', x: 300, y: -60, zIndex: 2, costumes: [{ name: '幽灵', assetId: 'asset_ghost' }] }),
      sprite({ id: 'sprite_border_top', name: '上边框', y: 256, zIndex: 1, costumes: [{ name: '墙', assetId: 'asset_border_h' }] }),
      sprite({ id: 'sprite_border_bottom', name: '下边框', y: -256, zIndex: 1, costumes: [{ name: '墙', assetId: 'asset_border_h' }] }),
      sprite({ id: 'sprite_border_left', name: '左边框', x: -462, zIndex: 1, costumes: [{ name: '墙', assetId: 'asset_border_v' }] }),
      sprite({ id: 'sprite_border_right', name: '右边框', x: 462, zIndex: 1, costumes: [{ name: '墙', assetId: 'asset_border_v' }] }),
      sprite({ id: 'sprite_wall_a', name: '横墙 A', x: -120, y: 40, zIndex: 1, costumes: [{ name: '墙', assetId: 'asset_wall_h' }] }),
      sprite({ id: 'sprite_wall_b', name: '横墙 B', x: 140, y: -40, zIndex: 1, costumes: [{ name: '墙', assetId: 'asset_wall_h' }] }),
      sprite({ id: 'sprite_wall_c', name: '竖墙 C', y: 120, zIndex: 1, size: 55, costumes: [{ name: '墙', assetId: 'asset_wall_v' }] }),
      ...dots.map(([id, x, y]) =>
        sprite({ id, name: id.replace('sprite_dot_', '豆子 '), x, y, zIndex: 2, costumes: [{ name: '豆子', assetId: 'asset_dot' }] }),
      ),
    ],
    scripts: {},
  };
  return project;
}

function workspacesDotMaze(): Record<string, unknown> {
  const score = 'var_score';
  const prevX = 'var_prev_x';
  const prevY = 'var_prev_y';
  const wallIds = [
    'sprite_border_top',
    'sprite_border_bottom',
    'sprite_border_left',
    'sprite_border_right',
    'sprite_wall_a',
    'sprite_wall_b',
    'sprite_wall_c',
  ];
  const player = serialize((ws) => {
    const moveStep = (input: string, axis: 'x' | 'y', delta: number) => {
      const tryMove = makeBlock(ws, 'control_if');
      attachValue(tryMove, 'COND', makeBlock(ws, 'sensing_input', { INPUT: input }));
      const rememberX = setVar(ws, prevX, makeBlock(ws, 'motion_xpos'));
      const rememberY = setVar(ws, prevY, makeBlock(ws, 'motion_ypos'));
      const move = makeBlock(ws, axis === 'x' ? 'motion_changex' : 'motion_changey');
      attachValue(move, 'VALUE', num(ws, delta));
      const blocked = makeBlock(ws, 'control_if');
      attachValue(blocked, 'COND', touchingAny(ws, wallIds));
      const back = makeBlock(ws, 'motion_gotoxy');
      attachValue(back, 'X', varGet(ws, prevX));
      attachValue(back, 'Y', varGet(ws, prevY));
      attachStatement(blocked, 'DO', back);
      attachStatement(tryMove, 'DO', seq(rememberX, rememberY, move, blocked));
      return tryMove;
    };
    const right = moveStep('right', 'x', 6);
    const left = moveStep('left', 'x', -6);
    const up = moveStep('up', 'y', 6);
    const down = moveStep('down', 'y', -6);
    chain([right, left, up, down]);
    flagForever(ws, right);

    // 吃完所有豆子后由广播触发通关提示
    const win = makeBlock(ws, 'looks_say', { TEXT: '🎉 豆子全部吃完，通关！' });
    attachValue(win, 'SECS', num(ws, 5));
    connectNext(makeBlock(ws, 'event_whenmessage', { MESSAGE: 'win' }), win);
  });

  const ghost = serialize((ws) => {
    const dirs: Array<['x' | 'y', number]> = [
      ['x', 6],
      ['x', -6],
      ['y', 6],
      ['y', -6],
    ];
    const branches = dirs.map(([axis, delta], index) => {
      const pick = makeBlock(ws, 'control_if');
      attachValue(pick, 'COND', compareBlock(ws, '=', randomRange(ws, 1, 4), num(ws, index + 1)));
      const rememberX = setVar(ws, prevX, makeBlock(ws, 'motion_xpos'));
      const rememberY = setVar(ws, prevY, makeBlock(ws, 'motion_ypos'));
      const move = makeBlock(ws, axis === 'x' ? 'motion_changex' : 'motion_changey');
      attachValue(move, 'VALUE', num(ws, delta));
      const blocked = makeBlock(ws, 'control_if');
      attachValue(blocked, 'COND', touchingAny(ws, wallIds));
      const back = makeBlock(ws, 'motion_gotoxy');
      attachValue(back, 'X', varGet(ws, prevX));
      attachValue(back, 'Y', varGet(ws, prevY));
      attachStatement(blocked, 'DO', back);
      attachStatement(pick, 'DO', seq(rememberX, rememberY, move, blocked));
      return pick;
    });
    const caught = makeBlock(ws, 'control_if');
    attachValue(caught, 'COND', makeBlock(ws, 'sensing_touching', { TARGET: 'sprite_player' }));
    const deduct = changeVar(ws, score, num(ws, -1));
    const shout = makeBlock(ws, 'looks_say', { TEXT: '被抓到啦！' });
    attachValue(shout, 'SECS', num(ws, 1));
    attachStatement(caught, 'DO', seq(deduct, shout));
    chain([...branches, caught, waitBlock(ws, 0.05)]);
    flagForever(ws, branches[0]);
  });

  const pellet = (): Record<string, unknown> =>
    serialize((ws) => {
      const eat = makeBlock(ws, 'control_if');
      attachValue(eat, 'COND', makeBlock(ws, 'sensing_touching', { TARGET: 'sprite_player' }));
      const hide = makeBlock(ws, 'looks_hide');
      const add = changeVar(ws, score, num(ws, 1));
      const allDone = makeBlock(ws, 'control_if');
      attachValue(allDone, 'COND', compareBlock(ws, '=', varGet(ws, score), num(ws, 6)));
      attachStatement(allDone, 'DO', makeBlock(ws, 'event_broadcast', { MESSAGE: 'win' }));
      const stopThis = makeBlock(ws, 'control_stop', { MODE: 'this' });
      attachStatement(eat, 'DO', seq(hide, add, allDone, stopThis));
      chain([eat]);
      flagForever(ws, eat);
    });

  const result: Record<string, unknown> = {
    sprite_player: player,
    sprite_ghost: ghost,
  };
  for (const id of ['sprite_dot_a', 'sprite_dot_b', 'sprite_dot_c', 'sprite_dot_d', 'sprite_dot_e', 'sprite_dot_f']) {
    result[id] = pellet();
  }
  return result;
}

export const TEMPLATES: TemplateDefinition[] = [
  {
    id: 'blank',
    nameKey: 'templates.blank',
    taglineKey: 'templates.blankTagline',
    scriptGroups: 0,
    project: projectBlank,
    workspaces: workspacesBlank,
    build: () => ({ project: projectBlank(), workspaces: workspacesBlank() }),
  },
  {
    id: 'cat-coin',
    nameKey: 'templates.catCoin',
    taglineKey: 'templates.catCoinTagline',
    scriptGroups: 2,
    project: projectCatCoin,
    workspaces: workspacesCatCoin,
    build: () => ({ project: projectCatCoin(), workspaces: workspacesCatCoin() }),
  },
  {
    id: 'whack-mole',
    nameKey: 'templates.whackMole',
    taglineKey: 'templates.whackMoleTagline',
    scriptGroups: 1,
    project: projectWhackMole,
    workspaces: workspacesWhackMole,
    build: () => ({ project: projectWhackMole(), workspaces: workspacesWhackMole() }),
  },
  {
    id: 'catch-apple',
    nameKey: 'templates.catchApple',
    taglineKey: 'templates.catchAppleTagline',
    scriptGroups: 2,
    project: projectCatchApple,
    workspaces: workspacesCatchApple,
    build: () => ({ project: projectCatchApple(), workspaces: workspacesCatchApple() }),
  },
  {
    id: 'platformer',
    nameKey: 'templates.platformer',
    taglineKey: 'templates.platformerTagline',
    scriptGroups: 4,
    project: projectPlatformer,
    workspaces: workspacesPlatformer,
    build: () => ({ project: projectPlatformer(), workspaces: workspacesPlatformer() }),
  },
  {
    id: 'dot-maze',
    nameKey: 'templates.dotMaze',
    taglineKey: 'templates.dotMazeTagline',
    scriptGroups: 8,
    project: projectDotMaze,
    workspaces: workspacesDotMaze,
    build: () => ({ project: projectDotMaze(), workspaces: workspacesDotMaze() }),
  },
];

/** 模板封面：取第一个图片素材 */
export function templateThumb(project: ProjectDoc): string | undefined {
  return project.assets.find((asset) => asset.kind === 'image' && asset.dataUrl)?.dataUrl;
}
