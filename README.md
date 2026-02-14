# radionara

한국의 대표 방송 채널을 기반으로 실시간 라디오를 청취할 수 있는 웹앱입니다.

- 서비스 도메인: `https://radionara.vercel.app`
- 프론트엔드: React + Vite
- 백엔드: Vercel Serverless Functions (`api/`)

## 주요 기능

- 실시간 채널 목록 로드 (`/api/channels`)
- 채널별 스트림 URL 조회 후 재생 (`/api/stream?radio=...`)
- HLS(`.m3u8`) / 일반 스트림 재생
- 검색, 즐겨찾기(LocalStorage), 취침 타이머
- 모바일/데스크톱 반응형 UI
- SEO 기본 설정(메타 태그, canonical, JSON-LD, robots, sitemap)

## 기술 스택

- Runtime: Node.js `>=18`
- Package manager: npm (`packageManager: npm@9.2.0`)
- Frontend: React 18, Vite 5
- Player: `hls.js`
- Lint: ESLint 9

## 프로젝트 구조

```text
.
├─ api/
│  ├─ channels.js        # 채널 목록 수집/필터링
│  ├─ stream.js          # 채널 ID -> 스트림 URL 해석
│  ├─ hls.js             # CBS HLS 프록시 (manifest/segment 재작성)
│  └─ cbsRadioKorea.js   # CBS 고정 채널 목록
├─ public/
│  ├─ robots.txt
│  └─ sitemap.xml
├─ src/
│  ├─ App.jsx
│  ├─ App.css
│  └─ main.jsx
├─ index.html
└─ vercel.json
```

## 로컬 실행

### 1) 설치

```bash
npm install
```

### 2) 프론트 개발 서버

```bash
npm run dev
```

- 기본 접속: `http://localhost:5173`
- Vite 프론트만 실행합니다.

### 3) Vercel 서버리스 API까지 함께 실행

```bash
npx vercel dev --listen 3001
```

- 접속: `http://localhost:3001`
- `/api/*` 함수까지 동일하게 확인할 때 사용합니다.

## 빌드/검증

```bash
npm run build
npm run preview
npm run lint
```

참고:

- ESLint 설정에서 `api/`는 ignore 되어 있습니다.
- 따라서 `npm run lint`는 기본적으로 프론트 코드 중심 검증입니다.


## SEO 설정

현재 프로젝트에는 아래가 반영되어 있습니다.

- `index.html`
  - title / description / keywords
  - robots meta
  - canonical
  - Open Graph / Twitter Card
  - JSON-LD (`WebSite`, `WebApplication`)
- `public/robots.txt`
- `public/sitemap.xml`

검색 등록 작업(권장):

1. Google Search Console: `https://radionara.vercel.app/` URL 접두어 속성 등록
2. 사이트맵 제출: `https://radionara.vercel.app/sitemap.xml`

## 배포 (Vercel)

`vercel.json` 기준:

- `framework`: `vite`
- `installCommand`: `npm install`
- `buildCommand`: `npm run build`
- `outputDirectory`: `dist`
- `devCommand`: `npm run dev -- --host 0.0.0.0 --port $PORT`

배포 후 확인:

- `https://radionara.vercel.app/`
- `https://radionara.vercel.app/api/channels`
- `https://radionara.vercel.app/robots.txt`
- `https://radionara.vercel.app/sitemap.xml`

## 트러블슈팅

### `manifestLoadError` / CBS 재생 실패

- CBS 스트림은 `/api/hls`를 통해 우회 재생하도록 구현되어 있습니다.
- 에러 시 Network 탭에서 `/api/hls?...` 응답 코드와 JSON(`error`, `detail`)을 먼저 확인하세요.

### `npx vercel dev`에서 `yarn: not found`

- 이 프로젝트는 `npm` 기준이며 `vercel.json`에 npm 명령이 고정되어 있습니다.
- 포트 충돌 시 `--listen`으로 포트를 바꿔 실행하세요.

```bash
npx vercel dev --listen 3001
```
