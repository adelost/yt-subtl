# YouTube Transcript Reader 1.3.0, release candidate

## Current result and boundary

The existing desktop path remains `Q:\yt-subtl-dev\dist`. Version 1.3.0 was synced there using the repo-owned PowerShell workflow and all seven files independently compared byte-for-byte with `dist/`. Chrome reload in Mattias's own running browser is not claimed. His desktop was actively in use, so no competing mouse/keyboard operation was performed.

Chrome Web Store: **not uploaded, submitted or published**. Google requires reauthentication in the personal browser. The existing item ID/current published version remains unverified. The installed third-party “Youtube Transcript” (jgibaoklabopileepldnlkbbcibhbgmd) is not this project and must not be updated as if it were. The local unpacked extension is hgnbahbkhgbnfeekmnmaapimhmhplhbd.

## Changes

- Retained the native-style collapsed panel, July icon work, local desktop launcher and established caption-source approaches.
- Removed unused privileged background/bridge code and tabs/scripting/webNavigation permissions. The one page-context observer owns caption capture.
- Kept timestamped cues internally while projecting the user's timestamp choice for display, copying and download.
- Invalidate stale requests/transcripts at video and track changes, including panel teardown. Keep caption/default-track/page identities explicit.
- Support current transcriptSegmentViewModel data, correct chronological order, numeric VTT text, entity fidelity and srv3 XML.
- Bound network waits, clean video/timer listeners, reattach after YouTube replaces layout nodes, fix aria-pressed values and keyboard controls.
- Fix search highlighting that previously split a sentence into flex columns. Exclude timestamps from word counts.
- Update compatible build dependencies, with `npm audit` now reporting zero vulnerabilities. Packaged runtime has no npm dependencies or remote executable code.
- Add deterministic ZIP packaging with version/manifest/CRC and every-file byte checks.

## Actual verification

- Node tests: 41 cases, 39 passed, two browser-only XML cases skipped by Node, zero failures. Browser XML separately exercised below.
- Original symptom witnesses: four parser failures, one stale-track failure and one modern-shape failure were reproduced before their fixes. Detached-parent control attached once on original 8e24d88 and twice on the fixed source.
- Changed strict lint: zero findings. No increased/new size cap. All touched handwritten source stays below 500 lines. Churn check and diff-check pass.
- **Real installed-extension browser lap:** public jNQXAC9IVRw, 15 passed checks covering retrieval/order/identity, exact clipboard/download UTF-8 bytes and filename, timestamps on/off without refetching, search, timeline, real seek, no matches, keyboard collapse, 600px reflow, no panel on home and zero uncaught page errors.
- **Clearly synthetic installed-extension fixture:** eight checks covering German selection/old text invalidation, srv3 XML/numeric entities/literal brackets, SPA clearing, missing captions, Shorts open/close and Escape/focus. These are not real Shorts or multilingual YouTube network receipts.
- Real screenshots inspected and posted: light search, dark timeline, narrow layout. Dark state is controlled with YouTube's actual `html[dark]` attribute in the isolated test page. Chromium was headless; no GPU/video-performance claim.
- A second actual video, TEDx 5MgBikgcWnY, still failed retrieval in the unsigned-in test profile. YouTube's native get_transcript request returned HTTP 400 and timedtext returned HTTP 200 with empty bodies. This is not proof that Mattias's existing signed-in desktop installation fails. The extension presents an error instead of fabricated content.
- The early cookie-dialog obstruction, persisted-view test mismatch, native-search selector ambiguity and search flex defect are rejected/diagnosed evidence, not successful passes.

## Requested quality judgment

After inspecting the corrected pictures, the demonstrated light/dark/narrow main flow meets my **9/10 UX judgment** for hierarchy, readable copy and task completion. That is a judgment, not independent certification. **“9/10 on everything” is not claimed:** live Shorts, alternate-language network retrieval, the TEDx failure in the anonymous profile, the user's own reloaded Chrome and Store publication still need their respective evidence. Do not turn the good short-video lap or synthetic fixture into universal compatibility.

## Evidence and rollback

- Source baseline: 8e24d88. Historical July WIP was preserved before editing, then integrated without creating another checkout.
- Private artifacts: `/home/adelost/.agentmux/artifacts/yt-subtl-2026-10-10/`, including scripts, smoke/fixture JSON receipts, downloaded bytes and Store login screenshot. No private screenshot belongs in the public repo.
- `pre-edit.tar.gz`: SHA256 b5cfc28111b38ade81542890b04a27b8b109f14faee392f9c63fb6e02c66fab8, tar content-compare passed.
- `q-dev-before.tar.gz`: byte-compared snapshot of the preceding Q build. Restore its `dist/` into the same Q path and reload only this extension if necessary.
- `npm run package` creates `extension.zip` with identical hashes across unchanged repeat builds. Record the final SHA in the local release receipt, not by claiming a Store version early.

## Remaining release steps

1. Reauthenticate the Google account owning the original Store item. Verify item ID, old version, listing and visibility before any upload; adjust the version if the Store requires a larger one.
2. Confirm the final exact version/package/listing and submission screenshot as required by the personal-browser contract.
3. Upload to the **existing** item, submit for review, then verify Google approval and public version. Submission is not a public release.
4. Broader compatibility must be checked with available real captions before a whole-product 9/10 claim. No AI backend, paid caption service or access bypass was added.
