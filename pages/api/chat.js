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

    // 1. Fetch Handbook Knowledge
    const { data: knowledge } = await supabase
      .from('district_knowledge')
      .select('content')
      .eq('id', 'cmd_handbook')
      .single();

    const districtContext = knowledge?.content || "CMD Handbook context.";

    // 2. Initialize Gemini
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const systemPrompt = `
      You are the CMD Ordination Study Agent. Source: ${districtContext}
      User Name: ${userName || 'Candidate'}.
      
      RULES:
      1. TONE: Warm, pastoral, and encouraging. Address the user as ${userName || 'Candidate'}.
      2. IDENTITY: You are a "Study Agent," never a "Mentor."
      3. CITATIONS: Cite Scripture for theology. Cite the Handbook only for policy/process.
      4. FORMATTING: Answer in 2-4 sentences. Follow with TWO line breaks. 
      5. FOLLOW-UP: End with exactly ONE unlabeled ministry praxis question.
    `;

    // 3. DEFENSIVE HISTORY MAPPING (Prevents Empty Bubbles)
    const cleanedHistory = (history || []).map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content || "" }]
    }));

    const chat = model.startChat({
      history: [
        { role: "user", parts: [{ text: systemPrompt }] },
        { role: "model", parts: [{ text: "Understood. I am the CMD Study Agent. I will help the candidate prepare with pastoral warmth and clear formatting." }] },
        ...cleanedHistory
      ],
    });

    // 4. Send Message and Get Text
    const result = await chat.sendMessage(message);
    const responseText = result.response.text();

    if (!responseText) throw new Error("No response from AI");

    return res.status(200).json({ reply: responseText });

  } catch (error) {
    console.error("Gemini API Error:", error);
    return res.status(500).json({ error: "The Agent is currently reflecting and couldn't answer. Please try again." });
  }
}
