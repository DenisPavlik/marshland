import { Schema, models, model } from "mongoose";

export type Application = {
  _id: string;
  jobId: string;
  fullName: string;
  email: string;
  phone: string;
  resumeUrl: string;
  linkedinUrl?: string;
  workAuthorization: "yes" | "no";
  whyJoin: string;
  yearsOfExperience: "<1" | "1-2" | "3-5" | "5-10" | "10+";
  gender: "male" | "female" | "decline";
  veteranStatus: "yes" | "no" | "decline";
  disabilityStatus: "yes" | "no" | "decline";
  status: "new" | "reviewed";
  createdAt: string;
  updatedAt: string;
};

const ApplicationSchema = new Schema(
  {
    jobId: { type: String, required: true, index: true },
    fullName: { type: String, required: true, trim: true, maxlength: 200 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 200 },
    phone: { type: String, required: true, trim: true, maxlength: 50 },
    resumeUrl: { type: String, required: true },
    linkedinUrl: { type: String, trim: true, maxlength: 500 },
    workAuthorization: { type: String, required: true, enum: ["yes", "no"] },
    whyJoin: { type: String, required: true, trim: true, maxlength: 500 },
    yearsOfExperience: {
      type: String,
      required: true,
      enum: ["<1", "1-2", "3-5", "5-10", "10+"],
    },
    gender: { type: String, required: true, enum: ["male", "female", "decline"] },
    veteranStatus: { type: String, required: true, enum: ["yes", "no", "decline"] },
    disabilityStatus: { type: String, required: true, enum: ["yes", "no", "decline"] },
    status: {
      type: String,
      required: true,
      enum: ["new", "reviewed"],
      default: "new",
      index: true,
    },
  },
  { timestamps: true }
);

export const ApplicationModel =
  models?.Application || model("Application", ApplicationSchema);
