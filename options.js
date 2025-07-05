// Populate time zone options
const timeZoneSelect = document.getElementById('timeZone');
Intl.supportedValuesOf('timeZone').forEach(tz => {
  const option = document.createElement('option');
  option.value = tz;
  option.textContent = tz;
  timeZoneSelect.appendChild(option);
});

// Validate domain format
function isValidDomain(domain) {
  const domainPattern = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return domainPattern.test(domain) || domain.startsWith('chrome://') || domain.startsWith('chrome-extension://');
}

// Show status message
function showStatus(message, isError = false) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.style.color = isError ? '#f44336' : '#4CAF50';
  setTimeout(() => {
    status.textContent = '';
    status.style.color = '';
  }, 3000);
}

// Saves options to chrome.storage
function save_options() {
  const excludedDomainsText = document.getElementById('excludedDomains').value;
  const timeZone = document.getElementById('timeZone').value;
  const enableContentAnalysis = document.getElementById('enableContentAnalysis').checked;

  // Validate and process excluded domains
  const excludedDomains = excludedDomainsText
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean);

  // Validate each domain
  const invalidDomains = excludedDomains.filter(domain => !isValidDomain(domain));
  if (invalidDomains.length > 0) {
    showStatus(`Invalid domains: ${invalidDomains.join(', ')}`, true);
    return;
  }

  // Validate timezone
  if (!timeZone || !Intl.supportedValuesOf('timeZone').includes(timeZone)) {
    showStatus('Invalid timezone selected', true);
    return;
  }
  // Save to storage
  chrome.storage.local.set({
    config: {
      excludedDomains: excludedDomains,
      enableContentAnalysis: enableContentAnalysis
    },
    userTimeZone: timeZone
  }, function() {
    if (chrome.runtime.lastError) {
      showStatus(`Save failed: ${chrome.runtime.lastError.message}`, true);
      return;
    }

    showStatus('Options saved successfully');

    // Send message to background script to update config and time zone
    chrome.runtime.sendMessage({action: "updateConfig", config: {
      excludedDomains: excludedDomains,
      enableContentAnalysis: enableContentAnalysis
    }}, () => {
      if (chrome.runtime.lastError) {
        console.error('Failed to update config:', chrome.runtime.lastError);
      }
    });

    chrome.runtime.sendMessage({action: "updateTimeZone", timeZone: timeZone}, () => {
      if (chrome.runtime.lastError) {
        console.error('Failed to update timezone:', chrome.runtime.lastError);
      }
    });
  });
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restore_options() {
  chrome.storage.local.get({
    config: {
      excludedDomains: [],
      enableContentAnalysis: false // Default to false for privacy
    },
    userTimeZone: 'UTC'
  }, function(items) {
    document.getElementById('excludedDomains').value = items.config.excludedDomains.join('\n');
    document.getElementById('timeZone').value = items.userTimeZone;
    document.getElementById('enableContentAnalysis').checked = items.config.enableContentAnalysis || false;
  });
}

document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click', save_options);