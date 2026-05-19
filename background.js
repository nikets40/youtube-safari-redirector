// YouTube URL pattern
const YOUTUBE_PATTERNS = [
  /^https?:\/\/(www\.)?youtube\.com\/watch\?v=[^&]+/,
  /^https?:\/\/youtu\.be\/[a-zA-Z0-9_-]+/
];

function isYouTubeVideo(url) {
  if (!url) return false;
  const matchesPattern = YOUTUBE_PATTERNS.some(pattern => pattern.test(url));
  if (!matchesPattern) return false;
  if (url.includes('/shorts/')) return false;
  return true;
}

// Create context menu on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'openInSafari',
    title: 'Open in Safari',
    contexts: ['link'],
    targetUrlPatterns: [
      '*://*.youtube.com/watch*',
      '*://youtu.be/*'
    ]
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'openInSafari' && info.linkUrl) {
    // Strip protocol if present
    const cleanUrl = info.linkUrl.replace(/^https?:\/\//, '');
    // Use scripting to open Safari from the tab
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (url) => {
        window.location.href = `openinsafari://${url}`;
      },
      args: [cleanUrl]
    });
  }
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'openInSafariAndCloseTab') {
    // This is for middle-click case
    // We need to open Safari in the NEW tab that was created, then close it
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && isYouTubeVideo(tabs[0].url)) {
        const tabId = tabs[0].id;
        const cleanUrl = message.url.replace(/^https?:\/\//, '');
        chrome.scripting.executeScript({
          target: { tabId: tabId },
          func: (url) => {
            window.location.href = `openinsafari://${url}`;
          },
          args: [cleanUrl]
        }).then(() => {
          // Close the tab after opening Safari
          setTimeout(() => {
            chrome.tabs.remove(tabId);
          }, 500);
        });
      }
    });
    sendResponse({ success: true });
  }

  if (message.action === 'closeThisTab') {
    // Close the tab that sent the message
    if (sender.tab) {
      setTimeout(() => {
        chrome.tabs.remove(sender.tab.id);
      }, 500);
    }
    sendResponse({ success: true });
  }
});

// Detect when user pastes YouTube URL in address bar (new tab)
// This is for when user manually types/pastes a URL
chrome.webNavigation.onCommitted.addListener((details) => {
  // Only process main frame, address_bar transition (user typed/pasted URL)
  if (details.frameId === 0 && details.transitionType === 'address_bar') {
    const url = details.url;

    if (isYouTubeVideo(url)) {
      // Strip protocol
      const cleanUrl = url.replace(/^https?:\/\//, '');
      // Use scripting to open Safari and close the tab
      chrome.scripting.executeScript({
        target: { tabId: details.tabId },
        func: (safariUrl) => {
          window.location.href = safariUrl;
        },
        args: [`openinsafari://${cleanUrl}`]
      }).then(() => {
        // Close this tab after opening Safari
        setTimeout(() => {
          chrome.tabs.remove(details.tabId);
        }, 500);
      });
    }
  }
});
