import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type Severity = "good" | "needs_attention" | "critical";

export interface DimensionScore {
  score: number;
  severity: Severity;
  confidence: number;
}

export interface Pass1Scores {
  seo: DimensionScore;
  content_quality: DimensionScore;
  grammar: DimensionScore;
  aesthetics: DimensionScore;
  technical_health: DimensionScore;
  accessibility: DimensionScore;
  ux_conversion: DimensionScore;
  brand_consistency: DimensionScore;
}

export interface CWVMetrics {
  lcp: number | null;
  inp: number | null;
  cls: number | null;
  fcp: number | null;
  ttfb: number | null;
  performanceScore: number | null;
  strategy: "mobile" | "desktop";
  fetchedAt: Date;
}

export interface CWVData {
  mobile: CWVMetrics;
  desktop: CWVMetrics;
}

export interface IPageResult extends Document {
  scanId: Types.ObjectId;
  url: string;
  pass1Scores?: Pass1Scores;
  cwvData?: CWVData;
  pass2Findings?: Record<string, unknown>;
  screenshotUrl?: string;
  createdAt: Date;
}

const DimensionScoreSchema = new Schema(
  {
    score: { type: Number, required: true },
    severity: { type: String, enum: ["good", "needs_attention", "critical"] },
    confidence: { type: Number },
  },
  { _id: false }
);

const PageResultSchema = new Schema<IPageResult>(
  {
    scanId: { type: Schema.Types.ObjectId, ref: "Scan", required: true },
    url: { type: String, required: true },
    pass1Scores: {
      type: {
        seo: DimensionScoreSchema,
        content_quality: DimensionScoreSchema,
        grammar: DimensionScoreSchema,
        aesthetics: DimensionScoreSchema,
        technical_health: DimensionScoreSchema,
        accessibility: DimensionScoreSchema,
        ux_conversion: DimensionScoreSchema,
        brand_consistency: DimensionScoreSchema,
      },
      default: undefined,
    },
    cwvData: { type: Schema.Types.Mixed },
    pass2Findings: { type: Schema.Types.Mixed },
    screenshotUrl: { type: String },
  },
  { timestamps: true }
);

PageResultSchema.index({ scanId: 1 });

const PageResult: Model<IPageResult> =
  mongoose.models.PageResult ??
  mongoose.model<IPageResult>("PageResult", PageResultSchema);

export default PageResult;
