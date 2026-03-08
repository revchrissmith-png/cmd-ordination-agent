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

    if (!apiKey) throw new Error("API Key is missing from Vercel Environment Variables.");

    // Fetch Handbook content
    const { data: knowledge } = await supabase
      .from('district_knowledge')
      .select('content')
      .eq('id', 'cmd_handbook')
      .single();

    const districtContext = knowledge?.content || "Handbook not found.";

    // Initialize the SDK
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Using the absolute base model name
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // We move the system instructions into the first message to avoid 
    // compatibility issues with older SDK versions.
    const systemPrompt = `You are the CMD Ordination Mentor. Source: ${districtContext}. Rules: Be Socratic, Christ-centered, and only use provided text.`;

    const chat = model.startChat({
      history: [
        { role: "user", parts: [{ text: systemPrompt }] },
        { role: "model", parts: [{ text: "Understood. I am ready to mentor according to the CMD Handbook." }] },
        ...(history || []).map(msg => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }],
        })),
      ],
    });

    const result = await chat.sendMessage(message);
    const response = await result.response;
    const text = response.text();

    await supabase.from('messages').insert([{ role: 'user', content: message }, { role: 'assistant', content: text }]);

    return res.status(200).json({ reply: text });

  } catch (error) {
    console.error("API Error:", error);
    // This will help us see if it's a "Key Invalid" or "API Disabled" error
    return res.status(500).json({ error: `Detailed Error: ${error.message}` });
  }
}
