# MVP — checkpoint 10: recovery route blockers и целостность anchored islands

**Область:** продолжение A–C. Этап D не выполнялся. Production использует тот же Rapier 0.21.0, geometry/mass/inertia/CCD/joint limits и два solver substeps 1/120 на game tick 1/60. Rules остаются `3.9-dynamic-destination-recovery`: принят узкий bug fix целостности island, новый path planner **не принят**. A–C и stable MVP всё ещё не завершены.

## 1. Принятый production fix: нельзя перемещать subset связной island

При подготовке ejection старая строка фильтровала connected parts по `owner==='npc' && body.isDynamic()`. Если dynamic часть соединена с fixed/kinematic частью, фильтр выбрасывал anchor и переводил оставшийся subset. Это растягивает сохранённый joint, хотя контракт обещает перемещать island целиком.

Red→green regression воспроизвёл impulse 14 Н·с вместо 0 на двух jointed частях с fixed anchor. Теперь:

1. Connected island читается целиком и целиком помечается visited.
2. Если любой member не dynamic NPC, collider отключён или sensor — island не переводится частично, `blockedIslands` увеличивается.
3. Все IDs, geometry, masses, joint и body snapshot сохраняются. Player win/handoff следует прежнему blocked contract.

Fixed и kinematic anchor сценарии проверяются отдельно. Original one/two/three-NPC, roof, amputee, row-cut, subsequent QTE fixtures проходят. Никакие velocity clamps, fake sleep или deletion не добавлены.

## 2. Read-only capture: почему прежний path veto застревал

Новый `RecoveryRouteProbe.ts` проверяет предложенный translation по exact current colliders и записывает initial distance/separating direction/TOI. Проба не меняет poses, forces, sleeping state или masks.

Изолированный Playwright config `playwright.recovery.config.ts` запускает natural seed 93 и захватывает **первый** recovery barrier:

- time **18,9333 с**;
- world **116 частей / 55 joints**;
- мешающая island: **7 parts**, IDs 71,72,73,74,75,76,83;
- endpoint candidate delta **(0; 2,6; 0,34308) м**;
- **13 path blockers**, включая initial penetrations и новые obstacles между endpoints.

Примеры:

| Pair | Starting contact | Path rejection |
|---|---:|---:|
|71→108|−0,001742 м|separating projection −0,47256; TOI 0|
|74→207|−0,000309 м|projection −0,54023; TOI 0|
|76→82|−0,002691 м|projection −1,38829; TOI 0|
|72→124|нет start contact|TOI 0,09024|
|72→220|нет start contact|TOI 0,16334|
|83→129|нет start contact|TOI 0,42455|

Это показывает, что просто проверять free endpoint недостаточно, а запрет translations блокирует QTE по реальным dynamic препятствиям, не только из-за stale broadphase/GJK-start.

Read-only initial separating-plane diagnostic (`scripts/analyze-recovery-routes.mjs`) проецирует предложенный delta на текущие нормали. На выбранном порядке planes delta сходится к почти нулю: последний сохранённый magnitude <1e−6 м. **Это не математическое доказательство отсутствия любого маршрута**, не LP certificate и не full rotational-path analysis. Оно объясняет, почему один большой translation одной island не подходит в этом месте.

Исходный full snapshot/capture хранится ignored `.pi/mvp10-route-capture.json`; hash и выбранные plane/TOI данные сохранены в `tests/fixtures/recovery-route-barrier.json`. Обычные tests не требуют ignored artifact.

## 3. Новый coordinated multi-island translation candidate

`CoordinatedRecovery.ts` — **read-only diagnostic planner**, не вызывается обычным `ForcedRecovery`.

Для каждого детерминированного candidate:

1. Начать с полной connected island.
2. Проверить feasible x/y/z translation region всей группы; oversized/unknown или mixed anchored island — veto.
3. Проверить destination против recovery volumes.
4. Пройти exact fixed-orientation casts и endpoint contacts относительно остальных colliders.
5. Встреченный dynamic NPC obstacle добавить **вместе со всеми connected members** к общей группе, повторить checks на увеличенной группе.
6. Fixed/kinematic/non-NPC obstacle не добавлять; он запрещает маршрут.
7. При завершении closure вернуть read-only plan. Intra-cluster relative poses/уже существующие overlaps при общей translation не меняются.

Это arcade batch planning, не force-driven physical simulation и не обещание полного angular/static path safety игрока. Player geometry при NPC planner excluded: clearance игрока требует отдельной согласованной trajectory проверки, поэтому даже локальный plan не закрывает C.

### Бюджет и результат

Первый вариант включения coordinated search в natural recovery не завершил diagnostic до **прежних 90 с**. Timeout не увеличен; вариант отключён, production endpoint behavior восстановлен. Не объявляем, что timeout доказывает отсутствие пути.

Новый read-only probe ограничен **2000 narrow-operation work units**, порядок не зависит от часов. Лимит — только эксперимент; обычный production search не получает hardware-dependent timeout.

На том же natural barrier:

- **1999 work units**;
- **87 candidates / 101 closure rounds**;
- elapsed около **17,6 мс** (diagnostic, не asserted timing);
- **budget exhausted**, `plan=null`;
- snapshot до/после byte-identical.

`plan=null` здесь означает **не найдено в заданном бюджете**, а не «маршрута не существует». Кандидат не внедрён: слишком дорого для tick и не имеет natural recovery/world-safe proof.

### Сохранённые проверки

- Две jointed parts соседней island добавляются целиком.
- Цепь нескольких отдельных islands даёт повторяемый closure/delta.
- Static thin barrier не становится movable member.
- Mixed fixed/dynamic и oversized island не переводятся.
- Budget exhaustion не возвращает unchecked plan и не меняет world.
- Probe различает initial penetration и later swept obstacle, исключает sensors/group members.

`PhysicsManager.recoveryTranslationCheck` — optional isolated hook, undefined по умолчанию и очищается при dispose. Hook нужен для точного capture существующего barrier; не применяет solver/contact setting overrides. Coordinated planner и probe не входят в обычный production module graph. Shipping change только bug fix anchored island и no-op hook.

## 4. Gates

- **Build/TypeScript PASS**.
- **Full unit 481/483 PASS**, only original normal angular **82,824>35** и whole-world thin **59,993>25 / 1465,402>35**. Thresholds и failures не excluded/expected-fail.
- **Full Chromium browser 129/130 PASS**, завершён за14,1мин; only прежний technical chaos-long angular **79,622>35**.
- Focused recovery/balance/ragdoll/saw/profiler **10 browser PASS**; isolated route capture PASS означает snapshot neutrality/recorded failure, не safe route acceptance.
- `test:demo` после fullrun: **30unit+20browserPASS**; no stability acceptance claim.
- Last checkpoint9 CPU optimizations сохранены; новой solver/engine adoption нет.
- D hardware/reference matrix, mobile, GPU timers, human sessions, memory slope и remote HTTPS не выполнялись. Commit/push/deploy не выполнялись.

## 5. Оставшийся blocker

C continuous dynamic placement/path safety остаётся открытым. Следующая реализация должна искать согласованные маршруты/последовательность нескольких islands либо требовать отдельно согласованного recovery policy change. Ещё один blanket veto, увеличение timeout или перевод нескольких bodies сквозь препятствия не закрывают этот gate.

Strict solver stability и B late-session acceptance также остаются открытыми; этот checkpoint устранил конкретное нарушение целостности island и сохранил более точную воспроизводимую границу исследования, а не объявил A–C готовыми.
