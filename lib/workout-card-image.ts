import { muscleMapSvg } from './muscle-map-data';
import type { WorkoutCard } from './workout-card';
export type CardPage = { svg: string; width: number; height: number };
const escape=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!));
const font="Arial, 'Apple SD Gothic Neo', 'Noto Sans CJK KR', sans-serif";
/** Conservative width estimate; line splitting is deterministic in previews and exports. */
export function wrapCardText(value:string,width:number,size:number):string[]{
  const lines:string[]=[];let line='',used=0;
  for(const char of Array.from(value)){
    const w=/[\u1100-\u11ff\u3000-\u9fff\uac00-\ud7af]/u.test(char)?size:char===' '?size*.34:size*.63;
    if(char==='\n'||used+w>width){if(line)lines.push(line.trimEnd());line='';used=0;if(char==='\n')continue;}
    line+=char;used+=w;
  }
  if(line)lines.push(line.trimEnd());return lines.length?lines:[''];
}
/** One phone-sized summary; never shrink text or add another page. */
export function workoutCardPages(card:WorkoutCard):CardPage[]{
  const width=1080,height=1920,parts:string[]=[];
  const text=(value:string,x:number,y:number,size=36,color='#f3f4f5',weight=400)=>`<text x="${x}" y="${y}" font-size="${size}" fill="${color}" font-weight="${weight}">${escape(value)}</text>`;
  const fit=(value:string,w:number,size:number)=>{const lines=wrapCardText(value,w,size);return lines.length>1?lines[0].slice(0,-1)+'…':lines[0];};
  const box=(x:number,y:number,w:number,h:number,fill='#20272e')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="22" fill="${fill}"/>`;
  parts.push('<rect width="1080" height="1920" fill="#12171c"/>',text('KEEP HEALTHY',64,88,30,'#f16b59',750),text(card.date,788,88,28,'#a9b0ba'));
  parts.push(text('오늘 운동, 완료.',64,185,78,'#f3f4f5',750),text(fit(card.name,952,38),64,244,38,'#b8c0c9'));
  const stats=[['운동 시간',`${card.durationMinutes}분`],['본·드롭 세트',`${card.workSets}세트`],['중량 볼륨',`${new Intl.NumberFormat('ko-KR',{maximumFractionDigits:0}).format(card.volume)} kg·회`]];
  stats.forEach(([label,value],i)=>{const x=64+i*324;parts.push(box(x,282,304,136),text(label,x+22,327,29,'#a9b0ba'),text(fit(value,262,38),x+22,382,38,'#f3f4f5',700));});
  parts.push(box(64,448,952,324,'#1a2128'),`<g transform="translate(78 464)">${muscleMapSvg(card.primary,card.secondary,340,294)}</g>`,text('오늘 운동한 부위',460,508,32,'#a9b0ba'));
  const labels=card.muscleLabels.slice(0,5).join(' · ')+(card.muscleLabels.length>5?` · 외 ${card.muscleLabels.length-5}부위`:'');
  const muscleLines=wrapCardText(labels||'지정된 주동근 없음',504,36);
  muscleLines.slice(0,3).forEach((line,i)=>parts.push(text(i===2&&muscleLines.length>3?line.slice(0,-1)+'…':line,460,566+i*49,36,'#f3f4f5',650)));
  parts.push(text('● 주동근',460,730,26,'#f16b59'),text('● 보조근',670,730,26,'#d5ab65'));
  parts.push(text('WORKOUT SUMMARY',64,835,28,'#a9b0ba',650),text(`${card.rows.length}종목`,882,835,30,'#f16b59',700));
  const shown=card.rows.slice(0,8),gap=Math.min(160,920/Math.max(shown.length,1));
  shown.forEach((row,i)=>{
    const y=861+i*gap;
    parts.push(`<path d="M64 ${y}H1016" stroke="#343c45"/>`,text(String(i+1).padStart(2,'0'),64,y+43,28,'#f16b59',700),text(fit(row.name,872,40),134,y+43,40,'#f3f4f5',650),text(fit(row.summary,882,36),134,y+92,36,'#bdc7d2'));
  });
  if(!shown.length)parts.push(text('완료한 본세트가 없어요.',64,950,40,'#a9b0ba'));
  const omitted=card.rows.length-shown.length;
  parts.push(text(omitted?`외 ${omitted}종목 · 전체 기록은 앱에서 확인`:'완료한 본·드롭 세트 기준 · 자세한 기록은 앱에서',64,1835,28,'#a9b0ba'));
  parts.push(text(`유산소 ${card.cardioIntervals}구간 · 워밍업 ${card.warmups}세트 별도`,64,1880,27,'#88939e'));
  return [{width,height,svg:`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><g font-family="${font}">${parts.join('')}</g></svg>`}];
}
export async function renderWorkoutCard(page:CardPage):Promise<Blob>{
  const source=URL.createObjectURL(new Blob([page.svg],{type:'image/svg+xml;charset=utf-8'}));
  try{
    const img=new Image();img.src=source;await img.decode();
    const canvas=document.createElement('canvas');canvas.width=page.width;canvas.height=page.height;
    const ctx=canvas.getContext('2d');if(!ctx)throw Error('이미지를 만들 수 없어요.');ctx.drawImage(img,0,0);
    return await new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>{canvas.width=canvas.height=1;blob?resolve(blob):reject(Error('이미지 변환에 실패했어요.'));},'image/png'));
  }finally{URL.revokeObjectURL(source);}
}
