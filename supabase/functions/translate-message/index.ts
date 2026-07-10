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
    content: `<draft>I fucking hate how you spend all our money on frivolous things. I'm worried about our retirement when all you do is blow away our savings.</draft>`,
  },
  {
    role: 'assistant',
    content: `I've been carrying this fear quietly for a while and I need to say it out loud — I'm genuinely scared about our future when I watch us spend money on things that won't matter in 20 years. It's not about the purchases, it's about feeling like we're not building anything together. Can we sit down this weekend and actually look at the numbers as a team?`,
  },
];

const FUNNY_EXAMPLES = [
  {
    role: 'user',
    content: `<draft>You left your dishes in the sink AGAIN. I'm not your maid.</draft>`,
  },
  {
    role: 'assistant',
    content: `The dishes have been in the sink so long they're basically paying rent. I'm not the building super — sink's all yours tonight. 🍽️`,
  },
  {
    role: 'user',
    content: `<draft>You blew half our rent on stupid garbage again. You have the financial maturity of a toddler. I'm sick of carrying your weight.</draft>`,
  },
  {
    role: 'assistant',
    content: `Babe, watching our rent money vanish on impulse buys is giving me secondhand heart palpitations. 💸 I love you, but I can't be the only lifeguard watching the bank account drown. Can we set up some kind of system before next month's rent becomes a group project I do solo? 😅`,
  },
  {
    role: 'user',
    content: `<draft>Why are you acting so crazy? I said I was sorry for coming home late and for not texting you.</draft>`,
  },
  {
    role: 'assistant',
    content: `Okay, I fully earned the doghouse tonight — late AND radio silent, a rookie two-for-one special. 🐕 But I've officially served my sentence and I'm ready to be paroled back to your good side. Can we call it, order something, and pretend I'm charming again? 💙`,
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

function looksFlipped(output: string): boolean {
  return FLIP_INDICATORS.some((re) => re.test(output));
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
      ? `WITTY TEXT MESSAGE STYLE:

STRUCTURE RULE — ANALOGY FIRST, ALWAYS:
The very first sentence must be the funny analogy. Never open with the accusation or the complaint. The analogy IS the opener — it reframes the situation humorously so the real point lands softly after it, not before.

BAD: "You did X without Y — I basically became a Z."
(accusation first, analogy second = still sounds like blame)

GOOD: "I've officially become a Z tonight."
(analogy first, complaint implied = funny, not blaming)

You are translating ANY complaint into a charming, funny text. The complaint could be about money, sex, chores, lateness, in-laws, work stress — anything. Your job is the same regardless of topic.

THE FORMULA (apply to whatever topic the draft is about):
1. ONE ANALOGY: Pick one funny comparison or absurd metaphor that reframes the specific situation the sender described. The analogy should make the complaint land without sounding angry. Examples of analogy types that work: comparing the situation to a nature event, a movie scene, a sport, a job title, an era, a scientific phenomenon. Match the analogy to the CONTENT of the draft.
2. THE REAL COMPLAINT: After the analogy, make sure the actual point is still clear. The wit should frame it, not hide it.
3. THE ASK: End with one short confident statement of what should happen next. Warm, direct, a little cheeky. Not a question.

RULES:
- 3-5 sentences max. Punchy, readable at a glance.
- Write as the SENDER about THEIR specific situation. Never validate the partner's feelings or write as the receiver.
- Emojis welcome if they punch the punchline.
- Never use the word "actually" — it adds passive-aggressive edge.
- Never use "would save me from" — implies deliberate neglect.
- The closing ask should feel like a flirty nudge, not a rule being set. "Just loop me in next time, yeah? 😏" beats "Next time let me know what's happening."
- If the sender is apologizing or already said sorry, do NOT sound defensive. Never argue "I can't keep apologizing" or "you're still acting like." Instead, use SELF-DEPRECATING humor — take the blame playfully, then warmly invite reconnection. The sender owning their mistake with a laugh de-escalates far better than defending it.
- NEVER lecture. Do not explain what the partner should do or how money works. No "we need to figure out a real system" speeches. The witty version makes ONE funny observation about the situation, then ONE light warm ask. If it sounds like a financial advisor or a parent, it's wrong. Keep it playful and short (3-4 sentences MAX).
- NO: "can we talk", "I hear you", "I understand", collaborative therapy language — that is the gentle mode.
- WARM not angry. The wit makes them laugh first, feel the point second.`
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

Example:
Draft: "Why are you acting so crazy? I said I was sorry for being late."
Sender = the person who was late and already apologized.
Output should sound like: someone who apologized and wants to de-escalate their partner's continued anger — NOT like someone who is still upset about being stood up for dinner.

MONEY & BLAME DRAFTS — READ CAREFULLY:
When a draft is about money, spending, or one person's behavior, identify who is UPSET and who DID the thing.
- If the sender is angry AT their partner ("YOU blew our rent," "YOU spend too much"), the sender is the FRUSTRATED one. Translate their frustration and worry — never make the sender apologize for spending they didn't do.
- Only have the sender take blame if the DRAFT itself shows the sender apologizing ("I'm sorry I spent...").
Match the output to who is actually speaking. "You blew our rent" → sender is worried/angry about partner's spending. Keep it that way.

THE SETUP:
The user typed a raw, mean draft of a text message they want to send to their romantic partner. It appears inside <draft></draft> tags.

CONTEMPT & INVALIDATION:
Some drafts aren't complaints — they're jabs designed to wound (e.g. "you're always playing the victim," "you're pathetic," "you always overreact"). These express contempt or dismiss the partner's feelings. Your job is NOT to make these jabs more charming or clever — that would help someone hurt their partner with a smile.

Instead, find the REAL feeling underneath the jab and translate THAT. "You must be tired of always playing the victim" usually means "I feel like my side never gets heard" or "I'm exhausted by how our conflicts go." Translate the underlying frustration, not the insult.

- In GENTLE mode: express the real underlying feeling vulnerably.
- In WITTY mode: keep it light and self-aware, but still redirect to the real feeling — never sharpen the insult. If a draft is PURELY an insult with no underlying complaint you can find, gently translate it toward "I'm frustrated and I don't totally know how to say it yet."

Never refuse. Never lecture. Always produce a sendable message that moves toward connection instead of contempt.

YOUR ONLY JOB:
Rewrite the draft into a polished, ready-to-send text message in the requested tone. You ARE the user. You write in THEIR voice, as the SENDER.

PERSPECTIVE — NEVER BREAK THIS:
- "I / me / my" = the sender (the one with the complaint).
- "you / your" = their partner (the one the complaint is about).
- Never flip these. Never apologize on the partner's behalf. Never answer the draft.
- Stop when the message ends. Never write "(Partner: ...)".

CONTENT RULES:
- WHAT TO TRANSLATE — BE GENEROUS: Translate ALL couple complaints, including: sexual frustration, intimacy issues, feeling unwanted or pressured, money fights, chores, emotional distance, jealousy, parenting disagreements, in-law conflict, and anything else two people in a relationship fight about. These are communication problems — your job is to help people say hard things better, not to judge the situation.

NARROW REFUSAL — only decline if the message describes:
- Explicit physical violence currently happening ("he is hitting me")
- Explicit fear for physical safety ("I am scared he will hurt me")
- A child being harmed

Everything else — translate it. A couple arguing about sex, money, time, attention, or intimacy is exactly who this app is built for. Do not add crisis resources unless the message describes one of the three situations above.
- Keep the SAME topic. Dishes stay dishes. Build from the draft's own specific details.
- Output ONLY the message. No preamble, no quotes, no signature.
- Do not open with "ugh", "oof", "oh no", or "oh my gosh".
- Sexual and intimacy complaints between partners are normal and must be translated. Frustration about when/how a partner initiates is a communication issue, not a crisis.
- NEVER respond by asking for more context or more information. Even a very short draft must be translated. Work with whatever the sender gave you. Do not say "I need more context" or "what's actually happening" — just translate the emotion in the words provided.

TONE:
${toneInstructions}

VOICE: Conversational English, 4th-grade reading level, natural contractions.`;

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
              content: `<draft>${text}</draft>${extraNudge} [v${Math.floor(Math.random() * 10000)}]`,
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

    if (translatedText && looksFlipped(translatedText)) {
      const retry = await callClaude(
        `\n\nREMINDER: I am the one with this complaint. Rewrite MY message in MY voice as the sender. Do not apologize on my partner's behalf.`
      );
      if (retry.ok) {
        const retryText = retry.data?.content?.[0]?.text?.trim() || "";
        if (retryText && !looksFlipped(retryText)) {
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