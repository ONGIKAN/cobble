import io
import re
import sys

ROOT = 'F:/创想/game-creator'
changed = []


def edit(path, old, new, count=1):
    p = f'{ROOT}/{path}'
    s = io.open(p, encoding='utf-8').read()
    if new in s:
        return
    if old not in s:
        print(f'MISSING anchor in {path}: {old[:70]!r}')
        sys.exit(1)
    s = s.replace(old, new, count)
    io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
    changed.append(path)


# ── project types / schema ───────────────────────────────────────
edit('packages/project/src/types.ts',
     "  costumes: CostumeDef[];\n  sounds: SoundDef[];\n}",
     "  costumes: CostumeDef[];\n  sounds: SoundDef[];\n  /** 平台物理中的实体（地面/平台/墙）：会与其他角色发生碰撞 */\n  solid?: boolean;\n}")

edit('packages/project/src/schema.ts',
     "  costumes: z.array(costumeSchema),\n  sounds: z.array(soundSchema),\n});",
     "  costumes: z.array(costumeSchema),\n  sounds: z.array(soundSchema),\n  solid: z.boolean().optional(),\n});")

# ── IR nodes ─────────────────────────────────────────────────────
edit('packages/project/src/ir.ts',
     "  | { op: 'setVolume'; percent: IRExpr }\n  | { op: 'wait'; seconds: IRExpr }",
     "  | { op: 'setVolume'; percent: IRExpr }\n  | { op: 'physicsStart'; gravity: IRExpr }\n  | { op: 'jump'; speed: IRExpr }\n  | { op: 'gameOver'; win: boolean }\n  | { op: 'wait'; seconds: IRExpr }")

# ── engine adapter interface ─────────────────────────────────────
edit('packages/runtime/src/adapter.ts',
     "  /** 直接触摸模式下设置某个角色是否可被拖动 */\n  setDraggable(spriteId: string, draggable: boolean): void;\n  destroy(): void;",
     "  /** 直接触摸模式下设置某个角色是否可被拖动 */\n  setDraggable(spriteId: string, draggable: boolean): void;\n  /** 平台物理：把角色变成受重力驱动的动态刚体（gravityY 为 px/s²） */\n  enablePhysics(spriteId: string, gravityY: number): void;\n  /** 平台物理：设置水平速度（px/s，正数向右） */\n  setPhysicsVelocityX(spriteId: string, vx: number): void;\n  /** 平台物理：跳跃（speed 为 px/s，脚在地面/平台上才生效由运行时判断） */\n  jump(spriteId: string, speed: number): void;\n  /** 平台物理：角色是否踩在地面/平台上 */\n  isGrounded(spriteId: string): boolean;\n  /** 平台物理：读取角色当前物理位置（舞台坐标）；无物理体返回 null */\n  getPhysicsPosition(spriteId: string): { x: number; y: number } | null;\n  /** 显示结算浮层（胜利/失败 + 重新开始） */\n  showGameOver(win: boolean): void;\n  destroy(): void;")

# ── runtime ──────────────────────────────────────────────────────
edit('packages/runtime/src/runtime.ts',
     "  private running = false;\n  private started = false;",
     "  private running = false;\n  private started = false;\n  /** 已启用平台物理的角色 */\n  private physicsIds = new Set<string>();")

edit('packages/runtime/src/runtime.ts',
     "    const input = this.adapter.getInput();\n    this.input = input;\n    this.handleHats(input);",
     "    const input = this.adapter.getInput();\n    this.input = input;\n    this.syncPhysics();\n    this.handleHats(input);")

edit('packages/runtime/src/runtime.ts',
     "  private bindingIdsDown(): string[] {",
     "  /** 把物理刚体的位置同步回运行时状态（物理引擎是位置权威） */\n  private syncPhysics(): void {\n    for (const id of this.physicsIds) {\n      const pos = this.adapter.getPhysicsPosition(id);\n      if (!pos) continue;\n      const sprite = this.sprites.get(id);\n      if (!sprite) continue;\n      sprite.x = pos.x;\n      sprite.y = pos.y;\n    }\n  }\n\n  private bindingIdsDown(): string[] {")

edit('packages/runtime/src/runtime.ts',
     """      case 'playerMove': {
        const steps = num(node.speed);
        let dx = 0;
        let dy = 0;
        if (this.bindingActive('left')) dx -= steps;
        if (this.bindingActive('right')) dx += steps;
        if (this.bindingActive('up')) dy += steps;
        if (this.bindingActive('down')) dy -= steps;
        if (dx !== 0 || dy !== 0) {
          sprite.x += dx;
          sprite.y += dy;
          if (dx !== 0 && sprite.rotationStyle === 'left-right') {
            sprite.direction = dx > 0 ? 90 : 270;
          }
        }
        return;
      }""",
     """      case 'playerMove': {
        const steps = num(node.speed);
        let dx = 0;
        let dy = 0;
        if (this.bindingActive('left')) dx -= steps;
        if (this.bindingActive('right')) dx += steps;
        if (this.bindingActive('up')) dy += steps;
        if (this.bindingActive('down')) dy -= steps;
        if (this.physicsIds.has(spriteId)) {
          // 平台物理模式：只控制水平速度，竖直方向由重力/跳跃驱动
          let vx = 0;
          if (this.bindingActive('left')) vx -= steps;
          if (this.bindingActive('right')) vx += steps;
          this.adapter.setPhysicsVelocityX(spriteId, vx * 60);
          if (vx !== 0 && sprite.rotationStyle === 'left-right') {
            sprite.direction = vx > 0 ? 90 : 270;
          }
          return;
        }
        if (dx !== 0 || dy !== 0) {
          sprite.x += dx;
          sprite.y += dy;
          if (dx !== 0 && sprite.rotationStyle === 'left-right') {
            sprite.direction = dx > 0 ? 90 : 270;
          }
        }
        return;
      }
      case 'physicsStart': {
        const gravity = num(node.gravity);
        this.physicsIds.add(spriteId);
        this.adapter.enablePhysics(spriteId, gravity);
        return;
      }
      case 'jump': {
        if (this.physicsIds.has(spriteId) && this.adapter.isGrounded(spriteId)) {
          sprite.direction = 90;
          this.adapter.jump(spriteId, num(node.speed));
        }
        return;
      }
      case 'gameOver': {
        this.adapter.showGameOver(node.win);
        this.running = false;
        return;
      }""")

# ── blocks: definitions (new blocks before closing ops array) ────
edit('packages/blocks/src/definitions.ts',
     "\n  ];\n\n  Blockly.defineBlocksWithJsonArray(ops);",
     """
    {
      type: 'control_physicsstart',
      message0: t('blocks.control.physicsstart'),
      args0: [{ type: 'input_value', name: 'GRAVITY', check: 'Number' }],
      previousStatement: null,
      nextStatement: null,
      style: 'control',
      inputsInline: true,
    },
    {
      type: 'motion_jump',
      message0: t('blocks.motion.jump'),
      args0: [{ type: 'input_value', name: 'SPEED', check: 'Number' }],
      previousStatement: null,
      nextStatement: null,
      style: 'motion',
      inputsInline: true,
    },
    {
      type: 'control_gameover',
      message0: t('blocks.control.gameover'),
      args0: [
        {
          type: 'field_dropdown',
          name: 'WIN',
          options: [
            [t('blocks.control.win'), 'win'],
            [t('blocks.control.lose'), 'lose'],
          ],
        },
      ],
      previousStatement: null,
      nextStatement: null,
      style: 'control',
    },
  ];

  Blockly.defineBlocksWithJsonArray(ops);""")

# ── blocks: toolbox ─────────────────────────────────────────────
edit('packages/blocks/src/toolbox.ts',
     "      'motion_playermove',\n      'motion_xpos',",
     "      'motion_playermove',\n      'motion_jump',\n      'motion_xpos',")

edit('packages/blocks/src/toolbox.ts',
     "types: ['control_wait', 'control_waituntil', 'control_repeat', 'control_forever', 'control_if', 'control_ifelse', 'control_stop'],",
     "types: ['control_wait', 'control_waituntil', 'control_repeat', 'control_forever', 'control_if', 'control_ifelse', 'control_stop', 'control_physicsstart', 'control_gameover'],")

# ── compile mapping ─────────────────────────────────────────────
edit('packages/blocks/src/compile.ts',
     "    case 'motion_playermove':\n      return { op: 'playerMove', speed: numOf(b.getInputTargetBlock('SPEED')) };",
     "    case 'motion_playermove':\n      return { op: 'playerMove', speed: numOf(b.getInputTargetBlock('SPEED')) };\n    case 'motion_jump':\n      return { op: 'jump', speed: numOf(b.getInputTargetBlock('SPEED')) };\n    case 'control_physicsstart':\n      return { op: 'physicsStart', gravity: numOf(b.getInputTargetBlock('GRAVITY')) };\n    case 'control_gameover':\n      return { op: 'gameOver', win: String(b.getFieldValue('WIN') ?? 'win') === 'win' };")

# ── i18n ────────────────────────────────────────────────────────
edit('packages/i18n/src/locales/zh-CN.ts',
     "      move: '沿朝向移动 %1',",
     "      move: '沿朝向移动 %1',\n      jump: '跳跃，速度 %1',")
edit('packages/i18n/src/locales/zh-CN.ts',
     "      waituntil: '等待条件 %1',",
     "      waituntil: '等待条件 %1',\n      physicsstart: '启用平台物理，重力 %1',\n      gameover: '结束游戏：%1',\n      win: '胜利',\n      lose: '失败',")
edit('packages/i18n/src/locales/zh-CN.ts',
     "    visible: '显示',",
     "    visible: '显示',\n    solid: '实体碰撞',")
edit('packages/i18n/src/locales/en.ts',
     "      move: 'move %1 steps in direction',",
     "      move: 'move %1 steps in direction',\n      jump: 'jump, speed %1',")
edit('packages/i18n/src/locales/en.ts',
     "      waituntil: 'wait until %1',",
     "      waituntil: 'wait until %1',\n      physicsstart: 'enable platform physics, gravity %1',\n      gameover: 'end game: %1',\n      win: 'win',\n      lose: 'lose',")
edit('packages/i18n/src/locales/en.ts',
     "    visible: 'Visible',",
     "    visible: 'Visible',\n    solid: 'Solid',")

# ── Inspector: solid checkbox ──────────────────────────────────
edit('apps/editor/src/components/Inspector.tsx',
     """        <label className="field field-inline">
          <span className="field-label">{t('inspector.visible')}</span>
          <input
            className="field-check"
            type="checkbox"
            checked={sprite.visible}
            onChange={(event) => updateSprite(sprite.id, { visible: event.target.checked })}
          />
        </label>""",
     """        <label className="field field-inline">
          <span className="field-label">{t('inspector.visible')}</span>
          <input
            className="field-check"
            type="checkbox"
            checked={sprite.visible}
            onChange={(event) => updateSprite(sprite.id, { visible: event.target.checked })}
          />
        </label>
        <label className="field field-inline">
          <span className="field-label">{t('inspector.solid')}</span>
          <input
            className="field-check"
            type="checkbox"
            data-testid="sprite-solid"
            checked={sprite.solid ?? false}
            onChange={(event) => updateSprite(sprite.id, { solid: event.target.checked })}
          />
        </label>""")

print('physics data layer patched:', len(changed), 'files')
