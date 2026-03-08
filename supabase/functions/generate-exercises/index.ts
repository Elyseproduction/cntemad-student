import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_RETRIES = 2;

async function callAI(apiKey: string, systemPrompt: string, userPrompt: string): Promise<any> {
  const tools = [
    {
      type: "function",
      function: {
        name: "generate_exercises",
        description: "Generate structured exercises covering a chapter. Returns a list of exercises with questions, answers, and explanations.",
        parameters: {
          type: "object",
          properties: {
            exercices: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "number", description: "Exercise number" },
                  enonce: { type: "string", description: "Clear question statement" },
                  type: { type: "string", enum: ["qcm", "vrai_faux", "texte_trou", "question_ouverte"] },
                  options: { type: "array", items: { type: "string" }, description: "Answer options (for QCM and vrai_faux)" },
                  reponseCorrecte: { type: "string", description: "The correct answer" },
                  explicationCorrecte: { type: "string", description: "Explanation why it is correct" },
                  explicationFausse: { type: "string", description: "Explanation why others are wrong + revision tip" },
                },
                required: ["id", "enonce", "type", "reponseCorrecte", "explicationCorrecte", "explicationFausse"],
                additionalProperties: false,
              },
            },
          },
          required: ["exercices"],
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
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      tools,
      tool_choice: { type: "function", function: { name: "generate_exercises" } },
      max_tokens: 8000,
    }),
  });

  if (!response.ok) {
    const status = response.status;
    const body = await response.text();
    throw { status, body };
  }

  const data = await response.json();
  
  // Extract from tool call
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (toolCall?.function?.arguments) {
    return JSON.parse(toolCall.function.arguments);
  }
  
  // Fallback: try parsing from content
  const text = data.choices?.[0]?.message?.content || "";
  const clean = text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { chapterTitle, subjectName, chapterContent, pointsCles } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `Tu es un professeur expert en informatique universitaire. Tu dois générer des exercices qui couvrent ENTIÈREMENT un chapitre donné. 

RÈGLES IMPORTANTES :
- Tu dois déterminer toi-même le nombre de questions nécessaires pour couvrir tous les concepts du chapitre (généralement entre 5 et 15)
- Mélange les types d'exercices (QCM, vrai/faux, texte à trou, question ouverte) pour tester différentes compétences
- Chaque concept clé du chapitre doit être couvert par au moins une question
- Les questions doivent être progressives : du plus simple au plus complexe
- Si un étudiant répond correctement à TOUTES les questions, il doit avoir démontré sa maîtrise complète du chapitre
- Pour vrai_faux : options doit être ["Vrai", "Faux"]
- Pour texte_trou : pas d'options nécessaire
- Pour question_ouverte : pas d'options, reponseCorrecte = réponse attendue résumée
- Les explications doivent être pédagogiques et aider l'étudiant à comprendre`;

    const userPrompt = `Génère des exercices couvrant ENTIÈREMENT le chapitre "${chapterTitle}" de la matière "${subjectName}".

Contenu du chapitre :
${chapterContent}

Points clés à couvrir obligatoirement :
${pointsCles?.join(", ") || "Non spécifiés"}`;

    let lastError: any = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const result = await callAI(LOVABLE_API_KEY, systemPrompt, userPrompt);
        
        // Validate structure
        const exercices = result?.exercices;
        if (!Array.isArray(exercices) || exercices.length === 0) {
          throw new Error("No exercises returned");
        }

        // Validate each exercise has required fields
        for (const ex of exercices) {
          if (!ex.enonce || !ex.type || !ex.reponseCorrecte) {
            throw new Error("Exercise missing required fields");
          }
        }

        return new Response(JSON.stringify({ exercices }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (err: any) {
        lastError = err;
        if (err.status === 429) {
          return new Response(JSON.stringify({ error: "Trop de requêtes. Veuillez patienter quelques secondes et réessayer." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (err.status === 402) {
          return new Response(JSON.stringify({ error: "Crédits IA épuisés. Contactez l'administrateur." }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        console.error(`Attempt ${attempt + 1} failed:`, err);
        if (attempt < MAX_RETRIES) {
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        }
      }
    }

    console.error("All attempts failed:", lastError);
    return new Response(JSON.stringify({ error: "L'IA n'a pas pu générer les exercices après plusieurs tentatives. Réessayez." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-exercises error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
