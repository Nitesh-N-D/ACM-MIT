import { RealmPage } from "@/components/district/RealmPage";
import { pages } from "@/config/pages";
import { pageMetadata } from "@/lib/seo";

export const revalidate = 300;

export const metadata = pageMetadata({ title: pages.intelligence.title, description: pages.intelligence.description, path: "/realms/intelligence" });

export default function Page() {
  return <RealmPage id="intelligence" realm="intelligence" title="Intelligence Realm" />;
}
