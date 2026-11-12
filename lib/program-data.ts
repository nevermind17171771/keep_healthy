/** Reviewed starter plans; workload is a starting point, not an individual optimum. */
export type PlanExercise = {
  name: string;
  sets: number;
  low: number;
  high: number;
  rest: number;
  core: boolean;
};
export type PlanDay = {
  name: string;
  why: string;
  exercises: PlanExercise[];
};
export type TrainingProgram = {
  id: string;
  name: string;
  description: string;
  days: PlanDay[];
  week: number[];
  effort: number;
};
const lift = (name: string, sets = 3, low = 8, high = 12, rest = 150, core = true): PlanExercise => ({
  name,
  sets,
  low,
  high,
  rest,
  core
});
const iso = (name: string, sets = 2) => lift(name, sets, 12, 15, 90, false);
const day = (name: string, why: string, exercises: PlanExercise[]): PlanDay => ({
  name,
  why,
  exercises
});
const chest = day('가슴 우선', '가슴 프레스를 먼저 하고 측면 어깨와 삼두를 마무리해요.', [lift('인클라인 머신 체스트 프레스'), lift('머신 체스트 프레스'), iso('펙 덱 플라이'), iso('케이블 사이드 레터럴 레이즈', 3), iso('케이블 로프 푸시다운')]);
const back = day('등 우선', '당기기 운동 뒤 이두를 배치해요. 가슴 지지 로우로 허리 부담을 분산해요.', [lift('뉴트럴 그립 렛풀다운'), lift('체스트 서포티드 로우'), iso('머신 리어 델트 플라이', 3), iso('케이블 컬'), iso('머신 크런치')]);
const legs = day('하체 집중', '무릎 중심 복합운동부터 시작하고 햄스트링·둔근을 별도로 훈련해요.', [lift('레그 프레스'), lift('머신 힙 쓰러스트'), lift('시티드 레그 컬', 3, 10, 15, 120), iso('레그 익스텐션'), iso('머신 카프 레이즈', 3)]);
const shoulders = day('어깨 우선 · 상체 보완', '숄더 프레스를 첫 운동으로 보호하고 가슴·등을 보완해요.', [lift('머신 숄더 프레스'), lift('머신 체스트 프레스', 2), lift('머신 시티드 로우', 2), iso('케이블 사이드 레터럴 레이즈', 3), iso('머신 리어 델트 플라이', 2)]);
const fullA = day('전신 A · 가슴 우선', '상하체를 번갈아 진행하고 팔 고립운동은 뒤에 배치해요.', [lift('머신 체스트 프레스'), lift('레그 프레스'), lift('뉴트럴 그립 렛풀다운'), lift('시티드 레그 컬', 2, 10, 15, 120), iso('머신 레터럴 레이즈')]);
const fullB = day('전신 B · 하체 우선', '하체부터 시작하고 상체 밀기·당기기를 연결해요.', [lift('레그 프레스'), lift('머신 숄더 프레스'), lift('체스트 서포티드 로우'), lift('머신 힙 쓰러스트', 2), iso('펙 덱 플라이')]);
const fullC = day('전신 C · 등 우선', '당기기부터 시작해 전신을 고르게 훈련해요.', [lift('뉴트럴 그립 렛풀다운'), lift('인클라인 머신 체스트 프레스'), lift('레그 프레스', 2), lift('시티드 레그 컬', 2, 10, 15, 120), iso('머신 리어 델트 플라이')]);
export const PROGRAMS: TrainingProgram[] = [{
  id: 'priority',
  name: '가슴·어깨 우선 · 주 4회',
  description: '머신·케이블 중심. 하체 집중일은 주 1회예요. 하체 성장 최우선 계획과는 달라요. 가슴 지지 로우는 패드가 있는 기구 또는 벤치 지지 동작을 선택하세요.',
  days: [chest, back, legs, shoulders],
  week: [0, 1, -1, 2, -1, 3, -1],
  effort: 8
}, {
  id: 'full',
  name: '머신 중심 · 주 3회 전신',
  description: '서로 다른 우선순위의 A/B/C를 하루씩 쉬며 진행해요. 한 주를 놓쳐도 다음 순서부터 이어갈 수 있어요.',
  days: [fullA, fullB, fullC],
  week: [0, -1, 1, -1, 2, -1, -1],
  effort: 8
}, {
  id: 'upper-lower',
  name: '상·하체 분할 · 주 4회',
  description: '상체와 하체를 각각 두 번 훈련하는 균형형 계획이에요.',
  days: [day('상체 A · 가슴 우선', '가슴과 등을 먼저, 어깨·팔 고립운동은 뒤에 배치해요.', [lift('머신 체스트 프레스'), lift('뉴트럴 그립 렛풀다운'), lift('머신 시티드 로우', 2), iso('머신 레터럴 레이즈'), iso('케이블 로프 푸시다운')]), legs, day('상체 B · 어깨 우선', '어깨 프레스를 먼저 하고 가슴·등을 보완해요.', [...shoulders.exercises, iso('케이블 컬')]), day('하체 B · 둔근 우선', '둔근 우선 복합운동 후 무릎 중심 운동과 고립운동을 진행해요.', [lift('머신 힙 쓰러스트'), lift('핵 스쿼트'), lift('시티드 레그 컬', 3, 10, 15, 120), iso('머신 카프 레이즈')])],
  week: [0, 1, -1, 2, 3, -1, -1],
  effort: 8
}, {
  id: 'express',
  name: '30분 압축 · 주 3회',
  description: '대기 시간이 길면 30분을 넘길 수 있어요. 휴식을 억지로 줄이지 않고 핵심 세 종목을 수행해요.',
  days: [fullA, fullB, fullC].map(d => ({
    ...d,
    exercises: d.exercises.slice(0, 3).map(e => ({
      ...e,
      sets: 2
    }))
  })),
  week: [0, -1, 1, -1, 2, -1, -1],
  effort: 8
}, {
  id: 'return',
  name: '운동 복귀 · 주 3회',
  description: '첫 주는 2세트, RPE 6–7 정도에서 시작해요. 다음 주에도 동작·회복이 편안하면 종목당 1세트를 추가하거나 일반 프로그램으로 전환하세요. 통증 재활 프로그램은 아니에요.',
  days: [fullA, fullB, fullC].map(d => ({
    ...d,
    exercises: d.exercises.slice(0, 4).map(e => ({
      ...e,
      sets: 2
    }))
  })),
  week: [0, -1, 1, -1, 2, -1, -1],
  effort: 7
}];
// Explicit alternatives share movement pattern. Loads never transfer automatically.
export const ALTERNATIVE_GROUPS = [['머신 체스트 프레스', '덤벨 벤치프레스', '스미스머신 벤치프레스'], ['인클라인 머신 체스트 프레스', '인클라인 덤벨 벤치프레스', '스미스머신 인클라인 벤치프레스'], ['머신 숄더 프레스', '시티드 덤벨 오버헤드 프레스', '스미스머신 오버헤드 프레스'], ['뉴트럴 그립 렛풀다운', '와이드 그립 렛풀다운', '어시스티드 풀업'], ['체스트 서포티드 로우', '시일 로우'], ['머신 시티드 로우', '케이블 시티드 로우'], ['케이블 사이드 레터럴 레이즈', '머신 레터럴 레이즈', '덤벨 사이드 레터럴 레이즈'], ['머신 리어 델트 플라이', '케이블 리어 델트 플라이', '덤벨 리어 델트 플라이'], ['레그 프레스', '핵 스쿼트', '벨트 스쿼트'], ['시티드 레그 컬', '라잉 레그 컬'], ['머신 힙 쓰러스트', '스미스머신 힙 쓰러스트', '바벨 힙 쓰러스트'], ['케이블 컬', '덤벨 컬', '머신 컬'], ['케이블 로프 푸시다운', '케이블 바 푸시다운'], ['펙 덱 플라이', '케이블 플라이'], ['머신 카프 레이즈', '레그 프레스 카프 레이즈']];
export const alternatives = (name: string) => ALTERNATIVE_GROUPS.find(g => g.includes(name))?.filter(n => n !== name) || [];
