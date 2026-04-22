# GitHub Note - 설계 문서

## 1. 기술 스택

| 영역 | 기술 | 버전 | 선정 이유 |
|------|------|------|-----------|
| 프레임워크 | Electron | latest | 크로스 플랫폼 데스크톱 앱 |
| 언어 | TypeScript | 6.x | 타입 안정성 |
| 빌드 | electron-vite | latest | main/preload/renderer 통합 빌드, 빠른 HMR |
| 렌더러 | React 19 | latest | 생태계, 안정성 |
| 스타일링 | Tailwind CSS 4 | latest | 유틸리티 기반, 빠른 UI 개발 |
| 에디터 | CodeMirror 6 | latest | 경량, 마크다운 확장 지원, 커스텀 용이 |
| MD 렌더링 | react-markdown | latest | remark/rehype 기반 React 컴포넌트 |
| GitHub API | @octokit/rest | latest | 공식 클라이언트 |
| 토큰 저장 | Electron safeStorage | built-in | OS keychain 연동 |
| 패키징 | electron-builder | latest | 가장 성숙한 Electron 패키징 도구 |

## 2. 아키텍처

### 2.1 프로세스 구조

```
┌─────────────────────────────────────────────────────┐
│  Main Process                                       │
│  ┌───────────┐  ┌───────────┐  ┌─────────────────┐ │
│  │ AuthModule│  │ GitHubAPI │  │ StorageModule   │ │
│  │ (OAuth)   │  │ (Octokit) │  │ (safeStorage)   │ │
│  └─────┬─────┘  └─────┬─────┘  └────────┬────────┘ │
│        └───────────────┼─────────────────┘          │
│                   IPC Handler                        │
└────────────────────┬────────────────────────────────┘
                     │ contextBridge (preload.ts)
┌────────────────────┴────────────────────────────────┐
│  Renderer Process                                    │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────┐ │
│  │ Login    │  │ Repo     │  │ Main Layout       │ │
│  │ Screen   │  │ Selector │  │ ┌───────┬───────┐ │ │
│  │          │  │          │  │ │ File  │Editor │ │ │
│  │          │  │          │  │ │ Tree  │Preview│ │ │
│  │          │  │          │  │ └───────┴───────┘ │ │
│  └──────────┘  └──────────┘  └───────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### 2.2 데이터 흐름

```
User Action → React Component → IPC invoke
  → Main Process Handler → Octokit API → GitHub
  → Response → IPC return → React State Update → UI
```

## 3. 디렉토리 구조

```
github-note/
├── electron.vite.config.ts        # electron-vite 설정
├── package.json
├── tsconfig.json                  # 루트 tsconfig (references)
├── tsconfig.node.json             # main/preload용
├── tsconfig.web.json              # renderer용
│
├── src/
│   ├── main/                      # Main Process
│   │   ├── index.ts               # 앱 진입점, BrowserWindow 생성
│   │   ├── ipc.ts                 # IPC 핸들러 등록
│   │   ├── auth.ts                # GitHub OAuth Device Flow
│   │   ├── github.ts              # Octokit 래퍼 (repo, contents CRUD)
│   │   └── store.ts               # safeStorage 기반 토큰/설정 저장
│   │
│   ├── preload/                   # Preload Script
│   │   └── index.ts               # contextBridge 노출 API 정의
│   │
│   └── renderer/                  # Renderer Process (React)
│       ├── index.html
│       ├── main.tsx               # React 진입점
│       ├── App.tsx                # 라우팅 (로그인 → 레포선택 → 메인)
│       ├── global.css             # Tailwind import + 글로벌 스타일
│       │
│       ├── components/
│       │   ├── LoginScreen.tsx    # GitHub 로그인 화면
│       │   ├── RepoSelector.tsx   # 레포 선택 화면
│       │   ├── MainLayout.tsx     # 사이드바 + 에디터 레이아웃
│       │   ├── FileTree.tsx       # 파일 트리 (재귀 컴포넌트)
│       │   ├── Editor.tsx         # CodeMirror 마크다운 에디터
│       │   └── Preview.tsx        # react-markdown 미리보기
│       │
│       ├── hooks/
│       │   ├── useAuth.ts         # 인증 상태 관리
│       │   ├── useRepo.ts         # 레포 선택/파일 목록 관리
│       │   └── useEditor.ts       # 에디터 상태, 저장 로직
│       │
│       └── types/
│           └── index.ts           # 공유 타입 정의
│
├── resources/                     # 앱 아이콘 등 정적 리소스
└── docs/
    ├── PRD.md
    └── DESIGN.md
```

## 4. 모듈 상세 설계

### 4.1 인증 (Auth)

**GitHub OAuth Device Flow 시퀀스**:

```
앱                          GitHub                    브라우저
 │                             │                         │
 │─ POST /login/device/code ──→│                         │
 │←─ device_code, user_code ───│                         │
 │                             │                         │
 │─── user_code 표시 ─────────────────── 코드 입력 ──────→│
 │                             │←── 사용자 인증 완료 ─────│
 │                             │                         │
 │─ POST /login/oauth/access_token (polling) ──→│        │
 │←─ access_token ─────────────│                         │
 │                             │                         │
 │─ safeStorage에 토큰 저장     │                         │
```

- Client ID는 환경변수 또는 빌드 시 주입
- 토큰은 `safeStorage.encryptString()`으로 암호화 후 파일 저장
- 앱 시작 시 저장된 토큰 확인 → 유효하면 자동 로그인

### 4.2 GitHub API 래퍼 (github.ts)

| 메서드 | API | 설명 |
|--------|-----|------|
| `getUser()` | `GET /user` | 로그인 사용자 정보 |
| `listRepos()` | `GET /user/repos` | 레포 목록 (owner, 최신순) |
| `getTree(owner, repo)` | `GET /repos/.../git/trees/:sha?recursive=1` | 전체 파일 트리 (재귀) |
| `getFileContent(owner, repo, path)` | `GET /repos/.../contents/:path` | 파일 내용 (base64 디코딩) |
| `createFile(owner, repo, path, content, message)` | `PUT /repos/.../contents/:path` | 파일 생성 |
| `updateFile(owner, repo, path, content, sha, message)` | `PUT /repos/.../contents/:path` | 파일 수정 (sha 필요) |
| `deleteFile(owner, repo, path, sha, message)` | `DELETE /repos/.../contents/:path` | 파일 삭제 (sha 필요) |

- 모든 Contents API 응답에 포함된 `sha`를 캐시하여 수정/삭제 시 사용
- `.md` 파일만 필터링하여 렌더러에 전달

### 4.3 IPC 채널 정의

```typescript
// Main → Renderer
type IpcChannels = {
  // Auth
  'auth:login': () => Promise<{ userCode: string; verificationUri: string }>;
  'auth:poll': () => Promise<{ success: boolean; user?: GitHubUser }>;
  'auth:logout': () => Promise<void>;
  'auth:check': () => Promise<GitHubUser | null>;

  // Repos
  'repo:list': () => Promise<Repository[]>;
  'repo:select': (owner: string, repo: string) => Promise<void>;
  'repo:get-last': () => Promise<{ owner: string; repo: string } | null>;

  // Files
  'file:tree': (owner: string, repo: string) => Promise<TreeNode[]>;
  'file:read': (owner: string, repo: string, path: string) => Promise<FileContent>;
  'file:save': (owner: string, repo: string, path: string, content: string, sha: string | null, message?: string) => Promise<FileSaveResult>;
  'file:delete': (owner: string, repo: string, path: string, sha: string, message?: string) => Promise<void>;
};
```

### 4.4 렌더러 상태 관리

React Context + useReducer로 관리. 외부 상태 라이브러리 없이 구현.

```
AppContext
├── auth: { user, isLoading, isAuthenticated }
├── repo: { selected, list }
└── editor: { currentFile, content, isDirty, files }
```

**화면 전환 로직**:
```
isAuthenticated === false  → LoginScreen
isAuthenticated && !repo   → RepoSelector
isAuthenticated && repo    → MainLayout
```

### 4.5 에디터 (CodeMirror 6)

- 확장: `@codemirror/lang-markdown`, `@codemirror/theme-one-dark`
- 키바인딩: `Cmd+S` → 저장 (커밋 & 푸시)
- 변경 감지: `onUpdate`로 dirty 상태 추적
- 탭 전환 없이 split view (좌: 에디터, 우: 미리보기)

### 4.6 충돌 처리

저장 시 현재 `sha`와 서버 `sha` 비교:
1. 일치 → 정상 커밋
2. 불일치 → 다이얼로그 표시
   - "원격 내용으로 갱신" → 서버 내용 fetch 후 에디터 반영
   - "강제 덮어쓰기" → 최신 sha로 재시도

## 5. 보안 고려사항

- `nodeIntegration: false`, `contextIsolation: true` 유지
- 모든 GitHub API 호출은 Main 프로세스에서만 수행
- 렌더러는 preload로 노출된 IPC 메서드만 사용 가능
- 토큰은 safeStorage로 암호화 저장, 메모리에 평문 유지 최소화
- CSP 헤더 설정: `default-src 'self'`

## 6. 빌드 & 패키징

```bash
# 개발
npm run dev          # electron-vite dev (HMR)

# 빌드
npm run build        # electron-vite build
npm run package      # electron-builder로 .dmg/.exe 생성
```

electron-vite가 main/preload는 Node CJS로, renderer는 브라우저 ESM으로 각각 번들링.
