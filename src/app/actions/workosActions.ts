'use server';

import { WorkOS } from "@workos-inc/node";
import { redirect } from "next/navigation";
import { getUser } from "@workos-inc/authkit-nextjs";

const workos = new WorkOS(process.env.WORKOS_API_KEY);

export async function createCompany(companyName: string) {
  const { user } = await getUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const trimmed = companyName?.trim() ?? "";
  if (trimmed.length < 2 || trimmed.length > 100) {
    throw new Error("Company name must be between 2 and 100 characters");
  }

  const org = await workos.organizations.createOrganization({ name: trimmed });
  await workos.userManagement.createOrganizationMembership({
    userId: user.id,
    organizationId: org.id,
    roleSlug: "admin",
  });
  redirect("/new-listing");
}
