import mongoose from "mongoose";
import Jobs from "@/app/components/Jobs";
import { WorkOS } from "@workos-inc/node";
import { JobModel } from "@/models/Job";
import { getUser } from "@workos-inc/authkit-nextjs";
import { addOrgAndUserData } from "@/app/actions/jobActions";
import { notFound } from "next/navigation";

type PageProps = {
  params: {
    orgId: string;
  };
};

export default async function CompanyJobsPage(props: PageProps) {
  const { user } = await getUser();
  const workos = new WorkOS(process.env.WORKOS_API_KEY as string);

  let org;
  try {
    org = await workos.organizations.getOrganization(props.params.orgId);
  } catch {
    notFound();
  }

  await mongoose.connect(process.env.MONGO_URI as string);
  let jobsDocs = JSON.parse(
    JSON.stringify(await JobModel.find({ orgId: org.id }))
  );
  jobsDocs = await addOrgAndUserData(jobsDocs, user);

  return (
    <div className="pt-12">
      <header className="container mb-10">
        <p className="font-mono text-xs uppercase tracking-wider text-gray-400">
          Company
        </p>
        <h1 className="mt-1 font-serif text-4xl text-gray-900">{org.name}</h1>
      </header>
      <Jobs jobs={jobsDocs} header={`Roles at ${org.name}`} />
    </div>
  );
}
