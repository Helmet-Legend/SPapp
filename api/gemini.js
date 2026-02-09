// api/gemini.js - Fonction serverless Vercel (Utilise Groq API)
export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Méthode non autorisée' });
    }

    try {
        const { prompt } = req.body;

        if (!prompt) {
            return res.status(400).json({ error: 'Le prompt est requis' });
        }

        // Clé API Groq stockée dans les variables d'environnement Vercel
        const GROQ_API_KEY = process.env.GROQ_API_KEY;

        if (!GROQ_API_KEY) {
            return res.status(500).json({ error: 'Clé API Groq non configurée sur le serveur' });
        }

        // Appel à l'API Groq (format OpenAI compatible)
        const response = await fetch(
            'https://api.groq.com/openai/v1/chat/completions',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${GROQ_API_KEY}`
                },
                body: JSON.stringify({
                    model: 'llama-3.3-70b-versatile',
                    messages: [{
                        role: 'user',
                        content: prompt
                    }],
                    temperature: 0.7,
                    max_tokens: 4096
                })
            }
        );

        if (!response.ok) {
            const errorData = await response.text();
            console.error('Erreur Groq API:', errorData);
            return res.status(response.status).json({ 
                error: 'Erreur lors de l\'appel à Groq API',
                details: errorData 
            });
        }

        const data = await response.json();
        
        // Extraction du texte de la réponse Groq
        const generatedText = data.choices?.[0]?.message?.content || 'Aucune réponse générée';

        return res.status(200).json({ text: generatedText });

    } catch (error) {
        console.error('Erreur serveur:', error);
        return res.status(500).json({ 
            error: 'Erreur interne du serveur',
            message: error.message 
        });
    }
}
