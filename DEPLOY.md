# GitHub Pages 배포 가이드

이 문서는 S-Slide 프로젝트를 GitHub Pages에 배포하는 방법을 설명합니다.

## 사전 준비

1. GitHub 계정이 필요합니다
2. 이 프로젝트를 GitHub 저장소로 푸시해야 합니다

## 배포 단계

### 1. GitHub 저장소 생성 및 푸시

```bash
# GitHub에서 새 저장소를 생성한 후
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

### 2. GitHub Pages 활성화

1. GitHub 저장소로 이동
2. Settings → Pages 메뉴로 이동
3. Source 섹션에서:
   - Source: "GitHub Actions" 선택

### 3. 자동 배포

- main 또는 master 브랜치에 푸시하면 자동으로 배포됩니다
- GitHub Actions 탭에서 배포 진행 상황을 확인할 수 있습니다

### 4. 배포된 사이트 접속

배포가 완료되면 다음 URL에서 접속할 수 있습니다:
```
https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/
```

## 로컬에서 빌드 테스트

```bash
# 의존성 설치
npm install

# 프로덕션 빌드
npm run build

# 빌드 결과 미리보기
npm run preview
```

## 주의사항

1. **API 키 보안**: 이 앱은 사용자가 직접 API 키를 입력하도록 설계되어 있습니다. 절대로 API 키를 코드에 하드코딩하지 마세요.

2. **CORS 이슈**: Google Gemini API는 브라우저에서 직접 호출할 때 CORS 제한이 있을 수 있습니다. 필요한 경우 백엔드 프록시 서버를 구축하세요.

3. **파일 크기**: GitHub Pages는 사이트당 1GB, 파일당 100MB 제한이 있습니다.

## 문제 해결

### 배포가 실패하는 경우
- Actions 탭에서 오류 로그 확인
- package-lock.json 파일이 있는지 확인
- Node.js 버전이 18 이상인지 확인

### 404 오류가 발생하는 경우
- vite.config.ts의 base 설정 확인
- GitHub Pages 설정이 올바른지 확인

### 빌드 오류가 발생하는 경우
- 로컬에서 `npm run build`가 성공하는지 확인
- TypeScript 오류가 없는지 확인