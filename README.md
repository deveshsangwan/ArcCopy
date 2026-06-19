# QuickClip URL

A Chrome extension for quickly copying the current tab's URL using a keyboard shortcut.

## Features

- Copy current tab URL with Alt+Shift+C (Command+Shift+X on Mac)
- Works with browser-managed pages (chrome://, edge://, about:) when Chrome exposes the active tab URL
- Shows brief notification when URL is copied
- Supports all webpage URLs
- Uses the `alarms` permission to clean up copy-result notifications after the MV3 service worker has been suspended or restarted (Chrome may defer alarm delivery under its scheduling policy)

## Installation

### Option 1: Chrome Web Store

1. Visit the [QuickClip URL](https://chromewebstore.google.com/detail/quickclip-url/behoinhilcboiiponbbnfgjnocomomdh) on Chrome Web Store
2. Click "Add to Chrome"
3. Confirm the installation when prompted

### Option 2: Manual Installation (Development)

1. Build the extension using `pnpm build`
2. Open Chrome and navigate to `chrome://extensions`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the `dist` directory

## Development

### Prerequisites

- Node.js (v18.18 or higher)
- pnpm package manager

### Setup

```bash
# Install dependencies
pnpm install

# Build the extension
pnpm build

# Lint the code
pnpm lint
