# MVP — checkpoint 3: squeeze/clear CPU и полный regression gate

**Область:** default `demo/twitch`, без вставания NPC. Продолжение [MVP_PROGRESS.md](MVP_PROGRESS.md). Gameplay masses, timestep, Rapier package, joints, CCD и строгие stability thresholds не менялись. Commit/push/deploy не выполнялись.

## 1. Что исправлено

### Pure translation не должна считаться вращением

`RecoverySweep.ts` вычислял угол как `2 acos(abs(dot(q1,q2)))`. Два одинаковых Rapier float32 quaternion могут иметь `dot(q,q)<1`; pure translation попадала в angular sampling.

Новый regression сначала воспроизвёл **13 castShape вместо1** на одинаковом q. Сейчас exact q/q или q/−q идёт в translational path, без изменения положения/orientation. Неодинаковые rotations по-прежнему проверяются angular sweep; initial penetration sampling, floor endpoint, obstacle/tunneling gates сохранены.

Для pure translation bounds теперь точный union endpoint AABBs с тем же conservative padding, а не bounding sphere для всех возможных rotations. Offset/rotated hull bounds покрывают каждый промежуточный pose; tests PASS.

### Recovery destination использует один query barrier

`PlayerRagdoll.recoveryTarget` мог создавать отдельный `CollisionQuery` для capsule и каждой из11 limbs, если вызывался вне `player.update` (например, из `SqueezeProbe.measure`/handoff). В test это **12 обходов мира**.

Теперь один local read-only collider snapshot на решение; при доступном non-static barrier он переиспользуется. Static-only вариант имеет отдельный корректный фильтр. World-step/topology/pose edits не пересекаются с lifetime barrier. Regression требует1 `forEachCollider`; QTE/roof/clearance tests PASS.

### Срез не готовит один collider дважды

`ClearTransaction` сначала вызывал `prepareCollider` и выбрасывал descriptor, затем staged `createPart` повторял validation/QuickHull. На2 survivor fragments это было4 expensive preparations.

Первый дублирующий проход убран: каждая survivor geometry валидируется и получает collider в атомарном stage до удаления оригиналов. Ошибки на любой allocation/prepare откатывают stage. Regression требует2 prepares на2 fragments; late-prepare-failure test проверяет сохранение оригинального sleeping body/pose/velocity/sequence и успешный retry.

### Далёкие детали не проходят slab clipping

- Вычисляются local y-plane min/max по существующим face corners.
- Если ни один row interval не пересекает hull, meaningful part пропускается до welding/subtractSlabs.
- Numerical tolerance и local plane arithmetic согласованы со старым clipper.
- Старый conjunctive dust cleanup сохранён: tiny-volume **и** sub15mm fragment может удалиться даже вне row, long thin strip остаётся.
- `belowFragmentScale` сначала проверяет volume и не welds vertices для очевидно крупных частей.
- Lost-support wake использует cached component members вместо parts×supports nested scan.
- `clearQueries` counters доступны в debug snapshot/production runner.

Regression:300 distant sleeping parts +1 cut part — только1 clipped part; IDs/sleep всех300 сохранены. Atomic allocation/joint failure matrix проходит.

## 2. Замеры до/после

Production dist, Ryzen5 5600, Chromium/SwiftShader, same bot inputs, seeds17/20261111. 60s-limited simulation без RAF/render внутри CPU loop. Rolling600 invocation samples, occupancy/squeeze не padded нулями.

| Метрика | Seed17 до | Seed17 после | Seed20261111 до | Seed20261111 после |
|---|---:|---:|---:|---:|
| Squeeze mean |2,10мс|1,57мс|2,85мс|1,98мс|
| Squeeze p95 |7,20мс|4,70мс|10,10мс|7,20мс|
| Squeeze max |12,30мс|8,90мс|14,90мс|10,80мс|
| RowClear mean |18,70мс|14,56мс|14,20мс|7,00мс|
| RowClear max |22,80мс|22,10мс|22,50мс|9,70мс|
| Late fixedTotal p95 |23,90мс|24,20мс|28,20мс|27,60мс|

**Не преувеличивать эффект:**

- RowClear всего5/2 события в сессии, это малая выборка; p95 практически max. Нужна отдельная cut stress scene, чтобы принять target≤8мс.
- Общий late tick существенно не ускорился в этих шумных замерах: solver доминирует. Не обещаем прирост FPS на основе query timings.
- Sim time, rows, maxParts и observed velocity peaks совпали:
  - seed17:60с/RUNNING/5rows/max256/ω2221,70;
  - seed20261111:47,58с/SUFFOCATION/2rows/max219/ω5733,83.
- Это подтверждает отсутствие видимой trajectory regression в двух probes, **не** закрывает stability gate.
- Squeeze/cut бюджеты всё ещё частично выше TDD targets. CPU improvements позволяют лучше разделить application overhead и solver cost.

Сырые paired reports `.pi/mvp2-default-profile.json`, `.pi/mvp3-prepared-profile.json`. Основные числа сохранены здесь, `.pi/` ignored.

## 3. Проверки

- Build production + TypeScript: PASS.
- Полный unit/physics run: **427/428 PASS**; единственный FAIL original angular **82,8237рад/с >35**. После этого добавлен1 late-prepare rollback test, focused3/3 PASS; полный unit после него ещё не повторён.
- Полный browser suite завершён: **125/126 PASS за18,3мин**.
- Единственный browser FAIL — `chaos-long.spec.ts`: historical technical stress peak **79,6223рад/с >35**. Порог не ослаблен, test не excluded/skip. Default natural peak problems остаются и отдельно показаны выше.
- Focused23 browser scenarios recovery/death/atomicity/pause/records/tutorial/offscreen: PASS.
- Red→green tests: same quaternion1cast; one decision barrier; no double survivor preparation.
- Allocation rollback/geometry budgets/player retained tissue/zero-leg/roof/repeat-QTE: PASS в targeted и full suites.

## 4. Что это значит для готовности

Обычные UI/recovery/death/assets/geometry регрессии закрыты в свежем полном browser run. Главный общий красный gate — реальная физическая устойчивость, а не устаревшие меню/tests.

MVP **не принят**: normal-pile angular gate и natural tiny/contact peaks открыты, late solver/frame budget не выдержан на данном CPU profile. Не заменять это зелёным125/126 или отсутствиемNaN.

## 5. Следующий этап

1. Отдельный bounded physics R&D проход: актуальные traces из `NATIVE_PHYSICS.md`, без повторения rejected patches и production promotions до unchanged acceptance.
2. Exact dynamic placement safety arcade recovery, если стабильная демка требует отсутствия новых overlaps.
3. Default active/sleeping/contact workload policy только как явно versioned контракт, не hidden fake sleep/deletion/clamps.
4. Worker для чистой geometry preparation/simulation — после определения budgets и versioned state protocol, не как «исправление solver».
5. Remaining unique-fragment scene/shadow submission calls и real hardware GPU timing.
6. Mobile/device/browser matrix,10human sessions, memory slope, Netlify HTTPS smoke.

Переход к solver теперь обоснован: application bottlenecks уменьшены, reproduction/strict tests доступны. Правильный результат следующего spike может быть как patch с доказательствами, так и явная архитектурная развилка — не бесконечное кручение параметров.
