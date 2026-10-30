import type {
  CompiledProject,
  CompiledScript,
  IRExpr,
  IRNode,
  TouchingTarget,
} from '@cobble/project';
import type { EngineAdapter, InputState, SpriteVisual } from './adapter';

type Yield = { kind: 'frame' } | { kind: 'sleep'; ms: number };

interface SpriteState {
  id: string;
  x: number;
  y: number;
  direction: number;
  size: number;
  visible: boolean;
  zIndex: number;
  rotationStyle: 'all-around' | 'left-right' | 'none';
  costumeIndex: number;
}

interface Thread {
  script: CompiledScript;
  gen: Generator<Yield, void, unknown>;
  waitUntil: number;
  done: boolean;
}

class StopScript extends Error {}
class StopAllScript extends Error {}

const FRAME: Yield = { kind: 'frame' };
/** 固定逻辑帧：移动/循环按 60fps 固定步长推进，与显示器刷新率无关 */
const FIXED_DT_MS = 1000 / 60;

/** 每帧每线程最多执行的 IR 指令数，防止死循环卡死渲染帧 */
const INSTRUCTION_BUDGET = 2000;

function normalizeDirection(deg: number): number {
  const d = ((deg % 360) + 360) % 360;
  return d;
}

function asNumber(value: number | string): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function truthy(value: number | string): boolean {
  if (typeof value === 'number') return value !== 0 && !Number.isNaN(value);
  return value !== '' && value !== '0' && value.toLowerCase() !== 'false';
}

/**
 * 调度器 + 解释器：
 * - 每个 hat 一个线程（Generator），协作式调度
 * - 循环每迭代让出一帧；等待/滑行按真实时间推进
 * - 同一帧内所有线程共享时间片
 */
export class Runtime {
  private adapter: EngineAdapter;
  private project: CompiledProject;
  private variables = new Map<string, number | string>();
  private sprites = new Map<string, SpriteState>();
  private threads: Thread[] = [];
  private input: InputState = {
    keysDown: new Set<string>(),
    touchBindings: new Set<string>(),
    mouseDown: false,
    mousePressed: false,
    mouseX: 0,
    mouseY: 0,
  };
  private prevKeys = new Set<string>();
  /** 输入事件 id -> 绑定的按键 code 列表 */
  private bindingKeys = new Map<string, string[]>();
  private prevBindings = new Set<string>();
  private timeMs = 0;
  private dt = 16.7;
  private accumulator = 0;
  private running = false;
  private started = false;

  constructor(adapter: EngineAdapter, project: CompiledProject) {
    this.adapter = adapter;
    this.project = project;
    for (const v of project.variables) this.variables.set(v.id, v.value);
    for (const binding of project.input?.bindings ?? []) this.bindingKeys.set(binding.id, binding.keys);
    for (const sprite of project.sprites) {
      this.sprites.set(sprite.id, {
        id: sprite.id,
        x: sprite.x,
        y: sprite.y,
        direction: sprite.rotation,
        size: sprite.size,
        visible: sprite.visible,
        zIndex: sprite.zIndex,
        rotationStyle: sprite.rotationStyle,
        costumeIndex: 0,
      });
    }
  }

  start(): void {
    if (this.started) return;
    this.started = true;
    this.running = true;
    for (const script of this.project.scripts) {
      if (script.hat.kind === 'flag') this.startThread(script);
    }
    this.adapter.onFrame((dtMs) => this.advance(dtMs));
  }

  stop(): void {
    this.running = false;
    this.threads = [];
  }

  get isRunning(): boolean {
    return this.running;
  }

  getSpriteState(id: string): SpriteState | undefined {
    const s = this.sprites.get(id);
    return s ? { ...s } : undefined;
  }

  getVariables(): Array<{ id: string; name: string; value: number | string }> {
    return this.project.variables.map((v) => ({
      id: v.id,
      name: v.name,
      value: this.variables.get(v.id) ?? 0,
    }));
  }

  // ── 调度 ────────────────────────────────────────────────

  private advance(dtMs: number): void {
    if (!this.running) return;
    this.accumulator += Math.min(250, Math.max(0, dtMs));
    let steps = 0;
    while (this.accumulator >= FIXED_DT_MS && steps < 5) {
      this.accumulator -= FIXED_DT_MS;
      this.step(FIXED_DT_MS);
      steps += 1;
    }
    if (steps === 5) this.accumulator = 0;
  }

  private step(dtMs: number): void {
    if (!this.running) return;
    this.dt = dtMs;
    this.timeMs += this.dt;
    const input = this.adapter.getInput();
    this.input = input;
    this.handleHats(input);
    this.runThreads();
    this.render();
    this.prevKeys = new Set(input.keysDown);
    this.prevBindings = new Set(this.bindingIdsDown());
  }

  private bindingIdsDown(): string[] {
    const ids: string[] = [];
    for (const id of this.bindingKeys.keys()) {
      if (this.bindingActive(id)) ids.push(id);
    }
    return ids;
  }

  /** 输入事件是否被按下：任一绑定按键按下，或触屏控件触发 */
  private bindingActive(id: string): boolean {
    if (this.input.touchBindings?.has(id)) return true;
    const keys = this.bindingKeys.get(id);
    if (!keys || keys.length === 0) return this.input.keysDown.has(id);
    return keys.some((code) => this.input.keysDown.has(code));
  }

  private handleHats(input: InputState): void {
    for (const script of this.project.scripts) {
      if (script.hat.kind === 'key') {
        const key = script.hat.key;
        if (input.keysDown.has(key) && !this.prevKeys.has(key)) this.startThread(script);
      }
      if (script.hat.kind === 'input') {
        const id = script.hat.bindingId;
        if (this.bindingActive(id) && !this.prevBindings.has(id)) this.startThread(script);
      }
    }
    if (input.mousePressed) {
      for (const script of this.project.scripts) {
        if (script.hat.kind !== 'click') continue;
        if (this.containsPoint(script.spriteId, input.mouseX, input.mouseY)) {
          this.startThread(script);
        }
      }
    }
  }

  private startThread(script: CompiledScript): void {
    const gen = this.execScript(script);
    this.threads.push({ script, gen, waitUntil: 0, done: false });
  }

  private runThreads(): void {
    const snapshot = [...this.threads];
    let stoppedAll = false;
    for (const thread of snapshot) {
      if (thread.done || stoppedAll) continue;
      if (this.timeMs < thread.waitUntil) continue;
      let budget = INSTRUCTION_BUDGET;
      while (budget-- > 0) {
        let result: IteratorResult<Yield, void>;
        try {
          result = thread.gen.next();
        } catch (error) {
          thread.done = true;
          if (error instanceof StopAllScript) stoppedAll = true;
          break;
        }
        if (result.done) {
          thread.done = true;
          break;
        }
        const yielded = result.value;
        if (yielded.kind === 'frame') break;
        thread.waitUntil = this.timeMs + yielded.ms;
        break;
      }
    }
    if (stoppedAll) {
      this.threads.forEach((t) => (t.done = true));
    }
    this.threads = this.threads.filter((t) => !t.done);
  }

  private *execScript(script: CompiledScript): Generator<Yield, void, unknown> {
    yield* this.execBody(script.spriteId, script.body);
  }

  private *execBody(spriteId: string, nodes: IRNode[]): Generator<Yield, void, unknown> {
    for (const node of nodes) {
      yield* this.execNode(spriteId, node);
    }
  }

  private *execNode(spriteId: string, node: IRNode): Generator<Yield, void, unknown> {
    const sprite = this.sprites.get(spriteId);
    if (!sprite) return;
    const num = (expr: IRExpr) => asNumber(this.evalExpr(spriteId, expr));

    switch (node.op) {
      case 'move': {
        const steps = num(node.steps);
        const rad = (normalizeDirection(sprite.direction) * Math.PI) / 180;
        sprite.x += Math.sin(rad) * steps;
        sprite.y += Math.cos(rad) * steps;
        return;
      }
      case 'turn':
        sprite.direction = normalizeDirection(sprite.direction + num(node.degrees));
        return;
      case 'point':
        sprite.direction = normalizeDirection(num(node.direction));
        return;
      case 'goto':
        sprite.x = num(node.x);
        sprite.y = num(node.y);
        return;
      case 'glide': {
        const seconds = num(node.seconds);
        const targetX = num(node.x);
        const targetY = num(node.y);
        const fromX = sprite.x;
        const fromY = sprite.y;
        if (seconds <= 0 || this.dt <= 0) {
          sprite.x = targetX;
          sprite.y = targetY;
          return;
        }
        const frames = Math.max(1, Math.round((seconds * 1000) / this.dt));
        for (let i = 1; i <= frames; i++) {
          const t = i / frames;
          sprite.x = fromX + (targetX - fromX) * t;
          sprite.y = fromY + (targetY - fromY) * t;
          yield FRAME;
        }
        return;
      }
      case 'changeX':
        sprite.x += num(node.value);
        return;
      case 'changeY':
        sprite.y += num(node.value);
        return;
      case 'bounce': {
        this.bounce(sprite);
        return;
      }
      case 'setRotationStyle':
        sprite.rotationStyle = node.style;
        return;
      case 'say':
        this.adapter.say(spriteId, String(this.evalExpr(spriteId, node.text)), num(node.seconds));
        return;
      case 'show':
        sprite.visible = true;
        return;
      case 'hide':
        sprite.visible = false;
        return;
      case 'nextCostume': {
        const def = this.project.sprites.find((s) => s.id === spriteId);
        const count = def?.costumes.length ?? 0;
        if (count > 0) sprite.costumeIndex = (sprite.costumeIndex + 1) % count;
        return;
      }
      case 'switchCostume': {
        const def = this.project.sprites.find((s) => s.id === spriteId);
        const index = def?.costumes.findIndex((c) => c.name === node.costume) ?? -1;
        if (index >= 0) sprite.costumeIndex = index;
        return;
      }
      case 'gotoSprite': {
        const target = this.sprites.get(node.spriteId);
        if (target) {
          sprite.x = target.x;
          sprite.y = target.y;
        }
        return;
      }
      case 'waitUntil': {
        while (this.running && !truthy(this.evalExpr(spriteId, node.cond))) {
          yield FRAME;
        }
        return;
      }
      case 'setSize':
        sprite.size = num(node.percent);
        return;
      case 'setLayer': {
        const values = [...this.sprites.values()];
        const max = Math.max(...values.map((s) => s.zIndex), 0);
        const min = Math.min(...values.map((s) => s.zIndex), 0);
        sprite.zIndex = node.front ? max + 1 : min - 1;
        return;
      }
      case 'playSound':
        this.adapter.playSound(node.soundId);
        return;
      case 'stopSounds':
        this.adapter.stopSounds();
        return;
      case 'setVolume':
        this.adapter.setVolume(num(node.percent));
        return;
      case 'wait': {
        const ms = Math.max(0, num(node.seconds) * 1000);
        if (ms > 0) yield { kind: 'sleep', ms };
        return;
      }
      case 'repeat': {
        const times = Math.max(0, Math.round(num(node.times)));
        for (let i = 0; i < times; i++) {
          yield* this.execBody(spriteId, node.body);
          yield FRAME;
        }
        return;
      }
      case 'forever': {
        while (this.running) {
          yield* this.execBody(spriteId, node.body);
          yield FRAME;
        }
        return;
      }
      case 'if': {
        if (truthy(this.evalExpr(spriteId, node.cond))) yield* this.execBody(spriteId, node.then);
        return;
      }
      case 'ifElse': {
        if (truthy(this.evalExpr(spriteId, node.cond))) yield* this.execBody(spriteId, node.then);
        else yield* this.execBody(spriteId, node.else);
        return;
      }
      case 'stop':
        if (node.mode === 'all') throw new StopAllScript();
        throw new StopScript();
      case 'broadcast':
        this.broadcast(node.message);
        return;
      case 'setVar':
        this.variables.set(node.varId, this.evalExpr(spriteId, node.value));
        return;
      case 'changeVar': {
        const current = asNumber(this.variables.get(node.varId) ?? 0);
        this.variables.set(node.varId, current + num(node.value));
        return;
      }
      default:
        return;
    }
  }

  private bounce(sprite: SpriteState): void {
    const halfW = this.project.stage.width / 2;
    const halfH = this.project.stage.height / 2;
    const size = this.adapter.getSize(sprite.id);
    const hw = size.width / 2;
    const hh = size.height / 2;
    let hitX = false;
    let hitY = false;
    if (sprite.x - hw < -halfW || sprite.x + hw > halfW) {
      sprite.direction = normalizeDirection(180 - sprite.direction);
      hitX = true;
    }
    if (sprite.y - hh < -halfH || sprite.y + hh > halfH) {
      sprite.direction = normalizeDirection(-sprite.direction);
      hitY = true;
    }
    if (hitX) sprite.x = Math.max(-halfW + hw, Math.min(halfW - hw, sprite.x));
    if (hitY) sprite.y = Math.max(-halfH + hh, Math.min(halfH - hh, sprite.y));
  }

  private broadcast(message: string): void {
    for (const script of this.project.scripts) {
      if (script.hat.kind === 'message' && script.hat.message === message) this.startThread(script);
    }
  }

  private containsPoint(spriteId: string, x: number, y: number): boolean {
    const sprite = this.sprites.get(spriteId);
    if (!sprite || !sprite.visible) return false;
    const size = this.adapter.getSize(spriteId);
    return (
      x >= sprite.x - size.width / 2 &&
      x <= sprite.x + size.width / 2 &&
      y >= sprite.y - size.height / 2 &&
      y <= sprite.y + size.height / 2
    );
  }

  private touching(spriteId: string, target: TouchingTarget): boolean {
    const a = this.sprites.get(spriteId);
    if (!a) return false;
    const aSize = this.adapter.getSize(spriteId);
    const aLeft = a.x - aSize.width / 2;
    const aRight = a.x + aSize.width / 2;
    const aBottom = a.y - aSize.height / 2;
    const aTop = a.y + aSize.height / 2;
    if (target.kind === 'edge') {
      const halfW = this.project.stage.width / 2;
      const halfH = this.project.stage.height / 2;
      return aLeft <= -halfW || aRight >= halfW || aBottom <= -halfH || aTop >= halfH;
    }
    if (target.kind === 'mouse') {
      const { mouseX, mouseY } = this.input;
      return mouseX >= aLeft && mouseX <= aRight && mouseY >= aBottom && mouseY <= aTop;
    }
    const b = this.sprites.get(target.spriteId);
    if (!b || !b.visible) return false;
    const bSize = this.adapter.getSize(target.spriteId);
    const bLeft = b.x - bSize.width / 2;
    const bRight = b.x + bSize.width / 2;
    const bBottom = b.y - bSize.height / 2;
    const bTop = b.y + bSize.height / 2;
    return !(aRight < bLeft || aLeft > bRight || aTop < bBottom || aBottom > bTop);
  }

  private evalExpr(spriteId: string, expr: IRExpr): number | string {
    switch (expr.kind) {
      case 'const':
        return expr.value;
      case 'var':
        return this.variables.get(expr.varId) ?? 0;
      case 'arith': {
        const a = asNumber(this.evalExpr(spriteId, expr.left));
        const b = asNumber(this.evalExpr(spriteId, expr.right));
        switch (expr.op) {
          case '+':
            return a + b;
          case '-':
            return a - b;
          case '*':
            return a * b;
          case '/':
            return b === 0 ? 0 : a / b;
          default:
            return 0;
        }
      }
      case 'compare': {
        const a = asNumber(this.evalExpr(spriteId, expr.left));
        const b = asNumber(this.evalExpr(spriteId, expr.right));
        switch (expr.op) {
          case '>':
            return a > b ? 1 : 0;
          case '<':
            return a < b ? 1 : 0;
          case '=':
            return a === b ? 1 : 0;
          default:
            return 0;
        }
      }
      case 'logic': {
        const a = truthy(this.evalExpr(spriteId, expr.left));
        const b = truthy(this.evalExpr(spriteId, expr.right));
        return (expr.op === 'and' ? a && b : a || b) ? 1 : 0;
      }
      case 'not':
        return truthy(this.evalExpr(spriteId, expr.value)) ? 0 : 1;
      case 'random': {
        const min = Math.round(asNumber(this.evalExpr(spriteId, expr.min)));
        const max = Math.round(asNumber(this.evalExpr(spriteId, expr.max)));
        const lo = Math.min(min, max);
        const hi = Math.max(min, max);
        return lo + Math.floor(Math.random() * (hi - lo + 1));
      }
      case 'round':
        return Math.round(asNumber(this.evalExpr(spriteId, expr.value)));
      case 'touching':
        return this.touching(spriteId, expr.target) ? 1 : 0;
      case 'keydown':
        return this.input.keysDown.has(expr.key) ? 1 : 0;
      case 'input':
        return this.bindingActive(expr.bindingId) ? 1 : 0;
      case 'mousedown':
        return this.input.mouseDown ? 1 : 0;
      case 'timer':
        return this.timeMs / 1000;
      case 'xpos':
        return this.sprites.get(spriteId)?.x ?? 0;
      case 'ypos':
        return this.sprites.get(spriteId)?.y ?? 0;
      case 'direction':
        return this.sprites.get(spriteId)?.direction ?? 90;
      default:
        return 0;
    }
  }

  private render(): void {
    const visuals: SpriteVisual[] = [];
    for (const sprite of this.sprites.values()) {
      visuals.push({
        id: sprite.id,
        x: sprite.x,
        y: sprite.y,
        direction: sprite.direction,
        size: sprite.size,
        visible: sprite.visible,
        zIndex: sprite.zIndex,
        rotationStyle: sprite.rotationStyle,
        costumeIndex: sprite.costumeIndex,
      });
    }
    this.adapter.render(visuals);
  }
}
