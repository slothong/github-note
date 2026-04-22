import { ipcMain } from 'electron';
import { startDeviceFlow, pollForToken } from './auth';
import {
  initOctokit,
  clearOctokit,
  getUser,
  listRepos,
  getTree,
  getFileContent,
  saveFile,
  deleteFile,
} from './github';
import {
  saveToken, loadToken, deleteToken, loadConfig, saveConfig,
  saveLocal, loadLocal, deleteLocal, listLocalChanges,
} from './store';

let pendingDeviceCode: string | null = null;
let pendingInterval = 5;

export function registerIpcHandlers(): void {
  // Auth
  ipcMain.handle('auth:login', async () => {
    const result = await startDeviceFlow();
    pendingDeviceCode = result.deviceCode;
    pendingInterval = result.interval;
    return { userCode: result.userCode, verificationUri: result.verificationUri };
  });

  ipcMain.handle('auth:poll', async () => {
    if (!pendingDeviceCode) throw new Error('No pending device flow');
    const token = await pollForToken(pendingDeviceCode, pendingInterval);
    pendingDeviceCode = null;
    saveToken(token);
    initOctokit(token);
    const user = await getUser();
    return { success: true, user };
  });

  ipcMain.handle('auth:check', async () => {
    const token = loadToken();
    if (!token) return null;
    try {
      initOctokit(token);
      return await getUser();
    } catch {
      deleteToken();
      clearOctokit();
      return null;
    }
  });

  ipcMain.handle('auth:logout', async () => {
    deleteToken();
    clearOctokit();
  });

  // Repos
  ipcMain.handle('repo:list', async () => {
    return await listRepos();
  });

  ipcMain.handle('repo:select', async (_event, owner: string, repo: string) => {
    saveConfig({ ...loadConfig(), lastRepo: { owner, repo } });
  });

  ipcMain.handle('repo:get-last', async () => {
    return loadConfig().lastRepo || null;
  });

  // Files
  ipcMain.handle('file:tree', async (_event, owner: string, repo: string) => {
    return await getTree(owner, repo);
  });

  ipcMain.handle(
    'file:read',
    async (_event, owner: string, repo: string, path: string) => {
      return await getFileContent(owner, repo, path);
    }
  );

  // Local save (no push)
  ipcMain.handle(
    'file:save-local',
    async (
      _event,
      owner: string,
      repo: string,
      path: string,
      content: string,
      sha: string | null
    ) => {
      saveLocal(owner, repo, path, content, sha);
    }
  );

  ipcMain.handle(
    'file:load-local',
    async (_event, owner: string, repo: string, path: string) => {
      return loadLocal(owner, repo, path);
    }
  );

  ipcMain.handle(
    'file:local-changes',
    async (_event, owner: string, repo: string) => {
      return listLocalChanges(owner, repo);
    }
  );

  // Push to GitHub (commit & push)
  ipcMain.handle(
    'file:push',
    async (
      _event,
      owner: string,
      repo: string,
      path: string,
      content: string,
      sha: string | null,
      message?: string
    ) => {
      const result = await saveFile(owner, repo, path, content, sha, message);
      deleteLocal(owner, repo, path);
      return result;
    }
  );

  ipcMain.handle(
    'file:delete',
    async (
      _event,
      owner: string,
      repo: string,
      path: string,
      sha: string,
      message?: string
    ) => {
      await deleteFile(owner, repo, path, sha, message);
      deleteLocal(owner, repo, path);
    }
  );
}
