import { useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import { useRepo } from './hooks/useRepo';
import { useEditor } from './hooks/useEditor';
import { LoginScreen } from './components/LoginScreen';
import { RepoSelector } from './components/RepoSelector';
import { MainLayout } from './components/MainLayout';

export function App() {
  const auth = useAuth();
  const repo = useRepo();
  const editor = useEditor(repo.selected);

  // Check for last used repo on login
  useEffect(() => {
    if (auth.isAuthenticated && !repo.selected) {
      repo.checkLastRepo();
    }
  }, [auth.isAuthenticated]);

  const handleDeleteFile = async (path: string, sha: string) => {
    await editor.deleteFile(path, sha);
    await repo.refreshTree();
  };

  const handleCreateFile = async (path: string) => {
    await editor.createFile(path);
    await repo.refreshTree();
  };

  if (auth.isLoading && !auth.deviceCode) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
      </div>
    );
  }

  if (!auth.isAuthenticated) {
    return (
      <LoginScreen
        isLoading={auth.isLoading}
        deviceCode={auth.deviceCode}
        onLogin={auth.login}
        onPoll={auth.pollLogin}
      />
    );
  }

  if (!repo.selected) {
    return (
      <RepoSelector
        user={auth.user!}
        repos={repo.repos}
        isLoading={repo.isLoading}
        search={repo.search}
        onSearch={repo.setSearch}
        onLoad={repo.loadRepos}
        onSelect={repo.selectRepo}
        onLogout={auth.logout}
      />
    );
  }

  return (
    <MainLayout
      user={auth.user!}
      repoName={`${repo.selected.owner}/${repo.selected.repo}`}
      fileTree={repo.fileTree}
      currentFilePath={editor.currentFile?.path ?? null}
      content={editor.content}
      initialContent={editor.initialContent}
      isDirty={editor.isDirty}
      isLocalSaved={editor.isLocalSaved}
      isPushing={editor.isPushing}
      error={editor.error}
      isLoading={repo.isLoading}
      localChanges={editor.localChanges}
      onSelectFile={editor.openFile}
      onDeleteFile={handleDeleteFile}
      onCreateFile={handleCreateFile}
      onChange={editor.setContent}
      onSaveLocal={editor.saveLocal}
      onPush={(msg) => editor.push(msg)}
      onRefresh={repo.refreshTree}
      onChangeRepo={repo.clearSelection}
      onLogout={auth.logout}
    />
  );
}
