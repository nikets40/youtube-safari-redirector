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

function cleanUrl(url) {
  return url.replace(/^https?:\/\//, '');
}

const pendingRedirectTabs = new Map();
let isEnabled = true;

chrome.storage.local.get(['enabled'], (result) => {
  isEnabled = result.enabled !== false;
});

chrome.storage.onChanged.addListener((changes) => {
  if (changes.enabled) {
    isEnabled = changes.enabled.newValue !== false;
  }
});

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

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!isEnabled) return;

  if (info.menuItemId === 'openInSafari' && info.linkUrl) {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (url) => {
        window.location.href = `openinsafari://${url}`;
      },
      args: [cleanUrl(info.linkUrl)]
    });
  }
});

chrome.webNavigation.onCreatedNavigationTarget.addListener((details) => {
  if (!isEnabled) return;

  if (details.url && isYouTubeVideo(details.url)) {
    pendingRedirectTabs.set(details.tabId, details.url);
  }
});

chrome.tabs.onActivated.addListener((activeInfo) => {
  if (!isEnabled) return;

  const tabId = activeInfo.tabId;

  if (pendingRedirectTabs.has(tabId)) {
    const url = pendingRedirectTabs.get(tabId);
    pendingRedirectTabs.delete(tabId);

    chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: (safariUrl) => {
        window.location.href = safariUrl;
      },
      args: [`openinsafari://${cleanUrl(url)}`]
    }).then(() => {
      setTimeout(() => {
        chrome.tabs.remove(tabId);
      }, 300);
    });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'shouldRedirect') {
    if (!isEnabled) {
      sendResponse({ shouldRedirect: false });
      return true;
    }

    const tabId = sender.tab?.id;

    if (tabId && pendingRedirectTabs.has(tabId)) {
      sendResponse({ shouldRedirect: true, pending: true });
    } else {
      sendResponse({ shouldRedirect: true, pending: false, closeTab: true });
    }
    return true;
  }

  if (message.action === 'closeThisTab') {
    if (sender.tab) {
      pendingRedirectTabs.delete(sender.tab.id);
      setTimeout(() => {
        chrome.tabs.remove(sender.tab.id);
      }, 300);
    }
    sendResponse({ success: true });
  }
});

chrome.webNavigation.onCommitted.addListener((details) => {
  if (!isEnabled) return;

  if (details.frameId === 0 && details.transitionType === 'address_bar') {
    const url = details.url;
    if (isYouTubeVideo(url) && !pendingRedirectTabs.has(details.tabId)) {
      chrome.scripting.executeScript({
        target: { tabId: details.tabId },
        func: (safariUrl) => {
          window.location.href = safariUrl;
        },
        args: [`openinsafari://${cleanUrl(url)}`]
      }).then(() => {
        setTimeout(() => {
          chrome.tabs.remove(details.tabId);
        }, 300);
      });
    }
  }
});
