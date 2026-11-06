# Path Finder

Hackathon prototype. See `CLAUDE.md` for the product, threat model, architecture, and team workflow.

## Run locally
```
npm install
cp .env.example .env.local   # add ANTHROPIC_API_KEY
npm run dev                  # http://localhost:3000
```

## Install as a web app
The app is a PWA. Deploy to Vercel (HTTPS), then:
- **iPhone (Safari):** Share → Add to Home Screen
- **Android (Chrome):** menu → Install app

To test installability locally: `npm run build && npm start` (the service worker only registers in production builds).
