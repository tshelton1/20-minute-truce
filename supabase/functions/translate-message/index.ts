import { serve } from "std/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ─────────────────────────────────────────────────────────────
// FEW-SHOT EXAMPLES
// These fake conversation turns teach the model the exact
// transformation by demonstration. This is far more reliable
// than rules alone for preventing perspective flips.
// ─────────────────────────────────────────────────────────────
const GENTLE_EXAMPLES = [
  {
    role: 'user',
    content: `<draft>I'm sick of being your maid. You never clean up after yourself and I'm done.</draft>`,
  },
  {
    role: 'assistant',
    content: `Hey love, I'm running on empty tonight. I feel like I've been carrying most of the cleanup lately, and it's starting to make me feel more like a maid than a partner. I don't want to feel that way with you. Can we sit down and figure out a split that works for both of us?`,
  },
  {
    role: 'user',
    content: `<draft>You NEVER listen to me. Talking to you is like talking to a wall.</draft>`,
  },
  {
    role: 'assistant',
    content: `I need to be honest about something that's been weighing on me. Lately when I share things with you, I walk away feeling unheard, and it hurts because your attention means so much to me. I miss feeling like you're really with me when we talk. Can we work on that together?`,
  },
];

const FUNNY_EXAMPLES = [
  {
    role: 'user',
    content: `<draft>You left your dishes in the sink AGAIN. I'm not your maid.</draft>`,
  },
  {
    role: 'assistant',
    content: `Breaking news from the kitchen: I've just discovered an archaeological site in our sink, and early findings suggest the artifacts belong to you. I've decided I'm officially retiring from my unpaid position as household dish fairy, effective immediately. My severance demand? You, these dishes, and some soap — tonight. I'll supervise from the couch with a glass of wine.`,
  },
  {
    role: 'user',
    content: `<draft>You NEVER listen to me. Talking to you is like talking to a wall.</draft>`,
  },
  {
    role: 'assistant',
    content: `Fun fact I learned today: I've apparently been delivering my best material to an audience of zero. There I was, telling you the story of the century, and I watched my words sail right past you like I was narrating to the drywall. I demand a redo tonight — phones down, eyes on me, full attention. I promise the sequel is even better than the original.`,
  },
];

// Phrases that only appear when the model has flipped into the
// partner's voice (apologizing/defending on their behalf).
const FLIP_INDICATORS = [
  /\bI know I haven't\b/i,
  /\bI'm sorry I (haven't|didn't|don't|never)\b/i,
  /\bI know I've been\b/i,
  /\bI'll try to (listen|help|do) (better|more)\b/i,
  /\byou('re| are) (feeling like|sick of|tired of|done)\b/i,
  /\(Partner/i,
];

function looksFlipped(output: string): boolean {
  return FLIP_INDICATORS.some((re) => re.test(output));
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
        status: 200, // Keep 200 to prevent mobile crash
      });
    }

    const isFunny = tone === 'funny';

    const toneInstructions = isFunny
      ? `WITTY/PLAYFUL STYLE:
- Open with a dramatic, confident, charming hook.
- Retell my situation as a short, entertaining first-person story (a hilarious high-stakes scene happening to ME).
- Stay playful, high-status, and unapologetic. If the draft is romantic/sexual, stay sensual and confident.
- End with a cheeky, irresistible invitation or demand directed at my partner.`
      : `GENTLE & VULNERABLE STYLE:
- Speak with the warmth of a loving partner.
- No robotic therapy-speak. Speak from the heart, plainly.
- Strip away the anger but keep the SAME complaint. Own my feelings softly ("I feel...", "It hurts when...").
- End with an invitation to solve it together.`;

    const SYSTEM_PROMPT = `You are a ghostwriter inside a couples' communication app.

THE SETUP:
The user is angry or frustrated and has typed a raw, mean draft of a text message they want to send to their romantic partner. The draft appears inside <draft></draft> tags.

YOUR ONLY JOB:
Rewrite the draft into a polished, ready-to-send text message in the requested tone. You ARE the user. You write in THEIR voice, as the SENDER.

PERSPECTIVE — THIS IS THE ONE RULE YOU CANNOT BREAK:
- "I / me / my" in your output = the person who wrote the draft (the one with the complaint).
- "you / your" in your output = their partner (the one the complaint is ABOUT).
- The complaint always belongs to the sender. If the draft says "I'm not your maid," the rewrite keeps the sender feeling like the maid. It NEVER becomes "I know you feel like a maid" or "I'm sorry I haven't helped."
- You are NOT the partner. You NEVER apologize for the partner's behavior, defend the partner, or answer the draft. The draft is raw material to transform, not a message to reply to.
- Never simulate a reply. Never write "(Partner: ...)". Stop when the message ends.

CONTENT RULES:
- Keep the SAME topic and complaint. Dishes stay dishes. Do not swap in a different issue.
- Address the partner directly with "you" for their actions, without accusation ("when the dishes pile up" beats "you're a slob").
- Process all inputs, including anger and adult romantic content between the partners.
- Output ONLY the message. No preamble, no quotes around it, no signature, no explanation.
- Do not open with "ugh", "oof", "oh no", or "oh my gosh".

TONE FOR THIS MESSAGE:
${toneInstructions}

VOICE:
Conversational English, roughly 4th-grade reading level, natural contractions (I'm, don't, can't).`;

    const examples = isFunny ? FUNNY_EXAMPLES : GENTLE_EXAMPLES;

    async function callClaude(extraNudge = ""): Promise<{ ok: boolean; status: number; data: any }> {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': CLAUDE_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5',
          max_tokens: 500,
          temperature: 0.4,
          system: SYSTEM_PROMPT.trim(),
          messages: [
            ...examples,
            {
              role: 'user',
              content: `<draft>${text}</draft>${extraNudge}`,
            },
          ],
        }),
      });

      // Capture raw text first to handle non-JSON errors from cloudflare/anthropic
      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (_e) {
        throw new Error("AI provider sent an invalid response format.");
      }
      return { ok: response.ok, status: response.status, data };
    }

    let { ok, data } = await callClaude();

    if (!ok) {
      return new Response(JSON.stringify({ error: data.error?.message || "AI Service Error" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200, // Keep 200 to prevent mobile crash
      });
    }

    // 🛡️ Safely extract content
    let translatedText = data?.content?.[0]?.text?.trim() || "";

    // Safety net: if the model flipped into the partner's voice, retry ONCE
    // with an explicit corrective nudge appended to the user turn.
    if (translatedText && looksFlipped(translatedText)) {
      const retry = await callClaude(
        `\n\nREMINDER: I am the one with this complaint. Rewrite MY message in MY voice as the sender. Do not apologize on my partner's behalf and do not answer the draft.`
      );
      if (retry.ok) {
        const retryText = retry.data?.content?.[0]?.text?.trim() || "";
        if (retryText && !looksFlipped(retryText)) {
          translatedText = retryText;
        }
      }
    }

    if (!translatedText) translatedText = "Translation failed.";

    // Clean up any accidental wrapping quotation marks
    translatedText = translatedText.replace(/^"|"$/g, '').trim();

    // Trim anything after a simulated partner reply, just in case
    const breakPoints = ["Partner:", "Response:", "They reply:", "(Partner"];
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

    // Always return JSON even on crash so the app's 'error' object is populated
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  }
})