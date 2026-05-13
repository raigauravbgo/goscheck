import mongoose, { Schema, Document, Model, Types } from "mongoose";
import type { IntegrationType } from "./Integration";

export interface ITrackerPush extends Document {
  scanId: Types.ObjectId;
  url: string;
  dimension: string;
  issueTitle: string;
  trackerType: IntegrationType;
  ticketId: string;
  ticketUrl: string;
  pushedAt: Date;
}

const TrackerPushSchema = new Schema<ITrackerPush>(
  {
    scanId: { type: Schema.Types.ObjectId, ref: "Scan", required: true },
    url: { type: String, required: true },
    dimension: { type: String, required: true },
    issueTitle: { type: String, required: true },
    trackerType: { type: String, enum: ["linear", "jira"], required: true },
    ticketId: { type: String, required: true },
    ticketUrl: { type: String, required: true },
    pushedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

TrackerPushSchema.index({ scanId: 1, url: 1, dimension: 1, issueTitle: 1 });

const TrackerPush: Model<ITrackerPush> =
  mongoose.models.TrackerPush ??
  mongoose.model<ITrackerPush>("TrackerPush", TrackerPushSchema);

export default TrackerPush;
