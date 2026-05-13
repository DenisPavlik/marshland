import { JobModel } from "@/models/Job";
import mongoose from "mongoose";
import { NextRequest } from "next/server";
import { getUser } from "@workos-inc/authkit-nextjs";
import { WorkOS } from "@workos-inc/node";

export async function DELETE(req: NextRequest) {
  const { user } = await getUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id || !mongoose.isValidObjectId(id)) {
    return Response.json({ error: "Invalid id" }, { status: 400 });
  }

  await mongoose.connect(process.env.MONGO_URI as string);
  const jobDoc = await JobModel.findById(id);
  if (!jobDoc) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const workos = new WorkOS(process.env.WORKOS_API_KEY as string);
  const oms = await workos.userManagement.listOrganizationMemberships({
    userId: user.id,
    organizationId: jobDoc.orgId,
  });
  if (oms.data.length === 0) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  await JobModel.findByIdAndDelete(id);
  return Response.json(true);
}
