import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type EffortLevel = "quick_win" | "moderate" | "complex";
export type OwnerTag = "content_team" | "developer" | "quick_self_fix";
export type FindingStatus = "open" | "fixed";
export type Dimension =
  | "seo"
  | "content_quality"
  | "grammar"
  | "aesthetics"
  | "technical_health"
  | "accessibility"
  | "ux_conversion"
  | "brand_consistency";

export interface IFinding extends Document {
  scanId: Types.ObjectId;
  pageResultId: Types.ObjectId;
  dimension: Dimension;
  title: string;
  description: string;
  impactStatement: string;
  fixSteps: string;
  effortLevel: EffortLevel;
  ownerTag: OwnerTag;
  status: FindingStatus;
  aiConfidence: number;
  createdAt: Date;
}

const FindingSchema = new Schema<IFinding>(
  {
    scanId: { type: Schema.Types.ObjectId, ref: "Scan", required: true },
    pageResultId: { type: Schema.Types.ObjectId, ref: "PageResult", required: true },
    dimension: {
      type: String,
      enum: [
        "seo", "content_quality", "grammar", "aesthetics",
        "technical_health", "accessibility", "ux_conversion", "brand_consistency",
      ],
      required: true,
    },
    title: { type: String, required: true },
    description: { type: String, required: true },
    impactStatement: { type: String, required: true },
    fixSteps: { type: String, required: true },
    effortLevel: {
      type: String,
      enum: ["quick_win", "moderate", "complex"],
      required: true,
    },
    ownerTag: {
      type: String,
      enum: ["content_team", "developer", "quick_self_fix"],
      required: true,
    },
    status: { type: String, enum: ["open", "fixed"], default: "open" },
    aiConfidence: { type: Number, default: 0 },
  },
  { timestamps: true }
);

FindingSchema.index({ scanId: 1, dimension: 1 });
FindingSchema.index({ scanId: 1, effortLevel: 1 });

const Finding: Model<IFinding> =
  mongoose.models.Finding ?? mongoose.model<IFinding>("Finding", FindingSchema);

export default Finding;
