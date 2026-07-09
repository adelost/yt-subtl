# YouTube Transcript Reader

Adds an inline panel on YouTube watch pages to fetch and display full subtitles/transcripts.

## Features

- Extract transcripts from YouTube videos with available captions
- Search transcript text directly on the watch page
- Click timestamps to jump to the matching moment in the video
- Copy the transcript or current search results
- Download transcripts as `.txt` files
- Optional timestamp display
- Multi-language support with automatic selection

## Development

### Setup

```bash
npm install
```

### Build

```bash
npm run build
```

The bundled extension will be output to `dist/`.

### Watch mode

```bash
npm run watch
```

### Testing

```bash
npm test
```

## Project Structure

```
yt-subtl/
├── src/                    # Source code
│   ├── lib/               # Reusable business logic
│   │   ├── utils.js       # Generic utilities
│   │   ├── parsers.js     # Transcript format parsers
│   │   ├── youtube.js     # YouTube API extraction
│   │   └── fetcher.js     # TranscriptFetcher class
│   ├── ui/                # UI-specific code
│   │   ├── state.js       # State management
│   │   ├── actions.js     # Event handlers
│   │   └── panel.js       # UI building
│   └── content-script.js  # Main entry point
├── dist/                  # Built extension (load this in Chrome)
│   ├── content-script.js  # Bundled output
│   ├── background.js      # Service worker
│   ├── styles.css         # Styles
│   └── manifest.json      # Extension manifest
├── tests/                 # Unit tests
└── package.json
```

## Installation

1. Run `npm install && npm run build`
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select the `dist/` directory

## Architecture

The extension uses ES6 modules bundled with Rollup for a clean, modular codebase:

- **lib/** - Domain logic and utilities (reusable across contexts)
- **ui/** - User interface components and state management
- **Singleton patterns** - Keyboard shortcuts and observers initialized once
- **Defensive coding** - Guards against null state during navigation

## License

MIT
