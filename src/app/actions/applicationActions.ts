"use server";

import { ApplicationModel } from "@/models/Application";
import { JobModel } from "@/models/Job";
import mongoose from "mongoose";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getUser } from "@workos-inc/authkit-nextjs";
import { WorkOS } from "@workos-inc/node";

const YEARS = ["<1", "1-2", "3-5", "5-10", "10+"] as const;
const YES_NO = ["yes", "no"] as const;
const YES_NO_DECLINE = ["yes", "no", "decline"] as const;
const GENDER = ["male", "female", "decline"] as const;

function pick<T extends readonly string[]>(
  raw: FormDataEntryValue | null,
  allowed: T
): T[number] | null {
  if (typeof raw !== "string") return null;
  return (allowed as readonly string[]).includes(raw)
    ? (raw as T[number])
    : null;
}

export async function submitApplication(formData: FormData) {
  await mongoose.connect(process.env.MONGO_URI as string);

  const jobId = formData.get("jobId") as string;
  if (!jobId || !mongoose.isValidObjectId(jobId)) {
    throw new Error("Invalid job");
  }
  const job = await JobModel.findById(jobId);
  if (!job) {
    throw new Error("Job not found");
  }

  const fullName = ((formData.get("fullName") as string) || "").trim();
  const email = ((formData.get("email") as string) || "").trim();
  const phone = ((formData.get("phone") as string) || "").trim();
  const resumeUrl = ((formData.get("resumeUrl") as string) || "").trim();
  const linkedinUrl =
    ((formData.get("linkedinUrl") as string) || "").trim() || undefined;
  const whyJoin = ((formData.get("whyJoin") as string) || "").trim();

  const workAuthorization = pick(formData.get("workAuthorization"), YES_NO);
  const yearsOfExperience = pick(formData.get("yearsOfExperience"), YEARS);
  const gender = pick(formData.get("gender"), GENDER);
  const veteranStatus = pick(formData.get("veteranStatus"), YES_NO_DECLINE);
  const disabilityStatus = pick(formData.get("disabilityStatus"), YES_NO_DECLINE);

  if (!fullName || !email || !phone || !resumeUrl || !whyJoin) {
    throw new Error("Missing required fields");
  }
  if (whyJoin.length > 500) {
    throw new Error("Answer must be 500 characters or fewer");
  }
  if (
    !workAuthorization ||
    !yearsOfExperience ||
    !gender ||
    !veteranStatus ||
    !disabilityStatus
  ) {
    throw new Error("Missing required selections");
  }

  await ApplicationModel.create({
    jobId,
    fullName,
    email,
    phone,
    resumeUrl,
    linkedinUrl,
    workAuthorization,
    whyJoin,
    yearsOfExperience,
    gender,
    veteranStatus,
    disabilityStatus,
  });

  redirect(`/show/${jobId}/apply/success`);
}

export async function markApplicationReviewed(applicationId: string) {
  const { user } = await getUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  if (!mongoose.isValidObjectId(applicationId)) {
    throw new Error("Invalid application id");
  }

  await mongoose.connect(process.env.MONGO_URI as string);
  const app = await ApplicationModel.findById(applicationId);
  if (!app) {
    throw new Error("Application not found");
  }

  const job = await JobModel.findById(app.jobId);
  if (!job) {
    throw new Error("Job not found");
  }

  const workos = new WorkOS(process.env.WORKOS_API_KEY as string);
  const oms = await workos.userManagement.listOrganizationMemberships({
    userId: user.id,
    organizationId: job.orgId,
  });
  if (oms.data.length === 0) {
    throw new Error("Forbidden");
  }

  await ApplicationModel.findByIdAndUpdate(applicationId, {
    status: "reviewed",
  });

  revalidatePath(`/jobs/${job.orgId}/applications/${app.jobId}/${applicationId}`);
  revalidatePath(`/jobs/${job.orgId}/applications/${app.jobId}`);
  revalidatePath(`/jobs/${job.orgId}/applications`);
}
