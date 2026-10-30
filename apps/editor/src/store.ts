import { create } from 'zustand';
import { createDemoProject, type ProjectDoc, type SpriteDef } from '@cobble/project';

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
  setRunning: (running: boolean) => void;
  setTheme: (theme: ThemeMode) => void;
  markSaved: () => void;
  resetProject: () => void;
  replaceProject: (project: ProjectDoc, workspaces: Record<string, unknown>) => void;
}

const snapshot = loadAutosave();
const initialProject = snapshot?.project ?? createDemoProject();

export const useEditorStore = create<EditorState>()((set) => ({
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
    set((current) => ({
      project: {
        ...current.project,
        sprites: current.project.sprites.map((sprite) =>
          sprite.id === spriteId ? { ...sprite, ...patch } : sprite,
        ),
      },
    })),
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
