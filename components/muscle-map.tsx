'use client';

import { models, muscleRegionIds, muscleFill } from '@/lib/muscle-map-data';
import { MUSCLES } from '@/lib/model';
export default function MuscleMap({
  primary = [],
  secondary = [],
  compact = false,
  onSelect
}: {
  primary?: string[];
  secondary?: string[];
  compact?: boolean;
  onSelect?: (muscle: string) => void;
}) {
  return <div className={'muscle-map ' + (compact ? 'compact' : '')}><div className="bodies">{(['front', 'back'] as const).map(side => {
        const model = models.models[side];
        return <div key={side}><svg viewBox={model.viewBox} role="img" aria-label={`${side === 'front' ? '앞면' : '뒷면'} 근육 지도 · 코랄 주동근, 골드 보조근`}><g transform={model.transform}><path d={model.outline} fill="#333941" stroke="#49515b" strokeWidth="2" />{model.regions.flatMap(region => region.paths.map(path => {
                const ids = muscleRegionIds(side,region.id,path.id);
                const pri = ids.some(id => primary.includes(id)),
                  sec = ids.some(id => secondary.includes(id));
                const label = ids.map(id => MUSCLES[id]).filter(Boolean).join(' · ');
                return <path key={path.id} d={path.d} fill={muscleFill(ids,primary,secondary)} stroke="#242930" strokeWidth="2.8" strokeLinejoin="round" className={onSelect && label ? 'muscle-hit' : ''} onClick={() => {
                  if (label) onSelect?.(ids[0]);
                }}><title>{(label || '신체 윤곽') + (pri ? ' · 주동근' : sec ? ' · 보조근' : '')}</title></path>;
              }))}</g></svg><span className="view-label">{side === 'front' ? 'FRONT' : 'BACK'}</span></div>;
      })}</div><div className="muscle-legend"><span><i className="primary-dot" />주동근</span><span><i className="secondary-dot" />보조근</span></div></div>;
}
