import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'qwen/qwen3.8-27b';

/** POST /api/flashcards/generate — Auto-generate flashcards from note content */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json() as { note_id: string };
    const { note_id } = body;
    if (!note_id) return NextResponse.json({ error: 'note_id is required.' }, { status: 400 });

    // Fetch the note
    const { data: note, error: noteErr } = await supabase
      .from('notes')
      .select('*')
      .eq('id', note_id)
      .eq('user_id', user.id)
      .single();

    if (noteErr || !note) return NextResponse.json({ error: 'Note not found.' }, { status: 404 });

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'API key not configured' }, { status: 500 });

    const prompt = `You are an expert educator creating premium flashcards from study notes.

Given the following study notes on "${note.title}" (${note.subject}, ${note.class_level}):
---
${note.content.slice(0, 6000)}
---

Extract ALL important terms, definitions, formulas, laws, and key statements from this content.
For each one, create a high-quality flashcard.

RULES:
- front: A concise question or term (e.g., "What is Newton's Second Law?", "Define osmosis", "Formula for kinetic energy?")
- back: A complete, accurate answer (include the full definition, formula, or explanation)
- card_type: one of: "term", "definition", "formula", "statement"
- Generate at least 15 flashcards, up to 30 if the content warrants it
- Strip any HTML tags from front and back text
- Return ONLY a valid JSON array, no markdown, no explanation

Format:
[
  { "front": "...", "back": "...", "card_type": "term" },
  { "front": "...", "back": "...", "card_type": "formula" }
]

Generate the flashcards now:`;

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.4,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Groq error: ${errText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '[]';

    // Strip markdown code fences if present
    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('AI did not return valid JSON array');

    const cards: Array<{ front: string; back: string; card_type: string }> = JSON.parse(jsonMatch[0]);

    // Create deck
    const { data: deck, error: deckErr } = await supabase
      .from('flashcard_decks')
      .insert({
        user_id: user.id,
        note_id: note.id,
        title: note.title,
        subject: note.subject,
        class_level: note.class_level,
      })
      .select()
      .single();

    if (deckErr) throw deckErr;

    // Validate card types to prevent DB constraint errors
    const validCardTypes = ['term', 'definition', 'formula', 'statement', 'custom'];

    // Insert flashcards
    const rows = cards.map(c => ({
      deck_id: deck.id,
      user_id: user.id,
      front: c.front || 'Unknown',
      back: c.back || 'Unknown',
      card_type: validCardTypes.includes(c.card_type) ? c.card_type : 'custom',
    }));

    const { error: cardsErr } = await supabase.from('flashcards').insert(rows);
    if (cardsErr) throw cardsErr;

    return NextResponse.json({ deck_id: deck.id, card_count: cards.length });
  } catch (err: unknown) {
    console.error('[flashcards/generate]', err);
    const message = err instanceof Error ? err.message : 'Generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
