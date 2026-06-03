# Changelog

## v1.0.2 - 2026-06-03

- Added GM-editable successes/failures to technique learning, with assorted sheet polish.
- Fixed Melee touch techniques so they no longer add the Strength modifier to damage, including the Disarming Throw and Flying Throw throw techniques.
- Fixed technique use so the auto-perform chat card is suppressed correctly and roll visibility is preserved.
- Fixed Kensoku: Iaiken so its bonus damage dice no longer multiply on a critical hit.
- Fixed the Electric Shock buff (Kanigakure Hiden: Denki Shokku) to use the native Electricity damage type and apply its bonus to natural attacks.

## v1.0.1 - 2026-06-03

- Renamed the technique sync UI from Medkit to Synckit and refined its sheet integration.
- Fixed Synckit so local mastery changes on actor-owned techniques no longer mark entries out of sync.
- Fixed Training technique learning to resolve its learn discipline from subtype, including prompted selection for empty or multi-discipline cases.
- Changed technique costs and training-chakra costs to use only temp chakra and pool automatically; reserve now stays manual through Tap Reserves, while Emergency Transfer remains as a separate depletion rule.
- Fixed Tap Reserves bookkeeping so temporary chakra and reserve updates stay aligned with the revised chakra flow.
