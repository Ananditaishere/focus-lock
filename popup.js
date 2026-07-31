/**
 * Focus Lock — Popup Controller
 * 
 * Manages the popup UI:
 * - Reads/writes focus state from chrome.storage.local
 * - Toggles focus mode on/off via messages to the background worker
 * - Manages the blocked-site list (add/remove)
 * - Updates the session timer every second
 * - Handles theme switching (dark/light)
 */

// ─── DOM References ──────────────────────────────────────────────────────────
const focusToggle = document.getElementById("focusToggle");
const statusDot = document.getElementById("statusDot");
const statusText = document.getElementById("statusText");
const sessionTimer = document.getElementById("sessionTimer");
const siteList = document.getElementById("siteList");
const siteCount = document.getElementById("siteCount");
const newSiteInput = document.getElementById("newSiteInput");
const addSiteBtn = document.getElementById("addSiteBtn");
const themeToggle = document.getElementById("themeToggle");
const totalTimeEl = document.getElementById("totalTime");

let timerInterval = null;

// ─── Initialize UI from stored state ─────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  chrome.storage.local.get(
    ["focusMode", "blockedSites", "sessionStart", "totalFocusTime", "theme"],
    (data) => {
      // Apply saved theme
      const theme = data.theme || "dark";
      applyTheme(theme);

      // Update focus toggle state
      const isOn = data.focusMode || false;
      updateFocusUI(isOn);

      // If focus mode is active, start the timer display
      if (isOn && data.sessionStart) {
        startTimerDisplay(data.sessionStart);
      }

      // Render blocked sites list
      renderSiteList(data.blockedSites || []);

      // Show total focus time
      updateTotalTime(data.totalFocusTime || 0);
    }
  );
});

// ─── Focus Toggle ────────────────────────────────────────────────────────────
focusToggle.addEventListener("click", () => {
  chrome.storage.local.get(["focusMode"], (data) => {
    const currentlyOn = data.focusMode || false;

    if (currentlyOn) {
      // Turn OFF focus mode
      chrome.runtime.sendMessage({ action: "disableFocus" }, () => {
        updateFocusUI(false);
        stopTimerDisplay();
        // Refresh total time after disabling
        chrome.storage.local.get(["totalFocusTime"], (d) => {
          updateTotalTime(d.totalFocusTime || 0);
        });
      });
    } else {
      // Turn ON focus mode
      chrome.runtime.sendMessage({ action: "enableFocus" }, () => {
        updateFocusUI(true);
        startTimerDisplay(Date.now());
      });
    }
  });
});

/**
 * Updates the focus toggle button and status indicator.
 * @param {boolean} isOn — whether focus mode is active
 */
function updateFocusUI(isOn) {
  if (isOn) {
    focusToggle.classList.remove("off");
    focusToggle.classList.add("on");
    focusToggle.querySelector(".btn-label").textContent = "End Focus";
    statusDot.classList.remove("off");
    statusDot.classList.add("on");
    statusText.textContent = "Focus Mode Active";
  } else {
    focusToggle.classList.remove("on");
    focusToggle.classList.add("off");
    focusToggle.querySelector(".btn-label").textContent = "Start Focus";
    statusDot.classList.remove("on");
    statusDot.classList.add("off");
    statusText.textContent = "Focus Mode Off";
  }
}

// ─── Session Timer Display ───────────────────────────────────────────────────
/**
 * Starts updating the session timer display every second.
 * @param {number} startTime — timestamp (ms) when the session started
 */
function startTimerDisplay(startTime) {
  stopTimerDisplay(); // Clear any existing interval

  timerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    sessionTimer.textContent = formatTime(elapsed);
  }, 1000);

  // Immediately show the current elapsed time
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  sessionTimer.textContent = formatTime(elapsed);
}

/** Stops the timer display interval. */
function stopTimerDisplay() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  sessionTimer.textContent = "00:00:00";
}

/**
 * Formats seconds into HH:MM:SS string.
 * @param {number} totalSeconds
 * @returns {string}
 */
function formatTime(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}

/**
 * Updates the total focus time display.
 * @param {number} totalSeconds — cumulative focus seconds
 */
function updateTotalTime(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  totalTimeEl.textContent = `${h}h ${m}m`;
}

// ─── Site List Management ────────────────────────────────────────────────────
/**
 * Renders the blocked sites list in the popup.
 * @param {string[]} sites — array of blocked domain strings
 */
function renderSiteList(sites) {
  siteList.innerHTML = "";
  siteCount.textContent = sites.length;

  if (sites.length === 0) {
    siteList.innerHTML = '<li class="empty-state">No sites blocked yet</li>';
    return;
  }

  sites.forEach((site) => {
    const li = document.createElement("li");
    li.className = "site-item";
    li.innerHTML = `
      <span class="site-domain">${escapeHtml(site)}</span>
      <button class="remove-btn" data-site="${escapeHtml(site)}" title="Remove">✕</button>
    `;
    siteList.appendChild(li);
  });
}

/**
 * Escapes HTML entities to prevent XSS in rendered site names.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// Add a new site to the blocked list
addSiteBtn.addEventListener("click", addSite);
newSiteInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") addSite();
});

function addSite() {
  let site = newSiteInput.value.trim().toLowerCase();
  if (!site) return;

  // Clean up the input: remove protocol, www, trailing slashes, paths
  site = site.replace(/^(https?:\/\/)?(www\.)?/, "").replace(/\/.*$/, "");

  if (!site || site.length < 3 || !site.includes(".")) {
    // Basic validation — must look like a domain
    newSiteInput.style.borderColor = "var(--danger)";
    setTimeout(() => (newSiteInput.style.borderColor = ""), 1500);
    return;
  }

  chrome.storage.local.get(["blockedSites"], (data) => {
    const sites = data.blockedSites || [];
    if (sites.includes(site)) {
      // Already in the list — flash the input
      newSiteInput.value = "";
      newSiteInput.placeholder = "Already blocked!";
      setTimeout(() => (newSiteInput.placeholder = "e.g. youtube.com"), 1500);
      return;
    }

    sites.push(site);
    chrome.storage.local.set({ blockedSites: sites }, () => {
      renderSiteList(sites);
      newSiteInput.value = "";
    });
  });
}

// Remove a site from the blocked list (event delegation)
siteList.addEventListener("click", (e) => {
  const removeBtn = e.target.closest(".remove-btn");
  if (!removeBtn) return;

  const siteToRemove = removeBtn.dataset.site;
  chrome.storage.local.get(["blockedSites"], (data) => {
    const sites = (data.blockedSites || []).filter((s) => s !== siteToRemove);
    chrome.storage.local.set({ blockedSites: sites }, () => {
      renderSiteList(sites);
    });
  });
});

// ─── Theme Switching ─────────────────────────────────────────────────────────
themeToggle.addEventListener("click", () => {
  const current = document.body.dataset.theme;
  const next = current === "dark" ? "light" : "dark";
  applyTheme(next);
  chrome.storage.local.set({ theme: next });
});

/**
 * Applies the given theme to the document and updates the toggle icon.
 * @param {'dark'|'light'} theme
 */
function applyTheme(theme) {
  document.body.dataset.theme = theme;
  const icon = themeToggle.querySelector(".theme-icon");
  icon.textContent = theme === "dark" ? "🌙" : "☀️";
}
