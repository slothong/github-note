import { useState, useCallback, useEffect } from 'react';
import type { FileContent } from '../types';

interface EditorState {
  currentFile: FileContent | null;
  isDirty: boolean;
  isLocalSaved: boolean;
  isPushing: boolean;
  error: string | null;
  localChanges: Set<string>;
}

export function useEditor(selected: { owner: string; repo: string } | null) {
  const [state, setState] = useState<EditorState>({
    currentFile: null,
    isDirty: false,
    isLocalSaved: false,
    isPushing: false,
    error: null,
    localChanges: new Set(),
  });
  const [content, setContentInternal] = useState('');
  const [initialContent, setInitialContent] = useState('');

  // Load list of locally changed files
  const refreshLocalChanges = useCallback(async () => {
    if (!selected) return;
    const changes = await window.api.fileLocalChanges(selected.owner, selected.repo);
    setState((s) => ({ ...s, localChanges: new Set(changes) }));
  }, [selected]);

  useEffect(() => {
    refreshLocalChanges();
  }, [refreshLocalChanges]);

  const openFile = useCallback(
    async (path: string) => {
      if (!selected) return;
      try {
        // Fetch remote file for sha
        const remoteFile = await window.api.fileRead(selected.owner, selected.repo, path);
        // Check if local version exists
        const local = await window.api.fileLoadLocal(selected.owner, selected.repo, path);

        if (local) {
          setState((s) => ({
            ...s,
            currentFile: { ...remoteFile, content: local.content },
            isDirty: false,
            isLocalSaved: true,
            error: null,
          }));
          setContentInternal(local.content);
          setInitialContent(local.content);
        } else {
          setState((s) => ({
            ...s,
            currentFile: remoteFile,
            isDirty: false,
            isLocalSaved: false,
            error: null,
          }));
          setContentInternal(remoteFile.content);
          setInitialContent(remoteFile.content);
        }
      } catch (err) {
        setState((s) => ({
          ...s,
          error: err instanceof Error ? err.message : 'Failed to read file',
        }));
      }
    },
    [selected]
  );

  const setContent = useCallback((value: string) => {
    setContentInternal(value);
    setState((s) => ({ ...s, isDirty: true }));
  }, []);

  // Save locally only (Cmd+S)
  const saveLocal = useCallback(async () => {
    if (!selected || !state.currentFile) return;
    try {
      await window.api.fileSaveLocal(
        selected.owner,
        selected.repo,
        state.currentFile.path,
        content,
        state.currentFile.sha
      );
      setState((s) => ({
        ...s,
        isDirty: false,
        isLocalSaved: true,
        localChanges: new Set(s.localChanges).add(state.currentFile!.path),
      }));
    } catch (err) {
      setState((s) => ({
        ...s,
        error: err instanceof Error ? err.message : 'Failed to save locally',
      }));
    }
  }, [selected, state.currentFile, content]);

  // Commit & push to GitHub
  const push = useCallback(
    async (message?: string) => {
      if (!selected || !state.currentFile) return;
      setState((s) => ({ ...s, isPushing: true, error: null }));
      try {
        const result = await window.api.filePush(
          selected.owner,
          selected.repo,
          state.currentFile.path,
          content,
          state.currentFile.sha,
          message
        );
        const newLocalChanges = new Set(state.localChanges);
        newLocalChanges.delete(state.currentFile.path);
        setState((s) => ({
          ...s,
          currentFile: s.currentFile
            ? { ...s.currentFile, sha: result.sha, content }
            : null,
          isDirty: false,
          isLocalSaved: false,
          isPushing: false,
          localChanges: newLocalChanges,
        }));
      } catch (err) {
        setState((s) => ({
          ...s,
          isPushing: false,
          error: err instanceof Error ? err.message : 'Failed to push',
        }));
      }
    },
    [selected, state.currentFile, state.localChanges, content]
  );

  const createFile = useCallback(
    async (path: string, initialContent = '') => {
      if (!selected) return;
      // Save locally first, don't push yet
      try {
        await window.api.fileSaveLocal(
          selected.owner,
          selected.repo,
          path,
          initialContent,
          null
        );
        const file: FileContent = { content: initialContent, sha: '', path };
        setState((s) => ({
          ...s,
          currentFile: file,
          isDirty: false,
          isLocalSaved: true,
          error: null,
          localChanges: new Set(s.localChanges).add(path),
        }));
        setContentInternal(initialContent);
        setInitialContent(initialContent);
      } catch (err) {
        setState((s) => ({
          ...s,
          error: err instanceof Error ? err.message : 'Failed to create file',
        }));
      }
    },
    [selected]
  );

  const deleteFile = useCallback(
    async (path: string, sha: string) => {
      if (!selected) return;
      try {
        await window.api.fileDelete(selected.owner, selected.repo, path, sha);
        const newLocalChanges = new Set(state.localChanges);
        newLocalChanges.delete(path);
        if (state.currentFile?.path === path) {
          setState({
            currentFile: null,
            isDirty: false,
            isLocalSaved: false,
            isPushing: false,
            error: null,
            localChanges: newLocalChanges,
          });
          setContentInternal('');
        } else {
          setState((s) => ({ ...s, localChanges: newLocalChanges }));
        }
      } catch (err) {
        setState((s) => ({
          ...s,
          error: err instanceof Error ? err.message : 'Failed to delete file',
        }));
      }
    },
    [selected, state.currentFile, state.localChanges]
  );

  const closeFile = useCallback(() => {
    setState((s) => ({
      ...s,
      currentFile: null,
      isDirty: false,
      isLocalSaved: false,
      error: null,
    }));
    setContentInternal('');
  }, []);

  return {
    ...state,
    content,
    initialContent,
    setContent,
    openFile,
    saveLocal,
    push,
    createFile,
    deleteFile,
    closeFile,
  };
}
