# Public API

Downstream modules should use the stable API published at:

```js
const api = game.modules.get("naruto-d20")?.api;
```

Read this API after Foundry's `setup` hook has fired. Top-level imports or top-level module code
may run before `naruto-d20` publishes the API, so consumers should access it from their own
`setup`, `ready`, or later hook handlers.

The surface is intentionally small and additive. Treat the returned object as read-only; it is
frozen to prevent accidental replacement of public functions or constants by consumers.

Current downtime surface:

- `attemptLearnTechnique(item)`
- `attemptMasterTechnique(item)`
- `buildLearningView(item, actor, mode?)`
- `buildMasteryView(item, actor, mode?)`
- `isTechniqueEffectivelyLearned(item)`
- `listLearnable(actor)`
- `listMasterable(actor)`
- `TECHNIQUE_ITEM_TYPE`
