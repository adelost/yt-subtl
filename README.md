# Copy Transcript for YouTube

A Chrome extension that adds a clean transcript panel to YouTube watch pages. It was called YouTube Transcript Reader before version 1.3.3.

Copy the whole transcript in one click, or read, search, download and jump by timestamp without opening YouTube's built-in transcript menu.

## Features

- Shows available manual and auto-generated captions when YouTube provides them
- Searches transcript text directly on the page
- Copies the transcript or current search results
- Downloads transcripts as `.txt` files
- Clicks timestamps to seek in the video
- Works on YouTube watch pages and adapts to Shorts layout
- Keeps cue timing when timestamps are hidden for reading or export
- Handles modern YouTube transcript data without extra extension permissions

## Privacy

Transcript data is processed locally in the browser. The extension does not send transcript data, browsing data, or user activity to any developer-owned server.

See [PRIVACY.md](PRIVACY.md).

## Build Locally

```bash
npm ci
npm run build
```

Then open `chrome://extensions/`, enable Developer mode, click "Load unpacked", and select `dist/`.

## Development

```bash
npm test
npm run watch
```

## Packaging and Mattias's desktop copy
For a Chrome Store archive, run `npm run package`. It validates manifest files, verifies archive bytes and produces a deterministic `extension.zip`.

Mattias's existing desktop launcher uses `Q:\yt-subtl-dev\dist`. Follow [AGENTS.md](AGENTS.md) to sync it, then reload the extension in Chrome. A synced folder is not a Chrome Store release.

Current verification and remaining release steps: [2026-10-10 QA](docs/qa/2026-10-10/README.md).

## License

MIT
