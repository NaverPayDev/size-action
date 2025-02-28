# NaverPay Size Action

> [See English README](./README.md)

`NaverPay Size Action`은 GitHub Action으로, Pull Request의 브랜치 간 빌드 사이즈와 패키지 사이즈 변화를 분석하고 비교합니다. 이 도구는 코드 변경이 빌드 크기에 미치는 영향을 모니터링하고, 상세한 마크다운 보고서를 Pull Request에 댓글로 제공합니다.

---

## 주요 기능

- **언어 지원**: 영어(`en`)와 한국어(`ko`) 지원.
- **Pull Request 분석**: Pull Request로 트리거된 경우에만 실행.
- **빌드 사이즈 비교**: Next.js 애플리케이션 빌드 크기 비교.
- **패키지 사이즈 분석**: 의존성 패키지 크기 비교 및 마크다운 출력.
- **압축 옵션**: 파일 크기 비교를 위한 `gzip`(기본값), `brotli`, 또는 `none` 지원.
- **설정 옵션 제공**: 변경되지 않은 내용에 대한 축소, 생략, 임계값 설정 가능.
- **파일 무시 기능**: 특정 파일 또는 패턴을 분석에서 제외 가능.

---

### 입력값

| 입력 이름               | 설명                                                                      | 기본값         |
|-------------------------|--------------------------------------------------------------------------|----------------|
| `github_token`          | 인증을 위한 GitHub 토큰 (사용자 PAT 필요 시 사용).                        | 필수           |
| `build_script`          | 프로젝트 빌드를 위한 npm 스크립트.                                       | `build`        |
| `compression`           | 파일 크기 비교를 위한 압축 방식 (`gzip`, `brotli`, 또는 `none`).          | `gzip`         |
| `show_total`            | 마크다운에서 총 크기와 차이를 표시.                                      | `true`         |
| `collapse_unchanged`    | 마크다운 출력에서 변경되지 않은 파일을 축소.                              | `true`         |
| `omit_unchanged`        | 마크다운 보고서에서 변경되지 않은 파일을 완전히 제외.                    | `false`        |
| `minimum_change_threshold` | 지정된 임계값 미만의 변경은 변경되지 않은 것으로 간주 (바이트 단위).  | 패키지는 `10`, Next.js는 `1000` |
| `ignore_patterns`       | 특정 파일 또는 패턴을 분석에서 제외하기 위한 파일 glob 패턴.              | 없음           |
| `language`              | 댓글 감지 언어 (`en` 또는 `ko`).                                         | `en`           |
| `cwd`                   | 작업 실행을 위한 커스텀 작업 디렉터리, 저장소 루트 기준 경로.             | `.`            |

---

### 설정 방법

1. 이 액션을 GitHub 저장소의 워크플로 파일에 추가합니다. (예: `.github/workflows/size-check.yml`)

2. 예제 워크플로 파일:

   ```yaml
   name: Pull Request 사이즈 분석

   on:
     pull_request:
       branches:
         - main

   jobs:
     size-check:
       runs-on: ubuntu-latest
       steps:
         - name: 사이즈 액션 실행
           uses: naverpay/size-action@main
           with:
             github_token: ${{ secrets.GITHUB_TOKEN }}
             build_script: build
             compression: gzip
             language: 'ko'
             cwd: './'
             show_total: true
             collapse_unchanged: true
             omit_unchanged: false
             minimum_change_threshold: 1000
             ignore_patterns: '**/playground/**'
   ```

---

### 출력값

- 상세 마크다운 보고서:
  - Next.js 애플리케이션 빌드 사이즈 변경.
  - 패키지 의존성 사이즈 차이.

---

### 오류 처리

- 잘못된 구성이나 지원하지 않는 언어를 입력하면 오류 메시지와 함께 작업이 실패합니다.
- Pull Request 컨텍스트가 감지되지 않으면 작업이 종료됩니다.

---

### 라이선스

이 액션은 [MIT License](./LICENSE) 하에 제공됩니다.
