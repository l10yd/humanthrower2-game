# MVP — checkpoint 2: регрессии и late-session CPU/render

> Этот checkpoint исторический. Следующее продолжение и текущие полные gates: [MVP_CHECKPOINT_3.md](MVP_CHECKPOINT_3.md).

## Область

Default `demo/twitch`, где NPC не встают. Технические fixtures сохраняются отдельно, не подменяют default acceptance. Предыдущий этап и контракт: [MVP_PLAN.md](MVP_PLAN.md). Рабочие изменения локальны, commit/push/deploy не выполнялись.

## Сделано

### Регрессии

- Тесты пилы/weapon UI больше не ждут оружие со старта. Toolbox выдаётся явно, selection/menu/input/visual проверки сохранены.
- Targeted knockdown открывается с `?debug`: кнопка `#impact` скрыта в обычном HUD. Автоматические chaos allocations отключены только в этом fixture.
- Saw pile mass accounting включает `lastCut` и guard cuts без двойного счёта. Старый тест пропускал removed mass двух защитных срезов; mass equality проверка не ослаблена.
- Saw-grace fixture явно включает collected/active saw и не разворачивает её горизонтально axis до первого upward interception.
- Индикатор durability имеет фиксированную ширину. Это настоящий UI fix: длина текста больше не сдвигает `next-weapon`.
- KCC browser pile использует original `PhysicsManager(false,11)` и player-after-pile allocation, как unit-аналог. Исходный closed default с capsule-before-drops изменял contact ordering/траектории: это не тот же fixture. Assertions 66 sleeping, 20 jumps на NPC, IDs/joints/mass, penetration<.06, v<25/ω<35 сохранены; новый test name раскрывает область.
- Правила records assertion импортируются из current `RULES_VERSION`, вместо старой жёсткой строки 3.2.

### Исправление настоящего crash после смерти

Полный browser run обнаружил `Cannot read properties of undefined (reading 'body')`:

1. ROW_CLEAR уничтожает связную vital основу.
2. `syncDamage` оставляет `ragdoll.parts=[]`, `dead=true` и отдельные живые physics debris.
3. `burstPlayer → prepareRowDeath → prepareDeath` считал пустой articulation отсутствующим исходным телом и пытался вызвать `knockDown` с уже отсутствующими конечностями.
4. Пустой factory plan доходил до чтения `pelvis.body`.

`prepareDeath` теперь materializes rig только при `!down && !dead`. Уже уничтоженное тело не восстанавливается и не строится заново. Existing death chunks/limbs остаются; depleted vital fragments могут по прежнему контракту раздробиться. Тест `tests/physics/row-death.test.ts` сначала воспроизвёл exception, затем PASS; browser fatal row проходит DYING/pause/result lifecycle.

### Render batching крови

`BloodDecals`:

- exact clipped body-local geometry и индивидуальные colors/poses сохранены;
- один world-space dynamic buffer рисует все body stains одним Mesh/draw call;
- исходные Mesh entries доступны diagnostic path, обычно hidden;
- buffer capacity растёт powers-of-two и освобождает old geometry/GPU buffers;
- orphan/split/remap/off/dispose поддержаны;
- если transforms и capped drying ages не меняются, повторной записи/upload нет;
- diagnostic `batching=false` позволяет pixel equality comparison.

Новый browser fixture: 64 clipped body stains на 8 вращённых деталях. **−63 draw calls**, max pixel difference ≤1, GL error=0. Старый blood-follow/remap/off test PASS. Unit проверяет transforms/colors/material ownership и отсутствие повторного upload при unchanged state.

### Occupancy fast path

`OccupancyRaster` теперь проверяет half-space distances по существующим face corners перед `clip()`:

- полностью внутри → тот же hull;
- полностью снаружи → null;
- пересекает плоскость → прежний exact clipper.

Пороги и порядок predicates те же, crossing clipping/density/physics не меняются. Это устраняет повторное O(V²) vertex welding для 6 arena planes/row planes, которые hull не пересекает. Diagnostic `fastClipping=false` сохраняет reference algorithm.

Equality fixture: 40 rotated/cut hulls у depth/floor/top boundaries; map/stable/overflow/row coverage/criticalColumns совпадают побитово. Cached/player-exclusion/arcade row tests PASS.

## Замеры

Ryzen 5 5600, production build, headless Chromium/SwiftShader; **не reference GPU/FPS**.

### Один и тот же frozen 30s seed 17

147 частей, 6 sleeping, 111 body stains, одинаковые scene/shadow triangles:

| Метрика | До batch | После batch |
|---|---:|---:|
| Scene calls | 316 | 206 |
| Shadow calls | 157 | 157 |
| Total incl composite | 474 | 364 |
| Scene triangles | 12857 | 12857 |
| Shadow triangles | 7194 | 7194 |

Render CPU p95 в отдельных noisy прогонах ~3,6–3,7 мс. Draw calls снижены доказанно; proportional FPS gain не обещается. В другом 60s final snapshot calls ~496: гораздо больше уникальных fragments, это не тот же stress state.

### Occupancy, paired 30s bot pass

До/после fast clipping, те же 2 ряда/max193 parts/итоговые trajectories:

- mean по **всем** 1800 ticks: 0,673→0,432 мс;
- p95 по всем ticks: 5,3→3,5 мс;
- p99: 9,3→5,8 мс;
- max: 13→10 мс.

Эти значения включают ticks без measurement; actual-invocation p95 ниже не смешивать с ними.

### Новый production profiler runner

`npm run profile:default -- test-results/default-profile.json`

- Собирает production `dist`, поднимает временный HTTP server, закрывает browser/server в `finally`.
- Defaults: seeds17/42/93/20261111, до60с simtime. Env `HUMANTHROWER_PROFILE_SECONDS`, `HUMANTHROWER_PROFILE_SEEDS` позволяют bounded reruns.
- Default art/shaft/twitch/Full blood, direct fixedUpdate bot без RAF/render в timed simulation.
- Rolling600 **invocation** samples на label; occupancy/squeeze count означает реальные calls, не zeros на 60Hz.
- Checkpoints каждые10s, state/parts/sleeping/joints/geometry/gore, result/velocities/cull, final frozen render counters.
- Вложенные metrics не складывать. Это диагностический runner, не автоматическая физическая/FPS приёмка.

Два60s-limited runs:

| Метрика | Seed17 | Seed20261111 |
|---|---:|---:|
| Sim duration |60с, RUNNING|47,58с, SUFFOCATION|
| Max parts |256|219|
| Late physics p95 |18,0мс|18,6мс|
| Occupancy invocation p95 |7,0мс|6,8мс|
| Squeeze invocation p95 |7,2мс|10,1мс|
| Row clear max |22,8мс|22,5мс|
| Won-QTE player p95 |1,2мс|не достигнут|
| Late total p95 |23,9мс|28,2мс|
| Max angular |2221,70рад/с|5733,83рад/с|

Отсутствие exceptions/NaN не означает stable physics. Главный подъёмный bottleneck устранён, но solver/squeeze/cut tails превышают desired budgets. Следующий ROI — чистые query/preparation costs и remaining draw calls, отдельно от native solver R&D.

## Проверки

- `npm run build`: PASS.
- Полный unit run: **421/422 PASS**, единственный FAIL original angular gate **82,8237 >35**. Ни thresholds, ни solver package/dt/contacts/мasses/CCD не изменены.
- Полный browser run: **122/126 PASS за18мин**, завершён корректно. Было3 arcade-actions failures (2 old armed default +1 true row-death crash) и1 `chaos-long` strict angular failure79,6223>35.
- После3 исправлений: arcade-actions3/3 PASS и checkpoint15/15 browser PASS (batch/blood/rowdeath/KCC/weaponUI/production shader).
- **Не объявляем125/126 full PASS:** весь набор после последнего row-death fix повторно не запускался. Неустранённый technical `chaos-long` остаётся строгим красным.
- 8 recovery/saw-pile/weaponUI targeted PASS; 2 KCC PASS; остальные поправленные scenarios проходят в последнем full run.

## Среда и cleanup

При разборе таймаутов обнаружены orphaned Playwright/Vite процессы от наших прежних внешне остановленных runs. Они были точечно завершены по PID/command line. Пользовательские5173/5174 и чужой5200 не трогались. Это часть причины деградации test timings; не доказанный runtime bug игры. Последний full run получил достаточный внешний timeout и завершился сам.

## Осталось для MVP

1. Squeeze/recovery path и cut preparation tails; snapshots/versioning при Worker preparation.
2. Remaining scene/shadow submission calls на unique fragments.
3. Финальный full browser после последних fixes; strict unit/angular и technical chaos-long не green.
4. Native stability lane: продолжить уже существующие causal traces с ограниченным budget; не повторять rejected patches.
5. Exact dynamic-placement safety arcade ejection.
6. Реальные аппаратные FPS/GPU, mobile profile/device/browser matrix, human balance/readability, memory slope и Netlify HTTPS smoke.

**MVP не объявлен готовым.** Этот checkpoint закрыл явные regressions и улучшил CPU/render без подмены геометрического gameplay.
