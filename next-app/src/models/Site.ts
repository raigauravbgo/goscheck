import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISite extends Document {
  domain: string;
  name: string;
  createdAt: Date;
}

const SiteSchema = new Schema<ISite>(
  {
    domain: { type: String, required: true, unique: true },
    name: { type: String, required: true },
  },
  { timestamps: true }
);

const Site: Model<ISite> =
  mongoose.models.Site ?? mongoose.model<ISite>("Site", SiteSchema);

export default Site;
