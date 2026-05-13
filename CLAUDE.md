# GosCheck — Website Intelligence Platform

## Stack
- Frontend: React + Tailwind CSS
- Backend: Node.js
- Database: Mongodb
- AI: Claude API (claude-sonnet-4-20250514)
- Crawler: Firecrawl API
- PDF: React-PDF

## Project Reference
- Full PRD is in /PRD.md — read it before planning any feature
- Source of truth for architecture, data model, and scope

## Key Commands
- `npm run dev` — start dev server
- `npm run test` — run tests
- `npm run lint` — lint check

## Code Style
- Use ES modules (import/export), not CommonJS
- TypeScript strict mode
- Async/await over raw promises

## Architecture Notes
- All crawl jobs go through BullMQ queue (never direct/synchronous)
- Pass 1 analysis runs per-page as Firecrawl returns results
- Pass 2 only triggers on pages/dimensions scoring below 70
- All Claude API calls use structured JSON output mode