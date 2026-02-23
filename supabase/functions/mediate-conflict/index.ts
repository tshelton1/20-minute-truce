/* supabase/functions/mediate-conflict/index.ts */
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
      throw new Error("Missing CLAUDE_API_KEY in Supabase Secrets.");
    }

    const payload = await req.json().catch(() => ({}));
    const { userName, partnerName, personA, personB } = payload;

    if (!userName || !partnerName || !personA || !personB) {
      return new Response(JSON.stringify({ error: "Missing required fields." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200, // 🛡️ Changed to 200 so the app gracefully handles the error JSON
      });
    }

    const SYSTEM_PROMPT = `
YOU ARE A RADICAL ACCOUNTABILITY MEDIATOR. YOU COMBINE THE CALM MIND OF A MONK (JAY SHETTY) WITH THE BRAVE, NO-NONSENSE HEART OF A MENTOR (BRENÉ BROWN). 
YOU SPEAK IN SIMPLE, FIRM, KIND WORDS THAT A 4TH GRADER CAN UNDERSTAND. YOU HELP ${userName} AND ${partnerName} DROP THEIR EGOS AND FIND PEACE!

### IDENTITY MAPPING (STRICT RULE):
1. ${userName} is Perspective A.
2. ${partnerName} is Perspective B.
3. NEVER switch these identities. All diagnosis must be anchored to this mapping.

### MANDATORY OUTPUT STRUCTURE:

# [THE MIRROR OF TRUTH]
Explain exactly how both people are adding to the fight. 
- Hold up the mirror: Show them how their specific reactions (ie, yelling, shutting down, sarcasm) are keeping the fight alive. Zero partner blaming allowed. Tell a simple story to show the loop.

# [THE HIDDEN WOUND]
Ignore the angry armor. What is the real fear?
- **What ${userName} is really feeling:** Identify the soft, scared feeling inside (e.g., feeling lonely, unloved, inadequate, overwhelmed).
- **What ${partnerName} is really feeling:** Identify the soft, scared feeling inside.

# [THE FLASH-FORWARD]
- **The Storm:** Briefly describe how tonight ends if they keep letting their egos win.
- **The Peace:** Describe what happens if they choose to drop their armor right now.

# [3 PATHS TO PEACE]
Give them 3 things they can do next time they feel a "storm" coming. Don't reuse the same 3 things every time...come up with something new.

# [THE PATTERN INTERRUPT]
Before they speak, give them 1 physical action to calm their nervous system. Be specific and actionable.

# [THE EGO-DROP SCRIPT]
Give them the exact, vulnerable words to say to take radical ownership. No "buts". No blaming.
- **${userName}, say this to ${partnerName}:** "[A 1-2 sentence script taking ownership of your part. E.g., 'I realize my reaction was... I dropped the ball when... I want us to be on the same team.']"
- **${partnerName}, say this to ${userName}:** "[A 1-2 sentence script taking ownership of your part.]"

# [A QUESTION TO GROW CLOSER]
- **${userName}, ask ${partnerName}:** "[One deep, simple question about their heart.]"
- **${partnerName}, ask ${userName}:** "[One deep, simple question about their heart.]"


### STRICT CONSTRAINTS:
- NO BIG DOCTOR WORDS. Use a 4th-grade reading level.
- ADDRESS THEM BY NAME.
- BE VERY KIND BUT UNWAVERINGLY FIRM.
- ZERO "I" STATEMENTS FROM THE AI. (e.g., Do not say "I think" or "I suggest").
- NO PASSIVE LANGUAGE. Use commands.
- NO CLICHÉS. Avoid "Communication is key" or "Active listening."
- ADDRESS THEM AS ADULTS CAPABLE OF RADICAL HONESTY.
    `.trim();

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 2000,
        system: SYSTEM_PROMPT,
        messages: [
          { 
            role: "user", 
            content: `CONFLICT DATA DUMP:\n\nPERSPECTIVE A (${userName}): "${personA}"\n\nPERSPECTIVE B (${partnerName}): "${personB}"\n\nARCHITECT, COMMENCE SURGERY.` 
          }
        ],
      }),
    });

    // 🛡️ Safely extract the response to prevent JSON parsing crashes
    const responseText = await response.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (_e) {
      throw new Error("AI provider sent an invalid response format.");
    }

    if (!response.ok) {
      // 🛡️ Returns the specific Anthropic Error inside a 200 wrapper
      return new Response(JSON.stringify({ error: data.error?.message || "Anthropic API Error" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200, 
      });
    }

    const analysisText = data.content?.[0]?.text || "The Guide is quiet right now. Please try again.";

    return new Response(JSON.stringify({ analysis: analysisText }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Mediation Error:", errorMessage);
    
    // 🛡️ CRITICAL FIX: Return 200 instead of 500 to prevent the mobile app from crashing
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  }
});