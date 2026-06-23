# Operations

## 로컬 실행

```bash
cp .env.example .env
export DB_PASSWORD='your-database-password'
export JWT_SECRET='replace-with-at-least-32-random-characters'
./gradlew bootRun
```

프런트엔드는 별도 터미널에서 실행합니다.

```bash
cd frontend
npm ci
npm run dev
```

## 기본 포트

| 서비스 | 주소 |
| --- | --- |
| Backend | `http://localhost:18080` |
| Frontend | Vite dev server |
| Database | `jdbc:postgresql://localhost:5432/payroll_db` |

## 배포 전 체크리스트

- [ ] `JWT_SECRET`을 32자 이상 난수로 교체
- [ ] `admin/admin123` 같은 개발 기본 계정 제거 또는 교체
- [ ] PostgreSQL 계정 권한 최소화
- [ ] SMTP 계정 분리
- [ ] `./gradlew test` 통과
- [ ] `npm run build` 통과
- [ ] 운영 CORS 정책 확인

## 관측 포인트

| 항목 | 보는 이유 |
| --- | --- |
| payroll calculation error | 특정 직원 또는 급여 실행에서 계산 실패 확인 |
| auth failure | 로그인 실패와 토큰 만료 구분 |
| DB query time | 급여대장·리포트 조회 병목 확인 |
| mail delivery status | 명세서 발송 성공 여부 확인 |
| run status | 급여 실행이 어느 단계에서 멈췄는지 확인 |

## 장애 대응 메모

| 증상 | 먼저 확인할 것 |
| --- | --- |
| 서버 시작 실패 | DB 접속 정보, `JWT_SECRET`, PostgreSQL 실행 여부 |
| 로그인 실패 | 초기 관리자 계정, 비밀번호 해시, 토큰 secret |
| 급여 계산 실패 | 보험 요율, 호봉 기준, 개인 급여 기준 |
| 명세서 발송 실패 | SMTP 계정, 앱 비밀번호, 방화벽 |
| 프런트 API 오류 | Vite proxy, 백엔드 포트, CORS |
