import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { exportGameExe, isDesktopRuntime } from '../export-exe';
import { downloadStandaloneHtml } from '../export-html';
import { openNewProjectDialog } from '../new-project';
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

  const exportHtml = async (): Promise<void> => {
    const state = useEditorStore.getState();
    try {
      await downloadStandaloneHtml(state.project, state.workspaces);
    } catch {
      window.alert(t('toolbar.exportFailed'));
    }
  };

  const exportExe = async (): Promise<void> => {
    if (!isDesktopRuntime()) {
      window.alert(t('toolbar.exeDesktopOnly'));
      return;
    }
    const state = useEditorStore.getState();
    try {
      const savedPath = await exportGameExe(state.project, state.workspaces);
      window.alert(t('toolbar.exeDone', { path: savedPath }));
    } catch {
      window.alert(t('toolbar.exeFailed'));
    }
  };

  const exportAndroid = (): void => {
    window.alert(t('toolbar.androidBeta'));
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
        data-testid={inline ? 'm-new-project' : 'new-project'}
        title={t('toolbar.newProject')}
        onClick={() => openNewProjectDialog()}
      >
        {t('toolbar.newProjectShort')}
      </button>
      <button
        type="button"
        className="btn btn-ghost"
        data-testid={inline ? 'm-save-project' : 'save-project'}
        title={t('toolbar.save')}
        onClick={save}
      >
        {t('toolbar.shortSave')}
      </button>
      <button
        type="button"
        className="btn btn-ghost"
        data-testid={inline ? 'm-open-project' : 'open-project'}
        title={t('toolbar.open')}
        onClick={() => inputRef.current?.click()}
      >
        {t('toolbar.shortOpen')}
      </button>
      <button
        type="button"
        className="btn btn-ghost"
        data-testid={inline ? 'm-export-html5' : 'export-html5'}
        title={t('toolbar.exportHtml')}
        onClick={() => {
          void exportHtml();
        }}
      >
        {t('toolbar.shortExport')}
      </button>
      {!inline ? (
        <>
          <button
            type="button"
            className="btn btn-ghost"
            data-testid="export-exe"
            title={t('toolbar.exportExe')}
            onClick={() => {
              void exportExe();
            }}
          >
            {t('toolbar.shortExe')}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            data-testid="export-android"
            title={t('toolbar.exportAndroid')}
            onClick={exportAndroid}
          >
            {t('toolbar.shortAndroid')}
          </button>
        </>
      ) : null}
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
