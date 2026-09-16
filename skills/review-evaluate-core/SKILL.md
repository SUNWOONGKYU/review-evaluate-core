---
description: "검토·평가 — 리뷰어는 의견만, 작성자가 수정, 교차검증자가 채점. 100점 도달까지 최대 10회 순환 (v0.7 역할 3분리)"
user-invocable: true
---

# /review-evaluate

콘텐츠를 **검토(Review)**하여 문제점을 파악하고, 그 결함 목록을 **작성자가 수정(Fix)**한 뒤, **평가(Evaluate)**하여 품질 점수를 부여한다.
**100점 도달할 때까지 최대 10회 순환**한다. 파일 타입별 전문 서브에이전트를 투입하여 평가 객관성을 확보한다.

> **v0.7 (2026-09-16) 역할 3분리 — 수정자 ≠ 검토자 ≠ 채점자.** 리뷰어는 의견(결함 목록)만 낸다. 수정은 그 산출물을 만든 **작성자**가 한다. 리뷰어가 반영 여부를 확인하고, Cross Validator가 채점한다. 리뷰어가 직접 고치면 엉뚱한 수정이 잦았던 것(사용자 지적)이 개정 이유다.

> **📚 Quality Control 계열 스킬 중 하나 — 가장 가벼운 평가 도구**
> 함께 쓰면 좋은 스킬(설치돼 있다면): 평가 3종(가벼움→무거움) `/review-evaluate` → `/pro-persona-debate` → `/주작-sal-da` · 디버깅 1종 `/5times-debug-loop`. 없으면 건너뛰고 이 스킬 단독으로 진행한다.

## Usage
```
/review-evaluate [file_path_or_directory]

# 예시
/review-evaluate scripts/core/generate_cci_report.py          # 단일 파일
/review-evaluate ./scripts/core/                                # 디렉토리 전체
/review-evaluate                                                # 직전 작업 파일 자동 탐지
```

---

## Phase 1. 평가 대상 결정 + 파일 분류

### 인자가 있는 경우
- **파일 지정**: 해당 파일을 평가 대상으로 한다.
- **디렉토리 지정**: 디렉토리 내 모든 파일을 재귀 탐색하여 평가 대상으로 한다 (바이너리, 이미지, node_modules 등 제외).

### 인자가 없는 경우
- 직전 `/review-evaluate` 실행 이후에 작업(생성/수정)한 **모든 파일**을 대상으로 한다.
- 대상 파일 목록을 확인하기 위해 git diff, 최근 수정 파일 등을 조회한다.
- 대상이 모호하거나 특정할 수 없는 경우, **AskUserQuestion으로 사용자에게 평가 대상을 확인**한다.

### 파일 타입 분류

대상 파일을 3개 타입으로 분류한다:

| 타입 | 확장자 | 전담 리뷰어 |
|------|--------|-----------|
| **Code** | .py, .ts, .tsx, .js, .jsx, .sql | Code Reviewer |
| **Document** | .md | Document Reviewer |
| **Report** | .html | Report Reviewer |

### 서브에이전트 투입 판단

| 대상 파일 수 | 방식 |
|:---:|:---|
| 1개 | 메인 세션이 검토(리뷰어 역할) + Cross Validator 1명 투입 (최소한의 교차 검증) |
| 2개 | 메인 세션이 검토(리뷰어 역할) + Cross Validator 1명 투입 |
| 3개 이상 | **전문 서브에이전트 풀 투입** (타입별 리뷰어 + Cross Validator) |

어느 경우든 **수정은 작성자**가 한다 (아래 "작성자 결정" 참조). 메인 세션이 리뷰어 역할을 맡은 경우에도 메인 세션은 결함 목록만 내고, 작성자가 고친다.

### 작성자 결정 (v0.7)

| 산출물을 만든 주체 | 작성자 |
|---|---|
| 현재 살아 있는 서브에이전트·팀메이트 세션 | 그 세션 (결함 목록을 보내 수정·회신 받음) |
| 메인 세션이 직접 만든 것 | 메인 세션 |
| 원작업 세션이 종료됨 / 사람이 쓴 문서 / 출처 불명 | **메인 세션이 "작성자 대리"** — 이 경우에도 리뷰어는 손대지 않는다 |

작성자가 누구인지 대상 확인 보고에 명시한다.

### 대상 확인 보고

```
📋 평가 대상 확인
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
대상 파일:
  [Code] script.py, helper.py (2개)
  [Document] guide.md, template.md (2개)
  [Report] report.html (1개)

총 5개 파일 / 서브에이전트 투입: Code Reviewer + Document Reviewer + Report Reviewer + Cross Validator
✍️ 작성자(수정 담당): {세션명 / 메인 세션 / 메인 세션(작성자 대리)}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Phase 1.5. 연관 문서 탐색 + 사양-구현 대조 (Spec-Code Alignment)

**2026-03-26 교훈: review-evaluate가 100점을 줬는데 인스트럭션-스크립트 간 근본 격차를 못 잡았다.**
**원인: 코드 자체 품질만 봤지, "이 코드가 관련 문서에 정의된 대로 동작하는가"를 검증하지 않았다.**

### 왜 필요한가

코드가 구문 오류 없이 돌아가는 것과, 코드가 사양대로 동작하는 것은 완전히 다른 질문이다.
- "스크립트가 돌아가는가" → 기존 루브릭 (문법·보안·품질)
- **"스크립트가 사양대로 돌아가는가"** → 이 Phase에서 검증

### 연관 문서 탐색 방법

대상 파일에 대해 **자동으로 연관 문서를 탐색**한다. 특정 프로젝트 구조에 의존하지 않는 포괄적 방법:

**1단계: 동일 디렉토리 + 상위 디렉토리 탐색**
```
대상: scripts/collect/collect_opi_esi.py
탐색 범위:
  - scripts/collect/*.md         ← 동일 폴더의 문서
  - scripts/*.md                 ← 상위 폴더의 문서
  - *.md (프로젝트 루트)          ← CLAUDE.md, README.md
  - instructions/*.md            ← instructions 폴더
```

**2단계: 파일명 기반 매칭**
```
대상 파일명에서 키워드 추출 → 같은 프로젝트 내 관련 문서 검색
예: collect_opi_esi.py → "opi", "esi", "수집" → OPI_ESI_데이터수집_소스.md 발견
예: generate_cci_report.py → "cci", "report" → CCI_기본방침.md 발견
```

**3단계: 코드 내 참조 추출**
```python
# 코드 내 주석/docstring에서 참조 문서 추출
# "참조: OPI_ESI_상대평가_방법론.md"
# "See: instructions/a1_opinion_eval.md"
# import 경로에서 관련 모듈 추적
```

**4단계: CLAUDE.md / README.md 규칙**
```
프로젝트 루트 또는 상위 디렉토리의 CLAUDE.md에서
해당 파일/기능에 관한 규칙을 추출
```

### 사양-구현 대조 검사

연관 문서를 찾았으면, 다음을 대조한다:

| 대조 항목 | 방법 | 예시 |
|----------|------|------|
| **기능 목록** | 문서에 명시된 기능/단계를 추출 → 코드에 구현 여부 확인 | "7개 Naver API 타입" → 코드에 3개만 → GAP |
| **데이터 소스** | 문서에 명시된 소스 목록 → 코드에서 해당 API/URL 호출 여부 | "16개 OFFICIAL 소스" → 4개만 → GAP |
| **필드/파라미터** | 문서에 명시된 필드 목록 → 코드에서 실제 사용 여부 | "12필드 활용" → 5개만 → GAP |
| **규칙/제약** | 문서에 명시된 금지/필수 규칙 → 코드에서 준수 여부 | "URL 검증 필수" → 미구현 → GAP |
| **수치/상수** | 문서에 명시된 수치 → 코드의 상수와 일치 여부 | "temperature 0.2" → 코드 0.7 → GAP |

### 대조 결과 보고 형식

```
🔗 연관 문서 대조 (Spec-Code Alignment)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📄 대상 코드: collect_opi_esi.py
📋 연관 문서 {N}개 발견:
  1. OPI_ESI_데이터수집_소스.md (동일 디렉토리)
  2. CCI_기본방침.md (instructions/)
  3. CLAUDE.md (프로젝트 루트)

📊 사양 충족률: XX% (구현 N개 / 사양 M개)

[GAP] 사양에 있으나 미구현:
  • "Naver API kin/doc/encyc 타입" (소스.md L42) → 코드에 없음
  • "URL HEAD 검증" (소스.md L89) → 코드에 없음

[EXTRA] 코드에 있으나 사양에 없음:
  • "_build_negative_qualifiers()" → 사양 범위 초과 (양호)

[MATCH] 사양과 코드 일치:
  • "관련성 필터 3단계" (소스.md L55) → 코드 L742-759 ✅
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 연관 문서가 없는 경우

```
연관 문서를 찾지 못한 경우:
  → WARN: "연관 사양 문서를 찾지 못함. 코드 자체 품질만 평가합니다."
  → Phase 1.5 사양 충족률 채점을 건너뛰고 기존 루브릭만 적용
  → 최종 점수에서 "사양 대조 미실시" 표기
```

---

## 서브에이전트 구조 (3개 이상 파일 시)

```
메인 세션(Claude Code) — 파일 분류 + 배정 + 작성자 결정 + 결함 목록 전달 + 최종 판단
│
├── Code Reviewer (subagent, sonnet, auto, subagent_type: code-reviewer)
│   담당: .py/.ts/.js/.sql 파일
│   역할: 검토 → 결함 목록(파일:줄·심각도·수정 제안) 작성 → 작성자 회신 반영 확인. **수정 금지(read-only)**
│
├── Document Reviewer (subagent, sonnet, auto, subagent_type: general-purpose)
│   담당: .md 파일
│   역할: 검토 → 결함 목록 → 반영 확인. **수정 금지**
│
├── Report Reviewer (subagent, sonnet, auto, subagent_type: general-purpose)
│   담당: .html 보고서 파일
│   역할: 검토 → 결함 목록 → 반영 확인. **수정 금지**
│
├── 작성자 (그 산출물을 만든 세션 — 또는 메인 세션(작성자 대리))
│   역할: 결함 목록을 받아 **수정** + 수정 회신(고친 것 / 거부한 것 + 이유)
│
└── Cross Validator (subagent, sonnet, auto, subagent_type: general-purpose)
    담당: 리뷰어 결함 목록·작성자 회신·수정본을 독립적으로 재검증
    역할: 자기 평가 편향 방지 + 채점 (검토·수정 어느 쪽에도 참여하지 않음)
```

**서브에이전트 스폰 예시:**
```python
Agent(
    description="Code Reviewer — script.py 검토",
    prompt="script.py를 검토하라. 수정하지 말 것(read-only). 루브릭: 문법·실행/보안/코드품질/테스트/완성도/사양 충족률. 결함을 Critical·High·Medium·Low로 분류하고 파일:줄 근거와 수정 제안을 붙여 결함 목록만 반환하라.",
    subagent_type="code-reviewer",
    model="sonnet",
    mode="auto",
)
```

**핵심: 검토하는 사람·고치는 사람·점수 매기는 사람을 분리한다 (v0.7 역할 3분리).**
- Code/Document/Report Reviewer — 결함 목록(의견)만. 수정 금지
- 작성자 — 수정 + 수정 회신 (거부 가능, 이유 필수)
- Cross Validator — 채점 (검토·수정 어느 쪽에도 미참여)
- 리뷰어가 직접 고치면 맥락을 모른 채 엉뚱하게 고치는 일이 잦았고, 그 수정을 걸러줄 사람이 없었다 (사용자 지적 2026-09-16). 작성자가 고치면 맥락이 보존되고, 리뷰어 의견이 틀렸을 때 거부할 수 있다.

---

## Phase 2. 순환 루프 (Review → Fix → Evaluate)

**최소 3회, 최대 10회 반복. 100점 도달 시 종료 조건 진입.**

```
┌─────────────────────────────────────────────────┐
│            순환 루프 (Round N / 최대 10회)          │
│                                                 │
│  Step 1. 검토 (Review)                           │
│    → 파일 타입별 전문 리뷰어가 문제점 식별           │
│                                                 │
│  Step 2. 수정 (Fix) — 작성자                      │
│    → 리뷰어 결함 목록을 작성자에게 전달              │
│    → 작성자가 수정 + 수정 회신(고침/거부+이유)        │
│    → 리뷰어가 회신 대조: 반영 확인 · 부당 거부 이월    │
│                                                 │
│  Step 3. 평가 (Evaluate)                         │
│    → Cross Validator가 독립적으로 채점              │
│                                                 │
│  Step 4. 외부 LLM 추가 자문 (v0.6 — CV=100 달성 후 사각 점검) │
│    → **CV 점수 = 100 도달 시에만** codex + Gemini 호출(CLI/API/웹 구독 폴백) │
│    → 각 외부 LLM은 루프에서 **각 1회만**, 가능한 쪽 (점수 게이트 아님·자문) │
│    → 인코딩 3종(OutputEncoding/InputEncoding/$OutputEncoding) UTF-8 강제 │
│    → 결함 합집합 + 외부 오판은 py_compile로 반증 │
│                                                 │
│  판단:                                           │
│    - Round < 3         → 다음 라운드 계속           │
│    - CV < 100          → 다음 라운드 계속 (외부 LLM 미호출) │
│    - CV = 100 (최초 도달) → codex·Gemini 추가 자문 호출 │
│        · 외부 Critical/High 0 → 100 확정·Phase 3 (이상적) │
│        · 외부가 (반증 안 된) Critical/High 발견 → 그 결함만 반영 후 CV 재확인 │
│        · 외부 점수<95·Medium·Low·도메인 전문판단(진보성·법률 등) → 참고 의견, CV=100 유지 │
│        · 한쪽/양쪽 실패·불가 → 가능한 쪽 실행 + "미실시" 표기 (CV=100은 유효) │
│    - Round = 10        → 강제 종료 (현재 점수 보고)   │
│    - 연속 수정 0건 2회   → 자동 종료 (개선 불가 판단)  │
└─────────────────────────────────────────────────┘
```

### Step 1: 검토 (Review)

파일 타입별 전문 리뷰어가 문제점을 식별하고 심각도를 분류한다.

```
🔍 검토 결과 (Round {N})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 검토 대상: {filename} [{타입}]
🔎 리뷰어: {Code/Document/Report} Reviewer

🚨 발견된 문제점:

[Critical] — 즉시 수정 필요
• 문제 설명 (파일명:줄번호)
  → 수정 제안

[High] — 우선 수정 권장
• 문제 설명 (파일명:줄번호)
  → 수정 제안

[Medium] — 개선 권장
• 문제 설명 (파일명:줄번호)
  → 수정 제안

[Low] — 선택적 개선
• 문제 설명 (파일명:줄번호)
  → 수정 제안

➡️ 이 목록을 작성자({작성자})에게 전달 — 리뷰어는 수정하지 않음
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

리뷰어는 **읽기 전용**이다. 결함 목록에는 반드시 파일:줄 근거와 수정 제안을 붙인다 — 작성자가 그대로 고칠 수 있을 만큼 구체적으로.

### Step 2: 수정 (Fix) — 작성자가 한다 (v0.7)

메인 세션이 리뷰어 결함 목록을 **작성자**에게 전달한다. 작성자가 수정하고 **수정 회신**을 낸다. 리뷰어는 손대지 않는다.

**작성자 수정 규칙**
- Critical / High: 반드시 수정 (거부하려면 근거를 대야 하고, 리뷰어가 근거를 인정해야 기각됨)
- Medium: 가능하면 수정
- Low: 판단하여 선택적 수정
- 리뷰어 의견이 틀렸다고 판단하면 **거부 + 이유**를 회신에 적는다 (맥락상 의도된 것, 사양과 다름, 오독 등)
- 제안만 하고 넘어가지 않는다 — 고쳤으면 고쳤다고, 안 고쳤으면 왜 안 고쳤다고 쓴다

**수정 회신 형식**
```
✍️ 작성자 수정 회신 (Round {N}) — {작성자}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[반영] {n}건
• {결함 요약} (파일명:줄번호) → 어떻게 고쳤나 (한 줄)
[거부] {n}건
• {결함 요약} → 거부 이유 (한 줄)
[보류] {n}건 — 다음 라운드로 (이유)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**리뷰어 반영 확인** (회신 받은 뒤, 채점 전)
- [반영] 항목: 실제로 고쳐졌는지 파일에서 확인. 덜 고쳐졌으면 다음 라운드 결함으로 이월
- [거부] 항목: 이유가 타당하면 기각(결함 목록에서 제거, "기각: {이유}" 기록). 부당하면 다음 라운드에 **같은 결함을 다시 올린다**(반복 실패 → 5times 위임 대상)
- 이 확인 결과를 Cross Validator에게 넘긴다

**작성자가 없을 때**: 원작업 세션이 끝났거나 사람이 쓴 문서면 메인 세션이 **작성자 대리**로 수정·회신한다. 이때도 리뷰어는 수정하지 않는다.

#### 명시적 증상 → /5times-debug-loop 위임 (권장)

다음과 같은 **재현 가능한 명시적 증상**이 등장하면 **작성자가** 직접 수정으로 라운드를 소모하지 말고 `/5times-debug-loop` 스킬에 위임하여 빠르게 해결한 뒤 결과만 가지고 평가로 복귀한다. (위임 주체 = 작성자. 리뷰어가 위임하지 않는다.)

**위임 대상 증상:**
- TypeScript/빌드 실패 (`npm run build` 에러)
- 테스트 실패 (`npm test` 빨간 로그)
- API 500 / 4xx 응답
- 렌더링 깨짐 (스크린샷으로 확인 가능한 시각 결함)
- 동일 항목이 **이전 라운드에서도 미해결**로 잡혔던 경우 (반복 실패)

**위임 호출 예시:**
```
/5times-debug-loop
문제: route.ts TypeScript 빌드 오류 — Property 'X' does not exist on type 'Y'
파일: src/app/api/foo/route.ts
검증방법: npm run build 무오류 통과
```

**위임 후 처리:**
- 5times-debug 결과(해결 여부 + 수정 내용)를 작성자 수정 회신에 기록
- 미해결 시 잔여 이슈로 등록 후 평가로 복귀 (Cross Validator가 그 항목 감점)

> review-evaluate가 "점수 매기는 도구", 5times-debug가 "박살내는 도구". 명확한 버그는 5times-debug가 더 빠르고, 점수·일관성 평가는 review-evaluate가 더 정확하다.

### Step 3: 평가 (Evaluate) — Cross Validator

**검토에도 수정에도 참여하지 않은 Cross Validator가 독립적으로 채점한다.**

입력은 세 가지 — 리뷰어 결함 목록, 작성자 수정 회신(+리뷰어 반영 확인), 수정된 파일. 파일 타입별 루브릭(채점표)에 따라 점수를 산정한다. 거부된 결함 중 CV가 보기에 실제 결함이면 "리뷰어가 놓친 문제점"이 아니라 "부당 거부"로 적고 감점한다.

### Step 4: 외부 LLM **추가 자문** — External Advisors (codex + Gemini, 웹 구독 폴백 포함) — v0.6 (CV=100 달성 *후* 사각 점검·개선 입력. 점수 게이트 아님)

> ⛔ **진입 게이트 — CV<100이면 이 Step을 실행하지 마라.** 이 Step은 CV가 *이미 100*일 때만 들어온다. 78·88·95·97·99 어느 점수든 100 미만이면 여기로 오지 말고 결함을 직접 고쳐 다음 라운드로. (상세: ABSOLUTE RULE의 ⛔ 박스)

**Cross Validator가 자체적으로 100점을 부여한 시점에 codex와 Gemini를 *각각 1회* 추가 자문으로 호출한다(가능한 쪽 — CLI/API/웹 구독 폴백).** (95~99점에서는 호출하지 않고 다음 라운드로 계속 개선한다. 각 외부 LLM은 루프에서 1회로 제한 — 반복 호출 금지.) ⚠️ **이 자문은 사각 점검·개선 입력이지, 100점을 무르는 점수 게이트가 아니다(v0.6).** 외부가 잡은 Critical/High만 반영하고, 점수·Medium·Low·도메인 전문 판단(진보성·법률 등) 의견은 참고로 표기한다. — 상세: ABSOLUTE RULE의 "100점 인정 게이트".

같은 LLM 가족(Claude) 안에서는 자기 검증 편향이 발생한다. **서로 다른 두 LLM 가족(OpenAI codex/GPT + Google Gemini)** 으로 이중 교차 검증해 *진짜* 100점인지 확인한다. 한 외부 LLM만으로는 그 LLM 고유의 약점(예: 인코딩 오독·특정 패턴 맹점)이 통과를 왜곡할 수 있으므로 둘을 합집합으로 본다.

> 🚨 **인코딩 근본원인 (2026-06-12 실패 회고 — 반드시 지킴)**: codex/gemini에 **한글 프롬프트를 파이프(`|`)로 넘길 때 `[Console]::OutputEncoding`만 UTF-8로 바꾸면 부족하다. PowerShell이 네이티브 exe 파이프에 쓰는 인코딩은 `$OutputEncoding` 변수가 지배한다.** 이 줄을 빠뜨리면 한글이 cp949로 깨져(mojibake) 외부 LLM이 "파일이 깨졌다/구문오류"로 **거짓 0점**을 준다(한 자동화 파이프라인 검증 때 실제 발생 — py_compile 통과 코드를 codex가 "broken"으로 오판). **호출 전 `[Console]::OutputEncoding`·`[Console]::InputEncoding`·`$OutputEncoding` 셋 다 UTF-8 + `$PSStyle`/stdin 파일도 UTF-8(BOM 없음)** 으로 강제하라.

#### Why — 사건 회고

**2026-05-28 한 프로젝트 v0.3.0 검증 사건**: Cross Validator(Claude 서브에이전트)가 100점 부여한 산출물을 codex(GPT)가 검증한 결과 **88점 + High 2건 + Medium 3건 + Low 2건** 추가 발견. Cross Validator는 *같은 LLM 가족*이라 자기 자식 검증 편향 발생. 외부 LLM 교차 검증을 신설해 *진짜* 100점만 100점으로 인정한다.

**2026-06-12 한 자동화 파이프라인 검증 사건 (v0.5 신설 동기)**: ① codex 호출에서 `$OutputEncoding` 누락 → 한글 mojibake → codex가 정상 코드를 "구문 깨짐 0점"으로 거짓 판정. ② 외부 검증을 codex 하나에만 의존 → 그 한 번이 인코딩으로 무력화되자 교차 검증 자체가 공백. → **(a) 인코딩 3종 강제, (b) codex+Gemini 이중화**로 단일 LLM 실패가 검증 공백으로 직결되지 않게 한다.

#### 호출 조건 (codex·Gemini 공통)

| Round | Cross Validator 점수 | codex / Gemini 호출 여부 |
|---|---|:---:|
| 어느 Round | < 100점 | ❌ (CV가 100 만들 때까지 라운드 계속) |
| CV=100 최초 도달 | = 100점 | **✅ codex·Gemini 각 1회 호출 (둘 다)** |
| 같은 외부 LLM 이미 1회 호출됨 | 어느 점수든 | ❌ (각 LLM 루프 1회 제한 — 재호출 금지) |

#### 사전 점검 (codex + Gemini 환경)

```powershell
# 1. codex 설치 확인
$codex  = Get-Command codex -ErrorAction SilentlyContinue    # 없으면: npm install -g @openai/codex
# codex 플러그인 확인(있으면 모델 자동선택 wrapper 사용, 없으면 구식 codex exec 직접호출로 폴백)
$codexMjs = (Get-ChildItem "$HOME\.claude\plugins\cache\openai-codex\codex" -ErrorAction SilentlyContinue | Sort-Object Name -Descending | Select-Object -First 1 | ForEach-Object { Join-Path $_.FullName "scripts\codex-companion.mjs" })
# 없으면 설치(선택사항, 없어도 동작함): claude plugin marketplace add openai/codex-plugin-cc && claude plugin install codex@openai-codex
# Gemini: 옛 gemini CLI(무료 OAuth 티어)는 2026-06 종료(IneligibleTierError) → Antigravity로 이전됨.
#   Antigravity CLI(agy)는 대화형 전용 — print(-p)가 TTY를 요구해 헤드리스 출력 캡처 불가(2026-06 검증 완료).
#   ∴ Gemini 자동검증은 gemini.cjs(AI Studio API 키, REST)로 호출한다(스킬 폴더에 동봉, node 필요).
$geminiWrap = "$HOME\.claude\skills\review-evaluate-core\gemini.cjs"
# 사용 전 1회: $env:GEMINI_API_KEY (또는 GEMINI_API_KEYS 콤마구분·GEMINI_API_KEY_FILE 경로)를 설정 — 상세는 gemini.cjs 헤더 주석 참조
$node = Get-Command node -ErrorAction SilentlyContinue       # node 설치 확인

# 2. codex 로그인 상태 — 구독/무료 경로. codex API 키(과금) 모드는 사용자 승인 없이 쓰지 않는다.
codex login status     # "Logged in using ChatGPT" (← 구독제·무료)  / "API key"면 codex logout 후 재로그인
```

> **codex = 구독제(ChatGPT 로그인) 무료. Gemini = gemini.cjs(AI Studio API 키, 무료 티어) REST 호출.**
>   - Gemini 무료 티어: **결제(billing) 비활성 키는 한도 초과해도 차단될 뿐 청구 0원**(Gemini 본인 확인, 2026-06). gemini.cjs는 환경변수(`GEMINI_API_KEY`/`GEMINI_API_KEYS`/`GEMINI_API_KEY_FILE`)에서 키를 읽어 로테이션 + flash 폴백을 내장하므로 사실상 무료로 동작.
>   - 옛 `gemini` CLI·Antigravity `agy`는 헤드리스 자동검증에 **못 쓴다**(전자는 티어 종료, 후자는 TTY 요구로 출력 캡처 불가 — 둘 다 검증함). agy는 사용자 수동용으로만.
> **2026-07-05부터 codex는 1순위로 플러그인 wrapper(`codex-companion.mjs task --json`)를 쓴다 — 모델을 자동 선택**하므로 더 이상 `-m` 수동 지정·모델 노후화 대응이 필요 없다(실측: PowerShell 3종 인코딩 강제 하에 한글 프롬프트 정상 응답 확인). **미설치·런타임 실패(예외·JSON 파싱 실패·status≠0·빈 응답) 둘 다** 자동으로 구식 `codex exec -m ...` 직접호출로 폴백하며(2026-07-05 가짜 경로로 실패 재현해 폴백 성공 실측), 그 경로로 폴백됐을 때만 아래 모델 노후화 주의가 적용된다.
> ⚠️ **(구식 직접호출로 폴백됐을 때만) 모델명 노후화 주의**: codex 모델은 수시 교체 → 거부 시 `npm i -g @openai/codex@latest` + 유효 모델 `-m`(2026-06 기준 `gpt-5.5`·`gpt-5.4`). 가장 간단한 해법은 플러그인 설치·최신화. Gemini는 gemini.cjs가 `gemini-2.5-pro`→429면 키 로테이션→`gemini-2.5-flash` 폴백을 자동 처리.

#### 호출 절차 (PowerShell + stdin pipe) — **codex + Gemini 둘 다 실행**

```powershell
# 🚨 인코딩 3종 강제 (이 줄들 없으면 한글 mojibake → 외부 LLM 거짓 0점. 2026-06-12 실패 회고)
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
[Console]::InputEncoding  = [System.Text.UTF8Encoding]::new($false)
$OutputEncoding           = [System.Text.UTF8Encoding]::new($false)   # ★ 파이프→네이티브 exe 인코딩 지배 변수
$utf8 = New-Object System.Text.UTF8Encoding($false)                   # BOM 없는 UTF-8

# 1. 공통 prompt 작성 — 검증 대상 N개 파일 내용 + 4축 검증 기준 + 출력 형식
$prompt = @"
당신은 외부 검증자입니다. 한국어로 답하세요.

[검증 대상 N개 파일 내용]
(각 파일을 코드블록으로 첨부 — 또는 절대경로를 주고 직접 읽도록)

[검증 4축]
① 사양/요구사항 반영도 (각 항목 정상/주의/누락)
② cross-file 정합성·자기모순·dead-link
③ 100점 기준 6 루브릭 점수 (사실·용어·구조·규칙·실용·사양 충족률) — 'Code XX/100, Document XX/100, 통합 XX/100, Critical N·High N' 형식 명시
④ 다음 Round 권고

[출력] 1500단어 이내. Cross Validator 점수와 비교 가능하게.
"@
[System.IO.File]::WriteAllText("$env:TEMP\rv_prompt.txt", $prompt, $utf8)
$promptText = [System.IO.File]::ReadAllText("$env:TEMP\rv_prompt.txt", $utf8)

# 2-A. codex 호출 — 플러그인 wrapper 우선(모델 자동선택 + read-only 기본값 + --json 구조화 출력)
#      미설치·런타임 실패(예외·JSON 파싱 실패·status≠0·빈 rawOutput) 둘 다 → 구식 codex exec로 자동 폴백 (2026-07-05 실측 검증됨)
$codexMjs = (Get-ChildItem "$HOME\.claude\plugins\cache\openai-codex\codex" -ErrorAction SilentlyContinue | Sort-Object Name -Descending | Select-Object -First 1 | ForEach-Object { Join-Path $_.FullName "scripts\codex-companion.mjs" })
$codexResult = $null
if ($codexMjs) {
  try {
    $codexJson = $promptText | node $codexMjs task --json 2>&1 | Out-String
    $parsed = $codexJson | ConvertFrom-Json -ErrorAction Stop
    if ($parsed.status -eq 0 -and $parsed.rawOutput -and $parsed.rawOutput.Trim().Length -gt 0) {
      $codexResult = $parsed.rawOutput
    }
  } catch {
    $codexResult = $null   # 예외·JSON 파싱 실패 = 플러그인 런타임 실패로 간주
  }
}
if (-not $codexResult) {
  if ($codexMjs) { Write-Warning "codex 플러그인 wrapper 런타임 실패 → 구식 codex exec로 폴백" }
  $promptText | codex exec -m "gpt-5.5" --skip-git-repo-check -s read-only --output-last-message "$env:TEMP\codex_out.txt"
  $codexResult = [System.IO.File]::ReadAllText("$env:TEMP\codex_out.txt", $utf8)
} else {
  [System.IO.File]::WriteAllText("$env:TEMP\codex_out.txt", $codexResult, $utf8)
}

# 2-B. Gemini 호출 — gemini.cjs(AI Studio API 키, REST). 프롬프트를 stdin으로, 결과는 stdout → 파일 캡처.
#       (옛 gemini CLI 대체. pro→429면 키 로테이션→flash 폴백을 래퍼가 자동 처리)
$geminiResult = ($promptText | node "$HOME\.claude\skills\review-evaluate-core\gemini.cjs" 2>$null | Out-String)
[System.IO.File]::WriteAllText("$env:TEMP\gemini_out.txt", $geminiResult, $utf8)

# 3. 두 결과를 Read 하여 비교 (아래 점수 비교 규칙 적용)
```

> **검증 후 자가 점검 (필수)**: 두 결과에 한글이 `?`·mojibake로 깨졌거나, 외부 LLM이 "파일이 비었다/깨졌다"고 하면 **인코딩 실패다 — 점수를 신뢰하지 말고** 인코딩 3종을 재확인해 재호출(이 경우는 churn이 아니라 무효 호출 복구이므로 1회 제한에 포함하지 않는다). py_compile·실행으로 코드 무결성을 먼저 증명해 거짓 "구문오류" 판정을 가려낸다.

#### 점수 비교 규칙 (codex·Gemini 둘 다 반영)

> **전제(v0.6)**: 100점은 이미 CV(Claude)에서 달성됨. 아래는 "추가 자문" 처리 규칙이다 — 외부 점수가 100을 무르는 게 아니라, 외부가 잡은 차단성 결함(Critical/High)만 반영한다.

| 시나리오 | 처리 |
|---|---|
| codex 또는 Gemini가 (반증 안 된) **Critical/High 발견** | 그 결함 반영(수정) → CV 재확인. 차단성 결함만 라운드 유발 |
| codex·Gemini 모두 **Critical/High 0건** | CV=100이 외부로도 뒷받침됨 → Phase 3 (이상적 상태) |
| 외부 점수가 < 95 (예: 86)이나 **Critical/High는 0** | Medium·Low·점수는 **참고 의견** — CV=100 유지, Phase 3. 점수 추격 금지 |
| 도메인 전문 판단 영역 의견(진보성·법률·의학 등) | **참고 의견 표기** — CV=100 무르지 않음 (전문가·심사 영역) |
| 한 외부 LLM이 거짓 결함(인코딩/오독) 의심 | py_compile·실행 등으로 **반증**하고, 반증되면 기각 + "외부 LLM 오판(근거)" 명시 |

#### 종합 점수 산정

```
100점 달성    = CV(Claude) = 100               ← "100점"의 기준점 (외부 무관)
추가 자문 결과 = codex·Gemini (각 1회, 가능한 쪽) → 사각 점검·개선 입력
표기 점수      = CV 점수(=100). 외부 점수는 "추가 자문: codex XX / Gemini XX"로 병기(참고)
발견 결함      = CV ∪ codex ∪ Gemini (합집합)
반영(수정) 대상 = 외부가 발견한 (반증되지 않은) Critical/High  ← 차단성 결함만 라운드 유발
참고 의견      = 외부 점수·Medium·Low·도메인 전문 판단 영역(진보성·법률 등) → CV=100 무르지 않음
```

#### 폴백 (외부 LLM 불가 시 — 가능한 쪽은 반드시 실행)

- **인코딩 깨짐**: 거짓 0점의 1순위 원인. 인코딩 3종 재확인 후 재호출(무효 호출 복구 — 1회 제한 미포함). 코드 무결성은 py_compile/실행으로 선반증.
- codex 모델 거부(미설치·런타임 실패로 구식 직접호출에 폴백된 경우에만 발생): `npm i -g @openai/codex@latest` + 유효 모델 `-m`. 가장 간단한 해법은 플러그인 설치·최신화(모델 자동선택). **구독제·무료 유지.**
- Gemini(gemini.cjs): 키 로테이션·flash 폴백 자동. 모든 키가 429(무료 한도 소진)면 잠시 후 재시도. 빈 출력/에러면 키 파일 경로·node 설치·billing 비활성 여부 확인(billing 꺼져 있으면 청구 0원, 한도만 막힘).
- 한 쪽만 가능: 가능한 쪽은 실행하고, 불가한 쪽은 보고에 **"{codex/Gemini} 미실시"** 표기. **외부 자문이 한쪽만/전부 미실시여도 CV=100은 유효**(사각 점검 범위만 축소 — 보고에 명시). v0.6.
- **★ 웹 구독 폴백 (CLI·API 모두 막혔을 때 — 최후 수단, 2026-06 신설)**: codex CLI 거부·Gemini CLI 무료티어 폐지(IneligibleTierError)·gemini.cjs 키 전량 소진 등으로 API/CLI 경로가 다 막혀도, **로그인된 웹 구독 세션(chatgpt.com · gemini.google.com)을 컴퓨터 유즈로 몰아** 평가를 받는다. 웹 세션은 CLI 무료티어 폐지·API 키 소진과 **무관**(브라우저 로그인은 독립)이라, 사실상 무료로 외부 검증을 복구한다. 로그인된 웹 세션을 브라우저 자동화(CDP)로 재사용하는 원리다.
  - **방법**: ① 자동화 Chrome을 `--remote-debugging-port=9222 --user-data-dir=<전용 프로필>`로 띄우고 운영자가 chatgpt.com·gemini.google.com에 **1회 로그인** → ② Playwright `connect_over_cdp("http://localhost:9222")`로 붙어 해당 탭 선택 → ③ 입력창에 프롬프트 삽입 — **Gemini** `div.ql-editor[contenteditable="true"]`, **ChatGPT** `#prompt-textarea`(contenteditable div) — 후 제출(Enter). **줄바꿈이 조기 제출되지 않도록 `page.evaluate("(t)=>document.execCommand('insertText',false,t)", prompt)`로 삽입**(keyboard.type의 \n 제출 함정 회피) → ④ 응답 컨테이너를 새 항목 등장 후 텍스트 **안정화까지 폴링 수집** — Gemini `message-content`/`.model-response-text`, ChatGPT `[data-message-author-role="assistant"]`.
  - ⚠️ **스트리밍 중간 멈춤 함정**: Gemini/ChatGPT는 청크 사이에 수 초 멈춘다. 안정화 임계를 너무 짧게(예: 8s) 잡으면 **생성 도중 잘린 부분 답변**을 완성본으로 오인한다(2026-06 실측 — Gemini 344자에서 조기 종료 판정). → 안정화 무변화 **≥6회(약 12s+)** + **생성중지 버튼 부재** 확인 후 수집. 그래도 짧으면 `text_content`로 재확인하고, 의심되면 1회 재시도.
  - 웹 폴백 점수도 codex·Gemini와 동일 규칙 적용(≥95 AND C/H 0). 보고에 **"{ChatGPT/Gemini} 웹 구독 폴백"** 으로 경로 표기.
- 둘 다 불가(웹 폴백까지 실패하거나 사용자가 외부 전송 거부): Cross Validator 단독으로 진행 + 최종 보고에 **"외부 추가 자문 미실시(사각 점검 생략) — CV=100"** 명시. CV=100이 곧 100점이며, 외부 자문은 보조였음(v0.6).

#### 평가 결과 보고 형식 (Step 4 포함)

```
🌐 외부 LLM 이중 교차 검증 (Round {N})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧪 codex CLI (ChatGPT 구독)  : XX/100  · Critical n · High n
🧪 Gemini CLI (Google 무료)  : XX/100  · Critical n · High n
⭐ Cross Validator (Claude)   : YY/100 (Step 3)
📊 판정: {셋 다 정합 → 100 확정 / 결함 발견 → 다음 Round / 외부 오판 반증 → 기각+근거}

🚨 외부 추가 발견 (CV 못 잡은 것, codex∪Gemini):
[Critical] n · [High] n · [Medium] n · [Low] n
(인코딩 오독 등 반증된 항목은 "기각: {근거}"로 별도 표기)

💬 권고: ...
➡️ 다음: {Phase 3 진입(외부 Critical/High 0 또는 자문 반영 완료) / Round {N+1}(외부가 Critical/High 발견 시)}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 파일 타입별 루브릭 (채점표)

### Code 파일 (.py/.ts/.js/.sql) — 6기준 (배점: 내부 15점씩 + 사양 10점 = 100점)

| 기준 | 만점 | 만점 조건 | 감점 기준 |
|------|:---:|----------|----------|
| **문법·실행** | 15 | ast.parse 통과 + 실행 정상 | 구문 오류 1건당 -5 |
| **보안** | 15 | OWASP 위반 0건 | 이슈 1건당 -5 |
| **코드 품질** | 15 | dead code 0건 + 명확한 네이밍 | 경고 1~3건 -5, 4건+ -10 |
| **테스트·검증** | 15 | 테스트 존재 + 통과 | 테스트 없으나 검증 가능 -5 |
| **기능 완성도** | 15 | 코드 자체 요구사항 100% 충족 | 미구현 기능 1건당 -3 |
| **사양 충족률** | 25 | 연관 문서 대비 구현 100% 일치 | GAP 1건당 -5 (아래 상세) |

**사양 충족률 채점 상세 (25점):**

```
25점: 연관 문서의 모든 사양이 코드에 구현됨 (GAP 0건)
20점: GAP 1건 (경미한 누락)
15점: GAP 2~3건
10점: GAP 4~5건 (상당한 격차)
 5점: GAP 6건 이상 (근본적 격차)
 0점: 연관 문서와 코드가 거의 무관

연관 문서 없음 → 사양 충족률 15점 (기본값, "대조 미실시" 표기)
```

**핵심: "코드가 잘 돌아가는가"(기능 완성도 15점)와 "코드가 사양대로 돌아가는가"(사양 충족률 25점)를 분리.**
사양 충족률이 전체 100점 중 25점을 차지하므로, 아무리 코드 품질이 좋아도 사양과 동떨어지면 75점이 상한이다.

### Document 파일 (.md) — 6기준 (내부 15점씩 + 사양 10점 = 100점)

| 기준 | 만점 | 만점 조건 |
|------|:---:|----------|
| **사실 정확성** | 15 | 오류 0건 |
| **용어 일관성** | 15 | 프로젝트 규칙 100% 준수 |
| **구조 완성도** | 15 | 필수 섹션 전부 존재 |
| **규칙 준수** | 15 | 금지 문구 0건 + 명칭 규칙 준수 |
| **실용성** | 15 | 즉시 활용 가능 |
| **사양 충족률** | 25 | 연관 문서/코드와 내용 일치 (Code 루브릭과 동일 기준) |

### Report 파일 (.html) — 6기준 (내부 15점씩 + 사양 10점 = 100점)

| 기준 | 만점 | 만점 조건 |
|------|:---:|----------|
| **데이터 정확성** | 15 | DB 수치 100% 일치 |
| **렌더링 품질** | 15 | 태그 열림/닫힘 100% + CSS 정상 |
| **정식명칭·금지문구** | 15 | 위반 0건 |
| **구조 균일성** | 15 | 벤치마크 대비 ±10% 분량 |
| **접근성** | 15 | 모바일 대응 + 인쇄 가능 |
| **사양 충족률** | 25 | 연관 문서/스크립트와 출력 일치 (Code 루브릭과 동일 기준) |

---

## 점수 규칙

### 루브릭 보간 규칙

루브릭은 20/15/10/5 4단계 기준점이다. 중간 점수는 아래 규칙으로 보간한다:

```
20점: 기준점 조건 완벽 충족
18~19점: 20점 기준에 경미한 미달 1건
16~17점: 15점 기준 충족 + 추가 강점 1~2건
15점: 기준점 조건 충족
12~14점: 15점 기준에 미달하지만 10점보다 나음
10점: 기준점 조건 충족
6~9점: 10점 기준에 미달하지만 5점보다 나음
5점: 기준점 조건 충족
```

### 수정 0건이면 점수 유지

```
이번 라운드 작성자 반영 건수 == 0 → 점수 = 이전 라운드 점수 (변동 없음)  ※ 기각된 결함은 수정 건수에 넣지 않는다
연속 수정 0건 2회 → "더 이상 개선 불가" 자동 종료
단, 최소 3회 미만에서 연속 0건이 발생하면 3회까지는 계속 진행
```

### 파일별 개별 점수 + 통합 점수

```
파일별 점수: Cross Validator가 루브릭 기준으로 파일별 개별 점수 산정
통합 점수: 파일별 점수의 균등 평균 (파일 수로 나눔)
  예: Code 92점 + Document 98점 + Report 95점 → (92+98+95)/3 = 95점
```

### 평가 결과 보고 형식

```
📊 평가 결과 (Round {N})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔄 라운드: {N} / 최대 10회
⭐ 종합 평점: XX/100점 (Cross Validator 채점)

📁 파일별 평가:
  [Code] script.py — XX/100점
    문법·실행: XX/20 | 보안: XX/20 | 품질: XX/20 | 테스트: XX/20 | 완성도: XX/20
  [Document] guide.md — XX/100점
    정확성: XX/20 | 용어: XX/20 | 구조: XX/20 | 규칙: XX/20 | 실용성: XX/20
  [Report] report.html — XX/100점
    데이터: XX/20 | 렌더링: XX/20 | 명칭: XX/20 | 균일성: XX/20 | 접근성: XX/20

💬 Cross Validator 의견:
[리뷰어가 놓친 문제점]
-
[작성자의 부당 거부]
-
[점수 조정 사유]
-

[이번 라운드 수정 건수]: 반영 {N}건 (Critical {n}, High {n}, Medium {n}, Low {n}) · 거부 {n}건(기각 {n}) · 이월 {n}건

➡️ 다음: {다음 라운드 계속 / Phase 3 진입 / 10회 도달 종료 / 수정 불가 종료}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Phase 3. 종료 조건

### 🔴 ABSOLUTE RULE — 100점 미달 임의 종료 금지 (v0.6 — 100점=CV(Claude) 달성 / codex·Gemini=추가 자문)

> ## ⛔ codex 조기 호출 절대 금지 (최우선·예외 없음)
> **Cross Validator 점수가 100이 되기 전에는 codex를 호출하지 않는다.** 78·88·95·97·99점 — 그 무엇이든 100 미만이면 codex로 넘기지 말고 **그 결함을 작성자가 수정해 다음 라운드**로 간다. codex는 "CV=100을 *확정*하는 마지막 1회"이지, "개선 아이디어를 얻는 도구"가 아니다.
> - CV < 100인데 codex를 부르면 = **규칙 위반**. codex가 준 지적으로 라운드를 도는 것은 순서가 거꾸로다(코드를 먼저 100으로 만들고, 그 100을 외부가 검증).
> - 위반의 대가: codex 1회 기회를 미완성 코드에 써버려, 정작 CV=100 상태를 외부 검증 못 하게 된다(1회 제한).
> - 따라서 **매 라운드 끝 체크**: "CV=100인가? 아니면 codex 부르지 말 것."

**Round < 10 AND Cross Validator < 100 → 다음 라운드 강제 진입.** (CV가 100이 될 때까지 codex는 호출하지 않는다.)

순서(엄수): ① CV가 자체적으로 100점에 도달할 때까지 라운드를 계속한다(외부 LLM 미호출). ② **CV=100 도달 시에만 codex와 Gemini를 각 1회** 호출해 이중 교차 검증한다. — 이 순서를 절대 뒤집지 않는다.

**100점 = Cross Validator(Claude) 단계에서 달성한다 (사용자 방법론 — v0.6, 2026-06 정정). codex·Gemini는 그 후의 "추가 자문"이지, 100을 무르거나 다시 정의하는 점수 게이트가 아니다.** (대상 무관 — 코드·문서·보고서·법률문서 등 모든 평가에 동일 적용. 특허에 한정하지 않음.)

1. **CV(Claude) 점수 = 100 → 이것이 "100점 달성"이다.** CV=100을 만들 때까지 라운드를 돌린다(외부 미호출). 이 단계가 100점의 기준점이고, 종료 사유 "100점 달성"은 CV=100으로 성립한다.
2. CV=100 도달 후, codex(OpenAI/GPT)·Gemini(Google)를 **추가 자문**으로 각 1회 호출한다 — CV가 못 본 사각을 잡는 보조 검증(가치 큼). 가능하면 둘 다, 안 되면 가능한 쪽만(웹 구독 폴백 포함).
   - 추가 자문이 **Critical/High 결함**을 발견 → **작성자가 반드시 반영(수정)** 후 CV가 여전히 100인지 재확인한다. (외부의 사각 점검 기능은 유지 — 이게 추가 자문의 핵심 가치다. 예: CV가 100을 줬으나 codex가 종속항 정합 결함을 잡은 사례.)
   - 추가 자문의 **점수(예: 86/100)·Medium·Low 의견**, 그리고 **해당 분야 전문가·심사가 최종 판단할 도메인 영역 의견**(예: 특허 진보성, 법률 적합성, 의학적 판단 등 — 드래프팅/코드 수정으로 해소 불가한 판단 사안)은 **CV=100을 무르지 않는다.** "참고 의견"으로 표기하고 진행한다.
   - 추가 자문이 **Critical/High 0**이면 → CV=100이 외부로도 뒷받침된 이상적 상태. 외부가 실패/미실시여도 **CV=100은 유효**하되 보고에 "외부 추가 자문 미실시/일부" 표기.
   - 인코딩 mojibake 등 거짓 결함은 py_compile·실행 등으로 **반증**하고 기각(근거 보고). 인코딩 복구 재호출은 1회 제한에 미포함.
   - ⚠️ **금지(순서 역전)**: 추가 자문 점수를 ≥95까지 끌어올리려 외부 의견에 끌려 무한 루프 돌지 말 것. 100은 CV에서 이미 달성됐다. 외부는 사각 점검·개선 입력이지 추격 대상이 아니다.

추가 규칙:
- 95점·97점·99점 등 "충분히 높다"는 자가 판단으로 종료 금지 — CV=100 전에는 외부 LLM도 안 부른다
- "배포 가능 수준"·"잔여 이슈는 사소함" 권고가 있어도 CV<100이면 무시
- 사용자에게 "미달이지만 종료할까요?" 묻지도 말 것
- 예외: Round = 10 도달 OR 연속 수정 0건 2회 발생 시에만 미달 종료 허용 (이때 외부 LLM 미호출 상태면 그대로 미달 종료)
- codex·Gemini는 각각 루프에서 **1회만** — 매 라운드 반복 호출 금지 (비용·인코딩 churn 방지). 단 인코딩 실패로 무효가 된 호출의 복구 재호출은 예외

**Why 1**: 2026-05-03 한 보고서 검증 사건 — Round 2 97점 받고 Cross Validator의 "배포 가능 수준" 권고에 동조 임의 종료. 사용자 지적 후 Round 3 재개 → 100점 달성. 이 경험을 ABSOLUTE RULE로 격상.

**Why 2 (v0.2 보강)**: 2026-05-28 한 프로젝트 검증 사건 — Cross Validator가 100점 줬으나 codex가 88점 부여 + High 2건 추가 발견. 자기 LLM 가족 안에서는 검증 편향이 발생 → *다른 LLM 가족*으로 교차 검증 필수. 외부 LLM 점수 ≥ 95 게이트 신설.

**Why 3 (v0.4 보강)**: 2026-06-11 한 프로젝트 §8·§9 검증 — CV를 100으로 올리기도 전에 78점 상태에서 codex를 호출(조기 호출). codex가 준 High 지적으로 R2·R3를 돌게 되어, 순서가 "코드 완성→외부검증"이 아니라 "외부에서 할 일 받아오기"로 뒤집혔다. 사용자 지적("100 된 다음 codex 1회"). → codex 조기 호출 절대 금지를 최상단 ⛔ 박스로 격상.

**Why 4 (v0.5 보강)**: 2026-06-12 한 자동화 파이프라인 검증 — codex 호출에서 `$OutputEncoding` 누락으로 한글이 mojibake가 되어 codex가 정상 코드를 "구문 깨짐 0점"으로 거짓 판정. 게다가 외부 검증을 codex 하나에만 의존해, 그 한 번이 인코딩으로 무력화되자 외부 검증 자체가 공백이 됐다. 사용자 지적("codex CLI 모드로 받고 Gemini도 받아라"). → **(1) 인코딩 3종 강제(OutputEncoding/InputEncoding/$OutputEncoding), (2) codex+Gemini 이중 검증, (3) 외부 거짓 판정은 py_compile로 반증** 신설.

**Why 5 (v0.6 — 역할·게이트 정정)**: 2026-06 한 특허명세서 검증 — CV가 100을 달성(Round 3)한 뒤 codex(78·High4)·Gemini(75·Critical1)를 받자, 그 점수를 "100을 막는 게이트"로 오인해 외부≥95를 추격하며 무한 루프에 빠졌다. 특히 **진보성(특허 심사·변리사 영역) 의견은 드래프팅으로 해소 불가**한데 외부 점수를 끌어올리려다 순서가 또 뒤집힘. 사용자 정정("100점은 CV(Claude)에서 달성, codex·Gemini는 추가 자문. 특허에 한정 말 것"). → **(1) 100점 = CV(Claude) 달성으로 명문화, (2) 외부 = '추가 자문' — Critical/High만 반영하고 점수·Medium·Low·도메인 전문 판단(진보성·법률·의학 등)은 참고 의견으로 CV=100 안 무름, (3) 외부 점수≥95 게이트 폐지(점수 추격 금지), (4) CLI·API 막히면 웹 구독 폴백, (5) 전 대상(코드·문서·보고서·법률문서) 일반 적용**. 이전 "둘 다 필수·≥95 확정" 규정을 본 항으로 대체.

**Why 6 (v0.7 — 역할 3분리)**: 2026-09-16 사용자 지적 — "리뷰어가 수정하는 것은 아닌 것 같다. 리뷰어는 의견을 제시하고 수정은 작성자가 하고, 다시 리뷰에서 점수를 매겨야 한다. 리뷰어가 수정해버리면 엉뚱한 수정을 하는 경우가 많다." → **(1) 리뷰어 read-only — 결함 목록만, (2) 작성자가 수정 + 수정 회신(반영/거부+이유/보류), (3) 리뷰어 반영 확인 → CV 채점, (4) 작성자 부재 시 메인 세션이 작성자 대리, (5) 5times 위임 주체 = 작성자**. 이전 "리뷰어가 직접 수정" 규정을 본 항으로 대체.

### 종료 사유 3가지

| 사유 | 조건 | 행동 |
|------|------|------|
| **100점 달성** | 100점 + 3회 이상 | 사용자에게 추가 여부 확인 |
| **10회 도달** | Round = 10 | 현재 점수로 강제 종료 |
| **개선 불가** | 연속 수정 0건 2회 | 자동 종료 |

### 100점 달성 시

```
✅ 품질 목표 달성 (Round {N})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⭐ 최종 평점: 100/100점
🔄 총 라운드: {N}회
📊 종료 사유: 100점 달성

추가 검토·평가를 진행하시겠습니까?
- [완료] 검토·평가 종료
- [추가] 1회 더 검토·평가 수행
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 10회 도달 또는 개선 불가 시

```
⚠️ 순환 종료 (Round {N})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⭐ 최종 평점: XX/100점
🔄 총 라운드: {N}회
📊 종료 사유: {10회 도달 / 연속 수정 0건 2회 — 개선 불가}

잔여 이슈:
- {미해결 문제 목록}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 최종 결과 보고 형식

```
✅ 최종 검토·평가 결과
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⭐ 최종 평점: XX/100점
🔄 총 라운드: {N}회
📊 종료 사유: {100점 달성 / 10회 도달 / 개선 불가}

📁 파일별 최종 평가:
  [Code] script.py — XX/100점 (Code Reviewer)
  [Document] guide.md — XX/100점 (Document Reviewer)
  [Report] report.html — XX/100점 (Report Reviewer)
  [교차검증] Cross Validator 최종 조정: ±X점

📝 라운드별 수정 이력 (작성자: {작성자}):
  Round 1: 반영 {N}건 (Critical {n}, High {n}, Medium {n}) · 거부 {n}건(기각 {n})
  Round 2: 반영 {N}건
  Round 3: 반영 0건 → 점수 유지
  ...

검토·평가 완료.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Tools Required
- Read, Glob, Grep (검토용 — 리뷰어·CV는 이것만)
- Edit (수정용 — 작성자만. 메인 세션은 작성자 대리일 때만)
- Agent (서브에이전트 스폰용 — mode: auto)
- SendMessage (살아 있는 작성자 세션에 결함 목록 전달·회신 수신)
- AskUserQuestion (대상 확인 / 종료 확인용)

## Execution Flow 요약

```
1. 평가 대상 결정 + 파일 타입 분류 (Code/Document/Report)
2. 서브에이전트 투입 판단 (3개 이상 → 풀 투입, 1~2개 → 직접 수행 + Cross Validator 1명)
3. 순환 루프 시작 (최대 10회)
   Round N:
     a. 파일 타입별 리뷰어가 검토 → 결함 목록 (수정 금지)
     b. 작성자가 수정 + 수정 회신(반영/거부+이유/보류)
     c. 리뷰어가 회신 대조 — 반영 확인, 부당 거부는 이월
     d. Cross Validator가 독립적으로 채점 (루브릭 기준)
     e. 반영 0건이면 점수 유지
     f. 연속 반영 0건 2회 → 자동 종료
4. 100점 달성 + 3회 이상 → 사용자에게 추가 여부 확인
5. 10회 도달 → 강제 종료
6. 최종 결과 보고 (파일별 점수 + 통합 점수 + 수정 이력)
```
