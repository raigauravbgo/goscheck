import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface PageIssue {
  title: string;
  description: string;
  severity: "critical" | "moderate" | "minor";
  location?: string;
  suggestedFix?: string;
}

export interface IPageIssueResult extends Document {
  scanId: Types.ObjectId;
  url: string;
  dimension: string;
  issues: PageIssue[];
  generatedAt: Date;
}

const PageIssueSchema = new Schema(
  {
    title: String,
    description: String,
    severity: String,
    location: String,
    suggestedFix: String,
  },
  { _id: false }
);

const PageIssueResultSchema = new Schema<IPageIssueResult>(
  {
    scanId: { type: Schema.Types.ObjectId, ref: "Scan", required: true },
    url: { type: String, required: true },
    dimension: { type: String, required: true },
    issues: { type: [PageIssueSchema], default: [] },
    generatedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

PageIssueResultSchema.index({ scanId: 1, url: 1, dimension: 1 }, { unique: true });

const PageIssueResult: Model<IPageIssueResult> =
  mongoose.models.PageIssueResult ??
  mongoose.model<IPageIssueResult>("PageIssueResult", PageIssueResultSchema);

export default PageIssueResult;
