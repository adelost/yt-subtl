# Privacy Policy for YouTube Transcript Reader

Last updated: October 15, 2026

YouTube Transcript Reader is a Chrome extension that adds a transcript panel to YouTube watch pages.

## Single Purpose

The extension has one purpose: to make YouTube transcripts easier to read and use by showing available captions in a clean panel with search, copy/download, and timestamp navigation.

## Data Handled

The extension handles the following data locally in the browser:

- Website content: YouTube caption and transcript text for the video currently open in the active YouTube page.
- User activity: interactions needed for the transcript feature, such as opening the transcript panel, searching transcript text, copying or downloading transcript text, and clicking timestamps to seek in the video.
- Local preferences: display settings such as transcript view mode, timestamp display, and auto-load preference.

## How Data Is Used

Transcript and caption data is used only to display, search, copy, download, and navigate transcripts for the current YouTube video. User interactions are used only to provide the transcript panel features.

## Data Sharing

The extension does not collect, sell, transfer, or share user data with third parties. It does not send transcript data, browsing data, or user activity to any developer-owned server.

The extension may request caption or transcript data from YouTube in the user's browser so it can display transcripts for the current video.

Display preferences are saved in the browser's local storage for the YouTube origin. Transcript text is held in page memory unless the user explicitly copies or downloads it. YouTube's own storage, network and account policies remain separate from this extension.

Since version 1.3.1, the extension uses a content script only on `www.youtube.com`. It requests no tabs, scripting, web-navigation or background-service-worker permissions. It observes caption requests made by that page locally. To load the caption track you choose, it asks the YouTube player on the page to load that track, reads the captions the player receives, and then restores your caption setting and caption language preference. For the default track it may also open YouTube's native transcript panel and close it again.

## Remote Code

The extension does not execute remote code. All JavaScript and CSS are packaged with the extension.

## Chrome Web Store Limited Use Disclosure

The use of information received from Chrome extension permissions will adhere to the Chrome Web Store User Data Policy, including the Limited Use requirements.

The extension uses user data only to provide or improve its single purpose, does not sell or transfer user data to third parties except as allowed by policy, and does not use user data to determine creditworthiness or for lending purposes.

## Contact

For privacy questions, use the support contact listed on the Chrome Web Store item page.
