import { useState, type DragEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { AssetDef, SpriteDef } from '@cobble/project';
import { useEditorStore } from '../store';
import { NumberInput } from './NumberInput';

const SPRITE_MIME = 'application/x-cobble-sprite';
const GROUP_MIME = 'application/x-cobble-group';

type DropTarget = { groupId: string; position: 'before' | 'after' | 'inside' } | null;

function thumbUrl(asset: AssetDef | undefined): string | undefined {
  if (!asset) return undefined;
  return asset.dataUrl ?? asset.path;
}

export function SpriteRail() {
  const { t } = useTranslation();
  const project = useEditorStore((state) => state.project);
  const selectedSpriteId = useEditorStore((state) => state.selectedSpriteId);
  const selectSprite = useEditorStore((state) => state.selectSprite);
  const addSprite = useEditorStore((state) => state.addSprite);
  const addGroup = useEditorStore((state) => state.addGroup);
  const renameGroup = useEditorStore((state) => state.renameGroup);
  const removeGroup = useEditorStore((state) => state.removeGroup);
  const setSpriteGroup = useEditorStore((state) => state.setSpriteGroup);
  const moveGroup = useEditorStore((state) => state.moveGroup);
  const addVariable = useEditorStore((state) => state.addVariable);
  const renameVariable = useEditorStore((state) => state.renameVariable);
  const removeVariable = useEditorStore((state) => state.removeVariable);
  const setVariableValue = useEditorStore((state) => state.setVariableValue);

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [draggingGroupId, setDraggingGroupId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget>(null);
  const groups = project.groups ?? [];
  const knownGroupIds = new Set(groups.map((group) => group.id));
  const ungrouped = project.sprites.filter((sprite) => !sprite.groupId || !knownGroupIds.has(sprite.groupId));
  const visibleVariables = project.variables.filter((variable) => !variable.name.startsWith('_'));
  const assetOf = (assetId: string): AssetDef | undefined => project.assets.find((asset) => asset.id === assetId);

  const startDragSprite = (spriteId: string) => (event: DragEvent<HTMLButtonElement>): void => {
    event.dataTransfer.setData(SPRITE_MIME, spriteId);
    event.dataTransfer.setData('text/plain', spriteId);
    event.dataTransfer.effectAllowed = 'move';
  };

  const startDragGroup = (groupId: string) => (event: DragEvent<HTMLElement>): void => {
    event.dataTransfer.setData(GROUP_MIME, groupId);
    event.dataTransfer.effectAllowed = 'move';
    setDraggingGroupId(groupId);
  };

  const dragOverGroup = (groupId: string) => (event: DragEvent<HTMLElement>): void => {
    const types = event.dataTransfer.types;
    if (!types.includes(SPRITE_MIME) && !types.includes(GROUP_MIME)) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'move';
    if (types.includes(GROUP_MIME)) {
      const rect = event.currentTarget.getBoundingClientRect();
      const position = event.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
      setDropTarget({ groupId, position });
    } else {
      setDropTarget({ groupId, position: 'inside' });
    }
  };

  const dropOnGroup = (groupId: string) => (event: DragEvent<HTMLElement>): void => {
    event.preventDefault();
    event.stopPropagation();
    const spriteId = event.dataTransfer.getData(SPRITE_MIME);
    const draggedGroupId = event.dataTransfer.getData(GROUP_MIME);
    if (spriteId) {
      setSpriteGroup(spriteId, groupId);
    } else if (draggedGroupId) {
      const position = dropTarget?.position === 'before' ? 'before' : 'after';
      moveGroup(draggedGroupId, groupId, position);
    }
    setDropTarget(null);
    setDraggingGroupId(null);
  };

  const card = (sprite: SpriteDef) => {
    const url = thumbUrl(assetOf(sprite.costumes[0]?.assetId));
    return (
      <button
        type="button"
        key={sprite.id}
        className={`sprite-card${sprite.id === selectedSpriteId ? ' is-active' : ''}`}
        draggable
        onDragStart={startDragSprite(sprite.id)}
        onDragEnd={() => setDraggingGroupId(null)}
        onClick={() => selectSprite(sprite.id)}
      >
        <span className="sprite-thumb" style={url ? { backgroundImage: `url("${url}")` } : undefined} />
        <span className="sprite-meta">
          <span className="sprite-name">{sprite.name}</span>
          <span className="sprite-sub mono">{t('sprites.costumeCount', { count: sprite.costumes.length })}</span>
        </span>
      </button>
    );
  };

  const promptRename = (groupId: string, current: string): void => {
    const name = window.prompt(t('sprites.groupPromptName'), current);
    if (name && name.trim()) renameGroup(groupId, name.trim());
  };

  const confirmRemove = (groupId: string): void => {
    if (window.confirm(t('sprites.groupConfirmRemove'))) removeGroup(groupId);
  };

  return (
    <aside className="rail">
      <div className="panel-head">
        <span className="panel-label">{t('panels.sprites')}</span>
        <span className="panel-meta mono">{project.sprites.length}</span>
        <button type="button" className="mini-btn" data-testid="add-group" title={t('sprites.groupAdd')} onClick={() => addGroup()}>
          ▤
        </button>
        <button type="button" className="mini-btn" data-testid="add-sprite" title={t('sprites.add')} onClick={() => addSprite()}>
          ＋
        </button>
      </div>

      <div
        className="sprite-list"
        data-testid="sprite-list"
        onDragOver={(event) => {
          if (event.dataTransfer.types.includes(SPRITE_MIME)) {
            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';
          }
        }}
        onDrop={(event) => {
          const spriteId = event.dataTransfer.getData(SPRITE_MIME);
          if (!spriteId) return;
          event.preventDefault();
          setSpriteGroup(spriteId, null);
          setDropTarget(null);
        }}
      >
        {groups.map((group) => {
          const members = project.sprites.filter((sprite) => sprite.groupId === group.id);
          const isCollapsed = collapsed[group.id] ?? false;
          const target = dropTarget?.groupId === group.id ? dropTarget.position : null;
          return (
            <section
              className={`sprite-group${target ? ` is-drop-${target}` : ''}${draggingGroupId === group.id ? ' is-dragging' : ''}`}
              key={group.id}
              data-testid={`sprite-group-${group.id}`}
              onDragOver={dragOverGroup(group.id)}
              onDrop={dropOnGroup(group.id)}
            >
              <div
                className="sprite-group-head"
                draggable
                onDragStart={startDragGroup(group.id)}
                onDragEnd={() => {
                  setDraggingGroupId(null);
                  setDropTarget(null);
                }}
              >
                <button
                  type="button"
                  className="sprite-group-toggle"
                  data-testid={`group-toggle-${group.id}`}
                  aria-label={t('sprites.groupToggle')}
                  onClick={() => setCollapsed((current) => ({ ...current, [group.id]: !current[group.id] }))}
                >
                  {isCollapsed ? '▸' : '▾'}
                </button>
                <span className="sprite-group-name">{group.name}</span>
                <span className="sprite-group-count mono">{members.length}</span>
                <button type="button" className="icon-btn" data-testid={`group-rename-${group.id}`} title={t('sprites.groupRename')} onClick={() => promptRename(group.id, group.name)}>
                  ✎
                </button>
                <button type="button" className="icon-btn icon-danger" data-testid={`group-remove-${group.id}`} title={t('sprites.groupRemove')} onClick={() => confirmRemove(group.id)}>
                  ✕
                </button>
              </div>
              {isCollapsed ? null : <div className="sprite-group-body">{members.map(card)}</div>}
            </section>
          );
        })}
        {ungrouped.map(card)}
      </div>

      <div className="panel-head">
        <span className="panel-label">{t('panels.variables')}</span>
        <button type="button" className="mini-btn" data-testid="add-variable" title={t('variables.add')} onClick={() => addVariable()}>
          ＋
        </button>
      </div>
      {visibleVariables.length === 0 ? (
        <p className="empty-hint">{t('inspector.none')}</p>
      ) : (
        <div className="var-list">
          {visibleVariables.map((variable) => (
            <div className="var-row" key={variable.id} data-testid={`var-row-${variable.id}`}>
              <input
                className="field-input var-name-input"
                value={variable.name}
                aria-label={t('variables.name')}
                data-testid={`var-name-${variable.id}`}
                onChange={(event) => renameVariable(variable.id, event.target.value)}
              />
              <NumberInput
                className="field-input mono var-value-input"
                value={typeof variable.value === 'number' ? variable.value : Number(variable.value) || 0}
                ariaLabel={t('variables.value')}
                testId={`var-value-${variable.id}`}
                onCommit={(value) => setVariableValue(variable.id, value)}
              />
              <button type="button" className="icon-btn icon-danger" title={t('variables.remove')} data-testid={`var-remove-${variable.id}`} onClick={() => removeVariable(variable.id)}>
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}
