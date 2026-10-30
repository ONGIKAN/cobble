/** 积木编译器输出：IR（运行时唯一执行对象，编辑器预览与导出共用） */
import type { AssetDef, InputConfig, SpriteDef, StageDef, VariableDef } from './types';

export type TouchingTarget =
  | { kind: 'sprite'; spriteId: string }
  | { kind: 'edge' }
  | { kind: 'mouse' };

export type ArithOp = '+' | '-' | '*' | '/';
export type CompareOp = '>' | '<' | '=';

export type IRExpr =
  | { kind: 'const'; value: number | string }
  | { kind: 'var'; varId: string }
  | { kind: 'arith'; op: ArithOp; left: IRExpr; right: IRExpr }
  | { kind: 'compare'; op: CompareOp; left: IRExpr; right: IRExpr }
  | { kind: 'logic'; op: 'and' | 'or'; left: IRExpr; right: IRExpr }
  | { kind: 'not'; value: IRExpr }
  | { kind: 'random'; min: IRExpr; max: IRExpr }
  | { kind: 'round'; value: IRExpr }
  | { kind: 'touching'; target: TouchingTarget }
  | { kind: 'keydown'; key: string }
  | { kind: 'input'; bindingId: string }
  | { kind: 'mousedown' }
  | { kind: 'timer' };

export type IRNode =
  | { op: 'move'; steps: IRExpr }
  | { op: 'turn'; degrees: IRExpr }
  | { op: 'point'; direction: IRExpr }
  | { op: 'goto'; x: IRExpr; y: IRExpr }
  | { op: 'glide'; seconds: IRExpr; x: IRExpr; y: IRExpr }
  | { op: 'changeX'; value: IRExpr }
  | { op: 'changeY'; value: IRExpr }
  | { op: 'bounce' }
  | { op: 'setRotationStyle'; style: 'all-around' | 'left-right' | 'none' }
  | { op: 'say'; text: IRExpr; seconds: IRExpr }
  | { op: 'show' }
  | { op: 'hide' }
  | { op: 'nextCostume' }
  | { op: 'setSize'; percent: IRExpr }
  | { op: 'setLayer'; front: boolean }
  | { op: 'playSound'; soundId: string }
  | { op: 'stopSounds' }
  | { op: 'setVolume'; percent: IRExpr }
  | { op: 'wait'; seconds: IRExpr }
  | { op: 'repeat'; times: IRExpr; body: IRNode[] }
  | { op: 'forever'; body: IRNode[] }
  | { op: 'if'; cond: IRExpr; then: IRNode[] }
  | { op: 'ifElse'; cond: IRExpr; then: IRNode[]; else: IRNode[] }
  | { op: 'stop'; mode: 'all' | 'this' }
  | { op: 'broadcast'; message: string }
  | { op: 'setVar'; varId: string; value: IRExpr }
  | { op: 'changeVar'; varId: string; value: IRExpr };

export type Hat =
  | { kind: 'flag' }
  | { kind: 'key'; key: string }
  | { kind: 'input'; bindingId: string }
  | { kind: 'click' }
  | { kind: 'message'; message: string };

export interface CompiledScript {
  spriteId: string;
  hat: Hat;
  body: IRNode[];
}

export interface CompiledProject {
  stage: StageDef;
  assets: AssetDef[];
  variables: VariableDef[];
  sprites: SpriteDef[];
  input?: InputConfig;
  scripts: CompiledScript[];
}
