# YouTube Transcript Reader 1.3.1, release candidate

## What changed since 1.3.0

1.3.0 passed on its test video, jNQXAC9IVRw, but failed on the three other real videos tried in a clean browser: the TEDx talk 5MgBikgcWnY, the TED talk iG9CE55wbtY and dQw4w9WgXcQ all ended with "Could not load this caption track".

- **Cause.** YouTube now answers `/api/timedtext` requests without its proof-of-origin token (`pot`) with HTTP 200 and an empty body. On 2026-10-14, none of the 100+ token-less requests from 1.3.0 returned captions. YouTube's own `get_transcript` request also often failed with `400 Precondition check failed`. Only the YouTube player's own caption requests carry the token, and those always returned captions for the right video.
- **New primary source.** The extension asks the player to load the selected track, from the player's own track list so that auto-generated and manual captions stay apart, and reads the response the player receives. Afterwards it restores the viewer's caption setting and YouTube's saved caption language (`yt-player-caption-sticky-language`, `yt-player-caption-persistence`). Captions the player already fetched are used at once.
- **Ads.** During an ad the player only loads the ad's captions. The extension waits for the ad to end, up to 60 s, and shows "Waiting for the ad to finish…". It then also uses captions the player fetched by itself the moment the ad ended.
- **Fallback.** The page transcript is still used for the default track, and YouTube's own transcript panel is closed again even when reading fails.
- **Removed, with evidence.**
  - Token-less timedtext: up to 16 requests per attempt, none of which returned captions.
  - `get_transcript` with track `params`: 0 of 26 caption tracks carry `params`.
  - The "More actions" menu scrape: Show transcript is no longer in that menu.
- **Status line.** Progress messages from the sources now reach the panel; before, they were sent but never shown.
- **XHR capture.** The capture no longer reads `responseText` from JSON XHRs, which threw uncaught page errors.

## Verification

All runs used Chromium 1228 with the built `dist/` loaded as an unpacked extension, under Xvfb, without the `--enable-automation` flag and with fresh profiles. Automation flags or a profile used by earlier automated runs make YouTube refuse captions even to its own UI. That refusal is what made the TEDx failure in the 1.3.0 QA look environmental.

- **Real videos and tracks, all loaded with the timestamps in order:**
  - TEDx 5MgBikgcWnY: English, Arabic, 329 lines.
  - TED iG9CE55wbtY: English 427 lines, Afrikaans 417 lines.
  - dQw4w9WgXcQ: English, English auto-generated, German, Japanese, Portuguese, Spanish.
  - A real in-page navigation to a recommended video.
  - A real Short, lxAw0eU6QZE, auto-generated captions, 14 lines.
- **Ads.** Ads at load on three videos: the extension waited 13 to 35 s, then loaded the track.
- **Caption state.** It was snapshotted before and after every load, with captions on and with captions off. The visible setting, the selected track, both saved preference keys and the native panel's visibility were unchanged in every run that did not start during an ad. A run that starts during an ad snapshots the ad's own track instead.
- **UI smoke on jNQXAC9IVRw: 17/17.**
  - The real cues are in chronological order.
  - Clipboard and download match the transcript byte for byte, and the filename carries the video id.
  - Timestamps toggle off and on without refetching.
  - Search and no-match both work.
  - The timeline keeps one timestamp per cue, and a click seeks to that cue.
  - Escape collapses the panel.
  - The 600 px layout fits, and no panel shows on the home route.
  - No uncaught page errors.
- **Unit tests.** Node tests: 46, 44 passed, 2 browser-only XML cases skipped. The new test for captions fetched right after an ad fails without the fix and passes with it.
- **Lint.** `amux lint --changed --strict` reports 0 findings, and `amux churn` reports no hotspots.

Not verified: the extension in a signed-in Chrome profile, and Chrome Web Store review.

## Known behaviour

While a non-displayed track loads, the player can show that track's captions for well under a second before they are restored.

## Release

`npm run package` builds `extension.zip`. The Store screenshots are `store-assets/screenshot-1-timeline.png` and `store-assets/screenshot-2-search-dark.png`: real 1280x800 captures of 1.3.1 with YouTube's recommendations and ad slots hidden. Upload to the existing Store item only, after verifying its ID and current version in the owner's dashboard.
