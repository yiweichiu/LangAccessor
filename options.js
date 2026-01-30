document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const enabledToggle = document.getElementById('extension-enabled-toggle');
    const settingsTableBody = document.getElementById('settings-tbody');
    const noSettingsMessage = document.getElementById('no-settings-message');
    const clearAllButton = document.getElementById('clear-all-button');

    // --- Language Code Mapping for Display ---
    const LANGUAGE_NAMES = {
        'zh-TW': '繁體中文 (zh-TW)',
        'zh-CN': '簡體中文 (zh-CN)',
        'en-US': 'English (US)',
        'en-GB': 'English (UK)',
    };

    // --- Functions ---

    /**
     * Renders the settings table from the stored data.
     * @param {object} settings - The domain_settings object from storage.
     */
    function renderTable(settings) {
        // Clear current table content
        settingsTableBody.innerHTML = '';

        const domains = Object.keys(settings);

        if (domains.length === 0) {
            noSettingsMessage.style.display = 'block';
            settingsTableBody.style.display = 'none';
            clearAllButton.disabled = true;
        } else {
            noSettingsMessage.style.display = 'none';
            settingsTableBody.style.display = '';
            clearAllButton.disabled = false;

            // Sort domains alphabetically for consistent display
            domains.sort().forEach(domain => {
                const setting = settings[domain];
                const row = document.createElement('tr');
                row.dataset.domain = domain;

                const languageName = LANGUAGE_NAMES[setting.language] || setting.language;
                const dateSet = new Date(setting.timestamp).toLocaleString();

                row.innerHTML = `
                    <td>${domain}</td>
                    <td>${languageName}</td>
                    <td>${dateSet}</td>
                    <td>
                        <button class="delete-btn" title="Remove setting for ${domain}">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19,6.41,17.59,5,12,10.59,6.41,5,5,6.41,10.59,12,5,17.59,6.41,19,12,13.41,17.59,19,19,17.59,13.41,12Z"/></svg>
                        </button>
                    </td>
                `;

                settingsTableBody.appendChild(row);
            });
        }
    }

    /**
     * Loads initial settings and populates the page.
     */
    async function loadSettings() {
        try {
            const { data } = await chrome.runtime.sendMessage({ action: 'getSettings' });
            if (data) {
                enabledToggle.checked = data.enabled;
                renderTable(data.settings || {});
            }
        } catch (error) {
            console.error('[Language Accessor] Error loading settings:', error);
            noSettingsMessage.textContent = 'Error loading settings.';
            noSettingsMessage.style.display = 'block';
        }
    }

    // --- Event Listeners ---

    // Toggle for enabling/disabling the extension
    enabledToggle.addEventListener('change', async () => {
        try {
            await chrome.runtime.sendMessage({
                action: 'setExtensionStatus',
                enabled: enabledToggle.checked
            });
        } catch (error) {
            console.error('[Language Accessor] Error setting extension status:', error);
        }
    });

    // Clear all settings button
    clearAllButton.addEventListener('click', async () => {
        if (confirm('Are you sure you want to remove all saved site preferences?')) {
            try {
                await chrome.runtime.sendMessage({ action: 'clearAllSettings' });
                // Re-render the table which will now be empty
                renderTable({});
            } catch (error) {
                console.error('[Language Accessor] Error clearing all settings:', error);
                alert('Failed to clear settings.');
            }
        }
    });

    // Event delegation for delete buttons
    settingsTableBody.addEventListener('click', async (event) => {
        const deleteButton = event.target.closest('.delete-btn');
        if (deleteButton) {
            const row = deleteButton.closest('tr');
            const domain = row.dataset.domain;

            if (domain && confirm(`Remove setting for ${domain}?`)) {
                try {
                    await chrome.runtime.sendMessage({
                        action: 'removeSetting',
                        domain: domain
                    });
                    // Remove the row from the UI immediately for responsiveness
                    row.remove();
                    // Check if the table is now empty
                    if (settingsTableBody.rows.length === 0) {
                        loadSettings(); // Reload to show the 'no settings' message
                    }
                } catch (error) {
                    console.error('[Language Accessor] Error removing setting:', error);
                    alert(`Failed to remove setting for ${domain}.`);
                }
            }
        }
    });

    // --- Initial Load ---
    loadSettings();
});
