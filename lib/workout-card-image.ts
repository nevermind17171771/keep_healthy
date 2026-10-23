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
export function workoutCardPages(card:WorkoutCard):CardPage[]{
  const width=1080,maxHeight=3200,padding=64,content=952;
  const pages:{parts:string[];y:number}[]=[];
  let page:{parts:string[];y:number}={parts:[],y:0};
  const text=(value:string,x:number,y:number,size=28,color='#f3f4f5',weight=400)=>`<text x="${x}" y="${y}" font-size="${size}" fill="${color}" font-weight="${weight}">${escape(value)}</text>`;
  const line=(value:string,size=28,color='#f3f4f5',weight=400,x=padding,w=content)=>{for(const valueLine of wrapCardText(value,w,size)){page.parts.push(text(valueLine,x,page.y+size,size,color,weight));page.y+=size*1.42;}};
  const newPage=(first=false)=>{
    page={parts:[],y:62};pages.push(page);
    page.parts.push('<rect x="64" y="58" width="44" height="6" rx="3" fill="#f16b59"/>');page.y=104;
    page.parts.push(text('KEEP HEALTHY',64,page.y,26,'#f16b59',700),text(card.date,794,page.y,23,'#a9b0ba'));
    page.y=145;line(first?'오늘 운동, 완료.':'오늘의 운동 기록',first?58:44,'#f3f4f5',750);line(card.name,28,'#a9b0ba');page.y+=24;
    if(!first)return;
    const stats=[['운동 시간',`${card.durationMinutes}분`],['본·드롭 세트',`${card.workSets}세트`],['중량 볼륨',`${new Intl.NumberFormat('ko-KR',{maximumFractionDigits:0}).format(card.volume)} kg·회`]];
    for(let i=0;i<stats.length;i++){const x=padding+i*324;page.parts.push(`<rect x="${x}" y="${page.y}" width="304" height="118" rx="16" fill="#20252b"/>`,text(stats[i][0],x+22,page.y+35,22,'#a9b0ba'),text(stats[i][1],x+22,page.y+85,stats[i][1].length>12?27:34,'#f3f4f5',700));}
    page.y+=148;const mapY=page.y;
    page.parts.push(`<g transform="translate(52 ${mapY})">${muscleMapSvg(card.primary,card.secondary,440,380)}</g>`);
    page.y=mapY+12;line('MUSCLE FOCUS',21,'#f16b59',700,530,485);page.y+=8;
    line(card.muscleLabels.join(' · ')||'지정된 주동근 없음',26,'#f3f4f5',600,530,485);page.y+=18;
    line(card.completion,25,'#f3f4f5',600,530,485);line(card.effort,22,'#a9b0ba',400,530,485);page.y+=10;
    line(card.comparison,22,'#d5ab65',400,530,485);
    page.y=Math.max(page.y,mapY+397);
    page.parts.push(text('● 주동근',64,page.y+20,20,'#f16b59'),text('● 보조근',190,page.y+20,20,'#d5ab65'));page.y+=42;
    line(`유산소 ${card.cardioIntervals}구간 · 워밍업 ${card.warmups}세트 별도 · 완료한 기록만 표시`,22,'#a9b0ba');page.y+=30;
  };
  newPage(true);
  for(const [index,row] of card.rows.entries()){
    const header=()=>{
      const names=wrapCardText(`${String(index+1).padStart(2,'0')}  ${row.name}`,content,31);
      const meta=wrapCardText([row.muscles,row.equipment].filter(Boolean).join(' · '),content,21);
      const height=names.length*44+meta.length*30+15;
      if(page.y+height+74>maxHeight-110)newPage();
      page.parts.push(`<path d="M64 ${page.y}H1016" stroke="#343c45"/>`);page.y+=20;
      line(`${String(index+1).padStart(2,'0')}  ${row.name}`,31,'#f3f4f5',700);line([row.muscles,row.equipment].filter(Boolean).join(' · '),21,'#a9b0ba');page.y+=10;
    };
    header();
    for(const raw of row.lines){
      for(const value of wrapCardText(raw,content-24,27)){
        if(page.y+40>maxHeight-110){newPage();header();}
        page.parts.push(text(value,88,page.y+28,27,'#dfe3e8'));page.y+=39;
      }
    }
    page.y+=25;
  }
  if(!card.rows.length)line('완료한 세트가 없어요.',28,'#a9b0ba');
  return pages.map((p,i)=>{
    const height=Math.max(1350,Math.ceil(p.y+115));
    return {width,height,svg:`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" fill="#12171c"/><g font-family="${font}">${p.parts.join('')}${text('기록한 중량 기준 · 워밍업/보조중량/유산소는 중량 볼륨 제외',64,height-62,18,'#88939e')}${text(`KEEP GOING.  ${i+1} / ${pages.length}`,64,height-29,18,'#88939e')}</g></svg>`};
  });
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
