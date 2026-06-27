import { CareerDeckDashboard } from "./components/CareerDeckDashboard";
import { getRepository } from "@/lib/career-deck/repository";

export default async function Home() {
  const data = await getRepository().getDashboardData();

  return <CareerDeckDashboard data={data} />;
}
