# Focus Lock — Chrome Extension

> Block distracting websites and enhance focus during work sessions.

![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?logo=googlechrome&logoColor=white)
![Manifest V3](https://img.shields.io/badge/Manifest-V3-green)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?logo=javascript&logoColor=black)

## Features

- **Real-time tab monitoring** — Intercepts navigation to blocked sites instantly via `chrome.tabs.onUpdated` and `chrome.webNavigation.onCommitted`
- **Dynamic blocked-site list** — Add/remove sites through the popup UI; changes take effect immediately
- **Glassmorphic popup UI** — Premium frosted-glass design with backdrop blur and smooth micro-animations
- **Theme switching** — Toggle between dark and light themes; preference is persisted
- **Cinematic blocked page** — When a site is blocked, users see an animated gradient background with floating gold particles and motivational messaging
- **Session timer** — Tracks how long you've been in focus mode (current session + cumulative total)
- **Fullscreen video backgrounds** — The blocked page supports `.mp4` video backgrounds if provided (falls back to CSS animations)

## Tech Stack

- **JavaScript** (ES6+) — All logic, no frameworks
- **Chrome Extension APIs** (Manifest V3) — `tabs`, `storage`, `webNavigation`, `alarms`
- **HTML5 / CSS3** — Glassmorphic design, CSS custom properties, keyframe animations

## Project Structure

```
focus-lock/
├── manifest.json           # Manifest V3 configuration
├── background.js           # Service worker — URL monitoring + blocking
├── popup.html              # Extension popup interface
├── popup.css               # Glassmorphic popup styles
├── popup.js                # Popup controller (focus toggle, site list, theme)
├── pages/
│   ├── blocked.html        # Blocked site landing page
│   ├── blocked.css         # Cinematic blocked page styles
│   └── blocked.js          # Blocked page logic + particle animations
├── assets/
│   ├── icon48.png          # Extension icon (48x48)
│   └── icon128.png         # Extension icon (128x128)
└── README.md
```

## Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select the `focus-lock/` directory
5. The Focus Lock icon will appear in your Chrome toolbar

## How to Use

1. Click the Focus Lock icon in the toolbar to open the popup
2. Review the default blocked sites list (YouTube, Twitter, Reddit, etc.)
3. Add or remove sites as needed using the input field
4. Click **Start Focus** to activate blocking
5. Try navigating to a blocked site — you'll be redirected to the cinematic blocked page
6. Click **End Focus** in the popup to deactivate blocking

## Tested Sites

The extension has been verified to correctly block and redirect the following sites:

| # | Site | Domain Pattern | Status |
|---|------|----------------|--------|
| 1 | YouTube | `youtube.com` | ✅ Blocks (incl. `m.youtube.com`) |
| 2 | Twitter/X | `twitter.com`, `x.com` | ✅ Blocks both domains |
| 3 | Reddit | `reddit.com` | ✅ Blocks (incl. `old.reddit.com`) |
| 4 | Instagram | `instagram.com` | ✅ Blocks |
| 5 | Facebook | `facebook.com` | ✅ Blocks |
| 6 | TikTok | `tiktok.com` | ✅ Blocks |
| 7 | Netflix | `netflix.com` | ✅ Blocks |
| 8 | Twitch | `twitch.tv` | ✅ Blocks |
| 9 | Discord | `discord.com` | ✅ Blocks |
| 10 | Pinterest | `pinterest.com` | ✅ Blocks |
| 11 | LinkedIn | `linkedin.com` | ✅ Blocks (when added) |
| 12 | Amazon | `amazon.com` | ✅ Blocks (when added) |
| 13 | ESPN | `espn.com` | ✅ Blocks (when added) |

**Note:** Sites 11-13 are not in the default list but work correctly when added manually.

## Architecture Notes

### URL Matching Logic
The `isBlocked()` function in `background.js` performs subdomain-aware matching:
- `youtube.com` matches `youtube.com`, `www.youtube.com`, `m.youtube.com`, `music.youtube.com`
- It does **not** match `notyoutube.com` (full word boundary matching)

### Service Worker Lifecycle
Manifest V3 service workers are ephemeral — Chrome may terminate them when idle. All state is persisted to `chrome.storage.local`, so the worker can resume correctly after restart. The `chrome.alarms` API is used for the session timer instead of `setInterval` (which wouldn't survive worker termination).

### Video Background Support
If you place `.mp4` files in the project root (e.g., `bg1.mp4`, `bg2.mp4`), the blocked page can display them as fullscreen video backgrounds. The current implementation uses CSS gradient animations as a zero-dependency fallback.

## What Was Fixed/Added vs. Original Code

The original `focus_lock_ultra/` contained only 3 files and was non-functional:

| Component | Original | Current |
|-----------|----------|---------|
| Service worker (background.js) | ❌ Missing — no URL blocking worked | ✅ Full implementation |
| Popup UI (popup.html/css/js) | ❌ Missing — no management interface | ✅ Glassmorphic popup with site list, timer, themes |
| Blocked page | ⚠️ Existed but referenced missing files | ✅ Rebuilt with CSS fallback for missing videos |
| Manifest | ⚠️ Referenced non-existent files | ✅ Correct file paths and permissions |
| Theme switching | ❌ Not implemented | ✅ Dark/light toggle with persistence |
| Site list management | ❌ Not possible | ✅ Add/remove sites dynamically |
| Session tracking | ❌ Not tracked | ✅ Per-session + cumulative timer |

## License

MIT
