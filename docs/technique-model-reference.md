# Técnica: modelo, UI e runtime

Este documento resume o que fica salvo no `system` da technique, o que é calculado em runtime e como isso aparece na ficha e no browser do compendium.

## Resumo executivo

- A ficha da technique mistura dados persistidos com valores derivados.
- Os números exibidos na sidebar, como `Learn DC`, `Perform DC`, `Threshold` e `Successes`, são recalculados em runtime e não são fonte de verdade.
- `system.derived` é uma view runtime/prepared: ele existe para leitura pela UI e pelos fluxos de uso/aprendizado, mas seus valores não devem ser salvos no JSON da technique.
- A fonte de verdade continua sendo os campos base persistidos: `rank`, `complexity`, `descriptors`, flags especiais (`isHijutsu`, `isKinjutsu`, `isCombination`), `mastery` e os estados de `learning.*` / `masteryLearning.*`.
- O browser do compendium não carrega a ficha completa: ele usa um índice compacto do pack para filtrar e listar as técnicas.
- Ao abrir uma técnica no browser, o documento completo é carregado e a ficha passa a usar `derived` e os helpers de learning/mastery.

## Tabela de referência

| Área | Campo / valor exibido | Origem | Runtime? | Observação |
|---|---|---|---|---|
| Sidebar da ficha | `Learn DC` | `system.derived.learnDC` | Sim | View runtime calculada a partir de `rank`, `complexity` e flags/descriptors; não persistir. |
| Sidebar da ficha | `Perform DC` | `system.derived.performDC` | Sim | View runtime calculada a partir de `rank`, `complexity` e modificadores do modelo; não persistir. |
| Sidebar da ficha | `Threshold` | `system.derived.skillThreshold` | Sim | View runtime derivada de `rank` + complexidade; não persistir. |
| Sidebar da ficha | `Successes` | `learning.requiredSuccesses` | Sim | Vem do helper `buildLearningView`, que usa o valor derivado e possíveis overrides. |
| Sidebar da ficha | `Learning X/Y` | `learning.progress` / `learning.targetProgress` | Parcial | O progresso é salvo; o alvo é calculado em runtime. |
| Sidebar da ficha | badge `Learned` | `learning.effectivelyLearned` | Sim | Derivado do estado salvo e da disciplina resolvida. |
| Sidebar da ficha | badge `Learned via Empathy` | `learning.learnedViaEmpathy` | Não | Estado persistido em `system.learning`. |
| Sidebar da ficha | bloco de mastery `step → nextStep` | `mastery.step` / `mastery.nextStep` | Sim | `mastery.step` vem de `system.mastery`; `nextStep` é calculado. |
| Sidebar da ficha | mastery `progress / targetProgress` | `mastery.progress` / `mastery.targetProgress` | Parcial | Progresso salvo; alvo derivado ou override. |
| Sidebar da ficha | mastery `attempts`, `insight`, `trainingBlocks`, `chakraSpent`, `AP` | `mastery.*` | Não | São campos salvos em `system.masteryLearning`. |
| Sidebar da ficha | `hasComponents` | combinação de `system.comp*` | Sim | A UI decide a lista de componentes com base nos booleanos salvos. |
| Sidebar da ficha | `discipline`, `rank`, `complexity` | `system.discipline`, `system.rank`, `system.complexity` | Não | São dados base do item. |
| Sidebar da ficha | `descriptors` | `system.descriptors` | Não | Persistido; também influencia o cálculo de `derived`. |
| Sidebar da ficha | `chakraCost` | `system.chakraCost` | Não | Persistido. |
| Sidebar da ficha | componentes (`Hand Seals`, `Focus`, etc.) | `system.compHandSeals`, `system.compFocus`, etc. | Não | Persistidos e mostrados diretamente. |
| Browser do compendium | filtros `discipline`, `rank`, `complexity` | índice do pack (`system.discipline`, `system.rank`, `system.complexity`) | Não | O browser consulta só o índice compacto, não a ficha completa. |
| Browser do compendium | filtros `Special` e `Components` | índice do pack (`system.isHijutsu`, `system.comp*`) | Não | O filtro é feito com flags e componentes já indexados. |
| Browser do compendium | `threshold` em empathy mode | `computeSkillThreshold(system)` | Sim | Calculado localmente no browser para mostrar o custo em Empathy Points. |
| Browser do compendium | nome, imagem e disciplina/rank | `entry.name`, `entry.img`, `entry.system.*` | Não | Vêm do índice do pack carregado com `pack.getIndex(...)`. |

## O que é salvo no `system`

Os dados persistidos da technique incluem, entre outros:

- `description.value`, `description.summary`, `description.instructions`
- `tag`, `tags`, `flags.boolean`, `flags.dictionary`
- `showInQuickbar`, `showInCombat`
- `scriptCalls`
- `active`, `changes`
- `links.prerequisites`, `links.supplements`, `links.children`
- `discipline`, `subtype`, `descriptors`, `rank`, `complexity`, `mastery`
- `learning.*` e `masteryLearning.*`
- `isHijutsu`, `isKinjutsu`, `isCombination`
- `chakraCost`, `activation`, `range`, `target`, `area`, `duration`, `save`
- `compHandSeals`, `compHalfSeals`, `compConcentration`, `compMobility`, `compFocus`, `compEmpower`, `compMastery`, `compExpendable`, `compPhysical`, `compXpCost`
- `performMiscBonus`
- `actions`
- `uses.*`
- `automation.enabled`, `automation.targetMode`

## O que é calculado em runtime

Estes valores são dados derivados. Eles devem ser recalculados a partir dos campos base sempre que a ficha, o uso da technique, o learning flow ou o mastery flow precisarem deles. Não grave estes valores em `item.system.*`; se algum fluxo precisar alterar o resultado, altere a fonte de verdade ou use os overrides já modelados.

`computeTechniqueDerived(system)` é a função pura central para esses números. O getter `system.derived` delega para ela, e callers que só têm dados compactos do índice do compendium também devem usar a mesma função para evitar duplicação de regra. Ela recomputa sempre:

- `learnDC`
- `performDC`
- `successes`
- `successModifier`
- `skillThreshold`
- `masteryPerform`
- `masteryLevel`
- `masterySaves`

Além disso:

- `buildLearningView(...)` calcula `requiredSuccesses`, `targetProgress`, `effectivelyLearned`, `derivedSuccesses`, `maxAttempts` e campos derivados de leitura.
- `buildMasteryView(...)` calcula `step`, `nextStep`, `targetProgress`, `derivedSuccesses`, `canMaster` e o `learnDC` específico do mastery flow.

## Fluxo de UI

1. O browser do compendium carrega apenas o índice compacto do pack.
2. A lista usa `discipline`, `rank`, `complexity`, flags especiais e componentes para filtrar.
3. Ao abrir uma técnica, a ficha completa é renderizada.
4. A sidebar da ficha lê `system` salvo e combina isso com `derived`, `buildLearningView` e `buildMasteryView`.

## Arquivos de referência

- [`scripts/data/technique-model.mjs`](../scripts/data/technique-model.mjs)
- [`scripts/data/technique-defaults.mjs`](../scripts/data/technique-defaults.mjs)
- [`scripts/ui/technique-sheet.mjs`](../scripts/ui/technique-sheet.mjs)
- [`scripts/ui/technique-browser.mjs`](../scripts/ui/technique-browser.mjs)
- [`scripts/learn-technique.mjs`](../scripts/learn-technique.mjs)
- [`scripts/master-technique.mjs`](../scripts/master-technique.mjs)
