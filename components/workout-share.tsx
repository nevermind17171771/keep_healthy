'use client';
import { useEffect, useMemo, useState } from 'react';
import { Share2, ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './ui/dialog';
import { workoutCardData } from '@/lib/workout-card';
import { workoutCardPages, renderWorkoutCard } from '@/lib/workout-card-image';
import type { AppState, Session } from '@/lib/model';
export default function WorkoutShare({state,session,onClose}:{state:AppState;session:Session;onClose:()=>void}){
  const data=useMemo(()=>workoutCardData(state,session),[state,session]);
  const pages=useMemo(()=>workoutCardPages(data),[data]);
  const [index,setIndex]=useState(0),[prepared,setPrepared]=useState<{file:File;url:string}|null>(null),[error,setError]=useState(''),[hint,setHint]=useState(''),[sharing,setSharing]=useState(false);
  useEffect(()=>{
    let disposed=false,url='';setPrepared(null);setError('');setHint('');
    void renderWorkoutCard(pages[index]).then(blob=>{
      if(disposed)return;
      url=URL.createObjectURL(blob);
      setPrepared({file:new File([blob],`keep-healthy-${data.date}${pages.length>1?`-${index+1}`:''}.png`,{type:'image/png'}),url});
    }).catch(()=>{if(!disposed)setError('이미지를 만들지 못했어요. 카드를 닫았다 다시 열어 주세요.');});
    return()=>{disposed=true;if(url)URL.revokeObjectURL(url);};
  },[pages,index,data.date]);
  // Prepare the PNG before the tap so iOS transient user activation survives.
  const share=()=>{
    if(!prepared||sharing)return;
    if(!navigator.canShare?.({files:[prepared.file]})||!navigator.share){setHint('이 브라우저는 이미지 공유를 지원하지 않아요. 아래 이미지를 길게 누르거나 ‘이미지 크게 열기’에서 사진 저장을 선택하세요.');return;}
    setSharing(true);setHint('');
    void navigator.share({files:[prepared.file]}).then(()=>setHint('공유창에서 선택한 사진 앱을 확인해 주세요. 앱에서는 저장 여부를 확인할 수 없어요.')).catch(e=>{
      if(e?.name!=='AbortError')setHint('공유창을 열지 못했어요. 이미지를 길게 누르거나 ‘이미지 크게 열기’를 이용해 주세요.');
    }).finally(()=>setSharing(false));
  };
  return <Dialog open onOpenChange={open=>{if(!open)onClose();}}><DialogContent className="app-dialog workout-share-dialog"><DialogTitle>나의 오운완 카드</DialogTitle><DialogDescription>완료한 세트와 오늘 운동한 부위를 이미지로 남겨요.</DialogDescription>
    <div className="photo-save-guide"><strong>사진첩에 저장하기</strong><p>아이폰: 아래 버튼 → 공유창에서 <b>이미지 저장</b> → 사진 앱에서 확인</p><p>안드로이드: 공유창에서 사진·갤러리 앱을 선택하세요. 저장 메뉴는 기기마다 달라요.</p></div>
    <button className="primary full" disabled={!prepared||sharing} onClick={share}><Share2 size={19}/>{sharing?'공유창을 여는 중':'사진 저장 · 이미지 공유'}</button>
    {pages.length>1&&<div className="card-page-controls"><button className="secondary" aria-label="이전 카드 이미지" disabled={index===0} onClick={()=>setIndex(i=>i-1)}><ChevronLeft size={18}/></button><span>{index+1} / {pages.length}장 · 각 이미지를 저장해 주세요</span><button className="secondary" aria-label="다음 카드 이미지" disabled={index===pages.length-1} onClick={()=>setIndex(i=>i+1)}><ChevronRight size={18}/></button></div>}
    {hint&&<p className="card-save-hint" role="status">{hint}</p>}
    {error?<p role="alert">{error}</p>:prepared?<><a className="card-image-link" href={prepared.url} target="_blank" rel="noopener noreferrer" aria-label="오운완 카드 이미지 크게 열기"><img src={prepared.url} alt={`${data.date} ${data.name}: ${data.workSets}세트, ${data.durationMinutes}분의 세트별 기록과 근육 지도`}/></a><a className="secondary full" href={prepared.url} target="_blank" rel="noopener noreferrer"><ImageIcon size={18}/>이미지 크게 열기</a><p className="micro">이미지를 길게 눌러 사진 저장 메뉴를 열 수도 있어요. 공유창에서 ‘파일에 저장’ 대신 ‘이미지 저장’을 선택하세요.</p></>:<p role="status">세트별 기록과 근육 지도로 이미지를 만드는 중이에요…</p>}
  </DialogContent></Dialog>;
}
