import { useQuery } from "@tanstack/react-query";
import { fetchHealth } from "./lib/health";

export default function App() {
  const { data, isLoading } = useQuery({ queryKey: ["health"], queryFn: fetchHealth });
  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">CareerOps</h1>
      <p className="mt-2">
        API status:{" "}
        {isLoading ? "checking…" : data ? "✅ reachable" : "❌ unreachable"}
      </p>
    </main>
  );
}
