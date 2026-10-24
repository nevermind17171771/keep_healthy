'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { BellPlayer } from './bell-player';
import { REST_KEY, readRest, restSeconds, showRestNotification, type RestTimer } from './rest-timer';

export function useRestTimer(sessionId: string | undefined, ready: boolean) {
  const [timer,setTimer]=useState<RestTimer|null>(null),[now,setNow]=useState(Date.now());
  const [soundStatus,setSoundStatus]=useState(''),[notificationStatus,setNotificationStatus]=useState('');
  const current=useRef<RestTimer|null>(null),player=useRef<BellPlayer|null>(null),attempted=useRef(0),notified=useRef(0);
  const getPlayer=useCallback(()=>player.current ||= new BellPlayer(),[]);
  const update=useCallback((next:RestTimer|null)=>{
    current.current=next;setTimer(next);
    try{if(next&&!next.test)localStorage.setItem(REST_KEY,JSON.stringify(next));else localStorage.removeItem(REST_KEY);}catch{}
  },[]);
  useEffect(()=>{
    if(!ready)return;
    let saved=null;try{if(sessionId)saved=readRest(localStorage.getItem(REST_KEY),sessionId);}catch{}
    attempted.current=0;notified.current=0;update(saved);setNow(Date.now());
  },[sessionId,ready,update]);
  useEffect(()=>{
    const tick=()=>setNow(Date.now());
    const visibility=()=>{tick();if(document.visibilityState==='visible'&&current.current&&!current.current.soundPlayed)attempted.current=0;};
    const id=setInterval(tick,250);
    window.addEventListener('pageshow',visibility);document.addEventListener('visibilitychange',visibility);
    return()=>{clearInterval(id);window.removeEventListener('pageshow',visibility);document.removeEventListener('visibilitychange',visibility);player.current?.dispose();player.current=null;};
  },[]);
  const finished=!!timer&&restSeconds(timer,now)===0;
  // Visual completion never depends on audio success or notification permission.
  useEffect(()=>{
    if(!finished||!timer||timer.dismissed)return;
    if(notified.current!==timer.end){
      notified.current=timer.end;
      if(document.visibilityState!=='visible')void showRestNotification().catch(()=>{});
    }
    if(!timer.soundPlayed&&attempted.current!==timer.end&&document.visibilityState==='visible'){
      attempted.current=timer.end;setSoundStatus('벨 재생 중');
      void getPlayer().play().then(ok=>{
        if(current.current?.end!==timer.end)return;
        setSoundStatus(ok?'벨 재생을 요청했어요. 소리가 안 들리면 아래 버튼을 눌러 주세요.':'소리 재생이 막혔어요. 아래 ‘벨 울리기’를 눌러 주세요.');
        if(ok)update({...current.current,soundPlayed:true});
      }).catch(()=>{if(current.current?.end===timer.end)setSoundStatus('벨 울리기를 눌러 소리를 켜 주세요.');});
    }
  },[finished,timer,now,getPlayer,update]);
  const begin=(seconds:number,test=false)=>{
    if((!sessionId&&!test)||seconds<=0)return;
    const p=getPlayer();p.stop();p.prime();attempted.current=0;notified.current=0;setSoundStatus('');
    const time=Date.now();setNow(time);update({sessionId:sessionId||'rest-test',end:time+seconds*1000,length:seconds,test});
  };
  const adjust=(seconds:number)=>{
    if(!current.current)return;
    const p=getPlayer();p.stop();p.prime();attempted.current=0;notified.current=0;
    const time=Date.now();setNow(time);update({...current.current,end:Math.max(time,Math.max(time,current.current.end)+seconds*1000),soundPlayed:false,dismissed:false});
  };
  const testSound=async()=>{
    setSoundStatus('벨 재생 중');
    const p=getPlayer();p.prime();const ok=await p.play();
    setSoundStatus(ok?'벨 재생을 요청했어요. 복싱 벨이 3번 들리는지 확인해 주세요.':'소리를 재생하지 못했어요. 기기 음량을 올린 뒤 다시 눌러 주세요.');
  };
  const testNotification=async()=>{
    try{
      if(!('Notification' in window)){setNotificationStatus('이 브라우저는 시스템 알림을 지원하지 않아요. iPhone은 Safari에서 홈 화면에 추가한 앱으로 열어 주세요.');return;}
      const permission=Notification.permission==='granted'?'granted':await Notification.requestPermission();
      if(permission!=='granted'){setNotificationStatus('알림이 허용되지 않았어요. 휴대폰 설정 → 알림에서 KEEP HEALTHY의 알림을 허용해 주세요.');return;}
      const ok=await showRestNotification(true);
      setNotificationStatus(ok?'테스트 알림을 보냈어요. 배너·알림센터를 확인해 주세요. 집중 모드와 기기 설정에 따라 배너가 생략될 수 있어요.':'알림 준비가 끝나지 않았어요. 앱을 다시 열고 테스트해 주세요.');
    }catch{setNotificationStatus('시스템 알림을 표시하지 못했어요. 홈 화면 앱과 휴대폰 알림 설정을 확인해 주세요.');}
  };
  const cancel=()=>{getPlayer().stop();update(null);setSoundStatus('');};
  const dismiss=()=>{getPlayer().stop();if(current.current)update({...current.current,dismissed:true});};
  return {restEnd:timer?.end||0,restLength:timer?.length||90,restRemaining:restSeconds(timer,now),finished:finished&&!timer?.dismissed,soundStatus,notificationStatus,start:(seconds:number)=>begin(seconds),adjust,cancel,dismiss,testSound,testNotification,testCountdown:()=>begin(5,true)};
}
