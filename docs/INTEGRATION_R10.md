# R10 — Integration and merge candidate, 19 October 2026

This revision incorporates the R10 local delivery into PR #11 on top of R9 `58b311b73a7890fe55a073515e5a2cbf2009a6b8`. It does not change the gameplay package number 0.7.3 or represent a new completed-art release.

## Delivered code
- Optional presentation before experimental duels: intro, pause, one-tick advance, skip and input neutralization. Combat and recorded frames remain at zero until the intro is complete. Replays retain their original start.
- Conservative finisher choreography compatibility evaluated before opening the window and again before scene creation. Unsupported anatomy and size envelopes finish through the normal victory path without a stuck window or finisher credit.
- Victim selector in the finisher archive, with explicit reasons for exclusion.
- Original R10 workbook under `docs/planning/BOW_PR11_SUIVI_R10.xlsx`. Its component contents are preserved; local-preparation statuses in that workbook and in `DELIVERY_R10_SCOPE.md` describe the original delivery. The workflow and PR merge state, not those historical cells, establish whether this version has been integrated remotely.

## Validation
The full executable chain includes 350 inherited groups and 16 R10 groups. It must pass again before merging. The new `tests/browser-delivery-r10-http.mjs` navigates an actual local HTTP server in Chromium at 1440/390 widths; accelerated CPU and prepared verdicts are explicitly identified. Existing R8 and R9 HTTP regressions are also run in staging. Browser regression checks for R10 remain active on PRs and main after integration.

All 508 resource files, main roster, isolated profiles, finisher definitions and isolated replay/contextual contracts are compared with the R9 baseline. No new image, anatomical animation, character or canonical moveset is claimed. Technical compatibility is not canon certification. The 115 main fighters, 231 isolated prototypes and 43 contextual exercises remain separate.

The primary replay contract changes for its new controller dependency; old replay files are not deleted. The 100-tick intro and 90-tick victory/outro transition are original prototype rules, not Capcom timing data. Underlying artwork and per-victim authored choreography remain unfinished.

A merge into main does not by itself verify a production Vercel deployment or a Google Drive upload. Source artifacts include exact commit IDs and checksums; no claims of those unrelated publications are implied.
