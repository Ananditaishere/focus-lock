/**
 * Focus Lock — Blocked Page Controller
 * 
 * Handles:
 * - Reading the blocked URL from query params
 * - "Close This Tab" button (closes the current tab)
 * - "Go Back Anyway" button (navigates to the original blocked URL — 
 *   NOTE: the background worker will re-block it if focus mode is still on)
 * - Spawning CSS particle animations for the background
 */

// ─── Parse blocked URL from query string ─────────────────────────────────────
const params = new URLSearchParams(window.location.search);
const blockedUrl = params.get("blocked");

// Show which URL was blocked
const urlDisplay = document.getElementById("blockedUrlDisplay");
if (blockedUrl) {
  try {
    const parsed = new URL(blockedUrl);
    urlDisplay.textContent = `Blocked: ${parsed.hostname}${parsed.pathname}`;
  } catch {
    urlDisplay.textContent = `Blocked: ${blockedUrl}`;
  }
} else {
  urlDisplay.textContent = "A distracting site was blocked.";
}

// ─── Button handlers ─────────────────────────────────────────────────────────

// Close the tab entirely
document.getElementById("btnClose").addEventListener("click", () => {
  window.close();
});

// Navigate back to the blocked URL
// (The background worker will re-intercept it if focus mode is still on —
//  this is intentional! The user gets a brief moment to reconsider.)
document.getElementById("btnBack").addEventListener("click", () => {
  if (blockedUrl) {
    // Temporarily disable focus to allow this one navigation through
    // We send a message to the background script asking for a one-time pass
    // If chrome.runtime is available (i.e., loaded as extension page):
    if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.sendMessage) {
      // For now, just navigate — the user chose to override
      window.location.href = blockedUrl;
    } else {
      window.location.href = blockedUrl;
    }
  }
});

// ─── Particle generator ──────────────────────────────────────────────────────
// Creates floating gold particles for the background animation
function createParticles() {
  const container = document.getElementById("particles");
  const particleCount = 30;

  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement("div");
    particle.className = "particle";

    // Randomize position, size, and animation duration
    const size = Math.random() * 4 + 1;
    const left = Math.random() * 100;
    const duration = Math.random() * 15 + 10;
    const delay = Math.random() * 10;
    const opacity = Math.random() * 0.4 + 0.1;

    particle.style.cssText = `
      left: ${left}%;
      width: ${size}px;
      height: ${size}px;
      opacity: ${opacity};
      animation-duration: ${duration}s;
      animation-delay: ${delay}s;
    `;

    container.appendChild(particle);
  }
}

createParticles();
