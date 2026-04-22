import { useState, useCallback } from 'react';
import type { Repository, TreeNode, FileTreeNode } from '../types';

function buildFileTree(nodes: TreeNode[]): FileTreeNode[] {
  const root: FileTreeNode[] = [];
  const map = new Map<string, FileTreeNode>();

  // Create folder nodes
  for (const node of nodes) {
    if (node.type === 'tree') {
      const folderNode: FileTreeNode = {
        name: node.path.split('/').pop()!,
        path: node.path,
        type: 'folder',
        sha: node.sha,
        children: [],
      };
      map.set(node.path, folderNode);
    }
  }

  // Create file nodes and attach to parents
  for (const node of nodes) {
    const parts = node.path.split('/');
    const name = parts.pop()!;
    const parentPath = parts.join('/');

    const treeNode: FileTreeNode = {
      name,
      path: node.path,
      type: node.type === 'tree' ? 'folder' : 'file',
      sha: node.sha,
      children: node.type === 'tree' ? map.get(node.path)?.children : undefined,
    };

    if (parentPath && map.has(parentPath)) {
      map.get(parentPath)!.children!.push(treeNode);
    } else if (!parentPath) {
      root.push(treeNode);
    }

    if (node.type === 'tree') {
      map.set(node.path, treeNode);
    }
  }

  // Sort: folders first, then alphabetically
  const sortTree = (nodes: FileTreeNode[]): FileTreeNode[] => {
    nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    for (const node of nodes) {
      if (node.children) sortTree(node.children);
    }
    return nodes;
  };

  return sortTree(root);
}

export function useRepo() {
  const [repos, setRepos] = useState<Repository[]>([]);
  const [selected, setSelected] = useState<{ owner: string; repo: string } | null>(null);
  const [fileTree, setFileTree] = useState<FileTreeNode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');

  const loadRepos = useCallback(async () => {
    setIsLoading(true);
    const list = (await window.api.repoList()) as Repository[];
    setRepos(list);
    setIsLoading(false);
  }, []);

  const selectRepo = useCallback(async (owner: string, repo: string) => {
    setSelected({ owner, repo });
    await window.api.repoSelect(owner, repo);
    setIsLoading(true);
    const tree = (await window.api.fileTree(owner, repo)) as TreeNode[];
    setFileTree(buildFileTree(tree));
    setIsLoading(false);
  }, []);

  const refreshTree = useCallback(async () => {
    if (!selected) return;
    setIsLoading(true);
    const tree = (await window.api.fileTree(selected.owner, selected.repo)) as TreeNode[];
    setFileTree(buildFileTree(tree));
    setIsLoading(false);
  }, [selected]);

  const checkLastRepo = useCallback(async () => {
    const last = await window.api.repoGetLast();
    if (last) {
      await selectRepo(last.owner, last.repo);
    }
  }, [selectRepo]);

  const filteredRepos = search
    ? repos.filter(
        (r) =>
          r.name.toLowerCase().includes(search.toLowerCase()) ||
          (r.description?.toLowerCase().includes(search.toLowerCase()) ?? false)
      )
    : repos;

  return {
    repos: filteredRepos,
    selected,
    fileTree,
    isLoading,
    search,
    setSearch,
    loadRepos,
    selectRepo,
    refreshTree,
    checkLastRepo,
    clearSelection: () => setSelected(null),
  };
}
