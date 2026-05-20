# Technical Documentation

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Chrome Extension                        │
├─────────────────────────────────────────────────────────────┤
│  manifest.json      - Extension configuration               │
│  content.js         - Runs on web pages, intercepts clicks  │
│  background.js      - Service worker, manages state         │
│  popup.html/js/css  - Enable/disable toggle UI              │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
              openinsafari://www.youtube.com/watch?v=...
                           │
                           ▼
                    OpenInSafari.app
                           │
                           ▼
                      Safari Browser
```

## File Structure

```
youtube-safari-redirector/
├── manifest.json          # Extension manifest (Manifest V3)
├── content.js            # Content script - link interception
├── background.js         # Service worker - background logic
├── popup.html            # Popup UI
├── popup.js              # Popup logic
├── popup.css             # Popup styles
├── icon*.png             # Extension icons
└── OpenInSafari.app/     # Native app for URL handling
    └── Contents/
        └── Info.plist    # URL scheme registration
```

## Components

### Manifest V3

```json
{
  "manifest_version": 3,
  "permissions": [
    "tabs",
    "webNavigation",
    "contextMenus",
    "storage",
    "scripting"
  ],
  "host_permissions": ["<all_urls>"],
  "background": { "service_worker": "background.js" },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "run_at": "document_start"
    }
  ]
}
```

### Content Script (content.js)

The content script runs on every page at `document_start` (before page renders).

**Responsibilities:**

1. Intercept click events on YouTube video links
2. Prevent default navigation
3. Ask background if redirect should happen
4. Open Safari via `openinsafari://` URL scheme

**URL Pattern Matching:**

```javascript
const YOUTUBE_PATTERNS = [
  /^https?:\/\/(www\.)?youtube\.com\/watch\?v=[^&]+/,
  /^https?:\/\/youtu\.be\/[a-zA-Z0-9_-]+/,
];
```

Excludes URLs containing `/shorts/`.

**Click Flow:**

1. User clicks a YouTube link
2. `preventDefault()` stops Chrome's navigation
3. Send message to background: `shouldRedirect`
4. If enabled, `window.location.href = 'openinsafari://www.youtube.com/watch?v=...'`
5. If disabled, `window.location.href = link.href` (normal Chrome behavior)

### Background Script (background.js)

The service worker manages extension state and handles complex flows.

**State Management:**

```javascript
let isEnabled = true;
chrome.storage.local.get(['enabled'], ...);
chrome.storage.onChanged.addListener(...);
```

**Key Features:**

1. **Pending Tab Tracking**
   - New tabs from Cmd+click are tracked in a Map
   - When user clicks the tab, redirect triggers
   - Prevents redirect while tab is in background

2. **Message Handling**
   - `shouldRedirect` - Check if enabled, return redirect decision
   - `closeThisTab` - Close the sending tab

3. **Navigation Detection**
   - `webNavigation.onCreatedNavigationTarget` - Detect new tab creation
   - `webNavigation.onCommitted` - Detect address bar URL entry
   - `tabs.onActivated` - Detect when user clicks a pending tab

### Popup UI

Simple toggle with:

- Enable/disable checkbox
- Status text
- Supported URL list
- No-transition initialization to prevent UI flash

## URL Scheme Registration

The `OpenInSafari.app` registers the `openinsafari://` URL scheme via its `Info.plist`:

```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLName</key>
    <string>Safari URL</string>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>openinsafari</string>
    </array>
  </dict>
</array>
```

### Registration Commands

```bash
# Kill and rebuild Launch Services database
lsregister -kill -r -domain local -domain system -domain user

# Register specific app
lsregister -f /Applications/OpenInSafari.app

# Clear extended attributes
xattr -cr /Applications/OpenInSafari.app
```

## Flow Diagrams

### Normal Click Flow

```
User clicks YouTube link
       │
       ▼
content.js: intercepts click
       │
       ▼
preventDefault() stops navigation
       │
       ▼
chrome.runtime.sendMessage({action: 'shouldRedirect'})
       │
       ▼
background.js: checks isEnabled
       │
       ▼
sendResponse({shouldRedirect: true/false})
       │
       ▼
content.js: if enabled → window.location.href = 'openinsafari://...'
           if disabled → window.location.href = link.href
```

### Cmd+Click Flow

```
User Cmd+clicks YouTube link
       │
       ▼
Chrome creates new tab, starts navigation
       │
       ▼
background.js: webNavigation.onCreatedNavigationTarget
       │
       ▼
Add tabId to pendingRedirectTabs Map
       │
       ▼
content.js: runs on new tab, checkCurrentUrl()
       │
       ▼
chrome.runtime.sendMessage({action: 'shouldRedirect'})
       │
       ▼
background.js: tabId is in pendingTabs → sendResponse({pending: true})
       │
       ▼
content.js: pending=true, do nothing
       │
       ▼
User clicks on the new tab
       │
       ▼
background.js: tabs.onActivated fires
       │
       ▼
tabId found in pendingRedirectTabs
       │
       ▼
Remove from Map, executeScript to open Safari
       │
       ▼
chrome.tabs.remove(tabId) - close the Chrome tab
```

## Permissions

| Permission      | Purpose                                    |
| --------------- | ------------------------------------------ |
| `tabs`          | Create/remove tabs, detect tab activation  |
| `webNavigation` | Detect navigation events, new tab creation |
| `contextMenus`  | Add "Open in Safari" to right-click menu   |
| `storage`       | Save enabled/disabled state                |
| `scripting`     | Execute scripts to open Safari URLs        |
| `<all_urls>`    | Intercept links on any page                |

## Storage Schema

```javascript
chrome.storage.local.get(["enabled"], (result) => {
  // result.enabled: boolean (default: true)
});
```

## Error Handling

1. **Message timeout** - Content script proceeds with default behavior if background doesn't respond
2. **Tab not found** - Background gracefully handles missing tabs
3. **Extension disabled** - All redirects bypassed, links work normally

## Security Considerations

1. **URL validation** - Only `youtube.com/watch` and `youtu.be` URLs are intercepted
2. **Shorts exclusion** - URLs with `/shorts/` are explicitly blocked
3. **No external communication** - Extension doesn't send data anywhere
4. **Minimal permissions** - Only what's necessary for functionality
