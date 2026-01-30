import { Header } from "@/components/header";
import { ProjectList } from "@/components/project-list";

// Force dynamic rendering - disable all caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

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
