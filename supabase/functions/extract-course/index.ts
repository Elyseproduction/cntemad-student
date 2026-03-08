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
        name: "structure_course",
        description: "Structure a document into a pedagogical chapter with sections, key points, and revision tips.",
        parameters: {
          type: "object",
          properties: {
            titre: { type: "string", description: "Chapter title" },
            difficulte: { type: "string", enum: ["Facile", "Moyen", "Difficile"] },
            resume_intro: { type: "string", description: "2-3 sentence intro summary" },
            sections: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: { type: "string", enum: ["h1", "h2", "h3", "definition", "retenir", "attention", "code", "tableau", "schema"] },
                  titre: { type: "string" },
                  contenu: { type: "string" },
                  mots_cles: { type: "array", items: { type: "string" } },
                },
                required: ["type", "titre", "contenu"],
                additionalProperties: false,
              },
            },
            schemas_detectes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  description: { type: "string" },
                  representation_texte: { type: "string" },
                },
                required: ["description", "representation_texte"],
                additionalProperties: false,
              },
            },
            points_cles: { type: "array", items: { type: "string" } },
            conseil_revision: { type: "string" },
          },
          required: ["titre", "difficulte", "resume_intro", "sections", "points_cles", "conseil_revision"],
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
      tool_choice: { type: "function", function: { name: "structure_course" } },
      max_tokens: 12000,
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
  
  const text = data.choices?.[0]?.message?.content || "";
  const clean = text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { textContent, fileName, subjectName } = await req.json();

    if (!textContent || !subjectName) {
      return new Response(JSON.stringify({ error: "Contenu et matière requis" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `Tu es un expert en pédagogie universitaire informatique. Tu dois analyser un document de cours et le transformer en un chapitre structuré et facile à apprendre.

CONTRAINTES FORMAT MOBILE :
- L'app est sur téléphone (~360px). Lignes max 60 caractères.
- Pour code/tableau/schema : lignes max 50 caractères, découpe si nécessaire.
- Schémas ASCII : étroits et verticaux.
- Phrases courtes, paragraphes aérés.
- Découpe les contenus longs en plusieurs sections.

RÈGLES DE STRUCTURATION :
- "h1" pour titres principaux, "h2" sous-titres, "h3" sous-sous-titres
- "definition" pour définitions importantes 📌
- "retenir" pour points essentiels 💡
- "attention" pour pièges courants ⚠️
- "code" pour code/algorithmes (lignes courtes)
- "tableau" pour données tabulaires — format compact
- "schema" pour diagrammes — format vertical étroit
- Mets en valeur les mots-clés dans mots_cles
- Reformule et améliore pour plus de clarté
- Ajoute des exemples et analogies`;

    const userPrompt = `Analyse et structure ce document de cours "${fileName || 'document'}" pour la matière "${subjectName}".

Contenu du document :
${textContent.substring(0, 30000)}

Transforme ce contenu en un chapitre structuré, pédagogique et facile à apprendre.`;

    let lastError: any = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const result = await callAI(LOVABLE_API_KEY, systemPrompt, userPrompt);
        
        // Validate
        if (!result?.titre || !Array.isArray(result?.sections) || result.sections.length === 0) {
          throw new Error("Invalid structure returned");
        }

        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (err: any) {
        lastError = err;
        if (err.status === 429) {
          return new Response(JSON.stringify({ error: "Trop de requêtes. Veuillez patienter et réessayer." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (err.status === 402) {
          return new Response(JSON.stringify({ error: "Crédits IA épuisés." }), {
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
    return new Response(JSON.stringify({ error: "L'IA n'a pas pu structurer le cours après plusieurs tentatives. Réessayez." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("extract-course error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
