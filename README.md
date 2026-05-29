# 📸 PhotoBooth Studio — iPad Web App

A fully-featured photobooth app built for iPad, designed to be hosted for free on **GitHub Pages**.

## ✨ Features

- **4 Photo Modes** — Single Shot, Photo Strip (3 photos), GIF Burst (4 frames), Boomerang (6 frames)
- **8 Filters** — Original, B&W, Sepia, Vivid, ✨ Glam, Cool, Warm, Vintage
- **Frame Styles** — None, Rounded White, Film Strip, Polaroid, Neon Glow
- **Customizable Event Branding** — event name, tagline, colors, overlay text
- **Gallery** — photos saved to browser storage, lightbox viewer
- **Share Options** — download, native share sheet (works great on iPad)
- **Countdown Timer** — 3s, 5s, or 10s
- **Front/Rear Camera Toggle**
- **Mirror Mode** for front-facing camera
- **Wake Lock** — screen stays on while taking photos
- **Optimized for iPad** — full-screen, touch-friendly, no scrollbars

---

## 🚀 Hosting on GitHub Pages (Free)

### Step 1 — Create a GitHub Account
Go to [github.com](https://github.com) and sign up (free).

### Step 2 — Create a New Repository
1. Click **"+"** → **"New repository"**
2. Name it: `photobooth` (or anything you like)
3. Set to **Public**
4. Check **"Add a README file"**
5. Click **"Create repository"**

### Step 3 — Upload the Files
1. In your new repo, click **"Add file"** → **"Upload files"**
2. Upload all files maintaining this structure:
   ```
   index.html
   css/
     style.css
   js/
     app.js
     filters.js
     gif.js
   README.md
   ```
3. Click **"Commit changes"**

### Step 4 — Enable GitHub Pages
1. Go to your repo **Settings** → **Pages**
2. Under **Source**, select **"Deploy from a branch"**
3. Choose branch: **main**, folder: **/ (root)**
4. Click **Save**

### Step 5 — Access Your Booth
Your app will be live at:
```
https://YOUR-USERNAME.github.io/photobooth/
```
(Takes ~1 minute to deploy)

---

## 📱 Using on iPad

### Add to Home Screen (Recommended)
1. Open your GitHub Pages URL in **Safari** on iPad
2. Tap the **Share** button (box with arrow)
3. Tap **"Add to Home Screen"**
4. Name it **"PhotoBooth"** and tap **Add**

Now it launches like a native app, full-screen with no browser UI!

### Best Settings for Events
- Use **Landscape mode** for the photo strip layout
- Keep iPad plugged in (screen stays on via Wake Lock)
- Enable **Settings** (⚙ gear icon on attract screen) to customize your event

---

## 🎨 Customizing Your Event

Tap the **⚙ gear icon** on the attract screen to customize:

| Setting | Description |
|---------|-------------|
| Event Name | Displayed on attract screen & watermark |
| Tagline | Subtitle on attract screen |
| Primary Color | Theme accent color |
| Frame Style | Border applied to photos |
| Overlay Text | Text watermark on photos (e.g. `#YourEvent2025`) |
| Show Gallery | Show/hide the gallery button |
| Mirror Front Camera | Flip front camera preview |

Settings are saved automatically in the browser.

---

## 🛠 Technical Notes

- **No server required** — everything runs in the browser
- **No installation** — pure HTML/CSS/JS
- **Camera access** — requires HTTPS (GitHub Pages provides this automatically)
- **Photo storage** — saved in `localStorage` (browser-local, up to ~50 photos)
- **Tested on** — iPad Air, iPad Pro (Safari)

---

## 📋 File Structure

```
photobooth/
├── index.html          # Main app shell
├── css/
│   └── style.css       # All styles (dark luxury theme)
├── js/
│   ├── app.js          # Main app logic
│   ├── filters.js      # Canvas-based photo filters
│   └── gif.js          # GIF encoder (NeuQuant + LZW)
└── README.md           # This file
```

---

## 🔒 Privacy

All photos stay **on the device** — they are stored in the browser's `localStorage` and never uploaded anywhere. The download/share features send photos directly from the device.

---

Made with ❤️ for events, parties & fun.
