import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { revalidatePath } from "next/cache";
import { getUser } from "@workos-inc/authkit-nextjs";
import { startTestDb, stopTestDb, clearCollections } from "../../../../tests/helpers/mongo";

const listOrganizationMemberships = vi.fn();
const getOrganization = vi.fn();

vi.mock("@workos-inc/node", () => ({
  WorkOS: class {
    userManagement = { listOrganizationMemberships };
    organizations = { getOrganization };
  },
}));

import { saveJobAction, addOrgAndUserData } from "@/app/actions/jobActions";
import { JobModel } from "@/models/Job";

const mockedGetUser = getUser as unknown as ReturnType<typeof vi.fn>;
const mockedRevalidatePath = revalidatePath as unknown as ReturnType<typeof vi.fn>;

function makeFormData(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

const VALID_JOB_FIELDS: Record<string, string> = {
  title: "Senior Engineer",
  description: "Build cool stuff",
  remote: "remote",
  type: "full-time",
  salary: "120000",
  country: "USA",
  state: "CA",
  city: "SF",
  countryId: "1",
  stateId: "2",
  cityId: "3",
  orgId: "org_test_123",
  contactName: "Jane Doe",
  contactPhone: "555-0100",
  contactEmail: "jane@example.com",
};

describe("saveJobAction", () => {
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

  it("rejects unauthenticated user", async () => {
    mockedGetUser.mockResolvedValue({ user: null });

    await expect(saveJobAction(makeFormData(VALID_JOB_FIELDS))).rejects.toThrow(
      "Unauthorized"
    );
    expect(listOrganizationMemberships).not.toHaveBeenCalled();
  });

  it("rejects user without org membership when creating", async () => {
    mockedGetUser.mockResolvedValue({ user: { id: "user_1" } });
    listOrganizationMemberships.mockResolvedValue({ data: [] });

    await expect(saveJobAction(makeFormData(VALID_JOB_FIELDS))).rejects.toThrow(
      "Forbidden"
    );
    expect(listOrganizationMemberships).toHaveBeenCalledWith({
      userId: "user_1",
      organizationId: "org_test_123",
    });
    const count = await JobModel.countDocuments({});
    expect(count).toBe(0);
  });

  it("rejects create when orgId is missing", async () => {
    mockedGetUser.mockResolvedValue({ user: { id: "user_1" } });
    const { orgId: _omit, ...rest } = VALID_JOB_FIELDS;

    await expect(saveJobAction(makeFormData(rest))).rejects.toThrow(
      "Missing orgId"
    );
  });

  it("create-path stores all fields and calls revalidatePath", async () => {
    mockedGetUser.mockResolvedValue({ user: { id: "user_1" } });
    listOrganizationMemberships.mockResolvedValue({
      data: [{ userId: "user_1", organizationId: "org_test_123" }],
    });

    const result = await saveJobAction(makeFormData(VALID_JOB_FIELDS));

    expect(result).toBeDefined();
    expect(result.title).toBe("Senior Engineer");
    expect(result.orgId).toBe("org_test_123");
    expect(result.contactEmail).toBe("jane@example.com");

    const saved = await JobModel.findById(result._id);
    expect(saved).not.toBeNull();
    expect(saved!.title).toBe("Senior Engineer");

    expect(mockedRevalidatePath).toHaveBeenCalledWith("/jobs/org_test_123");
  });

  it("update-path: rejects when existing job not found", async () => {
    mockedGetUser.mockResolvedValue({ user: { id: "user_1" } });
    const missingId = "507f1f77bcf86cd799439011";
    await expect(
      saveJobAction(makeFormData({ ...VALID_JOB_FIELDS, id: missingId }))
    ).rejects.toThrow("Not found");
  });

  it("update-path: ignores orgId from formData and uses existing job's orgId for membership check", async () => {
    mockedGetUser.mockResolvedValue({ user: { id: "user_1" } });

    const existing = await JobModel.create({
      ...VALID_JOB_FIELDS,
      salary: 120000,
      orgId: "org_original",
    });

    listOrganizationMemberships.mockResolvedValue({
      data: [{ userId: "user_1", organizationId: "org_original" }],
    });

    await saveJobAction(
      makeFormData({
        ...VALID_JOB_FIELDS,
        id: String(existing._id),
        orgId: "org_attacker",
        title: "Updated Title",
      })
    );

    expect(listOrganizationMemberships).toHaveBeenCalledWith({
      userId: "user_1",
      organizationId: "org_original",
    });

    const reloaded = await JobModel.findById(existing._id);
    expect(reloaded!.orgId).toBe("org_original");
    expect(reloaded!.title).toBe("Updated Title");

    expect(mockedRevalidatePath).toHaveBeenCalledWith("/jobs/org_original");
    expect(mockedRevalidatePath).not.toHaveBeenCalledWith("/jobs/org_attacker");
  });

  it("update-path: rejects when user is not a member of the existing job's org", async () => {
    mockedGetUser.mockResolvedValue({ user: { id: "user_attacker" } });

    const existing = await JobModel.create({
      ...VALID_JOB_FIELDS,
      salary: 120000,
      orgId: "org_original",
    });

    listOrganizationMemberships.mockResolvedValue({ data: [] });

    await expect(
      saveJobAction(
        makeFormData({
          ...VALID_JOB_FIELDS,
          id: String(existing._id),
          orgId: "org_attacker",
          title: "Hijacked",
        })
      )
    ).rejects.toThrow("Forbidden");

    const reloaded = await JobModel.findById(existing._id);
    expect(reloaded!.title).toBe(VALID_JOB_FIELDS.title);
    expect(reloaded!.orgId).toBe("org_original");
  });
});

describe("addOrgAndUserData", () => {
  beforeAll(async () => {
    await startTestDb();
  });

  afterAll(async () => {
    await stopTestDb();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("hydrates orgName for each job", async () => {
    getOrganization.mockImplementation(async (id: string) => ({
      id,
      name: `Name of ${id}`,
    }));

    const jobs: any = [
      { _id: "1", orgId: "org_a" },
      { _id: "2", orgId: "org_b" },
    ];
    const result = await addOrgAndUserData(jobs, null);

    expect(result[0].orgName).toBe("Name of org_a");
    expect(result[1].orgName).toBe("Name of org_b");
    expect(listOrganizationMemberships).not.toHaveBeenCalled();
  });

  it("sets isAdmin=true only for orgs the user belongs to", async () => {
    getOrganization.mockImplementation(async (id: string) => ({
      id,
      name: id,
    }));
    listOrganizationMemberships.mockResolvedValue({
      data: [{ organizationId: "org_a", userId: "user_1" }],
    });

    const jobs: any = [
      { _id: "1", orgId: "org_a" },
      { _id: "2", orgId: "org_b" },
    ];
    const result = await addOrgAndUserData(jobs, { id: "user_1" } as any);

    expect(result[0].isAdmin).toBe(true);
    expect(result[1].isAdmin).toBe(false);
  });

  it("does not set isAdmin when user is null", async () => {
    getOrganization.mockImplementation(async (id: string) => ({
      id,
      name: id,
    }));
    const jobs: any = [{ _id: "1", orgId: "org_a" }];
    const result = await addOrgAndUserData(jobs, null);
    expect(result[0].isAdmin).toBeUndefined();
  });
});
