"use server";

import { Job, JobModel } from "@/models/Job";
import mongoose from "mongoose";
import { revalidatePath } from "next/cache";
import {
  AutoPaginatable,
  OrganizationMembership,
  User,
  WorkOS,
} from "@workos-inc/node";
import { getUser } from "@workos-inc/authkit-nextjs";

export async function saveJobAction(formData: FormData) {
  const { user } = await getUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  await mongoose.connect(process.env.MONGO_URI as string);
  const { id, ...jobData } = Object.fromEntries(formData);

  const workos = new WorkOS(process.env.WORKOS_API_KEY as string);

  let targetOrgId: string;
  if (id) {
    const existing = await JobModel.findById(id);
    if (!existing) {
      throw new Error("Not found");
    }
    targetOrgId = existing.orgId;
    delete (jobData as { orgId?: string }).orgId;
  } else {
    targetOrgId = jobData.orgId as string;
    if (!targetOrgId) {
      throw new Error("Missing orgId");
    }
  }

  const oms = await workos.userManagement.listOrganizationMemberships({
    userId: user.id,
    organizationId: targetOrgId,
  });
  if (oms.data.length === 0) {
    throw new Error("Forbidden");
  }

  const jobDoc = id
    ? await JobModel.findByIdAndUpdate(id, jobData)
    : await JobModel.create(jobData);

  revalidatePath("/jobs/" + targetOrgId);
  return JSON.parse(JSON.stringify(jobDoc));
}

// export async function getJobs(orgId: string | null) {
//   await mongoose.connect(process.env.MONGO_URI as string);
//   let jobsDoc = []
//   if (orgId === null) {
//     jobsDoc =  await JobModel.find();
//   } else {
//     jobsDoc = await JobModel.find({ orgId: orgId });
//   }
//   return JSON.parse(JSON.stringify(jobsDoc));
// }

export async function addOrgAndUserData(jobsDocs: Job[], user: User | null) {
  jobsDocs = JSON.parse(JSON.stringify(jobsDocs))
  const workos = new WorkOS(process.env.WORKOS_API_KEY as string);
  await mongoose.connect(process.env.MONGO_URI as string);
  let oms: AutoPaginatable<OrganizationMembership> | null = null;
  if (user) {
    oms = await workos.userManagement.listOrganizationMemberships({
      userId: user.id,
    });
  }
  for (const job of jobsDocs) {
    const org = await workos.organizations.getOrganization(job.orgId);
    job.orgName = org.name;
    if (oms && oms.data.length > 0) {
      job.isAdmin = !!oms.data.find(om => om.organizationId === job.orgId)
    }
  }
  return jobsDocs;
}
