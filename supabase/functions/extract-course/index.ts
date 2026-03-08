import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

IMPORTANT - CONTRAINTES DE FORMAT MOBILE :
- L'application est utilisée principalement sur téléphone Android (écran ~360px de large)
- Chaque ligne de texte dans "contenu" ne doit PAS dépasser 60 caractères de large
- Pour les blocs "code", "tableau" et "schema" : garde les lignes COURTES (max 50 caractères par ligne), découpe en plusieurs lignes si nécessaire
- N'utilise PAS de tableaux ASCII larges. Préfère des listes ou des formats compacts
- Pour les schémas ASCII : fais-les ÉTROITS et VERTICAUX plutôt que larges et horizontaux
- Évite les longues lignes horizontales (----, ====, etc.)
- Privilégie les phrases courtes et les paragraphes aérés
- Découpe les contenus longs en plusieurs sections plutôt qu'un seul gros bloc

Tu dois retourner un JSON avec cette structure EXACTE :
{
  "titre": "Titre du chapitre",
  "difficulte": "Facile" | "Moyen" | "Difficile",
  "resume_intro": "Résumé introductif du chapitre (2-3 phrases courtes)",
  "sections": [
    {
      "type": "h1" | "h2" | "h3" | "definition" | "retenir" | "attention" | "code" | "tableau" | "schema",
      "titre": "Titre de la section",
      "contenu": "Contenu détaillé (lignes courtes, adapté mobile)",
      "mots_cles": ["mot1", "mot2"]
    }
  ],
  "schemas_detectes": [
    {
      "description": "Description du schéma",
      "representation_texte": "Représentation ÉTROITE en ASCII (max 40 car/ligne)"
    }
  ],
  "points_cles": ["Point clé 1", "Point clé 2"],
  "conseil_revision": "Conseil pour bien réviser ce chapitre"
}

RÈGLES DE STRUCTURATION :
- Utilise "h1" pour les titres principaux, "h2" pour les sous-titres, "h3" pour les sous-sous-titres
- Utilise "definition" pour les définitions importantes avec le symbole 📌
- Utilise "retenir" pour les points essentiels à mémoriser avec 💡
- Utilise "attention" pour les pièges courants et erreurs fréquentes avec ⚠️
- Utilise "code" pour les exemples de code, algorithmes, commandes (lignes courtes !)
- Utilise "tableau" pour les données tabulaires — format COMPACT en liste plutôt que tableau large
- Utilise "schema" pour les diagrammes — format VERTICAL et ÉTROIT
- Mets en valeur les mots-clés importants dans mots_cles de chaque section
- Le résumé doit être clair et donner envie d'apprendre
- Les points clés doivent être des phrases courtes et mémorisables
- Le conseil de révision doit être pratique et actionnable
- Reformule et améliore le contenu pour le rendre plus clair et pédagogique
- N'hésite pas à ajouter des exemples et des analogies
- DÉCOUPE les sections longues en plusieurs petites sections`;

    const userPrompt = `Analyse et structure ce document de cours "${fileName || 'document'}" pour la matière "${subjectName}".

Contenu du document :
${textContent.substring(0, 30000)}

Transforme ce contenu en un chapitre structuré, pédagogique et facile à apprendre. Réponds UNIQUEMENT en JSON valide.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 8000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Trop de requêtes, veuillez réessayer." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits IA épuisés." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erreur du service IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "";
    const clean = text.replace(/```json|```/g, "").trim();

    let chapter;
    try {
      chapter = JSON.parse(clean);
    } catch {
      console.error("Failed to parse:", clean);
      return new Response(JSON.stringify({ error: "L'IA a retourné une réponse invalide. Réessayez." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(chapter), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("extract-course error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
