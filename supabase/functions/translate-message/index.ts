import { serve } from "std/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ─────────────────────────────────────────────────────────────
// FEW-SHOT EXAMPLES
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
    content: `<draft>You blew half our rent on stupid garbage again. You have the financial maturity of a toddler. I'm sick of carrying your weight.</draft>`,
  },
  {
    role: 'assistant',
    content: `I've been carrying a lot of worry about our money lately, and I need to say it out loud. When big purchases happen without us deciding together, I feel alone with the stress of keeping us afloat. Can we sit down tonight and get back on the same team with our budget?`,
  },
  {
    role: 'user',
    content: `<draft>Why are you still acting so crazy? I said I was sorry for coming home late without texting you and ruining the dinner you cooked for us.</draft>`,
  },
  {
    role: 'assistant',
    content: `I know I messed up — coming home late with no text after you cooked for us was thoughtless, and I'm truly sorry. I hate that I hurt you and wasted the evening you put care into. Can we start over tonight? I want to make it right and feel close to you again.`,
  },
];

const FUNNY_EXAMPLES = [
  {
    role: 'user',
    content: `<draft>You left your dishes in the sink AGAIN. I'm not your maid.</draft>`,
  },
  {
    role: 'assistant',
    content: `The dishes have been in the sink so long I'm pretty sure they are filing for squatter's rights. 🍽️ I'm feeling a little overwhelmed with the house stuff lately and could really use my teammate back. Can we tackle the kitchen together tonight?`,
  },
  {
    role: 'user',
    content: `<draft>You blew half our rent on stupid garbage again. You have the financial maturity of a toddler. I'm sick of carrying your weight.</draft>`,
  },
  {
    role: 'assistant',
    content: `Watching our account balance drop like a roller coaster is giving me secondhand motion sickness. 🎢 I love you, but carrying the financial worry alone is starting to weigh on me. Can we sit down tonight and get back on the same team with our budget?`,
  },
  {
    role: 'user',
    content: `<draft>Why are you acting so crazy? I said I was sorry for coming home late and for not texting you.</draft>`,
  },
  {
    role: 'assistant',
    content: `I've officially earned my VIP pass to the doghouse tonight, haven't I? 🐕 I know I dropped the ball and I hate that I made you feel blown off. I'd love to order your favorite food and spend the rest of the night making it up to you, if you're open to it? 💙`,
  },
];

// Phrases that mean the model answered AS the partner instead of rewriting AS the sender
const PARTNER_REPLY_FLIP_INDICATORS = [
  /\bI appreciate (you|that you)\b/i,
  /\bI appreciate you saying sorry\b/i,
  /\bI'm still (pretty )?hurt\b/i,
  /\bI need more than the apology\b/i,
  /\bI know you (didn't|did not) mean\b/i,
  /\bI'm not trying to punish you\b/i,
  /\bwhen you came home late\b/i,
  /\bI need you to understand\b/i,
  /\bI'm not trying to be difficult\b/i,
  /\bI hear (you|that)\b/i,
  /\bI understand (you|that|how)\b/i,
  /\bI get it\b/i,
  /\(Partner/i,
];

const SENDER_CONFESSED_FLIP_INDICATORS = [
  /\bI lied\b/i,
  /\bI('ve| have) lied\b/i,
  /\bI straight-up lied\b/i,
  /\bthat's on me\b/i,
  /\bI just torched\b/i,
  /\bI completely tanked\b/i,
];

type SenderRole = 'apologizing' | 'frustrated' | 'neutral';

function detectSenderRole(text: string): SenderRole {
  const t = text.toLowerCase();

  // Check apology ownership FIRST — even if the draft also says "why are you acting crazy"
  if (
    t.includes('i said sorry') || t.includes('i already said sorry') ||
    t.includes('i apologized') || t.includes('i already apologized') ||
    t.includes('i messed up') || t.includes('i screwed up') ||
    t.includes('it was my fault') || t.includes('my fault') ||
    t.includes('i was wrong') || t.includes('i forgot to text') ||
    t.includes('i came home late') || t.includes('i know i was late') ||
    t.includes('i said i was sorry')
  ) {
    return 'apologizing';
  }

  if (
    t.includes('you never') || t.includes('you always') ||
    t.includes('you spent') || t.includes('you blew') ||
    t.includes('you lied') || t.includes('you forgot') ||
    t.includes('you don\'t') || t.includes('you didn\'t') ||
    t.includes('you came home') || t.includes('you were late') ||
    t.includes('you left') || t.includes('you ate') ||
    t.includes('you keep') || t.includes('you make me') ||
    t.includes('you treat') || t.includes('you have the') ||
    t.includes('why do you') || t.includes('why are you') ||
    t.includes('how you spend') || t.includes('how you act') ||
    t.includes('when you') || t.includes('you never listen') ||
    t.includes('you still') || t.includes('how could you') ||
    t.includes('i\'m not your maid') || t.includes('i saw the') ||
    t.includes('i opened the')
  ) {
    return 'frustrated';
  }

  return 'neutral';
}

function buildSystemPrompt(isFunny: boolean, role: SenderRole): string {
  const noFlipRule = `NEVER CHANGE PERSPECTIVE — THIS IS THE #1 RULE:
You are a GHOSTWRITER. Rewrite the draft so the SAME person can send it.
- Do NOT reply to the draft.
- Do NOT write as the partner receiving the message.
- Do NOT start with "I appreciate you saying sorry" or "I'm still hurt about what you did" when the draft is the person who already apologized.
- "I / me / my" in the output = the person who typed the draft.
- "you / your" in the output = their partner.
If the draft says "I said I was sorry for being late," the output must sound like the late person owning it and wanting to reconnect — NEVER like the person who cooked dinner and is still upset.`;

  const roleRule = role === 'apologizing'
    ? `SENDER CONTEXT: The sender already apologized for something THEY did (lateness, no text, etc.). They are frustrated their partner is still upset. Write as the sender — the one who messed up — owning the mistake warmly and inviting reconnection. Do NOT write as the hurt partner receiving the apology.`
    : role === 'frustrated'
    ? `SENDER CONTEXT: The sender is frustrated or hurt by something their PARTNER did. Keep the partner as the one who caused the problem. Never make the sender apologize for the partner's behavior.`
    : `SENDER CONTEXT: Write from the perspective of the person who typed this draft.`;

  const toneRule = isFunny
    ? `WITTY STYLE — follow this formula every time:
1. DIFFUSE: Open with one witty/funny analogy that reframes the situation (NOT the accusation, NOT a reply). Self-deprecating humor is perfect when the sender messed up.
2. REAL POINT: Make the actual feeling or ownership clear in one short line.
3. COME TOGETHER: End with a warm, cheeky invitation to reconnect or solve it together.
4-5 sentences max. 1-3 emojis welcome. Never lecture. Never sound like a therapist.`
    : `GENTLE STYLE — follow this formula every time:
1. DIFFUSE: Soften the mean edge. Strip anger/insults but keep the same situation.
2. OWN THE FEELING: Speak vulnerably from the sender's heart ("I feel...", "I'm sorry I...", "I hate that I...").
3. COME TOGETHER: End with a warm invitation to solve it or reconnect together.
3-5 sentences max. No robotic therapy-speak.`;

  return `You are a ghostwriter inside a couples' communication app.

${noFlipRule}

${roleRule}

YOUR ONLY JOB: Rewrite the text inside <draft></draft> into a polished, ready-to-send message in the requested tone. Output ONLY that message — no preamble, quotes, labels, or explanation.

${toneRule}

VOICE: Conversational English, 4th-grade reading level, natural contractions.
Never ask for more context. Never refuse. Always translate.`;
}

function looksFlipped(role: SenderRole, output: string): boolean {
  if (role === 'apologizing') {
    for (const re of PARTNER_REPLY_FLIP_INDICATORS) {
      if (re.test(output)) return true;
    }
  }

  if (role === 'frustrated') {
    for (const re of SENDER_CONFESSED_FLIP_INDICATORS) {
      if (re.test(output)) return true;
    }
    // Partner-reply voice is always wrong when the sender is the frustrated one
    if (/\bI appreciate (you|that you)\b/i.test(output)) return true;
    if (/\bI'm still (pretty )?hurt\b/i.test(output)) return true;
  }

  return false;
}

function retryNudgeFor(role: SenderRole): string {
  if (role === 'apologizing') {
    return `\n\nCRITICAL FIX: You wrote as the PARTNER who is still hurt. Wrong. Rewrite as the SENDER who already apologized for being late / not texting. Own the mistake with warmth (and wit if witty mode), then invite reconnection. Never say "I appreciate you saying sorry."`;
  }
  if (role === 'frustrated') {
    return `\n\nCRITICAL FIX: You flipped perspective. The draft blames the PARTNER. Rewrite as the frustrated SENDER about what the partner did — do not confess or apologize for the partner's actions.`;
  }
  return `\n\nCRITICAL FIX: Rewrite in the draft author's voice only. Do not reply as their partner.`;
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
    const { text, tone = 'gentle' } = payload;

    if (!text || text.trim().length === 0) {
      return new Response(JSON.stringify({
        error: "STOP! You're firing blanks! We can't weaponize your words if the chamber is empty. Pour your raw emotions into the box first, then let's turn that conflict into a connection."
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const isFunny = tone === 'funny';
    const role = detectSenderRole(text);
    const systemPrompt = buildSystemPrompt(isFunny, role);
    const examples = isFunny ? FUNNY_EXAMPLES : GENTLE_EXAMPLES;

    async function callClaude(extraNudge = ""): Promise<{ ok: boolean; data: any }> {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': CLAUDE_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5',
          max_tokens: 400,
          temperature: isFunny ? 0.8 : 0.4,
          system: systemPrompt,
          messages: [
            ...examples,
            {
              role: 'user',
              content: `<draft>${text}</draft>${extraNudge}`,
            },
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
      return { ok: response.ok, data };
    }

    let { ok, data } = await callClaude();

    if (!ok) {
      return new Response(JSON.stringify({ error: data.error?.message || "AI Service Error" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    let translatedText = data?.content?.[0]?.text?.trim() || "";

    if (translatedText && looksFlipped(role, translatedText)) {
      const retry = await callClaude(retryNudgeFor(role));
      if (retry.ok) {
        const retryText = retry.data?.content?.[0]?.text?.trim() || "";
        if (retryText && !looksFlipped(role, retryText)) {
          translatedText = retryText;
        }
      }
    }

    if (!translatedText) translatedText = "Translation failed.";
    translatedText = translatedText.replace(/^"|"$/g, '').trim();

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
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  }
})
