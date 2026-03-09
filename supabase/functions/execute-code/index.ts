import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { code, language } = await req.json();

    let output = "";
    
    switch (language) {
      case 'python':
        const pythonCmd = new Deno.Command("python3", {
          args: ["-c", code],
          stdout: "piped",
          stderr: "piped",
        });
        const pythonOutput = await pythonCmd.output();
        output = new TextDecoder().decode(pythonOutput.stdout) || 
                 new TextDecoder().decode(pythonOutput.stderr);
        break;
        
      case 'javascript':
        const jsCmd = new Deno.Command("deno", {
          args: ["eval", code],
          stdout: "piped",
          stderr: "piped",
        });
        const jsOutput = await jsCmd.output();
        output = new TextDecoder().decode(jsOutput.stdout) || 
                 new TextDecoder().decode(jsOutput.stderr);
        break;
        
      case 'html':
        output = code;
        break;
        
      default:
        throw new Error(`Language ${language} not supported`);
    }

    return new Response(JSON.stringify({ output }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("execute-code error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
