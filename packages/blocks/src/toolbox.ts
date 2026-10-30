import type { TFunc } from '@cobble/i18n';

export interface ToolboxCategory {
  kind: 'category';
  name: string;
  colour: string;
  contents: Array<{ kind: 'block'; type: string }>;
}

const CATEGORIES: Array<{ key: string; colour: string; types: string[] }> = [
  {
    key: 'events',
    colour: '#bd8f45',
    types: [
      'event_whenflag',
      'event_whenkey',
      'event_wheninput',
      'event_whenclick',
      'event_whenmessage',
      'event_broadcast',
    ],
  },
  {
    key: 'motion',
    colour: '#547fab',
    types: [
      'motion_move',
      'motion_turnright',
      'motion_turnleft',
      'motion_point',
      'motion_gotoxy',
      'motion_glide',
      'motion_changex',
      'motion_changey',
      'motion_bounce',
      'motion_rotationstyle',
      'motion_gotosprite',
      'motion_xpos',
      'motion_ypos',
      'motion_direction',
    ],
  },
  {
    key: 'looks',
    colour: '#8d79b7',
    types: ['looks_say', 'looks_show', 'looks_hide', 'looks_nextcostume', 'looks_switchcostume', 'looks_setsize', 'looks_layer'],
  },
  {
    key: 'sound',
    colour: '#b27a9f',
    types: ['sound_play', 'sound_stop', 'sound_volume'],
  },
  {
    key: 'control',
    colour: '#b79537',
    types: ['control_wait', 'control_waituntil', 'control_repeat', 'control_forever', 'control_if', 'control_ifelse', 'control_stop'],
  },
  {
    key: 'sensing',
    colour: '#4a958b',
    types: ['sensing_touching', 'sensing_input', 'sensing_keydown', 'sensing_mousedown', 'sensing_timer'],
  },
  {
    key: 'operators',
    colour: '#629668',
    types: [
      'operators_arithmetic',
      'operators_compare',
      'operators_logic',
      'operators_not',
      'operators_random',
      'operators_round',
      'math_number',
    ],
  },
  {
    key: 'variables',
    colour: '#ac7c50',
    types: ['var_set', 'var_change', 'var_get'],
  },
];

export interface ToolboxDefinition {
  kind: 'categoryToolbox';
  contents: ToolboxCategory[];
}

export function buildToolbox(t: TFunc): ToolboxDefinition {
  return {
    kind: 'categoryToolbox',
    contents: CATEGORIES.map((category) => ({
      kind: 'category',
      name: t(`toolbox.${category.key}`),
      colour: category.colour,
      contents: category.types.map((type) => ({ kind: 'block', type })),
    })),
  };
}
