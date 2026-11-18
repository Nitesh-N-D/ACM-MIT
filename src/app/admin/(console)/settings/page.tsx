import {
  ExperienceSettingsForm,
  SiteSettingsForm,
} from "@/components/admin/Controls";
import { AdminHeader, LoadError, Panel } from "@/components/admin/Shell";
import { loadSettings } from "@/lib/admin/settings";
import { ADMINS } from "@/lib/auth/roles";
import { requireAdmin } from "@/lib/auth/session";

export const metadata = { title: "Website & experience" };

export default async function Page() {
  const { db } = await requireAdmin(ADMINS);
  const settings = await loadSettings(db);

  return (
    <>
      <AdminHeader
        title="Website & experience"
        description="Contact details, membership, and how the 3D world behaves for every visitor."
      />
      {!settings ? (
        <LoadError />
      ) : (
        <div className="grid gap-6 xl:grid-cols-2">
          <Panel title="Website">
            {/* Applications are open unless they were closed here. */}
            <SiteSettingsForm
              values={{
                ...settings.site,
                membershipOpen: settings.site.membershipOpen ?? "on",
              }}
            />
          </Panel>
          <Panel
            title="3D experience"
            description="Visitors can always switch to the 2D site, and devices that cannot run 3D get it automatically."
          >
            <ExperienceSettingsForm
              values={{
                ...settings.experience,
                // The intro plays unless it was turned off here.
                introEnabled: settings.experience.introEnabled ?? "on",
                maxQuality: settings.experience.maxQuality || "high",
              }}
            />
          </Panel>
        </div>
      )}
    </>
  );
}
