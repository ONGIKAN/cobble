import * as Blockly from 'blockly';
import 'blockly/blocks';
import type { ProjectDoc } from '@cobble/project';
import type { TFunc } from '@cobble/i18n';

export const BLOCK_KEYS: Array<[string, string]> = [
  ['ArrowLeft', 'ArrowLeft'],
  ['ArrowRight', 'ArrowRight'],
  ['ArrowUp', 'ArrowUp'],
  ['ArrowDown', 'ArrowDown'],
  ['Space', 'Space'],
  ['Enter', 'Enter'],
];

export interface BlockContext {
  t: TFunc;
  project: ProjectDoc;
}

function keyOptions(t: TFunc): Array<[string, string]> {
  return BLOCK_KEYS.map(([key, label]) => [t(`keys.${key}`), label]);
}

function variableOptions(project: ProjectDoc): Array<[string, string]> {
  if (project.variables.length === 0) return [['—', '']];
  return project.variables.map((v) => [v.name, v.id]);
}

function soundOptions(project: ProjectDoc): Array<[string, string]> {
  const sounds = project.sprites.flatMap((s) => s.sounds);
  if (sounds.length === 0) return [['—', '']];
  return sounds.map((s) => [s.name, s.id]);
}

function spriteOptions(project: ProjectDoc): Array<[string, string]> {
  return project.sprites.map((s) => [s.name, s.id]);
}

/** 定义全部自定义积木（POC 42 块），重复调用安全 */
export function defineGameBlocks({ t, project }: BlockContext): void {
  const ops: Array<Record<string, unknown>> = [
    // ── 事件 ───────────────────────────────────────────────
    {
      type: 'event_whenflag',
      message0: t('blocks.events.whenflag'),
      nextStatement: null,
      hat: 'cap',
      style: 'events',
      tooltip: '',
    },
    {
      type: 'event_whenkey',
      message0: t('blocks.events.whenkey'),
      args0: [{ type: 'field_dropdown', name: 'KEY', options: keyOptions(t) }],
      nextStatement: null,
      hat: 'cap',
      style: 'events',
    },
    {
      type: 'event_whenclick',
      message0: t('blocks.events.whenclick'),
      nextStatement: null,
      hat: 'cap',
      style: 'events',
    },
    {
      type: 'event_whenmessage',
      message0: t('blocks.events.whenmessage'),
      args0: [{ type: 'field_input', name: 'MESSAGE', text: 'hit' }],
      nextStatement: null,
      hat: 'cap',
      style: 'events',
    },
    {
      type: 'event_broadcast',
      message0: t('blocks.events.broadcast'),
      args0: [{ type: 'field_input', name: 'MESSAGE', text: 'hit' }],
      previousStatement: null,
      nextStatement: null,
      style: 'events',
    },
    // ── 运动 ───────────────────────────────────────────────
    {
      type: 'motion_move',
      message0: t('blocks.motion.move'),
      args0: [{ type: 'input_value', name: 'STEPS', check: 'Number' }],
      inputsInline: true,
      previousStatement: null,
      nextStatement: null,
      style: 'motion',
    },
    {
      type: 'motion_turnright',
      message0: t('blocks.motion.turnright'),
      args0: [{ type: 'input_value', name: 'DEG', check: 'Number' }],
      inputsInline: true,
      previousStatement: null,
      nextStatement: null,
      style: 'motion',
    },
    {
      type: 'motion_turnleft',
      message0: t('blocks.motion.turnleft'),
      args0: [{ type: 'input_value', name: 'DEG', check: 'Number' }],
      inputsInline: true,
      previousStatement: null,
      nextStatement: null,
      style: 'motion',
    },
    {
      type: 'motion_point',
      message0: t('blocks.motion.point'),
      args0: [{ type: 'input_value', name: 'DIRECTION', check: 'Number' }],
      inputsInline: true,
      previousStatement: null,
      nextStatement: null,
      style: 'motion',
    },
    {
      type: 'motion_gotoxy',
      message0: t('blocks.motion.gotoxy'),
      args0: [
        { type: 'input_value', name: 'X', check: 'Number' },
        { type: 'input_value', name: 'Y', check: 'Number' },
      ],
      inputsInline: true,
      previousStatement: null,
      nextStatement: null,
      style: 'motion',
    },
    {
      type: 'motion_glide',
      message0: t('blocks.motion.glide'),
      args0: [
        { type: 'input_value', name: 'SECS', check: 'Number' },
        { type: 'input_value', name: 'X', check: 'Number' },
        { type: 'input_value', name: 'Y', check: 'Number' },
      ],
      inputsInline: true,
      previousStatement: null,
      nextStatement: null,
      style: 'motion',
    },
    {
      type: 'motion_changex',
      message0: t('blocks.motion.changex'),
      args0: [{ type: 'input_value', name: 'VALUE', check: 'Number' }],
      inputsInline: true,
      previousStatement: null,
      nextStatement: null,
      style: 'motion',
    },
    {
      type: 'motion_changey',
      message0: t('blocks.motion.changey'),
      args0: [{ type: 'input_value', name: 'VALUE', check: 'Number' }],
      inputsInline: true,
      previousStatement: null,
      nextStatement: null,
      style: 'motion',
    },
    {
      type: 'motion_bounce',
      message0: t('blocks.motion.bounce'),
      previousStatement: null,
      nextStatement: null,
      style: 'motion',
    },
    {
      type: 'motion_rotationstyle',
      message0: t('blocks.motion.rotationstyle'),
      args0: [
        {
          type: 'field_dropdown',
          name: 'STYLE',
          options: [
            [t('blocks.motion.styleAll'), 'all-around'],
            [t('blocks.motion.styleLeftRight'), 'left-right'],
            [t('blocks.motion.styleNone'), 'none'],
          ],
        },
      ],
      previousStatement: null,
      nextStatement: null,
      style: 'motion',
    },
    // ── 外观 ───────────────────────────────────────────────
    {
      type: 'looks_say',
      message0: t('blocks.looks.say'),
      args0: [
        { type: 'field_input', name: 'TEXT', text: 'Hi!' },
        { type: 'input_value', name: 'SECS', check: 'Number' },
      ],
      inputsInline: true,
      previousStatement: null,
      nextStatement: null,
      style: 'looks',
    },
    {
      type: 'looks_show',
      message0: t('blocks.looks.show'),
      previousStatement: null,
      nextStatement: null,
      style: 'looks',
    },
    {
      type: 'looks_hide',
      message0: t('blocks.looks.hide'),
      previousStatement: null,
      nextStatement: null,
      style: 'looks',
    },
    {
      type: 'looks_nextcostume',
      message0: t('blocks.looks.nextcostume'),
      previousStatement: null,
      nextStatement: null,
      style: 'looks',
    },
    {
      type: 'looks_setsize',
      message0: t('blocks.looks.setsize'),
      args0: [{ type: 'input_value', name: 'SIZE', check: 'Number' }],
      inputsInline: true,
      previousStatement: null,
      nextStatement: null,
      style: 'looks',
    },
    {
      type: 'looks_layer',
      message0: t('blocks.looks.layer'),
      args0: [
        {
          type: 'field_dropdown',
          name: 'LAYER',
          options: [
            [t('blocks.looks.layerFront'), 'front'],
            [t('blocks.looks.layerBack'), 'back'],
          ],
        },
      ],
      previousStatement: null,
      nextStatement: null,
      style: 'looks',
    },
    // ── 声音 ───────────────────────────────────────────────
    {
      type: 'sound_play',
      message0: t('blocks.sound.play'),
      args0: [{ type: 'field_dropdown', name: 'SOUND', options: soundOptions(project) }],
      previousStatement: null,
      nextStatement: null,
      style: 'sound',
    },
    {
      type: 'sound_stop',
      message0: t('blocks.sound.stop'),
      previousStatement: null,
      nextStatement: null,
      style: 'sound',
    },
    {
      type: 'sound_volume',
      message0: t('blocks.sound.volume'),
      args0: [{ type: 'input_value', name: 'VOLUME', check: 'Number' }],
      inputsInline: true,
      previousStatement: null,
      nextStatement: null,
      style: 'sound',
    },
    // ── 控制 ───────────────────────────────────────────────
    {
      type: 'control_wait',
      message0: t('blocks.control.wait'),
      args0: [{ type: 'input_value', name: 'SECS', check: 'Number' }],
      inputsInline: true,
      previousStatement: null,
      nextStatement: null,
      style: 'control',
    },
    {
      type: 'control_repeat',
      message0: t('blocks.control.repeat'),
      args0: [{ type: 'input_value', name: 'TIMES', check: 'Number' }],
      message1: '%1',
      args1: [{ type: 'input_statement', name: 'DO' }],
      previousStatement: null,
      nextStatement: null,
      style: 'control',
    },
    {
      type: 'control_forever',
      message0: t('blocks.control.forever'),
      args0: [],
      message1: '%1',
      args1: [{ type: 'input_statement', name: 'DO' }],
      previousStatement: null,
      nextStatement: null,
      style: 'control',
    },
    {
      type: 'control_if',
      message0: t('blocks.control.if'),
      args0: [{ type: 'input_value', name: 'COND', check: 'Boolean' }],
      message1: '%1',
      args1: [{ type: 'input_statement', name: 'DO' }],
      previousStatement: null,
      nextStatement: null,
      style: 'control',
    },
    {
      type: 'control_ifelse',
      message0: t('blocks.control.if'),
      args0: [{ type: 'input_value', name: 'COND', check: 'Boolean' }],
      message1: '%1',
      args1: [{ type: 'input_statement', name: 'DO' }],
      message2: t('blocks.control.else'),
      args2: [],
      message3: '%1',
      args3: [{ type: 'input_statement', name: 'ELSE' }],
      previousStatement: null,
      nextStatement: null,
      style: 'control',
    },
    {
      type: 'control_stop',
      message0: t('blocks.control.stop'),
      args0: [
        {
          type: 'field_dropdown',
          name: 'MODE',
          options: [
            [t('blocks.control.stopAll'), 'all'],
            [t('blocks.control.stopThis'), 'this'],
          ],
        },
      ],
      previousStatement: null,
      nextStatement: null,
      style: 'control',
    },
    // ── 侦测 ───────────────────────────────────────────────
    {
      type: 'sensing_touching',
      message0: t('blocks.sensing.touching'),
      args0: [
        {
          type: 'field_dropdown',
          name: 'TARGET',
          options: [
            [t('blocks.sensing.touchingEdge'), 'edge'],
            [t('blocks.sensing.touchingMouse'), 'mouse'],
            ...spriteOptions(project),
          ],
        },
      ],
      output: 'Boolean',
      style: 'sensing',
    },
    {
      type: 'sensing_keydown',
      message0: t('blocks.sensing.keydown'),
      args0: [{ type: 'field_dropdown', name: 'KEY', options: keyOptions(t) }],
      output: 'Boolean',
      style: 'sensing',
    },
    {
      type: 'sensing_mousedown',
      message0: t('blocks.sensing.mousedown'),
      output: 'Boolean',
      style: 'sensing',
    },
    {
      type: 'sensing_timer',
      message0: t('blocks.sensing.timer'),
      output: 'Number',
      style: 'sensing',
    },
    // ── 运算 ───────────────────────────────────────────────
    {
      type: 'operators_arithmetic',
      message0: t('blocks.operators.arithmetic'),
      args0: [
        { type: 'input_value', name: 'A', check: 'Number' },
        {
          type: 'field_dropdown',
          name: 'OP',
          options: [
            ['+', '+'],
            ['−', '-'],
            ['×', '*'],
            ['÷', '/'],
          ],
        },
        { type: 'input_value', name: 'B', check: 'Number' },
      ],
      inputsInline: true,
      output: 'Number',
      style: 'operators',
    },
    {
      type: 'operators_compare',
      message0: t('blocks.operators.compare'),
      args0: [
        { type: 'input_value', name: 'A', check: 'Number' },
        {
          type: 'field_dropdown',
          name: 'OP',
          options: [
            ['>', '>'],
            ['<', '<'],
            ['=', '='],
          ],
        },
        { type: 'input_value', name: 'B', check: 'Number' },
      ],
      inputsInline: true,
      output: 'Boolean',
      style: 'operators',
    },
    {
      type: 'operators_logic',
      message0: t('blocks.operators.logic'),
      args0: [
        { type: 'input_value', name: 'A', check: 'Boolean' },
        {
          type: 'field_dropdown',
          name: 'OP',
          options: [
            ['and', 'and'],
            ['or', 'or'],
          ],
        },
        { type: 'input_value', name: 'B', check: 'Boolean' },
      ],
      inputsInline: true,
      output: 'Boolean',
      style: 'operators',
    },
    {
      type: 'operators_not',
      message0: t('blocks.operators.not'),
      args0: [{ type: 'input_value', name: 'VALUE', check: 'Boolean' }],
      inputsInline: true,
      output: 'Boolean',
      style: 'operators',
    },
    {
      type: 'operators_random',
      message0: t('blocks.operators.random'),
      args0: [
        { type: 'input_value', name: 'MIN', check: 'Number' },
        { type: 'input_value', name: 'MAX', check: 'Number' },
      ],
      inputsInline: true,
      output: 'Number',
      style: 'operators',
    },
    {
      type: 'operators_round',
      message0: t('blocks.operators.round'),
      args0: [{ type: 'input_value', name: 'VALUE', check: 'Number' }],
      inputsInline: true,
      output: 'Number',
      style: 'operators',
    },
    // ── 变量 ───────────────────────────────────────────────
    {
      type: 'var_set',
      message0: t('blocks.variables.set'),
      args0: [
        { type: 'field_dropdown', name: 'VAR', options: variableOptions(project) },
        { type: 'input_value', name: 'VALUE', check: 'Number' },
      ],
      inputsInline: true,
      previousStatement: null,
      nextStatement: null,
      style: 'variables',
    },
    {
      type: 'var_change',
      message0: t('blocks.variables.change'),
      args0: [
        { type: 'field_dropdown', name: 'VAR', options: variableOptions(project) },
        { type: 'input_value', name: 'VALUE', check: 'Number' },
      ],
      inputsInline: true,
      previousStatement: null,
      nextStatement: null,
      style: 'variables',
    },
    {
      type: 'var_get',
      message0: t('blocks.variables.get'),
      args0: [{ type: 'field_dropdown', name: 'VAR', options: variableOptions(project) }],
      output: 'Number',
      style: 'variables',
    },
  ];

  Blockly.defineBlocksWithJsonArray(ops);
}
