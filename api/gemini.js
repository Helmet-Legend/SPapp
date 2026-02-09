// api/gemini.js - Fonction serverless Vercel avec STREAMING Claude API
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

        // Clé API Claude stockée dans les variables d'environnement Vercel
        const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
        
        if (!ANTHROPIC_API_KEY) {
            return res.status(500).json({ error: 'Clé API Claude non configurée sur le serveur' });
        }

        // ✅ Configuration pour STREAMING
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // Appel à l'API Claude avec STREAMING activé
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
                    stream: true, // ✅ Activer le streaming
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
            res.write(`data: ${JSON.stringify({ error: 'Erreur API Claude' })}\n\n`);
            res.end();
            return;
        }

        // ✅ Lecture du stream Claude et transmission au client
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
                res.write('data: [DONE]\n\n');
                res.end();
                break;
            }

            // Décoder le chunk reçu
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    
                    if (data === '[DONE]') {
                        continue;
                    }

                    try {
                        const parsed = JSON.parse(data);
                        
                        // Extraire le texte delta de Claude
                        if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                            // Envoyer le morceau de texte au client
                            res.write(`data: ${JSON.stringify({ text: parsed.delta.text })}\n\n`);
                        }
                        
                        // Gérer la fin du message
                        if (parsed.type === 'message_stop') {
                            res.write('data: [DONE]\n\n');
                            res.end();
                            return;
                        }
                    } catch (e) {
                        // Ignorer les erreurs de parsing
                        continue;
                    }
                }
            }
        }

    } catch (error) {
        console.error('Erreur serveur:', error);
        
        // Envoyer l'erreur en format SSE
        res.write(`data: ${JSON.stringify({ 
            error: 'Erreur interne du serveur',
            message: error.message 
        })}\n\n`);
        res.end();
    }
}
