// api/gemini.js - Fonction serverless Vercel (Utilise Claude API)
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

        // ✅ Clé API Claude stockée dans les variables d'environnement Vercel
        const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
        
        if (!ANTHROPIC_API_KEY) {
            return res.status(500).json({ error: 'Clé API Claude non configurée sur le serveur' });
        }

        // ✅ Appel à l'API Claude (Anthropic)
        const response = await fetch(
            'https://api.anthropic.com/v1/messages',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': ANTHROPIC_API_KEY,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: 'claude-sonnet-4-20250514',
                    max_tokens: 4096,
                    messages: [{
                        role: 'user',
                        content: prompt
                    }]
                })
            }
        );

        if (!response.ok) {
            const errorData = await response.text();
            console.error('Erreur Claude API:', errorData);
            return res.status(response.status).json({ 
                error: 'Erreur lors de l\'appel à Claude API',
                details: errorData 
            });
        }

        const data = await response.json();
        
        // ✅ Extraction du texte de la réponse Claude
        const generatedText = data.content?.[0]?.text || 'Aucune réponse générée';
        
        return res.status(200).json({ text: generatedText });

    } catch (error) {
        console.error('Erreur serveur:', error);
        return res.status(500).json({ 
            error: 'Erreur interne du serveur',
            message: error.message 
        });
    }
}
