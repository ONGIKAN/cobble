import { create } from 'zustand';
import {
  createDemoProject,
  type AssetDef,
  type InputConfig,
  type ProjectDoc,
  type SpriteDef,
  type SpriteGroupDef,
  type StageDef,
} from '@cobble/project';
import { spritePlaceholderSvg } from './sprite-assets';
import { createEntry, deleteEntry, findEntry } from './library';

export type ThemeMode = 'dark' | 'light';

export const THEME_KEY = 'cobble.theme';

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
  projectId: string;
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
  /** 从资源库素材创建角色（x/y 为舞台坐标） */
  addSpriteFromAsset: (input: { name: string; dataUrl: string; x: number; y: number }) => string;
  removeSprite: (spriteId: string) => void;
  /** 复制角色（含造型与位置，新名字带「副本」） */
  duplicateSprite: (spriteId: string) => string | null;
  /** 角色分组 */
  addGroup: () => string;
  renameGroup: (groupId: string, name: string) => void;
  removeGroup: (groupId: string) => void;
  setSpriteGroup: (spriteId: string, groupId: string | null) => void;
  /** 拖动分组排序：把 groupId 移到 targetId 前/后 */
  moveGroup: (groupId: string, targetId: string, position: 'before' | 'after') => void;
  /** 撤销/重做：直接恢复工程与积木快照 */
  restoreSnapshot: (project: ProjectDoc, workspaces: Record<string, unknown>) => void;
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
  loadProject: (projectId: string) => boolean;
  replaceProject: (project: ProjectDoc, workspaces: Record<string, unknown>) => void;
}

const initialProject = createDemoProject();

export const useEditorStore = create<EditorState>()((set, get) => ({
  projectId: '',
  project: initialProject,
  selectedSpriteId: initialProject.sprites[0]?.id ?? '',
  workspaces: {},
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
  addSpriteFromAsset: ({ name, dataUrl, x, y }) => {
    const current = get();
    const order = current.project.sprites.length;
    const spriteId = uniqueId('sprite', current.project.sprites.map((sprite) => sprite.id));
    const assetId = uniqueId('asset', current.project.assets.map((asset) => asset.id));
    const asset: AssetDef = { id: assetId, name, kind: 'image', dataUrl };
    const sprite: SpriteDef = {
      id: spriteId,
      name,
      x,
      y,
      rotation: 90,
      size: 100,
      visible: true,
      zIndex: order + 1,
      rotationStyle: 'all-around',
      costumes: [{ name, assetId }],
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
  duplicateSprite: (spriteId) => {
    const current = get();
    const source = current.project.sprites.find((sprite) => sprite.id === spriteId);
    if (!source) return null;
    const spriteIdNew = uniqueId('sprite', current.project.sprites.map((sprite) => sprite.id));
    const copy: SpriteDef = {
      ...source,
      id: spriteIdNew,
      name: `${source.name} 副本`,
      x: source.x + 40,
      y: source.y - 40,
      zIndex: Math.max(...current.project.sprites.map((sprite) => sprite.zIndex)) + 1,
    };
    set({
      project: touched({ ...current.project, sprites: [...current.project.sprites, copy] }),
      selectedSpriteId: spriteIdNew,
    });
    return spriteIdNew;
  },
  addGroup: () => {
    const current = get();
    const groups = current.project.groups ?? [];
    const groupId = uniqueId('group', groups.map((group) => group.id));
    const group: SpriteGroupDef = { id: groupId, name: `分组 ${groups.length + 1}` };
    set({ project: touched({ ...current.project, groups: [...groups, group] }) });
    return groupId;
  },
  renameGroup: (groupId, name) =>
    set((current) => ({
      project: touched({
        ...current.project,
        groups: (current.project.groups ?? []).map((group) =>
          group.id === groupId ? { ...group, name } : group,
        ),
      }),
    })),
  removeGroup: (groupId) =>
    set((current) => ({
      project: touched({
        ...current.project,
        groups: (current.project.groups ?? []).filter((group) => group.id !== groupId),
        sprites: current.project.sprites.map((sprite) => {
          if (sprite.groupId !== groupId) return sprite;
          const next = { ...sprite };
          delete next.groupId;
          return next;
        }),
      }),
    })),
  moveGroup: (groupId, targetId, position) =>
    set((current) => {
      const groups = [...(current.project.groups ?? [])];
      const from = groups.findIndex((group) => group.id === groupId);
      if (from < 0 || groupId === targetId) return {};
      const [moved] = groups.splice(from, 1);
      let index = groups.findIndex((group) => group.id === targetId);
      if (index < 0) return {};
      if (position === 'after') index += 1;
      groups.splice(index, 0, moved);
      return { project: touched({ ...current.project, groups }) };
    }),
  setSpriteGroup: (spriteId, groupId) =>
    set((current) => ({
      project: touched(
        mapSprite(current.project, spriteId, (sprite) => {
          const next = { ...sprite };
          if (groupId) next.groupId = groupId;
          else delete next.groupId;
          return next;
        }),
      ),
    })),
  restoreSnapshot: (project, workspaces) => {
    const current = get();
    const selected = project.sprites.some((sprite) => sprite.id === current.selectedSpriteId)
      ? current.selectedSpriteId
      : project.sprites[0]?.id ?? '';
    set({ project, workspaces, selectedSpriteId: selected, running: false });
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
    const current = get();
    if (current.projectId) deleteEntry(current.projectId);
    location.hash = '/projects';
    location.reload();
  },
  loadProject: (projectId) => {
    const entry = findEntry(projectId);
    if (!entry) return false;
    set({
      projectId,
      project: entry.project,
      workspaces: entry.workspaces,
      selectedSpriteId: entry.project.sprites[0]?.id ?? '',
      running: false,
    });
    return true;
  },
  replaceProject: (project, workspaces) => {
    // 新建工程写入工程库后整页重载，保证积木下拉选项按新工程重新生成
    const entry = createEntry(project, workspaces);
    location.hash = `/editor/${entry.id}`;
    location.reload();
  },
}));
