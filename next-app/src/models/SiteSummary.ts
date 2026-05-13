import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type Grade = "A" | "B" | "C" | "D" | "F";

export interface IDimensionAggregate {
  score: number;
  weight: number;
}

export interface ISiteSummary extends Document {
  scanId: Types.ObjectId;
  overallScore: number;
  grade: Grade;
  aiNarrative: string;
  topFindings: Types.ObjectId[];
  dimensionScores: Record<string, IDimensionAggregate>;
  createdAt: Date;
}

const SiteSummarySchema = new Schema<ISiteSummary>(
  {
    scanId: { type: Schema.Types.ObjectId, ref: "Scan", required: true, unique: true },
    overallScore: { type: Number, required: true },
    grade: { type: String, enum: ["A", "B", "C", "D", "F"], required: true },
    aiNarrative: { type: String, required: true },
    topFindings: [{ type: Schema.Types.ObjectId, ref: "Finding" }],
    dimensionScores: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

const SiteSummary: Model<ISiteSummary> =
  mongoose.models.SiteSummary ??
  mongoose.model<ISiteSummary>("SiteSummary", SiteSummarySchema);

export default SiteSummary;
