# HealthEstimator

My health data, explained.

A private personal health operating system. All data stays on your device. No accounts, no tracking, no ads.

---

## Features

- Food photo log with meal analysis (calories, protein, carbs, fat, fiber, sodium)
- Weight trend with 7-day average
- Blood pressure log with before/after context and pattern detection
- Hume scan screenshot uploads with metric extraction
- Lab report uploads with per-marker explanations
- Saved insights across all data types
- Goals and lifestyle experiment tracking
- Three explanation modes: Baby, Normal, Nerd
- Ask AI about any pattern in your data
- Works fully offline with simulated AI responses (no API key required)

---

## Setup

### 1. Clone and install

```bash
git clone <your-repo>
cd healthestimator
npm install
```

### 2. Configure environment (optional)

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add your OpenAI API key. The app works without one using built-in simulated responses. When a key is present, real GPT analysis is used for meals, labs, Hume scans, and the Ask AI panel.

### 3. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The app loads with demo data pre-seeded so you can explore every section immediately.

---

## Build for production

```bash
npm run build
npm start
```

---

## Vercel deployment

1. Push to GitHub
2. Import the repo in [vercel.com/new](https://vercel.com/new)
3. Add environment variables in the Vercel project settings (Settings > Environment Variables):
   - `OPENAI_API_KEY` (optional)
   - `OPENAI_MODEL` (optional, defaults to `gpt-4o-mini`)
   - `OPENAI_STRONG_MODEL` (optional, defaults to `gpt-4o`)
4. Deploy. No other configuration needed.

The app is fully static-compatible except the `/api/*` routes, which run as Vercel serverless functions.

---

## Phone testing checklist

### Navigation
- [ ] Bottom nav visible and tappable on mobile (Home, Food, Track, Insights, More)
- [ ] Track hub links to Weight, Blood Pressure, Hume, Labs
- [ ] More hub links to Profile, Meals, Goals, Insights, Settings
- [ ] Desktop sidebar shows all 11 nav items
- [ ] Active nav item is highlighted correctly

### Core flows
- [ ] Dashboard loads with metric cards and demo data
- [ ] Food photo log: camera capture works on phone (tap the camera icon)
- [ ] Food photo log: image preview shows after capture
- [ ] Meal analysis runs (simulated if no API key) and result card appears
- [ ] Weight entry saves and updates the trend card
- [ ] Blood pressure entry saves with before/after context
- [ ] Hume screenshot uploads and fields appear
- [ ] Lab report image uploads and marker table appears
- [ ] Ask AI panel on dashboard sends and displays a response

### AI simulation
- [ ] With no API key: every analysis shows a "Simulated" badge
- [ ] With no API key: analysis still returns plausible structured data
- [ ] Settings page shows "Not configured" badge for API key status

### Settings
- [ ] Default explanation mode saves and persists on reload
- [ ] Export data downloads a valid JSON file
- [ ] Clear demo data removes seeded entries and keeps settings

### Data persistence
- [ ] Entries survive a page refresh (localStorage is working)
- [ ] Closing and reopening the browser tab keeps all data

### Edge cases
- [ ] App loads with no entries (after clearing demo data) without crashing
- [ ] Long food notes do not break the meal card layout
- [ ] Very high or low blood pressure values display without layout issues

---

## Tech stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- OpenAI API (optional)
- Zod
- localStorage (no backend database)

---

## Privacy

No data leaves your device unless you trigger an AI analysis, in which case the relevant image or text is sent to OpenAI. No analytics, no error reporting, no cookies, no accounts.
