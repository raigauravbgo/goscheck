# GosCheck — Website Intelligence Platform
### Product Description Document
**Version:** 1.0
**Status:** Live — MVP
**Last Updated:** April 2026

---

## 1. What Is GosCheck?

GosCheck is an AI-powered website intelligence platform that audits any public website and delivers a detailed, actionable report — in minutes, with no configuration required beyond a URL.

Enter a URL. GosCheck crawls every page, scores the site across 8 quality dimensions using GPT-4.1, and produces an interactive dashboard with drill-down findings, AI-generated content recommendations, and page-level issue detection. The output reads like a senior digital consultant reviewed the site, not like a linting tool ran against it.

---

## 2. The Problem It Solves

Marketing and content teams lack a fast, intelligent way to understand their website's overall health. Existing tools are:

- **Too narrow** — SEO tools ignore content quality, accessibility, and brand consistency
- **Too technical** — dev-facing tools produce output that non-technical users can't act on
- **Too slow** — manual audits take days; automated ones require complex setup
- **Fragmented** — no single tool combines content quality, SEO, grammar, design, accessibility, UX, and brand analysis in one place

GosCheck closes that gap. One URL → one complete picture → clear actions.

---

## 3. Who It's For

### Primary — Marketing Manager / Content Strategist
Non-technical users who want to know: *"What's hurting us and what can I fix today?"*
They get plain-language findings, severity ratings, and AI-generated fixes without needing to understand technical jargon.

### Secondary — Web Developer / Engineer
Technical users who want specific page URLs, exact issue locations, and step-by-step fix instructions.
They get per-page score breakdowns, precise issue locations (e.g. "Page `<head>`", "Hero section"), and suggested code-level fixes.

### Tertiary — Executive / Decision Maker
Sees the overall score, letter grade, AI narrative, and PDF export.
Gets a one-page summary they can present in a boardroom without needing to understand the underlying data.

---

## 4. How It Works

### Step 1 — Enter a URL
The user enters any public website URL on the homepage. No account, no configuration, no integrations required.

### Step 2 — Crawl
GosCheck uses the Firecrawl API to crawl the site (up to 200 pages). It extracts clean markdown content, page metadata, and structure from every page — including JavaScript-rendered pages.

### Step 3 — AI Analysis (Pass 1)
As each page is crawled, GPT-4.1 scores it across 8 quality dimensions using structured function calling. Each dimension gets a score (0–100), severity rating, and confidence score. The dashboard updates in real time as pages complete.

### Step 4 — Synthesis
Once all pages are analyzed, GosCheck aggregates scores using a weighted formula, computes an overall health score and letter grade (A–F), and generates a 3–5 sentence executive narrative in consultant-level language.

### Step 5 — Drill Down
Users can click any dimension to see a full page-level breakdown. Clicking any individual page triggers an on-demand deep analysis — GosCheck re-scrapes that page and asks GPT-4.1 to identify specific, concrete issues with exact locations and fix suggestions.

### Step 6 — Take Action
Each issue includes a "Push to Bug Tracker" button (integration-ready). AI Actions let users generate content directly — blog post ideas, meta descriptions, accessibility reports, CTA rewrites, and more — cached locally so they don't re-generate on each visit.

### Step 7 — Export
Export a boardroom-ready PDF in two formats: Executive Summary (1–2 pages) or Full Technical Report.

---

## 5. The 8 Analysis Dimensions

| # | Dimension | Weight | Plain-Language Label | What It Covers |
|---|-----------|--------|---------------------|----------------|
| 1 | SEO | 20% | Search Visibility | Meta tags, heading structure, schema markup, crawlability, keyword relevance |
| 2 | Content Quality | 20% | Message Strength | Value proposition, clarity, depth, audience relevance, persuasiveness |
| 3 | Grammar & Writing | 15% | Writing Quality | Grammar, readability, tone, sentence structure, professionalism |
| 4 | Technical Health | 15% | Site Reliability | Performance signals, broken references, security, crawlability |
| 5 | Aesthetics | 10% | Visual Clarity | Layout, typography, whitespace, visual hierarchy, mobile signals |
| 6 | Accessibility | 10% | Accessibility | WCAG compliance, alt text, keyboard nav, contrast, ARIA |
| 7 | UX & Conversion | 5% | Ease of Action | CTAs, navigation clarity, conversion friction, trust signals |
| 8 | Brand Consistency | 5% | Brand Coherence | Voice, tone, messaging alignment, visual identity consistency |

Overall score = weighted average across all 8 dimensions, across all crawled pages.

---

## 6. Key Features

### Live Scan Progress
During a scan, users see a real-time terminal-style feed — each page as it completes, with per-dimension scores and severity badges. Stage indicators show progress: Crawling → Analyzing → Synthesizing.

### Interactive Dashboard
- **Hero card**: Overall score (0–100), letter grade (A–F) with color-coded glow, scan date, pages crawled, AI executive narrative
- **Category scorecard grid**: 8 clickable dimension tiles, each with score, severity badge, and score bar
- **Scan history tab**: Timeline of all previous scans for the same domain

### Dimension Drill-Down Pages
Clicking any dimension tile opens a full-page breakdown:
- Dimension description and aggregate score
- Summary stats: how many pages are Critical / Needs Attention / Good
- Full sortable table of all pages with individual dimension scores
- Expandable rows — click any page to trigger on-demand deep issue analysis

### Page-Level Issue Detection
When a page row is expanded, GosCheck re-scrapes the page and uses GPT-4.1 to identify specific, concrete issues. Each issue card includes:
- **Severity badge**: Critical or Needs Attention
- **Location chip**: Where on the page the issue exists (e.g. "Hero section", "Page `<head>`", "Navigation bar")
- **Issue title**: A specific, named problem (e.g. "Missing meta description", "H1 tag absent", "CTA button text is vague")
- **Description**: Exactly what is wrong and why it matters
- **Suggested fix**: A specific, actionable 1–2 sentence recommendation
- **Push to Bug Tracker**: One-click button to send the issue to an integrated bug tracker (integration-ready placeholder)

Results are cached in localStorage — re-opening a page shows the same analysis instantly without burning API tokens.

### AI Actions (Per Dimension)
Each dimension page has AI-powered actions that generate ready-to-use content tailored to the site's actual pages:

| Dimension | Available Actions |
|-----------|------------------|
| SEO | Write optimized meta titles + descriptions for worst-scoring pages |
| Content Quality | Generate 10 blog post ideas, write a full blog post, create a content brief |
| Grammar | Writing improvement guide with page-specific fixes |
| Aesthetics | Design recommendations with specific CSS quick wins |
| Technical Health | Prioritized developer checklist with effort estimates |
| Accessibility | WCAG audit report with implementation checklist |
| UX/Conversion | CTA rewrites, A/B test ideas, conversion funnel improvements |
| Brand Consistency | Brand voice guide with templates and do's/don'ts |

All generated content is cached in localStorage — persistent across page refreshes and drawer opens.

### Scan Management
- **Cancel a running scan** — stops the pipeline after the current page finishes, no further API calls
- **Recent scans** on homepage — last 5 scans visible immediately, click to return to any
- **Full scan history** at `/dashboard` — list of all 20 most recent scans with grade, score, domain, page count

### PDF Export
Two export formats, generated on demand:
- **Executive PDF**: Cover page, overall score + grade, AI narrative, dimension scorecard grid
- **Full Report PDF**: Everything above plus per-dimension breakdowns, full findings, page-by-page appendix

---

## 7. Scoring & Grading

**Score scale:**

| Range | Rating | Color |
|-------|--------|-------|
| 90–100 | Excellent | Green |
| 70–89 | Good | Green |
| 50–69 | Needs Attention | Yellow |
| 0–49 | Critical | Red |

**Grade thresholds:**

| Score | Grade |
|-------|-------|
| 90+ | A |
| 80–89 | B |
| 70–79 | C |
| 60–69 | D |
| < 60 | F |

---

## 8. Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | Next.js 15 + Tailwind CSS | React Server Components + client polling |
| AI Engine | OpenAI GPT-4.1 | Function calling (Pass 1), chat completions (synthesis, actions, issues) |
| Crawler | Firecrawl API | Handles JS-rendered pages, returns clean markdown |
| Database | MongoDB Atlas + Mongoose | Scans, page results, summaries, sites |
| PDF | @react-pdf/renderer | Executive and Full report templates |
| Hosting | Monorepo — `next-app/` + `worker/` | Fire-and-forget pipeline inside Next.js API routes |

---

## 9. Data Model

```
Site          — domain, name
Scan          — siteId, status, pagesCrawled, progressLog[], currentStage, timestamps
PageResult    — scanId, url, pass1Scores (8 dimensions × score/severity/confidence)
SiteSummary   — scanId, overallScore, grade, aiNarrative, dimensionScores
Finding       — scanId, dimension, title, description, effort (schema kept, not written in MVP)
```

---

## 10. Current Limitations (MVP)

- **Authenticated sites not supported** — crawl is public-only
- **No live performance data** — Core Web Vitals scores are inferred from content signals, not real measurements
- **Bug tracker integration is a placeholder** — "Push to Tracker" marks the issue locally but does not connect to Jira, Linear, or GitHub Issues yet
- **No automated fix implementation** — GosCheck recommends fixes, it does not apply them
- **Single-pass pipeline** — Pass 2 (targeted deep-dive per page) was removed from the MVP; on-demand page issue analysis via the drill-down UI replaces it
- **AI rate limits** — Pass 1 runs with concurrency of 1 to stay within OpenAI token limits; large sites (100+ pages) take several minutes

---

## 11. Planned Enhancements (Post-MVP)

- **Bug tracker integrations** — Jira, Linear, GitHub Issues (one-click push)
- **Scheduled scans** — weekly/monthly auto-rescan with email digest
- **Score trend charts** — sparklines per dimension across historical scans
- **Multi-site comparison** — side-by-side scorecard for multiple properties
- **Competitor benchmarking** — audit a competitor's site and compare scores
- **Scan comparison diff** — highlight what changed between two scans
- **CMS integrations** — WordPress, Webflow, Contentful hooks for direct fix publishing
- **White-label mode** — agency-facing version with custom branding on PDF exports
- **Authenticated site scanning** — cookie/session injection for behind-login pages

---

## 12. Non-Goals

The following are explicitly out of scope:

- Real-time monitoring or alerting
- Replacing a full technical SEO audit (e.g. Screaming Frog, Semrush)
- Automated code deployment or fix application
- Proprietary browser testing or screenshot diffing
- Compliance auditing (GDPR, SOC2, etc.)

---

*GosCheck is built as an internal R&D and executive showcase tool. The north star metric is: a non-technical marketing manager can enter a URL, get a full audit, and leave with 3 specific things to fix — in under 5 minutes.*
