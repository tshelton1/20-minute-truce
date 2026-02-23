/* supabase/functions/speech-to-text/index.ts */
import { serve } from "std/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// 🛡️ THE FIX: Define a strict blueprint so the compiler knows .get() exists without using 'any'
interface EdgeFormData {
  get(name: string): Blob | string | null;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY in Supabase Secrets");

    // 🛡️ Safely cast the formData to our custom interface
    const formData = (await req.formData()) as unknown as EdgeFormData;
    const audioFile = formData.get('file');

    if (!audioFile) throw new Error("No audio file provided.");

    const openAiFormData = new FormData();
    openAiFormData.append('file', audioFile as Blob); // Ensure it's treated as a valid file Blob
    openAiFormData.append('model', 'whisper-1');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_API_KEY.trim()}` },
      body: openAiFormData,
    });

    const data = await response.json();
    
    // 🛡️ Capture OpenAI's specific error (like missing billing/credits) before continuing
    if (!response.ok) {
      throw new Error(data.error?.message || "OpenAI API Error");
    }

    return new Response(JSON.stringify({ text: data.text }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Speech-to-Text Error:", errorMessage);
    // 🛡️ CRITICAL FIX: Return 200 instead of 500 to prevent the React Native crash
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200, 
    });
  }
});