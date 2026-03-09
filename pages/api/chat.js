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
    // Standardizing on the Gemini 3 Flash model we verified
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash" });

    const systemPrompt = `
      You are the CMD Ordination Study Agent. Source: ${districtContext}
      User Name: ${userName || 'Candidate'}.
      
      RULES:
      1. TONE: Warm, pastoral, and encouraging. Address the user as ${userName || 'Candidate'}.
      2. IDENTITY: Study Agent, not Mentor.
      3. CITATIONS: Scripture for theology. Handbook only for policy.
      4. FORMATTING: 2-4 sentences max. TWO line breaks (\\n\\n).
      5. FOLLOW-UP: One unlabeled praxis question at the end.
    `;

    // CRITICAL: Filter out any messages that don't have content to prevent API "Choking"
    const validHistory = (history || []).filter(msg => msg.content && msg.content.trim() !== "");

    const cleanedHistory = validHistory.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    const chat = model.startChat({
      history: [
        { role: "user", parts: [{ text: systemPrompt }] },
        { role: "model", parts: [{ text: "Understood. I am ready to help the candidate prepare." }] },
        ...cleanedHistory
      ],
    });

    const result = await chat.sendMessage(message);
    const response = await result.response;
    const responseText = response.text();

    // If the AI somehow returns nothing, we send a fallback so the bubble isn't empty
    if (!responseText || responseText.trim() === "") {
      return res.status(200).json({ reply: "I'm reflecting on that theological point. Could you rephrase your thought for me?" });
    }

    return res.status(200).json({ reply: responseText });

  } catch (error) {
    console.error("API Failure:", error);
    return res.status(500).json({ error: "Agent connection timed out. Please try again." });
  }
}
