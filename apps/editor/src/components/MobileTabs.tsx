import { useTranslation } from 'react-i18next';
import type { MobileTab } from '../useCompact';

interface Props {
  value: MobileTab;
  onChange: (tab: MobileTab) => void;
}

export function MobileTabs({ value, onChange }: Props) {
  const { t } = useTranslation();
  const tabs: Array<{ id: MobileTab; label: string }> = [
    { id: 'stage', label: t('panels.stage') },
    { id: 'blocks', label: t('panels.blocks') },
    { id: 'sprites', label: t('panels.sprites') },
    { id: 'props', label: t('panels.inspector') },
  ];

  return (
    <nav className="mobile-tabs" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={value === tab.id}
          className={`mobile-tab${value === tab.id ? ' is-on' : ''}`}
          data-testid={`tab-${tab.id}`}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
