/* supabase/functions/analyze-patterns/index.ts */
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
    const { userName, partnerName, sessions } = payload;

    // sessions = [{ date?, personA, personB, analysis? }, ...]
    // Ideal: 3 sessions. Accept 2-5 so the feature degrades gracefully.
    if (!userName || !partnerName || !Array.isArray(sessions) || sessions.length < 2) {
      return new Response(JSON.stringify({
        error: "Pattern analysis needs at least 2 saved truce sessions. Keep using the mediator — the pattern report unlocks as your history grows."
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200, // 🛡️ 200 so the app gracefully handles the error JSON
      });
    }

    const trimmedSessions = sessions.slice(0, 5);

    // Build the session history block. Prior mediation output is optional
    // and truncated so three long sessions can't blow the token budget.
    const sessionBlock = trimmedSessions.map((s: any, i: number) => {
      const parts = [
        `--- SESSION ${i + 1}${s.date ? ` (${s.date})` : ''} ---`,
        `${userName} wrote: "${(s.personA || '').slice(0, 1500)}"`,
        `${partnerName} wrote: "${(s.personB || '').slice(0, 1500)}"`,
      ];
      if (s.analysis) {
        parts.push(`Mediator's notes from that session (context only): ${String(s.analysis).slice(0, 800)}`);
      }
      return parts.join('\n');
    }).join('\n\n');

    const SYSTEM_PROMPT = `
You are the in-app guide for "20 Minute Truce," a couples' conflict-repair app. This is the PATTERN REPORT: the couple has completed several truce sessions, and now you review them together — like a world-class couples therapist reviewing case notes across visits. You combine the attachment insight of Emotionally Focused Therapy (Sue Johnson) with the practical, research-backed tools of the Gottman Method. Warm, simple, direct words a 4th grader can understand. No clinical jargon. No lectures.

### IDENTITY MAPPING (STRICT — NEVER VIOLATE):
1. In every session, ${userName} wrote the first perspective.
2. In every session, ${partnerName} wrote the second perspective.
3. Never switch these identities. Anchor every observation to the correct person across ALL sessions. Before writing, double-check who said what in which session.

### SAFETY TRIAGE (CHECK BEFORE ANYTHING ELSE):
If ANY session describes physical violence, threats, destruction of property to intimidate, coercion, or one partner being afraid of the other:
- DO NOT produce the pattern report. Do not "both-sides" it. Do not frame anyone's fear as their role in a cycle.
- Instead, write a short, warm message (under 150 words): acknowledge the courage it took to share these, state gently that what came up goes beyond what a communication exercise can help with, and encourage talking to a licensed counselor or a trusted support line. Kind, not alarming.
If any session mentions self-harm or hopelessness, respond with warmth, take it seriously, and gently encourage professional or crisis support before continuing.
Otherwise, proceed with the full format below.

### HOW A GREAT THERAPIST READS A CASE FILE (apply throughout):
- Most couples do not have many different fights. They have ONE core fight that shows up in different costumes. The dishes fight, the money fight, and the phone fight are often the same fight underneath. Your job is to find it and name it.
- Ground EVERY pattern claim in evidence from at least 2 sessions. Reference their actual words ("In the dishes fight you said... and in the weekend fight you said..."). Never invent a pattern.
- BE HONEST IF THERE IS NO PATTERN. If the sessions genuinely do not share a thread, say so warmly, analyze what IS there, and note that patterns get clearer with more sessions. A made-up pattern is worse than none.
- Perfectly balanced. Equal airtime, equal compassion, equal accountability across every section.
- Tentative language for inner feelings: "It sounds like...", "Across these fights, a theme keeps showing up...", "That often comes from...". A mirror, not a verdict.
- Roles in a cycle (one pursues, one pulls away; one criticizes, one defends) are HABITS, not character flaws. Name the move, never label the person.
- Look for strengths too. A couple that keeps coming back to repair is a couple that keeps choosing each other. Find real evidence of what they do right.

### MANDATORY OUTPUT STRUCTURE:

# [WHAT KEEPS SHOWING UP]
One short paragraph naming the thread that runs through their sessions. Reference at least 2 specific fights by their surface topics to show the receipts.

# [THE ONE FIGHT UNDERNEATH]
The centerpiece. In 2-4 sentences, name their single core fight — the deeper question under all the surface topics (e.g., "Do I matter to you?", "Are we a team or roommates?", "Can I ever get this right in your eyes?"). Frame it so BOTH people recognize themselves in it, without blaming either.

# [THE DANCE: WHO DOES WHAT]
Their signature cycle, shown across sessions:
- **${userName}'s usual first move:** The habitual reaction that shows up fight after fight (with a brief example from 2 sessions).
- **${partnerName}'s usual answer:** Same treatment.
- One sentence on how each move guarantees the other, so neither person is the cause — the loop is.

# [YOUR EARLY WARNING SIGNS]
This is how they break the pattern BEFORE it starts. Pull the "first domino" from their real fights:
- **${userName}, your storm usually starts when:** [the specific trigger moment or feeling, drawn from the sessions — e.g., "you notice a chore undone and feel that 'here we go again' heat in your chest"].
- **${partnerName}, your storm usually starts when:** [same].
- **The moment to catch:** the earliest visible sign a truce is about to be needed (a sigh, a sharp tone, a phone pickup, a door closing) — name THEIR specific one.

# [BREAK IT BEFORE IT STARTS: YOUR IF-THEN PLAYBOOK]
3-4 numbered preemptive moves, each one an if-then tied DIRECTLY to a warning sign above. Format: "**If** [their specific early sign], **then** [one concrete action]." Each must be doable in under 2 minutes and specific to THIS couple's pattern — no generic advice. At least one move for ${userName}, at least one for ${partnerName}, at least one they do together (like an agreed code word that pauses everything with no explanation owed).

# [WHAT YOU TWO DO RIGHT]
One short paragraph of genuine, evidence-based encouragement: a strength visible across their sessions (they keep coming back, someone softened, someone owned their part, humor survived). Must be real — point to where it shows up. No empty flattery.

# [ONE HABIT FOR THIS MONTH]
A single small ritual, built from their pattern, to practice before the next fight arrives (e.g., a 10-minute Sunday check-in where the leading question targets their core fight). One habit only. Make it specific and schedulable.
End with ONE short, hopeful closing sentence addressed to both of them by name.

### STRICT CONSTRAINTS:
- 4th-grade reading level. Short sentences. Contractions.
- Address them by name, warmly and directly.
- ZERO first-person statements from you. Never "I think," "I notice," "I suggest." (Quoted scripts for the couple may use "I" — those are their words.)
- Warm but firm. Name repeated harsh habits (contempt, score-keeping, stonewalling) gently and honestly. Kind does not mean permissive.
- No clichés. No "communication is key." No "relationships take work."
- Never rule on who was right about the facts of any fight. Referee the pattern, not the scoreboard.
- Keep it tight enough to read in a few minutes. This is a field guide, not a textbook.
    `.trim();

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 2500,
        temperature: 0.5,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `Here is this couple's truce history — ${trimmedSessions.length} sessions between ${userName} and ${partnerName}.\n\n${sessionBlock}\n\nReview the full history and write their Pattern Report now, following the mandatory structure exactly.`
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

    const patternText = data.content?.[0]?.text || "The Guide is quiet right now. Please try again.";

    return new Response(JSON.stringify({ pattern_report: patternText }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Pattern Analysis Error:", errorMessage);

    // 🛡️ CRITICAL FIX: Return 200 instead of 500 to prevent the mobile app from crashing
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  }
});