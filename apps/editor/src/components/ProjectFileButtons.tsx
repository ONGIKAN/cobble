import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { downloadProject, readProjectFile } from '../project-file';
import { useEditorStore } from '../store';

interface Props {
  /** bar：桌面顶栏；inline：手机舞台页头部 */
  variant?: 'bar' | 'inline';
}

export function ProjectFileButtons({ variant = 'bar' }: Props) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const inline = variant === 'inline';

  const save = (): void => {
    const state = useEditorStore.getState();
    downloadProject(state.project, state.workspaces);
  };

  const open = async (file: File): Promise<void> => {
    const result = await readProjectFile(file);
    if (!result.ok) {
      window.alert(t('toolbar.badFile'));
      return;
    }
    useEditorStore.getState().replaceProject(result.value.project, result.value.workspaces);
  };

  return (
    <div className={`file-actions${inline ? ' is-inline' : ''}`}>
      <button
        type="button"
        className="btn btn-ghost"
        data-testid={inline ? 'm-save-project' : 'save-project'}
        onClick={save}
      >
        {t('toolbar.save')}
      </button>
      <button
        type="button"
        className="btn btn-ghost"
        data-testid={inline ? 'm-open-project' : 'open-project'}
        onClick={() => inputRef.current?.click()}
      >
        {t('toolbar.open')}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".gproj,application/json"
        hidden
        data-testid={inline ? 'm-open-project-input' : 'open-project-input'}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) void open(file);
        }}
      />
    </div>
  );
}
