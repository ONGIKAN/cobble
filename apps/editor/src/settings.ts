import { create } from 'zustand';

export const SETTINGS_KEY = 'cobbox.settings';

/** 应用级设置（与具体工程无关，保存在浏览器本地） */
export interface AppSettings {
  /** 删除角色时弹确认框 */
  confirmDelete: boolean;
  /** 积木区网格吸附 */
  gridSnap: boolean;
  /** 自动保存工程 */
  autosave: boolean;
  /** 自动保存防抖间隔（毫秒） */
  autosaveDelay: number;
  /** 手机底部标签栏切换时自动收起积木抽屉的动画（预留） */
  sheetAnimation: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  confirmDelete: true,
  gridSnap: false,
  autosave: true,
  autosaveDelay: 350,
  sheetAnimation: true,
};

function load(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      autosaveDelay: clampDelay(Number(parsed.autosaveDelay ?? DEFAULT_SETTINGS.autosaveDelay)),
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function clampDelay(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_SETTINGS.autosaveDelay;
  return Math.min(3000, Math.max(150, Math.round(value)));
}

interface SettingsState extends AppSettings {
  update: (patch: Partial<AppSettings>) => void;
  resetSettings: () => void;
}

export const useSettings = create<SettingsState>()((set, get) => ({
  ...load(),
  update: (patch) => {
    const state = get();
    const next: AppSettings = {
      confirmDelete: patch.confirmDelete ?? state.confirmDelete,
      gridSnap: patch.gridSnap ?? state.gridSnap,
      autosave: patch.autosave ?? state.autosave,
      autosaveDelay: clampDelay(patch.autosaveDelay ?? state.autosaveDelay),
      sheetAnimation: patch.sheetAnimation ?? state.sheetAnimation,
    };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    set(next);
  },
  resetSettings: () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
    set({ ...DEFAULT_SETTINGS, update: get().update, resetSettings: get().resetSettings });
  },
}));

/** 非 React 环境读取设置 */
export function readSettings(): AppSettings {
  const state = useSettings.getState();
  const { update: _update, resetSettings: _reset, ...rest } = state;
  return rest;
}
