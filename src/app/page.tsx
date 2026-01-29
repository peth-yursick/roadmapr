import { Header } from "@/components/header";
import { FeatureFeed } from "@/components/feature-feed";

export default function Home() {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-6">
        <FeatureFeed />
      </main>
    </div>
  );
}
