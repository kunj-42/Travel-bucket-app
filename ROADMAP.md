# The Shelf

Things to ship later. Add a bullet here whenever we say "park this" or "add later."
Each entry includes a short name, the user-facing value, a rough shape of what gets
built, and known constraints or open questions.

Status legend:
- **Parked (ready to pick up)** — design exists; code path is partly scaffolded or
  the shape is clear. A focused 1–3 day sprint would ship it.
- **Wishlist** — we've talked about it but not settled the design.

---

## Parked (ready to pick up)

### 1. For You — taste-based suggestions

Five places picked to match the signals in the user's bucket, refreshing only when
the user adds a new item ("organic refresh"). Gated behind a 10-item minimum so the
engine has enough to read.

**Current state:** engine plumbing is already in the codebase —
`lib/gemini.ts`, `lib/suggestionsEngine.ts`, `lib/suggestions.ts`, plus the
suggestion cache in `lib/db.ts`. The UI was reverted to a calm placeholder
(`app/(tabs)/suggestions.tsx`) because we hit Gemini free-tier 429s we couldn't
resolve from India. Re-wiring the UI is a one-file change once the engine path is
decided.

**Open question:** which LLM to use. Options we evaluated:
- Gemini 1.5/2.0 Flash — free tier flaky in India, hits 429 quickly.
- Claude Haiku — $0.005 per refresh, needs a paid Anthropic account.
- Rule-based (tag + category + city overlap against a curated candidate pool) — no
  API cost, deterministic, less magical but fully shippable offline.

**Recommended next step when we come back:** ship the rule-based version first with
a small curated pool (20–30 editorial picks). Low risk, ships in a day, proves the
UX. Swap to an LLM later once we have a budget.

---

### 2. Google Maps Takeout import

An "Imported" tab that ingests a user's Google Takeout `Saved Places` export and
stores each pin as metadata + Maps link — **zero Places API cost on import**.
Tapping an imported pin opens the existing add flow pre-filled with the title +
city, so promoting one into the real bucket uses the normal hydrate-with-photo
path.

**Shape:**
- `expo-document-picker` for file pickup, parse the GeoJSON / CSV Takeout export.
- New `Place.imported = true` flag or separate `ImportedPin` type.
- New tab (or a section under Settings) listing imported pins with a "Promote to
  bucket" action per row.

**Why it's cheap:** Takeout already ships name, address, coordinates, and the
Google Maps URL. No API calls at import; photos hydrate lazily only when the user
promotes a pin.

---

### 3. Share a city list

A "Share Lisbon" action that packs a city's places (title, category, address,
coords, notes, Maps link — **no photo URLs**, since those carry the user's API key)
into a compressed base64 blob, opens the native share sheet as a universal link
(`bucket://share?d=<blob>`). The recipient's app opens to a read-only "Shared list
preview" with per-item checkboxes + an "Add all" button.

**Fallback for friends without the app:** a "Share as text" option in the same
sheet produces a readable markdown-ish list with Maps links inline — works in any
messenger.

**Three design calls already made:**
- Unit: one city at a time (not whole bucket).
- Notes: excluded by default, opt-in toggle.
- Add flow for recipients: both bulk "Add all" and per-item checkboxes.

**Known tradeoff:** URL sharing breaks past ~40 places (iMessage/WhatsApp truncate
long links). Auto-fall-back to plain-text for oversized lists.

**Effort:** 1–2 days.

---

## Wishlist (design not yet settled)

- **Shared buckets across users.** The `Place.bucketIds` field already exists, but
  there's no UI, no real-time sync, no auth model. Deferred until a backend exists.
- **Instagram / TikTok scraping.** Those platforms don't expose metadata to
  unauthenticated fetchers. Would need either an OEmbed hack, a headless-browser
  proxy, or Apple's ShareExtension to snip the post text. Hard.
- **Sync across devices for a single user.** Needs auth + a backend. Not worth the
  spend until there's a reason more than "my phone + my iPad."
- **Auth and accounts.** Only if we decide to scale past 100 users or add the
  shared-bucket feature.
- **Push notifications.** Travel reminders, "you're near a saved place" — requires
  location tracking, battery cost. Low priority.
- **Offline map tiles.** Snapshotting a small map around each place for when the
  user is abroad without data. Nice, not essential.

---

## Rules for adding to this file

1. Every "park this" / "ship later" moment ends with a new bullet here. Short name,
   1–2 sentences on value, known unknowns.
2. When a parked item gets built, **delete** its entry from this file (not strike
   through — keep the list tight).
3. Wishlist items promote to Parked when the design is clear enough that we could
   hand a spec to a junior engineer.
