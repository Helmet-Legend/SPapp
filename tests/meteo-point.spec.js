// Météo au point (service Open-Meteo simulé) : outil « Se localiser » et message d'ambiance FDF.
const { test, expect } = require('./outils');

const heures = Array.from({ length: 7 }, (_, i) => `2026-10-11T${String(15 + i).padStart(2, '0')}:00`);
const reponse = (vent, dir) => JSON.stringify({
    current: { time: '2026-10-11T15:00', temperature_2m: 19.4, relative_humidity_2m: 31, precipitation: 0, wind_speed_10m: vent, wind_direction_10m: dir, wind_gusts_10m: vent * 1.6 },
    hourly: { time: heures, temperature_2m: heures.map(() => 19), relative_humidity_2m: heures.map(() => 30), wind_speed_10m: heures.map(() => vent), wind_direction_10m: heures.map(() => dir), wind_gusts_10m: heures.map(() => vent * 1.6) },
});

test('conversion du vent : direction d\'où il souffle et force du message d\'ambiance', async ({ app }) => {
    const r = await app.evaluate(() => ({
        dirs: [0, 45, 90, 135, 180, 225, 270, 312, 350].map(d => Meteo.direction(d).code),
        forces: [0, 5, 6, 19, 20, 38, 39, 80].map(v => Meteo.force(v)),
    }));
    expect(r.dirs).toEqual(['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO', 'N']);
    expect(r.forces).toEqual(['nulle', 'nulle', 'faible', 'faible', 'soutenue', 'soutenue', 'forte', 'forte']);
});

test('« Se localiser » : météo au point avec vent, humidité et prévision des heures suivantes', async ({ app }) => {
    await app.route('https://api.open-meteo.com/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: reponse(38.2, 312) }));
    await app.evaluate(() => showModule('localisation'));
    await app.fill('#loc-saisie', '43.3951, 3.4263');
    const carte = app.locator('#loc-meteo');
    await expect(carte).toContainText('Vent de Nord-Ouest · 38 km/h');
    await expect(carte).toContainText('force « soutenue »');
    await expect(carte).toContainText('HR 31 %');
    await app.click('#loc-meteo .loc-prevision summary');
    await expect(carte).toContainText('pas une mesure');
    await expect(carte.locator('tbody tr')).toHaveCount(6);
    await expect(carte.locator('.met-fort').first()).toContainText('⚠');
    await expect(carte).toContainText('Rafales supérieures à 40 km/h');
});

test('« Se localiser » : météo indisponible, message clair', async ({ app }) => {
    await app.evaluate(() => showModule('localisation'));
    await app.fill('#loc-saisie', '43.3951, 3.4263');
    await expect(app.locator('#loc-meteo')).toContainText('Météo indisponible');
    await expect(app.locator('#loc-r-dfci')).toHaveText('GD82E1.4');
});

test('message d\'ambiance : le vent prévu préremplit direction et force, modifiables', async ({ app }) => {
    await app.route('https://api.open-meteo.com/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: reponse(44, 290) }));
    await app.evaluate(() => showModule('fdf-ambiance'));
    await app.click('.amb-vent-prevu');
    await expect(app.locator('#amb-vent-note')).toContainText('Renseignez d\'abord le point');
    await app.fill('#amb-dfci', 'GD82E1.4');
    await app.click('.amb-vent-prevu');
    await expect(app.locator('#amb-vent-dir')).toHaveValue('O');
    await expect(app.locator('#amb-vent-force')).toHaveValue('forte');
    await expect(app.locator('#amb-vent-note')).toContainText('À confirmer par l\'observation');
    await expect(app.locator('#amb-apercu')).toContainText('Le vent est d\'Ouest, de force forte.');
    await app.selectOption('#amb-vent-force', 'soutenue');
    await expect(app.locator('#amb-apercu')).toContainText('de force soutenue');
});
