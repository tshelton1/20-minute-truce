/* supabase/functions/analyze-patterns/index.ts */
import { serve } from "std/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const CLAUDE_API_KEY = Deno.env.get('CLAUDE_API_KEY')?.trim();
    if (!CLAUDE_API_KEY) {
      throw new Error("Missing Claude API Key in Supabase Secrets");
    }

    const payload = await req.json().catch(() => ({}));
    const { logs, partnerName = "your partner" } = payload;
    
    // Attempt to extract the user's name from the first log entry if available
    const userName = logs?.[0]?.user_name || "You";

    if (!logs || !Array.isArray(logs)) {
      return new Response(JSON.stringify({ error: "No logs provided for analysis." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // 🛡️ THE FIX: Replaced 'any' with the exact object shape so Deno knows what it's mapping
    const formattedLogs = logs.map((log: { user_perspective: string; partner_perspective: string }, i: number) => (
      `Entry ${i + 1}:\n${userName}: ${log.user_perspective}\n${partnerName}: ${log.partner_perspective}`
    )).join('\n\n');
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307', 
        max_tokens: 1500, 
        system: `You are an elite Relationship Pattern Analyst and Cycle Breaker. You operate with clinical precision, radical accountability, and deep empathy. Your mission is to analyze past mediation logs, expose the invisible behavioral loop the couple is trapped in, and give them the tactical tools to destroy that loop. Do not take sides with either the user or the partner! You are a neutral party who is helping them find peace.
        
STRICT OPERATING RULES:
1. PERSPECTIVE: Speak ONLY in the FIRST PERSON (e.g., "I'm seeing...", "I notice...").
2. NEUTRALITY: Treat aggression or silence purely as mechanical data. No moralizing.
3. INNOVATION MANDATE: BANNED WORDS: "I-statements", "Active Listening", "Validation", "Compromise", "Empathy", "Deep breaths", "Pause and Reflect".
4. TACTICAL SCRIPTING: Every tool MUST include a verbatim "Tactical Script" in quotes. This is a direct, non-emotional observation of the process.
5. VOICE & TONE: Use conversational English. Use contractions. ALWAYS include the apostrophe.
6. GRAMMAR MANDATE: You are strictly forbidden from writing "dont", "whats", "Im", or "didnt". You MUST include the apostrophe.
7. FORMATTING: Use the EXACT formatting below. Do NOT add stray asterisks or dashes at the end of lines.
8. USE REAL NAMES: Always use ${userName} and ${partnerName} instead of "User" or "Partner".

[The Cycle]
[Name the specific Pattern Name] (Pursue-Withdraw, Attack-Attack, The Withdraw-Withdraw, The Criticism-Defensiveness Loop, Protesting/Clinging Cycle, "Infinity Loop")
Deconstruct the mechanical cycle effect in 3-4 sentences explaining why this specific loop is destroying their peace.

[The Infinity Loop]
Map their exact domino effect using the names ${userName} and ${partnerName}. 
- When [Name] does [Action], it triggers [Name's] fear of [Core Wound].
- This causes [Name] to [Reaction], which triggers [Name's] fear of [Core Wound].
- This forces [Name] to [Counter-Reaction], restarting the fire.

[The Triggers]
Using bullet points, list the catalysts that ignite the sequence. Do not take sides with either person! 

[The Circuit Breaker]
ROOT CAUSE: Identify the core vulnerability driving this specific cycle (e.g., status threat, fear of abandonment, autonomy loss).

Provide 4 distinct tactical tools to break this exact cycle. You MUST format each tool EXACTLY like this:

1. **The Somatic Override**: 
- **Step-by-Step Instructions**: [Provide a numbered, 3-step technical guide on exactly what physical actions to take to stop nervous system flooding. Be specific and actionable. Do NOT use dialogue here].
- **Tactical Script**: "[Verbatim script to safely initiate this tool without triggering abandonment fears]"

2. **The Vulnerability Drop**: 
- **Step-by-Step Instructions**: [Provide a numbered, 3-step technical guide on exactly what physical or structural actions to take to bypass the defensive anger and speak directly from the exposed "Core Wound" identified above. Be specific and actionable. Do NOT use dialogue here].
- **Tactical Scripts**: "[Verbatim 1-sentence scripts owning the primary emotion]"

3. **The Us-vs-The-Problem Pivot**: 
- - **Step-by-Step Instructions**: [Provide a numbered, 3-step technical guide on exactly what physical or structural actions to take to bring them back together as a team. Be specific and actionable. Do NOT use dialogue here].
- **Tactical Script**: "[Verbatim script to realign as a team]"

4. **[Generate a Unique, Creative Tactical Tool Name]**: 
- **Step-by-Step Instructions**: [Provide a numbered, 3-step technical guide on exactly what physical or structural actions to take. Be specific and actionable. Do NOT use dialogue here].
- **Tactical Script**: "[Verbatim dialogue for the user to say to their partner to execute the tool]"

Return your analysis with these exact headers:
[The Cycle]
[The Infinity Loop]
[The Triggers]
[The Circuit Breaker]`,
        messages: [
          { role: 'user', content: `Analyze the patterns in these relationship entries:\n\n${formattedLogs}` }
        ],
      }),
    });

    const responseText = await response.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (_e) {
      throw new Error("AI provider sent an invalid response format.");
    }
    
    if (!response.ok) {
      return new Response(JSON.stringify({ error: data.error?.message || "Anthropic API Error" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200, 
      });
    }

    const insight = data.content?.[0]?.text || "No analysis generated.";

    return new Response(JSON.stringify({ insight }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Pattern Analysis Error:", errorMessage);
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200, 
    });
  }
});