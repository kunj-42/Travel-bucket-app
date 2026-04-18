# Ship checklist

Step-by-step for getting Bucket into TestFlight and Google Play Internal Testing.
Most of this only has to happen once; after the first successful build, updates
are one command each.

## Prerequisites (you do these once)

- [ ] **Apple Developer Program enrollment** — $99/year. <https://developer.apple.com/programs>. Takes 24–48h to activate.
- [ ] **Google Play Console account** — $25 one-time. <https://play.google.com/console>. Activates in an hour or two.
- [ ] **Replace placeholders in `eas.json`:**
  - `appleId` → your Apple ID email
  - `appleTeamId` → shown in <https://developer.apple.com/account> under Membership
  - `ascAppId` → the numeric app ID from App Store Connect after you create the app there (step below)
- [ ] **Replace `YOUR_EMAIL_HERE@example.com` in `PRIVACY.md`** with a real support email.
- [ ] **Host the privacy policy** — cheapest path is GitHub Pages:
  1. In this repo's Settings → Pages, enable Pages on the main branch.
  2. The policy will be at `https://kunj-42.github.io/Travel-bucket-app/PRIVACY` (once you copy `PRIVACY.md` to the repo root of `main`, which it already is).

## Step 1 — Convert icon + splash from SVG to PNG

Expo reads PNGs, not SVGs, so you need to export once.

On macOS:
```bash
brew install librsvg
rsvg-convert -w 1024 -h 1024 assets/icon.svg -o assets/icon.png
rsvg-convert -w 1024 -h 1024 assets/icon.svg -o assets/adaptive-icon.png
rsvg-convert -w 1284 -h 2778 assets/splash.svg -o assets/splash.png
```

If `brew` isn't installed: <https://brew.sh>

## Step 2 — Install EAS CLI and log in

```bash
npm install -g eas-cli
eas login              # Apple ID + password, one-time
eas whoami             # confirms the login stuck
```

## Step 3 — Initialize the EAS project

```bash
eas init
```

This prints a project ID. Copy it and paste into `app.json` at
`expo.extra.eas.projectId` (replacing `REPLACE_AFTER_FIRST_EAS_BUILD`).

## Step 4 — Build for iOS (TestFlight)

```bash
eas build --platform ios --profile production
```

First build walks you through Apple credentials (it'll offer to create them for
you). Takes ~20 minutes on EAS's cloud. When it finishes, you get a download
link for the `.ipa`.

## Step 5 — Create the App Store Connect entry

One-time setup:

1. Open <https://appstoreconnect.apple.com> → **My Apps** → **+** → **New App**.
2. Platform: iOS. Name: Bucket. Primary language: English. Bundle ID: pick
   `com.kunjbhujwala.bucket` from the dropdown (it'll be there after step 4).
3. SKU: anything unique, e.g. `bucket-001`. User access: Full.
4. After it saves, copy the numeric App ID from the URL and paste into `eas.json`
   → `submit.production.ios.ascAppId`.

## Step 6 — Submit to TestFlight

```bash
eas submit --platform ios --profile production --latest
```

Uploads the build to App Store Connect. It appears in TestFlight after Apple's
automatic processing (~15 min) and a first-time Beta App Review (~24h, only on
the first build).

## Step 7 — Invite testers (TestFlight)

In App Store Connect → TestFlight → **Internal Testing** (up to 100 people, your
own Apple IDs) or **External Testing** (up to 10,000, via invite link). Add emails
or share the public invite link.

Testers install the **TestFlight** app (free from App Store), then accept the
invite. Bucket shows up like any other app.

## Step 8 — Build + submit for Android

```bash
eas build --platform android --profile production
eas submit --platform android --profile production --latest
```

For `eas submit` to work on Android, you need a **Google Play service account
key JSON** (one-time, ~5 min setup):
- Play Console → Setup → API access → **Link Google Cloud project** → create a
  service account → grant it **Release Manager** role → download the JSON key
  → save it as `google-play-service-account.json` in the repo root.
- **Add `google-play-service-account.json` to `.gitignore`** (don't commit it!).

## Step 9 — Create the Google Play Console entry

1. Play Console → **Create app**. Name: Bucket. Default language: English.
   App type: App. Free or paid: Free.
2. Fill the **App content** checklist: privacy policy URL (step 0), data safety,
   target audience, content rating. Takes ~20 minutes total.
3. Once the checklist is green, your first submission to the **Internal Testing**
   track is available.

## Step 10 — Invite testers (Play Internal Testing)

Play Console → **Testing → Internal testing** → **Testers** → add emails or use a
Google Group. Share the opt-in link. Testers open the link, opt in, install
Bucket from Play Store like any other app.

## Ongoing updates (after first ship)

For every subsequent version:

```bash
# bump version in app.json (e.g. 0.1.0 → 0.1.1)
eas build --platform all --profile production
eas submit --platform all --profile production --latest
```

iOS updates go live on TestFlight within minutes (no second review for minor
changes). Android updates to the Internal Testing track are instant.

## Estimated total time

- Accounts + enrollment: **2 days elapsed** (Apple verification is slow; Google is hours)
- First build + submit both platforms: **1 afternoon**
- Waiting for Apple's first Beta Review: **24h**
- Total from today to first friends-can-install: **~3 days**
