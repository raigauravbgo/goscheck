Product Requirements Document
Website Intelligence Platform
Project Type: R&D / Executive Showcase
Target Demo: Q2 Executive Check-in — April 2026
Primary Users: Marketing / Content Team
Status: Pre-build · v0.1 Draft

1. Overview
1.1 Vision
An autonomous, AI-powered website audit platform that crawls any public web property, analyzes it across 8 quality dimensions, and delivers both a live interactive dashboard and a boardroom-ready PDF report — with zero configuration required beyond a URL.
1.2 Problem Statement
Marketing and content teams lack a fast, intelligent way to get a holistic view of their website's health. Existing tools are either too technical (dev-facing), too narrow (SEO-only), or require manual interpretation. There is no single tool that combines content quality, SEO, grammar, design, accessibility, and UX analysis into one autonomous report written in plain business language.
1.3 Strategic Framing
Position as a "Website Intelligence Platform" — not a checker or validator. The output should read and feel like a senior digital consultant reviewed the site, not like a linting tool ran against it.

2. Goals & Success Metrics
GoalMetricFully autonomous end-to-endZero manual steps between URL input and report outputExecutive demo impactExec audience can understand findings without technical contextSpeedFull site scan completed and report ready in under 5 minutesAccuracyPass 1 triage correctly flags issues that Pass 2 confirms ≥ 85% of the timeAdoption post-demoMarketing team uses it on a recurring monthly cadenceCost efficiencyTwo-pass model reduces token usage by 40–60% vs. single deep pass

3. Scope
3.1 In Scope (V1)

Full site crawl of public web properties (up to 200 pages per scan)
Two-pass AI analysis pipeline across 8 dimensions
Live interactive dashboard with drill-down capability
Exportable PDF report (Executive Summary + Full Technical versions)
Scan history storage and trend tracking from first use
Per-site and cross-site comparison (for multiple NEQQO properties)
Marketing-first UX language and "Who fixes this?" tagging

3.2 Out of Scope (V1)

Authenticated / password-protected sites
Real-time performance metrics (Core Web Vitals live data)
Automated fix implementation
CMS integrations (WordPress, Webflow, etc.)
Third-party site auditing (competitor analysis) — V2 candidate
White-label / client-facing version — V2 candidate


4. User Personas
Primary — Marketing Manager / Content Strategist

Non-technical; comfortable with Google Analytics and content tools
Wants to know: "What's hurting us and what can I fix myself today?"
Values: plain language, prioritized action list, business impact framing

Secondary — Web Developer / Engineer

Technical; wants specific URLs, code-level details, and fix instructions
Accesses the same report via a "Developer View" filter
Values: precision, reproducibility, direct technical guidance

Tertiary — Executive / Decision Maker

Sees the PDF export or the Hero Summary only
Wants: one score, one grade, three takeaways, one chart
Values: speed, confidence, business relevance


5. Analysis Dimensions
Each page and the site as a whole is scored 0–100 per dimension. Site-wide score is a weighted average.
#DimensionWeightPlain-Language Label1SEO20%"Search Engine Visibility"2Content Quality20%"Message Strength"3Grammar & Writing15%"Writing Quality"4Aesthetics / Design10%"Visual Clarity"5Technical Health15%"Site Reliability"6Accessibility10%"Inclusivity & Reach"7UX & Conversion5%"Ease of Action"8Brand Consistency5%"Brand Coherence"

6. AI Pipeline Architecture
6.1 Ingestion Layer

Tool: Firecrawl API
Outputs per page: Clean markdown text, raw HTML, screenshot, metadata (title, description, canonical, headers), internal/external links, response code
Crawl budget: Up to 200 pages, prioritized as: Homepage → Key landing pages → Blog/content pages → Utility pages (404, privacy, etc.)
Deduplication: Near-duplicate pages flagged automatically as a finding

6.2 Pass 1 — Rapid Triage

Trigger: Runs on every crawled page immediately as Firecrawl returns it
Model: Claude (structured output mode)
Task: Score each of the 8 dimensions with a severity flag and confidence score
Output per page:

json{
  "page_url": "https://example.com/about",
  "dimensions": {
    "seo": { "score": 62, "severity": "needs_attention", "confidence": 0.91 },
    "content_quality": { "score": 81, "severity": "good", "confidence": 0.88 },
    ...
  }
}

Gate for Pass 2: Any dimension scoring below 70 or flagged critical / needs_attention

6.3 Pass 2 — Deep Dive Analysis

Trigger: Runs only on pages/dimensions that failed the Pass 1 gate
Model: Claude (extended context, tool use enabled)
Task: For each flagged dimension on a flagged page, generate:

Root cause explanation (plain English)
Specific finding with affected element / line / URL
Business impact statement ("This is likely costing you search ranking on this page")
Recommended fix with step-by-step instructions
Effort estimate: Quick Win (< 1 hour) / Moderate (half day) / Complex (developer needed)
"Who fixes this?" tag: content_team / developer / quick_self_fix



6.4 Synthesis Layer

Trigger: Runs once all Pass 2 analyses are complete
Task: Aggregate all findings into:

Site-wide scores per dimension (weighted average)
Overall health score and letter grade (A–F)
AI-written executive narrative (3–5 sentences, consultant tone)
Top 3 critical issues (highest impact × lowest effort)
Fix Priority Matrix data (impact vs. effort coordinates for every finding)




7. Dashboard — UI/UX Specification
7.1 Layout Zones
Zone 1 — Hero Summary (Top of page, always visible)

Overall health score (large, prominent — e.g. 74/100)
Letter grade badge (color-coded: A=green, B=blue, C=yellow, D/F=red)
Site URL + scan date + pages crawled count
AI executive summary paragraph
Top 3 critical issues (pill badges, clickable to jump to finding)
"vs. Last Scan" delta (e.g. ▲ +6 points since Feb 2026)

Zone 2 — Category Scorecard Grid (8 tiles)

One tile per dimension
Shows: dimension name (plain-language label), score, severity color, delta vs. last scan
Sparkline chart showing score trend across last 5 scans
Click to filter Zone 3 to that dimension only

Zone 3 — Issue Backlog Table

Every finding from Pass 2, displayed as rows
Columns: Severity | Dimension | Finding Summary | Affected Page | Effort | Who Fixes It | Status
Default sort: Severity DESC, then Effort ASC (critical quick wins first)
Filters: By dimension, by effort level, by assignee type (content vs. dev)
"Mark as Fixed" toggle per row (persisted to scan history)
Click any row to open Zone 4

Zone 4 — Finding Detail Drawer (slide-in panel)

Full finding detail: what's wrong, why it matters, exact fix steps
Affected URL with link
Effort badge + Who Fixes It tag
AI confidence score (shown subtly — builds trust with technical users)
Related findings (other issues on the same page)

Zone 5 — Scan History & Trends (separate tab)

Timeline of all scans for this site
Line chart: overall score over time
Per-dimension trend lines (toggleable)
Scan comparison: select any two scans to diff findings

Zone 6 — Site Comparison View (separate tab, multi-property)

Side-by-side scorecard for all registered NEQQO web properties
Highlights lowest-scoring site and biggest regression since last scan

7.2 UX Principles

Default view shows Content Team actionable items only — developer items are hidden behind a toggle
All finding language uses business impact framing, never raw technical jargon
Loading state shows live crawl progress: pages discovered → pages crawled → analysis running → report ready
Color system: 🔴 Critical (< 50) · 🟡 Needs Attention (50–69) · 🟢 Good (70–89) · ✅ Excellent (90+)


8. PDF Export Specification
8.1 Executive Summary Version (1–2 pages)

Cover: Site URL, scan date, overall score + grade, AI narrative
Page 2: Category scorecard grid + Fix Priority Matrix (2×2 impact/effort chart)
Audience: C-suite, stakeholders

8.2 Full Technical Report (variable length)

Cover page
Executive summary (same as above)
Category-by-category breakdown with scores and top findings per category
Full issue list grouped by dimension, each with root cause, fix steps, effort, and owner
Appendix: Page-by-page score breakdown
Audience: Marketing team, developers, project managers

8.3 Export Controls

Toggle between Executive and Full versions at export time
Branded with NEQQO logo and color palette
Filename format: [site-domain]-audit-[YYYY-MM-DD].pdf


9. Tech Stack
LayerTechnologyRationaleCrawlerFirecrawl APIHandles JS-rendered sites, returns clean markdown + screenshotsAI EngineClaude API (claude-sonnet)Structured outputs, tool use, cost-efficient at scaleBackendNode.js + job queue (BullMQ / Redis)Async crawl + analysis pipeline with progress trackingDatabasePostgreSQLScan history, trend data, findings storageFrontendReact + Tailwind CSSDashboard UIPDF GenerationPuppeteer or React-PDFStyled PDF export from structured report dataHostingTBD (internal infra or cloud)—

10. Data Model (Key Entities)
Site
  id, domain, name, created_at

Scan
  id, site_id, triggered_by, started_at, completed_at, pages_crawled, status

PageResult
  id, scan_id, url, pass1_scores (JSON), pass2_findings (JSON), screenshot_url

DimensionScore
  id, scan_id, page_result_id, dimension, score, severity, confidence

Finding
  id, scan_id, page_result_id, dimension, title, description, impact_statement,
  fix_steps, effort_level, owner_tag, status (open/fixed), created_at

SiteSummary
  id, scan_id, overall_score, grade, ai_narrative, top_findings (JSON),
  dimension_scores (JSON)

11. Milestones & Build Phases
PhaseScopeTargetPhase 1 — FoundationFirecrawl integration, Pass 1 pipeline, basic dashboard skeletonWeek 1–2Phase 2 — IntelligencePass 2 deep dive, synthesis layer, full findings data modelWeek 2–3Phase 3 — DashboardFull UI (Zones 1–4), live progress state, finding detail drawerWeek 3–4Phase 4 — History & PDFTrend tracking, scan history tab, PDF export (both versions)Week 4–5Phase 5 — PolishMulti-site comparison, marketing-first language pass, exec demo prepWeek 5–6

12. Open Questions / Decisions Needed
#QuestionOwnerPriority1Which NEQQO sites are in scope for the demo run?ProductHigh2Who owns the Firecrawl API account / budget?EngineeringHigh3Where does this get hosted — internal infra or cloud?EngineeringMedium4What brand guidelines should be injected into the AI prompt?MarketingMedium5What's the crawl re-run schedule post-launch? (monthly? weekly?)MarketingLow6Should findings support manual annotations / comments?ProductLow

Document version: 0.1 — Pre-build draft
Last updated: March 2026