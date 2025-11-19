import { AppHeader } from "@/components/biz/AppHeader";

export default function Dashboard() {
  return (
    <div>
      <AppHeader breadcrumbs={[{ label: "Dashboard" }]} />
      <h1>blob</h1>
    </div>
  )
}