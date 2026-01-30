document.addEventListener('DOMContentLoaded', async () => {
    // --- DOM Elements ---
    const domainDisplay = document.getElementById('domain-display');
    const languageSelect = document.getElementById('language-select');
    const applyButton = document.getElementById('apply-button');
    const removeButton = document.getElementById('remove-button');
    const statusMessage = document.getElementById('status-message');

    let currentDomain = null;

    // --- Utility Functions ---

    /**
     * Gets the hostname from a URL.
     * @param {string} url The URL to parse.
     * @returns {string|null} The hostname or null.
     */
    function getHostname(url) {
        try {
            return new URL(url).hostname;
        } catch (e) {
            return null;
        }
    }

    /**
     * Displays a status message to the user.
     * @param {string} message The message to show.
     * @param {'success'|'error'} type The type of message.
     * @param {number} duration Time in ms to show the message.
     */
    function showStatus(message, type = 'success', duration = 3000) {
        statusMessage.textContent = message;
        statusMessage.className = `status-message ${type}`;
        setTimeout(() => {
            statusMessage.textContent = '';
            statusMessage.className = 'status-message';
        }, duration);
    }
    
    /**
     * Reloads the current tab and closes the popup.
     */
    function reloadAndClose() {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.reload(tabs[0].id);
            }
            window.close();
        });
    }

    // --- Initialization ---

    try {
        // Get the active tab to determine the current domain
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (tab && tab.url) {
            currentDomain = getHostname(tab.url);
        }
        
        if (currentDomain) {
            domainDisplay.textContent = currentDomain;

            // Get saved settings to populate the dropdown
            const { data } = await chrome.runtime.sendMessage({ action: 'getSettings' });
            const savedSetting = data.settings[currentDomain];

            if (savedSetting && savedSetting.language) {
                languageSelect.value = savedSetting.language;
                removeButton.disabled = false;
            } else {
                languageSelect.value = 'default';
                removeButton.disabled = true;
            }
        } else {
            // Handle cases where we can't get a domain (e.g., chrome:// pages)
            domainDisplay.textContent = 'N/A';
            applyButton.disabled = true;
            removeButton.disabled = true;
            languageSelect.disabled = true;
            showStatus('Not a valid website page.', 'error');
        }

    } catch (error) {
        console.error('[Language Accessor] Error initializing popup:', error);
        domainDisplay.textContent = 'Error';
        showStatus('Failed to load settings.', 'error');
        applyButton.disabled = true;
        removeButton.disabled = true;
    }


    // --- Event Listeners ---

    // Apply button click handler
    applyButton.addEventListener('click', async () => {
        if (!currentDomain) return;
        
        const selectedLanguage = languageSelect.value;
        if (selectedLanguage === 'default') {
            // If user selects default, treat it as a removal
            removeButton.click();
            return;
        }

        try {
            await chrome.runtime.sendMessage({ 
                action: 'saveSetting', 
                domain: currentDomain, 
                language: selectedLanguage 
            });
            showStatus('Setting applied! Reloading...', 'success', 2000);
            setTimeout(reloadAndClose, 500); // Give user time to see message
        } catch (error) {
            console.error('[Language Accessor] Error applying setting:', error);
            showStatus('Failed to apply setting.', 'error');
        }
    });

    // Remove button click handler
    removeButton.addEventListener('click', async () => {
        if (!currentDomain) return;

        try {
            await chrome.runtime.sendMessage({ action: 'removeSetting', domain: currentDomain });
            showStatus('Setting removed! Reloading...', 'success', 2000);
            setTimeout(reloadAndClose, 500);
        } catch (error) {
            console.error('[Language Accessor] Error removing setting:', error);
            showStatus('Failed to remove setting.', 'error');
        }
    });

    // Update button states when the selection changes
    languageSelect.addEventListener('change', () => {
        const hasSetting = languageSelect.value !== 'default';
        // The remove button should only be enabled if a setting is currently saved, not just selected
        // We'll rely on the initial state for the remove button's enabled/disabled status
    });
});
