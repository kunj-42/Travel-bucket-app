# Bucket

A minimal, editorial travel bucket-list app. Pick a city, type a place name — the app pulls the photo, address and map pin from Google. No accounts, no sync, no fuss.

Built with **React Native + Expo (managed)**, **Expo Router**, **TypeScript**, **AsyncStorage**, and the **Google Places API (New)**.

## Design

- Cream `#FBF9F4` page, charcoal `#1A1A1A` type, one accent: muted terracotta `#B4552D`.
- Fraunces for display & titles, Inter for UI & body.
- Hairlines only, 1px borders, no shadows or gradients.
- Full-bleed imagery, small-caps tracked-out category labels, generous whitespace.

## Flow

1. **First launch** → onboarding. Pick 3+ cities you dream of (from a curated 24, plus Google Places search for anywhere else).
2. **Feed** — empty on day one. You fill it.
3. **Add** — pick city → type place name → Google Places dropdown → tap → confirm category + notes → save. Photo, address, coordinates all populated.
4. **Place detail** — hero photo, serif title, notes, tags, source link, and a prominent "Open in Google Maps" that pins the exact spot.
5. **Filter** — city chips, category toggle, tag chips, free-text search.
6. **For you** — scaffold for a future suggestions engine (TODO marker in `lib/suggestions.ts`).
7. **Account** — start-over button if you want to wipe and re-onboard.

## Getting started

### 1. Install dependencies

```bash
npm install --legacy-peer-deps
```

### 2. Add your Google Places API key

```bash
cp .env.example .env
```

Open `.env` and paste your key after `EXPO_PUBLIC_GOOGLE_PLACES_API_KEY=`.

**Getting a key** — Google Cloud Console → create a project → enable **Places API (New)** → Credentials → Create → API key. Restrict the key to Places API (New) only, and set a small budget alert.

`.env` is gitignored — your key never goes to GitHub.

### 3. Run

```bash
ulimit -n 10240      # lift the file-watcher limit on macOS
npx expo start -c    # -c clears the cache
```

Scan the QR with Expo Go.

## File tree

```
app/
  _layout.tsx                 root stack, fonts, providers, onboarding gate
  onboarding.tsx              first-launch city picker
  (tabs)/
    _layout.tsx               bottom tab bar
    index.tsx                 Feed
    suggestions.tsx           For You (scaffolded)
    filters.tsx               Filter & search
    settings.tsx              Account
  add.tsx                     Add-place modal (city → place → details)
  place/[id].tsx              Place detail
components/
  Button.tsx
  CategoryLabel.tsx
  Chip.tsx
  Divider.tsx
  EmptyState.tsx
  PlaceCard.tsx
  PlaceImage.tsx
  ScreenHeader.tsx
lib/
  db.ts                       AsyncStorage wrapper (places, cities, onboarded flag)
  maps.ts                     Google Maps deep link (coordinates + place_id when available)
  parseUrl.ts                 Best-effort OG/Twitter meta parse (for source-link auto-fill)
  places.ts                   CRUD + selectors
  placesApi.ts                Google Places API (New): autocomplete, details, photos
  seed.ts                     Curated onboarding city list
  store.tsx                   React context + hook
  suggestions.ts              Placeholder recommender, ready for an LLM swap
  types.ts
theme/
  colors.ts
  spacing.ts
  typography.ts
.env.example                  copy to .env, paste key
app.json
babel.config.js
package.json
tsconfig.json
```

## Privacy & costs

- Everything is stored locally on your phone (AsyncStorage).
- The Google Places API is called every time you search for a place. Google gives $200/month free credit; personal-scale usage is pennies. Set a budget alert in Cloud Console for safety.
- Your API key is embedded in the app bundle for development. If you ever publish the app, put the key behind a backend proxy or use a referrer restriction.

## What's next

See [`ROADMAP.md`](./ROADMAP.md) — "The Shelf." All parked features and wishlist
items live there. Three major parked items right now: taste-based suggestions,
Google Maps Takeout import, and city-list sharing.
