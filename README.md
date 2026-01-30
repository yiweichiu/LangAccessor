# Language Content Accessor

A browser extension that allows you to set a preferred language for specific websites without changing your browser's global language settings.

This is useful for developers, translators, or anyone who needs to view a website in a different language temporarily. The extension works by modifying the `Accept-Language` HTTP header for domains you configure.

## Features

- **Per-Site Language Settings**: Assign a specific language to any website (domain).
- **Simple Popup Interface**: Quickly apply or remove a language setting for the current site.
- **Supported Languages**:
    - 繁體中文 (Traditional Chinese - `zh-TW`)
    - 簡體中文 (Simplified Chinese - `zh-CN`)
    - English (US) (`en-US`)
    - English (UK) (`en-GB`)
- **Settings Management**: A central options page to view and manage all your saved preferences.
- **Enable/Disable**: Easily toggle the entire extension on or off.
- **Privacy-Focused**: All settings are stored locally on your machine. The extension does not track your browsing history.

## How to Install (for development)

1.  **Clone or download this repository.**
2.  Open your Chrome/Chromium-based browser and navigate to `chrome://extensions`.
3.  Enable **"Developer mode"** using the toggle switch in the top-right corner.
4.  Click on the **"Load unpacked"** button.
5.  Select the `LangAccessor` directory from the cloned repository.

The extension icon should now appear in your browser's toolbar.

## How to Use

1.  Navigate to a website where you want to change the language.
2.  Click the extension icon in your toolbar.
3.  The popup will show the current domain. Select your desired language from the dropdown menu.
4.  Click **"Apply to this site"**. The page will automatically reload with the new language setting applied.
5.  To remove the setting, open the popup again and click **"Remove setting"**.

To manage all your settings, right-click the extension icon and select "Options", or click the gear icon in the popup.

## File Structure

-   `manifest.json`: Defines the extension's permissions, components, and metadata.
-   `background.js`: The core service worker that manages declarative network request rules to modify `Accept-Language` headers based on your settings (using Manifest V3's `declarativeNetRequest` API).
-   `popup.html` / `popup.css` / `popup.js`: Files for the main popup interface that appears when you click the extension icon.
-   `options.html` / `options.css` / `options.js`: Files for the settings page where you can manage all saved preferences.
-   `icons/`: Contains the extension icons for the toolbar, etc.
