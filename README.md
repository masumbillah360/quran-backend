# Updated Quran Backend

A RESTful API built with **Hono** and deployed on **Cloudflare Workers**, providing access to the Holy Quran data including surahs, ayahs, translations, audio, and word-level information. The backend uses **Cloudflare D1** for database storage.

## Project Structure

```
backend/
├── src/
│   ├── index.ts              # Main entry point - Hono app setup, CORS, caching, route registration
│   ├── routes/
│   │   ├── surahs.routes.ts  # Surah endpoints (list all, get by number with full ayah data)
│   │   └── search.routes.ts  # Search endpoint (search surahs and ayahs by Arabic/English)
│   ├── types/
│   │   └── index.ts          # TypeScript interfaces (SurahData, AyahData, WordData, etc.) and utilities
│   └── utils/
│       └── index.ts          # Arabic text normalization (removes diacritics, handles alef variants)
├── wrangler.jsonc            # Cloudflare Workers configuration (D1 database binding)
├── tsconfig.json             # TypeScript configuration
├── package.json              # Dependencies and scripts
└── README.md
```

## Architecture & Flow

1. **Entry Point** (`src/index.ts`): Initializes the Hono app with CORS middleware (allowing local dev and Vercel frontend origins) and response caching for all `/api/*` routes (1-hour cache).

2. **Routes**:
   - `/api/surahs` - Returns all surahs (with optional `?q` query for filtering) or a specific surah by number with complete ayah data including translations, audio, and word-level details.
   - `/api/search` - Searches across surah names and ayah translations using Arabic-normalized text matching. Returns up to 50 ayah results.

3. **Database**: Cloudflare D1 (`holy-quran`) with tables: `surahs`, `ayahs`, `translations`, `audio`, `ayah_audio_segments`, `words`, `word_audio_segments`.

4. **Data Flow**:
   - Request → CORS middleware → Cache middleware → Route handler
   - Route handler queries D1 database (batched queries for ayah-related data)
   - Response is assembled with typed data structures and returned as JSON
   - Cache stores the response for subsequent identical requests

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check - returns "Quran API - Cloudflare Workers" |
| GET | `/api/surahs` | List all 114 surahs (optional `?q` for search) |
| GET | `/api/surahs/:surahNumber` | Get full surah data with ayahs, translations, audio, words |
| GET | `/api/search?q=query` | Search surahs and ayahs by Arabic or English text |

## Prerequisites

- **Node.js** (v18+) or **Bun**
- **npm** or **bun** package manager
- Cloudflare account (for deployment)

## Installation & Running

### Install Dependencies

```bash
bun install
```

### Development Mode

Start the local development server with Wrangler:

```bash
bun run dev
```

The API will be available at `http://localhost:8787`.

### Generate TypeScript Types

Generate types from your Worker configuration (run after changes to `wrangler.jsonc`):

```bash
bun run cf-typegen
```

### Deploy to Cloudflare Workers

Deploy the application to production:

```bash
bun run deploy
```

This minifies and uploads the worker to Cloudflare's edge network.

## Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `wrangler dev` | Start local development server |
| `deploy` | `wrangler deploy --minify` | Deploy to Cloudflare Workers |
| `cf-typegen` | `wrangler types --env-interface CloudflareBindings` | Generate TypeScript types from config |

## Tech Stack

- **Framework**: Hono (lightweight web framework)
- **Runtime**: Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite-based)
- **Language**: TypeScript
- **Package Manager**: npm / Bun
