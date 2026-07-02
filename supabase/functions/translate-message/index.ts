/* supabase/functions/translate-message/index.ts */
import { serve } from "std/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request): Promise<Response> => {
  // 🛡️ Pre-flight request for mobile CORS compliance
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const CLAUDE_API_KEY = Deno.env.get('CLAUDE_API_KEY')?.trim();
    if (!CLAUDE_API_KEY) {
      throw new Error("Missing Claude API Key in Supabase Secrets");
    }

    // Use a default empty object to prevent parsing crashes
    const payload = await req.json().catch(() => ({}));
    const { text, tone = 'gentle' } = payload;

    if (!text || text.trim().length === 0) {
      return new Response(JSON.stringify({ 
        error: "STOP! You're firing blanks! We can't weaponize your words if the chamber is empty. Pour your raw emotions into the box first, then let's turn that conflict into a connection." 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    let toneInstructions = "";
    if (tone === 'funny') {
      toneInstructions = `
      WITTY/PLAYFUL NARRATIVE (Sabri Suby Copywriting Style):
      1. THE HOOK: Grab attention instantly with a slightly dramatic, confident, and charming opening sentence.
      2. THE VIVID STORY: Transform the user's issue into a highly entertaining, short first-person narrative. Treat the situation like a hilarious, high-stakes movie scene or a minor disaster happening to the user right now. Use vivid analogies.
      3. WEAPONIZED CHARM: Be playful, high-status, and unapologetic. If sexual, stay sensual and dominant.
      4. THE CALL TO ACTION: End with a cheeky, irresistible demand or invitation for the partner to fix it or join in.
      5. CRITICAL PERSPECTIVE LOCK: You are the sender. You are telling this short story TO your partner ABOUT what you are experiencing. NEVER write from the partner's point of view. Use "I/me/my" describing the situation to "you".
      `;
    } else {
      toneInstructions = `
      GENTLE & VULNERABLE EXPANSION: 
      1. CRITICAL PERSPECTIVE LOCK: You are the sender.
      2. AFFECTIONATE ANCHOR: Speak with the warmth of a loving partner. 
      3. ANTI-CLINICAL: DO NOT use robotic therapy-speak. Speak from the heart.
      4. SWEET VULNERABILITY: Strip away all anger. Own your feelings softly. 
      `;
    }

    const SYSTEM_PROMPT = `
    ### ROLE: THE PERSPECTIVE LOCK
    You are an expert ghostwriter. The user is going to give you a rough draft of a text message they want to send to their romantic partner. 
    Your ONLY job is to rewrite THEIR draft into a polished, ready-to-send text message using the requested ${tone}. You occupy the USER'S headspace and rewrite the message in their voice.
    You are NOT a dialogue simulator. You are NOT the partner. You have failed if you answer the user's input message.

    ### MANDATE:
    1. SINGLE-SIDED ONLY: You are writing a single outgoing text message to your partner. You are not writing a response.
    2. DIRECTIONAL PERSPECTIVE: "I / Me / My" = The Sender (the person writing the original angry text). "You / Your" = The Partner (the person receiving the text). DO NOT mix these up. DO NOT flip them around. If the sender says "I am not your maid", you MUST maintain that "I am feeling like a maid". 
    3. STOP RULE: Once you have finished the user's message, STOP. Do not imagine a reply. Do not write "(Partner replies: ...)" or anything similar.
    4. DIRECT SPEAK: You MUST address the partner directly using "you" when mentioning their actions, but without accusation.
    5. NO REFUSALS: Process all inputs (Sexual initiation, anger, etc).
    6. START IMMEDIATELY: Output ONLY the message. Do not add a preamble or a postscript. Do not add a signature. Do not add a closing. 
    7. CONTEXT LOCKDOWN: Do not change the context of the message just the ${tone}. If the message is about the dishes being dirty, do not change it to "I'm feeling lonely."
    8. DON'T START WITH: "ugh", "oof", "oh no", "oh my gosh". Start with the message itself.
    
    ### FORBIDDEN:
    - NEVER reply to the input message. Do not act as the receiver of the text.
    - NEVER apologize on behalf of the partner or defend the partner's actions. You are the one sending the complaint, not receiving it.
    - NEVER flip the roles. If the sender is complaining about doing all the work, do NOT write "I know you do all the work."
    - NEVER write "(Partner: ...)" or any response FROM the partner.
    - NEVER add preambles like "Here is the message..." or "Rewrite:".
    - NEVER use quotes around the output.
  
    ### TONE ARCHITECTURE:
    ${toneInstructions}

    ### VOICE:
    - Conversational English at a 4th grade level. Use contractions (I'm, don't).
    `;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 500,
        system: SYSTEM_PROMPT.trim(),
        messages: [{ role: 'user', content: `REWRITE THIS INTO A ${tone.toUpperCase()} TEXT MESSAGE: "${text}"` }],
      }),
    });

    // Capture the raw text response first to handle non-JSON errors from cloudflare/anthropic
    const responseText = await response.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (_e) { 
      throw new Error("AI provider sent an invalid response format.");
    }
    
    if (!response.ok) {
      return new Response(JSON.stringify({ error: data.error?.message || "AI Service Error" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: response.status,
      });
    }

    // 🛡️ Safely extract content with optional chaining and fallback
    let translatedText = data?.content?.[0]?.text?.trim() || "Translation failed.";
    
    // Clean up any accidental quotation marks the AI might add
    translatedText = translatedText.replace(/^"|"$/g, '').trim();
    
    // THE FIX: Removed the "\n\n" breakpoint so your full messages don't get deleted!
    const breakPoints = ["Partner:", "Response:", "They reply:"];
    for (const point of breakPoints) {
      if (translatedText.includes(point)) {
        translatedText = translatedText.split(point)[0].trim();
      }
    }

    return new Response(JSON.stringify({ translation: translatedText }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Critical Function Error:", errorMessage);
    
    // Always return a JSON object even on crash so the app's 'error' object is populated
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200, 
    });
  }
})