import * as Phaser from 'phaser';
import type { CompiledProject } from '@cobble/project';
import type { EngineAdapter, InputState, SpriteVisual } from '@cobble/runtime';

const FALLBACK_GIF =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

const PREVENT_DEFAULT_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space']);

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`image load failed: ${src.slice(0, 64)}`));
    image.src = src;
  });
}

async function loadImageOrFallback(src: string): Promise<HTMLImageElement> {
  try {
    return await loadImage(src);
  } catch {
    return loadImage(FALLBACK_GIF);
  }
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

/**
 * Phaser 4 适配层：
 * - 角色用 Image 显示，每帧按运行时快照更新位置/角度/大小/造型
 * - 说话气泡用 Text 方块（无圆角）
 * - 键鼠事件在 DOM 层监听，换算成 Scratch 舞台坐标
 */
export class PhaserAdapter implements EngineAdapter {
  private project: CompiledProject | null = null;
  private container: HTMLElement | null = null;
  private game: Phaser.Game | null = null;
  private scene: Phaser.Scene | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private images = new Map<string, HTMLImageElement>();
  private objects = new Map<string, Phaser.GameObjects.Image>();
  private texts = new Map<string, Phaser.GameObjects.Text>();
  private audio = new Map<string, HTMLAudioElement>();
  private keys = new Set<string>();
  private mouseDown = false;
  private mousePressed = false;
  private pointer = { x: 0, y: 0 };
  private volume = 100;
  private frameCallback: ((dtMs: number) => void) | null = null;
  private inputBound = false;

  private onKeyDown = (event: KeyboardEvent): void => {
    if (isTypingTarget(event.target)) return;
    if (PREVENT_DEFAULT_KEYS.has(event.code) && (event.target === document.body || event.target === this.canvas)) {
      event.preventDefault();
    }
    this.keys.add(event.code);
  };

  private onKeyUp = (event: KeyboardEvent): void => {
    this.keys.delete(event.code);
  };

  private onPointerDown = (event: PointerEvent): void => {
    this.mouseDown = true;
    this.mousePressed = true;
    this.pointer = this.toStage(event.clientX, event.clientY);
  };

  private onPointerMove = (event: PointerEvent): void => {
    this.pointer = this.toStage(event.clientX, event.clientY);
  };

  private onPointerUp = (): void => {
    this.mouseDown = false;
  };

  async init(container: HTMLElement, project: CompiledProject): Promise<void> {
    this.destroy();
    this.project = project;
    this.container = container;
    container.innerHTML = '';
    for (const asset of project.assets) {
      if (asset.kind !== 'image' || !asset.dataUrl) continue;
      this.images.set(asset.id, await loadImageOrFallback(asset.dataUrl));
    }

    await new Promise<void>((resolve) => {
      const scene = new Phaser.Scene({ key: 'cobble-stage' });
      const sceneWithHooks = scene as unknown as {
        create: () => void;
        update: (time: number, delta: number) => void;
      };
      sceneWithHooks.create = () => {
        this.createScene(scene);
        resolve();
      };
      sceneWithHooks.update = (_time: number, delta: number) => {
        this.frameCallback?.(delta);
      };
      this.scene = scene;
      this.game = new Phaser.Game({
        type: Phaser.AUTO,
        width: project.stage.width,
        height: project.stage.height,
        parent: container,
        backgroundColor: project.stage.background,
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH,
          width: project.stage.width,
          height: project.stage.height,
        },
        scene,
        banner: false,
        audio: { noAudio: true },
      });
    });

    this.bindInput();
  }

  private createScene(scene: Phaser.Scene): void {
    const project = this.project;
    if (!project) return;
    for (const [id, image] of this.images) {
      scene.textures.addImage(id, image);
    }
    for (const sprite of project.sprites) {
      const first = sprite.costumes[0];
      if (!first) continue;
      const image = scene.add.image(
        project.stage.width / 2 + sprite.x,
        project.stage.height / 2 - sprite.y,
        first.assetId,
      );
      image.setOrigin(0.5, 0.5);
      this.objects.set(sprite.id, image);
    }
    this.canvas = this.game?.canvas ?? null;
  }

  render(sprites: SpriteVisual[]): void {
    const project = this.project;
    if (!project) return;
    for (const visual of sprites) {
      const image = this.objects.get(visual.id);
      if (!image) continue;
      const def = project.sprites.find((s) => s.id === visual.id);
      const costumes = def?.costumes ?? [];
      const costume = costumes[visual.costumeIndex % Math.max(costumes.length, 1)];
      if (costume && image.texture.key !== costume.assetId) image.setTexture(costume.assetId);
      image.setPosition(project.stage.width / 2 + visual.x, project.stage.height / 2 - visual.y);
      image.setVisible(visual.visible);
      image.setDepth(visual.zIndex);
      const base = this.images.get(costume?.assetId ?? '');
      const width = Math.max(1, (base?.naturalWidth ?? 1) * (visual.size / 100));
      const height = Math.max(1, (base?.naturalHeight ?? 1) * (visual.size / 100));
      image.setDisplaySize(width, height);
      const rad = (visual.direction * Math.PI) / 180;
      if (visual.rotationStyle === 'all-around') {
        image.setAngle(visual.direction - 90);
        image.setFlipX(false);
      } else if (visual.rotationStyle === 'left-right') {
        image.setAngle(0);
        image.setFlipX(Math.cos(rad) < 0);
      } else {
        image.setAngle(0);
        image.setFlipX(false);
      }
    }
  }

  say(spriteId: string, text: string, seconds: number): void {
    const scene = this.scene;
    const project = this.project;
    if (!scene || !project) return;
    const previous = this.texts.get(spriteId);
    if (previous) {
      previous.destroy();
      this.texts.delete(spriteId);
    }
    if (!text) return;
    const sprite = project.sprites.find((s) => s.id === spriteId);
    if (!sprite) return;
    const image = this.objects.get(spriteId);
    const width = image?.displayWidth ?? 1;
    const height = image?.displayHeight ?? 1;
    const bubble = scene.add
      .text(project.stage.width / 2 + (image?.x ?? 0), project.stage.height / 2 - (image?.y ?? 0) - height / 2 - 6, text, {
        fontFamily: '"Segoe UI", "Microsoft YaHei", monospace',
        fontSize: '16px',
        color: '#14161a',
        backgroundColor: '#ffffff',
        padding: { x: 8, y: 6 },
        align: 'center',
        wordWrap: { width: 220, useAdvancedWrap: true },
        resolution: 2,
      })
      .setOrigin(0.5, 1)
      .setDepth(10000);
    bubble.x = project.stage.width / 2 + sprite.x;
    bubble.y = project.stage.height / 2 - sprite.y - (height / 2 + 6);
    this.texts.set(spriteId, bubble);
    if (seconds > 0) {
      scene.time.delayedCall(seconds * 1000, () => {
        if (this.texts.get(spriteId) === bubble) {
          bubble.destroy();
          this.texts.delete(spriteId);
        }
      });
    }
    void width;
  }

  playSound(soundId: string): void {
    const asset = this.project?.assets.find((a) => a.id === soundId && a.kind === 'audio');
    if (!asset?.dataUrl) return;
    const audio = new Audio(asset.dataUrl);
    audio.volume = Math.max(0, Math.min(1, this.volume / 100));
    this.audio.set(soundId, audio);
    void audio.play().catch(() => undefined);
  }

  stopSounds(): void {
    for (const audio of this.audio.values()) {
      audio.pause();
      audio.currentTime = 0;
    }
    this.audio.clear();
  }

  setVolume(percent: number): void {
    this.volume = Math.max(0, Math.min(100, percent));
  }

  getInput(): InputState {
    const state: InputState = {
      keysDown: new Set(this.keys),
      mouseDown: this.mouseDown,
      mousePressed: this.mousePressed,
      mouseX: this.pointer.x,
      mouseY: this.pointer.y,
    };
    this.mousePressed = false;
    return state;
  }

  onFrame(callback: (dtMs: number) => void): void {
    this.frameCallback = callback;
  }

  getSize(spriteId: string): { width: number; height: number } {
    const image = this.objects.get(spriteId);
    if (!image) return { width: 0, height: 0 };
    return { width: image.displayWidth, height: image.displayHeight };
  }

  destroy(): void {
    this.unbindInput();
    this.frameCallback = null;
    for (const text of this.texts.values()) text.destroy();
    this.texts.clear();
    this.objects.clear();
    this.images.clear();
    this.audio.clear();
    this.keys.clear();
    this.mouseDown = false;
    this.mousePressed = false;
    this.canvas = null;
    this.scene = null;
    if (this.game) {
      this.game.destroy(true);
      this.game = null;
    }
    if (this.container) {
      this.container.innerHTML = '';
    }
  }

  private toStage(clientX: number, clientY: number): { x: number; y: number } {
    const project = this.project;
    const canvas = this.canvas;
    if (!project || !canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width > 0 ? project.stage.width / rect.width : 1;
    const scaleY = rect.height > 0 ? project.stage.height / rect.height : 1;
    return {
      x: (clientX - rect.left) * scaleX - project.stage.width / 2,
      y: project.stage.height / 2 - (clientY - rect.top) * scaleY,
    };
  }

  private bindInput(): void {
    if (this.inputBound) return;
    const canvas = this.canvas;
    if (!canvas) return;
    this.inputBound = true;
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointermove', this.onPointerMove);
  }

  private unbindInput(): void {
    if (!this.inputBound) return;
    this.inputBound = false;
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('pointerup', this.onPointerUp);
    if (this.canvas) {
      this.canvas.removeEventListener('pointerdown', this.onPointerDown);
      this.canvas.removeEventListener('pointermove', this.onPointerMove);
    }
  }
}
