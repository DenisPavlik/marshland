import { NextRequest } from "next/server";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import uniqid from "uniqid";
import { getUser } from "@workos-inc/authkit-nextjs";

const ALLOWED_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const { user } = await getUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await req.formData();
  const file = data.get("file") as File | null;
  if (!file) {
    return Response.json({ error: "No file provided" }, { status: 400 });
  }
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return Response.json(
      { error: "Unsupported file type. Allowed: PNG, JPEG, WEBP." },
      { status: 400 }
    );
  }
  if (file.size > MAX_FILE_SIZE) {
    return Response.json(
      { error: "File too large. Max 5 MB." },
      { status: 400 }
    );
  }

  const s3Client = new S3Client({
    region: "us-east-1",
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY as string,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY as string,
    },
  });

  const newFileName = `${uniqid()}-${file.name}`;

  const chunks = [];
  //@ts-ignore
  for await (const chunk of file.stream()) {
    chunks.push(chunk);
  }
  const buffer = Buffer.concat(chunks);

  const bucketName = "denys-job-board";
  await s3Client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: newFileName,
      ACL: "public-read",
      Body: buffer,
      ContentType: file.type,
    })
  );

  return Response.json({
    newFileName,
    url: `https://${bucketName}.s3.amazonaws.com/${newFileName}`,
  });
}
