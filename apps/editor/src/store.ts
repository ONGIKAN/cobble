import { create } from 'zustand';
import {
  createDemoProject,
  type AssetDef,
  type InputConfig,
  type ProjectDoc,
  type SpriteDef,
  type StageDef,
} from '@cobble/project';
import { spritePlaceholderSvg } from './sprite-assets';

export type ThemeMode = 'dark' | 'light';

export const AUTOSAVE_KEY = 'cobble.autosave';
export const THEME_KEY = 'cobble.theme';

interface Snapshot {
  project: ProjectDoc;
  workspaces: Record<string, unknown>;
}

function loadAutosave(): Snapshot | null {
  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Partial<Snapshot>;
    if (data.project && data.project.schemaVersion === 1) {
      return { project: data.project, workspaces: data.workspaces ?? {} };
    }
  } catch {
    // 数据损坏时回退到演示工程
  }
  return null;
}

function initialTheme(): ThemeMode {
  return localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark';
}

function uniqueId(prefix: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  let index = 1;
  while (used.has(`${prefix}_${index}`)) index += 1;
  return `${prefix}_${index}`;
}

function touched(project: ProjectDoc): ProjectDoc {
  return { ...project, meta: { ...project.meta, updatedAt: new Date().toISOString() } };
}

function mapSprite(project: ProjectDoc, spriteId: string, update: (sprite: SpriteDef) => SpriteDef): ProjectDoc {
  return {
    ...project,
    sprites: project.sprites.map((sprite) => (sprite.id === spriteId ? update(sprite) : sprite)),
  };
}

/** 新增素材（造型/声音）时从前端传入的数据 */
export interface NewAsset {
  name: string;
  kind: 'image' | 'audio';
  dataUrl: string;
}

interface EditorState {
  project: ProjectDoc;
  selectedSpriteId: string;
  workspaces: Record<string, unknown>;
  running: boolean;
  theme: ThemeMode;
  savedAt: number | null;
  selectSprite: (spriteId: string) => void;
  setWorkspace: (spriteId: string, state: unknown) => void;
  updateSprite: (spriteId: string, patch: Partial<SpriteDef>) => void;
  addSprite: () => string;
  removeSprite: (spriteId: string) => void;
  addCostume: (spriteId: string, asset: NewAsset) => void;
  renameCostume: (spriteId: string, index: number, name: string) => void;
  removeCostume: (spriteId: string, index: number) => void;
  moveCostume: (spriteId: string, index: number, delta: number) => void;
  addSound: (spriteId: string, asset: NewAsset) => void;
  renameSound: (spriteId: string, soundId: string, name: string) => void;
  removeSound: (spriteId: string, soundId: string) => void;
  addVariable: () => string;
  renameVariable: (variableId: string, name: string) => void;
  removeVariable: (variableId: string) => void;
  setVariableValue: (variableId: string, value: number) => void;
  updateStage: (patch: Partial<StageDef>) => void;
  updateInput: (input: InputConfig) => void;
  setRunning: (running: boolean) => void;
  setTheme: (theme: ThemeMode) => void;
  markSaved: () => void;
  resetProject: () => void;
  replaceProject: (project: ProjectDoc, workspaces: Record<string, unknown>) => void;
}

const snapshot = loadAutosave();
const initialProject = snapshot?.project ?? createDemoProject();

export const useEditorStore = create<EditorState>()((set, get) => ({
  project: initialProject,
  selectedSpriteId: initialProject.sprites[0]?.id ?? '',
  workspaces: snapshot?.workspaces ?? {},
  running: false,
  theme: initialTheme(),
  savedAt: null,
  selectSprite: (spriteId) => set({ selectedSpriteId: spriteId }),
  setWorkspace: (spriteId, state) =>
    set((current) => ({ workspaces: { ...current.workspaces, [spriteId]: state } })),
  updateSprite: (spriteId, patch) =>
    set((current) => ({ project: touched(mapSprite(current.project, spriteId, (sprite) => ({ ...sprite, ...patch }))) })),
  addSprite: () => {
    const current = get();
    const order = current.project.sprites.length;
    const spriteId = uniqueId('sprite', current.project.sprites.map((sprite) => sprite.id));
    const assetId = uniqueId('asset', current.project.assets.map((asset) => asset.id));
    const name = `角色 ${order + 1}`;
    const asset: AssetDef = { id: assetId, name, kind: 'image', dataUrl: spritePlaceholderSvg(order) };
    const sprite: SpriteDef = {
      id: spriteId,
      name,
      x: 0,
      y: 0,
      rotation: 90,
      size: 100,
      visible: true,
      zIndex: order + 1,
      rotationStyle: 'all-around',
      costumes: [{ name: '造型 1', assetId }],
      sounds: [],
    };
    set({
      project: touched({
        ...current.project,
        assets: [...current.project.assets, asset],
        sprites: [...current.project.sprites, sprite],
      }),
      selectedSpriteId: spriteId,
    });
    return spriteId;
  },
  removeSprite: (spriteId) => {
    const current = get();
    if (current.project.sprites.length <= 1) return;
    const sprites = current.project.sprites.filter((sprite) => sprite.id !== spriteId);
    const workspaces = { ...current.workspaces };
    delete workspaces[spriteId];
    set({
      project: touched({ ...current.project, sprites }),
      selectedSpriteId: current.selectedSpriteId === spriteId ? sprites[0]?.id ?? '' : current.selectedSpriteId,
      workspaces,
    });
  },
  addCostume: (spriteId, asset) =>
    set((current) => {
      const assetId = uniqueId('asset', current.project.assets.map((entry) => entry.id));
      const entry: AssetDef = { id: assetId, name: asset.name, kind: asset.kind, dataUrl: asset.dataUrl };
      const withCostume = mapSprite(current.project, spriteId, (sprite) => ({
        ...sprite,
        costumes: [...sprite.costumes, { name: asset.name, assetId }],
      }));
      return { project: touched({ ...withCostume, assets: [...current.project.assets, entry] }) };
    }),
  renameCostume: (spriteId, index, name) =>
    set((current) => ({
      project: touched(
        mapSprite(current.project, spriteId, (sprite) => ({
          ...sprite,
          costumes: sprite.costumes.map((costume, i) => (i === index ? { ...costume, name } : costume)),
        })),
      ),
    })),
  removeCostume: (spriteId, index) =>
    set((current) => ({
      project: touched(
        mapSprite(current.project, spriteId, (sprite) => {
          if (sprite.costumes.length <= 1) return sprite;
          return { ...sprite, costumes: sprite.costumes.filter((_, i) => i !== index) };
        }),
      ),
    })),
  moveCostume: (spriteId, index, delta) =>
    set((current) => ({
      project: touched(
        mapSprite(current.project, spriteId, (sprite) => {
          const target = index + delta;
          if (target < 0 || target >= sprite.costumes.length) return sprite;
          const costumes = [...sprite.costumes];
          const [moved] = costumes.splice(index, 1);
          costumes.splice(target, 0, moved);
          return { ...sprite, costumes };
        }),
      ),
    })),
  addSound: (spriteId, asset) =>
    set((current) => {
      const assetId = uniqueId('asset', current.project.assets.map((entry) => entry.id));
      const entry: AssetDef = { id: assetId, name: asset.name, kind: asset.kind, dataUrl: asset.dataUrl };
      const sprite = current.project.sprites.find((item) => item.id === spriteId);
      const soundId = uniqueId('sound', sprite?.sounds.map((sound) => sound.id) ?? []);
      const withSound = mapSprite(current.project, spriteId, (item) => ({
        ...item,
        sounds: [...item.sounds, { id: soundId, name: asset.name, assetId }],
      }));
      return { project: touched({ ...withSound, assets: [...current.project.assets, entry] }) };
    }),
  renameSound: (spriteId, soundId, name) =>
    set((current) => ({
      project: touched(
        mapSprite(current.project, spriteId, (sprite) => ({
          ...sprite,
          sounds: sprite.sounds.map((sound) => (sound.id === soundId ? { ...sound, name } : sound)),
        })),
      ),
    })),
  removeSound: (spriteId, soundId) =>
    set((current) => ({
      project: touched(
        mapSprite(current.project, spriteId, (sprite) => ({
          ...sprite,
          sounds: sprite.sounds.filter((sound) => sound.id !== soundId),
        })),
      ),
    })),
  addVariable: () => {
    const current = get();
    const variableId = uniqueId('var', current.project.variables.map((variable) => variable.id));
    const name = `变量 ${current.project.variables.length + 1}`;
    set({
      project: touched({
        ...current.project,
        variables: [...current.project.variables, { id: variableId, name, value: 0 }],
      }),
    });
    return variableId;
  },
  renameVariable: (variableId, name) =>
    set((current) => ({
      project: touched({
        ...current.project,
        variables: current.project.variables.map((variable) =>
          variable.id === variableId ? { ...variable, name } : variable,
        ),
      }),
    })),
  removeVariable: (variableId) =>
    set((current) => ({
      project: touched({
        ...current.project,
        variables: current.project.variables.filter((variable) => variable.id !== variableId),
      }),
    })),
  setVariableValue: (variableId, value) =>
    set((current) => ({
      project: touched({
        ...current.project,
        variables: current.project.variables.map((variable) =>
          variable.id === variableId ? { ...variable, value } : variable,
        ),
      }),
    })),
  updateStage: (patch) =>
    set((current) => ({
      project: touched({ ...current.project, stage: { ...current.project.stage, ...patch } }),
    })),
  updateInput: (input) =>
    set((current) => ({ project: touched({ ...current.project, input }) })),
  setRunning: (running) => set({ running }),
  setTheme: (theme) => {
    localStorage.setItem(THEME_KEY, theme);
    document.documentElement.dataset.theme = theme;
    set({ theme });
  },
  markSaved: () => set({ savedAt: Date.now() }),
  resetProject: () => {
    localStorage.removeItem(AUTOSAVE_KEY);
    location.reload();
  },
  replaceProject: (project, workspaces) => {
    // 积木定义（下拉选项）依赖工程内容，因此打开新工程后整页重载最稳
    try {
      localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({ project, workspaces }));
    } catch {
      // 配额不足时仍然重载，至少本次会话能看到新工程
    }
    location.reload();
  },
}));
