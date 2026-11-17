import { ProjectForm } from "@/components/forms/AccountForms";
import { PageHeader } from "@/components/sections/PageHeader";
import { Container } from "@/components/ui/Container";
import { Notice } from "@/components/ui/States";
import { getTerritory } from "@/config/territories";
import { requireViewer } from "@/lib/auth/session";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Submit a project",
  description: "Submit your project for the ACM MIT Innovation Vault.",
  path: "/dashboard/projects/new",
  noIndex: true,
});

export default async function Page() {
  const { viewer } = await requireViewer("/dashboard/projects/new");
  return (
    <>
      <PageHeader
        eyebrow="Innovation Vault"
        title="Submit a project"
        accent={getTerritory("vault").accent}
        description="Every submission is reviewed by the chapter before it appears in the Vault. You keep ownership; the team is credited."
        breadcrumbs={[{ label: "NEXUS", href: "/" }, { label: "Dashboard", href: "/dashboard" }, { label: "Submit a project" }]}
      />
      <Container className="py-12 sm:py-16">
        <div className="max-w-2xl">
          {viewer.emailVerified ? (
            <div className="nexus-frame p-6 sm:p-8">
              <ProjectForm />
            </div>
          ) : (
            <Notice tone="warning">Verify your email address first: open the link we sent you, then come back to this page.</Notice>
          )}
        </div>
      </Container>
    </>
  );
}
