/**
 * Embedded API keys.
 *
 * These live in the repo (not in .env) on purpose — .env is gitignored, so
 * every fresh clone and every EAS build started without keys and broke the
 * app in the same way over and over. Moving the keys here means the app
 * Just Works after a `git clone`, without a setup dance.
 *
 * Both keys are public-tier / client-embeddable by design:
 * - Google Places is a client-side key with a Google Cloud budget cap as
 *   the safety net. Anyone who extracts the APK can see it; anyone who
 *   hits the GitHub repo can see it. That's fine for a personal app.
 * - Gemini is on the free-tier AI Studio (no billing), with daily quota
 *   caps that prevent runaway usage.
 *
 * If you want tighter control later, the `process.env.*` fallback still
 * works — put a key in `.env` and it overrides the embedded default. Good
 * for a future "bring your own key" setting.
 */

export const GOOGLE_PLACES_API_KEY =
  process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY ||
  'AIzaSyB90nof4YiHA6YMwg-prmBGYP8kKKBgOpE';

export const GEMINI_API_KEY =
  process.env.EXPO_PUBLIC_GEMINI_API_KEY ||
  '';
