/**
 * Focus Lock — Background Service Worker
 * 
 * Core logic:
 * 1. Maintains a blocked-site list in chrome.storage.local
 * 2. When focus mode is ON, listens for tab updates and web navigations
 * 3. If a tab URL matches any blocked domain, redirects to the blocked page
 * 4. Tracks session duration with chrome.alarms
 * 
 * Storage schema:
 *   focusMode: boolean         — whether blocking is active
 *   blockedSites: string[]     — list of domain patterns to block
 *   sessionStart: number|null  — timestamp when focus mode was activated
 *   totalFocusTime: number     — cumulative seconds spent in focus mode
 *   theme: 'dark' | 'light'    — UI theme preference
 */

// ─── Default blocked sites ───────────────────────────────────────────────────
const DEFAULT_BLOCKED_SITES = [
  "youtube.com",
  "twitter.com",
  "x.com",
  "reddit.com",
  "instagram.com",
  "facebook.com",
  "tiktok.com",
  "netflix.com",
  "twitch.tv",
  "discord.com",
  "pinterest.com"
];

// ─── Install handler: set defaults on first install ──────────────────────────
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    chrome.storage.local.set({
      focusMode: false,
      blockedSites: DEFAULT_BLOCKED_SITES,
      sessionStart: null,
      totalFocusTime: 0,
      theme: "dark"
    });
    console.log("[Focus Lock] Installed with default settings.");
  }
});

// ─── URL matching ────────────────────────────────────────────────────────────
/**
 * Checks if a URL matches any domain in the blocked list.
 * Handles www. prefixes and subdomains.
 * 
 * @param {string} url       — full URL to check
 * @param {string[]} sites   — array of blocked domain strings
 * @returns {boolean}        — true if the URL should be blocked
 */
function isBlocked(url, sites) {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();

    return sites.some((site) => {
      const pattern = site.toLowerCase().trim();
      // Match exact domain or any subdomain (e.g., "m.youtube.com" matches "youtube.com")
      return hostname === pattern || hostname.endsWith("." + pattern);
    });
  } catch (e) {
    // Invalid URL (chrome://, about:, etc.) — don't block
    return false;
  }
}

/**
 * Redirects a tab to the blocked page, passing the original URL
 * so the user can choose to "go back anyway."
 * 
 * @param {number} tabId     — Chrome tab ID to redirect
 * @param {string} blockedUrl — the original URL that was blocked
 */
function redirectToBlockedPage(tabId, blockedUrl) {
  const blockedPage = chrome.runtime.getURL("pages/blocked.html");
  const redirectUrl = `${blockedPage}?blocked=${encodeURIComponent(blockedUrl)}`;

  chrome.tabs.update(tabId, { url: redirectUrl });
}

// ─── Tab monitoring ──────────────────────────────────────────────────────────

/**
 * Handles checking a tab's URL against the blocked list.
 * Called by both the tabs.onUpdated and webNavigation listeners.
 * 
 * @param {number} tabId — the tab to check
 * @param {string} url   — the URL navigated to
 */
function handleNavigation(tabId, url) {
  chrome.storage.local.get(["focusMode", "blockedSites"], (data) => {
    if (!data.focusMode) return;

    const sites = data.blockedSites || [];
    if (isBlocked(url, sites)) {
      console.log(`[Focus Lock] Blocking: ${url}`);
      redirectToBlockedPage(tabId, url);
    }
  });
}

// Listen for tab URL changes (covers most navigation)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Only act when the URL actually changes (not on title changes, etc.)
  if (changeInfo.url) {
    handleNavigation(tabId, changeInfo.url);
  }
});

// Also listen via webNavigation for committed navigations (catches redirects)
chrome.webNavigation.onCommitted.addListener((details) => {
  // Only handle main frame navigations, not iframes
  if (details.frameId === 0) {
    handleNavigation(details.tabId, details.url);
  }
});

// ─── Session timer ───────────────────────────────────────────────────────────

// Use chrome.alarms to periodically update the session timer
// This runs every minute while focus mode is active
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "focusTimer") {
    chrome.storage.local.get(["focusMode", "sessionStart", "totalFocusTime"], (data) => {
      if (data.focusMode && data.sessionStart) {
        const elapsed = Math.floor((Date.now() - data.sessionStart) / 1000);
        // totalFocusTime accumulates across sessions
        chrome.storage.local.set({ totalFocusTime: (data.totalFocusTime || 0) + 60 });
      }
    });
  }
});

// ─── Message handling (from popup) ───────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "enableFocus") {
    chrome.storage.local.set({
      focusMode: true,
      sessionStart: Date.now()
    });
    // Start the session timer (fires every 1 minute)
    chrome.alarms.create("focusTimer", { periodInMinutes: 1 });

    // Immediately check all open tabs and block matching ones
    chrome.tabs.query({}, (tabs) => {
      chrome.storage.local.get(["blockedSites"], (data) => {
        const sites = data.blockedSites || [];
        tabs.forEach((tab) => {
          if (tab.url && isBlocked(tab.url, sites)) {
            redirectToBlockedPage(tab.id, tab.url);
          }
        });
      });
    });

    sendResponse({ success: true });
  }

  if (msg.action === "disableFocus") {
    chrome.storage.local.get(["sessionStart", "totalFocusTime"], (data) => {
      let additionalTime = 0;
      if (data.sessionStart) {
        additionalTime = Math.floor((Date.now() - data.sessionStart) / 1000);
      }
      chrome.storage.local.set({
        focusMode: false,
        sessionStart: null,
        totalFocusTime: (data.totalFocusTime || 0) + additionalTime
      });
    });
    chrome.alarms.clear("focusTimer");
    sendResponse({ success: true });
  }

  // Return true to indicate async sendResponse usage
  return true;
});
