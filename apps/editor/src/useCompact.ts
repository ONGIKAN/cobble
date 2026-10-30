import { useEffect, useState } from 'react';

export type MobileTab = 'stage' | 'blocks' | 'sprites' | 'props';

/** 窄屏（手机 / 竖屏平板）走单栏 + 底部标签栏布局 */
export function useCompact(): boolean {
  const query = '(max-width: 1119px)';
  const [compact, setCompact] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const list = window.matchMedia(query);
    const onChange = () => setCompact(list.matches);
    list.addEventListener('change', onChange);
    return () => list.removeEventListener('change', onChange);
  }, []);

  return compact;
}

/** 触屏设备（手机 / 平板）：显示屏幕方向键 */
export function useCoarsePointer(): boolean {
  const query = '(pointer: coarse)';
  const [coarse, setCoarse] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const list = window.matchMedia(query);
    const onChange = () => setCoarse(list.matches);
    list.addEventListener('change', onChange);
    return () => list.removeEventListener('change', onChange);
  }, []);

  return coarse;
}
