# Judgment — family card game

This repo contains a ready-to-deploy Next.js + TypeScript project (minimal realtime with serverless signaling and simple server-side dealing for ease of family deployment).

## Quick deploy (Vercel) — simplest path

1. Download this ZIP and extract.
2. Create a new GitHub repository and push these files (or skip pushing and use Vercel's "Import from Git" if you prefer).
3. Go to https://vercel.com/new and import your GitHub repository (or connect directly to the extracted folder if using Vercel CLI).
4. Accept defaults and deploy. Vercel will give you `https://<your-team>.vercel.app`.

No environment variables required.

## Local dev

```bash
cd judgment_project
npm install
npm run dev
# open http://localhost:3000
```

## Notes
- This initial release uses in-memory server-side room storage (suitable for family use).
- If you prefer host-private delivery of hands via WebRTC (no server-side hands), tell me and I will refactor.
