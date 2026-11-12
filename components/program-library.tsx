'use client';

import { useState } from 'react';
import { NativeSelect } from '@/components/ui/native-select';
import { Checkbox } from '@/components/ui/checkbox';
import { exercise, defaultState, type Routine } from '@/lib/model';
import { PROGRAMS, programRoutines, planVolume, routineWarnings, type PlanMode } from '@/lib/programs';
import { alternatives, type TrainingProgram } from '@/lib/program-data';
export function RoutineReview({
  routine
}: {
  routine: Routine;
}) {
  const notes = routineWarnings(routine);
  return notes.length ? <div className="program-notice"><strong>구성 점검 · 참고</strong>{notes.map(n => <p key={n}>{n}</p>)}<small>특화 훈련 목적일 수도 있어요. 순서는 자동 변경하지 않아요.</small></div> : null;
}
export default function ProgramLibrary({
  onImport
}: {
  onImport: (r: Routine[], w: number[], schedule: boolean) => boolean;
}) {
  const [id, setId] = useState(PROGRAMS[0].id),
    [mode, setMode] = useState<PlanMode>('standard');
  const p = PROGRAMS.find(p => p.id === id)!;
  return <section className="panel program-library"><div className="section-title"><div><p className="eyebrow">PROGRAMS · 4.3</p><h2>검토하고 가져오는 운동 프로그램</h2></div></div><p className="subtext">개정 프로그램은 새 루틴으로 추가해요. 내 기록과 편집한 루틴은 그대로 남아요.</p><div className="form-grid"><label className="field"><span>프로그램</span><NativeSelect aria-label="프로그램 선택" value={id} onChange={e => setId(e.target.value)}>{PROGRAMS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</NativeSelect></label><label className="field"><span>운동량 선택</span><NativeSelect aria-label="프로그램 운동량" value={mode} onChange={e => setMode(e.target.value as PlanMode)}><option value="standard">기본 구성</option><option value="short">시간 부족 · 핵심 2–3종목</option><option value="easy">가볍게 · 종목당 2세트</option></NativeSelect></label></div><ProgramPreview key={id + mode} program={p} mode={mode} onImport={onImport} /><details className="program-volume"><summary>기존 기본 루틴 개정본 15개 보기</summary><p className="micro">기존에 저장된 루틴은 바뀌지 않아요. 수정한 순서·세트·휴식을 확인하고 필요한 개정본만 추가하세요. 하루 루틴이므로 주간 일정은 직접 정하세요.</p>{defaultState().routines.map((r, i) => <details key={r.id}><summary>{r.name} · {r.exercises.reduce((n, e) => n + e.sets, 0)}세트</summary><ol>{r.exercises.map((e, j) => <li key={j}>{exercise(e.exerciseId)?.name} · {e.sets} × {e.reps}–{e.repMax}회 · 휴식 {e.rest}초</li>)}</ol><RoutineReview routine={r} /><button className="secondary" onClick={() => onImport([{
          ...r,
          id: `review43-${i}`,
          name: r.name + ' · 개정'
        }], [], false)}>개정본을 새 루틴으로 추가</button></details>)}</details></section>;
}
function ProgramPreview({
  program: p,
  mode,
  onImport
}: {
  program: TrainingProgram;
  mode: PlanMode;
  onImport: (r: Routine[], w: number[], s: boolean) => boolean;
}) {
  const [routines, setRoutines] = useState(() => programRoutines(p, mode)),
    [schedule, setSchedule] = useState(false),
    [imported, setImported] = useState(false);
  const volume = planVolume(routines, p.week);
  return <><p>{p.description}</p><p className="micro">{mode === 'easy' || p.id === 'return' ? '가벼운 중량을 직접 선택하고 RPE 6–7(약 3–4회 여유)에서 시작해요.' : '본세트는 RPE 7–8(약 2–3회 여유)을 출발점으로 삼아요.'} 워밍업은 별도예요. 중량·회복 상태에 맞춰 조절하세요.</p><div className="program-week">{p.week.map((n, i) => <span key={i}><b>{['월', '화', '수', '목', '금', '토', '일'][i]}</b>{n < 0 ? '휴식' : p.days[n].name}</span>)}</div><div className="program-days">{routines.map((r, i) => <details key={r.id} open={i === 0}><summary>{p.days[i].name} · {r.exercises.reduce((n, e) => n + e.sets, 0)}세트</summary><p className="micro">{p.days[i].why}</p><ol>{r.exercises.map((e, j) => {
            const name = exercise(e.exerciseId)?.name || e.exerciseId,
              base = p.days[i].exercises.find(x => x.name === name)?.name || name;
            return <li key={j}><strong>{name}</strong><span>{e.sets}세트 × {e.reps}–{e.repMax}회 · 휴식 {e.rest}초</span>{alternatives(base).length > 0 && <NativeSelect aria-label={`${p.days[i].name} ${j + 1}번째 대체 운동`} value={name} disabled={imported} onChange={event => {
                const replacement = exercise(event.target.value);
                if (!replacement) return;
                setRoutines(rs => rs.map((row, ri) => ri !== i ? row : {
                  ...row,
                  exercises: row.exercises.map((item, k) => k !== j ? item : {
                    ...item,
                    exerciseId: replacement.id,
                    weight: 0
                  })
                }));
              }}>{[name, ...alternatives(name)].map(n => <option key={n} value={n}>{n}</option>)}</NativeSelect>}</li>;
          })}</ol><RoutineReview routine={r} /></details>)}</div><details className="program-volume"><summary>주간 부위별 운동량 보기</summary><p className="micro">주동근 직접 세트와 보조 참여를 따로 표시해요. 합계는 실제 자극량이나 개인의 최적 운동량이 아니며, 한 세트가 여러 부위에 포함될 수 있어요.</p><table><thead><tr><th>부위</th><th>직접 세트</th><th>보조 참여</th></tr></thead><tbody>{volume.map(v => <tr key={v.muscle}><td>{v.label}</td><td>{v.direct}</td><td>{v.support}</td></tr>)}</tbody></table></details><p className="micro">대체 운동은 완전히 같은 자극을 보장하지 않아요. 기구 설정·가동범위를 확인하고 중량을 새로 정하세요.</p><label className="program-schedule"><Checkbox checked={schedule} disabled={imported} onCheckedChange={v => setSchedule(v === true)} /><span>위 일정으로 내 주간 계획도 교체하기</span></label><button className="primary" disabled={imported} onClick={() => {
      if (onImport(routines, p.week, schedule)) setImported(true);
    }}>{imported ? '가져오기 완료' : '이 구성으로 새 루틴 추가'}</button><p className="micro">가져온 뒤 루틴 편집에서 수정할 수 있어요. RPE를 기록하고 모든 본세트가 목표 상한에 도달하면 기구의 최소 증량 단위를 제안해요.</p></>;
}
