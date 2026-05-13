import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { getUser } from "@workos-inc/authkit-nextjs";
import { NextRequest } from "next/server";
import { startTestDb, stopTestDb, clearCollections } from "../../../../../tests/helpers/mongo";

const listOrganizationMemberships = vi.fn();

vi.mock("@workos-inc/node", () => ({
  WorkOS: class {
    userManagement = { listOrganizationMemberships };
    organizations = {};
  },
}));

import { DELETE } from "@/app/api/jobs/route";
import { JobModel } from "@/models/Job";

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

function makeReq(id?: string): NextRequest {
  const url = id
    ? `http://localhost/api/jobs?id=${encodeURIComponent(id)}`
    : "http://localhost/api/jobs";
  return new NextRequest(url, { method: "DELETE" });
}

describe("DELETE /api/jobs", () => {
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

  it("returns 401 for anonymous user", async () => {
    mockedGetUser.mockResolvedValue({ user: null });
    const res = await DELETE(makeReq("507f1f77bcf86cd799439011"));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns 400 for missing id", async () => {
    mockedGetUser.mockResolvedValue({ user: { id: "user_1" } });
    const res = await DELETE(makeReq());
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid id" });
  });

  it("returns 400 for invalid ObjectId", async () => {
    mockedGetUser.mockResolvedValue({ user: { id: "user_1" } });
    const res = await DELETE(makeReq("not-an-id"));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid id" });
  });

  it("returns 404 when job does not exist", async () => {
    mockedGetUser.mockResolvedValue({ user: { id: "user_1" } });
    const res = await DELETE(makeReq("507f1f77bcf86cd799439011"));
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Not found" });
  });

  it("returns 403 when user is not a member of the job's org", async () => {
    mockedGetUser.mockResolvedValue({ user: { id: "user_outsider" } });
    const job = await JobModel.create(VALID_JOB);
    listOrganizationMemberships.mockResolvedValue({ data: [] });

    const res = await DELETE(makeReq(String(job._id)));
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "Forbidden" });

    expect(listOrganizationMemberships).toHaveBeenCalledWith({
      userId: "user_outsider",
      organizationId: VALID_JOB.orgId,
    });

    const stillThere = await JobModel.findById(job._id);
    expect(stillThere).not.toBeNull();
  });

  it("returns 200 and deletes the job for a member", async () => {
    mockedGetUser.mockResolvedValue({ user: { id: "user_admin" } });
    const job = await JobModel.create(VALID_JOB);
    listOrganizationMemberships.mockResolvedValue({
      data: [{ userId: "user_admin", organizationId: VALID_JOB.orgId }],
    });

    const res = await DELETE(makeReq(String(job._id)));
    expect(res.status).toBe(200);
    expect(await res.json()).toBe(true);

    const gone = await JobModel.findById(job._id);
    expect(gone).toBeNull();
  });
});
