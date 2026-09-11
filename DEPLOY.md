# Deployment

Every push to `main` builds and deploys to S3 + CloudFront automatically via
[.github/workflows/deploy.yml](.github/workflows/deploy.yml). There is one
environment. No other branch deploys.

This replaces the by-hand routine in [MANUAL-DEPLOY.md](MANUAL-DEPLOY.md).
That document is still the reference for the *one-time* AWS setup (creating the
bucket, the distribution, the OAC bucket policy, and the SPA error-page rules) —
keep it for that. The repeated part, Part 6, is now automatic.

To redeploy the current commit without pushing: **Actions** tab -> *Deploy to
Production* -> **Run workflow**.

## What a run does

1. `npm ci` on Node 22 — Vite 7 requires >= 20.19
2. Writes `.env.production` from repository secrets
3. `npm run build` (`tsc -b && vite build`); a failure stops the deploy
4. Syncs `dist/` to S3 in two passes with correct cache headers
5. Creates a CloudFront invalidation and **waits** for it to finish, so a green
   check means users are really seeing the new build

### Why two sync passes

Assets go up first, then `index.html`. `index.html` references content-hashed
filenames, so those files have to exist before it points at them — uploading it
first leaves a window where visitors get HTML referencing JS that isn't in the
bucket yet.

| Files | `Cache-Control` | Why |
| ----- | --------------- | --- |
| `assets/**`, images | `public,max-age=31536000,immutable` | Filenames contain a content hash, so a new build produces new names. Stale caching is impossible. |
| `index.html`, `push-sw.js` | `no-cache,no-store,must-revalidate` | The pointers to everything else. A stale copy of either pins users to an old release. |

This is Part 4 of MANUAL-DEPLOY.md, applied automatically on every deploy
instead of being re-applied by hand each time (a re-upload wipes object
metadata, which is the step easiest to forget).

`--delete` removes hashed files from older builds, so the bucket does not grow
forever. **The bucket must contain only this site** — anything else at the root
will be deleted.

## Required GitHub secrets

**Settings -> Secrets and variables -> Actions -> New repository secret**

### AWS (5, all required)

| Secret | Example |
| ------ | ------- |
| `AWS_ACCESS_KEY_ID` | `AKIA…` |
| `AWS_SECRET_ACCESS_KEY` | `…` |
| `AWS_REGION` | `ap-south-2` |
| `S3_BUCKET` | `ekam-frontend-dev` — name only, no `s3://` |
| `CLOUDFRONT_DISTRIBUTION_ID` | `E1A2B3C4D5E6F7` |

If `CLOUDFRONT_DISTRIBUTION_ID` is omitted the deploy still succeeds but warns:
files reach S3 while CloudFront keeps serving the cached old version.

### Application (3 required, 10 optional)

| Secret | Required | Notes |
| ------ | -------- | ----- |
| `VITE_API_BASE_URL` | yes | e.g. `https://dev-api.ekamnetwork.com/api/v1` |
| `VITE_API_URL` | yes | same value in current config |
| `VITE_WS_URL` | yes | e.g. `https://dev-api.ekamnetwork.com/ws/chat` |
| `VITE_IDLE_TIMEOUT_MS` | no | falls back to the app default |
| `VITE_IDLE_WARNING_MS` | no | falls back to the app default |
| `VITE_FIREBASE_API_KEY` | no | all eight Firebase values are optional |
| `VITE_FIREBASE_AUTH_DOMAIN` | no | |
| `VITE_FIREBASE_PROJECT_ID` | no | |
| `VITE_FIREBASE_STORAGE_BUCKET` | no | |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | no | |
| `VITE_FIREBASE_APP_ID` | no | |
| `VITE_FIREBASE_MEASUREMENT_ID` | no | |
| `VITE_FIREBASE_VAPID_KEY` | no | |

Omit every `VITE_FIREBASE_*` value and the app runs fine, just without push
notifications. Set them and note that **push also requires HTTPS**, so the
CloudFront route — not a bare S3 website endpoint — is mandatory.

Two more are set by the pipeline and need no secret:

- `VITE_APP_VERSION` — derived as `web-<short-sha>`, so a deployed bundle can be
  traced back to its commit
- `VITE_ENABLE_LOCATOR` — forced to `false`; it is a dev-only overlay

Empty optional secrets are omitted from `.env.production` rather than written as
`KEY=`, because an empty string and an absent variable are different things to
the app.

> These values are inlined into the JavaScript bundle at build time and are
> therefore public once deployed — that is normal for a browser app and is why
> Firebase web keys are not secrets in the security sense. Never put a value
> here that must stay private; it would ship to every visitor.

## IAM policy for the access key

Create a dedicated IAM user for CI. Do **not** attach `AdministratorAccess`.
Substitute your bucket name, account ID and distribution ID:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ListTheBucket",
      "Effect": "Allow",
      "Action": "s3:ListBucket",
      "Resource": "arn:aws:s3:::ekam-frontend-dev"
    },
    {
      "Sid": "WriteSiteObjects",
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:PutObjectAcl", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::ekam-frontend-dev/*"
    },
    {
      "Sid": "InvalidateCache",
      "Effect": "Allow",
      "Action": ["cloudfront:CreateInvalidation", "cloudfront:GetInvalidation"],
      "Resource": "arn:aws:cloudfront::123456789012:distribution/E1A2B3C4D5E6F7"
    }
  ]
}
```

`s3:ListBucket` is what `aws s3 sync` uses to work out what to upload and what
`--delete` should remove; without it the sync re-uploads everything and deletes
nothing. `cloudfront:GetInvalidation` is what the wait step polls.

Rotate the key periodically — **IAM -> Users -> Security credentials -> Create
access key**, update both GitHub secrets, then delete the old key.

## One-time AWS setup

If the bucket and distribution do not exist yet, follow
[MANUAL-DEPLOY.md](MANUAL-DEPLOY.md) Parts 1 and 2 Route A once. Two settings
there are easy to miss and both break the site rather than the deploy:

- **Default root object** must be `index.html`, or `/` returns AccessDenied
- **Custom error responses** for both `403` and `404` must return `/index.html`
  with status `200`. Without them the app works until someone refreshes an inner
  page or opens a deep link. The 403 rule is the one that actually fires, since
  a private bucket answers "Forbidden" rather than "Not Found" for a missing key.

Neither is something CI can set — they are properties of the distribution.

## Troubleshooting

| Symptom | Cause |
| ------- | ----- |
| `Missing required repository secret(s)` | One of the three required `VITE_*` secrets is unset. |
| `AccessDenied` during sync | IAM policy missing, or `S3_BUCKET` misspelled. |
| Sync re-uploads every file each run | `s3:ListBucket` missing from the policy. |
| Deploy is green but users see the old site | `CLOUDFRONT_DISTRIBUTION_ID` unset — check the run for the warning. |
| Blank page, console 404s on `/assets/…` | Wrong bucket, or something other than the site lives at the bucket root. |
| Works until you refresh an inner page | Distribution error responses missing (see above). |
| API calls blocked by CORS | Backend must allow the site origin — fix `CORS_ORIGIN` in `ekam-backend`, not here. |
| Push notifications never prompt | Needs HTTPS via CloudFront *and* all eight `VITE_FIREBASE_*` secrets at build time. |

## Rolling back

There are no previous builds in the bucket to restore — `--delete` prunes them.
Roll back by reverting the commit on `main`, which triggers a fresh deploy of
the previous code:

```bash
git revert <bad-sha> && git push origin main
```
