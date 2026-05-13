import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ApplicationModel } from "@/models/Application";
import { JobModel } from "@/models/Job";
import { getUser } from "@workos-inc/authkit-nextjs";
import { WorkOS } from "@workos-inc/node";
import mongoose from "mongoose";
import { NextRequest } from "next/server";

const BUCKET = "denys-job-board";
const BUCKET_URL_PREFIX = `https://${BUCKET}.s3.amazonaws.com/`;

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user } = await getUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!mongoose.isValidObjectId(params.id)) {
    return Response.json({ error: "Invalid id" }, { status: 400 });
  }

  await mongoose.connect(process.env.MONGO_URI as string);
  const app = await ApplicationModel.findById(params.id);
  if (!app) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const job = await JobModel.findById(app.jobId);
  if (!job) {
    return Response.json({ error: "Job not found" }, { status: 404 });
  }

  const workos = new WorkOS(process.env.WORKOS_API_KEY as string);
  const oms = await workos.userManagement.listOrganizationMemberships({
    userId: user.id,
    organizationId: job.orgId,
  });
  if (oms.data.length === 0) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!app.resumeUrl?.startsWith(BUCKET_URL_PREFIX)) {
    return Response.json(
      { error: "Resume URL is not in the expected bucket" },
      { status: 500 }
    );
  }
  const key = app.resumeUrl.slice(BUCKET_URL_PREFIX.length);

  const s3Client = new S3Client({
    region: "us-east-1",
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY as string,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY as string,
    },
  });

  const signedUrl = await getSignedUrl(
    s3Client,
    new GetObjectCommand({ Bucket: BUCKET, Key: key }),
    { expiresIn: 3600 }
  );

  return Response.redirect(signedUrl, 302);
}
