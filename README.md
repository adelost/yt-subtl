# YouTube Transcript Reader

A Chrome extension that adds a clean transcript panel to YouTube watch pages.

Read, search, copy, download, and jump by timestamp without opening YouTube's built-in transcript menu.

## Features

- Shows available manual and auto-generated captions when YouTube provides them
- Searches transcript text directly on the page
- Copies the transcript or current search results
- Downloads transcripts as `.txt` files
- Clicks timestamps to seek in the video
- Works on YouTube watch pages and adapts to Shorts layout

## Privacy

Transcript data is processed locally in the browser. The extension does not send transcript data, browsing data, or user activity to any developer-owned server.

See [PRIVACY.md](PRIVACY.md).

## Build Locally

```bash
npm install
npm run build
```

Then open `chrome://extensions/`, enable Developer mode, click "Load unpacked", and select `dist/`.

## Development

```bash
npm test
npm run watch
```

## License

MIT
