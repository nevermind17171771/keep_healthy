# KEEP HEALTHY 4.5 — rest feedback and detailed workout images

The prior rest alert could disappear as a short toast and its audio path skipped suspended or interrupted contexts. The new completion banner is independent of playback and persists until dismissal. A local PCM boxing bell uses media playback with a bounded Web Audio fallback, with interrupted contexts recreated. Cancellation invalidates pending playback. Settings exposes persistent test results and a five-second foreground countdown.

Repetitions now have accessible +/- controls in both focused and full workout views. Saved images contain every completed set and actual recording units, separate warmup/cardio totals, weighted volume, completion, entered RPE, a comparison with the prior same-equipment/same-gym workout, and the same front/back muscle map as the home screen. Long records paginate rather than truncate.

PNG files are prepared before the share gesture so iOS user activation is retained. The native share sheet offers the device's image-saving actions, with a visible PNG and large-image fallback. The app does not claim direct Photos access or successful saving after the share sheet closes.

A browser QA finding also required a secure UUID fallback for local HTTP previews: getRandomValues produces v4 identifiers when randomUUID is unavailable. Production authentication and record ownership are unchanged.

## Verification

- TypeScript check and automated regression suite, including calculations, audio rejection/interruption/cancellation, and long-card pagination.
- Managed browser: five-second completion banner remains visible; dismiss and +/- actions; completed workout image preview.
- Production build and Workers/D1 smoke checks.

## Limits and phone checks

- No durable server-scheduled push exists in this deployment. JavaScript and service workers cannot schedule a dependable short rest alarm after the OS suspends the app. Background notification delivery is best effort while code remains executable.
- Browser automation cannot prove sound was heard or that a phone photo was saved. On the phone, use Settings → 앱처럼 사용하기: bell test (three strikes), notification/banner test (OS permission and immediate notification), then five-second test while visible.
- iPhone: open the home-screen app, allow notifications, then card → 사진 저장 · 이미지 공유 → 이미지 저장. Verify the PNG in Photos. Android share destinations and long-press save labels vary by device.
- A passing notification test does not verify background scheduling; focus modes, volume/output routing and OS notification preferences can affect presentation.
