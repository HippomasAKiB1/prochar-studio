import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface ITokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface IGenerationLog {
  posterId: Types.ObjectId;
  userId: Types.ObjectId;
  attempt: number;
  promptVersion: string;
  geminiPromptUsed: string;
  tokensUsed?: ITokenUsage;
  latencyMs: number;
  geminiLatencyMs: number;
  renderLatencyMs: number;
  cacheHit: boolean;
  usedFallback: boolean;
  success: boolean;
  errorCode?: string;
  createdAt: Date;
}

export type IGenerationLogDocument = IGenerationLog & Document;

const GenerationLogSchema = new Schema<IGenerationLogDocument>(
  {
    posterId: {
      type: Schema.Types.ObjectId,
      ref: "Poster",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    attempt: { type: Number, required: true, default: 0 },
    promptVersion: { type: String, required: true },
    geminiPromptUsed: { type: String, required: true },
    tokensUsed: {
      type: new Schema(
        {
          promptTokens: { type: Number },
          completionTokens: { type: Number },
          totalTokens: { type: Number },
        },
        { _id: false }
      ),
    },
    latencyMs: { type: Number, required: true },
    geminiLatencyMs: { type: Number, required: true },
    renderLatencyMs: { type: Number, required: true },
    cacheHit: { type: Boolean, required: true },
    usedFallback: { type: Boolean, required: true },
    success: { type: Boolean, required: true },
    errorCode: { type: String },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    strict: true,
  }
);

export const GenerationLog: Model<IGenerationLogDocument> =
  (mongoose.models.GenerationLog as Model<IGenerationLogDocument>) ||
  mongoose.model<IGenerationLogDocument>("GenerationLog", GenerationLogSchema);
