import mongoose, { Document, Model, Schema } from "mongoose";

export interface IUser {
  name: string;
  email?: string;
  phone?: string;
  passwordHash: string;
  role: "user" | "admin";
  createdAt: Date;
  updatedAt: Date;
}

export type IUserDocument = IUser & Document;

const UserSchema = new Schema<IUserDocument>(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [60, "Name cannot exceed 60 characters"],
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      sparse: true,
      unique: true,
      index: true,
    },
    phone: {
      type: String,
      trim: true,
      sparse: true,
      unique: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: [true, "Password hash is required"],
      select: false,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
  },
  {
    timestamps: true,
  }
);

// Enforce at least one of email or phone is provided
// Also clear empty strings to undefined so sparse unique index works properly
UserSchema.pre("validate", function () {
  if (!this.email || this.email.trim() === "") {
    this.email = undefined;
  }
  if (!this.phone || this.phone.trim() === "") {
    this.phone = undefined;
  }

  if (!this.email && !this.phone) {
    this.invalidate("email", "Either email or phone is required");
    this.invalidate("phone", "Either email or phone is required");
  }
});

export const User: Model<IUserDocument> =
  (mongoose.models.User as Model<IUserDocument>) ||
  mongoose.model<IUserDocument>("User", UserSchema);
