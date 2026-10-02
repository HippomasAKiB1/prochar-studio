import mongoose, { Document, Model, Schema } from "mongoose";

export interface IAiCache {
  key: string;
  value: {
    colors: {
      primary: string;
      secondary: string;
      accent: string;
      textOnPrimary: string;
      textOnLight: string;
    };
    decorations: string[];
    decorationIntensity: "low" | "medium" | "high";
  };
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type IAiCacheDocument = IAiCache & Document;

const AiCacheSchema = new Schema<IAiCacheDocument>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    value: {
      type: Schema.Types.Mixed,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

AiCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const AiCache: Model<IAiCacheDocument> =
  mongoose.models.AiCache ||
  mongoose.model<IAiCacheDocument>("AiCache", AiCacheSchema);
