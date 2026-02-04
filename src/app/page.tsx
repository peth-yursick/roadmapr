"use client";

import { Header } from "@/components/header";
import { ProjectList } from "@/components/project-list";
import { useEffect } from "react";

export default function Home() {
  useEffect(() => {
    console.log('[Roadmapr] Homepage loaded - Version 2025-02-04-v5 (deploy fix)');
  }, []);
  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-6">
        <ProjectList />
      </main>
    </div>
  );
}
