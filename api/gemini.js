export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' });
  
  const { prompt } = req.body;
  const apiKey = process.env.MA_CLE_API; 

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: "En tant qu'expert pompier, génère un scénario de manœuvre précis basé sur ces données : " + prompt }] }]
      })
    });

    const data = await response.json();
    const text = data.candidates[0].content.parts[0].text;
    res.status(200).json({ text });
  } catch (error) {
    res.status(500).json({ error: "Erreur serveur IA" });
  }
}
