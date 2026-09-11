# Manual deploy — AWS console only

No scripts, no CI, no automation. You build once on your machine and upload the
result through the AWS console by hand. Repeat that whenever you want to ship.

Total time the first time: about 20 minutes. Every deploy after that: about 3.

---

## Part 0 — Build the site with production settings

This is the one command you cannot avoid; everything after it is clicking.

### 0.1 Point the app at the production backend

Your [.env](.env) is for local development — it points at `http://localhost:4000`,
which does not exist for your users. Create a second file named
**`.env.production.local`** in this folder:

```
VITE_API_BASE_URL=https://api.yourdomain.com/api/v1
VITE_API_URL=https://api.yourdomain.com/api/v1
VITE_WS_URL=https://api.yourdomain.com/ws/chat
VITE_APP_VERSION=web-1.0.0
```

Replace those URLs with wherever `ekam-backend` actually runs. Vite picks this
file up automatically for production builds and ignores it during `npm run dev`,
so your local setup keeps working. The `.local` ending means git ignores it.

If you also use Firebase push notifications, add those values too:

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MEASUREMENT_ID=...
VITE_FIREBASE_VAPID_KEY=...
```

Leave them out and the app simply runs without push.

### 0.2 Build

```bash
npm run build
```

Takes about 25 seconds and creates a `dist/` folder — roughly 11 MB across 186
files. That folder *is* your website. If the command reports a TypeScript error,
fix it first; a failed build leaves a stale `dist/` that would ship the wrong code.

---

## Part 1 — Create the bucket

AWS console -> **S3** -> **Create bucket**

| Field | Value |
| ----- | ----- |
| Bucket name | `ekam-frontend-prod` (must be globally unique — add a suffix if taken) |
| AWS Region | `Asia Pacific (Hyderabad) ap-south-2` — same region as your existing `ekam-develop` bucket |
| Object Ownership | ACLs disabled (default) |
| Block Public Access | **leave all four boxes ticked** for now |
| Everything else | defaults |

**Create bucket**.

Now pick how it gets served to users. Read both, then do one.

---

## Part 2, Route A — CloudFront in front (recommended)

Gives you HTTPS, a fast global cache, and compression. Still entirely console
clicks. Your bucket stays private and CloudFront is the only thing that can read it.

**Choose this one if:** you want push notifications, a custom domain, or the site
is going in front of real users. Push notifications are the deciding factor —
[PushNotificationsProvider.tsx:159](src/components/push/PushNotificationsProvider.tsx#L159)
registers a service worker, and browsers refuse to register one over plain HTTP.

### A1 — Create the distribution

Console -> **CloudFront** -> **Create distribution**

- **Origin domain** — click the box and pick your bucket from the dropdown. Choose
  the entry ending `.s3.ap-south-2.amazonaws.com`. If the dropdown also offers a
  "website endpoint" version, do **not** pick that one.
- **Origin access** — select **Origin access control settings (recommended)**,
  then **Create new OAC** -> keep the defaults -> **Create**.
- **Viewer protocol policy** — **Redirect HTTP to HTTPS**
- **Allowed HTTP methods** — `GET, HEAD`
- **Cache policy** — `CachingOptimized`
- **Compress objects automatically** — Yes
- **Default root object** — type `index.html`
  (skip this and visiting `/` returns an AccessDenied error page)
- **Custom domain** — leave empty for now; you can add it later.
- **Create distribution**

It takes 5-10 minutes to deploy. Note two things from the detail page: the
**Distribution domain name** (`d1234abcd.cloudfront.net`) and the
**Distribution ID** (`E1A2B3C4D5E6F7`).

### A2 — Apply the bucket policy

Right after creating the distribution, a blue banner appears saying the S3 bucket
policy needs updating. Click **Copy policy**, then **go to S3 bucket permissions**.

S3 -> your bucket -> **Permissions** -> **Bucket policy** -> **Edit** -> paste ->
**Save changes**.

If you lost the banner, paste this and substitute your account ID and
distribution ID:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFrontServicePrincipalReadOnly",
      "Effect": "Allow",
      "Principal": { "Service": "cloudfront.amazonaws.com" },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::ekam-frontend-prod/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "arn:aws:cloudfront::123456789012:distribution/E1A2B3C4D5E6F7"
        }
      }
    }
  ]
}
```

Your account ID is in the top-right account menu of the console.

### A3 — Make deep links work (do not skip)

The app uses React Router, so `/groups/123` is a URL the browser asks S3 for
directly, and no such file exists. Without this step the app works until someone
refreshes the page or opens a link, and then it breaks.

CloudFront -> your distribution -> **Error pages** tab -> **Create custom error
response**. Do this twice:

| HTTP error code | Customize error response | Response page path | HTTP Response code |
| --------------- | ------------------------ | ------------------ | ------------------ |
| `403: Forbidden` | Yes | `/index.html` | `200: OK` |
| `404: Not Found` | Yes | `/index.html` | `200: OK` |

The 403 entry is the one that actually fires — a private bucket answers "403
Forbidden", not "404", for a file that isn't there.

---

## Part 2, Route B — S3 website hosting only (quickest)

Ten minutes, no CloudFront. **The site is HTTP-only**, which means:

- Push notifications will not work — service workers require HTTPS.
- If `ekam-backend` runs on HTTPS, every API call fails as blocked mixed content.
- Login credentials cross the network unencrypted.
- No custom domain with TLS.

Fine for showing the team a preview. Not fine for production. If you go this way,
plan to move to Route A before real users arrive.

1. S3 -> your bucket -> **Properties** tab -> scroll to **Static website hosting**
   -> **Edit** -> **Enable**
   - Hosting type: *Host a static website*
   - **Index document**: `index.html`
   - **Error document**: `index.html` ← this is what makes deep links work
   - **Save changes**. Note the **Bucket website endpoint** at the bottom.
2. **Permissions** tab -> **Block public access** -> **Edit** -> untick
   **Block all public access** -> Save -> type `confirm`.
3. **Permissions** tab -> **Bucket policy** -> **Edit** -> paste -> Save:

   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "PublicReadGetObject",
         "Effect": "Allow",
         "Principal": "*",
         "Action": "s3:GetObject",
         "Resource": "arn:aws:s3:::ekam-frontend-prod/*"
       }
     ]
   }
   ```

---

## Part 3 — Upload the site

S3 -> your bucket -> **Objects** tab -> **Upload**

1. Open `dist/` in Explorer.
2. Select **everything inside it** — `Ctrl+A` — and drag it onto the upload page.
   You want the *contents*: `index.html`, `push-sw.js`, the images, and the
   `assets` folder. Do **not** drag the `dist` folder itself, or every file lands
   under `dist/` in the bucket and nothing resolves.
3. The page should report roughly **1 folder and 9 files** at the top level.
   Expand "Files and folders" and confirm you see `index.html` and `assets`.
4. Scroll down, click **Upload**.

11 MB takes under a minute. Wait for the green "Upload succeeded" banner.

Sanity check: the object list must show `index.html` at the top level, not
`dist/index.html`.

### Why it has to sit at the root

`dist/index.html` loads `/assets/index-*.js` — an absolute path. The files have to
be at the bucket root for those to resolve. Putting the site in a subfolder means
changing `base` in [vite.config.ts](vite.config.ts) and rebuilding.

---

## Part 4 — Set cache headers on `index.html` (2 minutes, worth it)

Skip this and you will eventually hit the classic problem: you upload a new
version, and users keep seeing the old one because their browser cached
`index.html` for a day.

S3 -> your bucket -> tick **`index.html`** -> **Actions** -> **Edit metadata**
-> **Add metadata**

- Type: `System defined`
- Key: `Cache-Control`
- Value: `no-cache, no-store, must-revalidate`

**Save changes**. Repeat for **`push-sw.js`** — same reason, it is the file that
tells the browser about updates.

Leave everything under `assets/` alone. Those filenames contain a content hash
(`index-Bf7hdd5f.js`), so a new build produces new filenames and stale caching is
impossible.

---

## Part 5 — Check it works

Open your site — the CloudFront domain for Route A, the bucket website endpoint
for Route B.

- [ ] The app loads and shows the login screen.
- [ ] Navigate to any inner page, then press **Ctrl+Shift+R**. It still renders.
      If you get AccessDenied or a plain 404 here, Part 2's error-page config is wrong.
- [ ] Log in. Open DevTools -> Network and confirm API calls go to your production
      backend, not `localhost:4000`.
- [ ] No red CORS errors in the Console tab.

If the API calls are blocked by CORS, that is a backend change: `ekam-backend`
has to list your new site domain as an allowed origin. Nothing in this repo fixes it.

---

## Part 6 — Deploying a new version later

This is the whole routine once setup is done:

1. `npm run build`
2. S3 -> bucket -> **Upload** -> drag the contents of `dist/` again -> **Upload**.
   Overwriting existing files is expected; the console does not warn you.
3. Re-apply the `Cache-Control` metadata on `index.html` and `push-sw.js` — a
   re-upload replaces the object and wipes the metadata you set in Part 4.
4. **Route A only:** CloudFront -> your distribution -> **Invalidations** tab ->
   **Create invalidation** -> enter `/*` -> **Create invalidation**. Wait about a
   minute. Until this finishes, users keep getting the old version from the cache.

Old hashed files from previous builds stay in the bucket forever. They cost
almost nothing and do no harm, but every few months you can sort the `assets`
folder by **Last modified**, select anything older than your last two releases,
and delete it.

---

## Troubleshooting

| What you see | Cause |
| ------------ | ----- |
| AccessDenied on the CloudFront root URL | **Default root object** is not set to `index.html`, or the Part A2 bucket policy was not applied. |
| The page loads but is blank, console shows 404s for `/assets/...` | You uploaded the `dist` folder instead of its contents. Delete everything and redo Part 3. |
| Works until you refresh an inner page | The custom error responses (A3) or the error document (B1) are missing. |
| You uploaded but still see the old site | Route A: create an invalidation (Part 6, step 4). Route B: hard-refresh; also check Part 4. |
| API calls fail with "blocked: mixed content" | Route B over HTTP calling an HTTPS backend. Move to Route A. |
| API calls fail with a CORS error | Backend must allow your site's origin. Fix in `ekam-backend`. |
| Push notifications never prompt | Requires HTTPS — Route A only — and all the `VITE_FIREBASE_*` values present at build time. |
| Bucket name "already exists" | S3 bucket names are globally unique across all AWS customers. Add a suffix. |

---

## When manual gets old

The upload-and-invalidate dance is fine at a few deploys a week. The failure mode
is human: forgetting the invalidation, forgetting the cache metadata, or shipping
a build made with the wrong `.env`. If that starts biting, the same three steps —
build, sync to S3, invalidate CloudFront — are what any automation would run, so
they translate directly into a script or a CI job whenever you want one.
