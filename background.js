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

const pendingRedirectTabs = new Map();

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
  if (info.menuItemId === 'openInSafari' && info.linkUrl) {
    const cleanUrl = info.linkUrl.replace(/^https?:\/\//, '');
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (url) => {
        window.location.href = `openinsafari://${url}`;
      },
      args: [cleanUrl]
    });
  }
});

chrome.webNavigation.onCreatedNavigationTarget.addListener((details) => {
  if (details.url && isYouTubeVideo(details.url)) {
    pendingRedirectTabs.set(details.tabId, details.url);
  }
});

chrome.tabs.onActivated.addListener((activeInfo) => {
  const tabId = activeInfo.tabId;

  if (pendingRedirectTabs.has(tabId)) {
    const url = pendingRedirectTabs.get(tabId);
    pendingRedirectTabs.delete(tabId);

    const cleanUrl = url.replace(/^https?:\/\//, '');

    chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: (safariUrl) => {
        window.location.href = safariUrl;
      },
      args: [`openinsafari://${cleanUrl}`]
    }).then(() => {
      setTimeout(() => {
        chrome.tabs.remove(tabId);
      }, 300);
    });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'checkPending') {
    const tabId = sender.tab?.id;
    if (tabId && pendingRedirectTabs.has(tabId)) {
      sendResponse({ pending: true, url: pendingRedirectTabs.get(tabId) });
    } else {
      sendResponse({ pending: false });
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
  if (details.frameId === 0 && details.transitionType === 'address_bar') {
    const url = details.url;
    if (isYouTubeVideo(url) && !pendingRedirectTabs.has(details.tabId)) {
      const cleanUrl = url.replace(/^https?:\/\//, '');
      chrome.scripting.executeScript({
        target: { tabId: details.tabId },
        func: (safariUrl) => {
          window.location.href = safariUrl;
        },
        args: [`openinsafari://${cleanUrl}`]
      }).then(() => {
        setTimeout(() => {
          chrome.tabs.remove(details.tabId);
        }, 300);
      });
    }
  }
});
