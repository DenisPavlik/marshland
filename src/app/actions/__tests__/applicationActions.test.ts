import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getUser } from "@workos-inc/authkit-nextjs";
import { startTestDb, stopTestDb, clearCollections } from "../../../../tests/helpers/mongo";

const listOrganizationMemberships = vi.fn();

vi.mock("@workos-inc/node", () => ({
  WorkOS: class {
    userManagement = { listOrganizationMemberships };
    organizations = {};
  },
}));

import {
  submitApplication,
  markApplicationReviewed,
} from "@/app/actions/applicationActions";
import { JobModel } from "@/models/Job";
import { ApplicationModel } from "@/models/Application";

const mockedGetUser = getUser as unknown as ReturnType<typeof vi.fn>;
const mockedRedirect = redirect as unknown as ReturnType<typeof vi.fn>;
const mockedRevalidatePath = revalidatePath as unknown as ReturnType<typeof vi.fn>;

function makeFormData(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

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

function validApplicationFields(jobId: string): Record<string, string> {
  return {
    jobId,
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
  };
}

describe("submitApplication", () => {
  beforeAll(async () => {
    await startTestDb();
  });

  afterAll(async () => {
    await stopTestDb();
  });

  beforeEach(async () => {
    await clearCollections();
    vi.clearAllMocks();
  });

  it("rejects invalid ObjectId for jobId", async () => {
    await expect(
      submitApplication(makeFormData({ ...validApplicationFields("not-an-id") }))
    ).rejects.toThrow("Invalid job");
  });

  it("rejects when jobId is missing", async () => {
    const fields = validApplicationFields("507f1f77bcf86cd799439011");
    delete (fields as any).jobId;
    await expect(submitApplication(makeFormData(fields))).rejects.toThrow(
      "Invalid job"
    );
  });

  it("rejects when job does not exist", async () => {
    const missingId = "507f1f77bcf86cd799439011";
    await expect(
      submitApplication(makeFormData(validApplicationFields(missingId)))
    ).rejects.toThrow("Job not found");
  });

  it("rejects missing required text fields", async () => {
    const job = await JobModel.create(VALID_JOB);
    const fields = validApplicationFields(String(job._id));
    fields.fullName = "";
    await expect(submitApplication(makeFormData(fields))).rejects.toThrow(
      "Missing required fields"
    );
  });

  it("rejects whyJoin longer than 500 characters", async () => {
    const job = await JobModel.create(VALID_JOB);
    const fields = validApplicationFields(String(job._id));
    fields.whyJoin = "a".repeat(501);
    await expect(submitApplication(makeFormData(fields))).rejects.toThrow(
      "500 characters or fewer"
    );
  });

  it("rejects invalid enum value for workAuthorization", async () => {
    const job = await JobModel.create(VALID_JOB);
    const fields = validApplicationFields(String(job._id));
    fields.workAuthorization = "maybe";
    await expect(submitApplication(makeFormData(fields))).rejects.toThrow(
      "Missing required selections"
    );
  });

  it("rejects invalid enum value for yearsOfExperience", async () => {
    const job = await JobModel.create(VALID_JOB);
    const fields = validApplicationFields(String(job._id));
    fields.yearsOfExperience = "100+";
    await expect(submitApplication(makeFormData(fields))).rejects.toThrow(
      "Missing required selections"
    );
  });

  it("rejects invalid enum value for gender", async () => {
    const job = await JobModel.create(VALID_JOB);
    const fields = validApplicationFields(String(job._id));
    fields.gender = "other";
    await expect(submitApplication(makeFormData(fields))).rejects.toThrow(
      "Missing required selections"
    );
  });

  it("happy path: creates Application with correct enum values and redirects", async () => {
    const job = await JobModel.create(VALID_JOB);
    const jobId = String(job._id);
    const fields = validApplicationFields(jobId);

    await expect(
      submitApplication(makeFormData(fields))
    ).rejects.toThrow(`NEXT_REDIRECT:/show/${jobId}/apply/success`);

    expect(mockedRedirect).toHaveBeenCalledWith(`/show/${jobId}/apply/success`);

    const saved = await ApplicationModel.findOne({ jobId });
    expect(saved).not.toBeNull();
    expect(saved!.fullName).toBe("Alice Applicant");
    expect(saved!.email).toBe("alice@example.com");
    expect(saved!.workAuthorization).toBe("yes");
    expect(saved!.yearsOfExperience).toBe("3-5");
    expect(saved!.gender).toBe("female");
    expect(saved!.veteranStatus).toBe("no");
    expect(saved!.disabilityStatus).toBe("decline");
    expect(saved!.status).toBe("new");
  });
});

describe("markApplicationReviewed", () => {
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
  });

  it("rejects anonymous user", async () => {
    mockedGetUser.mockResolvedValue({ user: null });
    await expect(
      markApplicationReviewed("507f1f77bcf86cd799439011")
    ).rejects.toThrow("Unauthorized");
  });

  it("rejects invalid ObjectId", async () => {
    mockedGetUser.mockResolvedValue({ user: { id: "user_1" } });
    await expect(markApplicationReviewed("not-an-id")).rejects.toThrow(
      "Invalid application id"
    );
  });

  it("rejects when application is missing", async () => {
    mockedGetUser.mockResolvedValue({ user: { id: "user_1" } });
    await expect(
      markApplicationReviewed("507f1f77bcf86cd799439011")
    ).rejects.toThrow("Application not found");
  });

  it("rejects when job for application is missing", async () => {
    mockedGetUser.mockResolvedValue({ user: { id: "user_1" } });
    const app = await ApplicationModel.create({
      ...validApplicationFields("507f1f77bcf86cd799439099"),
    });
    await expect(markApplicationReviewed(String(app._id))).rejects.toThrow(
      "Job not found"
    );
  });

  it("rejects user without org membership", async () => {
    mockedGetUser.mockResolvedValue({ user: { id: "user_outsider" } });
    const job = await JobModel.create(VALID_JOB);
    const app = await ApplicationModel.create({
      ...validApplicationFields(String(job._id)),
    });
    listOrganizationMemberships.mockResolvedValue({ data: [] });

    await expect(markApplicationReviewed(String(app._id))).rejects.toThrow(
      "Forbidden"
    );

    expect(listOrganizationMemberships).toHaveBeenCalledWith({
      userId: "user_outsider",
      organizationId: VALID_JOB.orgId,
    });

    const reloaded = await ApplicationModel.findById(app._id);
    expect(reloaded!.status).toBe("new");
  });

  it("happy path: flips status to reviewed and revalidates", async () => {
    mockedGetUser.mockResolvedValue({ user: { id: "user_admin" } });
    const job = await JobModel.create(VALID_JOB);
    const app = await ApplicationModel.create({
      ...validApplicationFields(String(job._id)),
    });
    listOrganizationMemberships.mockResolvedValue({
      data: [{ userId: "user_admin", organizationId: VALID_JOB.orgId }],
    });

    await markApplicationReviewed(String(app._id));

    const reloaded = await ApplicationModel.findById(app._id);
    expect(reloaded!.status).toBe("reviewed");

    expect(mockedRevalidatePath).toHaveBeenCalledWith(
      `/jobs/${VALID_JOB.orgId}/applications/${job._id}/${app._id}`
    );
    expect(mockedRevalidatePath).toHaveBeenCalledWith(
      `/jobs/${VALID_JOB.orgId}/applications/${job._id}`
    );
    expect(mockedRevalidatePath).toHaveBeenCalledWith(
      `/jobs/${VALID_JOB.orgId}/applications`
    );
  });
});
