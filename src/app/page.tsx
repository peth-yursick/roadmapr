import { Header } from "@/components/header";
import { ProjectList } from "@/components/project-list";

// Force rebuild - fix Vercel cache
export const dynamic = 'force-dynamic';

export default function Home() {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-6">
        <ProjectList />
      </main>
    </div>
  );
}
