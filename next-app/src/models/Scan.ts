import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type ScanStatus = "pending" | "running" | "complete" | "failed";
export type Pass2Status = "pending" | "running" | "complete" | "skipped";

export interface ProgressEntry {
  url: string;
  overallScore: number;
  seo: number;
  content: number;
  grammar: number;
  technical: number;
  severity: "good" | "needs_attention" | "critical";
  completedAt: Date;
}

export interface IScan extends Document {
  siteId: Types.ObjectId;
  triggeredBy: string;
  startedAt?: Date;
  completedAt?: Date;
  pagesCrawled: number;
  status: ScanStatus;
  currentStage: string;
  progressLog: ProgressEntry[];
  pass2Status: Pass2Status;
  pass2StartedAt?: Date;
  pass2CompletedAt?: Date;
  compareUrl?: string;
  comparisonScanId?: Types.ObjectId;
  createdAt: Date;
}

const ProgressEntrySchema = new Schema(
  {
    url: String,
    overallScore: Number,
    seo: Number,
    content: Number,
    grammar: Number,
    technical: Number,
    severity: String,
    completedAt: Date,
  },
  { _id: false }
);

const ScanSchema = new Schema<IScan>(
  {
    siteId: { type: Schema.Types.ObjectId, ref: "Site", required: true },
    triggeredBy: { type: String, required: true },
    startedAt: { type: Date },
    completedAt: { type: Date },
    pagesCrawled: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["pending", "running", "complete", "failed"],
      default: "pending",
    },
    currentStage: { type: String, default: "queued" },
    progressLog: { type: [ProgressEntrySchema], default: [] },
    pass2Status: {
      type: String,
      enum: ["pending", "running", "complete", "skipped"],
      default: "pending",
    },
    pass2StartedAt: { type: Date },
    pass2CompletedAt: { type: Date },
    compareUrl: { type: String },
    comparisonScanId: { type: Schema.Types.ObjectId, ref: "Scan" },
  },
  { timestamps: true }
);

const Scan: Model<IScan> =
  mongoose.models.Scan ?? mongoose.model<IScan>("Scan", ScanSchema);

export default Scan;
