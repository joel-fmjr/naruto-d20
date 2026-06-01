---
name: feedback_buff_changes_reference
description: Always read docs/pf1-buff-changes-reference.md before creating or editing buff changes (system.changes[]) in technique-buffs items
metadata:
  type: feedback
---

Before creating or editing any `system.changes[]` entries in buff items (technique-buffs compendium or any PF1e buff), read `docs/pf1-buff-changes-reference.md` first.

**Why:** It documents all valid `target`, `type`, and `operator` values for PF1e v11.11, including the custom Naruto D20 targets registered by this module. Using an invalid target or wrong type silently breaks the buff without errors.

**How to apply:** Any time a task involves adding/modifying `system.changes[]` in a buff JSON, read the reference doc before writing the change. This includes creating new technique-buffs, updating existing ones, or any context note additions.
