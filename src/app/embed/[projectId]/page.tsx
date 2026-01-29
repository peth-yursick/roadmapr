import { createClient } from '@supabase/supabase-js';
import type { Metadata } from 'next';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const metadata: Metadata = {
  title: 'Roadmap',
  robots: 'noindex, nofollow',
};

interface EmbedPageProps {
  params: Promise<{ projectId: string }>;
}

export default async function EmbedPage({ params }: EmbedPageProps) {
  const { projectId } = await params;

  // Fetch project with features
  const { data: project } = await supabase
    .from('projects')
    .select(`
      *,
      features (
        id,
        title,
        description,
        status,
        total_weight,
        created_at
      )
    `)
    .eq('id', projectId)
    .single();

  if (!project) {
    return (
      <div className="flex items-center justify-center h-full bg-white">
        <div className="text-center p-6">
          <p className="text-gray-500">Project not found</p>
        </div>
      </div>
    );
  }

  // Sort features by weight and filter open features
  const sortedFeatures = (project.features || [])
    .filter((f: any) => f.status === 'open')
    .sort((a: any, b: any) => (b.total_weight || 0) - (a.total_weight || 0))
    .slice(0, 20);

  return (
    <div className="h-screen flex flex-col bg-white font-sans">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200 bg-white">
        <h2 className="font-semibold text-gray-900 text-base truncate">{project.name} Roadmap</h2>
        <p className="text-xs text-gray-500 mt-0.5">Vote on what matters to you</p>
      </div>

      {/* Feature list */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {sortedFeatures.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-gray-500">No features yet</p>
          </div>
        ) : (
          sortedFeatures.map((feature: any) => (
            <div
              key={feature.id}
              className="bg-white rounded-lg p-3 border border-gray-200 hover:border-blue-300 transition-colors cursor-pointer"
              onClick={() => window.open(`${window.location.protocol}//${window.location.host}/feature/${feature.id}`, '_blank')}
            >
              <h3 className="font-medium text-sm text-gray-900 leading-snug line-clamp-2">
                {feature.title}
              </h3>
              {feature.description && (
                <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                  {feature.description}
                </p>
              )}
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-gray-500">
                  {formatWeight(feature.total_weight || 0)} vote{feature.total_weight === 1 ? '' : 's'}
                </span>
                <span className="text-xs text-blue-600 hover:text-blue-700">
                  Vote →
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 px-3 py-2 border-t border-gray-200 bg-gray-50 text-center">
        <a
          href={`${window.location.protocol}//${window.location.host}/projects/${project.project_handle}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
        >
          Powered by Roadmapr
        </a>
      </div>
    </div>
  );
}

function formatWeight(weight: number): string {
  if (weight >= 1000) {
    return `${(weight / 1000).toFixed(1)}k`;
  }
  return weight.toString();
}
