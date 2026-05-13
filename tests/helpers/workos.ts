import { vi } from "vitest";

export type MockUser = {
  id: string;
  email?: string;
};

export type MockMembership = {
  organizationId: string;
  userId: string;
  role?: { slug: string };
};

export type WorkOSMocks = {
  listOrganizationMemberships: ReturnType<typeof vi.fn>;
  getOrganization: ReturnType<typeof vi.fn>;
  createOrganization: ReturnType<typeof vi.fn>;
  createOrganizationMembership: ReturnType<typeof vi.fn>;
};

export function makeWorkOSMocks(): WorkOSMocks {
  return {
    listOrganizationMemberships: vi.fn().mockResolvedValue({ data: [] }),
    getOrganization: vi
      .fn()
      .mockResolvedValue({ id: "org_unknown", name: "Unknown Org" }),
    createOrganization: vi
      .fn()
      .mockResolvedValue({ id: "org_new", name: "New Org" }),
    createOrganizationMembership: vi.fn().mockResolvedValue({}),
  };
}

export function installWorkOSMock(mocks: WorkOSMocks) {
  vi.doMock("@workos-inc/node", () => ({
    WorkOS: vi.fn().mockImplementation(() => ({
      userManagement: {
        listOrganizationMemberships: mocks.listOrganizationMemberships,
        createOrganizationMembership: mocks.createOrganizationMembership,
      },
      organizations: {
        getOrganization: mocks.getOrganization,
        createOrganization: mocks.createOrganization,
      },
    })),
  }));
}
