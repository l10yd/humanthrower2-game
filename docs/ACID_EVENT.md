# Кислотное событие / остановка MVP-прохода

По новому запросу solver R&D остановлен; выпускается текущая экспериментальная демка со всеми предыдущими CPU/render/UX fixes и новым событием кислоты.

## Кислота

- Восьмое случайное событие, выбирается обычным seeded director только если накоплено ≥100 физических частей.
- Не повторяется подряд; не пересекается с другим director event.
- Предупреждение2с: «КИСЛОТА СНИЗУ — ЗАБИРАЙСЯ ВЫШЕ».
-8с активной фазы:2с подъём,4с плато,2с уход. Максимум1,6м от пола16-рядной чаши.
- Жёлтая полупрозрачная лужа и светлая подвижная поверхность, без физических colliders и particle storm.
- Exposure проверяется10Гц. Погружённые NPC/свободные обломки растворяются после bounded exposure, детали выше жидкости не удаляются. Никаких новых fragment allocations.
- Удаление очищает реальные joints/registries/geometry usage и будит соседние опоры. Stains/wounds orphan cleanup обрабатывается существующим GoreSystem.
- Живой player articulation не удаляется как мусор: кислота повреждает находящиеся ниже поверхности анатомические части. Critical damage приводит к обычному DYING2с и причине «РАСТВОРИЛСЯ В КИСЛОТЕ». Прыжок/завал позволяют избежать контакта.
- Пауза замораживает таймер/exposure/урон; restart убирает pool/counters.
- Records version `3.8-acid-pile-event`, старые результаты не смешиваются.

Это **явное игровое растворение**, не скрытая performance-подмена старых meaningful-fragment guarantees. Улучшает расчистку нагруженной кучи только когда событие действительно происходит; не исправляет native solver и не гарантирует стабильныйFPS/MVP.

## Тесты

Targeted31unit PASS: eligibility/determinism/height/sleepingdebris/joints/wakeup/player/mode/records. Финальный `npm run test:demo`: **30unit +20browser PASS**, включаякислоту и4naturalbotruns. Финальный buildPASS. Общая unit battery **438/439PASS**, единственный прежний angular failure82,824>35; порог не изменён. Полныйbrowserпослекислоты не повторялся; последнийпредыдущий125/126PASS. Remote deployment не подтверждаетсяэтимилокальнымипроверками.

## Native research этого последнего прохода

Isolated impulse-step feasibility candidate использовал прежний native rotationcap и записывал фактически applied lambda одинаково для обоих тел, вместо постфактум velocityclamp. Localthin1465→18,87рад/с, exact89,6→2,83; но jointworld47,63>35 и20dropω108,08/v30,16>35/25. ДваKCCfixtures в refinedvariantPASS, worldgateFAIL → **не принят**. Первыйvariant ещё менял float32 unsaturatedlanes через algebraicreassociation, уточнённыйvariant сохранял ихbytes. Все3nativefiles восстановлены кobserverbaseline поSHA256; productionnpmdependency/solverparameters неизменны.

Git-visiblepureanalysis `scripts/impulse-step-analysis.mjs`, fixture/test `native-impulse-step-candidate.json`/`native-impulse-step.test.ts`; candidateWASM/patches/manifests подignored`.pi/native-build/mvp5-*`. Ниодиннеудачныйnativepatch не входит вигру.

## Статус

Релиз остаётся experimental demo. Strictnormalangular иtechnicalchaosstress gates не закрыты; последние research-onlyfullunit434/435PASS с82,824>35. Последнийfullbrowser125/126PASS с79,622>35. Послекислоты нужныfreshchecks; аппаратнаяGPU/mobile/humanacceptance не утверждается.

GitHub push выполняется по прямому запросу пользователя; `.pi`, `.netlify`, `.env`, logs иgeneratedtest/buildoutput excluded by`.gitignore`. Netlify настроен на автоматическуюсборкуmain; успешныйGitpush сампо себе не подтверждениезавершившегосяremote deploy.
