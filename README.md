# GitHub Note

GitHub 저장소를 백엔드로 활용하는 마크다운 노트 앱.
별도 서버 없이 GitHub API를 통해 노트를 읽고 쓰며, 변경사항을 커밋/푸시하는 Electron 데스크톱 앱이다.

## 주요 기능

- **GitHub 인증** - OAuth Device Flow를 통한 안전한 로그인
- **레포 기반 노트 관리** - GitHub 저장소가 곧 노트 저장소
- **마크다운 에디터** - CodeMirror 6 기반, 실시간 미리보기 (split view)
- **노트 CRUD** - 생성, 조회, 수정, 삭제 후 자동 커밋 & 푸시
- **파일 트리** - 저장소의 `.md` 파일을 트리 구조로 탐색

## 기술 스택

| 영역 | 기술 |
|------|------|
| 프레임워크 | Electron + TypeScript |
| 빌드 | electron-vite |
| 렌더러 | React 19 |
| 에디터 | CodeMirror 6 |
| 마크다운 렌더링 | react-markdown + remark-gfm |
| GitHub API | @octokit/rest |
| 스타일링 | Tailwind CSS 4 |

## 시작하기

### 사전 요구사항

- Node.js 20+
- npm

### 설치 및 실행

```bash
# 의존성 설치
npm install

# 개발 모드 실행 (HMR 지원)
npm run dev

# 프로덕션 빌드
npm run build
```

## 프로젝트 구조

```
src/
├── main/           # Electron 메인 프로세스
│   ├── index.ts    # 앱 진입점, BrowserWindow 생성
│   ├── auth.ts     # GitHub OAuth Device Flow
│   ├── github.ts   # Octokit 래퍼 (repo, contents CRUD)
│   ├── ipc.ts      # IPC 핸들러 등록
│   └── store.ts    # safeStorage 기반 토큰/설정 저장
├── preload/        # contextBridge API 정의
│   └── index.ts
└── renderer/       # React 프론트엔드
    ├── components/ # LoginScreen, RepoSelector, MainLayout, FileTree, Editor, Preview
    ├── hooks/      # useAuth, useRepo, useEditor
    └── types/      # 공유 타입 정의
```

## 문서

- [PRD (기획서)](docs/PRD.md)
- [설계 문서](docs/DESIGN.md)

## 라이선스

ISC
