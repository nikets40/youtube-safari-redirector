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

function openInSafari(url) {
  const cleanUrl = url.replace(/^https?:\/\//, '');
  window.location.href = `openinsafari://${cleanUrl}`;
}

document.addEventListener('click', (e) => {
  if (e.ctrlKey || e.metaKey || e.shiftKey) {
    return;
  }

  const link = e.target.closest('a');

  if (link && isYouTubeVideo(link.href)) {
    e.preventDefault();
    e.stopPropagation();

    chrome.runtime.sendMessage({ action: 'shouldRedirect', url: link.href }, (response) => {
      if (response && response.shouldRedirect) {
        openInSafari(link.href);
      } else {
        window.location.href = link.href;
      }
    });
  }
}, true);

function checkCurrentUrl() {
  if (isYouTubeVideo(window.location.href)) {
    chrome.runtime.sendMessage({ action: 'shouldRedirect', url: window.location.href }, (response) => {
      if (!response || !response.shouldRedirect) {
        return;
      }

      if (response.pending) {
        return;
      }

      if (response.closeTab) {
        setTimeout(() => {
          openInSafari(window.location.href);
          setTimeout(() => {
            chrome.runtime.sendMessage({ action: 'closeThisTab' });
          }, 200);
        }, 500);
      } else {
        openInSafari(window.location.href);
      }
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
