import { app, safeStorage } from 'electron';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const storeDir = join(app.getPath('userData'), 'store');
const tokenPath = join(storeDir, 'token.enc');
const configPath = join(storeDir, 'config.json');

function ensureDir(): void {
  if (!existsSync(storeDir)) {
    mkdirSync(storeDir, { recursive: true });
  }
}

export function saveToken(token: string): void {
  ensureDir();
  if (safeStorage.isEncryptionAvailable()) {
    const encrypted = safeStorage.encryptString(token);
    writeFileSync(tokenPath, encrypted);
  } else {
    writeFileSync(tokenPath, token, 'utf-8');
  }
}

export function loadToken(): string | null {
  if (!existsSync(tokenPath)) return null;
  try {
    const data = readFileSync(tokenPath);
    if (safeStorage.isEncryptionAvailable()) {
      return safeStorage.decryptString(data);
    }
    return data.toString('utf-8');
  } catch {
    return null;
  }
}

export function deleteToken(): void {
  if (existsSync(tokenPath)) {
    writeFileSync(tokenPath, '');
  }
}

interface Config {
  lastRepo?: { owner: string; repo: string };
}

export function loadConfig(): Config {
  if (!existsSync(configPath)) return {};
  try {
    return JSON.parse(readFileSync(configPath, 'utf-8'));
  } catch {
    return {};
  }
}

export function saveConfig(config: Config): void {
  ensureDir();
  writeFileSync(configPath, JSON.stringify(config, null, 2));
}

// --- Local file cache ---

function cacheDirFor(owner: string, repo: string): string {
  return join(storeDir, 'cache', `${owner}__${repo}`);
}

function cachePathFor(owner: string, repo: string, filePath: string): string {
  return join(cacheDirFor(owner, repo), filePath.replace(/\//g, '__'));
}

function metaPathFor(owner: string, repo: string): string {
  return join(cacheDirFor(owner, repo), '_meta.json');
}

interface LocalMeta {
  [filePath: string]: { sha: string; savedAt: string };
}

function loadMeta(owner: string, repo: string): LocalMeta {
  const p = metaPathFor(owner, repo);
  if (!existsSync(p)) return {};
  try {
    return JSON.parse(readFileSync(p, 'utf-8'));
  } catch {
    return {};
  }
}

function saveMeta(owner: string, repo: string, meta: LocalMeta): void {
  const dir = cacheDirFor(owner, repo);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(metaPathFor(owner, repo), JSON.stringify(meta, null, 2));
}

export function saveLocal(
  owner: string,
  repo: string,
  filePath: string,
  content: string,
  sha: string | null
): void {
  const dir = cacheDirFor(owner, repo);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(cachePathFor(owner, repo, filePath), content, 'utf-8');
  const meta = loadMeta(owner, repo);
  meta[filePath] = { sha: sha ?? '', savedAt: new Date().toISOString() };
  saveMeta(owner, repo, meta);
}

export function loadLocal(
  owner: string,
  repo: string,
  filePath: string
): { content: string; sha: string } | null {
  const p = cachePathFor(owner, repo, filePath);
  if (!existsSync(p)) return null;
  const meta = loadMeta(owner, repo);
  const entry = meta[filePath];
  if (!entry) return null;
  return { content: readFileSync(p, 'utf-8'), sha: entry.sha };
}

export function deleteLocal(owner: string, repo: string, filePath: string): void {
  const p = cachePathFor(owner, repo, filePath);
  if (existsSync(p)) {
    writeFileSync(p, '');
    const { unlinkSync } = require('fs');
    unlinkSync(p);
  }
  const meta = loadMeta(owner, repo);
  delete meta[filePath];
  saveMeta(owner, repo, meta);
}

export function listLocalChanges(owner: string, repo: string): string[] {
  const meta = loadMeta(owner, repo);
  return Object.keys(meta);
}
