import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Link,
} from "@react-pdf/renderer";
import type { ISiteSummary } from "@/models/SiteSummary";
import type { IFinding } from "@/models/Finding";

const DIMENSION_LABELS: Record<string, string> = {
  seo: "Search Engine Visibility",
  content_quality: "Message Strength",
  grammar: "Writing Quality",
  aesthetics: "Visual Clarity",
  technical_health: "Site Reliability",
  accessibility: "Inclusivity & Reach",
  ux_conversion: "Ease of Action",
  brand_consistency: "Brand Coherence",
};

const DIMENSION_ORDER = [
  "seo", "content_quality", "grammar", "technical_health",
  "aesthetics", "accessibility", "ux_conversion", "brand_consistency",
];

const EFFORT_LABELS: Record<string, string> = {
  quick_win: "Quick Win",
  moderate: "Moderate",
  complex: "Complex",
};

const OWNER_LABELS: Record<string, string> = {
  content_team: "Content Team",
  developer: "Developer",
  quick_self_fix: "Self-fix",
};

const c = {
  black: "#0a0a0a",
  white: "#ffffff",
  gray100: "#f3f4f6",
  gray300: "#d1d5db",
  gray500: "#6b7280",
  gray700: "#374151",
  blue: "#2563eb",
  green: "#16a34a",
  yellow: "#ca8a04",
  red: "#dc2626",
};

function gradeColor(grade: string) {
  if (grade === "A") return c.green;
  if (grade === "B") return c.blue;
  if (grade === "C") return c.yellow;
  return c.red;
}

function scoreColor(score: number) {
  if (score >= 90) return c.green;
  if (score >= 70) return c.blue;
  if (score >= 50) return c.yellow;
  return c.red;
}

const s = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 10, color: c.black, padding: 48, backgroundColor: c.white },
  // Cover
  coverPage: { fontFamily: "Helvetica", fontSize: 10, color: c.white, padding: 56, backgroundColor: "#111827" },
  coverLabel: { fontSize: 10, color: "#9ca3af", marginBottom: 4, letterSpacing: 1.5 },
  coverTitle: { fontSize: 36, fontFamily: "Helvetica-Bold", color: c.white, marginBottom: 8 },
  coverDomain: { fontSize: 16, color: "#60a5fa", marginBottom: 40 },
  coverScoreRow: { flexDirection: "row", alignItems: "flex-end", gap: 16, marginBottom: 32 },
  coverScore: { fontSize: 72, fontFamily: "Helvetica-Bold" },
  coverGrade: { fontSize: 32, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  coverMeta: { fontSize: 10, color: "#9ca3af", marginTop: 4 },
  coverNarrative: { fontSize: 12, color: "#d1d5db", lineHeight: 1.6, marginBottom: 40 },
  // Sections
  sectionTitle: { fontSize: 14, fontFamily: "Helvetica-Bold", marginBottom: 12, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: c.gray300 },
  section: { marginBottom: 28 },
  // Scorecard
  scorecardGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  scorecardTile: { width: "23%", border: 1, borderColor: c.gray300, borderRadius: 4, padding: 8 },
  scorecardLabel: { fontSize: 8, color: c.gray500, marginBottom: 4 },
  scorecardScore: { fontSize: 18, fontFamily: "Helvetica-Bold" },
  scorecardSeverity: { fontSize: 7, marginTop: 2 },
  // Findings
  findingCard: { border: 1, borderColor: c.gray300, borderRadius: 4, padding: 10, marginBottom: 8 },
  findingTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  findingMeta: { flexDirection: "row", gap: 8, marginBottom: 6 },
  findingBadge: { fontSize: 8, color: c.gray500 },
  findingLabel: { fontSize: 9, color: c.gray700, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  findingText: { fontSize: 9, color: c.gray700, lineHeight: 1.5 },
  // Footer
  footer: { position: "absolute", bottom: 32, left: 48, right: 48, flexDirection: "row", justifyContent: "space-between" },
  footerText: { fontSize: 8, color: c.gray500 },
  pageNumber: { fontSize: 8, color: c.gray500 },
});

type ReportData = {
  siteUrl: string;
  scanDate: string;
  pagesCrawled: number;
  summary: ISiteSummary & { _id: string };
  findings: (IFinding & { _id: string })[];
  version: "executive" | "full";
};

function Footer({ siteUrl }: { siteUrl: string }) {
  return (
    <View style={s.footer} fixed>
      <Text style={s.footerText}>GosCheck · {siteUrl}</Text>
      <Text style={s.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
  );
}

function CoverPage({ data }: { data: ReportData }) {
  const { summary, siteUrl, scanDate, pagesCrawled } = data;
  const grade = summary.grade;

  return (
    <Page size="A4" style={s.coverPage}>
      <Text style={s.coverLabel}>WEBSITE INTELLIGENCE REPORT</Text>
      <Text style={s.coverTitle}>GosCheck Audit</Text>
      <Text style={s.coverDomain}>{siteUrl}</Text>

      <View style={s.coverScoreRow}>
        <Text style={[s.coverScore, { color: scoreColor(summary.overallScore) }]}>
          {summary.overallScore}
        </Text>
        <View>
          <Text style={[s.coverGrade, { color: gradeColor(grade) }]}>{grade}</Text>
          <Text style={{ fontSize: 11, color: "#9ca3af" }}>out of 100</Text>
        </View>
      </View>

      <Text style={s.coverNarrative}>{summary.aiNarrative}</Text>

      <Text style={s.coverMeta}>
        {scanDate} · {pagesCrawled} pages crawled ·{" "}
        {data.version === "executive" ? "Executive Summary" : "Full Technical Report"}
      </Text>
    </Page>
  );
}

function ScorecardPage({ summary }: { summary: ISiteSummary & { _id: string } }) {
  const dimScores = summary.dimensionScores as Record<string, { score: number; weight: number }>;

  return (
    <Page size="A4" style={s.page}>
      <View style={s.section}>
        <Text style={s.sectionTitle}>Category Scores</Text>
        <View style={s.scorecardGrid}>
          {DIMENSION_ORDER.map((dim) => {
            const entry = dimScores[dim];
            if (!entry) return null;
            return (
              <View key={dim} style={s.scorecardTile}>
                <Text style={s.scorecardLabel}>{DIMENSION_LABELS[dim] ?? dim}</Text>
                <Text style={[s.scorecardScore, { color: scoreColor(entry.score) }]}>{entry.score}</Text>
                <Text style={[s.scorecardSeverity, { color: scoreColor(entry.score) }]}>
                  {entry.score >= 90 ? "Excellent" : entry.score >= 70 ? "Good" : entry.score >= 50 ? "Needs Attention" : "Critical"}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
      <Footer siteUrl="" />
    </Page>
  );
}

function FindingsPage({ findings, siteUrl }: { findings: (IFinding & { _id: string })[]; siteUrl: string }) {
  // Group by dimension
  const byDimension: Record<string, typeof findings> = {};
  for (const f of findings) {
    if (!byDimension[f.dimension]) byDimension[f.dimension] = [];
    byDimension[f.dimension].push(f);
  }

  return (
    <Page size="A4" style={s.page}>
      <View style={s.section}>
        <Text style={s.sectionTitle}>All Findings ({findings.length})</Text>

        {DIMENSION_ORDER.filter((d) => byDimension[d]?.length > 0).map((dim) => (
          <View key={dim} style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 11, fontFamily: "Helvetica-Bold", color: c.gray700, marginBottom: 6 }}>
              {DIMENSION_LABELS[dim] ?? dim}
            </Text>
            {byDimension[dim].map((f) => (
              <View key={f._id} style={s.findingCard}>
                <Text style={s.findingTitle}>{f.title}</Text>
                <View style={s.findingMeta}>
                  <Text style={s.findingBadge}>{EFFORT_LABELS[f.effortLevel] ?? f.effortLevel}</Text>
                  <Text style={s.findingBadge}>·</Text>
                  <Text style={s.findingBadge}>{OWNER_LABELS[f.ownerTag] ?? f.ownerTag}</Text>
                </View>

                <Text style={s.findingLabel}>Business Impact</Text>
                <Text style={[s.findingText, { marginBottom: 6 }]}>{f.impactStatement}</Text>

                <Text style={s.findingLabel}>What{"'"}s Wrong</Text>
                <Text style={[s.findingText, { marginBottom: 6 }]}>{f.description}</Text>

                <Text style={s.findingLabel}>How to Fix</Text>
                <Text style={s.findingText}>{f.fixSteps}</Text>
              </View>
            ))}
          </View>
        ))}
      </View>
      <Footer siteUrl={siteUrl} />
    </Page>
  );
}

export function AuditReport({ data }: { data: ReportData }) {
  const openFindings = data.findings.filter((f) => f.status === "open");
  const topFindings = openFindings.slice(0, 3);

  return (
    <Document>
      {/* Cover */}
      <CoverPage data={data} />

      {/* Executive: scorecard + top 3 findings only */}
      <ScorecardPage summary={data.summary} />

      {data.version === "executive" ? (
        topFindings.length > 0 && (
          <Page size="A4" style={s.page}>
            <View style={s.section}>
              <Text style={s.sectionTitle}>Top Priority Issues</Text>
              {topFindings.map((f) => (
                <View key={f._id} style={s.findingCard}>
                  <Text style={s.findingTitle}>{f.title}</Text>
                  <View style={s.findingMeta}>
                    <Text style={s.findingBadge}>{EFFORT_LABELS[f.effortLevel] ?? f.effortLevel}</Text>
                    <Text style={s.findingBadge}>·</Text>
                    <Text style={s.findingBadge}>{OWNER_LABELS[f.ownerTag] ?? f.ownerTag}</Text>
                  </View>
                  <Text style={s.findingLabel}>Business Impact</Text>
                  <Text style={[s.findingText, { marginBottom: 6 }]}>{f.impactStatement}</Text>
                  <Text style={s.findingLabel}>How to Fix</Text>
                  <Text style={s.findingText}>{f.fixSteps}</Text>
                </View>
              ))}
            </View>
            <Footer siteUrl={data.siteUrl} />
          </Page>
        )
      ) : (
        openFindings.length > 0 && (
          <FindingsPage findings={openFindings} siteUrl={data.siteUrl} />
        )
      )}
    </Document>
  );
}
