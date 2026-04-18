# Ship checklist

Step-by-step for getting Bucket onto **Google Play Internal Testing first**, then
TestFlight once iOS is ready. Android is prioritised because it's cheaper ($25 vs
$99/yr), activates in hours, and Internal Testing has **no review delay** — your
first friends can install within a day of signing up.

## Prerequisites (you do these once)

- [ ] **Google Play Console account** — $25 one-time. <https://play.google.com/console>. Activates in an hour or two.
- [ ] **Apple Developer Program enrollment** — $99/year. <https://developer.apple.com/programs>. Takes 24–48h to activate. Start this in parallel so it's ready when you get to iOS.
- [ ] **Replace `YOUR_EMAIL_HERE@example.com` in `PRIVACY.md`** with a real support email.
- [ ] **Host the privacy policy** — cheapest path is GitHub Pages:
  1. In this repo's Settings → Pages, enable Pages on the main branch.
  2. The policy will be at `https://kunj-42.github.io/Travel-bucket-app/PRIVACY` (once `PRIVACY.md` is merged to `main`).

## Step 1 — Convert icon + splash from SVG to PNG

Expo reads PNGs, not SVGs. Export once.

On macOS:
```bash
brew install librsvg
rsvg-convert -w 1024 -h 1024 assets/icon.svg -o assets/icon.png
rsvg-convert -w 1024 -h 1024 assets/icon.svg -o assets/adaptive-icon.png
rsvg-convert -w 1284 -h 2778 assets/splash.svg -o assets/splash.png
```

If `brew` isn't installed: <https://brew.sh>.

## Step 2 — Install EAS CLI and log in

```bash
npm install -g eas-cli
eas login              # your Expo account (create one at expo.dev if needed)
eas whoami             # confirms the login stuck
```

## Step 3 — Initialize the EAS project

```bash
eas init
```

Copy the printed project ID into `app.json` at `expo.extra.eas.projectId` (replace
`REPLACE_AFTER_FIRST_EAS_BUILD`).

---

## Android — ship this first

### Step A1 — Build the Android app bundle

```bash
eas build --platform android --profile production
```

Takes ~15 minutes on EAS's cloud. First time, EAS offers to generate a signing
keystore for you — **say yes and let EAS manage it**, otherwise lost keystore =
locked out of future updates forever. When done, you get an `.aab` download link.

### Step A2 — Create the Google Play Console entry

1. Play Console → **Create app**. Name: Bucket. Default language: English.
   App type: App. Free or paid: Free.
2. Fill the **App content** checklist (~20 min):
   - Privacy policy URL (from prerequisites above)
   - Data safety: declare that no data is collected (matches `PRIVACY.md`)
   - Target audience: 13+
   - Content rating: answer the questionnaire
   - Ads declaration: none
3. Once the checklist is green, the **Internal testing** track unlocks.

### Step A3 — Set up the service account for `eas submit`

One-time, ~5 min:

1. Play Console → **Setup** → **API access** → **Link Google Cloud project** →
   create a new one or pick an existing.
2. **Service accounts** → create one → **Grant access** → role: **Release
   manager** (minimum needed for `eas submit`).
3. Click the service account → **Keys** → **Add key** → **Create new key** →
   **JSON** → download.
4. Save the downloaded JSON as `google-play-service-account.json` in the repo
   root. **It's already in `.gitignore` — do not commit it.**

### Step A4 — Submit to Internal Testing

```bash
eas submit --platform android --profile production --latest
```

Uploads the `.aab`. Available in Play Console → **Testing → Internal testing**
within 10 minutes. **No review needed for Internal.**

### Step A5 — Invite testers

Play Console → **Testing → Internal testing** → **Testers** tab → add emails
individually or via a Google Group. Then **Copy link** at the top to get the
opt-in URL.

Send that link to friends. They:
1. Open the link on their Android phone (must be signed into a Google account
   you added).
2. Tap **"Become a tester"**.
3. Tap **"Download it on Google Play"** → Play Store opens → install Bucket like
   any other app.

**You're live for Android.** Any update you push goes to testers in ~10 minutes.

---

## iOS — once the Apple account is active

### Step I1 — Build for iOS

```bash
eas build --platform ios --profile production
```

First time, EAS walks you through Apple credentials (it'll offer to create the
provisioning profile + distribution certificate for you — say yes). Takes ~20
minutes.

### Step I2 — Create the App Store Connect entry

1. Open <https://appstoreconnect.apple.com> → **My Apps** → **+** → **New App**.
2. Platform: iOS. Name: Bucket. Primary language: English. Bundle ID: pick
   `com.kunjbhujwala.bucket` from the dropdown (appears after step I1).
3. SKU: anything unique, e.g. `bucket-001`. User access: Full.
4. Copy the numeric App ID from the URL bar. Paste into `eas.json` →
   `submit.production.ios.ascAppId`.
5. Also fill `appleId` (your Apple ID email) and `appleTeamId` (visible at
   <https://developer.apple.com/account> under Membership Details) in `eas.json`.

### Step I3 — Submit to TestFlight

```bash
eas submit --platform ios --profile production --latest
```

The build appears in App Store Connect within ~15 min. First build goes through
Apple's **Beta App Review** (~24h). Subsequent builds skip the review.

### Step I4 — Invite testers

App Store Connect → **TestFlight**:
- **Internal Testing** — up to 100 of your own Apple IDs, no review, instant.
- **External Testing** — up to 10,000 public testers, one-time invite link.

Testers install the free **TestFlight** app from the App Store, accept the
invite, then install Bucket like any other app.

---

## Ongoing updates (after first ship)

For every version bump:

```bash
# Bump `version` in app.json (e.g. 0.1.0 → 0.1.1).
# Also bump ios.buildNumber and android.versionCode by 1.

eas build --platform all --profile production
eas submit --platform all --profile production --latest
```

Android Internal Testing updates: live in ~10 minutes, no review.
iOS TestFlight updates: live in ~15 minutes for minor changes.

---

## Estimated time from today to friends installing

- Google Play sign-up + first Android ship: **half a day**
- Apple enrollment + first iOS ship: **~3 days** (Apple verification is the slow part)

Android is the clear first-wave. Ship it, get real feedback from friends, then
roll iOS as soon as Apple's account is active.
