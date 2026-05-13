import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { getUser } from "@workos-inc/authkit-nextjs";
import { NextRequest } from "next/server";
import { startTestDb, stopTestDb, clearCollections } from "../../../../../../../tests/helpers/mongo";

const listOrganizationMemberships = vi.fn();
const getSignedUrl = vi.fn();

vi.mock("@workos-inc/node", () => ({
  WorkOS: class {
    userManagement = { listOrganizationMemberships };
    organizations = {};
  },
}));

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: (...args: unknown[]) => getSignedUrl(...args),
}));

vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: class {},
  GetObjectCommand: class {
    input: unknown;
    constructor(input: unknown) {
      this.input = input;
    }
  },
}));

import { GET } from "@/app/api/applications/[id]/resume/route";
import { JobModel } from "@/models/Job";
import { ApplicationModel } from "@/models/Application";

const mockedGetUser = getUser as unknown as ReturnType<typeof vi.fn>;

const VALID_JOB: Record<string, any> = {
  title: "Engineer",
  description: "Build things",
  remote: "remote",
  type: "full-time",
  salary: 100000,
  country: "USA",
  state: "CA",
  city: "SF",
  countryId: "1",
  stateId: "2",
  cityId: "3",
  orgId: "org_xyz",
  contactName: "Recruiter",
  contactPhone: "555-0001",
  contactEmail: "rec@example.com",
};

function appDoc(overrides: Record<string, any> = {}) {
  return {
    jobId: "507f1f77bcf86cd799439099",
    fullName: "Alice Applicant",
    email: "alice@example.com",
    phone: "555-1111",
    resumeUrl: "https://denys-job-board.s3.amazonaws.com/resumes/abc.pdf",
    linkedinUrl: "https://linkedin.com/in/alice",
    whyJoin: "I love it",
    workAuthorization: "yes",
    yearsOfExperience: "3-5",
    gender: "female",
    veteranStatus: "no",
    disabilityStatus: "decline",
    ...overrides,
  };
}

function makeReq(id: string): NextRequest {
  return new NextRequest(`http://localhost/api/applications/${id}/resume`);
}

describe("GET /api/applications/[id]/resume", () => {
  beforeAll(async () => {
    await startTestDb();
  });

  afterAll(async () => {
    await stopTestDb();
  });

  beforeEach(async () => {
    await clearCollections();
    vi.clearAllMocks();
    listOrganizationMemberships.mockResolvedValue({ data: [] });
    getSignedUrl.mockResolvedValue("https://signed.example.com/url");
  });

  it("returns 401 for anonymous user", async () => {
    mockedGetUser.mockResolvedValue({ user: null });
    const res = await GET(makeReq("507f1f77bcf86cd799439011"), {
      params: { id: "507f1f77bcf86cd799439011" },
    });
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
    expect(getSignedUrl).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid ObjectId", async () => {
    mockedGetUser.mockResolvedValue({ user: { id: "user_1" } });
    const res = await GET(makeReq("not-an-id"), { params: { id: "not-an-id" } });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid id" });
  });

  it("returns 404 when application is missing", async () => {
    mockedGetUser.mockResolvedValue({ user: { id: "user_1" } });
    const missingId = "507f1f77bcf86cd799439011";
    const res = await GET(makeReq(missingId), { params: { id: missingId } });
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Not found" });
  });

  it("returns 404 when job is missing", async () => {
    mockedGetUser.mockResolvedValue({ user: { id: "user_1" } });
    const app = await ApplicationModel.create(appDoc());
    const res = await GET(makeReq(String(app._id)), {
      params: { id: String(app._id) },
    });
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Job not found" });
  });

  it("returns 403 when user is not a member of the job's org", async () => {
    mockedGetUser.mockResolvedValue({ user: { id: "user_outsider" } });
    const job = await JobModel.create(VALID_JOB);
    const app = await ApplicationModel.create(appDoc({ jobId: String(job._id) }));
    listOrganizationMemberships.mockResolvedValue({ data: [] });

    const res = await GET(makeReq(String(app._id)), {
      params: { id: String(app._id) },
    });
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "Forbidden" });

    expect(listOrganizationMemberships).toHaveBeenCalledWith({
      userId: "user_outsider",
      organizationId: VALID_JOB.orgId,
    });
    expect(getSignedUrl).not.toHaveBeenCalled();
  });

  it("returns 500 when resumeUrl is not in the expected bucket", async () => {
    mockedGetUser.mockResolvedValue({ user: { id: "user_admin" } });
    const job = await JobModel.create(VALID_JOB);
    const app = await ApplicationModel.create(
      appDoc({
        jobId: String(job._id),
        resumeUrl: "https://evil.example.com/resumes/abc.pdf",
      })
    );
    listOrganizationMemberships.mockResolvedValue({
      data: [{ userId: "user_admin", organizationId: VALID_JOB.orgId }],
    });

    const res = await GET(makeReq(String(app._id)), {
      params: { id: String(app._id) },
    });
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({
      error: "Resume URL is not in the expected bucket",
    });
    expect(getSignedUrl).not.toHaveBeenCalled();
  });

  it("happy path: redirects (302) to signed URL with correct S3 key", async () => {
    mockedGetUser.mockResolvedValue({ user: { id: "user_admin" } });
    const job = await JobModel.create(VALID_JOB);
    const app = await ApplicationModel.create(
      appDoc({
        jobId: String(job._id),
        resumeUrl: "https://denys-job-board.s3.amazonaws.com/resumes/myresume.pdf",
      })
    );
    listOrganizationMemberships.mockResolvedValue({
      data: [{ userId: "user_admin", organizationId: VALID_JOB.orgId }],
    });
    getSignedUrl.mockResolvedValue("https://signed.example.com/abcd");

    const res = await GET(makeReq(String(app._id)), {
      params: { id: String(app._id) },
    });

    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("https://signed.example.com/abcd");

    expect(getSignedUrl).toHaveBeenCalledTimes(1);
    const [, commandArg, opts] = getSignedUrl.mock.calls[0];
    expect((commandArg as { input: any }).input).toMatchObject({
      Bucket: "denys-job-board",
      Key: "resumes/myresume.pdf",
    });
    expect(opts).toEqual({ expiresIn: 3600 });
  });
});
