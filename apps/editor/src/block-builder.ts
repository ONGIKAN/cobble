import * as Blockly from 'blockly';
import 'blockly/blocks';

// 程序化拼积木的小工具：模板 / 示例工程的脚本都用它构造，再序列化成 workspace state。
export function makeBlock(
  ws: Blockly.Workspace,
  type: string,
  fields: Record<string, string | number> = {},
): Blockly.Block {
  const block = ws.newBlock(type);
  for (const [name, value] of Object.entries(fields)) block.setFieldValue(value, name);
  return block;
}

export function num(ws: Blockly.Workspace, value: number): Blockly.Block {
  return makeBlock(ws, 'math_number', { NUM: value });
}

export function attachValue(parent: Blockly.Block, input: string, child: Blockly.Block): void {
  const connection = parent.getInput(input)?.connection;
  const output = child.outputConnection;
  if (connection && output) connection.connect(output);
}

export function attachStatement(parent: Blockly.Block, input: string, first: Blockly.Block): void {
  const connection = parent.getInput(input)?.connection;
  const previous = first.previousConnection;
  if (connection && previous) connection.connect(previous);
}

export function chain(blocks: Blockly.Block[]): void {
  for (let i = 0; i < blocks.length - 1; i++) {
    const next = blocks[i].nextConnection;
    const previous = blocks[i + 1].previousConnection;
    if (next && previous) next.connect(previous);
  }
}

export function randomRange(ws: Blockly.Workspace, min: number, max: number): Blockly.Block {
  const random = makeBlock(ws, 'operators_random');
  attachValue(random, 'MIN', num(ws, min));
  attachValue(random, 'MAX', num(ws, max));
  return random;
}

export function connectNext(first: Blockly.Block, second: Blockly.Block): void {
  if (first.nextConnection && second.previousConnection) {
    first.nextConnection.connect(second.previousConnection);
  }
}
