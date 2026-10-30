import * as Blockly from 'blockly';
import { DEMO_SPRITE_CAT, DEMO_SPRITE_COIN, DEMO_VAR_SCORE, type ProjectDoc } from '@cobble/project';
import {
  attachStatement,
  attachValue,
  chain,
  makeBlock,
  num,
  randomRange,
} from './block-builder';

function keyIf(ws: Blockly.Workspace, key: string, actionType: string, delta: number): Blockly.Block {
  const ifBlock = makeBlock(ws, 'control_if');
  const condition = makeBlock(ws, 'sensing_input', { INPUT: key });
  attachValue(ifBlock, 'COND', condition);
  const action = makeBlock(ws, actionType);
  attachValue(action, 'VALUE', num(ws, delta));
  attachStatement(ifBlock, 'DO', action);
  return ifBlock;
}

function buildCatWorkspace(ws: Blockly.Workspace): void {
  const flag = makeBlock(ws, 'event_whenflag');
  const forever = makeBlock(ws, 'control_forever');
  const ifRight = keyIf(ws, 'right', 'motion_changex', 7);
  const ifLeft = keyIf(ws, 'left', 'motion_changex', -7);
  const ifUp = keyIf(ws, 'up', 'motion_changey', 7);
  const ifDown = keyIf(ws, 'down', 'motion_changey', -7);
  const ifCoin = makeBlock(ws, 'control_if');
  attachValue(ifCoin, 'COND', makeBlock(ws, 'sensing_touching', { TARGET: DEMO_SPRITE_COIN }));
  const addScore = makeBlock(ws, 'var_change', { VAR: DEMO_VAR_SCORE });
  attachValue(addScore, 'VALUE', num(ws, 1));
  const broadcast = makeBlock(ws, 'event_broadcast', { MESSAGE: 'hit' });
  attachStatement(ifCoin, 'DO', addScore);
  chain([addScore, broadcast]);
  chain([ifRight, ifLeft, ifUp, ifDown, ifCoin]);
  attachStatement(forever, 'DO', ifRight);
  if (flag.nextConnection && forever.previousConnection) {
    flag.nextConnection.connect(forever.previousConnection);
  }
}

function buildCoinWorkspace(ws: Blockly.Workspace): void {
  const hat = makeBlock(ws, 'event_whenmessage', { MESSAGE: 'hit' });
  const hide = makeBlock(ws, 'looks_hide');
  const wait = makeBlock(ws, 'control_wait');
  attachValue(wait, 'SECS', num(ws, 0.6));
  const goTo = makeBlock(ws, 'motion_gotoxy');
  attachValue(goTo, 'X', randomRange(ws, -380, 380));
  attachValue(goTo, 'Y', randomRange(ws, -180, 180));
  const show = makeBlock(ws, 'looks_show');
  chain([hide, wait, goTo, show]);
  if (hat.nextConnection && hide.previousConnection) {
    hat.nextConnection.connect(hide.previousConnection);
  }
}

/** 首次打开时生成演示工程脚本（小猫吃金币） */
export function buildDemoWorkspaces(project: ProjectDoc): Record<string, unknown> {
  if (!project.sprites.some((sprite) => sprite.id === DEMO_SPRITE_CAT || sprite.id === DEMO_SPRITE_COIN)) {
    return {};
  }
  const ws = new Blockly.Workspace();
  try {
    const result: Record<string, unknown> = {};
    ws.clear();
    buildCatWorkspace(ws);
    result[DEMO_SPRITE_CAT] = Blockly.serialization.workspaces.save(ws);
    ws.clear();
    buildCoinWorkspace(ws);
    result[DEMO_SPRITE_COIN] = Blockly.serialization.workspaces.save(ws);
    return result;
  } finally {
    ws.dispose();
  }
}
