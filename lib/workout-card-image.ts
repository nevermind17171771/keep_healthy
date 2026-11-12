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
/** Fixed single image with a large muscle hero and roomy two-column summaries. */
export function workoutCardPages(card:WorkoutCard):CardPage[]{
  const width=1080,height=1920,parts:string[]=[];
  const text=(value:string,x:number,y:number,size=36,color='#f6f2eb',weight=400)=>`<text x="${x}" y="${y}" font-size="${size}" fill="${color}" font-weight="${weight}">${escape(value)}</text>`;
  const fit=(value:string,w:number,size:number)=>{const lines=wrapCardText(value,w,size);return lines.length>1?lines[0].slice(0,-1)+'…':lines[0];};
  // Wrap on word boundaries first; Korean muscle/exercise names should not break mid-word.
  const lines=(value:string,w:number,size:number,max=2)=>{
    const words=value.split(/\s+/),out:string[]=[];let line='';
    for(const word of words){const next=line?line+' '+word:word;if(wrapCardText(next,w,size).length>1&&line){out.push(line);line=word;}else line=next;}
    if(line)out.push(line);
    return out.slice(0,max).map((v,i)=>fit(v+(i===max-1&&out.length>max?' …':''),w,size));
  };
  parts.push('<defs><radialGradient id="hero"><stop stop-color="#263135"/><stop offset="1" stop-color="#10171b"/></radialGradient></defs><rect width="1080" height="1920" fill="#10171b"/>');
  parts.push('<rect x="64" y="60" width="12" height="30" rx="6" fill="#f16b59"/>',text('KEEP HEALTHY',94,85,29,'#f6f2eb',750),text(card.date,790,85,27,'#a1adb1'));
  parts.push(text('오늘 운동, 완료.',64,215,94,'#f6f2eb',750),text(fit(card.name,950,35),68,278,35,'#a1adb1'));
  parts.push('<ellipse cx="345" cy="570" rx="330" ry="285" fill="url(#hero)"/>',`<g transform="translate(44 312)">${muscleMapSvg(card.primary,card.secondary,590,510)}</g>`);
  const stat=(value:string,unit:string,label:string,y:number)=>{
    parts.push(text(label,716,y,28,'#a1adb1'),text(value,710,y+88,82,'#f6f2eb',700),text(unit,714,y+128,28,'#a1adb1'));
  };
  stat(String(card.durationMinutes),'분','운동 시간',358);stat(String(card.workSets),'세트','본·드롭 세트',552);
  parts.push(text('중량 볼륨',716,746,28,'#a1adb1'),text(fit(new Intl.NumberFormat('ko-KR',{maximumFractionDigits:0}).format(card.volume),300,46),714,805,46,'#f16b59',700),text('kg·회',716,846,26,'#a1adb1'));
  const groups:Record<string,string>={chest:'가슴','front-deltoids':'어깨','side-deltoids':'어깨','back-deltoids':'어깨',triceps:'삼두',biceps:'이두',lats:'등','upper-back':'등',trapezius:'승모근','lower-back':'허리',quadriceps:'대퇴사두',hamstring:'햄스트링',gluteal:'둔근',adductors:'내전근',calves:'종아리',abs:'복근',obliques:'복근',forearm:'전완'};
  const targets=[...new Set(card.primary.map(id=>groups[id]).filter(Boolean))];
  parts.push(text('● 주동근',64,887,25,'#f16b59'),text('● 보조근',220,887,25,'#d5ab65'));
  parts.push(text(fit(targets.slice(0,6).join(' · ')+(targets.length>6?` · 외 ${targets.length-6}부위`:'')||'지정된 주동근 없음',950,34),64,950,34,'#c5ced0',550));
  parts.push(text('오늘의 운동',64,1025,31,'#a1adb1'),text(`${card.rows.length}종목`,904,1025,29,'#f16b59',650));
  const shown=card.rows.slice(0,8),rows=Math.ceil(shown.length/2),tileHeight=rows<=3?224:178,gap=18;
  shown.forEach((row,i)=>{
    const x=64+(i%2)*486,y=1056+Math.floor(i/2)*(tileHeight+gap),w=468;
    parts.push(`<rect x="${x}" y="${y}" width="${w}" height="${tileHeight}" rx="22" fill="#1b2429"/>`);
    const nameLines=lines(row.name,414,34);
    nameLines.forEach((v,j)=>parts.push(text(v,x+26,y+40+j*40,34,'#f6f2eb',650)));
    const summaryLines=lines(row.summary,414,30);
    const summaryY=y+tileHeight-20-(summaryLines.length-1)*36;
    summaryLines.forEach((v,j)=>parts.push(text(v,x+26,summaryY+j*36,30,'#b8c4c9')));
  });
  if(!shown.length)parts.push(text('완료한 본세트가 없어요.',64,1130,40,'#a1adb1'));
  const omitted=card.rows.length-shown.length;
  parts.push(text(omitted?`외 ${omitted}종목 · 전체 기록은 앱에서 확인`:'작은 기록이 쌓여, 더 강한 내일로.',64,1860,27,'#a1adb1'));
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
