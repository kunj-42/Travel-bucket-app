# Bucket

A minimal, editorial travel bucket-list app. Paste a link — reel, Airbnb, blog, Maps — save the place, rediscover it when you're actually planning.

Built with **React Native + Expo (managed)**, **Expo Router**, **TypeScript**, **AsyncStorage**.

## Design

- Cream `#FBF9F4` page, charcoal `#1A1A1A` type, one accent: muted terracotta `#B4552D`.
- Fraunces for display & titles, Inter for UI & body.
- Hairline rules, 1px borders, no drop shadows, no gradients.
- Full-bleed imagery, small-caps tracked-out category labels, generous whitespace.

## Screens

- **Feed** — vertical editorial list. Alternating hero / photo-left / photo-right layouts.
- **For You** — suggestions built from a pure function over the saved list (see `lib/suggestions.ts`).
- **Filter** — city chips, category toggle, tag chips, free-text search.
- **Account** — storage info, reset sample shelf, future placeholder.
- **Add place** — modal, paste link → best-effort OG parse → confirm.
- **Place detail** — hero photo, serif title, notes, tags, "Open in Google Maps".

## Data model

See `lib/types.ts`. `Place` carries a `bucketIds: string[]` and `Bucket` has an `ownerId` and `isShared` flag — both unused in v1 UI, there to keep the door open for shared buckets later.

## Recommendation engine

`lib/suggestions.ts` exports a pure function `suggestPlaces(saved)` that scores a seeded candidate pool by city + tag + category overlap. There's a `TODO(llm)` at the top of the scoring block — swap the retrieval + scoring for an LLM call and the UI doesn't change.

## Getting started

```bash
# create and enter the project (only needed if you're starting fresh)
# npx create-expo-app@latest bucket --template blank-typescript

# install deps
npm install

# run
npx expo start
```

Then scan the QR in Expo Go, or press `i` / `a` for iOS / Android simulators.

## File tree

```
app/
  _layout.tsx                 root stack, fonts, providers
  (tabs)/
    _layout.tsx               bottom tab bar
    index.tsx                 Feed
    suggestions.tsx           For You
    filters.tsx               Filter & search
    settings.tsx              Account
  add.tsx                     Add-place modal
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
  db.ts                       AsyncStorage wrapper + seed on first launch
  maps.ts                     Google Maps deep link
  parseUrl.ts                 Best-effort OG/Twitter meta parse
  places.ts                   CRUD + selectors
  seed.ts                     Saved places + candidate pool
  store.tsx                   React context + hook
  suggestions.ts              Pure recommender (swap for LLM later)
  types.ts
theme/
  colors.ts
  spacing.ts
  typography.ts
app.json
babel.config.js
package.json
tsconfig.json
```

## Out of scope for v1

- Auth, accounts, sync
- Actual Instagram scraping (OG parse is best-effort; manual fallback always works)
- Push notifications
- Booking integrations
- Shared buckets (data model is ready; UI is not)

## Decisions I made

- **Storage**: AsyncStorage, not SQLite. Data is small, shape is simple, and wrapping CRUD in `lib/places.ts` means swapping to SQLite or a remote backend later is a one-file change.
- **Fonts**: Fraunces + Inter via `@expo-google-fonts/*`. Loaded with `expo-font` at the root layout; splash held until ready so the first frame is typographic, not a flash of system font.
- **Accent**: muted terracotta. Sage felt too earthy, ink blue too corporate. Terracotta reads warm without being loud.
- **Tab bar**: tiny uppercase words with a terracotta dot under the active tab. No icons. Editorial magazines don't use icons.
- **Feed rhythm**: a 5-item cycle (`hero, left, right, left, right`) so the eye is pulled to a full-bleed hero every few cards without being predictable.
- **Suggestions UI**: list, not grid. An italic terracotta line explains the *why* of each suggestion. A grid felt like an e-commerce product shelf.
- **Animation**: system-level `fade` on stack, `slide_from_bottom` for the Add modal. Reanimated is installed (its Babel plugin is wired) but nothing custom uses it yet — the interactions didn't need it.
- **No iconography**: all affordances are text. ＋ on the Feed FAB is the single exception; it's a glyph, not an icon.
