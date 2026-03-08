import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from "@google/generative-ai";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { message, history } = req.body;
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    const { data: knowledge } = await supabase
      .from('district_knowledge')
      .select('content')
      .eq('id', 'cmd_handbook')
      .single();

    const districtContext = knowledge?.content || "CMD Handbook context.";

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

    // NEW SOCRATIC INSTRUCTIONS: Focused on brevity and interaction.
    const systemPrompt = `
      You are the CMD Ordination Mentor.
      SOURCE: ${districtContext}
      
      MANDATORY VOICE RULES:
      1. BREVITY: Never write more than 3-4 sentences at once.
      2. SOCRATIC: Your goal is to help them prepare for an oral interview. Never dump all the answers.
      3. ONE STEP: Ask exactly ONE practice question per response. Wait for the user to answer before moving to the next point.
      4. TONE: Warm, encouraging, and pastoral. Not academic.
      5. CITATIONS: If you reference a rule, keep it brief: "(Handbook 2.1)".
      
      EXAMPLE FLOW:
      User: "What is the Trinity?"
      You: "In our Alliance tradition, we confess one God eternally existing in three persons. To help you prepare for your interview, how would you explain the biblical basis for this to someone who has never heard it before?"
    `;

    const chat = model.startChat({
      history: [
        { role: "user", parts: [{ text: systemPrompt }] },
        { role: "model", parts: [{ text: "Understood. I will be brief, Socratic, and ask only one question at a time." }] },
        ...(history || []).map(msg => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }],
        })),
      ],
    });

    const result = await chat.sendMessage(message);
    const text = result.response.text();

    supabase.from('messages').insert([{ role: 'user', content: message }, { role: 'assistant', content: text }]).then();

    return res.status(200).json({ reply: text });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
