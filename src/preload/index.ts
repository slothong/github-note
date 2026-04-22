import { contextBridge, ipcRenderer } from 'electron';

const api = {
  // Auth
  authLogin: (): Promise<{ userCode: string; verificationUri: string }> =>
    ipcRenderer.invoke('auth:login'),
  authPoll: (): Promise<{ success: boolean; user?: unknown }> =>
    ipcRenderer.invoke('auth:poll'),
  authCheck: (): Promise<unknown> => ipcRenderer.invoke('auth:check'),
  authLogout: (): Promise<void> => ipcRenderer.invoke('auth:logout'),

  // Repos
  repoList: (): Promise<unknown[]> => ipcRenderer.invoke('repo:list'),
  repoSelect: (owner: string, repo: string): Promise<void> =>
    ipcRenderer.invoke('repo:select', owner, repo),
  repoGetLast: (): Promise<{ owner: string; repo: string } | null> =>
    ipcRenderer.invoke('repo:get-last'),

  // Files
  fileTree: (owner: string, repo: string): Promise<unknown[]> =>
    ipcRenderer.invoke('file:tree', owner, repo),
  fileRead: (
    owner: string,
    repo: string,
    path: string
  ): Promise<{ content: string; sha: string; path: string }> =>
    ipcRenderer.invoke('file:read', owner, repo, path),
  fileSaveLocal: (
    owner: string,
    repo: string,
    path: string,
    content: string,
    sha: string | null
  ): Promise<void> =>
    ipcRenderer.invoke('file:save-local', owner, repo, path, content, sha),
  fileLoadLocal: (
    owner: string,
    repo: string,
    path: string
  ): Promise<{ content: string; sha: string } | null> =>
    ipcRenderer.invoke('file:load-local', owner, repo, path),
  fileLocalChanges: (owner: string, repo: string): Promise<string[]> =>
    ipcRenderer.invoke('file:local-changes', owner, repo),
  filePush: (
    owner: string,
    repo: string,
    path: string,
    content: string,
    sha: string | null,
    message?: string
  ): Promise<{ sha: string }> =>
    ipcRenderer.invoke('file:push', owner, repo, path, content, sha, message),
  fileDelete: (
    owner: string,
    repo: string,
    path: string,
    sha: string,
    message?: string
  ): Promise<void> =>
    ipcRenderer.invoke('file:delete', owner, repo, path, sha, message),
};

contextBridge.exposeInMainWorld('api', api);

export type ElectronAPI = typeof api;
