# Arrange Engineer Vercel · 클라우드 관리 안내서

> 작성 기준일: 2026-08-25  
> 운영 사이트: <https://arrange-engineer.vercel.app>  
> Vercel 프로젝트: `aiwork3/arrange-engineer`  
> GitHub 저장소: <https://github.com/aiworkjg-cmyk/Arrange-Engineer>

## 1. 지금 사이트는 무엇으로 돌아가나요?

현재 사이트는 네 부분이 연결된 구조입니다.

```text
내 PC의 코드
   ↓ git push origin main
GitHub 저장소
   ↓ Vercel이 자동 감지하여 빌드·배포
Vercel
   ├─ 화면: React/Vite 정적 사이트
   └─ /api/cloud: 로그인·저장을 처리하는 Vercel Function
          ↓
Upstash Redis
   └─ 계정·보드·캘린더·배치표·설정을 지속 저장
```

Vercel은 화면 파일을 세계 각지에서 빠르게 제공하고, 필요할 때만 `/api/cloud` 함수를 실행합니다. 로컬 PC에서처럼 검은 서버 창을 24시간 켜둘 필요가 없습니다.

실제 데이터는 Vercel 디스크가 아니라 Vercel Marketplace를 통해 연결한 **Upstash Redis**에 저장됩니다. Vercel은 Upstash 접속정보를 프로젝트 환경변수로 안전하게 주입합니다.

## 2. Vercel 홈페이지에서 내 사이트 찾기

1. <https://vercel.com> 에 접속합니다.
2. **Log In**을 누릅니다.
3. 처음 배포할 때 사용한 **Continue with GitHub**을 선택합니다.
4. 왼쪽 위 팀 선택기에서 `aiwork3`를 선택합니다.
5. 프로젝트 목록에서 `arrange-engineer`를 누릅니다.

바로 가기: <https://vercel.com/aiwork3/arrange-engineer>

## 3. 프로젝트 화면의 중요 메뉴

### Overview

현재 Production 배포 상태, 최신 배포 주소, 연결 도메인을 보는 첫 화면입니다. `arrange-engineer.vercel.app`이 최신 Production 배포를 가리키는지 확인합니다.

### Deployments

코드가 배포된 기록입니다.

- `Ready`: 배포 성공
- `Building`: 빌드 중
- `Error`: 빌드 실패. 해당 배포를 누르고 Build Logs 확인
- 오른쪽 `...` 메뉴의 **Redeploy**: 같은 코드로 다시 배포
- 문제가 생기면 이전에 성공한 배포로 돌아갈 수 있습니다.

### Logs / Observability

`/api/cloud`에서 오류가 난 시간과 오류문구를 확인하는 곳입니다. Hobby는 런타임 로그 보존이 짧으므로 문제 발생 직후 확인하는 것이 좋습니다.

### Settings → General

프로젝트 이름, Framework Preset(`Vite`), Root Directory(`.`), Node.js 버전, Build Command를 확인합니다. 현재 빌드 명령은 `npm run build`입니다.

### Settings → Git

연결된 GitHub 저장소와 Production Branch를 확인합니다. 현재 Production Branch는 `main`입니다. `main`에 push하면 Vercel Production이 자동으로 새로 배포됩니다. 다른 브랜치는 일반적으로 Preview 배포가 만들어집니다.

### Settings → Environment Variables

클라우드 접속과 마스터 복구에 필요한 비밀값입니다.

| 변수 | 역할 |
|---|---|
| `KV_REST_API_URL` | Upstash Redis REST 주소 |
| `KV_REST_API_TOKEN` | Upstash Redis 쓰기 가능 인증 토큰 |
| `KV_REST_API_READ_ONLY_TOKEN` | Upstash 읽기 전용 토큰 |
| `CLOUD_SESSION_SECRET` | 로그인 세션 위변조 방지 서명키 |
| `MASTER_LOGIN_ID` | Redis가 빈 상태일 때 생성할 초기 마스터 아이디 |
| `MASTER_PASSWORD` | Redis가 빈 상태일 때 생성할 초기 마스터 비밀번호 |
| `MASTER_RESET_KEY` | 마스터 아이디·비밀번호 복구 API 키 |

이 값은 코드나 GitHub에 입력하지 말고 Vercel에서 **Sensitive/Secret**로 관리합니다. 값을 바꾼면 이전 배포에는 자동 반영되지 않으므로 Production을 **Redeploy**해야 합니다.

### Domains

현재 주소 `arrange-engineer.vercel.app`을 확인하는 곳입니다. 나중에 독자 도메인을 구입하면 여기서 연결합니다. Vercel이 HTTPS 인증서를 자동으로 처리합니다.

### Storage / Integrations

현재 연결된 저장소는 다음과 같습니다.

- 이름: `upstash-kv-orange-window`
- 제품: `Upstash for Redis (upstash-kv)`
- 상태: `Available`
- 요금제: `Free`
- 연결 환경: Production, Preview, Development
- 관리 화면: <https://vercel.com/aiwork3/~/stores/integration/store_Tgmeihc0QS7eoWOJ>

Vercel 대시보드에서 **Storage** 또는 **Integrations** → `upstash-kv-orange-window`를 누르면 연결 프로젝트, 플랜, 사용량, 비용, Upstash 관리 화면 연결을 확인할 수 있습니다.

## 4. 코드 수정 후 자동 배포되는 과정

1. 로컬 PC의 `C:\Dev\Arrange-Engineer` 폴더에서 코드를 수정합니다.
2. 로컬에서 `npm run lint`, `npm run build`로 오류를 확인합니다.
3. Git 커밋을 만듭니다.
4. `git push origin main`으로 GitHub에 올립니다.
5. GitHub와 연결된 Vercel이 push를 감지합니다.
6. Vercel이 의존성을 설치하고 `npm run build`를 실행합니다.
7. 성공하면 새 Production 배포가 `arrange-engineer.vercel.app`에 연결됩니다.

보통 1~3분 안에 반영되지만 빌드 대기열에 따라 달라질 수 있습니다. 배포 중에도 기존 Production 사이트는 계속 작동하고, 새 배포가 성공한 뒤 주소가 교체됩니다.

## 5. 클라우드에 저장되는 내용

로그인한 계정별로 다음 내용을 하나의 데이터 묶음으로 저장합니다.

- 흰색 배경판 크기와 사이트 설정
- 구역·모형·시공기사 명단
- 캘린더 일정
- 저장한 배치표
- 활동 이력

데이터 키는 앱 이름으로 구분되고, 계정별 데이터는 서로 다른 키에 저장됩니다. 동일 계정을 여러 PC·모바일에서 로그인하면 같은 클라우드 데이터를 불러옵니다.

앱은 로그인 후 변경이 생기면 약 1.8초 대기했다가 최신 상태를 저장합니다. 계속 새 파일이 쌓이는 방식이 아니라 해당 계정의 최신 데이터를 덩어씁니다. 단, 배치표 스냅샷은 계정 데이터 안의 목록으로 유지됩니다.

계정 비밀번호는 평문으로 Redis에 저장하지 않고 임의 salt와 scrypt 해시로 저장합니다.

## 6. 현재 요금제와 용량

### Vercel

현재 프로젝트는 개인 프로젝트용 무료 **Hobby** 범위에서 운영할 수 있습니다. 2026-08-25 기준 공식 문서의 주요 포함량은 다음과 같습니다.

- Fast Data Transfer: 월 100GB
- Function Invocations: 월 1,000,000회
- Active CPU: 월 4 CPU-hours
- Provisioned Memory: 월 360 GB-hours
- Build execution: 월 6,000분
- Production/Preview 배포: 1일 100회 한도
- Runtime Logs: 약 1시간, 최대 4,000행

Hobby는 **개인·비상업용** 제한이 있습니다. 회사 업무 서비스로 실제 운영하려면 Vercel Pro 또는 Azure와 같은 업무용 환경을 다시 검토하세요. Hobby 포함량을 넘으면 해당 기능이 일시 중지되고 할당량이 다시 제공될 때까지 기다려야 할 수 있습니다.

### Upstash Redis Free

이 사이트에 실제로 연결된 플랜입니다.

- 데이터 저장공간: 256MB
- 월 명령: 500,000회
- 월 대역폭: 10GB
- 최대 요청 크기: 10MB
- 무료 데이터베이스: 1개

현재 Vercel CLI에서는 이 마켓플레이스 리소스의 **실시간 용량·명령 사용량 숫자를 제공하지 않습니다.** 확인된 상태는 `Available`, `Free`, 프로젝트 연결 정상이며 클라우드 API 로그인·불러오기 검증은 통과했습니다. 사이트를 새로 구성한 단계라 예상 저장량은 매우 작지만, 정확한 수치는 아래 관리 화면에서 확인해야 합니다.

#### Upstash 실제 사용량 확인

1. Vercel에 GitHub으로 로그인합니다.
2. 팀 `aiwork3`를 선택합니다.
3. 왼쪽 **Storage** 또는 프로젝트의 **Integrations**를 엽니다.
4. `upstash-kv-orange-window`를 누릅니다.
5. **Usage** 또는 **Metrics**에서 Data Size, Commands, Bandwidth를 확인합니다.
6. 더 자세한 정보가 필요하면 **Open in Upstash** 또는 provider dashboard 버튼을 누릅니다.

500,000회를 30일로 나누면 하루 평균 약 16,666회입니다. 개인이 배치표를 편집하는 정도라면 보통은 여유가 크지만, 자동화 프로그램이 계속 저장 API를 호출하거나 많은 사용자가 동시 사용하면 빨리 증가할 수 있습니다.

### Vercel 전체 사용량 확인

1. Vercel Dashboard에서 팀 `aiwork3`를 선택합니다.
2. 왼쪽 **Usage**를 누릅니다.
3. 기간을 **Last 30 days**로 선택합니다.
4. Project 필터에서 `arrange-engineer`를 선택합니다.
5. Fast Data Transfer, Function Invocations, Active CPU, Provisioned Memory, Build Minutes를 확인합니다.

바로 가기: <https://vercel.com/aiwork3/~/usage>

## 7. 저장용량을 적게 사용하는 방법

- 필요 없는 배치표 스냅샷을 정리합니다.
- 사진·첨부파일은 Redis에 base64로 넣지 않습니다. 현재 사이트는 첨부파일 클라우드 업로드를 구현하지 않았습니다.
- 파일 첨부 기능을 추가할 때는 Redis가 아니라 Vercel Blob·Azure Blob Storage 같은 파일 저장소를 사용합니다.
- Vercel Usage와 Upstash Usage를 월 1회 확인합니다.

## 8. 보안상 반드시 알아둘 점

1. `MASTER_RESET_KEY`, `MASTER_PASSWORD`, `KV_REST_API_TOKEN`, `CLOUD_SESSION_SECRET`는 타인에게 공유하지 않습니다.
2. GitHub에 `.env`, `.env.local` 파일을 커밋하지 않습니다.
3. 마스터 복구 키를 사용하거나 다른 사람에게 노출했다면 Vercel Environment Variables에서 새 값으로 바꾸고 Production을 Redeploy합니다.
4. 현장 기사 연락처는 개인정보이므로 계정을 공유하지 않고 긴 비밀번호를 사용합니다.
5. 사이트는 비로그인 상태에서 기본 대시보드를 보여주지만, 클라우드에 저장된 개인 계정 데이터는 로그인해야 불러옵니다.
6. 사용자 수가 늘거나 회사 업무용으로 전환할 때는 관리자 세션 강제 만료, 접속 제한, 감사 로그, 백업 정책을 추가로 구현하는 것이 좋습니다.

## 9. 문제가 생겼을 때 확인 순서

1. <https://arrange-engineer.vercel.app> 이 열리는지 확인합니다.
2. Vercel → `arrange-engineer` → **Deployments**에서 최신 배포가 `Ready`인지 확인합니다.
3. 로그인·저장 문제면 **Logs**에서 `/api/cloud` 오류를 확인합니다.
4. **Settings → Environment Variables**에서 필수 변수 이름이 있는지만 확인합니다. 민감한 값을 화면 캡처로 공유하지 않습니다.
5. Storage의 `upstash-kv-orange-window` 상태가 `Available`인지 확인합니다.
6. 환경변수를 바꾼다면 최신 Production을 Redeploy합니다.

## 10. 공식 문서

- [Vercel Hobby 플랜](https://vercel.com/docs/plans/hobby)
- [Vercel Usage 확인 방법](https://vercel.com/docs/pricing/manage-and-optimize-usage)
- [Git 저장소 자동 배포](https://vercel.com/docs/git)
- [Vercel 프로젝트 설정](https://vercel.com/docs/project-configuration/project-settings)
- [Vercel Marketplace 저장소](https://vercel.com/docs/marketplace-storage)
- [Upstash Redis 요금·한도](https://upstash.com/pricing/redis)

