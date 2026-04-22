import { useState } from 'react';
import { FileTree } from './FileTree';
import { Editor } from './Editor';
import { Preview } from './Preview';
import type { FileTreeNode, GitHubUser } from '../types';

interface Props {
  user: GitHubUser;
  repoName: string;
  fileTree: FileTreeNode[];
  currentFilePath: string | null;
  content: string;
  initialContent: string;
  isDirty: boolean;
  isLocalSaved: boolean;
  isPushing: boolean;
  error: string | null;
  isLoading: boolean;
  localChanges: Set<string>;
  onSelectFile: (path: string) => void;
  onDeleteFile: (path: string, sha: string) => void;
  onCreateFile: (path: string) => void;
  onChange: (value: string) => void;
  onSaveLocal: () => void;
  onPush: (message?: string) => void;
  onRefresh: () => void;
  onChangeRepo: () => void;
  onLogout: () => void;
}

type ViewMode = 'split' | 'editor' | 'preview';

export function MainLayout({
  user,
  repoName,
  fileTree,
  currentFilePath,
  content,
  initialContent,
  isDirty,
  isLocalSaved,
  isPushing,
  error,
  isLoading,
  localChanges,
  onSelectFile,
  onDeleteFile,
  onCreateFile,
  onChange,
  onSaveLocal,
  onPush,
  onRefresh,
  onChangeRepo,
  onLogout,
}: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [showNewFileModal, setShowNewFileModal] = useState(false);
  const [newFileName, setNewFileName] = useState('');

  const handleCreateFile = () => {
    setNewFileName('');
    setShowNewFileModal(true);
  };

  const handleNewFileSubmit = () => {
    const name = newFileName.trim();
    if (!name) return;
    const path = name.endsWith('.md') ? name : `${name}.md`;
    onCreateFile(path);
    setShowNewFileModal(false);
    setNewFileName('');
  };

  return (
    <div className="main-layout">
      {/* Title bar */}
      <div className="titlebar">
        <div className="titlebar-drag" />
        <div className="titlebar-left">
          <img src={user.avatarUrl} alt="" className="avatar-sm" />
          <span className="titlebar-repo" onClick={onChangeRepo} title="저장소 변경">
            {repoName}
          </span>
          {currentFilePath && (
            <>
              <span className="titlebar-sep">/</span>
              <span className="titlebar-file">
                {currentFilePath}
                {isDirty && <span className="dirty-dot" title="저장되지 않음" />}
                {!isDirty && isLocalSaved && <span className="local-dot" title="로컬 저장됨 (푸시 필요)" />}
              </span>
            </>
          )}
        </div>
        <div className="titlebar-center">
          <div className="view-toggle">
            <button
              className={viewMode === 'editor' ? 'active' : ''}
              onClick={() => setViewMode('editor')}
              title="에디터"
            >
              Edit
            </button>
            <button
              className={viewMode === 'split' ? 'active' : ''}
              onClick={() => setViewMode('split')}
              title="분할"
            >
              Split
            </button>
            <button
              className={viewMode === 'preview' ? 'active' : ''}
              onClick={() => setViewMode('preview')}
              title="미리보기"
            >
              Preview
            </button>
          </div>
        </div>
        <div className="titlebar-right">
          {error && <span className="error-badge" title={error}>⚠</span>}
          {currentFilePath && (
            <>
              <button
                className="btn btn-save"
                onClick={onSaveLocal}
                disabled={!isDirty}
              >
                저장
              </button>
              <button
                className="btn btn-push"
                onClick={() => onPush()}
                disabled={(!isLocalSaved && !isDirty) || isPushing}
                title="GitHub에 커밋 & 푸시"
              >
                {isPushing ? '푸시 중...' : '푸시'}
              </button>
            </>
          )}
          {localChanges.size > 0 && !currentFilePath && (
            <span className="local-changes-badge">{localChanges.size}개 로컬 변경</span>
          )}
          <button className="btn btn-ghost btn-sm" onClick={onRefresh} title="새로고침">
            ↻
          </button>
          <button className="btn btn-ghost btn-sm" onClick={onLogout}>
            로그아웃
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="main-body">
        <div className="sidebar">
          <FileTree
            tree={fileTree}
            selectedPath={currentFilePath}
            onSelect={onSelectFile}
            onDelete={onDeleteFile}
            onCreateFile={handleCreateFile}
          />
        </div>

        <div className="editor-area">
          {isLoading ? (
            <div className="editor-empty">
              <p>불러오는 중...</p>
            </div>
          ) : !currentFilePath ? (
            <div className="editor-empty">
              <p>파일을 선택하거나 새 노트를 만드세요</p>
            </div>
          ) : (
            <div className={`editor-split mode-${viewMode}`}>
              {(viewMode === 'editor' || viewMode === 'split') && (
                <div className="editor-pane">
                  <Editor fileKey={currentFilePath} initialContent={initialContent} onChange={onChange} onSave={onSaveLocal} />
                </div>
              )}
              {(viewMode === 'preview' || viewMode === 'split') && (
                <div className="preview-pane">
                  <Preview content={content} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* New File Modal */}
      {showNewFileModal && (
        <div className="modal-overlay" onClick={() => setShowNewFileModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>새 노트 만들기</h3>
            <input
              type="text"
              className="search-input"
              placeholder="파일 경로 (예: notes/my-note.md)"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleNewFileSubmit();
                if (e.key === 'Escape') setShowNewFileModal(false);
              }}
              autoFocus
            />
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setShowNewFileModal(false)}>
                취소
              </button>
              <button
                className="btn btn-primary"
                onClick={handleNewFileSubmit}
                disabled={!newFileName.trim()}
              >
                만들기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
