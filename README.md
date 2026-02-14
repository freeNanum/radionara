# 라디오나라 (React + Vercel)

sradio365 서울특별시 채널 목록을 기준으로 실시간 라디오를 재생하는 웹앱입니다.

## 주요 기능

- 서울특별시 채널 목록 실시간 로드 (`/api/channels`)
- 채널별 재생 URL 조회 후 재생 (`/api/stream?radio=rXXXX`)
- HLS(`.m3u8`) 및 일반 스트림 재생 지원
- 검색, 즐겨찾기(LocalStorage), 취침 타이머
- 모바일/데스크톱 반응형 UI

## 로컬 실행

```bash
npm install
npm run dev
```

## 빌드

```bash
npm run build
```

## Vercel 배포

1. 이 저장소를 GitHub에 업로드
2. Vercel에서 해당 저장소 Import
3. Framework Preset: `Vite`
4. Build Command: `npm run build`
5. Output Directory: `dist`
6. Deploy

`api/` 폴더의 서버리스 함수가 자동으로 활성화됩니다.

## 주의사항

- 원본 방송사의 스트림 정책 또는 CORS 정책에 따라 일부 채널은 브라우저에서 재생이 제한될 수 있습니다.
- 채널 목록/스트림 URL은 외부 소스(sradio365) 구조 변경 시 영향을 받을 수 있습니다.
