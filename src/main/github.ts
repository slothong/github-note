import { Octokit } from '@octokit/rest';

let octokit: Octokit | null = null;

export function initOctokit(token: string): void {
  octokit = new Octokit({ auth: token });
}

export function clearOctokit(): void {
  octokit = null;
}

function getOctokit(): Octokit {
  if (!octokit) throw new Error('Not authenticated');
  return octokit;
}

export async function getUser() {
  const { data } = await getOctokit().rest.users.getAuthenticated();
  return { login: data.login, avatarUrl: data.avatar_url, name: data.name };
}

export async function listRepos() {
  const repos: Array<{
    name: string;
    fullName: string;
    owner: string;
    private: boolean;
    description: string | null;
    updatedAt: string;
  }> = [];

  for await (const response of getOctokit().paginate.iterator(
    getOctokit().rest.repos.listForAuthenticatedUser,
    { sort: 'updated', per_page: 100, affiliation: 'owner' }
  )) {
    for (const repo of response.data) {
      repos.push({
        name: repo.name,
        fullName: repo.full_name,
        owner: repo.owner.login,
        private: repo.private,
        description: repo.description,
        updatedAt: repo.updated_at ?? '',
      });
    }
  }

  return repos;
}

export interface TreeNode {
  path: string;
  type: 'blob' | 'tree';
  sha: string;
}

export async function getTree(
  owner: string,
  repo: string
): Promise<TreeNode[]> {
  const { data: refData } = await getOctokit().rest.git.getRef({
    owner,
    repo,
    ref: 'heads/main',
  }).catch(() =>
    getOctokit().rest.git.getRef({ owner, repo, ref: 'heads/master' })
  );

  const commitSha = refData.object.sha;

  const { data } = await getOctokit().rest.git.getTree({
    owner,
    repo,
    tree_sha: commitSha,
    recursive: 'true',
  });

  return data.tree
    .filter(
      (item) =>
        item.path &&
        item.type &&
        item.sha &&
        (item.type === 'tree' || item.path.endsWith('.md'))
    )
    .map((item) => ({
      path: item.path!,
      type: item.type as 'blob' | 'tree',
      sha: item.sha!,
    }));
}

export interface FileContent {
  content: string;
  sha: string;
  path: string;
}

export async function getFileContent(
  owner: string,
  repo: string,
  path: string
): Promise<FileContent> {
  const { data } = await getOctokit().rest.repos.getContent({
    owner,
    repo,
    path,
  });

  if (Array.isArray(data) || data.type !== 'file') {
    throw new Error('Not a file');
  }

  const content = Buffer.from(data.content, 'base64').toString('utf-8');
  return { content, sha: data.sha, path };
}

export async function saveFile(
  owner: string,
  repo: string,
  path: string,
  content: string,
  sha: string | null,
  message?: string
): Promise<{ sha: string }> {
  const msg = message || (sha ? `Update ${path}` : `Create ${path}`);

  const params: Parameters<Octokit['rest']['repos']['createOrUpdateFileContents']>[0] = {
    owner,
    repo,
    path,
    message: msg,
    content: Buffer.from(content).toString('base64'),
  };

  if (sha) {
    params.sha = sha;
  }

  const { data } = await getOctokit().rest.repos.createOrUpdateFileContents(params);
  return { sha: data.content?.sha ?? '' };
}

export async function deleteFile(
  owner: string,
  repo: string,
  path: string,
  sha: string,
  message?: string
): Promise<void> {
  await getOctokit().rest.repos.deleteFile({
    owner,
    repo,
    path,
    message: message || `Delete ${path}`,
    sha,
  });
}
