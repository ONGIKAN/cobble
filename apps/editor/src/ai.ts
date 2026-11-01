/**
 * AI 创作：用户自带 OpenAI 兼容 API，让模型输出一份「游戏设计 JSON」，
 * 再由本地确定性构造器拼成工程与积木脚本（模型只负责设计，不直接生成积木 JSON）。
 */
import * as Blockly from 'blockly';
import { z } from 'zod';
import { DEFAULT_INPUT, defaultBindings, type AssetDef, type ProjectDoc, type SpriteDef } from '@cobbox/project';
import { makeBlock, num, attachValue, attachStatement, chain, connectNext, randomRange } from './block-builder';
import { LIBRARY_ASSETS } from './asset-library';
import { TEMPLATES } from './templates';

export const AI_CONFIG_KEY = 'cobbox.ai';

export interface AiConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export const DEFAULT_AI_CONFIG: AiConfig = {
  baseUrl: 'https://api.openai.com/v1',
  apiKey: '',
  model: 'gpt-4o-mini',
};

export function readAiConfig(): AiConfig {
  try {
    const raw = localStorage.getItem(AI_CONFIG_KEY);
    if (!raw) return { ...DEFAULT_AI_CONFIG };
    const parsed = JSON.parse(raw) as Partial<AiConfig>;
    return {
      baseUrl: typeof parsed.baseUrl === 'string' && parsed.baseUrl.trim() ? parsed.baseUrl.trim() : DEFAULT_AI_CONFIG.baseUrl,
      apiKey: typeof parsed.apiKey === 'string' ? parsed.apiKey.trim() : '',
      model: typeof parsed.model === 'string' && parsed.model.trim() ? parsed.model.trim() : DEFAULT_AI_CONFIG.model,
    };
  } catch {
    return { ...DEFAULT_AI_CONFIG };
  }
}

export function saveAiConfig(config: AiConfig): void {
  localStorage.setItem(
    AI_CONFIG_KEY,
    JSON.stringify({ baseUrl: config.baseUrl.trim(), apiKey: config.apiKey.trim(), model: config.model.trim() }),
  );
}

export function hasAiConfig(config: AiConfig = readAiConfig()): boolean {
  return Boolean(config.apiKey && config.model && config.baseUrl);
}

export type AiErrorCode = 'no-config' | 'network' | 'http' | 'format';

export class AiError extends Error {
  code: AiErrorCode;
  status?: number;

  constructor(code: AiErrorCode, message: string, status?: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

const SYSTEM_PROMPT = [
  'You are a 2D game designer for a block-based game maker called CobBox.',
  'Given the user request, design ONE small playable game and answer with a single JSON object only (no markdown).',
  'JSON schema:',
  '{',
  '  "title": string (1-40 chars, game title in the same language as the user request),',
  '  "genre": "collect" | "avoid" | "clicker" | "snake",',
  '  "background": string (hex color like "#8fd3ff"),',
  '  "player": "cat" | "hero" | "knight" | "mole" | "pac",',
  '  "item": "coin" | "star" | "apple" | "potion",',
  '  "enemy": "ghost" | "ghostGreen" | "slime" | "mole",',
  '  "targetScore": integer 3-30,',
  '  "speed": integer 2-16,',
  '  "instruction": string (1-80 chars, one-line how-to-play shown when the game starts),',
  '  "winText": string (1-40 chars),',
  '  "loseText": string (1-40 chars)',
  '}',
  'Rules:',
  '- collect: player moves with arrow keys and touches the item to score; reach targetScore to win.',
  '- avoid: player moves left/right and dodges the enemy; survive targetScore seconds to win; being hit loses.',
  '- clicker: tap/click the item to score; reach targetScore to win.',
  '- snake: a complete snake game; targetScore is ignored.',
  '- Use short, friendly Chinese text when the user request is Chinese; otherwise match the user language.',
  '- Exactly one JSON object, no commentary, no code fences.',
].join('\n');

interface ChatResponse {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
}

/** 调用 OpenAI 兼容接口，返回模型文本 */
export async function requestAiText(config: AiConfig, prompt: string, signal?: AbortSignal): Promise<string> {
  if (!hasAiConfig(config)) throw new AiError('no-config', 'AI API is not configured');
  const endpoint = `${config.baseUrl.replace(/\/+$/, '')}/chat/completions`;
  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${config.apiKey}` },
      body: JSON.stringify({
        model: config.model,
        temperature: 0.8,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
      }),
      signal,
    });
  } catch (error) {
    throw new AiError('network', error instanceof Error ? error.message : 'network error');
  }
  if (!response.ok) {
    let detail = '';
    try {
      const data = (await response.json()) as ChatResponse;
      detail = data.error?.message ?? '';
    } catch {
      // ignore body parse errors
    }
    throw new AiError('http', detail || `HTTP ${response.status}`, response.status);
  }
  const data = (await response.json()) as ChatResponse;
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new AiError('format', 'empty response');
  return content;
}

/** 测试连接：优先 GET /models（不消耗生成额度） */
export async function testAiConnection(config: AiConfig, signal?: AbortSignal): Promise<void> {
  if (!hasAiConfig(config)) throw new AiError('no-config', 'AI API is not configured');
  const endpoint = `${config.baseUrl.replace(/\/+$/, '')}/models`;
  let response: Response;
  try {
    response = await fetch(endpoint, {
      headers: { authorization: `Bearer ${config.apiKey}` },
      signal,
    });
  } catch (error) {
    throw new AiError('network', error instanceof Error ? error.message : 'network error');
  }
  if (response.status === 401 || response.status === 403) {
    throw new AiError('http', 'unauthorized', response.status);
  }
  if (!response.ok && response.status !== 404) {
    throw new AiError('http', `HTTP ${response.status}`, response.status);
  }
}

// ── 游戏设计 JSON ─────────────────────────────────────────

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/);

export const gameSpecSchema = z.object({
  title: z.string().min(1).max(40),
  genre: z.enum(['collect', 'avoid', 'clicker', 'snake']),
  background: hexColor.default('#8fd3ff'),
  player: z.enum(['cat', 'hero', 'knight', 'mole', 'pac']).default('cat'),
  item: z.enum(['coin', 'star', 'apple', 'potion']).default('coin'),
  enemy: z.enum(['ghost', 'ghostGreen', 'slime', 'mole']).default('ghost'),
  targetScore: z.number().int().min(3).max(30).default(10),
  speed: z.number().int().min(2).max(16).default(6),
  instruction: z.string().min(1).max(80),
  winText: z.string().min(1).max(40),
  loseText: z.string().min(1).max(40),
});

export type GameSpec = z.infer<typeof gameSpecSchema>;

function extractJson(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new AiError('format', 'no JSON object in response');
  }
}

export function parseGameSpec(text: string): GameSpec {
  let raw: unknown;
  try {
    raw = extractJson(text);
  } catch (error) {
    if (error instanceof AiError) throw error;
    throw new AiError('format', error instanceof Error ? error.message : 'invalid JSON');
  }
  const parsed = gameSpecSchema.safeParse(raw);
  if (!parsed.success) {
    throw new AiError('format', parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; '));
  }
  return parsed.data;
}

/** 让模型设计游戏并返回校验后的设计 */
export async function designGame(config: AiConfig, prompt: string, signal?: AbortSignal): Promise<GameSpec> {
  const text = await requestAiText(config, prompt, signal);
  return parseGameSpec(text);
}

// ── 由设计 JSON 生成工程与积木 ─────────────────────────────

type Node = Blockly.Block;

function seq(blocks: Node[]): Node {
  chain(blocks);
  return blocks[0];
}

function vget(ws: Blockly.Workspace, id: string): Blockly.Block {
  return makeBlock(ws, 'var_get', { VAR: id });
}


function changeVar(ws: Blockly.Workspace, id: string, value: Blockly.Block): Node {
  const block = makeBlock(ws, 'var_change', { VAR: id });
  attachValue(block, 'VALUE', value);
  return block;
}


function compare(ws: Blockly.Workspace, op: string, left: Blockly.Block, right: Blockly.Block): Blockly.Block {
  const block = makeBlock(ws, 'operators_compare', { OP: op });
  attachValue(block, 'A', left);
  attachValue(block, 'B', right);
  return block;
}

function touching(ws: Blockly.Workspace, target: string): Blockly.Block {
  return makeBlock(ws, 'sensing_touching', { TARGET: target });
}

function inputActive(ws: Blockly.Workspace, binding: string): Blockly.Block {
  return makeBlock(ws, 'sensing_input', { INPUT: binding });
}

function coordinate(ws: Blockly.Workspace, kind: 'x' | 'y'): Blockly.Block {
  return makeBlock(ws, kind === 'x' ? 'motion_xpos' : 'motion_ypos');
}

function ifBlock(ws: Blockly.Workspace, cond: Blockly.Block, body: Node[]): Node {
  const block = makeBlock(ws, 'control_if');
  attachValue(block, 'COND', cond);
  attachStatement(block, 'DO', seq(body));
  return block;
}

function forever(ws: Blockly.Workspace, body: Node[]): Node {
  const block = makeBlock(ws, 'control_forever');
  attachStatement(block, 'DO', seq(body));
  return block;
}

function waitSecs(ws: Blockly.Workspace, seconds: number): Node {
  const block = makeBlock(ws, 'control_wait');
  attachValue(block, 'SECS', num(ws, seconds));
  return block;
}

function gotoXY(ws: Blockly.Workspace, x: Blockly.Block, y: Blockly.Block): Node {
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

function changeY(ws: Blockly.Workspace, value: Blockly.Block | number): Node {
  const block = makeBlock(ws, 'motion_changey');
  attachValue(block, 'VALUE', typeof value === 'number' ? num(ws, value) : value);
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
  connectNext(hat, seq(body));
  return hat;
}

function clickHat(ws: Blockly.Workspace, body: Node[]): Node {
  const hat = makeBlock(ws, 'event_whenclick');
  connectNext(hat, seq(body));
  return hat;
}

function saveWorkspace(ws: Blockly.Workspace): Record<string, unknown> {
  return Blockly.serialization.workspaces.save(ws) as Record<string, unknown>;
}

function buildWorkspace(build: (ws: Blockly.Workspace) => void): Record<string, unknown> {
  const ws = new Blockly.Workspace();
  try {
    build(ws);
    return saveWorkspace(ws);
  } finally {
    ws.clear();
    ws.dispose();
  }
}

function libraryAsset(id: string): AssetDef {
  const found = LIBRARY_ASSETS.find((asset) => asset.id === id) ?? LIBRARY_ASSETS[0];
  return { id: `asset_ai_${found.id}`, name: found.nameKey.replace('library.items.', ''), kind: 'image', dataUrl: found.dataUrl };
}

function spriteFromAsset(id: string, name: string, assetId: string, x: number, y: number, zIndex: number, size = 70): SpriteDef {
  return {
    id,
    name,
    x,
    y,
    rotation: 90,
    size,
    visible: true,
    zIndex,
    rotationStyle: 'none',
    costumes: [{ name, assetId }],
    sounds: [],
  };
}

function baseProject(spec: GameSpec): ProjectDoc {
  return {
    schemaVersion: 1,
    meta: { id: `ai-${Date.now().toString(36)}`, name: spec.title, updatedAt: new Date().toISOString() },
    stage: { width: 960, height: 540, background: spec.background },
    assets: [],
    variables: [],
    sprites: [],
    scripts: {},
    input: {
      ...DEFAULT_INPUT,
      bindings: defaultBindings(),
      buttons: DEFAULT_INPUT.buttons.map((button) => ({ ...button })),
      joystickSize: 'lg',
      joystickOpacity: 70,
    },
  };
}

const SCORE_VAR = 'var_ai_score';

/** collect：方向键移动，碰到物品得分，达到目标分获胜 */
function buildCollect(spec: GameSpec): { project: ProjectDoc; workspaces: Record<string, unknown> } {
  const project = baseProject(spec);
  const playerAsset = libraryAsset(spec.player);
  const itemAsset = libraryAsset(spec.item);
  project.assets = [playerAsset, itemAsset];
  project.variables = [ { id: SCORE_VAR, name: '分数', value: 0 } ];
  project.sprites = [
    spriteFromAsset('sprite_ai_player', '主角', playerAsset.id, 0, -140, 3, 74),
    spriteFromAsset('sprite_ai_item', '收集物', itemAsset.id, 240, 160, 2, 62),
  ];
  const workspaces: Record<string, unknown> = {};

  workspaces.sprite_ai_player = buildWorkspace((ws) => {
    flagHat(ws, [
      say(ws, spec.instruction, 3),
      forever(ws, [
        ifBlock(ws, inputActive(ws, 'left'), [changeX(ws, -spec.speed)]),
        ifBlock(ws, inputActive(ws, 'right'), [changeX(ws, spec.speed)]),
        ifBlock(ws, inputActive(ws, 'up'), [changeY(ws, spec.speed)]),
        ifBlock(ws, inputActive(ws, 'down'), [changeY(ws, -spec.speed)]),
      ]),
    ]);
  });

  workspaces.sprite_ai_item = buildWorkspace((ws) => {
    flagHat(ws, [
      forever(ws, [
        ifBlock(ws, touching(ws, 'sprite_ai_player'), [
          changeVar(ws, SCORE_VAR, num(ws, 1)),
          say(ws, '+1', 0.4),
          hide(ws),
          gotoXY(ws, randomRange(ws, -380, 380), randomRange(ws, -190, 190)),
          show(ws),
        ]),
        ifBlock(ws, compare(ws, '>=', vget(ws, SCORE_VAR), num(ws, spec.targetScore)), [
          say(ws, spec.winText, 3),
          stopAll(ws),
        ]),
        waitSecs(ws, 0.05),
      ]),
    ]);
  });

  return { project, workspaces };
}

/** avoid：左右移动躲开敌人，坚持 targetScore 秒获胜 */
function buildAvoid(spec: GameSpec): { project: ProjectDoc; workspaces: Record<string, unknown> } {
  const project = baseProject(spec);
  const playerAsset = libraryAsset(spec.player);
  const enemyAsset = libraryAsset(spec.enemy);
  project.assets = [playerAsset, enemyAsset];
  project.variables = [
    { id: SCORE_VAR, name: '坚持', value: 0 },
  ];
  project.sprites = [
    spriteFromAsset('sprite_ai_player', '主角', playerAsset.id, 0, -200, 3, 74),
    spriteFromAsset('sprite_ai_enemy', '敌人', enemyAsset.id, 0, 330, 2, 64),
  ];
  const workspaces: Record<string, unknown> = {};

  workspaces.sprite_ai_player = buildWorkspace((ws) => {
    flagHat(ws, [
      say(ws, spec.instruction, 3),
      forever(ws, [
        ifBlock(ws, inputActive(ws, 'left'), [changeX(ws, -spec.speed)]),
        ifBlock(ws, inputActive(ws, 'right'), [changeX(ws, spec.speed)]),
      ]),
    ]);
  });

  workspaces.sprite_ai_enemy = buildWorkspace((ws) => {
    flagHat(ws, [
      forever(ws, [
        changeY(ws, -spec.speed),
        ifBlock(ws, compare(ws, '<', coordinate(ws, 'y'), num(ws, -330)), [
          gotoXY(ws, randomRange(ws, -400, 400), num(ws, 330)),
        ]),
        ifBlock(ws, touching(ws, 'sprite_ai_player'), [
          say(ws, spec.loseText, 3),
          stopAll(ws),
        ]),
        waitSecs(ws, 0.03),
      ]),
    ]);
    flagHat(ws, [
      forever(ws, [
        waitSecs(ws, 1),
        changeVar(ws, SCORE_VAR, num(ws, 1)),
        ifBlock(ws, compare(ws, '>=', vget(ws, SCORE_VAR), num(ws, spec.targetScore)), [
          say(ws, spec.winText, 3),
          stopAll(ws),
        ]),
      ]),
    ]);
  });

  return { project, workspaces };
}

/** clicker：点击物品得分 */
function buildClicker(spec: GameSpec): { project: ProjectDoc; workspaces: Record<string, unknown> } {
  const project = baseProject(spec);
  const itemAsset = libraryAsset(spec.item);
  project.assets = [itemAsset];
  project.variables = [{ id: SCORE_VAR, name: '分数', value: 0 }];
  project.sprites = [spriteFromAsset('sprite_ai_item', '目标', itemAsset.id, 0, 0, 2, 82)];
  const workspaces: Record<string, unknown> = {};

  workspaces.sprite_ai_item = buildWorkspace((ws) => {
    flagHat(ws, [say(ws, spec.instruction, 3)]);
    clickHat(ws, [
      changeVar(ws, SCORE_VAR, num(ws, 1)),
      say(ws, '+1', 0.3),
      ifBlock(ws, compare(ws, '>=', vget(ws, SCORE_VAR), num(ws, spec.targetScore)), [
        say(ws, spec.winText, 3),
        stopAll(ws),
      ]),
      hide(ws),
      gotoXY(ws, randomRange(ws, -360, 360), randomRange(ws, -170, 170)),
      show(ws),
    ]);
  });

  return { project, workspaces };
}

/** snake：复用内置贪吃蛇，仅换标题与背景 */
function buildSnake(spec: GameSpec): { project: ProjectDoc; workspaces: Record<string, unknown> } {
  const template = TEMPLATES.find((item) => item.id === 'snake') ?? TEMPLATES[0];
  const built = template.build();
  const project: ProjectDoc = {
    ...built.project,
    meta: { ...built.project.meta, id: `ai-${Date.now().toString(36)}`, name: spec.title, updatedAt: new Date().toISOString() },
    stage: { ...built.project.stage, background: spec.background },
  };
  return { project, workspaces: built.workspaces };
}

/** 把校验后的设计 JSON 变成可运行的工程 + 积木脚本 */
export function buildGameFromSpec(spec: GameSpec): { project: ProjectDoc; workspaces: Record<string, unknown> } {
  const built =
    spec.genre === 'avoid'
      ? buildAvoid(spec)
      : spec.genre === 'clicker'
        ? buildClicker(spec)
        : spec.genre === 'snake'
          ? buildSnake(spec)
          : buildCollect(spec);
  return built;
}

export { SCORE_VAR };
