// Populate time zone options
const timeZoneSelect = document.getElementById('timeZone');
Intl.supportedValuesOf('timeZone').forEach(tz => {
  const option = document.createElement('option');
  option.value = tz;
  option.textContent = tz;
  timeZoneSelect.appendChild(option);
});

// Saves options to chrome.storage
function save_options() {
  var excludedDomains = document.getElementById('excludedDomains').value.split('\n').map(s => s.trim()).filter(Boolean);
  var timeZone = document.getElementById('timeZone').value;
  chrome.storage.local.set({
    config: { excludedDomains: excludedDomains },
    userTimeZone: timeZone
  }, function() {
    // Update status to let user know options were saved.
    var status = document.getElementById('status');
    status.textContent = 'Options saved.';
    setTimeout(function() {
      status.textContent = '';
    }, 750);

    // Send message to background script to update config and time zone
    chrome.runtime.sendMessage({action: "updateConfig", config: { excludedDomains: excludedDomains }});
    chrome.runtime.sendMessage({action: "updateTimeZone", timeZone: timeZone});
  });
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restore_options() {
  chrome.storage.local.get({
    config: { excludedDomains: [] },
    userTimeZone: 'UTC'
  }, function(items) {
    document.getElementById('excludedDomains').value = items.config.excludedDomains.join('\n');
    document.getElementById('timeZone').value = items.userTimeZone;
  });
}

document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click', save_options);