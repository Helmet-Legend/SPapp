// api/gemini.js - Fonction serverless Vercel
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

        // Clé API Gemini stockée dans les variables d'environnement Vercel
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

        if (!GEMINI_API_KEY) {
            return res.status(500).json({ error: 'Clé API non configurée sur le serveur' });
        }

        // Appel à l'API Gemini
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }]
                })
            }
        );

        if (!response.ok) {
            const errorData = await response.text();
            console.error('Erreur Gemini API:', errorData);
            return res.status(response.status).json({ 
                error: 'Erreur lors de l\'appel à Gemini API',
                details: errorData 
            });
        }

        const data = await response.json();
        
        // Extraction du texte de la réponse Gemini
        const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Aucune réponse générée';

        return res.status(200).json({ text: generatedText });

    } catch (error) {
        console.error('Erreur serveur:', error);
        return res.status(500).json({ 
            error: 'Erreur interne du serveur',
            message: error.message 
        });
    }
}
