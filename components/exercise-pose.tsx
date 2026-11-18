'use client';
import { useId, useState, useSyncExternalStore } from 'react';
import { ImagePlus } from 'lucide-react';
import exercisePoses from '@/lib/exercise-pose-map.json';
const catalogPoses: Readonly<Record<string, { file:string }>> = exercisePoses;
import { getPose, storePoses, subscribePoses } from '@/lib/local-poses';

function usePose(name: string) {
  return useSyncExternalStore(subscribePoses,
    () => getPose('personal:' + name) || getPose(catalogPoses[name]?.file ?? ''),
    () => undefined);
}
export default function ExercisePose({name, size = 'small'}: {name: string; size?: 'small' | 'large'}) {
  const url = usePose(name);
  return url ? <img className={`exercise-pose exercise-pose-${size}`} src={url} alt={`${name} 자세`} loading="lazy" decoding="async"/> : null;
}
export function PersonalPose({name}: {name: string}) {
  const [status, setStatus] = useState('');
  const id = useId();
  return <div className="personal-pose"><ExercisePose name={name} size="large"/><label className="secondary pose-file" htmlFor={id}><ImagePlus size={16}/>이 운동 사진 선택</label>
    <input id={id} className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" onChange={async e => {
      const file = e.target.files?.[0]; e.target.value = '';
      if (!file) return;
      if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 8 * 1024 * 1024) {
        setStatus('8MB 이하의 PNG·JPEG·WebP 사진을 선택해 주세요.'); return;
      }
      setStatus('사진을 확인하는 중…');
      try {
        const picture = await createImageBitmap(file);
        const ratio = Math.min(1, 960 / Math.max(picture.width, picture.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(picture.width * ratio)); canvas.height = Math.max(1, Math.round(picture.height * ratio));
        const ctx = canvas.getContext('2d');
        if (!ctx) { picture.close(); throw new Error(); }
        ctx.drawImage(picture, 0, 0, canvas.width, canvas.height); picture.close();
        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/webp', .84));
        if (!blob) throw new Error();
        await storePoses(new Map([['personal:' + name, blob]]));
        setStatus('이 기기에 사진을 저장했어요.');
      } catch { setStatus('사진을 읽거나 저장하지 못했어요.'); }
    }}/>{status && <p className="micro" role="status">{status}</p>}</div>;
}
export function PoseImport({catalog}: {catalog: string[]}) {
  const id = useId();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const loaded = useSyncExternalStore(subscribePoses,
    () => catalog.filter(name => getPose('personal:' + name) || getPose(catalogPoses[name]?.file ?? '')).length,
    () => 0);
  return <section className="panel"><h3>운동 자세 이미지</h3><p className="subtext">이 기기 {loaded}/{catalog.length}개 등록 · Fleek 3.7.46에서 확인된 {Object.keys(exercisePoses).length}개 종목을 한 번에 가져올 수 있어요.</p>
    <p className="micro">받아둔 파일을 선택하면 이미지 파일만 이 기기에 저장해요. 설치, 계정 동기화, 서버 업로드는 없어요. 다른 종목은 운동 상세에서 사진을 추가할 수 있어요.</p>
    <label className="secondary pose-file" htmlFor={id} aria-disabled={busy}>XAPK / APK 선택</label>
    <input id={id} className="sr-only" type="file" accept=".xapk,.apk,application/zip,application/vnd.android.package-archive" disabled={busy} onChange={async e => {
      const file = e.target.files?.[0]; e.target.value = '';
      if (!file) return;
      setBusy(true); setStatus('이미지 파일을 확인하는 중…');
      try {
        const {readPoseArchive} = await import('@/lib/pose-archive');
        const images = await readPoseArchive(file, (n, total) => setStatus(`읽는 중 · ${n}/${total} 이미지`));
        await storePoses(images);
        setStatus(`자세 이미지 ${Object.keys(exercisePoses).length}개 종목을 저장했어요.`);
      } catch (error) {
        setStatus(error instanceof Error && error.message.startsWith('지원하는 ') ? error.message : '이미지를 읽거나 저장하지 못했어요. 저장 공간과 브라우저를 확인해 주세요.');
      } finally { setBusy(false); }
    }}/>
    {status && <p className="micro" role="status">{status}</p>}</section>;
}
