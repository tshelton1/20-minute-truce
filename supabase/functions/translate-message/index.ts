import { serve } from "std/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ─────────────────────────────────────────────────────────────
// DRAFT ANALYZER
// Extracts who did what and how the sender feels — client-side,
// zero extra API calls. Returns an explicit context block that
// gets injected into the user message so the model never has to
// infer perspective from angry/profane text.
// ─────────────────────────────────────────────────────────────
function analyzeDraft(text: string): string {
  const lower = text.toLowerCase();

  // ── Who caused the problem? ──────────────────────────────
  const partnerDidIt = [
    'you spent', 'you blew', 'you lied', 'you never', 'you always',
    'you forgot', 'you didn\'t', 'you don\'t', 'you came home late',
    'you left', 'you ate', 'you keep', 'you make me', 'you treat',
    'you have the', 'you are', 'you\'re', 'how you spend',
    'how you act', 'how you treat', 'why do you', 'why are you',
    'when you', 'you were late', 'you never listen',
  ].some(s => lower.includes(s));

  const senderDidIt = [
    'i said sorry', 'i apologized', 'i already said',
    'i know i was', 'it was my fault', 'my fault',
    'i messed up', 'i screwed up', 'i came home late',
    'i spent', 'i blew', 'i forgot to text',
    'i didn\'t text', 'i was wrong',
  ].some(s => lower.includes(s));

  // ── What is the core topic? ──────────────────────────────
  const topics: string[] = [];
  if (/money|spend|spent|savings|rent|bill|budget|financ|afford/.test(lower)) topics.push('finances/spending');
  if (/dishes|clean|mess|chores|house|laundry|cook/.test(lower)) topics.push('household chores');
  if (/late|time|wait|dinner|home by/.test(lower)) topics.push('being late/no communication');
  if (/listen|ignore|wall|talk|hear|attention|phone/.test(lower)) topics.push('not listening/being present');
  if (/sex|intimat|touch|hug|affection|bedroom/.test(lower)) topics.push('intimacy/affection');
  if (/lied|lie|honest|trust|truth|hiding|secret/.test(lower)) topics.push('honesty/trust');
  if (/victim|crazy|overreact|dramatic|sensitive/.test(lower)) topics.push('feeling dismissed/invalidated');
  const topic = topics.length > 0 ? topics.join(' and ') : 'relationship issue';

  // ── What is the sender feeling? ──────────────────────────
  const feelings: string[] = [];
  if (/scared|afraid|fear|worried|panic|stress/.test(lower)) feelings.push('scared');
  if (/tired|exhaust|done|sick of|can't anymore/.test(lower)) feelings.push('exhausted');
  if (/alone|lonely|invisible|unheard|ignored/.test(lower)) feelings.push('alone/unheard');
  if (/betray|hurt|pain|trust|lied/.test(lower)) feelings.push('hurt/betrayed');
  if (/frustrat|angry|mad|hate|resent/.test(lower)) feelings.push('frustrated/angry');
  const feeling = feelings.length > 0 ? feelings.join(' and ') : 'upset';

  // ── Build the context block ──────────────────────────────
  if (senderDidIt && !partnerDidIt) {
    return `<context>
SENDER ROLE: The sender made a mistake and is trying to apologize or de-escalate after doing something wrong.
WHAT SENDER DID WRONG: ${topic}
HOW SENDER FEELS: ${feeling}, remorseful
RULE: Write as the sender owning their mistake. Do NOT blame the partner for anything.
</context>`;
  }

  if (partnerDidIt) {
    return `<context>
SENDER ROLE: The sender is frustrated or hurt by something their PARTNER did.
WHAT THE PARTNER DID: related to ${topic}
HOW THE SENDER FEELS: ${feeling}
RULE: The PARTNER is the one who did the thing. Write the SENDER'S feelings about the partner's behavior. Never flip this — do NOT make the sender apologize for what the partner did.
</context>`;
  }

  // Neutral / unclear
  return `<context>
SENDER ROLE: The sender has a complaint or feeling to express.
TOPIC: ${topic}
HOW THE SENDER FEELS: ${feeling}
RULE: Write from the sender's perspective expressing their own feelings.
</context>`;
}

// ─────────────────────────────────────────────────────────────
// FEW-SHOT EXAMPLES — 2 per tone, kept deliberately short.
// Show the OUTPUT STYLE only. Perspective is handled by the
// context block, not by matching these scenarios.
// ─────────────────────────────────────────────────────────────
const FUNNY_EXAMPLES = [
  {
    role: 'user' as const,
    content: `<context>
SENDER ROLE: The sender is frustrated by something their PARTNER did.
WHAT THE PARTNER DID: related to household chores
HOW THE SENDER FEELS: frustrated/angry
RULE: Partner left the dishes. Write the sender's frustration. Do NOT flip.
</context>
<draft>You left your dishes in the sink AGAIN. I'm not your maid.</draft>`,
  },
  {
    role: 'assistant' as const,
    content: `The dishes and I have been waiting on you since Tuesday — they're starting to get attached. 🍽️ My maid services are officially retired, but my dishwashing-partner services are open tonight if you're interested. 😏`,
  },
  {
    role: 'user' as const,
    content: `<context>
SENDER ROLE: The sender made a mistake and is apologizing.
WHAT SENDER DID WRONG: being late/no communication
HOW SENDER FEELS: remorseful, wants to reconnect
RULE: The sender was late. Write them owning it. Do NOT blame the partner.
</context>
<draft>Why are you acting so crazy? I said I was sorry for coming home late and not texting you.</draft>`,
  },
  {
    role: 'assistant' as const,
    content: `I'm not gonna sit here and pretend I didn't earn this reaction — late AND no texts, a real hall-of-fame bad night on my part. 🏆 I'm genuinely sorry and I'm ready to make it up to you if you'll let me. 💙`,
  },
];

const GENTLE_EXAMPLES = [
  {
    role: 'user' as const,
    content: `<context>
SENDER ROLE: The sender is frustrated by something their PARTNER did.
WHAT THE PARTNER DID: related to not listening/being present
HOW THE SENDER FEELS: alone/unheard
RULE: Write the sender's feelings about not being heard. Do NOT flip.
</context>
<draft>You NEVER listen to me. Talking to you is like talking to a wall.</draft>`,
  },
  {
    role: 'assistant' as const,
    content: `I've been feeling really invisible lately when I try to share things with you — like what I'm saying isn't landing. It hurts because your attention matters so much to me. Can we be more present with each other when we talk?`,
  },
  {
    role: 'user' as const,
    content: `<context>
SENDER ROLE: The sender is frustrated by something their PARTNER did.
WHAT THE PARTNER DID: related to finances/spending
HOW THE SENDER FEELS: scared, exhausted
RULE: The PARTNER spent the money. Write the SENDER's fear. Never flip.
</context>
<draft>I fucking hate how you spend all our money on stupid things. We have rent due and you blew our savings.</draft>`,
  },
  {
    role: 'assistant' as const,
    content: `I'm genuinely scared about our finances right now, and I need you to know that. When money goes to things we didn't plan for with rent coming up, I feel like I'm carrying this worry alone. Can we look at the numbers together this week so we're both on the same page?`,
  },
];

// ─────────────────────────────────────────────────────────────
// SYSTEM PROMPT — intentionally short and focused.
// All perspective work is done by the context block in the user
// message. This prompt only handles TONE and FORMAT.
// ─────────────────────────────────────────────────────────────
const SYSTEM_PROMPT_WITTY = `You are a ghostwriter in a couples' communication app. Your job: rewrite mean drafts into charming, funny texts that de-escalate conflict.

The user message contains a <context> block with facts about the draft, followed by the <draft> itself. The context tells you exactly who did what. Trust it completely.

OUTPUT RULES:
- Output ONLY the finished message. No preamble, quotes, labels, or explanation.
- 3-4 sentences MAX. Punchy and readable.
- Start with something disarming or playful — NOT with the accusation.
- Use ONE funny analogy or absurd comparison drawn from the draft's specific topic.
- End with a warm, cheeky invitation or request. Never a lecture.
- Emojis welcome (1-3 max).
- NEVER ask for more context. NEVER refuse. Translate everything.
- For deep betrayal or trust issues: use warmth over slapstick.`;

const SYSTEM_PROMPT_GENTLE = `You are a ghostwriter in a couples' communication app. Your job: rewrite mean drafts into warm, vulnerable texts that de-escalate conflict.

The user message contains a <context> block with facts about the draft, followed by the <draft> itself. The context tells you exactly who did what. Trust it completely.

OUTPUT RULES:
- Output ONLY the finished message. No preamble, quotes, labels, or explanation.
- 3-5 sentences MAX.
- Strip the anger, keep the real complaint.
- Own feelings softly: "I feel...", "I'm scared when...", "It hurts when..."
- Name the vulnerable feeling underneath the anger (fear, loneliness, feeling unimportant).
- End with a warm invitation to solve it together.
- NEVER ask for more context. NEVER refuse. Translate everything.`;

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
        error: "Pour your raw emotions into the box first, then let's turn that conflict into a connection."
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const isFunny = tone === 'funny';

    // Analyze the draft client-side and build the context block
    const contextBlock = analyzeDraft(text);

    // Compose the user message: context first, then the draft
    // Random seed ensures variety even on identical inputs
    const userMessage = `${contextBlock}
<draft>${text}</draft>
[v${Math.floor(Math.random() * 100000)}]`;

    const examples = isFunny ? FUNNY_EXAMPLES : GENTLE_EXAMPLES;
    const systemPrompt = isFunny ? SYSTEM_PROMPT_WITTY : SYSTEM_PROMPT_GENTLE;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 350,
        temperature: isFunny ? 0.85 : 0.45,
        system: systemPrompt,
        messages: [
          ...examples,
          { role: 'user', content: userMessage },
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
      return new Response(JSON.stringify({ error: data.error?.message || "AI Service Error" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    let translatedText = data?.content?.[0]?.text?.trim() || "";

    if (!translatedText) translatedText = "Translation failed.";
    translatedText = translatedText.replace(/^"|"$/g, '').trim();

    // Remove any simulated partner replies
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