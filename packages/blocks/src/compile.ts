import * as Blockly from 'blockly';
import 'blockly/blocks';
import { DEFAULT_INPUT } from '@cobbox/project';
import type {
  ArithOp,
  CompareOp,
  CompiledProject,
  CompiledScript,
  Hat,
  IRExpr,
  IRNode,
  ProjectDoc,
  TouchingTarget,
} from '@cobbox/project';

const ZERO: IRExpr = { kind: 'const', value: 0 };

function numOf(b: Blockly.Block | null): IRExpr {
  return toExpr(b);
}

function toExpr(b: Blockly.Block | null): IRExpr {
  if (!b) return ZERO;
  switch (b.type) {
    case 'math_number':
      return { kind: 'const', value: Number(b.getFieldValue('NUM') ?? 0) };
    case 'var_get':
      return { kind: 'var', varId: String(b.getFieldValue('VAR') ?? '') };
    case 'operators_arithmetic':
      return {
        kind: 'arith',
        op: String(b.getFieldValue('OP') ?? '+') as ArithOp,
        left: numOf(b.getInputTargetBlock('A')),
        right: numOf(b.getInputTargetBlock('B')),
      };
    case 'operators_compare':
      return {
        kind: 'compare',
        op: String(b.getFieldValue('OP') ?? '>') as CompareOp,
        left: numOf(b.getInputTargetBlock('A')),
        right: numOf(b.getInputTargetBlock('B')),
      };
    case 'operators_logic':
      return {
        kind: 'logic',
        op: String(b.getFieldValue('OP') ?? 'and') === 'or' ? 'or' : 'and',
        left: numOf(b.getInputTargetBlock('A')),
        right: numOf(b.getInputTargetBlock('B')),
      };
    case 'operators_not':
      return { kind: 'not', value: numOf(b.getInputTargetBlock('VALUE')) };
    case 'operators_random':
      return {
        kind: 'random',
        min: numOf(b.getInputTargetBlock('MIN')),
        max: numOf(b.getInputTargetBlock('MAX')),
      };
    case 'operators_round':
      return { kind: 'round', value: numOf(b.getInputTargetBlock('VALUE')) };
    case 'sensing_touching':
      return { kind: 'touching', target: touchingTarget(String(b.getFieldValue('TARGET') ?? 'edge')) };
    case 'sensing_keydown':
      return { kind: 'keydown', key: String(b.getFieldValue('KEY') ?? 'ArrowRight') };
    case 'sensing_input':
      return { kind: 'input', bindingId: String(b.getFieldValue('INPUT') ?? '') };
    case 'sensing_mousedown':
      return { kind: 'mousedown' };
    case 'sensing_pointerx':
      return { kind: 'pointerx' };
    case 'sensing_pointery':
      return { kind: 'pointery' };
    case 'sensing_dragging':
      return { kind: 'dragging' };
    case 'motion_xpos':
      return { kind: 'xpos' };
    case 'motion_ypos':
      return { kind: 'ypos' };
    case 'motion_direction':
      return { kind: 'direction' };
    case 'sensing_timer':
      return { kind: 'timer' };
    default:
      return ZERO;
  }
}

function touchingTarget(value: string): TouchingTarget {
  if (value === 'edge') return { kind: 'edge' };
  if (value === 'mouse') return { kind: 'mouse' };
  return { kind: 'sprite', spriteId: value };
}

function compileStatements(first: Blockly.Block | null): IRNode[] {
  const nodes: IRNode[] = [];
  let current = first;
  while (current) {
    const node = compileNode(current);
    if (node) nodes.push(node);
    current = current.getNextBlock();
  }
  return nodes;
}

function stmtBody(b: Blockly.Block, input: string): IRNode[] {
  return compileStatements(b.getInputTargetBlock(input));
}

function compileNode(b: Blockly.Block): IRNode | null {
  switch (b.type) {
    case 'motion_move':
      return { op: 'move', steps: numOf(b.getInputTargetBlock('STEPS')) };
    case 'motion_turnright':
      return { op: 'turn', degrees: numOf(b.getInputTargetBlock('DEG')) };
    case 'motion_turnleft':
      return {
        op: 'turn',
        degrees: { kind: 'arith', op: '*', left: numOf(b.getInputTargetBlock('DEG')), right: { kind: 'const', value: -1 } },
      };
    case 'motion_point':
      return { op: 'point', direction: numOf(b.getInputTargetBlock('DIRECTION')) };
    case 'motion_gotoxy':
      return { op: 'goto', x: numOf(b.getInputTargetBlock('X')), y: numOf(b.getInputTargetBlock('Y')) };
    case 'motion_glide':
      return {
        op: 'glide',
        seconds: numOf(b.getInputTargetBlock('SECS')),
        x: numOf(b.getInputTargetBlock('X')),
        y: numOf(b.getInputTargetBlock('Y')),
      };
    case 'motion_changex':
      return { op: 'changeX', value: numOf(b.getInputTargetBlock('VALUE')) };
    case 'motion_changey':
      return { op: 'changeY', value: numOf(b.getInputTargetBlock('VALUE')) };
    case 'motion_bounce':
      return { op: 'bounce' };
    case 'motion_rotationstyle':
      return {
        op: 'setRotationStyle',
        style: (String(b.getFieldValue('STYLE') ?? 'all-around') as 'all-around' | 'left-right' | 'none'),
      };
    case 'looks_say':
      return {
        op: 'say',
        text: { kind: 'const', value: String(b.getFieldValue('TEXT') ?? '') },
        seconds: numOf(b.getInputTargetBlock('SECS')),
      };
    case 'looks_show':
      return { op: 'show' };
    case 'looks_hide':
      return { op: 'hide' };
    case 'looks_nextcostume':
      return { op: 'nextCostume' };
    case 'looks_switchcostume':
      return { op: 'switchCostume', costume: String(b.getFieldValue('COSTUME') ?? '') };
    case 'motion_gotosprite':
      return { op: 'gotoSprite', spriteId: String(b.getFieldValue('TARGET') ?? '') };
    case 'motion_playermove':
      return { op: 'playerMove', speed: numOf(b.getInputTargetBlock('SPEED')) };
    case 'control_waituntil':
      return { op: 'waitUntil', cond: numOf(b.getInputTargetBlock('COND')) };
    case 'looks_setsize':
      return { op: 'setSize', percent: numOf(b.getInputTargetBlock('SIZE')) };
    case 'looks_layer':
      return { op: 'setLayer', front: String(b.getFieldValue('LAYER') ?? 'front') === 'front' };
    case 'sound_play': {
      const soundId = String(b.getFieldValue('SOUND') ?? '');
      return soundId ? { op: 'playSound', soundId } : null;
    }
    case 'sound_stop':
      return { op: 'stopSounds' };
    case 'sound_volume':
      return { op: 'setVolume', percent: numOf(b.getInputTargetBlock('VOLUME')) };
    case 'control_wait':
      return { op: 'wait', seconds: numOf(b.getInputTargetBlock('SECS')) };
    case 'control_repeat':
      return { op: 'repeat', times: numOf(b.getInputTargetBlock('TIMES')), body: stmtBody(b, 'DO') };
    case 'control_forever':
      return { op: 'forever', body: stmtBody(b, 'DO') };
    case 'control_if':
      return { op: 'if', cond: numOf(b.getInputTargetBlock('COND')), then: stmtBody(b, 'DO') };
    case 'control_ifelse':
      return {
        op: 'ifElse',
        cond: numOf(b.getInputTargetBlock('COND')),
        then: stmtBody(b, 'DO'),
        else: stmtBody(b, 'ELSE'),
      };
    case 'control_stop':
      return { op: 'stop', mode: String(b.getFieldValue('MODE') ?? 'all') === 'this' ? 'this' : 'all' };
    case 'event_broadcast':
      return { op: 'broadcast', message: String(b.getFieldValue('MESSAGE') ?? '') };
    case 'control_setdraggable':
      return { op: 'setDraggable', value: String(b.getFieldValue('VALUE') ?? 'on') === 'on' };
    case 'var_set':
      return {
        op: 'setVar',
        varId: String(b.getFieldValue('VAR') ?? ''),
        value: numOf(b.getInputTargetBlock('VALUE')),
      };
    case 'var_change':
      return {
        op: 'changeVar',
        varId: String(b.getFieldValue('VAR') ?? ''),
        value: numOf(b.getInputTargetBlock('VALUE')),
      };
    default:
      return null;
  }
}

function hatOf(b: Blockly.Block): Hat | null {
  switch (b.type) {
    case 'event_whenflag':
      return { kind: 'flag' };
    case 'event_whenkey':
      return { kind: 'key', key: String(b.getFieldValue('KEY') ?? 'ArrowRight') };
    case 'event_wheninput':
      return { kind: 'input', bindingId: String(b.getFieldValue('INPUT') ?? '') };
    case 'event_whenclick':
      return { kind: 'click' };
    case 'event_whenmessage':
      return { kind: 'message', message: String(b.getFieldValue('MESSAGE') ?? '') };
    case 'event_whendrag':
      return { kind: 'drag' };
    default:
      return null;
  }
}

/** 把每个角色的 Blockly 工作区编译成 IR 脚本 */
export function compileProject(project: ProjectDoc, workspaceStates: Record<string, unknown>): CompiledProject {
  const scripts: CompiledScript[] = [];
  const workspace = new Blockly.Workspace();
  try {
    for (const sprite of project.sprites) {
      const state = workspaceStates[sprite.id];
      if (!state) continue;
      Blockly.serialization.workspaces.load(state as Record<string, unknown>, workspace);
      for (const top of workspace.getTopBlocks(true)) {
        const hat = hatOf(top);
        if (!hat) continue;
        scripts.push({ spriteId: sprite.id, hat, body: compileStatements(top.getNextBlock()) });
      }
      workspace.clear();
    }
  } finally {
    workspace.dispose();
  }
  return {
    stage: project.stage,
    assets: project.assets,
    variables: project.variables,
    sprites: project.sprites,
    input: project.input ?? DEFAULT_INPUT,
    scripts,
  };
}
