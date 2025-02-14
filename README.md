# QuickClip URL

A Chrome extension for quickly copying the current tab's URL using a keyboard shortcut.

## Features

- Copy current tab URL with Alt+Shift+C (Command+Shift+X on Mac)
- Works with restricted pages (chrome://, edge://, about:)
- Shows brief notification when URL is copied
- Supports all webpage URLs

## Development

```bash
# Install dependencies
pnpm install

# Build the extension
pnpm build

# Lint the code
pnpm lint
```

## Installation

1. Build the extension using `pnpm build`
2. Open Chrome and navigate to `chrome://extensions`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the `dist` directory

## License

ISC
