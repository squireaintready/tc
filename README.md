# TC — Tips Calculator

A production tips calculator used daily at a high-volume NYC restaurant. Calculates end-of-day tip distribution for servers, trainees, and support staff based on role percentages and shift (all day / lunch / dinner).

## Features

- **Role-Based Distribution** — Per-person percentages for servers, trainees, bussers, and other staff, with quick percent overrides and special cases (pastry, udon)
- **Shift Tracking** — Tag a calculation as all day, lunch, or dinner; split shifts count as half days in summaries
- **History & Editing** — Every calculation saves to Firestore (with offline/local fallback) and can be edited or reloaded as a setup
- **Weekly & Period Reports** — Per-employee grids and totals, shareable as PDFs; weekly email summary
- **Staff Management** — Add, edit, graduate, and remove employees from the app
- **Mobile-First PWA** — Installable, offline-capable, with Normal/Compact density modes and four themes (light, dark, fun, retro)

## Tech Stack

- **Frontend:** React, Vite, Tailwind CSS
- **Backend:** Vercel serverless (weekly email)
- **Hosting:** Vercel
- **Database:** Firebase (Firestore with offline persistence), locked to the app with Firebase App Check

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Copy `.env.example` to `.env` and fill in the values (Firebase config, App Check
reCAPTCHA site key, and — for the weekly email — a Firestore service account and
EmailJS keys). Firestore access is restricted to this app via App Check, so the
serverless function authenticates with the service account.

## Why This Exists

Built to solve a real operational problem — tip calculations at a busy restaurant are time-consuming and error-prone when done manually. This tool reduced end-of-day closing time and eliminated calculation disputes.

## Author

**Samuel Jo** — [GitHub](https://github.com/squireaintready) · [LinkedIn](https://linkedin.com/in/samuel-jo)
