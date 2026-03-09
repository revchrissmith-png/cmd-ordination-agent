import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from "@google/generative-ai";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { message, history, userName } = req.body;
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    const { data: knowledge } = await supabase
      .from('district_knowledge')
      .select('content')
      .eq('id', 'cmd_handbook')
      .single();

    const districtContext = knowledge?.content || "CMD Handbook context.";

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash" });

    const systemPrompt = `
      You are the CMD Ordination Study Agent. Source: ${districtContext}
      User Name: ${userName || 'Candidate'}.
      
      RULES:
      1. TONE: Warm, pastoral, and encouraging. Address the user as ${userName || 'Candidate'}.
      2. IDENTITY: You are a "Study Agent," never a "Mentor."
      3. CITATIONS: Cite Scripture for theology. Cite the Handbook only for policy/process.
      4. FORMATTING: Answer in 2-4 sentences. Follow with TWO line breaks (\\n\\n). 
      5. FOLLOW-UP: End with exactly ONE ministry praxis question. Do NOT label it.
    `;

    // CRITICAL: Map 'assistant' to 'model' so the boxes aren't empty
    const chat = model.startChat({
      history: [
        { role: "user", parts: [{ text: systemPrompt }] },
        { role: "model", parts: [{ text: "Understood. I will use the candidate's name and separate questions with a paragraph break." }] },
        ...(history || []).map(msg => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content || "" }],
        })),
      ],
    });

    const result = await chat.sendMessage(message);
    const text = result.response.text();

    return res.status(200).json({ reply: text });
  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({ error: error.message });
  }
}
