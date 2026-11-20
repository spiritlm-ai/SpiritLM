import { websiteModelGroups } from "@/lib/model-catalog";
import { ModelCatalog } from "./_components/model-catalog";

export default async function DashboardModelsPage() {
  const modelGroups = await websiteModelGroups();
  return <ModelCatalog modelGroups={modelGroups} />;
}
