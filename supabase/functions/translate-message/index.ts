import { serve } from "std/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function detectSenderRole(text: string): 'apologizing' | 'frustrated' | 'neutral' {
  const t = text.toLowerCase();

  // Sender already apologized and wants partner to accept it
  if (
    t.includes('i said sorry') || t.includes('i already said sorry') ||
    t.includes('i apologized') || t.includes('i already apologized') ||
    t.includes('i messed up') || t.includes('i screwed up') ||
    t.includes('it was my fault') || t.includes('my fault') ||
    t.includes('i was wrong') || t.includes('i forgot to text') ||
    t.includes('i came home late') || t.includes('i know i was late')
  ) {
    return 'apologizing';
  }

  // Sender is frustrated at something the PARTNER did
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
    t.includes('you still') || t.includes('how could you')
  ) {
    return 'frustrated';
  }

  return 'neutral';
}

function buildSystemPrompt(isFunny: boolean, role: string): string {
  const roleRule = role === 'apologizing'
    ? 'SENDER CONTEXT: The sender already apologized for something they did. They are frustrated that their partner is STILL upset. Write as the sender — the one who apologized — expressing that they meant their apology and want to move forward. Do NOT write as the partner receiving the apology.'
    : role === 'frustrated'
    ? 'SENDER CONTEXT: The sender is frustrated or hurt by something their PARTNER did. The PARTNER is the one who caused the problem. Write the sender\'s feelings about what the partner did. NEVER swap this — do not make the sender apologize for the partner\'s behavior.'
    : 'SENDER CONTEXT: Write from the perspective of the person who typed this draft, expressing their feelings.';

  const toneRule = isFunny
    ? `STYLE: Witty text message. 4-5 sentences max. Open with a disarming funny analogy (NOT the accusation). State the real feeling lightly. End with a warm cheeky ask. 1-3 emojis welcome. Never lecture.`
    : `STYLE: Warm vulnerable text message. 3-5 sentences max. Strip the anger, keep the complaint. Own feelings softly ("I feel...", "I'm scared..."). End with an invitation to solve it together.`;

  return `You are a ghostwriter in a couples' communication app. Rewrite the draft inside <draft></draft> as a ready-to-send text message.

${roleRule}

${toneRule}

OUTPUT: Only the finished message. No preamble, quotes, labels, or explanation. Never ask for more context. Never refuse. Always translate.`;
}

// ─────────────────────────────────────────────────────────────
// FEW-SHOT EXAMPLES — 2 per tone, kept deliberately short.
// Show the OUTPUT STYLE only. Perspective is handled by the
// system prompt role rule, not by matching these scenarios.
// ─────────────────────────────────────────────────────────────
const FUNNY_EXAMPLES = [
  {
    role: 'user',
    content: `<draft>You left your dishes in the sink AGAIN. I'm not your maid.</draft>`,
  },
  {
    role: 'assistant',
    content: `The dishes and I have been waiting on you since Tuesday — they're starting to get attached. 🍽️ My maid services are officially retired, but my dishwashing-partner services are open tonight if you're interested. 😏`,
  },
  {
    role: 'user',
    content: `<draft>Why are you acting so crazy? I said I was sorry for coming home late and not texting you.</draft>`,
  },
  {
    role: 'assistant',
    content: `I'm not gonna sit here and pretend I didn't earn this reaction — late AND no texts, a real hall-of-fame bad night on my part. 🏆 I'm genuinely sorry and I'm ready to make it up to you if you'll let me. 💙`,
  },
];

const GENTLE_EXAMPLES = [
  {
    role: 'user',
    content: `<draft>You NEVER listen to me. Talking to you is like talking to a wall.</draft>`,
  },
  {
    role: 'assistant',
    content: `I've been feeling really invisible lately when I try to share things with you — like what I'm saying isn't landing. It hurts because your attention matters so much to me. Can we be more present with each other when we talk?`,
  },
  {
    role: 'user',
    content: `<draft>I fucking hate how you spend all our money on stupid things. We have rent due and you blew our savings.</draft>`,
  },
  {
    role: 'assistant',
    content: `I'm genuinely scared about our finances right now, and I need you to know that. When money goes to things we didn't plan for with rent coming up, I feel like I'm carrying this worry alone. Can we look at the numbers together this week so we're both on the same page?`,
  },
];

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
    const role = detectSenderRole(text);
    const systemPrompt = buildSystemPrompt(isFunny, role);

    // Random seed ensures variety even on identical inputs
    const userMessage = `<draft>${text}</draft>
[v${Math.floor(Math.random() * 100000)}]`;

    const examples = isFunny ? FUNNY_EXAMPLES : GENTLE_EXAMPLES;

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
