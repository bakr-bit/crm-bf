# New private CRM runbook (partners + brands only)

## Goal
Create a separate CRM instance for private use, while keeping the legacy CRM untouched.

## Requirements implemented
- Clone of existing codebase (same app behavior).
- Data clone scope: `Partner` + `Brand` only.
- Full field copy for those tables.
- Force every imported partner to `Lead` status.
- Do **not** copy users/passwords.
- Keep bot access via service API key (`X-API-Key` header using `SERVICE_API_KEY`).
- Optional no-index mode for subdomain/staging (`NEXT_PUBLIC_NOINDEX=true`).

## New script
`npm run data:clone-partners-brands`

### Required env vars
- `SOURCE_DATABASE_URL` - legacy CRM database URL
- `TARGET_DATABASE_URL` - new CRM database URL
- `TARGET_SCHEMA` (optional, default `public`)

### Behavior
- Reads source `Partner` + `Brand` rows.
- Inserts into target preserving IDs + metadata.
- Sets all target `Partner.status` = `Lead`.
- Sets target `Partner.accountManagerUserId` = `NULL`.
- Aborts if target has existing partner rows (unless `--force`).

### Force mode
```
npm run data:clone-partners-brands -- --force
```
This clears target `Brand` + `Partner` before clone.

## Bot access
The app accepts API-key access for many routes:
- Header: `X-API-Key: <SERVICE_API_KEY>`

For `@bf_assistantbot`, set the same `SERVICE_API_KEY` in bot config and in this CRM deployment env.

## No-index
Set:
- `NEXT_PUBLIC_NOINDEX=true`

This enforces:
- metadata robots noindex/nofollow
- `/robots.txt` disallow all crawlers

## Validation checklist
1. Login works with newly created admin user (not copied from legacy).
2. Legacy users are absent in new instance.
3. Partner count matches source.
4. Brand count matches source.
5. All partners in target have status `Lead`.
6. Brand-to-partner relationships are intact.
7. Bot can read/write via API key.
8. `/robots.txt` disallows indexing when noindex env is enabled.
