# MVP — checkpoint 6: unique hull batching, HUD, dynamic destinations и physics no-go

**Область:** оставшееся A–C по `MVP_PLAN.md`; D не выполнялся. Production Rapier `0.21.0`, массы/inertia, geometry, CCD, joints, fixed `1/60` + `2×1/120` не менялись. Recovery contract изменён явно, records **`3.9-dynamic-destination-recovery`**. **A–C не объявлены полностью закрытыми.**

## 1. Реализовано

### Unique fragment scene/shadow batching

`PartBatches` сохраняет instancing одинаковых hulls и объединяет уникальные opaque hulls по material/layout/render flags. Positions/normals/UV/colors/caps остаются local; четыре per-vertex transform attributes используют исходный world matrix в surface/Lambert/depth shader. PS1 jitter по local position не превращается в world-space noise. Нет изменения mesh topology/colliders, quantization, deletion или fake sleep.

- Трансформы неподвижной пачки не загружаются повторно.
- Topology/material смена пересоздаёт собственный buffer/material; borrowed source geometry не dispose-ится.
- Shadow proxy использует тот же transform buffer; caster count учитывает представленные детали, frustum culling local aggregate отключён.
- Diagnostic unbatched path, caps, Full/Off blood, restart/dispose сохранены.
- Indexed merged geometry содержит исходные triangles; pixel max difference≤1, packed depth error<1e−6, physics snapshots unchanged.
- Старый browser pixel test брал `takeSnapshot()` внутри проверки каждого byte: заменён одним read-only snapshot, без ослабления assertion.

Final production frozen seed17/30s: **170 physics parts +11 player visuals**, 115 body stains. Exact paired render: **434→108 total calls**, scene/shadow triangles **12284/9980** одинаковые; frozen render CPU p95≈**2,2мс**, transform uploads0. Это тот же snapshot с batching OFF/ON, **не** paired comparison с историческими147parts/364calls. После recovery safety естественная траектория другая.

### Presentation cadence

`HudCadence` ограничивает heavy QTE/tutorial/weapons/chaos DOM updates 30Hz, state transition refresh немедленный. UI публикуется после соответствующего scene render, чтобы banner не опережал hazard lane. Sleeping statistics не обходят parts в обычном HUD. Fixed simulation/input/audio clocks не throttled. Unit240Hz cadence и browser warning/pause/tutorial/weapons проходят.

### Dynamic recovery destination safety

`ejectRecoveryDebris` теперь проверяет конечные poses всей island против остальных dynamic/kinematic colliders. Query barrier пересоздаётся после перемещения island, чтобы следующая island не попадала внутрь уже перемещённой. Fixed parts, зарегистрированные в parts, тоже участвуют в static veto.

Каждый ordered candidate проектируется в feasible containment region **всей** island: settled rotated bounds, слегка выступившие за floor/depth wall, теперь могут получить совместный x/y/z correction. Geometry/mass/joints и relative poses сохранены; ejection velocity7м/с направлена по итоговому delta. Registry/candidate order детерминирован, wall-clock budget отсутствует.

Если destination нет, `blockedIslands` сообщает это; won straightening **не движется в занятый pose и не делает KCC handoff**. Сохранены QTE win, retained kinematics, tissue; active stroke clock приостанавливается на fixed ticks и продолжается после освобождения. Счётчик `recoveryBlockedSeconds` отделён от активной1s straightening. Nonfatal row cut сохраняет актуальный deadline; обычные unobstructed one-second assertions не изменены.

Unit cases: occupied preferred destination; две successive islands; dynamic enclosure no-destination; QTE stop/resume без tissue loss; original roof/1–3NPC/row-cut/moving/weapon fixtures. Natural seed93 получает небольшой verified blocking pause — fixture проверяет **active stroke≤1+1/60** и отдельно reported blocked time. Это явное изменение records, не скрытое увеличение старого timeout.

**Не закрыто:** непрерывный dynamic path/sweep через кучу и full angular/static path safety. Endpoint-safe arcade translation по-прежнему не равна physical continuous sweep. Попытка добавлять общий intermediate static veto блокировала original foot/platform fixtures; не внедрена. Contract не преувеличивает результат.

## 2. Actual RAF + hardware workload (B, не D)

`npm run profile:stress -- <output>` запускает production dist с настоящим RAF/render/fixed loop. По умолчанию SwiftShader; `HUMANTHROWER_STRESS_HARDWARE=1` запускает headed Chromium без software flags. Bot edges определяются simulation input tick, не RAF number. Сбор graph не меняет bodies/sleep; считает joint+actual solver-contact connectivity, **не native solver island internals**. Browser/server cleanup `finally`.

Измерено Ryzen5 5600 / **RTX5070Ti D3D11**, default art/shaft/twitch/Full blood, requested60s, seeds17/42:

| Метрика |17|42|
|---|---:|---:|
| Natural game duration |35,98с|19,58с|
| Wall duration с death phase |38,00с|21,61с|
| Observed RAF |59,57FPS|59,89FPS|
| droppedTime |0|0|
| Final total calls |108|103|
| Render CPU p95 |3,4мс|2,1мс|
| maxv / maxω |54,99 /210,71|23,16 /387,49|
| Final active/sleeping |169/14|113/7|
| Contact pairs /solver points |303/938|190/555|
| Largest graph island |159parts|97parts|

Seed17 physics invocation p95 at10/20/30s: **3,3/5,1/8,2мс**, fixedTotal p95 **7,3/9,0/13,5мс**. DroppedTime не рос в наблюдавшемся отрезке, но смерть завершила оба окна до60s; late performance/stability acceptance **FAIL/open**, не «60FPS PASS». Новая команда return1 при open/failed local gates; software/headless никогда не hardware acceptance. GPU timer queries, agreed reference hardware и D matrix не выполнены.

**Повторный stress gate:** `.pi/mvp6-hardware-stress-gates.json` дал215,18/224,49observedRAF, droppedTime0/0,0209с, до natural defeat26,75/19,58с; calls98/103, renderp952,6/2,2мс. Browser/display RAF schedule не фиксирован, поэтому предыдущие59,57/59,89 не универсальныйFPS. Новый run всё равноFAIL: strictphysics, censored60swindow, occupancy>2мс иseed17sampledclear>8мс. Нет GPUtimers/referenceacceptance. Эти два отчёта **не** используются как обещание аппаратных60FPS при lateworstcase.

Raw reports `.pi/mvp6-default-profile-final.json`, `.pi/mvp6-hardware-stress-final.json`, `.pi/mvp6-hardware-stress-gates.json`. Основные данные сохранены здесь; `.pi` не production dependency.

## 3. Bounded thin impulse + global convergence spike

Использован archived isolated `mvp5-impulse-package` без нового native patch, без изменения исследовательских sources и production dependency. Этот archive отличается от позднего exact-refinement fixture; результаты не смешиваются. PGS1/4/8/16 изменяются **только в restored replay**.

|Case|PGS|Public worldω|Candidate worldω|Candidate worldv|
|---|---:|---:|---:|---:|
|110joint|1|82,824|47,710|13,475|
|110joint|4|36,988|30,980|12,942|
|110joint|8|35,436|28,513|12,853|
|110joint|16|31,056|33,167|12,862|
|102thin|1|1465,402|18,866|59,993|
|102thin|4|1406,447|18,866|59,993|
|102thin|8|1377,146|18,866|59,993|
|102thin|16|1365,102|18,865|59,993|

Observer OFF/ON states и serialized snapshot exact; traces not truncated. Joint one-step при4PGS проходит35, thin incident тоже проходит, **whole thin world провален поv25** (в snapshot уже есть сторонний fast body).

Самая дешёвая promising combination4PGS проверена на **неизменённых** original20drops + KCC17/42: **worldω90,840>35**, v19,105, оба KCC теряют required support. Physics p95≈20,4мс vs current original≈8–9мс. **Комбинация отвергнута, natural candidate runs не запускались после явных world regressions.** Никакого production iterations increase/adoption.

Git-visible harness: `scripts/diagnose-impulse-convergence.mjs`, explicit `vite.convergence.config.ts`, isolated setup; evidence fixture `impulse-convergence-rejection.json` и2tests. Ordinary tests требуют committed fixture, не ignored native archive/toolchain.

## 4. Явное архитектурное решение (C)

**NO-GO для promotion текущего Rapier exact pipeline как устойчивого MVP.** Следующий шаг — не повторять one-row caps/eigenframe/current-anchor/pose-only/impulse-step+PGS rejected patches.

Выбран безопасный контракт на этой ветке:

1. **Extreme thin survivors сохраняются с исходной геометрией/массой/inertia.** Не применять minimal thickness proxy, inertia inflation, culling, velocity clamps, fake sleep или «растворение» без acid event. Такой compromise требует отдельного согласования gameplay/records.
2. Production остаётся pinned public Rapier; строгие `<25m/s /<35rad/s` не считаются пройденными. Добавлен явный **красный** whole-world thin acceptance test в ordinary unit/check/MVP gate; прежний green causal reproduction не заменяет stability assertion.
3. Архитектурный путь для следующей реализации — **изолированный CPU-engine/solver comparison** на exact joint/thin fixtures и unchanged20drop/KCC/cut/contact gates, затем решение о замене. Движок не выбран/не установлен/не объявлен лучше без измерений.
4. Worker — отдельный performance этап после versioned state/geometry protocol. Текущий solver уже превышает budget; перенос не исправляет divergence и не должен менять tick/geometry contract. В этом проходе Worker не реализован, пунктB остаётся открыт.
5. Если требуется завершить C с stable gameplay сейчас, нужна отдельная большая solver/engine работа либо согласованное изменение tiny collision policy. **Чекбоксами этот блок не закрываем.**

## 5. Проверки и текущая честность gates

- Build/TypeScript PASS.
- Final unit **447/449PASS**, два failingtests: original angular82,824>35; whole-world thin59,993>25и1465,402>35. Новый thin test проверяет обе причины soft assertions, но сам test красный, неskip/expectedFail.
- `test:demo`: **30unit +20browserPASS**; `test:performance`: **2browserPASS**. Это mechanics/bounded work, не stableMVP.
- Full browser run после production edits: **126/128PASS**, original chaos-long angular79,622FAIL, targeted ragdoll fixture зависел от RAF/poll pause pose.
- Ragdoll fixture затем сделан deterministic fixed tick при сохранённой real impact action/IDs/pause/screenshot/win/normal walk assertions; **3/3 повторных targetedPASS**. Full suite после этого test-only change не повторялся; не выдаём127/128 за fresh full run.
- Ранее full run125/128 нашёл HUD banner/render race и natural blocking contract assertion; оба исправлены, targeted10/10PASS и затем full regression их подтвердил.
- После fullrun последний runtime change только diagnostic counter: blockedSeconds теперь cumulative per-player, чтобы nonfatal rig rebuild не терял elapsed blocking. Build и focused25unit+3browserPASS; полныйunit/browser после этого счётчика не повторялись.
- Stage D: smartphone, browser/device matrix, GPU timings/reference acceptance,10human sessions, memory slope, remote Netlify HTTPS — **не выполнялись**. Commit/push/deploy не выполнялись.
