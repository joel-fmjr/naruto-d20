# Relatório: Técnicas e Buffs com Changes

Gerado em: 2026-06-01T21:30:41.549Z
> Arquivo gerado automaticamente por `tools/analyze-technique-buffs.mjs`. Não editar à mão — alterações são sobrescritas na próxima execução.

## Metodologia

### Scripts

| Arquivo | Papel |
|---|---|
| `tools/analyze-technique-buffs.mjs` | Gera este relatório. Lê os JSON-fonte de `packs/_source/techniques/` e `packs/_source/technique-buffs/`, casa técnica↔buff por nome, valida os `system.changes[].target` contra os targets do PF1e + módulo, e agrupa as pendências por disciplina. |
| `tools/buff-analysis-reviewed.json` | Rastreio de progresso. Lista disciplinas/técnicas já analisadas e deixadas sem buff (ou com buff vazio) de propósito, para não voltarem como pendência. |
| _gerador ad-hoc_ | Os itens de buff novos são criados por um script gerador pontual por batch (ex.: o usado no batch Taijutsu), modelado no buff de stance `KOUSEN RYU` (`subType: temp`, `duration: perm`, `_id` de 16 hex). |

### Fontes de validação

- Targets válidos PF1e: `docs/pf1-buff-changes-reference.md` (codificados em `EXACT_TARGETS` + `PATTERN_PREFIXES` no script).
- Targets do módulo: `scripts/flag-paths.mjs` → `BUFF_TARGETS` (chakra, learn checks, technique DC).

### Passos do fluxo de análise (por batch)

1. Rodar `node tools/analyze-technique-buffs.mjs` e abrir a Seção D para ver as disciplinas pendentes.
2. Extrair as descrições da disciplina-alvo (ex.: `node` lendo os fontes e despejando `name` + `system.description.value` sem HTML) e revisar uma a uma.
3. Decidir candidatos. Regra: só vira buff-com-change o efeito **persistente** com **bônus numérico explícito** no texto. Técnicas Strike (ataque único) ficam de fora — o bônus pertence à _action_ da técnica, não a um buff.
4. Criar os buffs (nome idêntico ao da técnica, para a automação casar) com os `changes` mapeados; deixar `changes: []` nos casos sem alvo limpo.
5. Registrar a varredura em `buff-analysis-reviewed.json` (disciplina inteira ou nomes avulsos) com uma nota da decisão.
6. Re-rodar o script: a Seção C deve seguir vazia (0 targets inválidos) e o batch aparece como revisado.
7. `npm run pack` + recarregar o Foundry para aplicar.

### Convenções de mapeamento

- "Defense" → `ac` (com o tipo de bônus citado: dodge/insight/untyped).
- "weapon damage/attack" → `wdamage`/`wattack`; "unarmed" → `mwdamage`/`mattack` (em PF1e o desarmado é ataque corpo-a-corpo de arma).
- "Balance"/"Tumble" (d20 Modern) → `skill.acr` (Acrobatics).
- "confirm critical hits" → `critConfirm`. Penalidades entram com formula negativa.

## Resumo

| Métrica | Valor |
|---|---|
| Técnicas totais | 1053 |
| Buffs totais | 41 |
| Técnicas com buff + changes válidas | 33 |
| Técnicas com buff sem changes | 7 |
| Técnicas sem buff | 1013 |
| Buffs com changes válidas | 34 |
| Buffs sem changes | 7 |
| Buffs com targets inválidos | 0 |

## Seção A — Buffs com changes válidas (34)

| Buff | Changes | Targets usados |
|---|---|---|
| CHACHA NO IN (DISRUPTION SEAL) | 3 | skill.ckc, skill.gnj, skill.nin |
| CHOUNOURYOKU (EXTRA-SENSORY PERCEPTION) | 1 | skill.sen |
| CHOUYAKU NO JUTSU (JUMP TECHNIQUE) | 1 | skill.acr |
| DAICHOUYAKU NO JUTSU (GREATER LEAP TECHNIQUE) | 1 | skill.acr |
| GOGYOU FUUIN (FIVE ELEMENT SEAL) | 1 | skill.ckc |
| GYOUKOU (GOOD FORTUNE) | 2 | allSavingThrows, attack |
| HENGE NO JUTSU (TRANSFORMATION TECHNIQUE) | 1 | skill.dis |
| HIKEN DACHI: YASEI KUMA (SECRET STANCE: WILD BEAR) | 2 | ac, mwdamage |
| HOKOJUTSU HIKEN: YABUKI DACHI (ARMED SECRET TECHNIQUE: SPIRITUAL DESTROYER STANCE) | 1 | wdamage |
| HYUUGA RYU: KEIKETSU KYUUJO (HYUUGA STYLE: NEEDLE POINT RELIEF) | 1 | skill.ckc |
| ISHIMARU RYU: NIDAN DACHI (ISHIMARU STYLE: SECOND STANCE) | 2 | mwdamage, mattack |
| ISHIMARU RYU: SANDAN DACHI (ISHIMARU STYLE: THIRD STANCE) | 3 | mwdamage, mattack, critConfirm |
| ISHIMARU RYU: SHODAN DACHI (ISHIMARY STYLE: FIRST STANCE) | 1 | mwdamage |
| KAI-MON KAI (INITIAL GATE RELEASE) | 3 | str, dex, landSpeed |
| KAMARATSU NO MAI (DANCE OF THE LARCH) | 1 | nac |
| Kanigakure Hiden: Raiton - Denki Shokku (Hidden Crab Secret: Lightning Release - Electric Shock) | 1 | mdamage |
| KATSUTAI NO JUTSU (SLIPPERY BODY TECHNIQUE) | 3 | skill.esc, cmb, cmd |
| KAWA NO YOROI (SKIN ARMOR) | 1 | nac |
| KEI-MON KAI (VIEW GATE RELEASE) | 3 | str, dex, landSpeed |
| KENJUTSU: DACHI - TENKEN (SWORD ART: STANCE - HEAVENLY BLADE) | 1 | ac |
| KENJUTSU: IAIDO (SWORD ART: IAIDO) | 1 | ac |
| KENSOKU: IAISOUKEN (SWIFT FISTS: TWIN UNDODGEABLE FISTS) | 2 | mattack, critConfirm |
| KYO-MON KAI (WONDER GATE RELEASE) | 7 | str, dex, landSpeed, init, skill.acr, skill.clm, skill.swm |
| KYU-MON KAI (HEAL GATE RELEASE) | 3 | str, dex, landSpeed |
| SEI-MON KAI (LIFE GATE RELEASE) | 3 | str, dex, landSpeed |
| SHINOBI NO JUTSU (INFILTRATION TECHNIQUE) | 1 | skill.ste |
| SHISUI DACHI (STILL WATER STANCE) | 1 | wdamage |
| SHOU-MON KAI (HARM GATE RELEASE) | 7 | str, dex, landSpeed, init, skill.acr, skill.clm, skill.swm |
| SUIKEN DACHI (DRUNKEN FIST STANCE) | 1 | ac |
| TO-MON KAI (LIMIT GATE RELEASE) | 7 | str, dex, landSpeed, init, skill.acr, skill.clm, skill.swm |
| TOUROU MANE NO JUTSU (PRAYING MANTIS IMITATION TECHNIQUE) | 1 | skill.acr |
| TOUROUKEN (PRAYING MANTIS STYLE) | 1 | skill.acr |
| USAGIDO (WAY OF THE RABBIT) | 7 | str, fort, ref, ac, attack, wdamage, chakraPool |
| ZETTAI BOUGYO (TOTAL DEFENSE) | 1 | ac |

## Seção B — Buffs sem changes (7) — 0 candidatos pendentes / 7 revisados (vazio intencional)

| Buff | Disciplina | Rank | Status |
|---|---|---|---|
| BUNSHIN NO JUTSU (DUPLICATION TECHNIQUE) | Ninjutsu | 1 | ✓ vazio intencional |
| KAWARIMI NO JUTSU (BODY SUBSTITUTION TECHNIQUE) | Ninjutsu | 1 | ✓ vazio intencional |
| KINOBORI (TREE CLIMBING TECHNIQUE) | Chakra Control | 1 | ✓ vazio intencional |
| KOUSEN RYU (IRON WIRE STYLE) | Taijutsu | 3 | ✓ vazio intencional |
| MAGEN: SHITSUENJOU NO JUTSU (DEMONIC MIRAGE: REALITY REVISION TECHNIQUE) | Genjutsu | 2 | ✓ vazio intencional |
| SHOUGENZOU NO JUTSU (MINOR ILLUSION TECHNIQUE) | Genjutsu | 2 | ✓ vazio intencional |
| TADAYOU (WATER STRIDER) | Chakra Control | 2 | ✓ vazio intencional |

## Seção C — Buffs com targets inválidos (0)

_Nenhum — todos os targets existentes são válidos._

## Seção D — Técnicas sem buff, por disciplina (1013 total)

Revisão em batches: cada disciplina é uma subseção colapsável.

Status: **208 revisadas** (analisadas e deixadas sem buff) / **805 pendentes**.

### Visão geral por disciplina

| Disciplina | Sem buff | Revisadas | Pendentes |
|---|---|---|---|
| Chakra Control | 44 | 0 | 44 |
| Fuinjutsu | 76 | 0 | 76 |
| Genjutsu | 99 | 0 | 99 |
| Hachimon Tonkou ✓ | 1 | 1 | 0 |
| Ninjutsu | 544 | 0 | 544 |
| Taijutsu ✓ | 207 | 207 | 0 |
| Training | 42 | 0 | 42 |

Notas de revisão:
- **Hachimon Tonkou:** Batch 2026-06-01: 6 Gate buffs created (KYU-MON, SEI-MON, SHOU-MON, TO-MON, KEI-MON, KYO-MON). Mapped persistent numeric bonuses to Strength, Dexterity, land speed, Initiative, Acrobatics, Climb, and Swim. Temporary Chakra, Fast Healing, ignored conditions, per-round damage, closing penalties, Hide failure, opening damage, and knockback were left as manual/narrative effects. SEISHUN NO CHIKARA!!! reviewed and left without a buff because temporary HP and ignored fatigue/exhaustion do not have a clean changes target.
- **Taijutsu:** Batch 2026-06-01: 11 stance buffs created (YASEI KUMA, ISHIMARU SHODAN/NIDAN/SANDAN, SUIKEN, TOUROUKEN, TOUROU MANE, IAISOUKEN, SHISUI, DACHI-TENKEN, YABUKI). Remaining techniques reviewed and left without buff: Strikes apply a one-shot bonus that belongs to the technique's action, not a persistent buff; non-candidate stances grant only conditional/attribute-swap effects with no clean change target.
- **_emptyBuffs:** The 7 names in reviewedTechniques whose buffs are intentionally left with empty changes (narrative/situational effects, no clean change target). Decided 2026-06-01 — do not re-flag as candidates.

### Chakra Control (44 pendentes de 44)

| Rank | Nome | Subtipo | Status |
|---|---|---|---|
| 1 | DOKU HAKKEN NO JUTSU (POISON DETECTION TECHNIQUE) |  | pendente |
| 1 | INUHANA NO JUTSU (DOG'S NOSE TECHNIQUE) | Body | pendente |
| 1 | MAJIN KOUSEI NO JUTSU (DEVILISH REGENERATION TECHNIQUE) | Spirit | pendente |
| 1 | SAIHOU NO JUTSU (SEWING TECHNIQUE) |  | pendente |
| 2 | CHAKRA NO HIKARI (CHAKRA LIGHT) | Spirit | pendente |
| 2 | CHAKRA NO KOGASU (CHAKRA BURN) | Body | pendente |
| 2 | GAMIYARI (PAPER LANCE) |  | pendente |
| 2 | GENJUTSU KAI (ILLUSION DISPEL) | Spirit | pendente |
| 2 | HAKKEN NO JUTSU (DETECTION TECHNIQUE) | Body | pendente |
| 2 | SEISHOU BAKUHA (ENERGY EXPLOSION) | Body | pendente |
| 2 | UNKI TATE NO JUTSU (WARMTH SHIELD TECHNIQUE) |  | pendente |
| 3 | AKARI (TRUE LIGHT) | Spirit | pendente |
| 3 | CHAKRA UTSUSHI NO JUTSU (CHAKRA REVEALING TECHNIQUE) |  | pendente |
| 3 | GISHI NO JUTSU (FEIGN DEATH) | Body | pendente |
| 3 | NEN (DESIRE) | Spirit | pendente |
| 3 | REIKI (LAY ON HANDS) | Spirit | pendente |
| 3 | SEIREIHA (SOUL EDGE) | Spirit | pendente |
| 3 | YUKIGUTSU (SNOW WALKING) | Body | pendente |
| 4 | BOUENKYOU SHIKAKU NO JUTSU (TELESCOPIC VISION TECHNIQUE) | Spirit | pendente |
| 4 | DAI GAMIYARI (GREAT PAPER LANCE) |  | pendente |
| 4 | DENSETSU NO REIKI (AURA OF LEGEND) | Spirit | pendente |
| 4 | KAKUSU NIOI (CONCEAL ODOR) | Body | pendente |
| 4 | SHINOBI HIKEN: CHAKRA TOUSHI (SHINOBI SECRET: CHAKRA SIGHT) | Body | pendente |
| 4 | SUMI NAMARU NO JUTSU  (INK CONCEALMENT TECHNIQUE) | Spirit | pendente |
| 5 | CHIBIZUKU NO JUTSU (COMPRESSION TECHNIQUE) | Body | pendente |
| 5 | GEKITAI NO JUTSU (REPULSION TECHNIQUE) | Body | pendente |
| 5 | HANTEN CHOUYAKU (LEAP TO THE SKY) | Body | pendente |
| 5 | KAYOU YUUGYOU NO WAZA (METHOD OF RAPID SWIMMING) | Body | pendente |
| 5 | MUGEN IBUKI NO JUTSU (AIR SUPPLY TECHNIQUE) | Body | pendente |
| 5 | REIKIHA (AURA WAVE) | Spirit | pendente |
| 5 | RYOKUJUN NO JUTSU (ENERGY SHIELD TECHNIQUE) | Body | pendente |
| 6 | CHAKRA GOMUMARI (CHAKRA SUPER BALL) | Spirit | pendente |
| 6 | CHAKRA KANSHOUKI (CHAKRA BUFFER) | Spirit | pendente |
| 6 | GENJUTSU JOUKAI (GREATER ILLUSION DISPEL) | Spirit | pendente |
| 6 | RANSHINSOU (CHAOTIC MENTAL COLLISION) | Body | pendente |
| 6 | REIRETSU (SPIRITUAL FURY) | Body | pendente |
| 7 | SHINOBI HIKEN: SAKKI JUTSU (SHINOBI SECRET: KILLING INTENT) | Spirit | pendente |
| 7 | SORAPO NO JUTSU (AIR WALKING TECHNIQUE) | Body | pendente |
| 8 | KAIRIKI (SUPERHUMAN STRENGTH) |  | pendente |
| 8 | KAMEHAMEHA (TURTLE WAVE BLAST) |  | pendente |
| 8 | KYOUKA KAGE BUNSHIN NO JUTSU (SHADOW REPLICATION REINFORCEMENT TECHNIQUE) | Spirit | pendente |
| 8 | TENSHU KYAKU (SKY-SPLITTING HEEL DROP) |  | pendente |
| 8 | ZENSHIN FUZUI NO JUTSU (COMPLETE PARALYSIS TECHNIQUE) | Spirit | pendente |
| 10 | CHAKRAMANE NO JUTSU (CHAKRA IMITATION TECHNIQUE) | Spirit | pendente |

### Fuinjutsu (76 pendentes de 76)

| Rank | Nome | Subtipo | Status |
|---|---|---|---|
| 1 | JOU NO IN KAI (LOCKING SEAL RELEASE) |  | pendente |
| 1 | YOUSO FUUIN NO JUTSU (ELEMENTAL SEAL TECHNIQUE) |  | pendente |
| 2 | KETSUYOUJUTSU: HEBIGAN NO IN (BLOOD SORCERY: SNAKE EYE SEAL) |  | pendente |
| 2 | MA'EN JUTSU: EN'MI (FIENDFIRE TECHNIQUE: SEED OF FLAME) |  | pendente |
| 2 | TEIRYOKU NO IN (ENERGY ANCHOR SEAL) |  | pendente |
| 3 | ADVANCED SEAL BAKUDAN (ADVANCED SEAL: BOMB) | Advanced Seal | pendente |
| 3 | JOU NO IN (LOCKING SEAL) |  | pendente |
| 3 | KETSUYOUJUTSU: GETEKKI (BLOOD SORCERY: LESSER MASTERY) |  | pendente |
| 3 | KETSUYOUJUTSU: RYOKU NO YOU (BLOOD SORCERY: BLADE OF POWER) |  | pendente |
| 3 | MA'EN JUTSU: HAPPA (FIENDFIRE TECHNIQUE: BLAST) |  | pendente |
| 4 | ADVANCED SEAL: HYOUHOU (ADVANCED SEAL: ICE DAGGERS) | Advanced Seal | pendente |
| 4 | KAIKKEN NO IN (CANCELLATION SEAL) |  | pendente |
| 4 | KETSUYOUJUTSU: ANSHI (BLOOD SORCERY: NIGHT VISION) |  | pendente |
| 4 | KETSUYOUJUTSU: KAISOKU (BLOOD SORCERY: CELERITY) |  | pendente |
| 4 | KETSUYOUJUTSU: KUUIN (BLOOD SORCERY: VOID SEAL) |  | pendente |
| 4 | KETSUYOUJUTSU: SEIRYOKU (BLOOD SORCERY: POTENCE) |  | pendente |
| 4 | MA'EN JUTSU: KAENFUBATSU (FIENDFIRE TECHNIQUE: INDOMITABLE FIRE) |  | pendente |
| 4 | MISSHI (MESSAGE CARRIER) | Advanced Seal | pendente |
| 4 | SUIHADO (WAY OF FLOWING WATER) |  | pendente |
| 5 | GESOUIN (MINOR STORAGE SEAL) |  | pendente |
| 5 | KETSUYOUJUTSU: EIBIN (BLOOD SORCERY: ACUITY) |  | pendente |
| 5 | KETSUYOUJUTSU: FUJUTSU (BLOOD SORCERY: THAUMATURGY) |  | pendente |
| 5 | KETSUYOUJUTSU: GOUKI (BLOOD SORCERY: FORTITUDE) |  | pendente |
| 5 | MA'EN JUTSU: KAENRAKUIN (FIENDFIRE TECHNIQUE: BLAZING BRAND) |  | pendente |
| 5 | NINJOUKAN (EMPATHIC CONNECTION) |  | pendente |
| 5 | SEIHOUKEN FUUIN (LIFE PRESERVATION SEAL) |  | pendente |
| 5 | TSUYOME NO IN (STRENGTHENING SEAL) | Advanced Seal | pendente |
| 6 | GENKAI FUUIN (LIMITER SEAL) |  | pendente |
| 6 | GENZOU NO IN (ILLUSION SEAL) | Advanced Seal | pendente |
| 6 | GOURIKI GENKAI (POWER LIMITER) |  | pendente |
| 6 | KAIRAI ENGEKI: KENGAKURYOKOU (PUPPET THEATER: FIELD TRIP) |  | pendente |
| 6 | KETSUKAI HOUJIN (JOINT SEAL SQUARE BIND) |  | pendente |
| 6 | KETSUYOUJUTSU: JOUTEKKI (BLOOD SORCERY: GREATER MASTERY) |  | pendente |
| 6 | KETSUYOUJUTSU: KETSUEIKI (BLOOD SORCERY: BLOOD VIGOR) |  | pendente |
| 6 | KETSUYOUJUTSU: MA'ENDOU (BLOOD SORCERY: PATH OF THE FIENDFIRE) |  | pendente |
| 6 | MA'EN JUTSU: KAENGUI (FIENDFIRE TECHNIQUE: FLAME EATER) |  | pendente |
| 7 | CHAKRA HANKAI NO JUTSU (CHAKRA DISRUPTION TECHNIQUE) |  | pendente |
| 7 | CHAKRAGAKURE NO WAZA (CHAKRA CONCEALING METHOD) |  | pendente |
| 7 | FUUJA HOUIN (EVIL SUPPRESSOR) |  | pendente |
| 7 | FUUJIRU NO KOE (SEALING THE VOICE) |  | pendente |
| 7 | FUUKA HOUIN (FIRE SUPPRESSOR) |  | pendente |
| 7 | KEKKAI NO IN (BARRIER SEAL) | Advanced Seal | pendente |
| 7 | MA'EN JUTSU: YOUNI KASOUKU (FIENDFIRE TECHNIQUE: FIENDISH CELERITY ) |  | pendente |
| 7 | MA'EN JUTSU: YOUNI SEIRYOKU (FIENDFIRE TECHNIQUE: FIENDISH POTENCE) |  | pendente |
| 7 | SEIHA FUUIN (SOUL DOMINATION SEAL) | Advanced Seal | pendente |
| 7 | SHIKETSU NO IN (MEDICAL STABILIZATION SEAL) | Advanced Seal | pendente |
| 7 | SOUKUBAKU FUUIN (IMPRISONMENT SEAL) | Advanced Seal | pendente |
| 8 | ADVANCED SEAL: RYOKUIN (ADVANCED SEAL: ENERGY SEAL) | Advanced Seal | pendente |
| 8 | FUKI NO IN (MOVEMENT SEAL) |  | pendente |
| 8 | JUURAKUIN (BRAND OF THE BEAST) |  | pendente |
| 8 | KEIYAKU HOUJIN (ALLY CONTRACT) |  | pendente |
| 8 | KETSUMEI NO TSURUGI (BLADE BLOOD OATH) |  | pendente |
| 8 | KETSUYOUJUTSU: INKATSU (BLOOD SORCERY: SEAL BREAKER) |  | pendente |
| 8 | KETSUYOUJUTSU: KUDOU (BLOOD SORCERY: PATH OF PAIN) |  | pendente |
| 8 | NINJUTSU NO WANA (NINJA ART TRAP) | Advanced Seal | pendente |
| 8 | SHINSEI KEKKAI (LIFE BARRIER) |  | pendente |
| 9 | CHUUZOUIN (STORAGE SEAL) |  | pendente |
| 9 | FUZEN SHINRUI FUUIN (MINOR BLOOD BOND SEAL) |  | pendente |
| 10 | CHAKRA NO SOUIN (CHAKRA CONTAINMENT SEAL) |  | pendente |
| 10 | RYUUSATSU NO IN (FLOW SUPPRESSION SEAL) |  | pendente |
| 10 | SHUNTORI FUIN (INSTANT RETRIEVAL SEAL) |  | pendente |
| 11 | CHIKARA NO IN (ENERGY SEAL) |  | pendente |
| 11 | SAIDO KAIIN (REDEMPTION UNSEALER) |  | pendente |
| 12 | ITAMI NO RAKUIN (BRAND OF PAIN) |  | pendente |
| 13 | HOKAGE SHIKI JIJUN JUTSU: KAKUAN NITTEN SUISHU (HOKAGE STYLE RETIREMENT TECHNIQUE: DARKNESS SEALING PALM) |  | pendente |
| 13 | SHIKEI NO IN (CAPITAL PUNISHMENT SEAL) | Advanced Seal | pendente |
| 14 | FUSHI NO IN (SEAL OF IMMORTALITY) |  | pendente |
| 14 | JUUIN JUTSU (CURSED SEAL TECHNIQUE) |  | pendente |
| 14 | KAIYAKU FUUIN (CONTRACT CANCELLING SEAL) |  | pendente |
| 14 | KATOU SHIN FUUIN (LESSER SOUL SEAL) |  | pendente |
| 14 | KEIYAKU FUUIN (CONTRACT SEAL) |  | pendente |
| 14 | SATETSU (IRON SAND) |  | pendente |
| 14 | SEISHINKUGI (IMMORTAL SOUL SACRIFICE) |  | pendente |
| 14 | SHINSUBU NO JUTSU (SOUL BINDING TECHNIQUE) |  | pendente |
| 14 | TOBIKIRI SAISEI NO JUTSU (GREATER REBIRTH TECHNIQUE) |  | pendente |
| 14 | YUUKAIFUU (FUSION SEAL) |  | pendente |

### Genjutsu (99 pendentes de 99)

| Rank | Nome | Subtipo | Status |
|---|---|---|---|
| 1 | IKAKU NO JUTSU (INTIMIDATION TECHNIQUE) | Compulsion | pendente |
| 1 | KYOUGAKU NO JUTSU (FRIGHT TECHNIQUE) | Doujutsu | pendente |
| 1 | SHITSUKENTOU NO JUTSU (DISORIENTATION TECHNIQUE) |  | pendente |
| 1 | SHITSUNEN NO JUTSU (MIND LAPSE TECHNIQUE) | Compulsion | pendente |
| 2 | DOUTA NO JUTSU (HAND MOTION CONFUSION TECHNIQUE) | Phantasm | pendente |
| 2 | ESAGASHI NO JUTSU (HIDDEN VERSE TECHNIQUE) | Phantasm | pendente |
| 2 | JUUKI NO JUTSU (ANIMAL MIND TECHNIQUE) |  | pendente |
| 2 | KUCHIJOUZU NO JUTSU (DIPLOMACY TECHNIQUE) | Doujutsu | pendente |
| 2 | MAGEN: JIGOKU TENSHI NO JUTSU (DEMONIC MIRAGE: HELL'S ELEMENT TECHNIQUE) |  | pendente |
| 2 | ONWAKU NO JUTSU (AURAL DELUSION TECHNIQUE) | Compulsion | pendente |
| 2 | SHINHEKI NO JUTSU (MIND REND TECHNIQUE) | Doujutsu | pendente |
| 3 | JUKUSUI NO JUTSU (SLEEP TECHNIQUE) |  | pendente |
| 3 | MAGEN: NARAKUMI NO JUTSU (DEMONIC MIRAGE: LIVING HELL TECHNIQUE) | Compulsion | pendente |
| 3 | SHIKISOSOU NO JUTSU (DEMOTIVATION TECHNIQUE) | Compulsion | pendente |
| 3 | SHINKUJUU NO JUTSU (MENTAL AFFLICTION TECHNIQUE) | Doujutsu | pendente |
| 3 | TAIBAKUDOU NO JUTSU (BODY BINDING STARE TECHNIQUE) | Doujutsu | pendente |
| 3 | YOUTON: KAIMON NO JUTSU (DEMONIC RELEASE: DESTRUCTION GATE TECHNIQUE) |  | pendente |
| 4 | DOMORI NO JUTSU (SPEECH IMPEDIMENT TECHNIQUE) | Compulsion | pendente |
| 4 | MAGEN: ANRAKUSHI (DEMONIC MIRAGE: ENDGAME RELIEF) | Phantasm | pendente |
| 4 | MAGEN: CHITAIBAKUSHI (DEMONIC MIRAGE: EARTHBOUND DEATH) | Phantasm | pendente |
| 4 | SEISAKU NO JUTSU (LIFE DISRUPTION TECHNIQUE) | Doujutsu | pendente |
| 5 | ISHIKIKA KASSEIKA NO JUTSU (SUBCONSCIOUS TRIGGER TECHNIQUE) | Compulsion | pendente |
| 5 | JISOKU NO JUTSU (PRETENSE OF SPEED TECHNIQUE) | Phantasm | pendente |
| 5 | JOUGENZOU NO JUTSU (ADVANCED ILLUSION TECHNIQUE) | Phantasm | pendente |
| 5 | JUUSUJI (ANIMAL FURY) | Compulsion | pendente |
| 5 | KANKIWAMARU NO JUTSU (OVERWHELMING EMOTIONS TECHNIQUE) | Compulsion | pendente |
| 5 | KENSEI NO JUTSU (DIVERSION TECHNIQUE) | Compulsion | pendente |
| 5 | MAGEN: MUGEN DOUTEI (DEMONIC MIRAGE: ENDLESS JOURNEY) | Phantasm | pendente |
| 5 | MAGEN: SHINKEI NIGAI (DEMONIC MIRAGE: NERVOUS CONVULSIONS) | Compulsion | pendente |
| 5 | MEMAI NO JUTSU (VERTIGO TECHNIQUE) | Doujutsu | pendente |
| 5 | MIKKAI NO JUTSU (PRIVACY FIELD TECHNIQUE) | Compulsion | pendente |
| 5 | NINSEI (SEMBLANCE OF PERSONALITY) |  | pendente |
| 5 | ONPA BUNSHIN NO JUTSU (SOUND WAVE CLONE TECHNIQUE) | Phantasm | pendente |
| 5 | SAIMIN JUTSU: MUSOU NO JUTSU (HYPNOTISM TECHNIQUE: MIND BLANK TECHNIQUE) | Phantasm | pendente |
| 5 | SHINODOKU (POISON OF THE MIND) | Compulsion | pendente |
| 5 | TSUTAKAZURA GENZOU NO JUTSU (ILLUSORY VINES TECHNIQUE) |  | pendente |
| 6 | BYOURETSU NO JUTSU (VIOLENT SICKNESS TECHNIQUE) | Compulsion | pendente |
| 6 | FUNRAN NO JUTSU (CONFUSION TECHNIQUE) |  | pendente |
| 6 | GENRYUUDAN (ILLUSORY DRAGON BLAST) | Phantasm | pendente |
| 6 | HASAMIUCHI (FLANKING STRIKE) | Phantasm | pendente |
| 6 | KAGEKOMU NO JUTSU (SHADOWMELD TECHNIQUE) | Phantasm | pendente |
| 6 | MAGEN: GOUSENJIN (DEMONIC MIRAGE: TORTURE OF A THOUSAND SWORDS) | Compulsion | pendente |
| 6 | MAGEN: JIGOKU KOUKA NO JUTSU (DEMONIC MIRAGE: HELL'S DESCENT TECHNIQUE) | Phantasm | pendente |
| 6 | MAGEN: SHINSENJOU NO JUTSU (DEMONIC MIRAGE:  METAPHYSICAL BATTLEGROUND TECHNIQUE) | Doujutsu | pendente |
| 6 | MAGEN: SHIROMANE NO JUTSU (DEMONIC MIRAGE: CASTLE IMITATION TECHNIQUE) | Phantasm | pendente |
| 6 | NEHAN SHOUJA NO JUTSU (TEMPLE OF NIRVANA TECHNIQUE) |  | pendente |
| 6 | NOUYA SHOURETSU NO JUTSU (MIND DISRUPTION TECHNIQUE) | Doujutsu | pendente |
| 6 | SAIMIN JUTSU: KAGE KIAI (HYPNOTISM TECHNIQUE: OTHERWORLDLY SCREAM) | Doujutsu | pendente |
| 6 | SAIMIN NO JUTSU (HYPNOTISM TECHNIQUE) | Doujutsu | pendente |
| 6 | SAKURA KAIHOU NO JUTSU (CHERRY BLOSSOM ESCAPE TECHNIQUE) | Phantasm | pendente |
| 6 | SAKURAGENZOU NO JUTSU (MIRAGE OF CHERRY BLOSSOMS TECHNIQUE) | Doujutsu | pendente |
| 6 | SHINKOU (MIND SNARE) | Doujutsu | pendente |
| 6 | SHINSHIN FUNKYUU NO JUTSU (MIND AND BODY DISORDER TECHNIQUE) |  | pendente |
| 6 | TSUYAGAN (ENTRANCING GAZE) | Doujutsu | pendente |
| 7 | AKUMU NO JUTSU (NIGHTMARE TECHNIQUE) | Phantasm | pendente |
| 7 | BOUSHIYOU NO JUTSU (DREAM APPLICATION TECHNIQUE) | Phantasm | pendente |
| 7 | KYOUHAKU WARAI NO JUTSU (COMPELLED LAUGHTER TECHNIQUE) | Doujutsu | pendente |
| 7 | MAGEN: GOUKYOU GENMU NO JUTSU (DEMONIC MIRAGE: PHANTASMAL TORTURE TECHNIQUE) |  | pendente |
| 7 | MAGEN: JIBAKU SATSU (DEMONIC MIRAGE: TREE BINDING DEATH) | Compulsion | pendente |
| 7 | MAGEN: KARASUGAN NO KYOUEN (DEMONIC MIRAGE: FEAST FOR CROWS) | Phantasm | pendente |
| 7 | MAKAI KYUUDOU: HAKKYOU GYOUSHI (HELL'S ENLIGHTENMENT: INSANITY GLARE) | Doujutsu | pendente |
| 7 | RETSU HASSAI (VIOLENT OUTBREAK) | Compulsion | pendente |
| 7 | SAIMIN JUTSU: YOKEN NO JUTSU (HYPNOTISM TECHNIQUE: FORESIGHT TECHNIQUE) | Doujutsu | pendente |
| 7 | SAKURA NO YUME (DREAMS OF CHERRY BLOSSOMS) | Phantasm | pendente |
| 7 | SHINKAI SATSUJIN NO JUTSU (DEEP SEA MURDER TECHNIQUE) | Compulsion | pendente |
| 7 | ZOKUYUUIN NO JUTSU (CROWD ENTICEMENT TECHNIQUE) | Compulsion | pendente |
| 8 | CHIYOKUBOU NO JUTSU (BLOODLUST TECHNIQUE) | Compulsion | pendente |
| 8 | CHOUFUNRAN NO JUTSU (GREAT CONFUSION TECHNIQUE) |  | pendente |
| 8 | ESEFUKASHI NO WAZA (METHOD OF FALSE INVISIBILITY) | Compulsion | pendente |
| 8 | HICHISHI KYOUBU NO JUTSU (NONLETHAL BRUTALITY TECHNIQUE) |  | pendente |
| 8 | KAIGO NO JUTSU (REMORSE TECHNIQUE) | Compulsion | pendente |
| 8 | KOKUANGYOU NO JUTSU (ABSOLUTE DARKNESS TECHNIQUE) |  | pendente |
| 8 | KOURI SAIMIN NO JUTSU (AUTOHYPNOSIS TECHNIQUE) |  | pendente |
| 8 | MAGEN: KUCHIRAKU NO JUTSU (DEMONIC MIRAGE: MOUTH OF HELL TECHNIQUE) |  | pendente |
| 8 | MAGEN: KYOUNOMEN (DEMONIC MIRAGE: VISAGE OF DEATH) | Doujutsu | pendente |
| 8 | MAGEN: KYUUTEN JIKAICHOU (DEMONIC MIRAGE: PALACE OF TRUE ENLIGHTENMENT) | Doujutsu | pendente |
| 8 | MUON JUNAN NO JUTSU (SOUNDLESS AGONY TECHNIQUE) | Compulsion | pendente |
| 8 | NINPOU: KAGEMUKU GENJUTSU NO WAZA (NINJA ART: DOUBLE-LAYERED METHOD OF GENJUTSU) | Phantasm | pendente |
| 8 | SOUGOUKI NO JUTSU (MIND SYNTHESIS TECHNIQUE) | Phantasm | pendente |
| 9 | KANGENZOU NO JUTSU (PERFECT ILLUSION TECHNIQUE) | Phantasm | pendente |
| 9 | KYOUSHITSU NO JUTSU (DREADFUL REALITY TECHNIQUE) |  | pendente |
| 9 | MAGEN: JAGAN (DEMONIC MIRAGE: EVIL EYE) | Doujutsu | pendente |
| 9 | SAIMIN JUTSU: KAGE GUGEN NO JUTSU (HYPNOTISM TECHNIQUE: SHADOW INCARNATION TECHNIQUE) | Doujutsu | pendente |
| 9 | SAIMIN JUTSU: SHINTEIRYUU NO JUTSU  (HYPNOTISM TECHNIQUE: MIND BLOCK TECHNIQUE) | Doujutsu | pendente |
| 9 | SEKIREIGAN (WAGTAIL EYE) | Doujutsu | pendente |
| 9 | SHIMENUCHI (ATTACK FROM ALL SIDES) | Phantasm | pendente |
| 10 | GENZOU JISHIN NO JUTSU (ILLUSIONARY EARTHQUAKE TECHNIQUE) | Compulsion | pendente |
| 10 | KAGESUI (SHACKLING STAKES) | Doujutsu | pendente |
| 10 | MAJUTSU: KAIBAKU (MYSTICAL ARTS: MYSTICAL BIND) | Compulsion | pendente |
| 10 | SHIN GENRYUUDAN (TRUE ILLUSORY DRAGON BLAST) | Phantasm | pendente |
| 11 | MAGEN: MUGEN ONSA (DEMONIC MIRAGE: THRALL OF INFINITE  MELODIES) |  | pendente |
| 11 | SHINRANSHIN NO JUTSU (BETRAYAL TECHNIQUE) | Compulsion | pendente |
| 11 | TENKYOU NO JUTSU (INSANITY TECHNIQUE) | Compulsion | pendente |
| 12 | GENHINA NO JUTSU (ILLUSORY DOLL TECHNIQUE) | Phantasm | pendente |
| 12 | KAIZAN SHINJUTSU: ENMA NO KESSHIN (WORLD ENDING SUPREME TECHNIQUE: AVATAR OF THE KING OF HELL) | Phantasm | pendente |
| 12 | MAGEN: KYOUTEN CHITEN (DEMONIC MIRAGE: MIRROR OF HEAVEN AND EARTH) | Doujutsu | pendente |
| 12 | MORISHOUHEKI NO JUTSU (FOREST BARRIER TECHNIQUE) | Compulsion | pendente |
| 12 | SHINBUKI NO JUTSU (MENTAL OVERRIDE TECHNIQUE) | Compulsion | pendente |
| 12 | TSUKUYOMI (GOD OF THE MOON) | Doujutsu | pendente |

### Hachimon Tonkou (1) — ✓ revisada, sem pendências

### Ninjutsu (544 pendentes de 544)

| Rank | Nome | Subtipo | Status |
|---|---|---|---|
| 1 | CHIHOU NO JUTSU (EARTH COMPASS TECHNIQUE) | Doton | pendente |
| 1 | DAIRYUUDAN NO JUTSU (GREAT DRAGON PROJECTILE) | Katon | pendente |
| 1 | FUKUROUGAN (OWL'S EYES) |  | pendente |
| 1 | GENWAKUDORO NO JUTSU (BLINDING MUD TECHNIQUE) | Doton | pendente |
| 1 | HEKIDEN NO JUTSU (ELECTRICAL SPLIT TECHNIQUE) | Raiton | pendente |
| 1 | HIAKAHOU (BLAZING RED CANNON) | Katon | pendente |
| 1 | IRYOU NINJUTSU: RYOJI – KEKKI (MEDICAL NINJUTSU: TREATMENT – VIGOR) | Medical | pendente |
| 1 | ISHI NO TEASHI (LIMBS OF STONE) | Doton | pendente |
| 1 | KAEN SHURIKEN (BLAZING SHURIKEN) | Katon | pendente |
| 1 | KAKUREIMINO NO JUTSU (MYTHICAL INVISIBILITY CLOAKING TECHNIQUE) |  | pendente |
| 1 | KAZEGAMA NO JUTSU (WIND SCYTHE TECHNIQUE) | Fuuton | pendente |
| 1 | KIKAI GISEI NO JUTSU (BUG SACRIFICE TECHNIQUE) |  | pendente |
| 1 | KUMOCHUU NO JUTSU (SPIDER STRING TECHNIQUE) |  | pendente |
| 1 | KUURYUUKEN NO JUTSU (AIR CURRENT DETECTION TECHNIQUE) | Fuuton | pendente |
| 1 | MIZUDAMA NO JUTSU (WATER SPHERE TECHNIQUE) | Suiton | pendente |
| 1 | NAGAREI NO JUTSU  (COLD SPELL TECHNIQUE) | Hyouton | pendente |
| 1 | NAWANUKE NO JUTSU (ESCAPING TECHNIQUE) |  | pendente |
| 1 | NINPOU: KUNAI SHOUWANA (NINJA ART: MINOR KUNAI TRAP) |  | pendente |
| 1 | RAISHURIKEN NO JUTSU (LIGHTNING SHURIKEN TECHNIQUE) | Raiton | pendente |
| 1 | SARUTOBI NO JUTSU (FLYING MONKEY TECHNIQUE) | Fuuton | pendente |
| 1 | SHOU RAKUMUGAI NO JUTSU (MINOR HARMLESS FALL TECHNIQUE) |  | pendente |
| 1 | TAKITSUKE (FIRE IGNITER) | Katon | pendente |
| 1 | TOUJUN NO JUTSU (EARTH SHIELD TECHNIQUE) | Doton | pendente |
| 1 | TOUTON NO JUTSU (PEEPING TECHNIQUE) |  | pendente |
| 1 | TSUUFUUKA NO JUTSU (GOUT OF FIRE TECHNIQUE) | Katon | pendente |
| 2 | BAIKA NO JUTSU (MULTI-SIZE TECHNIQUE) |  | pendente |
| 2 | DENGAN NO JUTSU (STUNGUN TECHNIQUE) | Raiton | pendente |
| 2 | DOUHEKI NO JUTSU (EARTH SPLIT TECHNIQUE) | Doton | pendente |
| 2 | ENKOUNEBAI NO JUTSU (STICKY FIRE TECHNIQUE) | Katon | pendente |
| 2 | FUKUMIHARI (HIDDEN NEEDLES) |  | pendente |
| 2 | HIKIRO RENKEN (FLYING DEMON STRIKE) |  | pendente |
| 2 | HISEN NO JUTSU (RAY OF FIRE TECHNIQUE) | Katon | pendente |
| 2 | HYOUSOU NO JUTSU (ICE CLAWS TECHNIQUE) | Hyouton | pendente |
| 2 | HYOUTAN NO JUTSU (ICE POINT TECHNIQUE) | Hyouton | pendente |
| 2 | IRYOU NINJUTSU: IJI – MASHUJUTSU (MEDICAL NINJUTSU: PRACTICE – MYSTICAL SURGERY) | Medical | pendente |
| 2 | IRYOU NINJUTSU: IJI – SHOUSEN JUTSU (MEDICAL NINJUTSU: PRACTICE – MYSTICAL PALM TECHNIQUE) | Medical | pendente |
| 2 | ISHI SHURIKEN NO JUTSU (STONE SHURIKEN TECHNIQUE) | Doton | pendente |
| 2 | JAKUDEN (MINOR ELECTRIC CURRENT) | Raiton | pendente |
| 2 | JISATSU NO JUTSU (SUICIDE TECHNIQUE) |  | pendente |
| 2 | KAISOKU NO JUTSU (NIMBLE-FOOTED TECHNIQUE) |  | pendente |
| 2 | KIKAI SHINKU NO JUTSU (BUG RECOVERY TECHNIQUE) |  | pendente |
| 2 | KUMOKINDAN (GOLD SPIDER PROJECTILE) |  | pendente |
| 2 | MUTSUTENSHI NO SHURIKEN (ELEMENTAL PRISM) |  | pendente |
| 2 | NINPOU: CHAKRA NO ITO (NINJA ART: CHAKRA THREADS) |  | pendente |
| 2 | RAIKOUSEN NO JUTSU (RAY OF LIGHTNING TECHNIQUE) | Raiton | pendente |
| 2 | RAITE NO JUTSU (HANDS OF THUNDER TECHNIQUE) | Raiton | pendente |
| 2 | REPPUSHOU (GALE CRUSHER) | Fuuton | pendente |
| 2 | RYOU NINJUTSU: IJI – SHINRYOU JUTSU (MEDICAL NINJUTSU: PRACTICE – DIAGNOSIS TECHNIQUE) | Medical | pendente |
| 2 | SHINDO NO JUTSU (QUAKING EARTH TECHNIQUE) | Doton | pendente |
| 2 | SHINJUU ZANSHU NO JUTSU (INNER DECAPITATION TECHNIQUE) | Doton | pendente |
| 2 | SHOUKAKYUU NO JUTSU (MINOR FIREBALL TECHNIQUE) | Katon | pendente |
| 2 | SHUNKOKU MEIHOUJIN: BUSHI (MOMENTANEOUS ALLY FORMATION: SOLDIER) | Spacetime | pendente |
| 2 | SUISENDAN NO JUTSU (DRILLING WATER BULLET TECHNIQUE) | Suiton | pendente |
| 2 | TOBI KUNAI (FLYING KUNAI) | Fuuton | pendente |
| 2 | TORIHANE NO JUTSU (BIRD'S WINGS TECHNIQUE) | Fuuton | pendente |
| 2 | TOUDO NO JUTSU (FROZEN GROUND TECHNIQUE) | Hyouton | pendente |
| 2 | TSUCHI NO JUTSU (EARTH MALLET TECHNIQUE) | Doton | pendente |
| 2 | TSUKU NO JUTSU (VOMIT TECHNIQUE) |  | pendente |
| 3 | BIFUU NO JUTSU (ZEPHYR TECHNIQUE) | Fuuton | pendente |
| 3 | CHAKRA SHORI NO WAZA (METHOD OF CHAKRA READING) |  | pendente |
| 3 | CHIDORI SENBON (THOUSAND BIRDS NEEDLES) | Raiton | pendente |
| 3 | DAISUKEBEI NO KAZE (WIND OF THE GREAT LECHER) | Fuuton | pendente |
| 3 | DENHA NO JUTSU (STATIC BURST TECHNIQUE) | Raiton | pendente |
| 3 | DOCHUU ENGYOU NO JUTSU (UNDERGROUND DISPLACEMENT TECHNIQUE) | Doton | pendente |
| 3 | DORONAMI NO JUTSU (MUD WAVE TECHNIQUE) | Doton | pendente |
| 3 | GODAI TAIGEKI: SHODAN JUTSU (ELEMENTAL BEATDOWN: RANK ONE TECHNIQUE) |  | pendente |
| 3 | GOUKAKYUU NO JUTSU (GRAND FIREBALL TECHNIQUE) | Katon | pendente |
| 3 | GUFUURAN NO JUTSU (TORNADO SLICER TECHNIQUE) | Fuuton | pendente |
| 3 | HARADOU: HAKUTOU (WAY OF PURIFICATION: WHITE SWORD) |  | pendente |
| 3 | HYOUKAIMEN NO JUTSU (ICE CRUSHER TECHNIQUE) | Hyouton | pendente |
| 3 | IRYOU NINJUTSU: CHIYU – SHODAN JUTSU (MEDICAL NINJUTSU: HEALING – FIRST RANK) | Medical | pendente |
| 3 | IRYOU NINJUTSU: RYOJI – JUUKI (MEDICAL NINJUTSU: TREATMENT – PARALYSIS) | Medical | pendente |
| 3 | IRYOU NINJUTSU: RYOJI – KENTAI (MEDICAL NINJUTSU: TREATMENT – FATIGUE) | Medical | pendente |
| 3 | ISSUI SUBERI NO JUTSU (CURRENTS SLIDING TECHNIQUE) | Suiton | pendente |
| 3 | JOU RAKUMUGAI NO JUTSU (GREATER HARMLESS FALL TECHNIQUE) |  | pendente |
| 3 | JUUJIN RYU: SEIGA  (BEASTMAN STYLE: SPIRIT FANG) |  | pendente |
| 3 | JUUJIN RYU: YUSHU (BEASTMAN STYLE: HEALING HAND) |  | pendente |
| 3 | KAGEHOUYOU NO JUTSU (SHADOW EMBRACE TECHNIQUE) | Shadow | pendente |
| 3 | KAIHOUDAN (PRESSURE CANNON) | Suiton | pendente |
| 3 | KAIRAI ENGEKI: SHICHIHENGE (PUPPET THEATER: COSTUME CHANGE) |  | pendente |
| 3 | KEIREN NO JUTSU (CRAMP TECHNIQUE) | Raiton | pendente |
| 3 | KIKAI BUNSHIN NO JUTSU (BUG REPLICATION TECHNIQUE) |  | pendente |
| 3 | KOURYUU NO JUTSU (RAIN DRAGON TECHNIQUE) | Suiton | pendente |
| 3 | KUMONENDOU NO JUTSU (VISCOUS SPIDER PROJECTION TECHNIQUE) |  | pendente |
| 3 | KUUDENKOUU NO JUTSU (STATIC RAIN TECHNIQUE) | Suiton | pendente |
| 3 | MIKAN SEIHA NO JUTSU (LESSER DOMINATION TECHNIQUE) |  | pendente |
| 3 | MIZU NO MUCHI (WATER WHIP) | Suiton | pendente |
| 3 | MIZUAME NABARA (SYRUP CAPTURE FIELD) | Suiton | pendente |
| 3 | MIZURAPPA (CRUSHING WATER WAVE) | Suiton | pendente |
| 3 | NEKO NO ME (CAT'S EYES) |  | pendente |
| 3 | NINPOU: CHAKRA NAGASHI (NINJA ART: CHAKRA FLOW) |  | pendente |
| 3 | NINPOU: KUNAI WANA (NINJA ART: KUNAI TRAP) |  | pendente |
| 3 | NINPOU: MAKIBISHI NO JUTSU (NINJA ART: EARTH CALTROPS TECHNIQUE) | Doton | pendente |
| 3 | ONBYOU NO JUTSU (SOUND WAVE NAUSEA TECHNIQUE) |  | pendente |
| 3 | SEIDENKI REIKI NO JUTSU (STATIC ELECTRICITY AURA TECHNIQUE) | Raiton | pendente |
| 3 | SHIKAKYU NO JUTSU (QUADRUPED TECHNIQUE) |  | pendente |
| 3 | SHIN KASOKU NO JUTSU (MENTAL ACCELERATION TECHNIQUE) |  | pendente |
| 3 | SHUNSHIN NO JUTSU (BODY FLICKER TECHNIQUE) |  | pendente |
| 3 | SHUSEN: CHIBOUNUSHI (DEFENSIVE TECHNIQUE: RISING MUD GUARDIAN) | Doton | pendente |
| 3 | SUIZOU NO JUTSU (WATER FORMING TECHNIQUE) | Suiton | pendente |
| 3 | TENGUKAZE (SUDDEN GUST OF WIND) | Fuuton | pendente |
| 3 | TOBIGETSU (FLYING MOON) | Fuuton | pendente |
| 3 | TOBIKOMI NO JUTSU (DIVING TECHNIQUE) | Suiton | pendente |
| 3 | TOKAGE NO KAWA (LIZARD'S SKIN) |  | pendente |
| 3 | TSUUSHIN NO JUTSU  (INFORMATION RELAY TECHNIQUE) |  | pendente |
| 3 | UTSUSEMI NO JUTSU (PROJECTION TECHNIQUE) |  | pendente |
| 3 | YAIBAKI NO KUCHIYOSE (BLADE SPIRIT SUMMONING) | Spacetime | pendente |
| 3 | YUTSUBA NO JUTSU (OILY SPIT TECHNIQUE) | Suiton | pendente |
| 3 | ZENMOU NO JUTSU (SIGHTLESS EYES TECHNIQUE) |  | pendente |
| 4 | BAKURETSU JUNJIRU NO JUTSU (EXPLOSIVE SACRIFICE TECHNIQUE) | Katon | pendente |
| 4 | CHAKRA JIRAI NO JUTSU (CHAKRA LANDMINE TECHNIQUE) |  | pendente |
| 4 | DAMASHIUCHI NO JUTSU (SNEAK ATTACK TECHNIQUE) |  | pendente |
| 4 | DENPO NO JUTSU (STATIC BULLET TECHNIQUE) | Raiton | pendente |
| 4 | DOROGA NO JUTSU (MUD FANG TECHNIQUE) | Doton | pendente |
| 4 | ENGA NO JUTSU (FIRE FANGS TECHNIQUE) | Katon | pendente |
| 4 | ENMA IBUKI NO JUTSU (HADES' BREATH TECHNIQUE) | Fuuton | pendente |
| 4 | FUUKAKOI NO JUTSU (WIND ENCLOSURE TECHNIQUE) | Fuuton | pendente |
| 4 | FUURENSETSU NO JUTSU (REAPING WINDS TECHNIQUE) | Fuuton | pendente |
| 4 | GODAI TAIGEKI: NIDAN JUTSU (ELEMENTAL BEATDOWN: RANK TWO TECHNIQUE) |  | pendente |
| 4 | GUFUUKEN NO JUTSU (TORNADO SLASH TECHNIQUE) | Fuuton | pendente |
| 4 | HAKISUITOGE NO JUTSU (SPITTING WATER SPINES TECHNIQUE) | Suiton | pendente |
| 4 | HIEN JUTSU: IPPO (FLYING SWALLOW TECHNIQUE: FIRST STEP) | Fuuton | pendente |
| 4 | HOMURA DAMA (BLAZING SPHERE) | Katon | pendente |
| 4 | HOUDEN NO JUTSU (ELECTRICAL DISCHARGE TECHNIQUE) | Raiton | pendente |
| 4 | HOUSEKI BAKUDAN (GEM BOMB) |  | pendente |
| 4 | HYOUNOMI NO JUTSU (SWALLOWING ICE TECHNIQUE) | Hyouton | pendente |
| 4 | HYOURENTO (FIERCE ICE DAGGERS) | Hyouton | pendente |
| 4 | HYOUSHOU NO JUTSU (ICE CRYSTAL TECHNIQUE) | Hyouton | pendente |
| 4 | ICHIJIN NO JUTSU (GUST OF WIND TECHNIQUE) | Fuuton | pendente |
| 4 | IKKETSU NO JUTSU (HEMORRHAGE TECHNIQUE) |  | pendente |
| 4 | IRYOU NINJUTSU: RYOJI – DOKUKESHI (MEDICAL NINJUTSU: TREATMENT – POISON PURGE) | Medical | pendente |
| 4 | IWA NI FUBATSU (STEADY AS A ROCK) | Doton | pendente |
| 4 | JINRAI NO JUTSU (THUNDERCLAP TECHNIQUE) | Raiton | pendente |
| 4 | KAENGIRI (BLAZING SLASH) | Katon | pendente |
| 4 | KAGE MANE NO JUTSU (SHADOW IMITATION TECHNIQUE) | Shadow | pendente |
| 4 | KAGEBAKU SHURIKEN NO JUTSU (SHADOW BINDING SHURIKEN TECHNIQUE) | Shadow | pendente |
| 4 | KAIRAI ENGEKI: KAMIDETERU (PUPPET THEATER: EXIT STAGE LEFT) |  | pendente |
| 4 | KAIRAI ENGEKI: SENKEN NO MAI (PUPPET THEATER: DANCE OF A THOUSAND BLADES) |  | pendente |
| 4 | KAZEBOE (HOWLING WINDS) | Fuuton | pendente |
| 4 | KIRIGAKURE NO JUTSU (CONCEALING MIST TECHNIQUE) | Suiton | pendente |
| 4 | KUSA KASUI NO JUTSU (GRASS SPIKES TECHNIQUE) |  | pendente |
| 4 | KUUKIHEKI NO JUTSU (AIR WALL TECHNIQUE) | Fuuton | pendente |
| 4 | KYUUSHIN NO JUTSU (MESSAGE CARRIER TECHNIQUE) | Spacetime | pendente |
| 4 | MIZU BUNSHIN NO JUTSU (WATER REPLICATION TECHNIQUE) | Sution | pendente |
| 4 | MIZUTEPPO (WATER BULLETS) | Suiton | pendente |
| 4 | MUKIDOU SANPO NO JUTSU (TRACKLESS STEP TECHNIQUE) |  | pendente |
| 4 | OCHIBA AME NO JUTSU (RAIN OF FALLING LEAVES TECHNIQUE) |  | pendente |
| 4 | RAIKOUDAN NO JUTSU (LIGHTNING PROJECTILES TECHNIQUE) | Raiton | pendente |
| 4 | ROUSURO ONPA NO JUTSU (DEAFENING SOUND WAVE TECHNIQUE) |  | pendente |
| 4 | RYUUHYOU NO JUTSU (DRIFTING ICE TECHNIQUE) | Hyouton | pendente |
| 4 | SABAKU FUUYU (FLOATING DESERT) | Doton | pendente |
| 4 | SARUBOU NO MAI (DANCE OF THE WILD MONKEY) | Fuuton | pendente |
| 4 | SHINTENSHIN NO JUTSU (MIND TRANSFER TECHNIQUE) |  | pendente |
| 4 | SHUNKOKU MEIHOUJIN: HOGOSHA (MOMENTANEOUS ALLY FORMATION: PROTECTOR) | Spacetime | pendente |
| 4 | SHURIKEN KAGE BUNSHIN NO JUTSU (SHURIKEN SHADOW REPLICATION TECHNIQUE) |  | pendente |
| 4 | SHURIKENJUTSU: REPPURENSHOU (SHURIKEN SKILL: FIERCE GALE CRUSHER) | Fuuton | pendente |
| 4 | SUITAI NO JUTSU (WEAKENING TECHNIQUE) |  | pendente |
| 4 | SUNA NO MUYA (SAND COCOON) | Doton | pendente |
| 4 | TEICHOU NO JUTSU (SLOWING TECHNIQUE) |  | pendente |
| 4 | TOUKETSU KOUSHOU NO JUTSU (FROZEN ARSENAL TECHNIQUE) | Hyouton | pendente |
| 4 | TOUSHOU (FROSTBITE) | Hyouton | pendente |
| 4 | YOUTON: KUSA JUUJI (DEMONIC RELEASE: CHAIN CROSS) |  | pendente |
| 4 | ZANKIDAN (SLICING DEMON BLAST) | Fuuton | pendente |
| 5 | CHAKRA NO BAKUDAN (CHAKRA BOMB) | Katon | pendente |
| 5 | CHI KATAME NO JUTSU (HARDEN EARTH TECHNIQUE) | Doton | pendente |
| 5 | CHIDORI (THOUSAND BIRDS) | Raiton | pendente |
| 5 | DENSHINDOU NO JUTSU (STATIC SHOCK TECHNIQUE) | Raiton | pendente |
| 5 | DORODAN NO JUTSU (MUD BLAST TECHNIQUE) | Doton | pendente |
| 5 | ENKOUDATE NO JUTSU (BLAZING SHIELD TECHNIQUE) | Katon | pendente |
| 5 | ENKOUU NO JUTSU (FIERY RAIN TECHNIQUE) | Katon | pendente |
| 5 | ENTOU NO JUTSU (FLAME SWORD TECHNIQUE) | Katon | pendente |
| 5 | GEHIDAMA NO JUTSU (MINOR FIREBALL TECHNIQUE) | Katon | pendente |
| 5 | GISOU NO JUTSU (CAMOUFLAGE TECHNIQUE) |  | pendente |
| 5 | GODAI TAIGEKI: SANDAN JUTSU (ELEMENTAL BEATDOWN: RANK THREE TECHNIQUE) |  | pendente |
| 5 | GUFUUDAN NO JUTSU (TORNADO BLAST TECHNIQUE) | Fuuton | pendente |
| 5 | HAISEKISHOU (BURNING ASH CLOUD) | Katon | pendente |
| 5 | HYOURINDAN NO JUTSU (ICE RING BLAST TECHNIQUE) | Hyouton | pendente |
| 5 | INUZUKA RYU: DYNAMIC AIR MARKING (INUZUKA STYLE: DYNAMIC AIR MARKING) |  | pendente |
| 5 | IRYOU NINJUTSU: CHIYU – NIDAN JUTSU (MEDICAL NINJUTSU: HEALING – SECOND RANK) | Medical | pendente |
| 5 | IRYOU NINJUTSU: IJI – SHIKETSU (MEDICAL NINJUTSU: PRACTICE – HEMOSTASIS) | Medical | pendente |
| 5 | IRYOU NINJUTSU: RYOJI – NANROUME (MEDICAL NINJUTSU: TREATMENT – EYE AND EAR DISORDER) | Medical | pendente |
| 5 | IRYOU NINJUTSU: RYOJI – RYOUKUDOU (MEDICAL NINJUTSU: TREATMENT – CHAKRA PATHWAYS) | Medical | pendente |
| 5 | ISHI NANKA NO JUTSU (SOFTEN STONE TECHNIQUE) | Doton | pendente |
| 5 | IWA BAKUHA NO JUTSU (ROCK EXPLOSION TECHNIQUE) | Doton | pendente |
| 5 | IWA NO SHO (ROCKBITE) | Doton | pendente |
| 5 | IWAGAKURE NO JUTSU (ROCK CONCEALMENT TECHNIQUE) | Doton | pendente |
| 5 | JUNKAZE NO JUTSU (SHIELDING WINDS TECHNIQUE) | Fuuton | pendente |
| 5 | JUUJIN BUNSHIN NO JUTSU (HALF BEAST CLONE TECHNIQUE) |  | pendente |
| 5 | JUUJIN RYU: DAISEIGA (BEASTMAN STYLE: GREAT SPIRIT FANG) |  | pendente |
| 5 | KAGE BUNSHIN NO JUTSU (SHADOW REPLICATION TECHNIQUE) |  | pendente |
| 5 | KAMAITACHI (SICKLING WIND BLAST) | Fuuton | pendente |
| 5 | KAN RAKUMUGAI NO JUTSU (PERFECT HARMLESS FALL TECHNIQUE) |  | pendente |
| 5 | KASUMI ENBU NO JUTSU (BLAZING MIST TECHNIQUE) | Katon | pendente |
| 5 | KINFUKU NO JUTSU (METAL MENDING TECHNIQUE) | Doton | pendente |
| 5 | KIRITE NO JUTSU (EDGED HANDS TECHNIQUE) |  | pendente |
| 5 | KOKURYUU BOUFUUSETSU (BLACK DRAGON SNOWSTORM) | Hyouton | pendente |
| 5 | KUBIKIRI SHURIKEN NO JUTSU (DECAPITATING SHURIKEN TECHNIQUE) |  | pendente |
| 5 | KUMOKARAMU NO JUTSU (SPIDER ENTANGLEMENT TECHNIQUE) |  | pendente |
| 5 | KUMONENKIN NO JUTSU (GOLD SPIDER SCYTHE TECHNIQUE) |  | pendente |
| 5 | KUUDEN MYAKU NO JUTSU (STATIC PULSE TECHNIQUE) | Raiton | pendente |
| 5 | KYOUMEISEN (VIBRATING SOUND DRILL) |  | pendente |
| 5 | MEISAIGAKURE NO JUTSU (CONCEALING CAMOUFLAGE TECHNIQUE) |  | pendente |
| 5 | MIMISEN NO JUTSU (EARPLUG TECHNIQUE) |  | pendente |
| 5 | MIZUDAN NO JUTSU (WATER BLAST TECHNIQUE) | Suiton | pendente |
| 5 | MOKUTON: TSUTAKAZURA ZOUDAI NO JUTSU (WOOD RELEASE: VINE GROWTH TECHNIQUE) | Mokuton | pendente |
| 5 | MSR: SEIFUU MOUKO (WILD WIND TIGER INCARNATION) | Fuuton | pendente |
| 5 | MSR: SUIHA RYUUGOKUTOU (RAGING WATER DRAGON) | Suiton | pendente |
| 5 | NINJOURYOKU NO JUTSU (EMPATHY POWER TECHNIQUE) |  | pendente |
| 5 | NINPOU: SHIGAI KAIJIN (NINJA ART: BODY DESTRUCTION) |  | pendente |
| 5 | ONIBUYOU (DEMON'S DANCE) | Shadow | pendente |
| 5 | ONMYOU HYOUKA TENCHI (PRINCIPLES OF DUALITY) |  | pendente |
| 5 | RAIDATE NO JUTSU (LIGHTNING SHIELD TECHNIQUE) | Raiton | pendente |
| 5 | RAIDOU NO JUTSU (LIGHTNING DISPLACEMENT TECHNIQUE) | Raiton | pendente |
| 5 | RAIKOU NO TSURUGI (THUNDER SWORD) | Raiton | pendente |
| 5 | RAKURAI NO JUTSU (LIGHTNING BOLT TECHNIQUE) | Raiton | pendente |
| 5 | RYUUKA NO JUTSU (DRAGON FIRE TECHNIQUE) | Katon | pendente |
| 5 | SABAKU KYUU (DESERT COFFIN) | Doton | pendente |
| 5 | SANSEIU NO JUTSU (ACID RAIN TECHNIQUE) | Suiton | pendente |
| 5 | SOUSHUUHA (ADVANCED BLADE MANIPULATION) | Fuuton | pendente |
| 5 | SUIBOUHEKI NO JUTSU (WATER SHIELD TECHNIQUE) | Suiton | pendente |
| 5 | SUNA SHIGURE (SAND SHOWER) | Doton | pendente |
| 5 | TESHI SENGAN (TEN FINGER BULLETS) |  | pendente |
| 5 | TSUBAME FUBUKI (SWALLOW STORM) | Hyouton | pendente |
| 5 | YUKI BUNSHIN NO JUTSU (SNOW REPLICATION TECHNIQUE) | Hyouton | pendente |
| 5 | ZENTENKOU NO WAZA (WEATHER-PROOF TECHNIQUE) |  | pendente |
| 6 | BUBUN BAIKA NO JUTSU (PARTIAL MULTI-SIZE TECHNIQUE) |  | pendente |
| 6 | CHIJIMU NO JUTSU (SHRINKING TECHNIQUE) |  | pendente |
| 6 | CHIROU NO JUTSU (EARTH PRISON TECHNIQUE) | Doton | pendente |
| 6 | CHOUMETSU NO JUTSU (PITCH DESTRUCTION TECHNIQUE) |  | pendente |
| 6 | DENKAI NO JUTSU (ELECTROLYSIS TECHNIQUE) | Raiton | pendente |
| 6 | DOKUKIRI NO JUTSU (POISON MIST TECHNIQUE) |  | pendente |
| 6 | DOKUTSUME NO JUTSU (POISON CLAW TECHNIQUE) |  | pendente |
| 6 | DORYUUDAN (MUD DRAGON CANNON) | Doton | pendente |
| 6 | DOTON: TSUIGA NO JUTSU (EARTH RELEASE: TRACKING FANG TECHNIQUE) | Spacetime | pendente |
| 6 | ENKA RASENGAN (BLAZING FIRE SPIRAL BLAST) | Katon | pendente |
| 6 | ESEMONO NO JUTSU (IMPOSTOR TECHNIQUE) |  | pendente |
| 6 | FUKE NO JUTSU (AGING TECHNIQUE) |  | pendente |
| 6 | GEKATA NO FUUKATSU (LESSER SEAL BREAKING) |  | pendente |
| 6 | GEKIROU NO JUTSU (RAGING SEA TECHNIQUE) | Suiton | pendente |
| 6 | GOUKA NO JUTSU (HELLFIRE TECHNIQUE) | Katon | pendente |
| 6 | HARADOU: BAKU NO MOUKIN (WAY OF PURIFICATION:  SHACKLES OF THE PREDATOR) |  | pendente |
| 6 | HARI JIZOU (HAIR NEEDLE GUARDIAN) |  | pendente |
| 6 | HIRYUU (SOARING DRAGON) | Fuuton | pendente |
| 6 | HISAJI NO MAI (DANCE OF THE FLYING SPOONS) |  | pendente |
| 6 | HISSATSUGAKU (ART OF THE DEATHBLOW) |  | pendente |
| 6 | HOUSENKA NO JUTSU (MYTHICAL PHOENIX FIRE TECHNIQUE) | Katon | pendente |
| 6 | HYOUKODAN (ICE TIGER MISSILE) | Hyouton | pendente |
| 6 | HYOUKORETSU NO JUTSU (VIOLENT ICE TIGER TECHNIQUE) | Hyouton | pendente |
| 6 | HYOURAN NO JUTSU (HAILSTORM TECHNIQUE) | Hyouton | pendente |
| 6 | IRYOU NINJUTSU: HIKEN – FUJIMI (MEDICAL NINJUTSU: SECRETS – PAIN NUMBING) | Medical | pendente |
| 6 | IRYOU NINJUTSU: HIKEN – KATAWA JUUSHOU (MEDICAL NINJUTSU: SECRETS – CRIPPLING INJURY) |  | pendente |
| 6 | ISHI BUNSHIN NO JUTSU (STONE REPLICATION TECHNIQUE) | Doton | pendente |
| 6 | JIKUUKAN SHOUSATSU (SPACETIME OBSERVATION) | Spacetime | pendente |
| 6 | JITOUSHA NO JUTSU (EAR PROJECTION TECHNIQUE) |  | pendente |
| 6 | JOUSHOU HYOUKOUKEN (RISING ICE GUARDIANS) | Hyouton | pendente |
| 6 | KAGE BUNSHIN NO TATE (SHADOW REPLICATION SHIELD) |  | pendente |
| 6 | KAGE BUNSHIN SAI (SHADOW REPLICATION DESTRUCTION) |  | pendente |
| 6 | KANASHIBARI NO JUTSU (BODY BINDING TECHNIQUE) |  | pendente |
| 6 | KAO UTSUSHI NO JUTSU (FACE COPY TECHNIQUE) |  | pendente |
| 6 | KARYUUDAN (FIRE DRAGON PROJECTILE) | Katon | pendente |
| 6 | KASUMI BUNSHIN NO JUTSU (MIST REPLICATION TECHNIQUE) | Fuuton | pendente |
| 6 | KATAWA HAIJIN NO JUTSU (CRIPPLING FROSTBITE TECHNIQUE) | Hyouton | pendente |
| 6 | KAZE NO KOGOE (WHISPERING WIND) | Fuuton | pendente |
| 6 | KIKAI DOKUKESHI NO JUTSU (BUG POISON PURGE TECHNIQUE) |  | pendente |
| 6 | KIRIGAKURE SHURIKEN NO JUTSU (SHURIKEN HIDDEN IN THE MIST TECHNIQUE) | Suiton | pendente |
| 6 | KOUDENISHOKU NO JUTSU (HIGH VOLTAGE TOUCH TECHNIQUE) | Raiton | pendente |
| 6 | KOUSEN SHIBARI NO JUTSU (IRON WIRE BIND TECHNIQUE) |  | pendente |
| 6 | KUCHIYOSE NO JUTSU (SUMMONING TECHNIQUE) | Spacetime | pendente |
| 6 | KUGUTSU TEISHI NO JUTSU (PUPPET DEANIMATION TECHNIQUE) |  | pendente |
| 6 | KUUHA TOURAN NO JUTSU (AIR WAVE BLADE STORM TECHNIQUE) | Fuuton | pendente |
| 6 | KYOUGETSU NO JUTSU (WAILING MOON TECHNIQUE) | Hyouton | pendente |
| 6 | KYUUDEN NO JUTSU (LIGHTNING BALL TECHNIQUE) | Raiton | pendente |
| 6 | KYUUTEN NO RAIKIRI (HEAVENLY LIGHTNING CUTTER) | Raiton | pendente |
| 6 | MIZUKIRI NO YAIBA (WATER EDGE BLADE) | Suiton | pendente |
| 6 | MOKUTON: TSUTAKADO NO JUTSU (WOOD RELEASE: VINE CAPTURE TECHNIQUE) | Mokuton | pendente |
| 6 | MSR: REKKA KOHA (BLAZING DARK WINGS) | Katon | pendente |
| 6 | NINPOU: KUNAI JOUWANA (NINJA ART: GREATER KUNAI TRAP) |  | pendente |
| 6 | NINPOU: NOUSEI KOUYOU (NINJA ART: MEMORY ENHANCER) |  | pendente |
| 6 | NINSHOUKAN NO JUTSU (EMPATHY BOND SUMMON TECHNIQUE) | Spacetime | pendente |
| 6 | RAISOKU (LIGHTNING SPEED) | Raiton | pendente |
| 6 | RAKUINSHOU NO KIZU (WOUNDS OF THE BRANDED) |  | pendente |
| 6 | SAN IBUKI NO JUTSU (ACIDIC BREATH TECHNIQUE) |  | pendente |
| 6 | SENNEI JASHUU (HIDDEN SNAKE HANDS) | Spacetime | pendente |
| 6 | SHINOBI HIKEN: KAMIKAKUSHI (SHINOBI SECRET: SPIRITED AWAY) |  | pendente |
| 6 | SHOUCHIHOU NO JUTSU (FLYING EARTH SPIKES TECHNIQUE) | Doton | pendente |
| 6 | SHUNKOKU MEIHOUJIN: SHUGOREI (MOMENTANEOUS ALLY FORMATION: GUARDIAN) | Spacetime | pendente |
| 6 | SHUNTEN KAIHOU (INSTANT RELEASE) | Spacetime | pendente |
| 6 | SHURIKENJUTSU: SHIPPURENSHOU (SHURIKEN SKILL: HURRICANE CRUSHER) | Fuuton | pendente |
| 6 | SOUKOU NO JUTSU (FROST ARMOR TECHNIQUE) | Hyouton | pendente |
| 6 | TANCHI NO SHIKAI (DETECTION FIELD) |  | pendente |
| 6 | TETSUSHIN NO JUTSU (HEART OF STEEL TECHNIQUE) |  | pendente |
| 6 | TOBIENDAN NO JUTSU (SOARING BLAST TECHNIQUE) | Katon | pendente |
| 6 | TSUCHI NO YOROI (EARTHEN ARMOR) | Doton | pendente |
| 6 | YOUTON: OU NO ME (DEMONIC RELEASE: EYE OF THE EMPEROR) |  | pendente |
| 7 | DAI TATSUMAKI NO JUTSU (GREAT TORNADO TECHNIQUE) | Fuuton | pendente |
| 7 | DAIKODAN NO JUTSU (GREAT TIGER PROJECTILE) | Hyouton | pendente |
| 7 | DAISAN NO ME (THIRD EYE) |  | pendente |
| 7 | DOROKU GAESHI (LAND WALL FLIP) | Doton | pendente |
| 7 | DORYOU DANGO (OVERSIZED ROCK DUMPLING) | Doton | pendente |
| 7 | DORYUU TAIGA NO JUTSU (MUD RIVER TECHNIQUE) | Doton | pendente |
| 7 | FUBUKI NO JUTSU (BLIZZARD TECHNIQUE) | Hyouton | pendente |
| 7 | FUUDOU NO JUTSU (WIND TUNNEL TECHNIQUE) | Fuuton | pendente |
| 7 | FUUKADAN NO JUTSU (WIND FLOWER MISSILE TECHNIQUE) | Fuuton | pendente |
| 7 | GAMAYU ENDAN (TOAD OIL BLAST) | Katon | pendente |
| 7 | HIDAMA NO JUTSU (FIREBALL TECHNIQUE) | Katon | pendente |
| 7 | HIJOU KAWARIMI NO JUTSU (HEARTLESS BODY SUBSTITUTION TECHNIQUE) |  | pendente |
| 7 | HYOUHEKI NO JUTSU (ICE WALL TECHNIQUE) | Hyouton | pendente |
| 7 | HYOUROU NO JUTSU (ICE PRISON TECHNIQUE) | Hyouton | pendente |
| 7 | JIGEN UGOKU NO JUTSU (DIMENSIONAL SHIFT TECHNIQUE) | Spacetime | pendente |
| 7 | JOUSAN NO JUTSU (EVAPORATION TECHNIQUE) | Katon | pendente |
| 7 | JUUJIN RYU: SHINSEIGA (BEASTMAN STYLE: TRUE SPIRIT FANG) |  | pendente |
| 7 | JUURYOKU KIHAN (GRAVITY SHACKLES) | Doton | pendente |
| 7 | JUURYOKU MYAKU (GRAVITY PULSE) | Doton | pendente |
| 7 | KAGE KUBISHIBARI NO JUTSU (SHADOW NECK BIND TECHNIQUE) | Shadow | pendente |
| 7 | KUMONENKIN NO TSURUGI (GOLD SPIDER SWORD) |  | pendente |
| 7 | KUMOSHIBARI NO JUTSU (SPIDER BINDING TECHNIQUE) |  | pendente |
| 7 | KUUHA BUKIGAKURE NO JUTSU (AIR CURRENT WEAPON CONCEALMENT TECHNIQUE) | Fuuton | pendente |
| 7 | MOKUTON: KIUGOKU NO JUTSU (WOOD RELEASE: TREE DISPLACEMENT TECHNIQUE) | Mokuton | pendente |
| 7 | MUGEN SAJIN DAITOPPA (INFINITE SANDSTORM) | Fuuton | pendente |
| 7 | NAN KAIZOU NO JUTSU (BODY ALTERATION TECHNIQUE) |  | pendente |
| 7 | NARUTO RYU: SENJUTSU - HIRYAKU (NARUTO STYLE: TACTICS - EVASIVE MANEUVER) |  | pendente |
| 7 | NINPOU: KAGE NUI (NINJA ART: SHADOW NEEDLES) | Shadow | pendente |
| 7 | NYOUKAI NO KUCHITSUKE (KISS OF THE SUCCUBUS) |  | pendente |
| 7 | OTOBAKUHA NO JUTSU (SOUND BLAST TECHNIQUE) |  | pendente |
| 7 | RAIKOUONO (THUNDERSTRIKE AXE) | Raiton | pendente |
| 7 | RAIRYUUDAN NO JUTSU (LIGHTNING DRAGON BLAST TECHNIQUE) | Raiton | pendente |
| 7 | RASENGAN (SPIRAL BLAST) |  | pendente |
| 7 | RENKU DAN (COMPRESSED AIR BLAST) | Fuuton | pendente |
| 7 | REPPUUTSUKI NO JUTSU (VIOLENT WIND THRUST TECHNIQUE) | Fuuton | pendente |
| 7 | RYUUSA NO JUTSU (QUICKSAND TECHNIQUE) |  | pendente |
| 7 | SABAKU SOUSOU (DESERT FUNERAL) | Doton | pendente |
| 7 | SEISHINKO NO JUTSU (CELESTIAL ARC TECHNIQUE) | Raiton | pendente |
| 7 | SENSATSU SUISHOU NO JUTSU (FLYING WATER NEEDLES TECHNIQUE) | Hyouton | pendente |
| 7 | SHIKON NO JUTSU (DEAD SOUL TECHNIQUE) | Shadow | pendente |
| 7 | SHINOBI HIKEN: IKUSA - DENRAISEI (SHINOBI SECRET: WAR ANCESTRAL SPIRIT) |  | pendente |
| 7 | SHOUCHITE NO JUTSU (RISING EARTH HAND TECHNIQUE) | Doton | pendente |
| 7 | SHUNDA (BLINK ATTACK) | Spacetime | pendente |
| 7 | SHUNTOU NO JUTSU (INSTANT ESCAPE TECHNIQUE) | Spacetime | pendente |
| 7 | SHUURAI NO JUTSU (LIGHTNING STRIKE TECHNIQUE) | Raiton | pendente |
| 7 | SOUHYOUSHOU (RISING ICE SPEARS) | Hyouton | pendente |
| 7 | SOUJA SOUSAI NO JUTSU (DOUBLE SNAKE ASSASSINATION TECHNIQUE) | Spacetime | pendente |
| 7 | SOURYUU BOUFUUSETSU (RISING DRAGON SNOWSTORM) | Hyouton | pendente |
| 7 | SUIBAKU NO JUTSU (WATER EXPLOSION TECHNIQUE) | Suiton | pendente |
| 7 | SUIGADAN NO JUTSU (WATER FANG BLAST TECHNIQUE) |  | pendente |
| 7 | SUIRYUUDAN NO JUTSU (WATER DRAGON BLAST TECHNIQUE) | Suiton | pendente |
| 7 | SUNA NO YOROI (SAND ARMOR) | Doton | pendente |
| 7 | TENKOU BUNSHIN NO JUTSU (CLONE SHIFT TECHNIQUE) |  | pendente |
| 7 | TEPPOUDAMA NO JUTSU (WATER BULLET TECHNIQUE) |  | pendente |
| 7 | TETSUKOUU NO JUTSU (IRON RAIN TECHNIQUE) | Suiton | pendente |
| 7 | TOBIKIRI KAWARIMI NO JUTSU (GREATER BODY REPLACEMENT TECHNIQUE) |  | pendente |
| 7 | TOGEYOMI NO JUTSU (UNDERWORLD SPINE TECHNIQUE) |  | pendente |
| 7 | TSUIHOU NO JUTSU (BANISHMENT TECHNIQUE) |  | pendente |
| 7 | UNAGITSUME NO JUTSU (EEL TALON TECHNIQUE) | Suiton | pendente |
| 8 | CHIDORI NAGASHI (THOUSAND BIRDS CURRENT) | Raiton | pendente |
| 8 | CHITENKYOU NO JUTSU (BRIDGE OF HEAVEN AND EARTH TECHNIQUE) | Doton | pendente |
| 8 | DORYUUHEKI (MUDSLIDE BARRIER) | Doton | pendente |
| 8 | FUUCHOUDAN NO JUTSU (WIND BIRD MISSILE TECHNIQUE) | Fuuton | pendente |
| 8 | GOKAN RANCHOU NO JUTSU (SENSES CONFUSION TECHNIQUE) |  | pendente |
| 8 | GOSHOKUZAME (FIVE HUNGRY SHARKS) | Suiton | pendente |
| 8 | IRYOU NINJUTSU: CHIYU – SANDAN JUTSU (MEDICAL NINJUTSU: HEALING – THIRD RANK) | Medical | pendente |
| 8 | IRYOU NINJUTSU: HIKEN – KATOU SAISEI (MEDICAL NINJUTSU: SECRETS – MINOR REBIRTH) | Medical | pendente |
| 8 | IRYOU NINJUTSU: HIKEN – KYOUI CHUUSHI (MEDICAL NINJUTSU: SECRETS – MIRACLE STASIS) | Medical | pendente |
| 8 | IRYOU NINJUTSU: RYOJI – DOKUYOKE (MEDICAL NINJUTSU: TREATMENT – POISON WARD) | Medical | pendente |
| 8 | IWAYADO KUZUSHI (CAVE-IN CRUSHER) | Doton | pendente |
| 8 | JIGENSUU NO JUTSU (DIMENSIONAL DOOR TECHNIQUE) | Spacetime | pendente |
| 8 | JIKUUKAN ROKEN (SPACETIME DETECTION) | Spacetime | pendente |
| 8 | JIKUUKAN ROSHUTSUSHOU (SPACETIME DISCLOSURE) | Spacetime | pendente |
| 8 | JOUSHOU OOTORI NO JUTSU (RISING PHOENIX BLAST TECHNIQUE) | Katon | pendente |
| 8 | JUURYOKU GACHAN (GRAVITY SLAM) | Doton | pendente |
| 8 | KAGE MANE YUSOU NO JUTSU (SHADOW IMITATION TRANSPORTATION TECHNIQUE) | Shadow | pendente |
| 8 | KOORI TANJOU NO JUTSU (ICE FORMATION TECHNIQUE) | Hyouton | pendente |
| 8 | KUCHIYOSE: SHUNKOKU KASEI (SUMMONING: INSTANT REINFORCEMENTS) | Spacetime | pendente |
| 8 | KUMONOSU ROKEN NO JUTSU (SPIDER WEB DETECTION TECHNIQUE) |  | pendente |
| 8 | KUUHAZAN (AIR WAVE SLASH) | Fuuton | pendente |
| 8 | KYUUKYOKU ENKOUDATE (ULTIMATE FLAME SHIELD) | Katon | pendente |
| 8 | MAKAI HYOUSHOU (DEMONIC ICE MIRRORS) | Hyouton | pendente |
| 8 | MSR: SEIFUU HOEKO (ROAR OF THE WIND TIGER) | Fuuton | pendente |
| 8 | MSR: SEIFUU SHICHIHOURYUU (SEVEN FLOWING WATER DRAGONS) | Suiton | pendente |
| 8 | NINPOU: CHISENDOU TANCHI (NINJA ART: TREMORSENSE) | Doton | pendente |
| 8 | NINPOU: KAGEMUSHA (NINJA ART: SHADOW WARRIOR) | Shadow | pendente |
| 8 | NINPOU: KIBAKU FUUDA NO WANA (NINJA ART: PAPER BOMB TRAP) |  | pendente |
| 8 | RAIJIN RIKI: RAIJUU NO SOU (MIGHT OF THE THUNDER GOD: RAIJUU'S CLAW) | Raiton | pendente |
| 8 | RAIKIRI (LIGHTNING EDGE) | Raiton | pendente |
| 8 | RAIKUISHA NO JUTSU (LIGHTNING DEVOURER TECHNIQUE) | Raiton | pendente |
| 8 | RAIRYUURETSU NO JUTSU (VIOLENT LIGHTNING DRAGON TECHNIQUE) | Raiton | pendente |
| 8 | RAKUNUMA NO JUTSU (DECAYING SWAMP TECHNIQUE) | Doton | pendente |
| 8 | RYUUSA BAKURYUU (DESERT AVALANCHE) | Doton | pendente |
| 8 | SEIGAE NO WAZA (METHOD OF LIFE EXCHANGE) | Medical | pendente |
| 8 | SHINMETSU NO JUTSU (MIND RUIN TECHNIQUE) |  | pendente |
| 8 | SHIROI KUMO NO JUTSU (WHITE CLOUD TECHNIQUE) | Suiton | pendente |
| 8 | SHUKKETSUSHI NO JUTSU (PROFUSE BLEEDING TECHNIQUE) |  | pendente |
| 8 | SHUNKOKU MEIHOUJIN: SEIHEI (MOMENTANEOUS ALLY FORMATION: NOBLE) | Spacetime | pendente |
| 8 | SUIJINHEKI NO JUTSU (WATER WALL TECHNIQUE) | Suiton | pendente |
| 8 | SUIKOUDAN NO JUTSU (SHARK WATER BLAST TECHNIQUE) | Suiton | pendente |
| 8 | SUIROU NO JUTSU (WATER PRISON TECHNIQUE) | Suiton | pendente |
| 8 | SUIRYUURETSU NO JUTSU (VIOLENT WATER DRAGON TECHNIQUE) | Suiton | pendente |
| 8 | TAI'INTOKU NO JUTSU (BODY CONCEALMENT TECHNIQUE) |  | pendente |
| 8 | TSUCHIRYUU NO JUTSU (EARTH DRAGON TECHNIQUE) | Doton | pendente |
| 8 | TSUIRAIMOU NO JUTSU (TRACKING THUNDER WEB TECHNIQUE) | Raiton | pendente |
| 8 | YOMI NUMA (HELL SWAMP) | Doton | pendente |
| 8 | YOUTON: IBARA NO KANMURI (DEMONIC RELEASE: CROWN OF THORNS) |  | pendente |
| 9 | BANKA NO JUTSU (RHAPSODY FOR THE FALLEN) |  | pendente |
| 9 | CHI HAKAIHA NO JUTSU (EARTH DESTRUCTION WAVE TECHNIQUE) | Doton | pendente |
| 9 | CHOU BAIKA NO JUTSU (MEGA MULTI-SIZE TECHNIQUE) |  | pendente |
| 9 | DAI KAMAITACHI NO JUTSU (GREAT SICKLING WIND BLAST TECHNIQUE) | Fuuton | pendente |
| 9 | DAI TSUCHIRYUU NO JUTSU (GREAT EARTH DRAGON TECHNIQUE) | Doton | pendente |
| 9 | DOUKA DORODOMU NO JUTSU (VAMPIRE MUD DOME TECHNIQUE) | Doton | pendente |
| 9 | EDO FUUMETSU (SEALED APOCALYPSE) | Spacetime | pendente |
| 9 | FUROUFUSHI NO JUTSU (PERPETUAL YOUTH TECHNIQUE) |  | pendente |
| 9 | GOUENKYUU (GREAT BLAZING SPHERE) | Katon | pendente |
| 9 | GOUKA KASUI NO JUTSU (HELLFIRE SPIKE TECHNIQUE) | Katon | pendente |
| 9 | HARADOU: AKU NO SOUSHIKI (WAY OF PURIFICATION:  FUNERAL FOR THE WICKED) |  | pendente |
| 9 | HARADOU: SEIKOUJIN (WAY OF PURIFICATION: SACRED LIFE BARRIER) |  | pendente |
| 9 | HARYUU MUUKOU (DEVASTATING ICE TIGER) | Hyouton | pendente |
| 9 | HYOUKI NO JUTSU (ICE AGE TECHNIQUE) | Hyouton | pendente |
| 9 | INUZUKA RYU: SOUTOUROU (INUZUKA STYLE: DOUBLEHEADED WOLF) |  | pendente |
| 9 | IRYOU NINJUTSU: HIKEN – TAISHA NO JUTSU (MEDICAL NINJUTSU: SECRET – REGENERATION TECHNIQUE) | Medical | pendente |
| 9 | JUUJIN RYU: OUGI – SHINJUURIKI (BEASTMAN STYLE: SECRET TECHNIQUE – TRUE ANIMAL POWER) |  | pendente |
| 9 | KAGE ANSATSU NO JUTSU (SHADOW ASSASSINATION TECHNIQUE) | Shadow | pendente |
| 9 | KARYUU ENDAN (FIRE DRAGON BLAST) | Katon | pendente |
| 9 | KAZE NO YAIBA (BLADE OF THE WIND) | Fuuton | pendente |
| 9 | KOUSEN JIZAN RENDAN (IRON WIRE KILLER MAGNET COMBO) | Raiton | pendente |
| 9 | KUCHIYOSE: KIRIKIRI MAI (SUMMONING: SPINNING WHIRL) | Spacetime | pendente |
| 9 | KUROI RASENGAN (DARK SPIRAL BLAST) | Katon | pendente |
| 9 | KUURYUUSAN NO JUTSU (AIRFLOW MANIPULATION TECHNIQUE) | Fuuton | pendente |
| 9 | MSR: REKKA SHIROHANE (WHITE FEATHERY BLAST) | Katon | pendente |
| 9 | NINPOU: KUNAI KANWANA (NINJA ART: PERFECT KUNAI TRAP) |  | pendente |
| 9 | RAIKODAN (LIGHTNING TIGER MISSILE) | Raiton | pendente |
| 9 | RANSOUTENGAI NO JUTSU (HEAVENLY DISPLACEMENT TECHNIQUE) |  | pendente |
| 9 | RETSUDO TENSHOU (EARTH SPLITTING FORCE) | Doton | pendente |
| 9 | SABAKU TAISO (DESERT REQUIEM) | Doton | pendente |
| 9 | SANMAI NO JUTSU (ABSORPTION TECHNIQUE) |  | pendente |
| 9 | SENNEI TAJASHUU (MANY HIDDEN SNAKE HANDS) | Spacetime | pendente |
| 9 | SHISHIKU NO JUTSU (LION'S ROAR TECHNIQUE) |  | pendente |
| 9 | TAJUU KAGE BUNSHIN NO JUTSU (MULTIPLE SHADOW REPLICATION TECHNIQUE) |  | pendente |
| 9 | TENCHUU (WRATH OF HEAVEN) | Raiton | pendente |
| 9 | TESSENKA NO MAI (DANCE OF THE CLEMATIS) |  | pendente |
| 9 | TSUKIGAKURE TOUKAI NO JUTSU (HIDDEN MOON CONCEALMENT TECHNIQUE) |  | pendente |
| 10 | AMATERASU (GODDESS OF THE SUN) | Katon | pendente |
| 10 | CHITENRAISOU (THOUSAND HEAVENLY SPEARS) | Raiton | pendente |
| 10 | DAIBAKUFU NO JUTSU (GREAT WATERFALL TECHNIQUE) | Suiton | pendente |
| 10 | GODAI RANSATSU: SHODAN JUTSU (ELEMENTAL DESTRUCTION: RANK ONE TECHNIQUE) |  | pendente |
| 10 | GUGENJUU NO JUTSU (BEASTLY MANIFESTATION TECHNIQUE) |  | pendente |
| 10 | HOKAGE IZOU HIJUTSU: KUBIKIRI SHURIKEN - NIHAN! (HOKAGE'S SECRET LEGACY TECHNIQUE: DECAPITATING SHURIKEN - MARK II!) |  | pendente |
| 10 | HYOUKENSEISOU (ETERNITY TRAPPED IN ICE) | Hyouton | pendente |
| 10 | HYOUMETSUDAN (ICE RUIN BURST) | Hyouton | pendente |
| 10 | HYOUSEIDAN NO JUTSU (ICE NOVA TECHNIQUE) | Hyouton | pendente |
| 10 | IRYOU NINJUTSU: RYOJI – MANNOUYAKU (MEDICAL NINJUTSU: TREATMENT – PANACEA) | Medical | pendente |
| 10 | JIKOKU KAGE BUNSHIN NO JUTSU (INSTANT SHADOW REPLICATION TECHNIQUE) |  | pendente |
| 10 | JIKUUKAN IGAMI (SPACETIME DISTORTION) | Spacetime | pendente |
| 10 | KAEN HOUDAN NO JUTSU (BLAZING CANNONBALL TECHNIQUE) | Katon | pendente |
| 10 | KAIGAN (EYES OF DIVINATION) |  | pendente |
| 10 | KAMI NO SABAKI (GOD'S PUNISHMENT) |  | pendente |
| 10 | KIRITAI NO JUTSU (MIST BODY TECHNIQUE) | Suiton | pendente |
| 10 | MASHOUHEKI (DEVIL'S BARRIER) | Katon | pendente |
| 10 | MOKUTON: FUTORISUGI NO JUTSU (WOOD RELEASE: PLANT OVERGROWTH TECHNIQUE) | Mokuton | pendente |
| 10 | MOKUTON: SHICHUUKA NO JUTSU (WOOD RELEASE: FOUR PILLAR HOME TECHNIQUE) | Mokuton | pendente |
| 10 | NAIJIN OUKA NO JUTSU (INNER SELF ABSORPTION TECHNIQUE) |  | pendente |
| 10 | OODAMA RASENGAN (GREAT SPHERE SPIRAL BLAST) |  | pendente |
| 10 | OUSATSUGAKU (ART OF OVERKILL) |  | pendente |
| 10 | RAISEIDAN NO JUTSU (LIGHTNING NOVA TECHNIQUE) | Raiton | pendente |
| 10 | ROUGA NADARE NO JUTSU (WOLF FANG AVALANCHE TECHNIQUE) | Hyouton | pendente |
| 10 | SANDANGAMAE TENSHI (ELEMENTAL TRINITY) |  | pendente |
| 10 | SHIGARASUGAN (DEATH IN THE EYE OF A CROW) | Spacetime | pendente |
| 10 | SHINKUUDAN NO JUTSU (AIR VOID BURST TECHNIQUE) | Fuuton | pendente |
| 10 | SHOUSHAGAN NO JUTSU (BODY MOLD TECHNIQUE) |  | pendente |
| 10 | SHUNKOKU MEIHOUJIN: SHINGEN (MOMENTANEOUS ALLY FORMATION: CHAMPION) | Spacetime | pendente |
| 10 | SHUNZEKI (BLINK GATE) | Spacetime | pendente |
| 10 | SUIKOUSANDAN NO JUTSU (TRIPLE SHARK WATER BLAST TECHNIQUE) | Suiton | pendente |
| 10 | SUISEIDAN NO JUTSU (WATER NOVA TECHNIQUE) | Suiton | pendente |
| 10 | TANUKI NEIRI NO JUTSU (SPELL OF FAKE SLEEP) | Doton | pendente |
| 10 | TSUCHI YADORI NO JUTSU (EARTH HAVEN TECHNIQUE) | Doton | pendente |
| 10 | TSUCHIHOUDAN (EARTH DESTRUCTION BLAST) | Doton | pendente |
| 10 | TSUI NO HIKEN: KAGUZUCHI (SUCCESSION SECRET TECHNIQUE: GOD OF FIRE) | Katon | pendente |
| 11 | AME NO KISEKI (MIRACLE OF RAIN) | Suiton | pendente |
| 11 | DEISHOUHA NO JUTSU (CRUSHING MUD WAVE TECHNIQUE) | Doton | pendente |
| 11 | HIRAISHIN NO JUTSU (FLYING THUNDER GOD TECHNIQUE) | Spacetime | pendente |
| 11 | JOUKATA NO FUUKATSU (GREATER SEAL BREAKING) |  | pendente |
| 11 | SABAKU ROU (DESERT PRISON) | Doton | pendente |
| 11 | SAWARABI NO MAI (DANCE OF THE SEEDLING FERNS) |  | pendente |
| 11 | SOUREI SAIJI NO JUTSU (RITE OF TWIN SOULS TECHNIQUE) | Spacetime | pendente |
| 11 | SUISHOUHA NO JUTSU (GREAT WATER WAVE TECHNIQUE) | Suiton | pendente |
| 11 | TENSHUNREIKEN (HEAVENLY SPIRITUAL FIST) | Raiton | pendente |
| 11 | TETSUKAWA NO JUTSU (IRON SKIN TECHNIQUE) | Doton | pendente |
| 12 | DORYUUGA SOUGAKARI (FOCUSED EARTH DRAGON FANG) | Doton | pendente |
| 12 | GODAI RANSATSU: NIDAN JUTSU (ELEMENTAL DESTRUCTION: RANK TWO TECHNIQUE) |  | pendente |
| 12 | IRYOU NINJUTSU: CHIYU – YONDAN JUTSU (MEDICAL NINJUTSU: HEALING – FOURTH RANK) | Medical | pendente |
| 12 | IRYOU NINJUTSU: HIKEN – NIKUTEKI TAISHA (MEDICAL NINJUTSU: SECRETS – PHYSICAL RECONSTRUCTION) | Medical | pendente |
| 12 | JUURYOKU ZANCHUU (GRAVITY PILLAR) | Doton | pendente |
| 12 | KARYUUGA NO JUTSU (FIRE DRAGON FANG TECHNIQUE) | Katon | pendente |
| 12 | MAJUTSU: BAKUHATSU (MYSTICAL ART: EXPLOSION) | Katon | pendente |
| 12 | MSR: TSUI NO HIKEN - BYAKKO (SUCCESSION TECHNIQUE BYAKKO) | Fuuton | pendente |
| 12 | MSR: TSUI NO HIKEN - SEIRYUU (SUCCESSION TECHNIQUE SEIRYUU) | Suiton | pendente |
| 12 | MUGEN KUUHAZAN (INFINITE AIR WAVE SLASH) | Fuuton | pendente |
| 12 | MUGEN UGOKU NO JUTSU (INFINITE SHIFT TECHNIQUE) | Spacetime | pendente |
| 12 | MUHYOUGETEN (MIRAGE OF A FROZEN MOON IN THE HEAVENS) | Hyouton | pendente |
| 12 | RAITSUME NO JUTSU (LIGHTNING CLAW TECHNIQUE) | Raiton | pendente |
| 12 | SHINHYOUKODAN NO JUTSU (ULTIMATE ICE TIGER BLAST TECHNIQUE) | Hyouton | pendente |
| 12 | SHOUNADARE NO JUTSU (AVALANCHE WAVE TECHNIQUE) | Hyouton | pendente |
| 12 | SUIRYUUGA SOUGARAKI (FOCUSED WATER DRAGON FANG) | Suiton | pendente |
| 13 | HITO NINGYOUGEKI NO JUTSU (LIVING HUMAN PUPPETRY TECHNIQUE) |  | pendente |
| 13 | IRYOU NINJUTSU: HIKEN – IDENSHI TAISHA NO JUTSU (MEDICAL NINJUTSU: SECRET – GENETIC RECONSTRUCTION) | Medical | pendente |
| 13 | JISHIN NO JUTSU (EARTHQUAKE TECHNIQUE) | Doton | pendente |
| 13 | KAIGEKI CHITE NO JUTSU (LARGE CRUSHING EARTH HAND TECHNIQUE) | Doton | pendente |
| 13 | KIBAKU NENDO (EXPLODING CLAY) | Doton | pendente |
| 13 | KUU BUNSHIN NO HAETORI (VOID REPLICATION DEATH TRAP) |  | pendente |
| 13 | MSR: TSUI NO HIKEN - SUZAKU (SUCCESSION TECHNIQUE SUZAKU) | Katon | pendente |
| 13 | RYOUTOU SUIRYUUDAN NO JUTSU (TWO-HEADED WATER DRAGON BLAST TECHNIQUE) | Suiton | pendente |
| 13 | SEIHYOUROU NO JUTSU (ETERNAL ICE PRISON TECHNIQUE) | Hyouton | pendente |
| 13 | TENMA MUKURODE (HAND OF THE DEVIL) | Katon | pendente |
| 13 | YUKINOMORI (SNOW FOREST) | Hyouton | pendente |
| 14 | CHIMETSU DAIGEKI (EARTH-SHATTERING BLAST) | Doton | pendente |
| 14 | DENDOUSOKU NO JUTSU (CONDUCTOR SHOCK TECHNIQUE) | Raiton | pendente |
| 14 | DOTON: TOURIKI (EARTH RELEASE: TOWER OF MIGHT) | Doton | pendente |
| 14 | ENBUARASHI NO JUTSU (FIRESTORM TECHNIQUE) | Katon | pendente |
| 14 | FUUJA SAISEI (ART OF SNAKE REBIRTH) |  | pendente |
| 14 | GODAI RANSATSU: SANDAN JUTSU (ELEMENTAL DESTRUCTION: RANK THREE TECHNIQUE) |  | pendente |
| 14 | GODAI RANSATSU: YONDAN JUTSU (ELEMENTAL DESTRUCTION: RANK FOUR TECHNIQUE) |  | pendente |
| 14 | IKAKU HAKUGEI NO JUTSU (ONE-HORNED SNOW WHALE TECHNIQUE) | Hyouton | pendente |
| 14 | IRYOU NINJUTSU: HIKEN – KYOUI SAISEI (MEDICAL NINJUTSU: SECRETS – MIRACLE REBIRTH) | Medical | pendente |
| 14 | JIMON NO JUTSU (TIME GATE TECHNIQUE) | Spacetime | pendente |
| 14 | KAMUI (WRATH OF THE GODS) |  | pendente |
| 14 | KARYUU ENTOU NO JUTSU (BLAZING VENGEANCE TECHNIQUE) | Katon | pendente |
| 14 | KIBAKU NENDO: C3 NO BAKUHATSU (EXPLODING CLAY: C3 EXPLOSION) | Doton | pendente |
| 14 | KOUHEKI NO JUTSU (ROARING THUNDER TECHNIQUE) | Raiton | pendente |
| 14 | KUUSETSUME NO JUTSU (REAPING AIR TALONS TECHNIQUE) | Fuuton | pendente |
| 14 | NINJUTSU HIKEN: JIKUUKAN INGOKU (NINJUTSU SECRET: SPACETIME SECLUSION) | Spacetime | pendente |
| 14 | RASENSHURIKEN (SPIRAL SHURIKEN) | Fuuton | pendente |
| 14 | REIKIBUTSU NO JUTSU (SOUL RECEPTACLE TECHNIQUE) |  | pendente |
| 14 | SEKIJUN HAYASHI NO JUTSU (STALAGMITE FOREST TECHNIQUE) | Doton | pendente |
| 14 | SEKITAI NO JUTSU (ASTRAL BODY TECHNIQUE) |  | pendente |
| 14 | SHINGEN NO JUTSU (LOCALIZED EARTHQUAKE TECHNIQUE) | Doton | pendente |
| 14 | SHINJI HENKOU NO JUTSU (MIND ALTERATION TECHNIQUE) |  | pendente |
| 14 | SHINRYUUDAN NO JUTSU (ULTIMATE DRAGON BLAST TECHNIQUE) | Katon | pendente |
| 14 | SHIPPUKEN (HURRICANE SWORD) | Fuuton | pendente |
| 14 | SHIROIYARI NO JUTSU (WHITE ICE SPEAR TECHNIQUE) | Hyouton | pendente |
| 14 | SHOUTEN NO JUTSU (SHAPESHIFTING TECHNIQUE) |  | pendente |
| 14 | SUIDOUTAI NO JUTSU (WATER JET TECHNIQUE) | Suiton | pendente |
| 14 | TAIFUUGAN (EYE OF THE STORM) | Raiton | pendente |
| 14 | TATSUMAKI NO JUTSU (TORNADO TECHNIQUE) | Fuuton | pendente |
| 14 | TENNOIZOU: HAKUSHOUKA (HEAVEN'S LEGACY: SEARING WHITE FLAME) | Katon | pendente |
| 14 | TOMEGANE NO JUTSU (TELESCOPE TECHNIQUE) |  | pendente |
| 14 | TSUNAMI NO JUTSU (TIDAL WAVE TECHNIQUE) | Suiton | pendente |
| 15 | KEIRIGAN SAIKOU HIKEN - SAITEN (KEIRIGAN ULTIMATE SECRET SKILL - BREAKING POINT) |  | pendente |

### Taijutsu (207) — ✓ revisada, sem pendências

### Training (42 pendentes de 42)

| Rank | Nome | Subtipo | Status |
|---|---|---|---|
| 1 | NAKIMANE NO JUTSU (ANIMAL CRY IMITATION TECHNIQUE) | Genjutsu | pendente |
| 2 | CRAFT LEAST CHAKRA STORING GEM | Ninjutsu or Fuinjutsu | pendente |
| 2 | KIBAKU FUUDA KOIUKA NO WAZA (METHOD OF PAPER BOMB REFINEMENT) | Ninjutsu | pendente |
| 2 | SHODAN JOURYOKU (RANK ONE STRENGTH) | Taijutsu | pendente |
| 2 | SHODAN KOUSOKU (RANK ONE SPEED) | Taijutsu | pendente |
| 3 | CRAFT LESSER CHAKRA STORING GEM | Ninjutsu or Fuinjutsu | pendente |
| 3 | KIRIHEI NO ENGI NO WAZA (METHOD OF MIST FIGHTING ADAPTATION) | Ninjutsu | pendente |
| 3 | KYOUDO: SHODAN (INTENSITY: FIRST RANK) | Chakra Control | pendente |
| 3 | NINJUTSU KENKYUU (NINJUTSU RESEARCH) | Ninjutsu | pendente |
| 3 | NINKIDO: SHODAN (ENDURANCE: FIRST RANK) | Chakra Control | pendente |
| 3 | YOUTON: MYOURIKI (DEMONIC RELEASE: VILE POWER) | Ninjutsu | pendente |
| 4 | CRAFT GREATER CHAKRA STORING GEM | Ninjutsu or Fuinjutsu | pendente |
| 4 | JUUJIN RYUU: JUUSOKU (BEASTMAN STYLE: BESTIAL SWIFTNESS) | Ninjutsu | pendente |
| 4 | KINOBORI NO WAZA (METHOD OF TREE CLIMBING) | Chakra Control | pendente |
| 4 | KOEMANE NO JUTSU (VOICE MIMICRY TECHNIQUE) | Ninjutsu | pendente |
| 4 | NIDAN JOURYOKU (RANK TWO STRENGTH) | Taijutsu | pendente |
| 4 | NIDAN KOUSOKU (RANK TWO SPEED) | Taijutsu | pendente |
| 5 | JUTSU TAI (TECHNIQUE COUNTER) | Ninjutsu | pendente |
| 5 | YOUTON: DAIMYOURIKI (DEMONIC RELEASE: GREATER VILE POWER) | Ninjutsu | pendente |
| 6 | GEINAGE (COUNTER THROW) | Chakra Control | pendente |
| 6 | KUMA NO DAIRIKI (BEAR'S EXCEPTIONAL STRENGTH) | Taijutsu | pendente |
| 6 | KYOUDO: NIDAN (INTENSITY: SECOND RANK) | Chakra Control | pendente |
| 6 | NEKO NO BINSOKU (CAT'S GRACEFUL ELEGANCE) | Taijutsu | pendente |
| 6 | NINKIDO: NIDAN (ENDURANCE: SECOND RANK) | Chakra Control | pendente |
| 6 | SANDAN JOURYOKU (RANK THREE STRENGTH) | Taijutsu | pendente |
| 6 | SANDAN KOUSOKU (RANK THREE SPEED) | Taijutsu | pendente |
| 6 | SUIMEN HOKOU NO WAZA (METHOD OF WATER WALKING) | Chakra Control | pendente |
| 7 | DANKOJI (UNWAVERING SPIRIT) | Genjutsu | pendente |
| 7 | YOUTON: SHINMYOURIKI (DEMONIC RELEASE: TRUE VILE POWER) | Ninjutsu | pendente |
| 8 | CHAKRA NO SOKKOKU TANJOU (INSTANT CHAKRA FORMATION) | Chakra Control | pendente |
| 8 | JIKUURYOKU (STAMINA) | Taijutsu | pendente |
| 8 | SHUUGYOU: RENGE HENSHOU (TRAINING: THE LOTUS BLOOMS TWICE) | Taijutsu | pendente |
| 8 | SHUUGYOU: SAIKITSUI NO WAZA (TRAINING: ABILITY IMBUING ART) |  | pendente |
| 8 | YONDAN JOURYOKU (RANK FOUR STRENGTH) | Taijutsu | pendente |
| 8 | YONDAN KOUSOKU (RANK FOUR SPEED) | Taijutsu | pendente |
| 9 | YUKINADARE NO WAZA (METHOD OF SNOW STRIDING) | Chakra Control | pendente |
| 11 | MUGEN SHUNPO (INFINITE FLASH STEP) | Taijutsu | pendente |
| 12 | GODAN JOURYOKU (RANK FIVE STRENGTH) | Taijutsu | pendente |
| 12 | GODAN KOUSOKU (RANK FIVE SPEED) | Taijutsu | pendente |
| 12 | KYOUDO: SANDAN (INTENSITY: THIRD RANK) | Chakra Control | pendente |
| 12 | NINKIDO: SANDAN (ENDURANCE: THIRD RANK) | Chakra Control | pendente |
| 12 | SHUUGYOU: HOKAGE IZOU SHUUGYOU NO WAZA (TRAINING: METHOD OF HOKAGE LEGACY TRAINING) | Ninjutsu | pendente |
