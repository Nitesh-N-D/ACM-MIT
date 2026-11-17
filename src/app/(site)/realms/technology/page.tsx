import { RealmPage } from "@/components/district/RealmPage";
import { pages } from "@/config/pages";
import { pageMetadata } from "@/lib/seo";

export const revalidate = 300;

export const metadata = pageMetadata({ title: pages.technology.title, description: pages.technology.description, path: "/realms/technology" });

export default function Page() {
  return <RealmPage id="frontier" realm="technology" title="Technology Frontier" />;
}
