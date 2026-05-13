import mongoose, { Schema, Document, Model } from "mongoose";

export type IntegrationType = "linear" | "jira";

export interface LinearCredentials {
  apiKey: string;
  teamId: string;
  teamName: string;
}

export interface JiraCredentials {
  email: string;
  apiToken: string;
  domain: string; // e.g. "mycompany.atlassian.net"
  projectKey: string;
  projectName: string;
}

export interface IIntegration extends Document {
  type: IntegrationType;
  enabled: boolean;
  credentials: LinearCredentials | JiraCredentials;
  connectedAt: Date;
  updatedAt: Date;
}

const IntegrationSchema = new Schema<IIntegration>(
  {
    type: { type: String, enum: ["linear", "jira"], required: true, unique: true },
    enabled: { type: Boolean, default: true },
    credentials: { type: Schema.Types.Mixed, required: true },
    connectedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const Integration: Model<IIntegration> =
  mongoose.models.Integration ??
  mongoose.model<IIntegration>("Integration", IntegrationSchema);

export default Integration;
