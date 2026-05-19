# Updated Quran Backend

A high-performance RESTful API built with **Hono** and deployed on **Cloudflare Workers**, providing comprehensive access to the Holy Quran data including surahs, ayahs, translations, audio with word-level synchronization, and advanced search capabilities. The backend uses **Cloudflare D1** (SQLite-based) for database storage and edge caching for optimal response times.

## Features

- **Complete Quran Data**: All 114 surahs with full ayah details including Uthmani and Indo-Pak text scripts
- **Multi-Script Support**: Arabic text in Uthmani and Indo-Pak scripts, English translations and transliterations
- **Audio with Word-Level Sync**: Ayah-level audio with precise word-by-word timestamp segments for synchronized highlighting
- **Advanced Search**: Search surahs and ayahs by Arabic text (with diacritic normalization), English translation, or surah names
- **Edge Caching**: 1-hour cache on all API responses via Cloudflare's edge network for lightning-fast repeat requests
- **CORS Enabled**: Pre-configured for local development and Vercel-deployed frontends
- **Type-Safe**: Full TypeScript support with auto-generated bindings from Cloudflare configuration
- **Batched Queries**: Optimized database queries using batched IN-clause lookups for surah data assembly
- **Zero Server Management**: Serverless deployment on Cloudflare Workers global edge network

## Project Structure

```
backend/
├── src/
│   ├── index.ts              # Main entry point - Hono app, CORS, caching, route registration
│   ├── routes/
│   │   ├── surahs.routes.ts  # Surah endpoints (list all with filter, get by number with full data)
│   │   └── search.routes.ts  # Search endpoint (surahs + ayahs by Arabic/English)
│   ├── types/
│   │   └── index.ts          # TypeScript interfaces and helper utilities (numerals, height estimation)
│   └── utils/
│       └── index.ts          # Arabic text normalization (diacritics removal, alef variant handling)
├── wrangler.jsonc            # Cloudflare Workers config (D1 database binding)
├── tsconfig.json             # TypeScript configuration
├── package.json              # Dependencies and scripts
└── README.md
```

## How It Works

### Request Flow

```
Client Request
    ↓
CORS Middleware (validates origin)
    ↓
Cache Middleware (checks edge cache, returns if hit)
    ↓
Route Handler (queries D1 database)
    ↓
Response Assembly (typed JSON with surah/ayah/audio/words)
    ↓
Cached at Edge (1-hour TTL)
    ↓
Client Response
```

### Database Schema

The D1 database (`holy-quran`) contains the following tables:

| Table | Description |
|-------|-------------|
| `surahs` | Surah metadata (name, english name, translation, revelation type, total ayahs) |
| `ayahs` | Ayah content (text in multiple scripts, verse key, juz/hizb/page numbers, sajdah info) |
| `translations` | English translations and translation source names |
| `audio` | Ayah-level audio URLs and durations |
| `ayah_audio_segments` | Word-level timestamp segments within ayah audio |
| `words` | Individual word data (text, translation, transliteration, char type) |
| `word_audio_segments` | Word-level audio timestamps for synchronized playback |

### Data Assembly for Surah Detail

When fetching a specific surah (`/api/surahs/:number`):

1. **Surah metadata** is fetched from the `surahs` table
2. **All ayahs** for that surah are fetched from `ayahs` table, ordered by ayah number
3. **Batched queries** (50 ayahs per batch) fetch related data in parallel using `Promise.all`:
   - Translations from `translations` table
   - Audio from `audio` table
   - Audio segments from `ayah_audio_segments` table
   - Words from `words` table
   - Word segments from `word_audio_segments` table
4. **In-memory mapping** assembles the data into typed `SurahData` objects with nested ayahs, words, and audio segments
5. **JSON response** is returned and cached at the edge

### Arabic Text Normalization

The search functionality uses `normalizeArabic()` utility which:
- Removes Arabic diacritics (fatha, kasra, damma, sukoon, shadda, etc.)
- Normalizes alef variants (أ, إ, آ, ٱ) to a standard alef (ا)
- Strips leading "سورة" (surah) prefix from queries
- Enables matching regardless of diacritic marks or alef forms

## API Endpoints

| Method | Endpoint | Description | Query Params |
|--------|----------|-------------|--------------|
| GET | `/` | Health check | - |
| GET | `/api/surahs` | List all 114 surahs | `?q` (optional search filter) |
| GET | `/api/surahs/:surahNumber` | Get full surah with ayahs, audio, words | - |
| GET | `/api/search` | Search surahs and ayahs | `?q` (required search query) |

### Response Format

All responses follow a consistent structure:

```json
{
  "success": true,
  "data": { ... }
}
```

Error responses:

```json
{
  "success": false,
  "error": "Error message"
}
```

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

- **Framework**: Hono (lightweight, ultrafast web framework)
- **Runtime**: Cloudflare Workers (serverless edge computing)
- **Database**: Cloudflare D1 (SQLite-based edge database)
- **Language**: TypeScript
- **Package Manager**: Bun / npm
