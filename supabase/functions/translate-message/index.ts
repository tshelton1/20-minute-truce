import { serve } from "std/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ─────────────────────────────────────────────────────────────
// ROLE DETECTION
// Simple, no .some() closures — avoids Deno bundler scoping bug.
// Returns whether the sender is apologizing or frustrated.
// ─────────────────────────────────────────────────────────────
function detectRole(text: string): 'apologizing' | 'frustrated' {
  const t = text.toLowerCase();
  if (
    t.includes('i said sorry') ||
    t.includes('i already said sorry') ||
    t.includes('i apologized') ||
    t.includes('i already apologized') ||
    t.includes('i messed up') ||
    t.includes('i screwed up') ||
    t.includes('it was my fault') ||
    t.includes('my fault') ||
    t.includes('i was wrong') ||
    t.includes('i forgot to text') ||
    t.includes('i came home late') ||
    t.includes('i know i was late') ||
    t.includes('i dropped the ball')
  ) {
    return 'apologizing';
  }
  return 'frustrated';
}

// ─────────────────────────────────────────────────────────────
// SYSTEM PROMPT BUILDER
// The role is baked into the identity statement at the very top —
// the model knows WHO it is before it reads a single word of the
// draft. This is the most reliable way to prevent perspective flip.
// ─────────────────────────────────────────────────────────────
function buildSystemPrompt(isFunny: boolean, role: 'apologizing' | 'frustrated'): string {

  const identity = role === 'apologizing'
    ? `You are ghostwriting a text message FOR THE PERSON WHO MADE A MISTAKE.
They did something wrong (came home late, forgot to text, spent money, etc.) and already said sorry.
They are now frustrated that their partner is still upset.
YOU ARE WRITING THEIR MESSAGE — the one who messed up, is apologizing, and wants to reconnect.
You are NOT writing the partner's response. Never write as the partner.`
    : `You are ghostwriting a text message FOR THE PERSON WHO IS UPSET.
Their partner did something wrong (spent money, came home late, didn't listen, etc.).
The sender is frustrated or hurt by what their PARTNER did.
YOU ARE WRITING THEIR MESSAGE — the person who is upset about what their partner did.
You are NOT writing the partner's response. Never flip this.`;

  const style = isFunny
    ? `WITTY STYLE — de-escalate with humor so the couple comes together:
1. OPEN with a funny analogy or absurd image drawn from the specific situation (money, dishes, lateness — whatever's in the draft). This is the de-escalation. A shared laugh opens the door.
2. ACKNOWLEDGE the real feeling briefly and warmly — one short sentence.
3. END with a warm invitation to solve it together. Cheeky and loving, not a lecture.
Format: 3-4 sentences. 1-2 emojis. Never start with the accusation. Use a completely fresh, unexpected analogy every time — never repeat the same image or comparison. Be creative and unpredictable.`
    : `GENTLE STYLE — de-escalate with vulnerability so the couple comes together:
1. OPEN by naming the real feeling underneath the anger (fear, loneliness, feeling unimportant).
2. EXPRESS the need softly — "I feel...", "It hurts when...", "I'm scared that..."
3. END with a warm invitation to solve it together.
Format: 3-5 sentences. No anger. No blame. Just the real feeling.`;

  return `${identity}

${style}

OUTPUT RULES:
- Output ONLY the finished message. No quotes, no labels, no preamble.
- Never ask for more context. Never refuse. Always translate.
- Never lecture or give a speech. Keep it personal and warm.
- The goal is always for the couple to come together at the end.`;
}

// ─────────────────────────────────────────────────────────────
// FEW-SHOT EXAMPLES
// Using the two examples the app owner specifically approved.
// Each demonstrates the correct voice AND the correct structure.
// ─────────────────────────────────────────────────────────────

// WITTY — FRUSTRATED sender (partner blew the money)
const WITTY_FRUSTRATED_EXAMPLES = [
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
    content: `<draft>You NEVER listen to me. Talking to you is like talking to a wall. I feel completely invisible.</draft>`,
  },
  {
    role: 'assistant',
    content: `I've been delivering what I think is Oscar-worthy material over here, and my audience of one seems to have left the building. 🎬 I don't want to feel invisible to you — can we put the phones down tonight and actually be present with each other?`,
  },
];

// WITTY — APOLOGIZING sender (they messed up, partner still upset)
const WITTY_APOLOGIZING_EXAMPLES = [
  {
    role: 'user',
    content: `<draft>Why are you acting so crazy? I said I was sorry for coming home late and for not texting you.</draft>`,
  },
  {
    role: 'assistant',
    content: `I've officially earned my VIP pass to the doghouse tonight, haven't I? 🐕 I know I dropped the ball and I hate that I made you feel blown off. I'd love to order your favorite food and spend the rest of the night making it up to you, if you're open to it? 💙`,
  },
  {
    role: 'user',
    content: `<draft>Why are you still being so dramatic? I told you I was sorry for spending that money.</draft>`,
  },
  {
    role: 'assistant',
    content: `Okay, I genuinely earned this reaction and I'm not going to pretend otherwise. 🙈 I messed up with the money and I hate that it put us in a tough spot. Can we order in, figure out a plan together, and let me start actually making this right tonight?`,
  },
];

// GENTLE — FRUSTRATED sender (partner did the thing)
const GENTLE_FRUSTRATED_EXAMPLES = [
  {
    role: 'user',
    content: `<draft>You blew half our rent on stupid garbage again. You have the financial maturity of a toddler. I'm sick of carrying your weight.</draft>`,
  },
  {
    role: 'assistant',
    content: `I'm feeling really scared about our finances right now and I need you to know that. When money goes somewhere unplanned with rent coming up, I feel like I'm carrying this fear alone. Can we sit down together this week and figure out a plan so we're both on the same page?`,
  },
  {
    role: 'user',
    content: `<draft>You NEVER listen to me. I feel like I'm invisible to you.</draft>`,
  },
  {
    role: 'assistant',
    content: `Lately when I share things with you, I walk away feeling like what I said didn't matter — and that hurts more than I've let on. I don't want to feel invisible to the person I love most. Can we be more intentional about really hearing each other?`,
  },
];

// GENTLE — APOLOGIZING sender (they messed up, want to reconnect)
const GENTLE_APOLOGIZING_EXAMPLES = [
  {
    role: 'user',
    content: `<draft>Why are you acting so crazy? I said I was sorry for coming home late and for not texting you.</draft>`,
  },
  {
    role: 'assistant',
    content: `I know my apology didn't make the hurt disappear, and I understand that. Coming home late without a single text wasn't fair to you and I genuinely regret it. I don't want to rush you — I just want us to be okay, and I'm ready to show up differently.`,
  },
  {
    role: 'user',
    content: `<draft>Why are you still mad? I already told you I was sorry for what I said.</draft>`,
  },
  {
    role: 'assistant',
    content: `I said sorry and I meant every word of it. I can see you're still hurting and I'm not going to dismiss that — I just want to understand what you need from me right now so I can actually help us heal this. I'm here and I'm not going anywhere.`,
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
        error: "Pour your raw emotions into the box first — then let's turn that conflict into a connection."
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const isFunny = tone === 'funny';
    const role = detectRole(text);

    // Pick the right example set based on tone + role
    let examples;
    if (isFunny && role === 'frustrated') examples = WITTY_FRUSTRATED_EXAMPLES;
    else if (isFunny && role === 'apologizing') examples = WITTY_APOLOGIZING_EXAMPLES;
    else if (!isFunny && role === 'frustrated') examples = GENTLE_FRUSTRATED_EXAMPLES;
    else examples = GENTLE_APOLOGIZING_EXAMPLES;

    const systemPrompt = buildSystemPrompt(isFunny, role);

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
          {
            role: 'user',
            content: isFunny
              ? `<draft>${text}</draft> [v${Math.floor(Math.random() * 100000)}] [Invent a brand new analogy not used before]`
              : `<draft>${text}</draft> [v${Math.floor(Math.random() * 100000)}]`,
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

    if (!response.ok) {
      return new Response(JSON.stringify({ error: data.error?.message || "AI Service Error" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    let translatedText = data?.content?.[0]?.text?.trim() || "";
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