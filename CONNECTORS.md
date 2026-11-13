# Объёмы соединений частей: технический контракт

## Назначение

Один joint anchor не доказывает наличие ткани вокруг сустава: срез может пройти рядом с anchor, но всё равно удалить соединение. `ConnectorVolume` задаёт выпуклый объём прикрепления в локальных координатах **обоих** rigid bodies. Это проверочные метаданные, а не дополнительный collider или источник массы.

Реализация: `src/physics/Connector.ts`. Поля `Joint.connector`, `Joint.frameA`, `Joint.frameB` необязательны. Старые greybox NPC без таких метаданных сохраняют прежние правила. Никакие connector volumes автоматически не придумываются для production-моделей.

## Авторинг

- `connector.a` и `.b` — замкнутые convex polyhedra в неизменном локальном reference frame соответствующей части.
- Каждый объём должен содержать свой anchor с допуском1мм. Geometry validate проверяет конечность, положительный объём, замкнутость и выпуклость.
- `frameA/B` — конечные unit quaternions, задаваемые перед angular limits/motors.
- Геометрическое соответствие ткани render/collision hull должно проверяться при авторинге. Текущая runtime schema **не доказывает** совпадение connector surface с будущим GLB и не проверяет все художественные pivots.
- `RagdollOptions.connectors` — ReadonlyMap с ключом `parentLimb:childLimb`, например `chest:head`. Эти полигональные объёмы заданы в немасштабированных координатах базового шаблона. Factory масштабирует x/y/z вместе с частями и anchors до создания world; исходные метаданные не мутируют.
- Общая масса NPC не меняется от наличия метаданных. Если connector показывает ткань, отсутствующую в collider hull, авторинг ещё не завершён — нельзя считать этот объём физически добавленным.

## Разрез

- Для бесконечной полосы вычисляются точные projection extrema вершин connector в world direction. Положительная толщина пересечения с удаляемой полосой разрывает связь; простое касание границы не разрывает.
- Политика намеренно консервативна: любое пересечение authored attachment volume уничтожением отключает joint. Это не алгоритм расчёта минимальной оставшейся прочности или связности частично надрезанного сустава.
- `clearRows` проверяет connector даже если ни один endpoint hull не изменился. При такой операции сохраняются оба тела и масса; удаляется только joint, score объёма не добавляется.
- Connector-only удаления входят в тот же prepare/stage/commit barrier. Ошибка allocation другой части не разрывает исходный joint и не меняет transaction sequence.
- Пила проверяет свой kerf; укус Сварла — удаляемую slab portion. Уцелевшая связь сохраняет connector metadata и authored angular frames после remap.
- Соединения без метаданных используют прежний greybox anchor / segment policy, без скрытого изменения баланса.

## Проверено / ещё открыто

`tests/physics/connectors.test.ts` (8cases) и `tests/browser/connectors.spec.ts`: connector-only rowcut, survivors/frame/limit remap, atomic failure, sawkerf/bite tissue, scale/source immutability/mass, badmetadata rollback, rotated world projection/tangency.

**Не завершено:** authored объёмы всех10суставов, GLB↔metadata validator, joint-frame options всей asset pipeline, UV interpolation / cap textures, vertex budget и полный destructive-failure matrix. Gate2/art не закрыты. Следующий независимый шаг — бюджет вершин/треугольников и полный валидатор ассета. UV interpolation/cap projection уже реализованы, контракт и ограничения — [SURFACES.md](SURFACES.md); это не готовые художественные текстуры.
