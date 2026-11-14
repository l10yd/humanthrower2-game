# Итог сессии: ревизия → работа над MVP → кислотное событие

## Что сделано

1. **Ревизия проекта:** полный подробный [DEMO_AUDIT.md](DEMO_AUDIT.md) — GDD/TDD, фактический default, готовность, остаток, CPU/GPU/Worker, измерения и трудозатраты.
2. **Актуальный план:** [MVP_PLAN.md](MVP_PLAN.md), ссылки в GDD/TDD/README, явный arcade recovery contract, не смешанный с историческими override.
3. **Главный тормоз подъёма:** AABB narrow-phase rejection, cached connected member lists, единичные shape/pose reads; default seed17 player-won-QTE p95 **29,3→1,2мс**, mean **16,1→0,69мс**, fulltick mean **26,3→10,6мс** (no render CPU diagnostic).
4. **Collision queries и load:** uniformgrid для repeated local queries, conservative unknown/large fallback, registry order, same decision barrier; solver/gameplay mass одним traversal, без повторного подсчёта в одном tick.
5. **Безопасность recovery:** ejection destinations не могут оказаться выше чаши; retained mass/joints/parts сохраняются. Old100%win/staticroof/repeatedknockdown/rowcut/amputee cases покрыты.
6. **Squeeze/recovery-path:** identical float32 quaternion не вызывает13angularcasts; tight fixed-orientation sweptAABBs; один recoveryTarget query snapshot вместо12worldscans. Squeeze p95 **7,2→4,7мс /10,1→7,2мс** на двух60s-limited probes.
7. **Cut preparation:** дальние meaningfulparts отсекаются доslab/weld, colliderprepare один раз вместо двух; dustpolicy/atomicstage/rollback сохранены. Rowclear mean **18,7→14,6мс /14,2→7,0мс**, малая выборка5/2events не выдаётся заperformanceacceptance.
8. **Кровь/render:** bodydecals sharematerial и one dynamicdrawbuffer, individualclipping/drying/poses сохранены.64stains дают−63calls, pixel equalityPASS. Natural147parts/111stains frozen30s totalcalls **474→364**. Unchangedposes/ages не повторяютbufferupload.
9. **Профилирование:** `?profile`, bounded600samples; `npm run profile:default` productiondefaultbot, checkpoints/CPU/render/work counters; неGPU/FPSclaim.
10. **UX:** rowhatch/borders/countdown/simulation-timeSFX; небольшойcharacterlightingboost дляпрежнегопорогавидимости; fixedwidthdurability предотвращаетсдвигкнопок.
11. **Tooling/deploy:** assetCLI безVite-server/watchers (~11,9→3,2с); boundedunitworkers безthresholdincrease; revalidatecache длястабильныхassets вместогодовогоimmutable.
12. **Настоящий crash:** fatalrowбезretainedvitalcomponent больше не пытаетсяrespawnemptyragdoll; physicalsurvivors/deathpause/resultсохранены.
13. **Regression cleanup:** тесты согласованы сunarmedstart,2sdeath,currentrecords/debugUI; sawmassaccounting включаетguardcuts, исходныйKCCfixture сопоставлен сunitopen11arena. Strictcaps неослаблены.
14. **NativeR&D:** causalobserver/substepequations, PGSexperiment,currentanchorcandidate,impulse-stepcandidate/refinement. Локальный thinpeak1465→18,87рад/с у последнегокандидата, ноworldregressions108рад/с/30м/с → **кандидатыотвергнуты**. Ниодинне внедрён, nativeисходникивосстановлены; tests/fixtures/analysis сохраняютотрицательныерезультаты.
15. **Кислота:** по последнемузапросу eighthrandomeventeligible≥100parts, warning2s, poolmax1,6м,duration8s, dissolvedsubmergeddebris,wakesupports, playerdamage/ACIDdeath, pause/restart, recordsv3.8. Подробно [ACID_EVENT.md](ACID_EVENT.md).

## Проверки перед push

- Productionbuild +TypeScript PASS.
- Финальныйunit **438/439PASS**; единственный прежнийstrictnormalangularFAIL82,824>35.
- Финальныйdemogate **30unit+20browserPASS**, кислота включена вкоманду.
- Последнийполныйbrowserдоacid **125/126PASS**, толькоtechnicalchaosangular79,622>35. Полныйbrowserпослеacid не повторялся, targetedacid/death/recordsPASS.
- GitdiffcheckPASS; secret/service/generateddirectories excluded by`.gitignore`.

## Что НЕ сделано

- Не объявленstableMVP: nativeangular/thinphysics иlateCPUbudgets ещё открыты.
- НетGPUphysics/Workerrewrite; physicsмассы,CCD,суставы,timestep неупрощалисьрадиFPS.
- НетреальнойGPU/mobilematrix,humanbalance/longmemoryacceptance.
- ИсследовательскиеWASM/patches/logs подignored`.pi` не публикуются и не являютсяproductiondependencies. Freshcheckoutunitusescommittedfixtures.
- Netlifyautobuild configured onmain; Gitpush неравенпроверенномуremoteproductiondeploy.

Оператор попросил завершитьработунаэтомрелизе иpushallcurrentchanges. СледующуюMVPработув этойсессии не продолжаем.
