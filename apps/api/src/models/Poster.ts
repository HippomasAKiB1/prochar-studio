import mongoose, { Document, Model, Schema, Types } from "mongoose";

// Photo URL entry
export interface IPhotoUrl {
  url: string;
  publicId: string;
}

// Form data stored on poster
export interface IPosterFormData {
  name: string;
  designation: string;
  partyOrOrganization: string;
  union?: string;
  thana?: string;
  district: string;
  occasionType: string;
  headline: string;
  subtext?: string;
  creditLine?: string;
}

// Export record
export interface IPosterExport {
  url: string;
  width: number;
  height: number;
  bytes: number;
}

// Moderation sub-document
export interface IPosterModeration {
  status: "clear" | "flagged" | "blocked";
  flags: string[];
}

// Error sub-document
export interface IPosterError {
  code: string;
  message: string;
}

export type PosterStatus = "draft" | "generating" | "completed" | "failed";
export type PosterStage = "queued" | "analyzing" | "rendering" | "uploading" | "done";

export interface IPoster {
  userId: Types.ObjectId;
  templateId: Types.ObjectId;
  formData: IPosterFormData;
  uploadedPhotoUrls: IPhotoUrl[];
  generatedImageUrl?: string;
  generatedPublicId?: string;
  status: PosterStatus;
  stage: PosterStage;
  layoutPlan?: Record<string, unknown>;
  aiAssisted: boolean;
  retryCount: number;
  maxRetries: number;
  error?: IPosterError | null;
  moderation: IPosterModeration;
  consentAcceptedAt: Date;
  exports: {
    png?: IPosterExport;
  };
  variationSeed: number;
  createdAt: Date;
  updatedAt: Date;
}

export type IPosterDocument = IPoster & Document;

const PhotoUrlSchema = new Schema<IPhotoUrl>(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
  },
  { _id: false }
);

const PosterFormDataSchema = new Schema<IPosterFormData>(
  {
    name: { type: String, required: true },
    designation: { type: String, required: true },
    partyOrOrganization: { type: String, required: true },
    union: { type: String },
    thana: { type: String },
    district: { type: String, required: true },
    occasionType: { type: String, required: true },
    headline: { type: String, required: true },
    subtext: { type: String },
    creditLine: { type: String },
  },
  { _id: false }
);

const ExportEntrySchema = new Schema<IPosterExport>(
  {
    url: { type: String, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    bytes: { type: Number, required: true },
  },
  { _id: false }
);

const PosterSchema = new Schema<IPosterDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    templateId: {
      type: Schema.Types.ObjectId,
      ref: "Template",
      required: true,
    },
    formData: {
      type: PosterFormDataSchema,
      required: true,
    },
    uploadedPhotoUrls: {
      type: [PhotoUrlSchema],
      default: [],
    },
    generatedImageUrl: { type: String },
    generatedPublicId: { type: String },
    status: {
      type: String,
      enum: ["draft", "generating", "completed", "failed"],
      default: "draft",
    },
    stage: {
      type: String,
      enum: ["queued", "analyzing", "rendering", "uploading", "done"],
      default: "queued",
    },
    layoutPlan: { type: Schema.Types.Mixed },
    aiAssisted: { type: Boolean, default: false },
    retryCount: { type: Number, default: 0 },
    maxRetries: { type: Number, default: 3 },
    error: {
      type: new Schema(
        {
          code: { type: String, required: true },
          message: { type: String, required: true },
        },
        { _id: false }
      ),
      default: null,
    },
    moderation: {
      type: new Schema(
        {
          status: {
            type: String,
            enum: ["clear", "flagged", "blocked"],
            default: "clear",
          },
          flags: { type: [String], default: [] },
        },
        { _id: false }
      ),
      default: () => ({ status: "clear", flags: [] }),
    },
    consentAcceptedAt: { type: Date, required: true },
    exports: {
      type: new Schema(
        {
          png: { type: ExportEntrySchema },
        },
        { _id: false }
      ),
      default: () => ({}),
    },
    variationSeed: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    strict: true,
  }
);

// Indexes per PRD §9.6
PosterSchema.index({ userId: 1, createdAt: -1 });
PosterSchema.index({ status: 1, updatedAt: 1 });

export const Poster: Model<IPosterDocument> =
  (mongoose.models.Poster as Model<IPosterDocument>) ||
  mongoose.model<IPosterDocument>("Poster", PosterSchema);
