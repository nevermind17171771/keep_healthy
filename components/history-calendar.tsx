'use client';
import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { day, type Session } from '@/lib/model';
const shift = (month: string, amount: number) => new Date(Date.UTC(+month.slice(0, 4), +month.slice(5, 7) - 1 + amount, 1)).toISOString().slice(0, 7);
export default function HistoryCalendar({sessions, selected, onSelect}: {sessions: Session[]; selected: string; onSelect: (value: string) => void}) {
  const [manual, setManual] = useState('');
  const month = manual || (selected || day()).slice(0, 7);
  const start = new Date(month + '-01T00:00:00Z');
  const offset = (start.getUTCDay() + 6) % 7;
  const count = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0)).getUTCDate();
  const dates = new Map<string, number>();
  for (const s of sessions) {
    const date = day(s.date);
    if (date.startsWith(month)) dates.set(date, (dates.get(date) || 0) + 1);
  }
  return <section className="panel log-calendar" aria-label="월간 운동 캘린더">
    <div className="section-title"><button className="icon-button" aria-label="이전 달" onClick={() => setManual(shift(month, -1))}><ChevronLeft size={19}/></button>
      <h3>{+month.slice(0, 4)}년 {+month.slice(5)}월 · {dates.size}일 운동</h3>
      <button className="icon-button" aria-label="다음 달" onClick={() => setManual(shift(month, 1))}><ChevronRight size={19}/></button></div>
    <div className="log-calendar-grid">{['월','화','수','목','금','토','일'].map(d => <span key={d}>{d}</span>)}
      {Array.from({length: offset}, (_, i) => <span key={'gap'+i} aria-hidden="true"/>)}
      {Array.from({length: count}, (_, i) => {
        const date = `${month}-${String(i + 1).padStart(2, '0')}`, n = dates.get(date) || 0;
        return <button key={date} aria-label={`${date} · ${n}회 운동`} aria-pressed={date === selected} aria-current={date === day()?'date':undefined} className={n ? 'has-log' : ''} onClick={() => onSelect(date === selected ? '' : date)}>{i + 1}{n > 0 && <i aria-hidden="true"/>}</button>;
      })}
    </div>
  </section>;
}
