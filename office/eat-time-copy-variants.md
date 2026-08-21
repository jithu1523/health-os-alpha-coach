# Eat-time copy variants

Date: 2026-08-20  
Owner: DESIGNER Pam  
Scope: Exact user-facing strings for the first-use and repeat-use explanation in `eatTimeControl()`.

## Full explanation, first use

`Logging now at ${fmtTime(now())}. If you ate earlier, set the real time. Your meal schedule uses when you ate, not when you typed it in, so an on-time meal still gets its credit.`

## Short line, repeat use

`Set the time you ate. The rest of today uses that time.`

## Rationale

The first-use line explains why this matters without turning into a warning. The repeat line keeps the daily path light while preserving the honesty requirement: the user is stating `ateAt`, and the schedule uses that fact.
