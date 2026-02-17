/**
 * Language Content Accessor - Background Service Worker
 * Manages dynamic rules for the declarativeNetRequest API.
 */

// --- Constants ---

const LANGUAGE_CODES = {
  'zh-TW': 'zh-TW,zh;q=0.9,en;q=0.8,en-US;q=0.7',
  'zh-CN': 'zh-CN,zh;q=0.9,en;q=0.8,en-US;q=0.7',
  'en-US': 'en-US,en;q=0.9',
  'en-GB': 'en-GB,en;q=0.9,en-US;q=0.8'
};

// A mapping to keep track of which rule ID belongs to which domain
const RULE_ID_MAP_KEY = 'rule_id_map';

// --- Rule Management ---

/**
 * Gets a unique, stable rule ID for a given domain.
 * @param {string} domain The domain to get an ID for.
 * @param {object} ruleIdMap The current map of domain -> id.
 * @returns {number} A unique ID.
 */
async function getRuleId(domain, ruleIdMap) {
    if (ruleIdMap[domain]) {
        return ruleIdMap[domain];
    }
    const existingIds = Object.values(ruleIdMap);
    let newId = 1;
    // Find the smallest available ID starting from 1
    while (existingIds.includes(newId)) {
        newId++;
    }
    return newId;
}

/**
 * Updates all declarativeNetRequest rules based on current storage settings.
 */
async function updateRules() {
    const data = await chrome.storage.local.get(['domain_settings', 'extension_enabled', RULE_ID_MAP_KEY]);
    const settings = data.domain_settings || {};
    const isEnabled = data.extension_enabled !== false;
    let ruleIdMap = data[RULE_ID_MAP_KEY] || {};

    const newRules = [];
    const activeRuleIds = [];
    
    if (isEnabled) {
        for (const [domain, setting] of Object.entries(settings)) {
            const languageCode = setting.language;
            if (languageCode && LANGUAGE_CODES[languageCode]) {
                const ruleId = await getRuleId(domain, ruleIdMap);
                ruleIdMap[domain] = ruleId;
                activeRuleIds.push(ruleId);

                newRules.push({
                    id: ruleId,
                    priority: 1,
                    action: {
                        type: 'modifyHeaders',
                        requestHeaders: [{
                            header: 'accept-language',
                            operation: 'set',
                            value: LANGUAGE_CODES[languageCode]
                        }]
                    },
                    condition: {
                        requestDomains: [domain],
                        resourceTypes: ['main_frame', 'sub_frame', 'xmlhttprequest']
                    }
                });
            }
        }
    }

    try {
        const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
        const ruleIdsToRemove = existingRules.map(rule => rule.id);
        
        // Clean up the ruleIdMap for domains that no longer have rules
        const activeDomains = Object.keys(ruleIdMap).filter(domain => activeRuleIds.includes(ruleIdMap[domain]));
        const updatedRuleIdMap = activeDomains.reduce((acc, domain) => {
            acc[domain] = ruleIdMap[domain];
            return acc;
        }, {});

        await chrome.storage.local.set({ [RULE_ID_MAP_KEY]: updatedRuleIdMap });

        await chrome.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: ruleIdsToRemove,
            addRules: newRules
        });
        console.log(`[Language Accessor] Rules updated. Added: ${newRules.length}, Removed: ${ruleIdsToRemove.length}`);
    } catch (error) {
        console.error('[Language Accessor] Failed to update rules:', error);
    }
}


// --- Lifecycle and Message Listeners ---

chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.set({
        domain_settings: {},
        extension_enabled: true,
        [RULE_ID_MAP_KEY]: {}
    });
    updateRules();
});

// Update rules whenever a setting changes
chrome.storage.onChanged.addListener((changes) => {
    if (changes.domain_settings || changes.extension_enabled) {
        updateRules();
    }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    (async () => {
        try {
            switch (request.action) {
                // Settings are now primarily driven by storage changes,
                // but we keep these for direct interaction from UI.
                case 'getSettings': {
                    const data = await chrome.storage.local.get(['domain_settings', 'extension_enabled']);
                    sendResponse({
                        success: true,
                        data: {
                            settings: data.domain_settings || {},
                            enabled: data.extension_enabled !== false
                        }
                    });
                    break;
                }
                case 'saveSetting': {
                    const { domain, language } = request;
                    const { domain_settings = {} } = await chrome.storage.local.get('domain_settings');
                    domain_settings[domain] = { language, timestamp: Date.now() };
                    await chrome.storage.local.set({ domain_settings });
                    sendResponse({ success: true });
                    break;
                }
                case 'removeSetting': {
                    const { domain } = request;
                    const { domain_settings = {} } = await chrome.storage.local.get('domain_settings');
                    delete domain_settings[domain];
                    await chrome.storage.local.set({ domain_settings });
                    sendResponse({ success: true });
                    break;
                }
                case 'clearAllSettings': {
                    await chrome.storage.local.set({ domain_settings: {} });
                    sendResponse({ success: true });
                    break;
                }
                case 'setExtensionStatus': {
                    await chrome.storage.local.set({ extension_enabled: request.enabled });
                    sendResponse({ success: true });
                    break;
                }
                case 'getActiveTab': {
                    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                    sendResponse({ success: true, data: tab });
                    break;
                }
                default:
                    sendResponse({ success: false, error: 'Unknown action' });
            }
        } catch (error) {
            console.error('[Language Accessor] Message listener error:', error);
            sendResponse({ success: false, error: error.message });
        }
    })();
    return true; // Keep message channel open for async response
});