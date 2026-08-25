# Vercel 무료 클라우드 저장 설정

이 프로젝트는 로컬 개발에서는 기존 브라우저 저장소를 사용하고, Vercel에서는 `/api/cloud` 함수와 Upstash Redis를 사용합니다. 한 계정의 보드, 일정 캘린더, 저장 배치표, 화면 설정을 한 묶음으로 저장하므로 다른 PC나 새 브라우저에서도 같은 계정으로 로그인하면 동일한 데이터가 열립니다.

## 처음 한 번 설정

1. Vercel에서 프로젝트를 연 뒤 **Storage / Marketplace**에서 **Upstash Redis** 데이터베이스를 만들고 프로젝트에 연결합니다.
2. 연결 후 `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`이 프로젝트 환경변수에 등록됐는지 확인합니다.
3. **Settings > Environment Variables**에 다음 값을 Production, Preview에 추가합니다.
   - `CLOUD_SESSION_SECRET`: 32자 이상의 충분히 긴 임의 문자열
   - `MASTER_LOGIN_ID`: 최초 마스터 로그인 아이디
   - `MASTER_PASSWORD`: 최초 마스터 비밀번호(8자 이상 권장)
   - `MASTER_RESET_KEY`: 로그인 정보 분실 때만 쓰는 별도의 긴 복구 키
4. 환경변수 추가 뒤 프로젝트를 다시 배포합니다.

환경변수가 하나라도 빠지면 배포 사이트는 안전하게 클라우드 로그인을 중단합니다. 로컬 Vite 서버는 `/api/cloud`가 없으므로 기존 로컬 계정과 브라우저 저장 방식으로 계속 사용할 수 있습니다.

## 최초 데이터와 동기화 방식

- Redis에 계정 목록이 하나도 없을 때만 `MASTER_LOGIN_ID`, `MASTER_PASSWORD`로 마스터 계정이 생성됩니다.
- 최초 로그인 계정에 서버 데이터가 없으면 해당 브라우저의 같은 계정 로컬 보드를 한 번 가져옵니다. 로컬 저장도 없으면 새 기본 보드(좌우 2구역, 모형 없음)로 시작하고 이후 변경사항이 약 2초 안에 자동 저장됩니다.
- 같은 계정으로 여러 브라우저에서 동시에 수정하면 가장 나중에 저장된 상태가 최종 상태가 됩니다.
- 마스터가 계정을 추가하면 그 계정도 어느 브라우저에서나 로그인할 수 있습니다.

## 마스터 아이디·비밀번호 분실 복구

`MASTER_LOGIN_ID`나 `MASTER_PASSWORD` 환경변수만 바꾸는 것으로는 이미 생성된 계정이 자동 변경되지 않습니다. 저장된 마스터 계정을 복구하려면 소유자가 `MASTER_RESET_KEY`로 다음 요청을 한 번 실행합니다.

```powershell
$headers = @{ 'x-master-reset-key' = 'Vercel에 설정한 MASTER_RESET_KEY' }
$body = @{
  action = 'resetMaster'
  newLoginId = '새마스터아이디'
  newPassword = '새로운강력한비밀번호'
} | ConvertTo-Json

Invoke-RestMethod `
  -Uri 'https://내-사이트.vercel.app/api/cloud' `
  -Method Post `
  -Headers $headers `
  -ContentType 'application/json' `
  -Body $body
```

성공하면 `ok: true`가 반환됩니다. 바로 새 정보로 로그인한 뒤 Vercel의 `MASTER_RESET_KEY`도 새 값으로 교체하고 다시 배포하는 것을 권장합니다. 이 복구는 계정의 보드·캘린더·저장 배치표를 삭제하지 않습니다.

## 비용과 한도

현재 구현은 첨부파일 저장용 Blob이 아니라 작은 JSON을 자주 읽고 쓰는 Redis를 사용합니다. Upstash 무료 플랜 한도 안에서는 별도 비용 없이 동작하지만, 사용량이 무료 한도를 넘으면 서비스 정책에 따라 요청 제한이나 업그레이드가 필요할 수 있습니다. 실제 기사 연락처를 저장한다면 Vercel·Upstash 계정의 2단계 인증, 강한 비밀번호, 복구 키 비공개 보관을 함께 적용하세요.
