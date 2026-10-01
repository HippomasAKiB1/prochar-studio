import mongoose, { Document, Model, Schema } from "mongoose";
import {
  TemplateLayoutConfig,
  TemplateLayoutConfigSchema,
  OccasionType,
  OccasionTypeEnum,
} from "@prochar/shared";

export interface ITemplate {
  slug: string;
  title: string;
  titleEn: string;
  occasionType: OccasionType;
  thumbnailUrl: string;
  layoutConfig: TemplateLayoutConfig;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type ITemplateDocument = ITemplate & Document;

const TemplateSchema = new Schema<ITemplateDocument>(
  {
    slug: {
      type: String,
      required: [true, "Slug is required"],
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },
    titleEn: {
      type: String,
      required: [true, "English title is required"],
      trim: true,
    },
    occasionType: {
      type: String,
      required: [true, "Occasion type is required"],
      enum: OccasionTypeEnum.options,
    },
    thumbnailUrl: {
      type: String,
      required: [true, "Thumbnail URL is required"],
      trim: true,
    },
    layoutConfig: {
      type: Schema.Types.Mixed,
      required: [true, "Layout configuration is required"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient filtering of active templates by occasion (PRD §9.2)
TemplateSchema.index({ occasionType: 1, isActive: 1 });

// Validate layoutConfig using Zod on every save / write
TemplateSchema.pre("validate", function () {
  if (this.layoutConfig) {
    const result = TemplateLayoutConfigSchema.safeParse(this.layoutConfig);
    if (!result.success) {
      const issueDetails = result.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ");
      this.invalidate("layoutConfig", `Invalid layoutConfig: ${issueDetails}`);
    }
  }
});

export const Template: Model<ITemplateDocument> =
  (mongoose.models.Template as Model<ITemplateDocument>) ||
  mongoose.model<ITemplateDocument>("Template", TemplateSchema);
