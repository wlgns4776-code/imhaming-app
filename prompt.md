## 바이브 코딩 워크플로우 (Step-by-Step)

자연스러운 결과물을 만들기 위한 작업 순서입니다.

### 1. Setup & Base Vibe (10%)

- 프로젝트 생성 -> 폰트/컬러 변수 세팅 -> `globals.css`에 비네트 효과 적용.
- _이 단계에서 이미 사이트의 분위기가 80% 결정됩니다._

### 2. Structural Sketch (30%)

- Navbar, Hero, Footer 등 큼직한 덩어리를 먼저 배치합니다.
- 디테일보다는 '위치'와 '크기'에 집중합니다. (ex: "일단 로고 크게 박아줘")

### 3. Detail & Interaction (40%)

- **Navbar**: 호버 효과, 메뉴 구성.
- **Animation**: `framer-motion`을 붙여서 스크롤 시 떠오르는 효과(`y: 20 -> 0`, `opacity: 0 -> 1`) 추가.
- **Morphing**: 복잡한 스크립트 컴포넌트(`AboutSection`) 추가.

### 4. Content & Asset Replacement (20%)

- 플레이스홀더 텍스트를 실제 문구로 교체.
- 임시 이미지를 실제 로고(`실제로고`)나 사진(`실제사진`)으로 교체.
- _Tip: 이미지는 처음부터 완벽한 걸 쓰기보다 회색 박스로 잡고 나중에 교체하는 게 속도에 좋습니다._

### 5. Refinement (Scale Down)

- 전체적으로 만들어놓고 보면 요소들이 너무 클 수 있습니다.
- 마지막에 `max-w`를 조절하거나 `scale`을 줄여서 균형을 잡습니다. (우리가 마지막에 했던 작업)

### 3.3 Morphing Icons (About Section)

1. **리소스 준비**:
   - 특수문자 풀: `['█', '▓', '▒', '#', '$']`
   - SVG 아이콘 : npm i @hackernoon/pixel-icon-library

2. **상태 관리 (State)**:
   - 3개의 슬롯(`Slot1`, `Slot2`, `Slot3`)을 만듭니다.
   - 각 슬롯은 `targetItem`(최종적으로 보여줄 아이콘)을 가집니다.

3. **애니메이션 루프**:
   - 변화하는 동안에는 랜덤한 아이콘/문자를 0.06초(`65ms`) 간격으로 보여줍니다.
   - 약 12~18회 반복 후 `targetItem`으로 고정(Settle)시킵니다.

4. **컬러 사이클**: 고정된 후에도 색상은 계속 변해야 하므로 별도의 `setInterval`로 색상만 변경해줍니다.

> **Prompt Tip:**
> "3개의 슬롯이 있고, 각 슬롯이 마구 변하다가 특정 아이콘으로 멈추는 '슬롯머신' 효과를 만들어줘. 중간 과정에는 터미널 블록 문자('█', '▓')들이 섞여 나와야 해."

```jsx
const symbols = ["█", "▓", "▒", "#", "$"];
const [slot1, setSlot1] = useState("█");
const [isSpinning, setIsSpinning] = useState(false);

const spin = () => {
  setIsSpinning(true);
  let count = 0;
  const interval = setInterval(() => {
    setSlot1(symbols[Math.floor(Math.random() * symbols.length)]);
    count++;
    if (count > 15) {
      clearInterval(interval);
      setSlot1("🎯"); // 최종 아이콘
      setIsSpinning(false);
    }
  }, 65);
};
```

### 3.2 Partner Row (무한 스크롤)

- **구현 포인트**: CSS Animation이나 Framer Motion을 사용하되, **끊김 없는 무한 루프**가 핵심입니다.
- **Tip**: 배열을 2배, 4배로 늘려서(`[...list, ...list, ...list, ...list]`) 스크롤이 끝나는 시점과 시작 시점을 자연스럽게 연결합니다.

```jsx
const duplicatedLogos = [...logos, ...logos, ...logos, ...logos];

<motion.div
  animate={{ x: [0, -1920] }}
  transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
  className="flex gap-8"
>
  {duplicatedLogos.map((logo, i) => (
    <img
      key={i}
      src={logo}
      className="h-12 grayscale opacity-60 hover:opacity-100"
    />
  ))}
</motion.div>;
```

### 3.1 Hero Section (압도적인 타이포그래피)

- **구현 포인트**: 폰트 크기를 `text-[12vw]`와 같이 뷰포트 단위로 설정하여 화면을 가득 채웁니다.
- **블렌딩**: 텍스트나 로고 이미지에 `mix-blend-multiply`를 주어 배경색과 자연스럽게 섞이게 만듭니다. (이미지의 흰 배경을 투명하게 만드는 효과)

```jsx
<h1
  className="text-[12vw] font-black tracking-tighter leading-none"
  style={{ mixBlendMode: "multiply" }}
>
  Your Brand
</h1>
```

- **Color Palette**:
  - 배경: `Off-white / Beige` (`#F0EFEA`) - 차가운 흰색이 아닌 따뜻하고 빈티지한 느낌.
  - 텍스트: `Deep Black` (`#000000`, `mix-blend-multiply` 활용).
  - Effect: `Vignette Glow` - 화면 가장자리에 은은한 블루/퍼플 빛 번짐 효과.
- **Typography**:
  - 압도적으로 큰 폰트 사이즈 (`10vw` 이상).
  - `tracking-tighter` (자간 좁게)로 단단한 느낌.
  - 시스템 폰트(Inter, Geist) 계열의 산세리프.
- **Layout**:
  - Fluid Layout (유동적 너비).
  - Sticky Navigation (블러 처리).
  - Grid 기반의 카드 섹션.

```css
:root {
  --background: #f0efea; /* 핵심 베이지 컬러 */
  --foreground: #000000;
}

/* 바이브를 만드는 핵심: 비네트 효과 */
.vibe-vignette {
  position: fixed;
  inset: 0;
  pointer-events: none; /* 클릭 방해 금지 */
  background: radial-gradient(
    circle at center,
    transparent 60%,
    rgba(132, 137, 240, 0.15) 100%
  );
  box-shadow: inset 0 0 100px rgba(132, 137, 240, 0.1);
  z-index: 50;
}
```

마지막 마무리:

1. 디자인 통일성
   - 컬러 스킴: 프로페셔널 블루 (#2563EB) + 액센트 그린 (#10B981)
   - 폰트: Inter (깔끔한 Sans-serif)
   - 카드에 subtle shadow
   - 버튼에 hover 효과

2. 반응형 레이아웃
   - 모바일에서도 완벽하게 작동
   - 태블릿 최적화

3. 데이터 시각화
   - 차트는 Chart.js 사용
   - 인터랙티브 그래프
   - 다운로드 가능한 리포트

4. 사용자 권한 관리
   - Admin: 모든 기능
   - HR Manager: 채용 + 직원 관리
   - Team Lead: 팀원 정보 열람
   - Employee: 본인 정보만

5. 빠른 액션 버튼
   - 메인 대시보드에 "Quick Actions" 섹션
   - "새 공고 등록", "면접 일정 잡기", "AI에게 물어보기"

6. 검색 기능 강화
   - 전역 검색 (Cmd+K / Ctrl+K)
   - 후보자, 직원, 공고, 메시지 통합 검색

전체적으로 "Notion + Linear + ChatGPT"를 합친 느낌으로.
직관적이고 강력하게 만들어줘.

가장 중요한 AI 기능들을 추가해줘:

1. AI 채용 공고 생성기
   입력 필드:
   - 직무명
   - 필요 스킬 (키워드)
   - 경력 수준
   - 회사 톤앤매너 선택 (전문적/친근한/혁신적)

   출력:
   - 매력적인 Job Description
   - 주요 업무
   - 자격 요건
   - 우대 사항
   - 3가지 버전 제공 (A/B 테스트용)

2. AI 면접 질문 생성기
   입력: 직무, 레벨, 평가 영역 (기술/문화적합도/문제해결)
   출력: 맞춤형 면접 질문 10개 + 평가 기준

3. 스마트 후보자 매칭
   - 직무 요구사항 vs 후보자 프로필 AI 분석
   - 매칭 점수 (0-100) + 이유 설명
   - "숨겨진 인재" 추천

4. 채용 인사이트 대시보드
   - 트렌드 분석 ("데이터 과학자 평균 지원 시간 증가")
   - 경쟁사 채용 동향 (공개 데이터 기반)
   - 개선 제안 (" 면접 단계를 줄이면 합격률 15% 증가 예상")

5. 창의적 채용 캠페인 아이디어
   - SNS 콘텐츠 아이디어
   - 이벤트 기획안
   - 타겟 채널 추천

모든 AI 기능에는 "결과 저장" 및 "수정 요청" 버튼 추가.
생성된 콘텐츠는 바로 편집 가능하게 해줘.

이제 Community 기능을 업그레이드해줘:

1. 실시간 팀 채팅
   - 부서별 채널 자동 생성
   - @멘션, 쓰레드 답글 기능
   - 파일 공유 및 미리보기

2. 온보딩 체크리스트
   - 신입사원용 자동 할당 태스크
   - 완료율 진행바
   - 멘토 배정 시스템
   - 환영 메시지 자동 발송

3. 직원 디렉토리
   - 프로필 사진, 역할, 연락처
   - 조직도 시각화
   - 검색 및 필터 기능
   - "팀원 생일" 자동 알림

4. 익명 피드백 박스
   - 회사 문화 개선 제안
   - 익명성 보장
   - 투표 및 댓글 기능
   - HR 관리자 대시보드

5. 성과 공유 게시판
   - 팀/개인 성과 축하
   - 리액션 (👏 🎉 ❤️)
   - 월간 MVP 투표

모든 활동은 "Activity Feed"에 실시간 표시되고,
중요한 업데이트는 상단에 고정할 수 있게 해줘.

Productivity 기능을 더 강화해줘:

1. 채용 파이프라인에 드래그 앤 드롭 칸반 보드 추가
   - "지원 접수 → 서류 통과 → 면접 → 최종 합격" 단계
   - 각 카드에 후보자 정보 요약 표시

2. 스마트 일정 조율 시스템
   - 면접관 캘린더 자동 체크
   - 3개 시간대 제안 자동 생성
   - 후보자에게 선택 링크 발송

3. 오퍼 계산기
   - 연봉, 스톡옵션, 복리후생 자동 계산
   - 시장 데이터 기반 추천 범위 표시
   - 오퍼 레터 PDF 자동 생성

4. 채용 성과 대시보드
   - 평균 채용 기간
   - 단계별 전환율
   - 면접관별 평가 분포
   - 채널별 지원자 유입 분석

모든 데이터는 실시간으로 업데이트되고,
알림은 이메일 + 인앱 모두 지원해줘.

HR 올인원 플랫폼을 만들어줘. 이름은 "DemodevHR" 로 하고,
다음 3가지 핵심 기능이 필요해 :

** productivity**

- 채용 파이프라인 관리 ( 지원자 단계별 트래킹 )
- 인터뷰 일정 자동 조율
- 오퍼 레터 생성 및 발송
- 채용 진행 현황 대시보드
- 업무별 데드라인 알림

** community **

- 팀 협업 공간 ( 채팅, 댓글 )
- 신입사원 온보딩 허브
- 직원 디렉토리 ( 프로필, 역할 )
- 팀 문화 & 공지사항 게시판
- 피드백 수집 시스템

** creativity **

- AI 채용 공고 작성기
- AI 면접 질문 생성기
- 후보자 매칭 추천
- 인재 데이터 인사이트
- 창의적 채용 캠페인 아이디어 생성

데이터베이스는 :

- Candidates (이름, 이메일, 포지션, 단계, 평가, 첨부파일)
- Employees (프로필, 부서, 입사일, 역할)
- Interviews (일정, 면접관, 후보자, 피드백)
- Job posts ( 직무, 설명, 요구사항, 상태)
- Team Messages (발신자, 내용, 타임스탬프 )

UI는 모던하고 깔끔한 기업용 디자인으로.
네비게이션은 왼쪽 사이드바에 주요 기능 배치.
메인 대시보드는 KPI 카드와 최근 활동 피드로 구성해줘
