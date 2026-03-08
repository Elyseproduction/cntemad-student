import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { chapterTitle, subjectName, chapterContent, pointsCles } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `Tu es un professeur expert en informatique universitaire. Tu dois générer des exercices qui couvrent ENTIÈREMENT un chapitre donné. 

RÈGLES IMPORTANTES :
- Tu dois déterminer toi-même le nombre de questions nécessaires pour couvrir tous les concepts du chapitre
- Mélange les types d'exercices (QCM, vrai/faux, texte à trou, question ouverte) pour tester différentes compétences
- Chaque concept clé du chapitre doit être couvert par au moins une question
- Les questions doivent être progressives : du plus simple au plus complexe
- Si un étudiant répond correctement à TOUTES les questions, il doit avoir démontré sa maîtrise complète du chapitre`;

    const userPrompt = `Génère des exercices couvrant ENTIÈREMENT le chapitre "${chapterTitle}" de la matière "${subjectName}".

Contenu du chapitre :
${chapterContent}

Points clés à couvrir obligatoirement :
${pointsCles?.join(", ") || "Non spécifiés"}

Réponds UNIQUEMENT en JSON valide :
{
  "exercices": [
    {
      "id": 1,
      "enonce": "Énoncé clair de la question",
      "type": "qcm | vrai_faux | texte_trou | question_ouverte",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "reponseCorrecte": "La bonne réponse exacte",
      "explicationCorrecte": "Explication détaillée pourquoi c'est correct",
      "explicationFausse": "Explication pourquoi les autres réponses sont fausses + conseil de révision"
    }
  ]
}

Notes :
- Pour vrai_faux : options = ["Vrai", "Faux"]
- Pour texte_trou : pas d'options, juste reponseCorrecte
- Pour question_ouverte : pas d'options, reponseCorrecte = réponse attendue résumée
- Détermine le bon nombre de questions pour tout couvrir (généralement entre 5 et 15)`;

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
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Trop de requêtes, veuillez réessayer dans quelques instants." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits IA épuisés. Contactez l'administrateur." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erreur du service IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "";
    const clean = text.replace(/```json|```/g, "").trim();
    
    let exercises;
    try {
      exercises = JSON.parse(clean);
    } catch {
      console.error("Failed to parse AI response:", clean);
      return new Response(JSON.stringify({ error: "L'IA a retourné une réponse invalide. Réessayez." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(exercises), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-exercises error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
