const enabledToggle = document.getElementById('enabled');
const statusText = document.getElementById('status');
const toggleContainer = document.getElementById('toggleContainer');

toggleContainer.classList.add('no-transition');

chrome.storage.local.get(['enabled'], (result) => {
  enabledToggle.checked = result.enabled !== false;
  updateStatus();
  toggleContainer.classList.remove('hidden');

  requestAnimationFrame(() => {
    toggleContainer.classList.remove('no-transition');
  });
});

enabledToggle.addEventListener('change', () => {
  chrome.storage.local.set({ enabled: enabledToggle.checked });
  updateStatus();
});

function updateStatus() {
  statusText.textContent = enabledToggle.checked ? 'Enabled' : 'Disabled';
  statusText.className = enabledToggle.checked ? 'enabled' : 'disabled';
}
