# QuickClip URL

A Chrome extension for quickly copying the current tab's URL using a keyboard shortcut.

## Features

- Copy current tab URL with Alt+Shift+C (Command+Shift+X on Mac)
- Works with restricted pages (chrome://, edge://, about:)
- Shows brief notification when URL is copied
- Supports all webpage URLs

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

- Node.js (v14 or higher)
- pnpm package manager

### Setup

```bash
# Install dependencies
pnpm install

# Build the extension
pnpm build

# Lint the code
pnpm lint