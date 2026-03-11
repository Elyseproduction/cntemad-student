import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function callAI(apiKey: string, chapterTitle: string, subjectName: string): Promise<any> {
  const tools = [
    {
      type: "function",
      function: {
        name: "suggest_videos",
        description: "Suggest YouTube video search queries and titles for a given course chapter.",
        parameters: {
          type: "object",
          properties: {
            videos: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  search_query: { type: "string", description: "YouTube search query to find relevant videos" },
                  suggested_title: { type: "string", description: "A descriptive title for the suggested video" },
                  description: { type: "string", description: "Brief description of what the video should cover" },
                },
                required: ["search_query", "suggested_title", "description"],
                additionalProperties: false,
              },
            },
          },
          required: ["videos"],
          additionalProperties: false,
        },
      },
    },
  ];

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-lite",
      messages: [
        {
          role: "system",
          content: `Tu es un assistant qui trouve des vidéos YouTube éducatives pour des étudiants universitaires en informatique. 
Suggère 2-3 recherches YouTube pertinentes pour le chapitre donné. 
Privilégie les vidéos en français, mais inclus aussi une recherche en anglais si le sujet est très technique.
Les queries doivent être des termes de recherche YouTube réalistes qui donneront de bons résultats.`,
        },
        {
          role: "user",
          content: `Trouve des vidéos YouTube pour le chapitre "${chapterTitle}" de la matière "${subjectName}".`,
        },
      ],
      tools,
      tool_choice: { type: "function", function: { name: "suggest_videos" } },
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const status = response.status;
    const body = await response.text();
    throw { status, body };
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (toolCall?.function?.arguments) {
    return JSON.parse(toolCall.function.arguments);
  }
  throw new Error("No tool call response");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { chapterTitle, subjectName } = await req.json();

    if (!chapterTitle || !subjectName) {
      return new Response(JSON.stringify({ error: "Titre du chapitre et matière requis" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const result = await callAI(LOVABLE_API_KEY, chapterTitle, subjectName);

    // For each suggestion, build a YouTube search URL and extract a video ID from search
    const videos = (result.videos || []).map((v: any, i: number) => ({
      id: `yt-auto-${Date.now()}-${i}`,
      titre: v.suggested_title,
      description: v.description,
      searchQuery: v.search_query,
      youtubeSearchUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(v.search_query)}`,
      matiere: subjectName,
      date: new Date().toISOString().split('T')[0],
    }));

    return new Response(JSON.stringify({ videos }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    if (err.status === 429) {
      return new Response(JSON.stringify({ error: "Trop de requêtes. Réessayez plus tard." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (err.status === 402) {
      return new Response(JSON.stringify({ error: "Crédits IA épuisés." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.error("search-youtube error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Erreur inconnue" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
