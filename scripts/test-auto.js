// Lance les tests utiles selon ce qui a changé par rapport à main :
//  - parcours complet (@long) seulement si les écrans ou le registre de navigation ont changé ;
//  - sinon tests rapides (calculateurs, thème, API, structure, navigation…).
// Usage : npm run test:auto            (compare à origin/main)
//         npm run test:auto -- --complet   (force le parcours complet)
const { execSync, spawnSync } = require('child_process');

function fichiersModifies() {
    try {
        execSync('git fetch -q origin main', { stdio: 'ignore' });
        const base = execSync('git merge-base HEAD origin/main').toString().trim();
        const committes = execSync(`git diff --name-only ${base} HEAD`).toString().split('\n');
        const locaux = execSync('git status --porcelain').toString().split('\n').map(l => l.slice(3));
        return [...committes, ...locaux].filter(Boolean);
    } catch (e) {
        return null;   // pas de git ou pas de main : on joue la sécurité
    }
}

const forcer = process.argv.includes('--complet');
const modifies = fichiersModifies();
const parcours = forcer || modifies === null
    || modifies.some(f => f === 'index.html' || f === 'data/navigation.json' || f.startsWith('js/navigation') || f.startsWith('tests/'));

const args = ['playwright', 'test', ...(parcours ? [] : ['--grep-invert', '@long'])];
console.log(parcours
    ? '→ Écrans, registre ou navigation modifiés : tests complets, parcours en parallèle.'
    : '→ Aucun écran ni registre modifié : tests rapides (sans le parcours complet).');
process.exit(spawnSync('npx', args, { stdio: 'inherit' }).status ?? 1);
