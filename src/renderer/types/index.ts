export interface GitHubUser {
  login: string;
  avatarUrl: string;
  name: string | null;
}

export interface Repository {
  name: string;
  fullName: string;
  owner: string;
  private: boolean;
  description: string | null;
  updatedAt: string;
}

export interface TreeNode {
  path: string;
  type: 'blob' | 'tree';
  sha: string;
}

export interface FileContent {
  content: string;
  sha: string;
  path: string;
}

export interface FileTreeNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  sha: string;
  children?: FileTreeNode[];
}
