# UX polish for 1.3.2

Goal: the panel reaches at least 9/10 against the criteria below, in light and dark,
without losing the one-click copy flow. Copying the whole transcript, for notes or an
AI chat, is the main use, so criterion 1 weighs double.

## Criteria

| # | Criterion | Weight |
|---|-----------|--------|
| 1 | Copy flow: one visible, labelled action copies the full transcript from the collapsed bar without opening the panel. Feedback says what was copied. | 2 |
| 2 | Every toggle shows whether it is on, and no icon suggests a different action. | 1 |
| 3 | Timestamps look like jump targets and look the same in every list: text-view search results and the timeline. | 1 |
| 4 | Search: the focus ring follows the rounded field, matches are counted in words, "no matches" shows in both views, copying matches is a labelled action next to the results. | 1 |
| 5 | The toolbar stays on one row at the normal sidebar width, with no duplicated actions. | 1 |
| 6 | The view switch reads as two options with distinct icons. | 1 |
| 7 | Before a transcript is loaded, "Get transcript" is the obvious next step. | 1 |
| 8 | Status text is plain language, for example "English" instead of "en". | 1 |
| 9 | Native YouTube look in light and dark, keyboard focus visible, every control labelled. | 1 |

Score = weighted mean of 0 to 10 per criterion.

## 1.3.1 baseline

Captured with `ux-states.mjs` on NASA ScienceCasts CjjNRUSX348, light and dark.

| # | Score | Finding |
|---|-------|---------|
| 1 | 7 | Copy is an unlabelled icon on the bar. Feedback is only "Copied". |
| 2 | 3 | The timestamp and auto-load toggles never show their state. The auto-load icon is a circular arrow, which reads as "reload". |
| 3 | 5 | The timeline shows blue times, but text-view search results show raw `[00:35]` text. |
| 4 | 4 | A square focus outline sits inside the round search field. The count is a bare number. The timeline shows nothing at all for zero matches. Copying matches is a funnel icon. |
| 5 | 4 | While searching, the funnel, copy and download icons wrap onto a second row. The toolbar copy duplicates the bar's copy. |
| 6 | 6 | The text-view icon equals the panel's title icon. The timeline icon is a grid of squares. |
| 7 | 6 | "Get transcript" looks the same before and after loading. |
| 8 | 6 | "Loaded: en". |
| 9 | 8 | Palettes are correct in both themes. Focus is visible but uneven, see 4. |

Weighted score: 5.6/10.

## 1.3.2 result

Same capture script and video, plus a Shorts drawer and a 600 px viewport. The build was checked as the unpacked `extension.zip`.

| # | Score | Change |
|---|-------|--------|
| 1 | 9 | The bar has a labelled "Copy" pill, outlined while collapsed. One click copies everything and the title briefly reads "Copied 568 words". |
| 2 | 9 | A switched-on toggle gets an accent disc, and its tooltip says on or off. Auto-load uses a lightning bolt. |
| 3 | 9 | One caption row for search results and the timeline. The timestamp is a tinted pill that fills on hover and on the current line. |
| 4 | 9 | The focus ring follows the round field. A results line says "8 matches" or "No matches for “…”" in both views, next to a labelled "Copy matches". |
| 5 | 9 | Search, view switch and download fit on one row. The duplicate toolbar copy is gone. |
| 6 | 9 | A segmented switch with a paragraph icon and a timeline icon. |
| 7 | 9 | "Get transcript" is a filled primary button until a transcript is loaded. |
| 8 | 9 | Status shows the track name, e.g. "English" or "English (auto-generated)", without a doubled "(auto)". |
| 9 | 9 | Unchanged palettes, rings on every new control, labels kept for screen readers. |

Weighted score: 9.0/10. This is a judgment against the criteria above, not a measurement.

Remaining nits: the text view stays plain text on purpose, for selecting and copying, and the clock and bolt icons rely on tooltips.

## Verification

- `npm test`: 51 tests, 49 pass, 2 skipped. New tests cover the plain track name, the word count, copy feedback, match labels and the doubled auto label. Each one failed before its change.
- Browser smoke on the unpacked 1.3.2 ZIP, `jNQXAC9IVRw`, real Chromium under Xvfb: 26 of 26 checks pass. They include a quick copy from the collapsed bar that copies the whole transcript, the word count in the feedback, a visible toggle state, "Copy matches", seeking from the timeline, the no-match message, a narrow layout and no page errors.

## 1.3.3 name and icon

The extension is renamed from "YouTube Transcript Reader" to "Copy Transcript for YouTube". The new name leads with the main use, and "for YouTube" is the form YouTube's branding guidelines allow instead of starting a product name with the trademark. The promo tiles are redone with the new name and icon, and the marquee tile carries an unedited crop of the 1.3.2 panel.


The store and the extension showed two different icons: a red speech bubble in the store and a red play-and-lines square in the extension. Both now use one flat speech bubble, `src/static/icon.svg`, rendered to 16, 48 and 128 px. The 128 px file keeps Chrome's 96 px artwork with 16 px of transparent padding. The UI is unchanged from 1.3.2.

Verified on the unpacked 1.3.3 ZIP: `npm test` 49 pass and 2 skipped, the same browser smoke with 26 of 26 checks, and chrome://extensions showing "Copy Transcript for YouTube" 1.3.3 with the new icon.
