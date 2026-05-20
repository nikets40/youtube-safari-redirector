# YouTube to Safari Redirector

A Chrome extension that redirects YouTube video links to Safari using a custom URL scheme.

## Overview

When you're browsing YouTube in Chrome but prefer watching videos in Safari (perhaps for Picture-in-Picture, better battery life, or other Safari-specific features), this extension intercepts YouTube video links and opens them in Safari automatically.

**Supported URLs:**
- `https://www.youtube.com/watch?v=...`
- `https://youtu.be/...`

**Not redirected:**
- YouTube Shorts
- Embedded videos
- Non-video YouTube pages

## How It Works

| Action | Behavior |
|--------|----------|
| Click on video link | Opens video in Safari, stays on current page |
| Cmd+click / Open in new tab | New tab created, waits for you to click on it, then opens in Safari |
| Paste URL in address bar | Opens in Safari, closes the Chrome tab |
| Extension disabled | Videos open normally in Chrome |

## Installation

### 1. Install the Safari App

The extension requires the `OpenInSafari.app` helper to open URLs in Safari.

```bash
# Copy the app to Applications
cp -R OpenInSafari.app /Applications/

# Register the URL scheme with macOS
/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister \
  -kill -r -domain local -domain system -domain user

# Register the app specifically
/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister \
  -f /Applications/OpenInSafari.app

# Clear any extended attributes
xattr -cr /Applications/OpenInSafari.app
```

### 2. Allow the URL Scheme

The first time you click a YouTube link with the extension enabled, macOS will ask if Chrome can open `openinsafari://` URLs. Click **Allow** and optionally check **"Always allow"** to prevent future prompts.

### 3. Install the Chrome Extension

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top right)
3. Click **Load unpacked**
4. Select the `youtube-safari-redirector` folder

### 4. Test

Click any YouTube video link. It should open in Safari.

## Usage

### Enable/Disable

Click the extension icon in the Chrome toolbar to toggle. When disabled, YouTube links work normally in Chrome.

### Smart New Tab Handling

When you Cmd+click a video link:
- A new tab is created in the background
- The tab stays there until you click on it
- Once you click the tab, it opens in Safari and the tab closes
- This lets you queue videos without interrupting your current page

### Manual URL Paste

If you paste a YouTube URL directly in the address bar of a new tab, it opens in Safari and the tab closes automatically.

## Troubleshooting

### Videos still open in Chrome

1. Make sure the extension is enabled (toggle in popup)
2. Make sure you've allowed `openinsafari://` URLs in System Preferences

### macOS asks for permission every time

When the permission dialog appears, check **"Always allow"** before clicking Allow.

### App not registered

Run the lsregister commands again:
```bash
/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister \
  -f /Applications/OpenInSafari.app
```

## Technical Documentation

See [docs/technical.md](docs/technical.md) for detailed technical documentation.

## Requirements

- macOS
- Chrome browser
- Safari browser
