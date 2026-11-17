import { hallRoute } from "@/components/district/hallRoute";

const route = hallRoute("intelligence");

export const revalidate = 300;
export const dynamicParams = false;
export const generateStaticParams = route.generateStaticParams;
export const generateMetadata = route.generateMetadata;
export default route.Page;
