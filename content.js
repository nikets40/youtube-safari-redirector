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

function openInSafari(url, closeTab = false) {
  const cleanUrl = url.replace(/^https?:\/\//, '');
  window.location.href = `openinsafari://${cleanUrl}`;

  if (closeTab) {
    chrome.runtime.sendMessage({ action: 'closeThisTab' });
  }
}

document.addEventListener('click', (e) => {
  if (e.ctrlKey || e.metaKey || e.shiftKey) {
    return;
  }

  const link = e.target.closest('a');

  if (link && isYouTubeVideo(link.href)) {
    e.preventDefault();
    e.stopPropagation();
    openInSafari(link.href);
  }
}, true);

function checkCurrentUrl() {
  if (isYouTubeVideo(window.location.href)) {
    chrome.runtime.sendMessage({ action: 'checkPending' }, (response) => {
      if (response && response.pending) {
        return;
      }
      setTimeout(() => {
        openInSafari(window.location.href, true);
      }, 500);
    });
  }
}

function setupMutationObserver() {
  if (document.body) {
    let lastUrl = window.location.href;
    new MutationObserver(() => {
      if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        checkCurrentUrl();
      }
    }).observe(document.body, { subtree: true, childList: true });
  } else {
    requestAnimationFrame(setupMutationObserver);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupMutationObserver);
} else {
  setupMutationObserver();
}

checkCurrentUrl();
