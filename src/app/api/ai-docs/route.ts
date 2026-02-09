import { NextRequest, NextResponse } from "next/server";

export const runtime = 'edge';

// GET /api/ai-docs - Documentation for AI agents
export async function GET() {
  const docs = {
    title: "Roadmapr AI Agent API",
    version: "1.0",
    description: "API endpoints for AI agents to autonomously implement community-voted features",

    quick_start: {
      endpoint: "/api/projects/{handle}/ai",
      example: "GET /api/projects/myproject/ai?limit=10&include_completed=false",
      description: "Fetches top features for AI implementation"
    },

    usage_example: {
      prompt: `You are an AI developer working on the {project_name} project.

Fetch the latest roadmap from: /api/projects/{handle}/ai

Your task:
1. Review the top-voted features and bugs
2. Implement them in priority order (highest score first)
3. Mark feature as 'in_progress' when you start
4. Mark as 'shipped' when complete

To update status: PATCH /api/features/{feature_id}/status
Body: { "status": "in_progress" | "shipped" }`
    },

    endpoints: {
      ai_feed: {
        method: "GET",
        path: "/api/projects/{handle}/ai",
        description: "Get AI-optimized feature list",
        params: {
          limit: "Number of features to return (default: 10, max: 50)",
          include_completed: "Include shipped features (default: false)",
        },
        response_format: {
          _meta: "AI instructions and API info",
          project: "Project context and metadata",
          features: "Array of prioritized features with sub-items",
          suggested_actions: "Recommended workflow steps",
        },
      },
      update_status: {
        method: "PATCH",
        path: "/api/features/{feature_id}/status",
        description: "Update feature status",
        body: {
          status: "open | in_progress | shipped",
        },
      },
    },

    response_example: {
      _meta: {
        version: "1.0",
        generated_at: "2025-01-15T10:00:00Z",
        instructions: "You are an AI development agent...",
      },
      project: {
        name: "MyProject",
        handle: "myproject",
        description: "Project description",
      },
      features: [
        {
          rank: 1,
          id: "uuid",
          title: "Add user authentication",
          description: "Implement OAuth login",
          status: "open",
          priority: { score: 150, label: "high" },
          sub_items: [],
        },
      ],
    },

    integration_guide: {
      step1: "Point your AI agent to the AI endpoint",
      step2: "Agent fetches and prioritizes features by community vote",
      step3: "Agent implements top features autonomously",
      step4: "Agent updates status as it progresses",
    },
  };

  return NextResponse.json(docs, {
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
  });
}
