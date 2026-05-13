import { NextRequest } from "next/server";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import uniqid from "uniqid";

const ALLOWED_MIME = ["application/pdf"];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const data = await req.formData();
  const file = data.get("file") as File | null;
  if (!file) {
    return Response.json({ error: "No file provided" }, { status: 400 });
  }
  if (!ALLOWED_MIME.includes(file.type)) {
    return Response.json({ error: "PDF only" }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE) {
    return Response.json(
      { error: "File too large. Max 10 MB." },
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

  const key = `resumes/${uniqid()}-${file.name}`;
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
      Key: key,
      Body: buffer,
      ContentType: file.type,
    })
  );

  return Response.json({
    url: `https://${bucketName}.s3.amazonaws.com/${key}`,
    fileName: file.name,
  });
}
