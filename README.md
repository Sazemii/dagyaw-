# Bayanihan — Community-Driven Urban Sustainability Platform

A mobile-first citizen reporting platform where residents report urban sustainability issues, and LGUs receive a dashboard to prioritize and resolve them. Built for **Blue Hacks 2026** by Team **Smart Dito sa Globe (SDG)**.

---

## Prerequisites

Make sure you have the following installed before proceeding:

| Tool | Minimum Version | Download |
|------|----------------|---------|
| **Node.js** | v18+ (v22 recommended) | [nodejs.org](https://nodejs.org) |
| **npm** | v9+ (comes with Node.js) | bundled with Node.js |
| **Git** | any recent version | [git-scm.com](https://git-scm.com) |

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/your-org/bh26-SmartDitosaGlobe.git
cd bh26-SmartDitosaGlobe
```

### 2. Install dependencies

```bash
npm install
```

This will install all packages listed in `package.json`, including:

| Package | Version | Purpose |
|---------|---------|---------|
| `next` | ^16.2.1 | React framework (App Router) |
| `react` | ^19.2.4 | UI library |
| `react-dom` | ^19.2.4 | React DOM renderer |
| `typescript` | ^6.0.2 | Type safety |
| `tailwindcss` | ^4.2.2 | Utility-first CSS |
| `@tailwindcss/postcss` | ^4.2.2 | Tailwind PostCSS plugin |
| `postcss` | ^8.5.8 | CSS transformations |
| `@supabase/supabase-js` | ^2.100.1 | Database & Auth (Supabase client) |
| `leaflet` | ^1.9.4 | Interactive maps |
| `react-leaflet` | ^5.0.0 | React bindings for Leaflet |
| `@types/leaflet` | ^1.9.21 | TypeScript types for Leaflet |
| `maplibre-gl` | ^5.21.1 | WebGL-based map rendering |
| `react-map-gl` | ^8.1.0 | React bindings for MapLibre/Mapbox |
| `react-icons` | ^5.6.0 | Icon library |
| `@types/node` | ^25.5.0 | TypeScript types for Node.js |
| `@types/react` | ^19.2.14 | TypeScript types for React |
| `@types/react-dom` | ^19.2.3 | TypeScript types for React DOM |

### 3. Set up environment variables

Create a `.env.local` file in the project root:

```bash
cp .env.example .env.local   # if .env.example exists, otherwise create manually
```

Or create `.env.local` manually with the following contents:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

To get these values:
1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project
3. Go to **Project Settings → API**
4. Copy the **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
5. Copy the **anon / public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

> **Note:** Never commit `.env.local` to version control — it is already in `.gitignore`.

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the development server at `localhost:3000` |
| `npm run build` | Build the app for production |
| `npm start` | Start the production server (requires `npm run build` first) |

---

## Tech Stack

- **Framework:** Next.js 16 (App Router) + TypeScript
- **Styling:** Tailwind CSS v4
- **Mapping:** React Leaflet + MapLibre GL
- **Backend / Database:** Supabase (PostgreSQL + Auth + Realtime)
- **Icons:** React Icons

---

## Project Structure

```
src/
├── app/                  # Next.js App Router pages
│   ├── globals.css       # Global styles
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Home page (main map view)
├── components/           # Reusable React components
└── lib/                  # Utility functions and config
    └── pins.ts           # Map pin definitions
```

---

## Troubleshooting

**`npm install` fails with permission errors**
Run your terminal as Administrator (Windows) or use `sudo` (macOS/Linux).

**Map doesn't load / shows blank tiles**
Check that Supabase env vars are set correctly in `.env.local`. Restart the dev server after editing `.env.local`.

**`next: command not found`**
Make sure you ran `npm install` first. All CLI tools are installed locally in `node_modules/.bin/`.
