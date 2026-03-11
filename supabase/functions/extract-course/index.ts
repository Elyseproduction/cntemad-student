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
        description: "Structure a document into a comprehensive pedagogical chapter with ALL content preserved, enriched with additional explanations and examples.",
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
            contenu_ajoute: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  titre: { type: "string" },
                  description: { type: "string" },
                },
                required: ["titre", "description"],
                additionalProperties: false,
              },
            },
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
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      tools,
      tool_choice: { type: "function", function: { name: "structure_course" } },
      max_tokens: 30000,
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

    const systemPrompt = `Tu es un expert en pédagogie universitaire informatique. Tu dois analyser un document de cours PAGE PAR PAGE et le transformer en un chapitre COMPLET, EXHAUSTIF et détaillé.

⚠️ RÈGLE ABSOLUE : NE RÉSUME PAS ! Tu dois TOUT inclure :
- CHAQUE définition, CHAQUE formule, CHAQUE exemple du document original
- CHAQUE paragraphe doit être retranscrit intégralement avec les détails
- Si le document fait 10 pages, le résultat doit contenir TOUT le contenu de ces 10 pages
- Analyse le document page par page, section par section, ne saute RIEN
- Les cours sont destinés à des étudiants universitaires qui ont besoin du contenu COMPLET pour réviser

📝 ENRICHISSEMENT OBLIGATOIRE :
- Si tu détectes des concepts qui manquent d'explication, AJOUTE des explications supplémentaires
- Si un exemple est absent pour illustrer un concept, INVENTE un exemple pertinent
- Si une définition est incomplète, COMPLÈTE-la avec les informations manquantes
- Ajoute des analogies pour rendre les concepts complexes plus accessibles
- Ajoute des "attention" pour les erreurs fréquentes des étudiants
- Ajoute des "retenir" pour les points essentiels à mémoriser
- Signale dans contenu_ajoute tout ce que tu as rajouté qui n'était pas dans le document original

CONTRAINTES FORMAT MOBILE :
- L'app est sur téléphone (~360px). Lignes max 60 caractères.
- Pour code/tableau/schema : lignes max 50 caractères, découpe si nécessaire.
- Schémas ASCII : étroits et verticaux.
- Phrases courtes, paragraphes aérés.
- Découpe les contenus longs en PLUSIEURS sections pour une lecture progressive.

RÈGLES DE STRUCTURATION :
- "h1" pour titres principaux, "h2" sous-titres, "h3" sous-sous-titres
- "definition" pour CHAQUE définition importante 📌
- "retenir" pour points essentiels 💡 (en ajouter même si absents du document)
- "attention" pour pièges courants ⚠️ (en ajouter même si absents du document)
- "code" pour code/algorithmes (lignes courtes, TOUT le code du document)
- "tableau" pour données tabulaires — format compact (TOUS les tableaux)
- "schema" pour diagrammes — format vertical étroit
- Mets en valeur les mots-clés dans mots_cles
- NE REFORMULE PAS les définitions originales, garde-les telles quelles et ajoute des clarifications en plus si nécessaire
- Le contenu doit être COMPLET, pas un résumé`;

    const userPrompt = `Analyse et structure INTÉGRALEMENT ce document de cours "${fileName || 'document'}" pour la matière "${subjectName}".

IMPORTANT : Analyse CHAQUE PAGE du document. Ne résume pas. Retranscris TOUT le contenu et enrichis-le avec des explications supplémentaires, des exemples et des points d'attention.

Contenu du document (à analyser intégralement, page par page) :
${textContent.substring(0, 50000)}

Transforme ce contenu en un chapitre COMPLET, détaillé et pédagogique. Le résultat doit contenir PLUS de contenu que le document original, pas moins.`;

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
