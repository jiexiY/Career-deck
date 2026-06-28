import { CareerDeckDashboard } from "./components/CareerDeckDashboard";
import { getRepository } from "@/lib/career-deck/repository";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Home() {
  const data = await getRepository().getDashboardData();

  return <CareerDeckDashboard data={data} />;
}
