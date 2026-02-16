/**
 * DECIOPS - Data Loader
 * Chargement asynchrone des données JSON
 */
const DataLoader = {
    basePath: 'data/',
    cache: {},
    
    async load(filename) {
        if (this.cache[filename]) {
            return this.cache[filename];
        }
        
        try {
            const response = await fetch(this.basePath + filename);
            if (!response.ok) {
                throw new Error(`Erreur chargement ${filename}: ${response.status}`);
            }
            const data = await response.json();
            this.cache[filename] = data;
            return data;
        } catch (error) {
            console.error(`Erreur lors du chargement de ${filename}:`, error);
            return null;
        }
    },
    
    async loadAll() {
        const files = [
            'config.json',
            'tmd.json',
            'gaz.json',
            'densites.json',
            'conversions.json',
            'modules.json',
            'gaz_bouteilles.json'
        ];
        
        const results = {};
        
        for (const file of files) {
            const key = file.replace('.json', '');
            results[key] = await this.load(file);
        }
        
        return results;
    },
    
    // Méthodes utilitaires pour accès rapide
    async getTMD() {
        return await this.load('tmd.json');
    },
    
    async getGaz() {
        return await this.load('gaz.json');
    },
    
    async getDensites() {
        return await this.load('densites.json');
    },
    
    async getConversions() {
        return await this.load('conversions.json');
    },
    
    async getModules() {
        return await this.load('modules.json');
    },
    
    async getConfig() {
        return await this.load('config.json');
    },
    
    async getGazBouteilles() {
        return await this.load('gaz_bouteilles.json');
    }
};

// Export pour utilisation globale
window.DataLoader = DataLoader;
