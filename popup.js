const enabledToggle = document.getElementById('enabled');
const statusText = document.getElementById('status');

// Load saved state
chrome.storage.local.get(['enabled'], (result) => {
  enabledToggle.checked = result.enabled !== false;
  updateStatus();
});

// Save state on toggle
enabledToggle.addEventListener('change', () => {
  chrome.storage.local.set({ enabled: enabledToggle.checked });
  updateStatus();
});

function updateStatus() {
  statusText.textContent = enabledToggle.checked ? 'Enabled' : 'Disabled';
  statusText.className = enabledToggle.checked ? 'enabled' : 'disabled';
}
