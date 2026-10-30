import * as Blockly from 'blockly';
import {
  DEFAULT_INPUT,
  defaultBindings,
  type AssetDef,
  type InputConfig,
  type ProjectDoc,
  type SpriteDef,
} from '@cobble/project';
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

function asset(id: string, name: string, svg: string): AssetDef {
  return { id, name, kind: 'image', dataUrl: dataUrl(svg) };
}

function padInput(overrides: Partial<InputConfig>): InputConfig {
  return {
    ...DEFAULT_INPUT,
    bindings: defaultBindings(),
    buttons: DEFAULT_INPUT.buttons.map((button) => ({ ...button })),
    ...overrides,
  };
}

export function templateThumb(project: ProjectDoc): string | undefined {
  for (const spriteDef of project.sprites) {
    const assetId = spriteDef.costumes[0]?.assetId;
    const found = project.assets.find((item) => item.id === assetId && item.dataUrl);
    if (found?.dataUrl) return found.dataUrl;
  }
  return undefined;
}

// ── 贪吃蛇素材 ─────────────────────────────────────────────

const SNAKE_HEAD_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
  <rect x="4" y="4" width="40" height="40" rx="8" fill="#47c25a"/>
  <rect x="4" y="4" width="40" height="12" fill="#6fe07e"/>
  <rect x="11" y="16" width="9" height="9" fill="#10241a"/>
  <rect x="28" y="16" width="9" height="9" fill="#10241a"/>
  <rect x="19" y="32" width="10" height="5" fill="#10241a"/>
  <rect x="20" y="30" width="8" height="2" fill="#e0473c"/>
</svg>`;

const SNAKE_BODY_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44">
  <rect x="3" y="3" width="38" height="38" rx="7" fill="#3aa84c"/>
  <rect x="3" y="3" width="38" height="10" rx="5" fill="#59cf6b"/>
  <rect x="12" y="18" width="8" height="8" fill="#2a7d38"/>
  <rect x="25" y="25" width="7" height="7" fill="#2a7d38"/>
</svg>`;

const APPLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44">
  <path d="M22 10 q-3 -6 2 -8" stroke="#7a4a30" stroke-width="3" fill="none" stroke-linecap="round"/>
  <path d="M24 3 q9 0 10 7 q-9 2 -10 -7" fill="#5aa955"/>
  <path d="M22 11 c10 0 15 8 14 16 c-1 9 -7 13 -14 13 c-7 0 -13 -4 -14 -13 c-1 -8 4 -16 14 -16" fill="#e0473c"/>
  <ellipse cx="16" cy="19" rx="3" ry="4" fill="rgba(255,255,255,.45)"/>
</svg>`;

const WALL_V_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="50" height="560" viewBox="0 0 50 560">
  <rect width="50" height="560" fill="#3b2f66"/>
  <rect width="50" height="10" fill="#6c58a8"/>
  <rect x="0" y="70" width="50" height="8" fill="#4d3e85"/>
  <rect x="0" y="140" width="50" height="8" fill="#4d3e85"/>
  <rect x="0" y="210" width="50" height="8" fill="#4d3e85"/>
  <rect x="0" y="280" width="50" height="8" fill="#4d3e85"/>
  <rect x="0" y="350" width="50" height="8" fill="#4d3e85"/>
  <rect x="0" y="420" width="50" height="8" fill="#4d3e85"/>
  <rect x="0" y="490" width="50" height="8" fill="#4d3e85"/>
</svg>`;

const WALL_H_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="980" height="40" viewBox="0 0 980 40">
  <rect width="980" height="40" fill="#3b2f66"/>
  <rect width="980" height="8" fill="#6c58a8"/>
  <rect x="60" y="16" width="8" height="24" fill="#4d3e85"/>
  <rect x="180" y="16" width="8" height="24" fill="#4d3e85"/>
  <rect x="300" y="16" width="8" height="24" fill="#4d3e85"/>
  <rect x="420" y="16" width="8" height="24" fill="#4d3e85"/>
  <rect x="540" y="16" width="8" height="24" fill="#4d3e85"/>
  <rect x="660" y="16" width="8" height="24" fill="#4d3e85"/>
  <rect x="780" y="16" width="8" height="24" fill="#4d3e85"/>
  <rect x="900" y="16" width="8" height="24" fill="#4d3e85"/>
</svg>`;

// ── 积木拼装小工具 ─────────────────────────────────────────

type Node = Blockly.Block;
type Expr = Blockly.Block;

function seq(_ws: Blockly.Workspace, blocks: Node[]): Node {
  chain(blocks);
  return blocks[0];
}

function vget(ws: Blockly.Workspace, id: string): Expr {
  return makeBlock(ws, 'var_get', { VAR: id });
}

function setVar(ws: Blockly.Workspace, id: string, value: Expr): Node {
  const block = makeBlock(ws, 'var_set', { VAR: id });
  attachValue(block, 'VALUE', value);
  return block;
}

function changeVar(ws: Blockly.Workspace, id: string, value: Expr): Node {
  const block = makeBlock(ws, 'var_change', { VAR: id });
  attachValue(block, 'VALUE', value);
  return block;
}

function arith(ws: Blockly.Workspace, op: string, left: Expr, right: Expr): Expr {
  const block = makeBlock(ws, 'operators_arithmetic', { OP: op });
  attachValue(block, 'A', left);
  attachValue(block, 'B', right);
  return block;
}

function compare(ws: Blockly.Workspace, op: string, left: Expr, right: Expr): Expr {
  const block = makeBlock(ws, 'operators_compare', { OP: op });
  attachValue(block, 'A', left);
  attachValue(block, 'B', right);
  return block;
}

/** 未开始时允许任意方向启动；开始后禁止 180° 反向 */
function canTurnExpr(ws: Blockly.Workspace, started: string, dir: string, opposite: number): Expr {
  const block = makeBlock(ws, 'operators_logic', { OP: 'or' });
  attachValue(block, 'A', compare(ws, '=', vget(ws, started), num(ws, 0)));
  attachValue(block, 'B', not(ws, compare(ws, '=', vget(ws, dir), num(ws, opposite))));
  return block;
}

function and(ws: Blockly.Workspace, left: Expr, right: Expr): Expr {
  const block = makeBlock(ws, 'operators_logic', { OP: 'and' });
  attachValue(block, 'A', left);
  attachValue(block, 'B', right);
  return block;
}

function not(ws: Blockly.Workspace, value: Expr): Expr {
  const block = makeBlock(ws, 'operators_not');
  attachValue(block, 'VALUE', value);
  return block;
}

function touching(ws: Blockly.Workspace, target: string): Expr {
  return makeBlock(ws, 'sensing_touching', { TARGET: target });
}

function inputActive(ws: Blockly.Workspace, binding: string): Expr {
  return makeBlock(ws, 'sensing_input', { INPUT: binding });
}

function ifBlock(ws: Blockly.Workspace, cond: Expr, body: Node[]): Node {
  const block = makeBlock(ws, 'control_if');
  attachValue(block, 'COND', cond);
  attachStatement(block, 'DO', seq(ws, body));
  return block;
}

function forever(ws: Blockly.Workspace, body: Node[]): Node {
  const block = makeBlock(ws, 'control_forever');
  attachStatement(block, 'DO', seq(ws, body));
  return block;
}

function waitSecs(ws: Blockly.Workspace, seconds: number): Node {
  const block = makeBlock(ws, 'control_wait');
  attachValue(block, 'SECS', num(ws, seconds));
  return block;
}

function gotoXY(ws: Blockly.Workspace, x: Expr, y: Expr): Node {
  const block = makeBlock(ws, 'motion_gotoxy');
  attachValue(block, 'X', x);
  attachValue(block, 'Y', y);
  return block;
}

function changeX(ws: Blockly.Workspace, value: number): Node {
  const block = makeBlock(ws, 'motion_changex');
  attachValue(block, 'VALUE', num(ws, value));
  return block;
}

function changeY(ws: Blockly.Workspace, value: number): Node {
  const block = makeBlock(ws, 'motion_changey');
  attachValue(block, 'VALUE', num(ws, value));
  return block;
}

function show(ws: Blockly.Workspace): Node {
  return makeBlock(ws, 'looks_show');
}

function hide(ws: Blockly.Workspace): Node {
  return makeBlock(ws, 'looks_hide');
}

function say(ws: Blockly.Workspace, text: string, seconds: number): Node {
  const block = makeBlock(ws, 'looks_say', { TEXT: text });
  attachValue(block, 'SECS', num(ws, seconds));
  return block;
}

function stopAll(ws: Blockly.Workspace): Node {
  return makeBlock(ws, 'control_stop', { MODE: 'all' });
}

function flagHat(ws: Blockly.Workspace, body: Node[]): Node {
  const hat = makeBlock(ws, 'event_whenflag');
  connectNext(hat, seq(ws, body));
  return hat;
}

function saveWorkspace(ws: Blockly.Workspace): Record<string, unknown> {
  return Blockly.serialization.workspaces.save(ws) as Record<string, unknown>;
}

// ── 贪吃蛇 ────────────────────────────────────────────────

const SNAKE_CELL = 60;
const SNAKE_START_X = 30;
const SNAKE_START_Y = 0;
const SNAKE_MAX_LEN = 5;
const SNAKE_WALLS = ['sprite_wall_left', 'sprite_wall_right', 'sprite_wall_top', 'sprite_wall_bottom'];
const SNAKE_TRAIL = [1, 2, 3, 4] as const;

function snakeGridX(ws: Blockly.Workspace): Expr {
  // (随机 0~13) * 60 - 390  →  -390 … 390，正好对齐格子
  return arith(ws, '-', arith(ws, '*', randomRange(ws, 0, 13), num(ws, SNAKE_CELL)), num(ws, 390));
}

function snakeGridY(ws: Blockly.Workspace): Expr {
  // (随机 0~6) * 60 - 180  →  -180 … 180
  return arith(ws, '-', arith(ws, '*', randomRange(ws, 0, 6), num(ws, SNAKE_CELL)), num(ws, 180));
}

function projectSnake(): ProjectDoc {
  const assets: AssetDef[] = [
    asset('asset_snake_head', '蛇头', SNAKE_HEAD_SVG),
    asset('asset_snake_body', '蛇身', SNAKE_BODY_SVG),
    asset('asset_snake_apple', '苹果', APPLE_SVG),
    asset('asset_snake_wall_v', '竖墙', WALL_V_SVG),
    asset('asset_snake_wall_h', '横墙', WALL_H_SVG),
  ];

  const sprites: SpriteDef[] = [
    sprite({
      id: 'sprite_snake_head',
      name: '蛇头',
      x: SNAKE_START_X,
      y: SNAKE_START_Y,
      zIndex: 4,
      costumes: [{ name: '蛇头', assetId: 'asset_snake_head' }],
    }),
    ...SNAKE_TRAIL.map((index) =>
      sprite({
        id: `sprite_snake_body${index}`,
        name: `蛇身 ${index}`,
        x: -2000,
        y: -2000,
        zIndex: 3,
        visible: index <= 2,
        costumes: [{ name: `蛇身 ${index}`, assetId: 'asset_snake_body' }],
      }),
    ),
    sprite({
      id: 'sprite_apple',
      name: '苹果',
      x: -150,
      y: 120,
      zIndex: 2,
      costumes: [{ name: '苹果', assetId: 'asset_snake_apple' }],
    }),
    sprite({
      id: 'sprite_wall_left',
      name: '左墙',
      x: -455,
      y: 0,
      zIndex: 1,
      costumes: [{ name: '竖墙', assetId: 'asset_snake_wall_v' }],
    }),
    sprite({
      id: 'sprite_wall_right',
      name: '右墙',
      x: 455,
      y: 0,
      zIndex: 1,
      costumes: [{ name: '竖墙', assetId: 'asset_snake_wall_v' }],
    }),
    sprite({
      id: 'sprite_wall_top',
      name: '上墙',
      x: 0,
      y: 250,
      zIndex: 1,
      costumes: [{ name: '横墙', assetId: 'asset_snake_wall_h' }],
    }),
    sprite({
      id: 'sprite_wall_bottom',
      name: '下墙',
      x: 0,
      y: -250,
      zIndex: 1,
      costumes: [{ name: '横墙', assetId: 'asset_snake_wall_h' }],
    }),
  ];

  const variables = [
    { id: 'var_snake_score', name: '分数', value: 0 },
    { id: 'var_snake_dir', name: '_方向', value: 0 },
    { id: 'var_snake_started', name: '_已开始', value: 0 },
    { id: 'var_snake_len', name: '_长度', value: 3 },
    { id: 'var_snake_prevx', name: '_上次X', value: SNAKE_START_X },
    { id: 'var_snake_prevy', name: '_上次Y', value: SNAKE_START_Y },
    { id: 'var_snake_h1x', name: '_尾1X', value: SNAKE_START_X - SNAKE_CELL },
    { id: 'var_snake_h1y', name: '_尾1Y', value: SNAKE_START_Y },
    { id: 'var_snake_h2x', name: '_尾2X', value: SNAKE_START_X - SNAKE_CELL * 2 },
    { id: 'var_snake_h2y', name: '_尾2Y', value: SNAKE_START_Y },
    { id: 'var_snake_h3x', name: '_尾3X', value: SNAKE_START_X - SNAKE_CELL * 3 },
    { id: 'var_snake_h3y', name: '_尾3Y', value: SNAKE_START_Y },
    { id: 'var_snake_h4x', name: '_尾4X', value: SNAKE_START_X - SNAKE_CELL * 4 },
    { id: 'var_snake_h4y', name: '_尾4Y', value: SNAKE_START_Y },
  ];

  return {
    schemaVersion: 1,
    meta: nowMeta('snake-demo', '贪吃蛇'),
    stage: { width: 960, height: 540, background: '#0d1220' },
    assets,
    variables,
    sprites,
    scripts: {},
    input: padInput({ buttons: [], joystickSize: 'lg', joystickOpacity: 62 }),
  };
}

function workspacesSnake(): Record<string, unknown> {
  const ws = new Blockly.Workspace();
  const result: Record<string, unknown> = {};

  const dir = 'var_snake_dir';
  const len = 'var_snake_len';

  const started = 'var_snake_started';
  const startMove = (direction: number) => [setVar(ws, started, num(ws, 1)), setVar(ws, dir, num(ws, direction))];
  const turnRight = ifBlock(ws, canTurnExpr(ws, started, dir, 2), startMove(0));
  const turnLeft = ifBlock(ws, canTurnExpr(ws, started, dir, 0), startMove(2));
  const turnDown = ifBlock(ws, canTurnExpr(ws, started, dir, 3), startMove(1));
  const turnUp = ifBlock(ws, canTurnExpr(ws, started, dir, 1), startMove(3));

  const remember = [
    setVar(ws, 'var_snake_prevx', makeBlock(ws, 'motion_xpos')),
    setVar(ws, 'var_snake_prevy', makeBlock(ws, 'motion_ypos')),
  ];

  const moveByDirection = [
    ifBlock(ws, compare(ws, '=', vget(ws, dir), num(ws, 0)), [changeX(ws, SNAKE_CELL)]),
    ifBlock(ws, compare(ws, '=', vget(ws, dir), num(ws, 2)), [changeX(ws, -SNAKE_CELL)]),
    ifBlock(ws, compare(ws, '=', vget(ws, dir), num(ws, 1)), [changeY(ws, -SNAKE_CELL)]),
    ifBlock(ws, compare(ws, '=', vget(ws, dir), num(ws, 3)), [changeY(ws, SNAKE_CELL)]),
  ];

  const shiftTrail = [
    setVar(ws, 'var_snake_h4x', vget(ws, 'var_snake_h3x')),
    setVar(ws, 'var_snake_h4y', vget(ws, 'var_snake_h3y')),
    setVar(ws, 'var_snake_h3x', vget(ws, 'var_snake_h2x')),
    setVar(ws, 'var_snake_h3y', vget(ws, 'var_snake_h2y')),
    setVar(ws, 'var_snake_h2x', vget(ws, 'var_snake_h1x')),
    setVar(ws, 'var_snake_h2y', vget(ws, 'var_snake_h1y')),
    setVar(ws, 'var_snake_h1x', vget(ws, 'var_snake_prevx')),
    setVar(ws, 'var_snake_h1y', vget(ws, 'var_snake_prevy')),
  ];

  let wallCond: Expr = touching(ws, SNAKE_WALLS[0]);
  for (const wall of SNAKE_WALLS.slice(1)) {
    const block = makeBlock(ws, 'operators_logic', { OP: 'or' });
    attachValue(block, 'A', wallCond);
    attachValue(block, 'B', touching(ws, wall));
    wallCond = block;
  }

  const hitSelf: Node[] = [];
  for (const index of [2, 3, 4] as const) {
    const cond = and(ws, compare(ws, '>=', vget(ws, len), num(ws, index + 1)), touching(ws, `sprite_snake_body${index}`));
    hitSelf.push(ifBlock(ws, cond, [say(ws, '咬到自己了，游戏结束！点「运行」重新开始', 2), stopAll(ws)]));
  }

  flagHat(ws, [
    forever(ws, [
      ifBlock(ws, inputActive(ws, 'right'), [turnRight]),
      ifBlock(ws, inputActive(ws, 'left'), [turnLeft]),
      ifBlock(ws, inputActive(ws, 'down'), [turnDown]),
      ifBlock(ws, inputActive(ws, 'up'), [turnUp]),
      ifBlock(ws, compare(ws, '=', vget(ws, started), num(ws, 1)), [
        ...remember,
        ...moveByDirection,
        ...shiftTrail,
        ifBlock(ws, wallCond, [say(ws, '撞墙了，游戏结束！得分见左上角，点「运行」重新开始', 2), stopAll(ws)]),
        ...hitSelf,
        waitSecs(ws, 0.16),
      ]),
    ]),
  ]);
  result.sprite_snake_head = saveWorkspace(ws);
  ws.clear();
  ws.dispose();

  const appleWs = new Blockly.Workspace();
  const eat = ifBlock(appleWs, touching(appleWs, 'sprite_snake_head'), [
    changeVar(appleWs, 'var_snake_score', num(appleWs, 1)),
    ifBlock(appleWs, compare(appleWs, '<', vget(appleWs, len), num(appleWs, SNAKE_MAX_LEN)), [
      changeVar(appleWs, len, num(appleWs, 1)),
    ]),
    hide(appleWs),
    gotoXY(appleWs, snakeGridX(appleWs), snakeGridY(appleWs)),
    show(appleWs),
    say(appleWs, '好吃！蛇变长了', 0.6),
  ]);
  flagHat(appleWs, [forever(appleWs, [eat, waitSecs(appleWs, 0.12)])]);
  result.sprite_apple = saveWorkspace(appleWs);
  appleWs.clear();
  appleWs.dispose();

  for (const index of SNAKE_TRAIL) {
    const bodyWs = new Blockly.Workspace();
    const follow = ifBlock(bodyWs, compare(bodyWs, '>=', vget(bodyWs, len), num(bodyWs, index + 1)), [
      show(bodyWs),
      gotoXY(bodyWs, vget(bodyWs, `var_snake_h${index}x`), vget(bodyWs, `var_snake_h${index}y`)),
    ]);
    const away = ifBlock(bodyWs, compare(bodyWs, '<', vget(bodyWs, len), num(bodyWs, index + 1)), [
      hide(bodyWs),
      gotoXY(bodyWs, num(bodyWs, -2000), num(bodyWs, -2000)),
    ]);
    flagHat(bodyWs, [forever(bodyWs, [follow, away, waitSecs(bodyWs, 0.03)])]);
    result[`sprite_snake_body${index}`] = saveWorkspace(bodyWs);
    bodyWs.clear();
    bodyWs.dispose();
  }

  return result;
}

// ── 空白工程 ──────────────────────────────────────────────

function projectBlank(): ProjectDoc {
  const assetDef = asset('asset_blank_sprite', '角色素材', spritePlaceholderSvg(0));
  return {
    schemaVersion: 1,
    meta: nowMeta('blank-project', '未命名工程'),
    stage: { width: 960, height: 540, background: '#8fd3ff' },
    assets: [assetDef],
    variables: [],
    sprites: [
      sprite({
        id: 'sprite_1',
        name: '角色 1',
        costumes: [{ name: '造型 1', assetId: 'asset_blank_sprite' }],
      }),
    ],
    scripts: {},
    input: padInput({}),
  };
}

function workspacesBlank(): Record<string, unknown> {
  return {};
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
    id: 'snake',
    nameKey: 'templates.snake',
    taglineKey: 'templates.snakeTagline',
    scriptGroups: 7,
    project: projectSnake,
    workspaces: workspacesSnake,
    build: () => ({ project: projectSnake(), workspaces: workspacesSnake() }),
  },
];
