# Chrome Web Store listing, 1.3.3

This file holds the exact text for the store. The name and the short description come from `src/static/manifest.json`.

## Name
Copy Transcript for YouTube

## Short description
Copy a YouTube video's full transcript in one click. Search it, download it, and click timestamps to jump.

## Description
Copy a YouTube video's full transcript in one click and paste it into notes, docs or any AI chat.

Copy Transcript for YouTube adds a clean transcript panel directly on YouTube watch pages.

It lets you read subtitles without opening YouTube's built-in transcript menu, search through the text, copy useful sections, save the full transcript, and click timestamps to jump to the matching moment in the video.

Features:
- One-click copy of the full transcript, even with the panel collapsed
- Shows available captions in an inline panel
- Supports manual and auto-generated captions when available
- Search transcript text with highlighted results
- Click transcript timestamps to seek in the video
- Copy the full transcript or only filtered search results
- Download transcript text as a .txt file
- Optional timestamp display
- Timeline view for easier scanning
- Auto-load option for repeated use
- Works on YouTube watch pages and adapts to Shorts layout

Privacy:
This extension does not sell your data or send it to any server of its own. Transcript processing happens locally in your browser. The extension only runs on YouTube pages so it can read available caption data and display it in the panel.

Good for:
- Pasting a video into an AI chat to summarize it or ask questions
- Students taking notes from lectures
- Researchers finding quotes
- Language learners reading along
- Creators reviewing spoken content
- Anyone who prefers reading or searching video transcripts

## Category
Tools

## Language
English

## Privacy URL
https://github.com/adelost/yt-subtl/blob/master/PRIVACY.md

## Privacy tab
- Data handled: Website content, User activity. Google requires disclosure even when data is only processed locally.
- All three certifications checked. No remote code.

## Package and pictures
- Build: `npm ci`, then `npm run package`. Package version and manifest version must agree.
- Upload `extension.zip`, not the source repository.
- Screenshots: `store-assets/screenshot-1-timeline.png` and `store-assets/screenshot-2-search-dark.png`, 1280x800 browser captures of version 1.3.2 (unchanged UI in 1.3.3) on "NASA ScienceCasts: Cool Science on the International Space Station" by NASA Science (CjjNRUSX348), which YouTube lists under Creative Commons Attribution. Credit is visible in the captures as the channel name and title.
- Promo tiles and icon: `store-assets/small-promo-440x280.png`, `store-assets/marquee-promo-1400x560.png`, `store-assets/store-icon-128.png`.
- Verification: `docs/qa/2026-10-15/README.md`.

Google approval and public availability are separate from upload and submission.
