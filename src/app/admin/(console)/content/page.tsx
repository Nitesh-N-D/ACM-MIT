import { DistrictForm, HomeSettingsForm } from "@/components/admin/Controls";
import { AdminHeader, LoadError, Panel } from "@/components/admin/Shell";
import { TerritoryGlyph } from "@/components/brand/TerritoryGlyph";
import { territories } from "@/config/territories";
import { loadSettings } from "@/lib/admin/settings";
import { CONTENT } from "@/lib/auth/roles";
import { requireAdmin } from "@/lib/auth/session";

export const metadata = { title: "Homepage & districts" };

export default async function Page() {
  const { db } = await requireAdmin(CONTENT);
  const settings = await loadSettings(db);

  return (
    <>
      <AdminHeader
        title="Homepage & districts"
        description="The words on the home page and in each district of the city. Leave a field empty to keep the built-in text. Events, projects and the rest are edited in their own sections."
      />
      {!settings ? (
        <LoadError />
      ) : (
        <div className="space-y-6">
          <Panel title="Homepage">
            <HomeSettingsForm values={settings.home} />
          </Panel>
          <nav aria-label="Districts" className="flex flex-wrap gap-2">
            {territories.map((t) => (
              <a
                key={t.id}
                href={`#district-${t.id}`}
                className="border border-line px-3 py-1.5 font-mono text-xs tracking-[0.14em] text-silver uppercase hover:border-cyan/60 hover:text-ice"
              >
                {t.short}
              </a>
            ))}
          </nav>
          {territories.map((t) => (
            <section key={t.id} id={`district-${t.id}`} className="scroll-mt-6">
              <Panel
                title={t.name}
                description={
                  t.id === "core"
                    ? "Its mission and vision also fill the Mission and Vision halls in the 3D world."
                    : `${t.code} · ${t.short}`
                }
                action={<TerritoryGlyph id={t.id} className="size-8" />}
              >
                <DistrictForm
                  district={t.id}
                  core={t.id === "core"}
                  values={settings.districts[t.id] ?? {}}
                />
              </Panel>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
