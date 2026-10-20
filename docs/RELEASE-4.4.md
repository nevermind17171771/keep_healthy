# KEEP HEALTHY 4.4 — workout continuity

- Persist an immutable sync outbox before upload. Retry the same mutation ID after timeouts or app suspension; the API acknowledges an already committed operation without another revision increment.
- Store the last acknowledged baseline. Merge non-overlapping record and set edits; retain manual review for competing values. Preserve completed workouts, start timestamps, and unsent edits. Older cache recovery only infers continuation when previously recorded values remain intact.
- Serialize startup, focus, online and visibility sync. A Web Lock permits one editing window per browser. Account changes cannot upload the prior account's queued records.
- Prefill actual weight/repetition inputs from the latest completed work sets for the same exercise, gym and equipment, including zero values. Extra sets reuse the last recorded work set. Progression suggestions no longer change inputs automatically. Cardio totals remain blank.
- Display one rest timer in normal layout. Focus mode uses the inline rest controls above set completion and exercise navigation.
- Persist the device's rest deadline through reloads. Unlock mobile audio during a gesture, retry interrupted playback and expose bell/banner tests. Bypass all platform authentication routes in the service worker and show sign-in directly when synchronization receives a 401 or login redirect.

Background notification limitation: the current Sites deployment has no sub-minute durable scheduler for Web Push. OS notifications can be shown while the page is running and permission is granted; iOS may suspend the app, so exact-time banners or sound while locked/in another app are **not** guaranteed. No fake push subscription or background timeout is advertised as a reliable solution. Reliable background delivery requires a separately supported scheduled push backend (or native local notifications). Actual phone audio, notification permission and OS banner presentation still require device verification.

Database migration: append-only nullable mutation_id and mutation_hash columns. Existing workout data is unchanged. Old clients continue to use revision-based writes. New clients validate ownership and retry metadata.

Validation: synthetic API/SQLite tests cover lost acknowledgements, retries after restart, concurrent GET/edit, same-set conflicts, disjoint set merges, account isolation, failed persistence, old-cache continuation and workout prefill. The compiled Worker smoke test applies every migration and exercises authenticated/anonymous storage. No actual user workout data is used in tests.
