import { useEffect } from 'react';
import type { Repository, GitHubUser } from '../types';

interface Props {
  user: GitHubUser;
  repos: Repository[];
  isLoading: boolean;
  search: string;
  onSearch: (value: string) => void;
  onLoad: () => void;
  onSelect: (owner: string, repo: string) => void;
  onLogout: () => void;
}

export function RepoSelector({
  user,
  repos,
  isLoading,
  search,
  onSearch,
  onLoad,
  onSelect,
  onLogout,
}: Props) {
  useEffect(() => {
    onLoad();
  }, [onLoad]);

  return (
    <div className="repo-selector">
      <div className="repo-header">
        <div className="repo-header-left">
          <img src={user.avatarUrl} alt={user.login} className="avatar" />
          <span className="username">{user.name || user.login}</span>
        </div>
        <button className="btn btn-ghost" onClick={onLogout}>
          로그아웃
        </button>
      </div>

      <div className="repo-content">
        <h2>저장소 선택</h2>
        <input
          type="text"
          className="search-input"
          placeholder="저장소 검색..."
          value={search}
          onChange={(e) => onSearch(e.target.value)}
        />

        {isLoading ? (
          <div className="loading">불러오는 중...</div>
        ) : (
          <div className="repo-list">
            {repos.map((repo) => (
              <button
                key={repo.fullName}
                className="repo-item"
                onClick={() => onSelect(repo.owner, repo.name)}
              >
                <div className="repo-item-header">
                  <span className="repo-name">{repo.name}</span>
                  {repo.private && <span className="badge">Private</span>}
                </div>
                {repo.description && (
                  <p className="repo-description">{repo.description}</p>
                )}
              </button>
            ))}
            {repos.length === 0 && !isLoading && (
              <p className="empty-state">저장소를 찾을 수 없습니다</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
