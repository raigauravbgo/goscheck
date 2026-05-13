# GosCheck — Post-MVP Project Plan
**Based on gap analysis · April 2026**

---

## Priority Framework

Issues are ranked by: **User Impact × Implementation Effort × Competitive Parity**

| Priority | Label | What it means |
|----------|-------|---------------|
| P0 | Critical / Blocking | Missing feature that undermines product credibility with target users |
| P1 | High | Meaningful gap vs. competitors; high daily-use value |
| P2 | Medium | Adds depth; not blocking adoption |
| P3 | Low | Nice to have; no urgency |

---

## Phase 1 — Credibility (Weeks 1–2)
*Goal: Close the gaps that technical users will notice immediately*

---

### ~~P0.1 — Core Web Vitals via PageSpeed Insights API~~ ✅ DONE — April 2026

**Delivered:**
- `src/lib/cwv.ts` — PageSpeed Insights API wrapper (mobile + desktop, all 5 metrics)
- `cwvData` field added to `PageResult` model
- Pipeline fetches CWV before Pass 1; data injected into `technical_health` prompt
- `technical_health` score blended 50/50: AI assessment + real PageSpeed performance score
- Technical Health dimension page: site-wide CWV summary card + per-page mobile/desktop toggle panel
- Requires `GOOGLE_PAGESPEED_API_KEY` in `.env`

**Gap:** GosCheck infers performance from content signals. Every serious competitor measures real LCP, FID/INP, and CLS. In 2026, CWV directly affects Google rankings. Technical users will immediately notice this is missing.

**Approach:**
- Call Google PageSpeed Insights API (free, no quota issues for internal use) per page URL
- Run in parallel with Pass 1 — no pipeline blocking
- Feed CWV scores into the `technical_health` dimension score as a weighted sub-score
- Display CWV metrics (LCP, INP, CLS) as a dedicated sub-section on the Technical Health dimension page

**What to build:**
1. `src/lib/cwv.ts` — wrapper around PageSpeed Insights API (`https://www.googleapis.com/pagespeedonline/v5/runPagespeed`)
2. Add `cwvData` field to `PageResult` schema — `{ lcp: number, inp: number, cls: number, fcp: number, ttfb: number, performanceScore: number }`
3. In `runCrawlJob.ts` — fire CWV fetch alongside Pass 1 (Promise.all), store result
4. On Technical Health dimension page — add a "Core Web Vitals" section showing real scores per page with pass/fail thresholds (LCP < 2.5s = good, CLS < 0.1 = good, INP < 200ms = good)
5. Update `technical_health` dimension prompt in `pass1.ts` to incorporate actual CWV data when available

**Env var needed:** `GOOGLE_PAGESPEED_API_KEY` (free from Google Cloud Console)

**Effort:** 2–3 days
**Impact:** High — immediately addresses the most visible credibility gap

---

### ~~P0.2 — Reinstate Pass 2 as Async Background Job~~ ✅ DONE — April 2026

**Delivered:**
- `pass2Status` field on Scan model (`pending/running/complete/skipped`)
- `PageIssueResult` model — stores pre-generated issues per `{ scanId, url, dimension }`
- `src/lib/pipeline/runPass2.ts` — autonomously analyzes all pages/dimensions scoring below 70
- Fires as `void runPass2(scanId)` after synthesis in `runCrawlJob.ts`
- Issues API checks MongoDB first — instant load on cache hit, persists on cache miss
- Dimension page: pulsing "Deep analysis running…" banner while active, green "complete" indicator when done

---

---

## Phase 2 — Workflow Integration (Weeks 3–4)
*Goal: Turn GosCheck from a reporting tool into a daily workflow tool*

---

### ~~P1.1 — Bug Tracker Integrations (Jira + Linear)~~ ✅ DONE — April 2026

**Delivered:**
- `Integration` model — stores Linear API key + team, or Jira email/token/domain/project (single-tenant)
- `TrackerPush` model — records every push with `ticketId`, `ticketUrl`, `trackerType`
- `src/lib/integrations/linear.ts` — GraphQL API: test connection, list teams, create issue with priority mapping
- `src/lib/integrations/jira.ts` — REST API: test connection, list projects, create issue with ADF description
- `/api/integrations/linear` and `/api/integrations/jira` — GET status, POST test+save, DELETE disconnect
- `/api/issues/push` — creates ticket in connected tracker (Linear preferred, Jira fallback), stores push record
- `/settings` page — connect/disconnect UI with "Test Connection → pick team/project → Save" flow
- "🐛 Push to Tracker" button now live — becomes clickable "✓ Linear/Jira ticket ↗" link on success
- "⚙ Integrations" nav link added to dimension page

---

### P1.2 — Scheduled Scans + Email Digest

**Gap:** GosCheck is a one-time pull. A site can regress after a deployment and nobody knows until someone manually re-runs a scan. All competitors offer scheduled scans with alerts.

**Approach:**
- Add a "Schedule" option per site — daily / weekly / monthly
- Store cron config in MongoDB
- Use Vercel Cron Jobs (or a simple cron endpoint) to trigger scheduled scans
- Send email digest on completion: score delta vs. last scan, new critical issues, improved areas

**What to build:**
1. Add `schedule` field to `Site` model — `{ enabled: boolean, frequency: "daily"|"weekly"|"monthly", nextRunAt: Date, lastRunAt: Date }`
2. `/app/api/cron/scans/route.ts` — cron endpoint, finds all sites due for a scan, triggers `runCrawlJob`
3. `vercel.json` — cron job config (or equivalent for hosting)
4. `src/lib/email.ts` — email digest template using Resend or Nodemailer
5. Site settings UI — toggle scheduled scans, select frequency
6. Email template: score badge, delta table (dimension scores vs. last scan), top 3 new issues

**Env vars needed:** `RESEND_API_KEY` (or SMTP config)

**Effort:** 3–4 days
**Impact:** High — converts GosCheck from one-time tool to ongoing monitoring platform

---

## Phase 3 — Depth & Differentiation (Weeks 5–6)
*Goal: Add features that create competitive moat and executive wow*

---

### ~~P1.3 — Competitor Benchmarking~~ ✅ DONE — April 2026

**Delivered:**
- `compareUrl` + `comparisonScanId` fields added to Scan model
- Scans API creates two parallel scans when `compareUrl` is provided, links them bidirectionally
- Homepage: "+ Compare against a competitor" toggle reveals second URL input; button changes to "Compare →"
- `ComparisonView.tsx` — side-by-side grade/score cards, 8-dimension bar chart (winner highlighted), per-dimension delta badge, win-count summary (X leads / Y leads / Tied)
- "⚔ Comparison" tab auto-appears on dashboard when `comparisonScanId` is present
- Live status indicator while both scans run; comparison renders once both complete

---

### P2.1 — Schema Markup / Structured Data Validation

**Gap:** Schema.org markup is increasingly important for AI search (Google AI Overviews, Bing, ChatGPT Browse). None of the current 8 dimensions explicitly validate it.

**Approach:**
- Extract JSON-LD and microdata from page HTML during crawl (Firecrawl returns raw HTML)
- Validate against expected schema types for page type (Article, Product, Organization, FAQPage, etc.)
- Score as a sub-component of the SEO dimension
- Show structured data issues as a dedicated section on the SEO dimension page

**What to build:**
1. `src/lib/schema-validator.ts` — parse JSON-LD from HTML, validate required properties per schema type
2. Add `schemaData` field to `PageResult`
3. Update SEO prompt in `pass1.ts` to include schema validation findings
4. SEO dimension page — "Structured Data" section showing which schema types are present, missing, or malformed

**Effort:** 2–3 days
**Impact:** Medium — differentiates from most mid-market SEO tools; relevant for AI search visibility

---

### ~~P2.2 — Mobile vs. Desktop Split~~ ✅ DONE — April 2026

**Delivered:**
- CWV panel (mobile/desktop toggle) now shown on all dimension pages, not just Technical Health
- "📱 Mobile gap" badge shown on page rows where desktop perf score is 15+ pts above mobile
- Builds on existing `cwvData.mobile` / `cwvData.desktop` already stored per PageResult

---

### P2.3 — Backlink Data (SEO Dimension)

**Gap:** Backlink health is a core SEO input that GosCheck completely ignores. Link equity matters for understanding why a site ranks where it does.

**Approach:**
- Integrate Moz API for domain-level link metrics
- Surface: Domain Authority, total backlinks, linking root domains, top anchor text
- Show as a read-only "Link Profile" card on the SEO dimension page
- Feed DA score as a weighted input to the SEO dimension aggregate score

**What to build:**
1. `src/lib/moz.ts` — Moz API wrapper for domain metrics
2. Add `linkProfile` field to `SiteSummary` — `{ domainAuthority, totalBacklinks, linkingRootDomains, topAnchors[] }`
3. SEO dimension page — "Link Profile" section (domain-level, not per-page)
4. Update SEO synthesis prompt to incorporate DA and backlink context

**Env var needed:** `MOZ_API_KEY`

**Effort:** 2–3 days
**Impact:** Medium — addresses a real gap but Moz data is domain-level only, not page-level

---

### P3.1 — AI Rate Limit / Concurrency Improvement

**Gap:** Pass 1 runs at concurrency of 1. Large sites (100+ pages) take several minutes. Fine for internal use, problematic at scale.

**Approach:**
- Move Pass 1 triage to `gpt-4.1-mini` (faster, cheaper, higher rate limits, sufficient for scoring)
- Keep `gpt-4.1` for synthesis, actions, and page issue analysis
- Increase `PASS1_CONCURRENCY` to 3–5 once on a higher tier
- Add token usage tracking per scan

**What to build:**
1. Separate `PASS1_MODEL` and `SYNTHESIS_MODEL` env vars (default `gpt-4.1-mini` and `gpt-4.1`)
2. Increase `PASS1_CONCURRENCY` to 3 initially
3. Add `tokenUsage` field to `Scan` for cost monitoring

**Effort:** 1 day
**Impact:** Medium — operational improvement; affects demo reliability on large sites

---

## Summary Roadmap

```
Week 1–2  │ ✅ P0.1 Core Web Vitals       ✅ P0.2 Pass 2 Background Job
Week 3–4  │ ✅ P1.1 Bug Tracker (Linear + Jira)    P1.2 Scheduled Scans + Email  ← NEXT
Week 5–6  │ ✅ P1.3 Competitor Benchmarking         P2.1 Schema Validation
Week 7    │ ✅ P2.2 Mobile/Desktop Split             P2.3 Backlinks (Moz)    P3.1 Concurrency
```

---

## Env Vars Required (by phase)

| Phase | Var | Source |
|-------|-----|--------|
| P0.1 | `GOOGLE_PAGESPEED_API_KEY` | Google Cloud Console — free |
| P1.1 | `LINEAR_CLIENT_ID`, `LINEAR_CLIENT_SECRET` | Linear developer settings |
| P1.1 | `JIRA_CLIENT_ID`, `JIRA_CLIENT_SECRET` | Atlassian developer console |
| P1.2 | `RESEND_API_KEY` | resend.com |
| P2.3 | `MOZ_API_KEY` | moz.com/products/api |

---

## Open Decisions

| # | Question | Owner | Priority |
|---|----------|-------|----------|
| 1 | Which bug tracker first — Linear or Jira? | Product | High |
| 2 | Email provider — Resend or internal SMTP? | Engineering | High |
| 3 | Is competitor benchmarking in scope for Q2 exec demo? | Product | High |
| 4 | Moz API vs. Ahrefs API — which has better terms for internal use? | Engineering | Medium |
| 5 | What is the OpenAI tier / monthly token budget? | Engineering | High |
| 6 | Self-hosted vs. Vercel — affects cron job approach for scheduled scans | Engineering | Medium |

---

*P0 items should be treated as sprint 1 blockers before any external demo or client-facing use. P1 items are the difference between a demo tool and a product teams adopt.*
