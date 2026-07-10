import { serve } from "std/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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
  {
    role: 'user',
    content: `<draft>I saw the credit card bill. You lied to my face about how much you spent, period. You are completely untrustworthy and irresponsible.</draft>`,
  },
  {
    role: 'assistant',
    content: `I looked at the bill and the number didn't match what you told me, and that hurt more than the spending itself. I need to be able to trust you with our money — when you hide things from me, I feel like we're on different teams. Can we talk tonight about what happened and how we get back to honesty?`,
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
    content: `<draft>I saw the credit card bill. You lied to my face about how much you spent. You're completely untrustworthy.</draft>`,
  },
  {
    role: 'assistant',
    content: `The credit card bill and the story you told me showed up wearing two completely different outfits today. 💳 Honestly, the surprise hurt more than the numbers because I just want us to be a united front. Can we talk about what happened so we can get back to trusting each other?`,
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

const FLIP_INDICATORS = [
  /\bI know I haven't\b/i,
  /\bI'm sorry I (haven't|didn't|don't|never)\b/i,
  /\bI know I've been\b/i,
  /\bI'll try to (listen|help|do) (better|more)\b/i,
  /\byou('re| are) (feeling like|sick of|tired of|done)\b/i,
  /\(Partner/i,
  /\bI get it\b/i,
  /\bI hear (you|that)\b/i,
  /\bI understand (you|that|how)\b/i,
  /\bI know (you|that|how you)\b/i,
  /\bI appreciate that you apologized\b/i,
  /\bI know you meant it\b/i,
  /\bI'm still hurt\b/i,
  /\bI need you to understand why this matters\b/i,
  /\bI'm not trying to be difficult\b/i,
  /\bthat's on me\b/i,
  /\bI just torched\b/i,
  /\bI completely tanked\b/i,
  /\bI know I just\b/i,
  /\bI've become the financial parent\b/i,
];

const SENDER_CONFESSED_INDICATORS = [
  /\bI lied\b/i,
  /\bI('ve| have) lied\b/i,
  /\bI straight-up lied\b/i,
  /\bI hate that I (did|lied)\b/i,
  /\bhiding it was\b/i,
  /\bI cracked\b/i,
  /\bthe number I told you\b/i,
  /\bI don't want to be the person you can't believe\b/i,
  /\bI broke your trust\b/i,
  /\bI need to tell you what.{0,40}(happened|going on).{0,40}spending\b/i,
  /\bI hate that I\b/i,
  /\bI was wrong to (spend|hide|lie)\b/i,
  /\bI shouldn't have (spent|hidden|lied)\b/i,
];

type DraftPerspective = {
  accusesPartner: boolean;
  senderApologizing: boolean;
  hint: string;
  retryNudge: string;
};

function analyzeDraftPerspective(draft: string): DraftPerspective {
  const partnerDidBadThing =
    /\byou\b[^.!?\n]{0,100}\b(lied|spend|spent|blew|wasted|hid|hide|cheat|never|didn't|did not|always|broke|ruined|stole)\b/i.test(draft) ||
    /\byou('re| are)\b[^.!?\n]{0,50}\b(lying|untrustworthy|irresponsible|selfish|lazy|crazy|pathetic|wrong)\b/i.test(draft);

  const senderOwnsIt =
    /\b(i('m| am)? sorry|i said sorry|my bad|my fault)\b/i.test(draft) ||
    (/\bi\b/i.test(draft) && /\bi\b[^.!?\n]{0,80}\b(lied|spent|blew|wasted|hid|was wrong|messed up|screwed up)\b/i.test(draft));

  const accusesPartner = partnerDidBadThing && !senderOwnsIt;
  const senderApologizing = senderOwnsIt && !partnerDidBadThing;

  let hint = '';
  let retryNudge = '';

  if (accusesPartner) {
    hint = 'SENDER POV: The sender is upset at their PARTNER. Words like "you lied" or "you spent" mean the PARTNER did it. The sender may have discovered it ("I saw the bill") — that is NOT a confession. Never rewrite as if the sender lied, spent, or hid anything.';
    retryNudge = `\n\nCRITICAL PERSPECTIVE FIX: The draft blames the PARTNER ("you" did the bad thing). Your last attempt wrongly made the SENDER confess or apologize (e.g. "I lied"). Rewrite from the hurt/angry sender's voice — "you lied to me," NOT "I lied to you."`;
  } else if (senderApologizing) {
    hint = 'SENDER POV: The sender is apologizing for their own actions. Write as someone owning their mistake — do NOT flip blame onto the partner.';
    retryNudge = `\n\nCRITICAL PERSPECTIVE FIX: The draft shows the SENDER apologizing for their own actions. Write as the person who messed up — do NOT flip into the partner's hurt voice.`;
  }

  return { accusesPartner, senderApologizing, hint, retryNudge };
}

function looksFlipped(draft: string, output: string): boolean {
  if (FLIP_INDICATORS.some((re) => re.test(output))) return true;

  const { accusesPartner, senderApologizing } = analyzeDraftPerspective(draft);

  if (accusesPartner && SENDER_CONFESSED_INDICATORS.some((re) => re.test(output))) {
    return true;
  }

  if (senderApologizing && /\byou('re| are) (hurt|upset|angry)\b/i.test(output)) {
    return true;
  }

  return false;
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

    const toneInstructions = isFunny
      ? `WITTY & WARM TONE INSTRUCTIONS:
      
Your goal is to de-escalate tension through a disarming analogy, then immediately pivot to warm connection. Follow this exact 3-step formula every time:

1. THE DIFFUSER (The Analogy): Start the text with a clever, mildly absurd, or relatable analogy that reframes the situation humorously. This breaks the tension. Do NOT start with an accusation, "You", or the complaint itself. Keep it light, not mocking.
2. THE PIVOT (The Real Feeling): Drop the joke for one brief sentence to state the underlying feeling or need (e.g., "I'm feeling overwhelmed," "I just want us to be a team," "I miss you"). This draws the partner closer instead of pushing them away.
3. THE BRIDGE (The Ask): End with a warm, collaborative invitation to reconnect, talk, or solve the issue together tonight. 

RULES:
- 3 to 4 sentences maximum. Keep it punchy.
- Never lecture. Never sound like a therapist, parent, or financial advisor. 
- No sarcasm, no passive-aggression. The humor must be situational or self-deprecating, never an attack on the partner.
- Write entirely in the FIRST PERSON as the sender. Do not validate the partner's feelings or apologize on their behalf.
- Emojis are welcome to help punch up the analogy or add warmth to the ending.
- If the draft is an insult, translate the frustration underneath it into the Pivot.`
      : `GENTLE & VULNERABLE STYLE:
- Speak with the warmth of a loving partner.
- No AI or robotic therapy-speak. Speak from the heart, plainly.
- Strip away the anger but keep the SAME complaint. Own my feelings softly.
- End with an invitation to solve it together.`;

    const SYSTEM_PROMPT = `You are a ghostwriter inside a couples' communication app.

WHO IS THE SENDER — READ THIS FIRST:
Before writing anything, identify who is speaking in the draft.
The sender is the person who WROTE the draft — they are the one feeling frustrated and wanting to express it.

Critical: the sender's emotion and complaint must stay in the output. If the draft says "Why are you acting crazy? I said sorry," the sender is the one who apologized and is now frustrated their partner is still upset. The output speaks FOR that person — not for the partner who is upset.

NEVER assume the sender is the "wronged" party just because a wrong was mentioned. Read the draft to find out who is speaking, then write entirely from that person's perspective.

MONEY & BLAME DRAFTS — READ CAREFULLY:
When a draft is about money, spending, or one person's behavior, identify who is UPSET and who DID the thing.
- If the sender is angry AT their partner ("YOU blew our rent," "YOU spend too much"), the sender is the FRUSTRATED one. Translate their frustration and worry — never make the sender apologize for spending they didn't do.

TRUST & LYING DRAFTS — NEVER SWAP VICTIM AND PERPETRATOR:
When the draft says "you lied," "you hid," "you spent" — the PARTNER did it and the SENDER is hurt or angry about it.
- "I saw the bill" / "I opened the statement" = the sender DISCOVERED the partner's behavior. This is NOT the sender confessing.
- NEVER rewrite "you lied to me" as "I lied to you." That swaps who did the wrong thing.

YOUR ONLY JOB:
Rewrite the draft into a polished, ready-to-send text message in the requested tone. You ARE the user. You write in THEIR voice, as the SENDER.

PERSPECTIVE — NEVER BREAK THIS:
- "I / me / my" = the sender (the one with the complaint).
- "you / your" = their partner (the one the complaint is about).
- Never flip these. Never apologize on the partner's behalf. 

CONTENT RULES:
- Translate ALL couple complaints (money, intimacy, chores, jealousy, etc.). 
- Output ONLY the message. No preamble, no quotes, no signature.
- Do not open with "ugh", "oof", "oh no", or "oh my gosh".

TONE:
${toneInstructions}

VOICE: Conversational English, 4th-grade reading level, natural contractions.`;

    const perspective = analyzeDraftPerspective(text);
    const perspectiveHint = perspective.hint ? `\n\n[${perspective.hint}]` : '';
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
          max_tokens: 400,
          temperature: isFunny ? 0.8 : 0.4,
          system: SYSTEM_PROMPT.trim(),
          messages: [
            ...examples,
            {
              role: 'user',
              content: `<draft>${text}</draft>${perspectiveHint}${extraNudge}`,
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
      return { ok: response.ok, status: response.status, data };
    }

    let { ok, data } = await callClaude();

    if (!ok) {
      return new Response(JSON.stringify({ error: data.error?.message || "AI Service Error" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    let translatedText = data?.content?.[0]?.text?.trim() || "";

    if (translatedText && looksFlipped(text, translatedText)) {
      const retryNudge = perspective.retryNudge ||
        `\n\nREMINDER: I am the one with this complaint. Rewrite MY message in MY voice as the sender. Do not apologize on my partner's behalf.`;
      const retry = await callClaude(retryNudge);
      if (retry.ok) {
        const retryText = retry.data?.content?.[0]?.text?.trim() || "";
        if (retryText && !looksFlipped(text, retryText)) {
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