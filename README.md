# PayFit ERP

[![CI](https://github.com/sunwoo8478/ERP/actions/workflows/ci.yml/badge.svg)](https://github.com/sunwoo8478/ERP/actions/workflows/ci.yml)
![Kotlin](https://img.shields.io/badge/Kotlin-2.3-7F52FF?logo=kotlin&logoColor=white)
![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.4-6DB33F?logo=springboot&logoColor=white)
![React](https://img.shields.io/badge/React_19-20232A?logo=react&logoColor=61DAFB)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)

급여 업무의 전체 흐름을 하나의 도메인 모델로 구현한 HR·Payroll ERP입니다. 회사와 직원 기준정보부터 근태, 급여 계산, 4대보험·세금 공제, 승인, 명세서 발급, 이체 자료, 리포트, 임직원 포털까지 연결합니다.

![PayFit ERP payroll workflow](s_final.png)

## 핵심 기능

- 회사·조직·직급·호봉·직원 기준정보 관리
- 입사일 기준 월할 계산과 비과세 한도 처리
- 국민연금·건강보험·장기요양·고용보험 및 원천세 계산
- 연장·야간·휴일근로수당과 무급휴가 공제 반영
- 급여 실행의 초안 → 계산 → 승인 → 지급 상태 전이
- 급여명세서, 급여대장, 이체 파일, 이메일 발송
- 퇴직금·노무비·원천징수·연말정산 리포트
- JWT 기반 관리자 인증과 임직원 셀프서비스 포털

## 업무 흐름

```mermaid
flowchart LR
    MASTER[회사·직원 기준정보] --> ATT[근태·휴가]
    MASTER --> STANDARD[직급·호봉·급여 기준]
    ATT --> CALC[급여 계산]
    STANDARD --> CALC
    CALC --> DEDUCT[4대보험·세금 공제]
    DEDUCT --> APPROVE[검토·승인]
    APPROVE --> SLIP[급여명세서·급여대장]
    SLIP --> PORTAL[임직원 포털]
    APPROVE --> REPORT[리포트·이체 파일]
```

## 기술 스택

| 구분 | 기술 |
| --- | --- |
| 백엔드 | Kotlin, Spring Boot, Spring Data JPA, Spring Security |
| 데이터 | PostgreSQL, 관계형 도메인 모델 |
| 인증 | JWT, BCrypt |
| 프런트엔드 | React 19, TypeScript, Vite, Axios |
| 빌드·검증 | Gradle, npm, GitHub Actions |

## 실행 방법

### 사전 요구사항

- JDK 21
- Node.js 22+
- PostgreSQL 15+

PostgreSQL 데이터베이스를 준비하고 필요한 환경 변수를 설정합니다.

```bash
export DB_PASSWORD='your-database-password'
export JWT_SECRET='replace-with-at-least-32-random-characters'
export MAIL_USERNAME='optional-smtp-account'
export MAIL_PASSWORD='optional-smtp-password'
```

### 백엔드

```bash
./gradlew bootRun
```

API 서버는 `http://localhost:18080`에서 실행됩니다.

### 프런트엔드

```bash
cd frontend
npm ci
npm run dev
```

Vite 개발 서버는 `/api` 요청을 백엔드로 전달합니다.

## 주요 모듈

```text
src/main/kotlin/com/payroll/
├── auth/            # JWT 인증·인가
├── company/         # 회사 기준정보
├── employee/        # 직원·재직 이력
├── attendance/      # 휴가·연장근무 흐름
├── payrollrun/      # 급여 실행·계산
├── payrollslip/     # 명세서·급여대장·발송
├── severance/       # 퇴직금 계산
├── reporting/       # 노무비·원천징수·연말정산 리포트
└── portal/          # 임직원 셀프서비스 API
```

## 검증

```bash
./gradlew test
cd frontend && npm run build
```

## 보안 안내

운영 환경의 인증 정보는 반드시 환경 변수로 주입해야 합니다. 개발 기본값을 운영에 사용하지 말고, 비밀키 교체·DB 접근 제한·환경별 SMTP 계정 분리를 적용해야 합니다.
