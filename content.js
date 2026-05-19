// YouTube URL pattern - matches youtube.com/watch?v= and youtu.be
const YOUTUBE_PATTERNS = [
  /^https?:\/\/(www\.)?youtube\.com\/watch\?v=[^&]+/,
  /^https?:\/\/youtu\.be\/[a-zA-Z0-9_-]+/
];

// Check if URL is a YouTube video (not shorts)
function isYouTubeVideo(url) {
  if (!url) return false;

  // Must match YouTube pattern
  const matchesPattern = YOUTUBE_PATTERNS.some(pattern => pattern.test(url));

  if (!matchesPattern) return false;

  // Explicitly exclude Shorts
  if (url.includes('/shorts/')) return false;

  return true;
}

// Open URL in Safari and optionally close the current tab
function openInSafari(url, closeTab = false) {
  // Strip protocol if present to avoid double https://
  const cleanUrl = url.replace(/^https?:\/\//, '');
  // Open Safari directly - content script has window access
  window.location.href = `openinsafari://${cleanUrl}`;

  // If we need to close this tab (e.g., for middle-click)
  if (closeTab) {
    // Tell background to close this tab after a short delay
    chrome.runtime.sendMessage({
      action: 'closeThisTab'
    });
  }
}

// Intercept click events on YouTube links
document.addEventListener('click', (e) => {
  // Don't interfere with non-YouTube clicks
  if (e.ctrlKey || e.metaKey || e.shiftKey) {
    return; // Let Ctrl/Cmd/Shift clicks through
  }

  const link = e.target.closest('a');

  if (link && isYouTubeVideo(link.href)) {
    e.preventDefault();
    e.stopPropagation();

    // Open in Safari directly
    openInSafari(link.href);
  }
}, true);

// Intercept middle-click (open in new tab) - this happens AFTER the new tab is created
document.addEventListener('auxclick', (e) => {
  if (e.button === 1) { // Middle click
    const link = e.target.closest('a');

    if (link && isYouTubeVideo(link.href)) {
      e.preventDefault();
      // For middle-click, we need to open Safari but also close the NEW tab that was created
      // Since we can't easily detect that, we tell background to handle it
      chrome.runtime.sendMessage({
        action: 'openInSafariAndCloseTab',
        url: link.href
      });
    }
  }
});

// Check if user navigated to YouTube directly (address bar)
function checkCurrentUrl() {
  if (isYouTubeVideo(window.location.href)) {
    // Small delay to ensure we're not interrupting page load
    setTimeout(() => {
      openInSafari(window.location.href, true);
    }, 500);
  }
}

// Run on page load
checkCurrentUrl();

// Also listen for URL changes (SPA navigation)
let lastUrl = window.location.href;
new MutationObserver(() => {
  if (window.location.href !== lastUrl) {
    lastUrl = window.location.href;
    checkCurrentUrl();
  }
}).observe(document.body, { subtree: true, childList: true });
