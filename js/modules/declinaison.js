/**
 * Vulcain - Déclinaison magnétique hors ligne (modèle WMM 2025, NOAA/BGS, domaine public).
 * Declinaison.calculer(lat, lon, date) -> degrés (positif = nord magnétique à l'est du nord vrai), ou null hors validité.
 * Validité du modèle : 2024-11 à 2029-11 (au-delà : dernière valeur connue, signalée par Declinaison.perime(date)).
 */
var Declinaison = (function () {
    var EPOCH = 2025, FIN = Date.UTC(2029, 10, 13), DEBUT = Date.UTC(2024, 10, 13), N = 12;
    // Coefficients indexés n(n+1)/2 + m : champ principal (g, h) et variation séculaire (dg, dh), en nT et nT/an
    var G = [0,-29351.8,-1410.8,-2556.6,2951.1,1649.3,1361,-2404.1,1243.8,453.6,895,799.5,55.7,-281.1,12.1,-233.2,368.9,187.2,-138.7,-142,20.9,64.4,63.8,76.9,-115.7,-40.9,14.9,-60.7,79.5,-77,-8.8,59.3,15.8,2.5,-11.1,14.2,23.2,10.8,-17.5,2,-21.7,16.9,15,-16.8,0.9,4.6,7.8,3,-0.2,-2.5,-13.1,2.4,8.6,-8.7,-12.9,-1.3,-6.4,0.2,2,-1,-0.6,-0.9,1.5,0.9,-2.7,-3.9,2.9,-1.5,-2.5,2.4,-0.6,-0.1,-0.6,-0.1,1.1,-1,-0.2,2.6,-2,-0.2,0.3,1.2,-1.3,0.6,0.6,0.5,-0.1,-0.4,-0.2,-1.3,-0.7];
    var H = [0,0,4545.4,0,-3133.6,-815.1,0,-56.6,237.5,-549.5,0,278.6,-133.9,212,-375.6,0,45.4,220.2,-122.9,43,106.1,0,-18.4,16.8,48.8,-59.8,10.9,72.7,0,-48.9,-14.4,-1,23.4,-7.4,-25.1,-2.3,0,7.1,-12.6,11.4,-9.7,12.7,0.7,-5.2,3.9,0,-24.8,12.2,8.3,-3.3,-5.2,7.2,-0.6,0.8,10,0,3.3,0,2.4,5.3,-9.1,0.4,-4.2,-3.8,0.9,-9.1,0,0,2.9,-0.6,0.2,0.5,-0.3,-1.2,-1.7,-2.9,-1.8,-2.3,0,-1.3,0.7,1,-1.4,0,0.6,-0.1,0.8,0.1,-1,0.1,0.2];
    var DG = [0,12,9.7,-11.6,-5.2,-8,-1.3,-4.2,0.4,-15.6,-1.6,-2.4,-6,5.6,-7,0.6,1.4,0,0.6,2.2,0.9,-0.2,-0.4,0.9,1.2,-0.9,0.3,0.9,0,-0.1,-0.1,0.5,-0.1,-0.8,-0.8,0.8,-0.1,0.2,0,0.5,-0.1,0.3,0.2,0,0.2,0,-0.1,0.1,0.3,-0.3,0,0.3,-0.1,0.1,-0.1,0.1,0,0.1,0.1,0,-0.3,0,-0.1,-0.1,0,0,0,0,0,0,0,-0.1,0,0,-0.1,-0.1,-0.1,-0.1,0,0,0,0,0,0,0.1,0,0,0,-0.1,0,-0.1];
    var DH = [0,0,-21.5,0,-27.7,-12.1,0,4,-0.3,-4.1,0,-1.1,4.1,1.6,-4.4,0,-0.5,2.2,0.4,1.7,1.9,0,0.3,-1.6,-0.4,0.9,0.7,0.9,0,0.6,0.5,-0.8,0,-1,0.6,-0.2,0,-0.2,0.5,-0.4,0.4,-0.5,-0.6,0.3,0.2,0,-0.3,0.3,-0.3,0.3,0.2,-0.1,-0.2,0.4,0.1,0,0,0,-0.2,0.1,-0.1,0.1,0,-0.1,0.2,0,0,0,0.1,0,0.1,0,0,0.1,0,0,0,0,0,0,0,-0.1,0.1,0,0,0,0,0,0,0,-0.1];
    var RAD = Math.PI / 180, A = 6378.137, F = 1 / 298.257223563, E2 = F * (2 - F), RT = 6371.2;

    function anneeDecimale(date) {
        var an = date.getUTCFullYear();
        return an + (date.getTime() - Date.UTC(an, 0, 1)) / (Date.UTC(an + 1, 0, 1) - Date.UTC(an, 0, 1));
    }
    function perime(date) { var t = (date || new Date()).getTime(); return t > FIN || t < DEBUT; }

    function calculer(lat, lon, date) {
        if (typeof lat !== 'number' || typeof lon !== 'number' || !isFinite(lat) || !isFinite(lon) || Math.abs(lat) > 89.5) return null;
        date = date || new Date();
        var dt = anneeDecimale(date) - EPOCH;
        if (dt > 5.1) dt = 5.1; // au-delà de la validité : on fige sur la fin du modèle
        // Géodésique -> sphérique géocentrique
        var phi = lat * RAD, sp = Math.sin(phi), cp = Math.cos(phi);
        var Rc = A / Math.sqrt(1 - E2 * sp * sp);
        var p = Rc * cp, z = Rc * (1 - E2) * sp, r = Math.sqrt(p * p + z * z);
        var phiG = Math.asin(z / r), th = Math.PI / 2 - phiG, ct = Math.cos(th), st = Math.sin(th);
        var lam = lon * RAD;
        var P = [], dP = [], S = [], n, m, i;
        for (n = 0; n <= N; n++) { P[n] = []; dP[n] = []; S[n] = []; }
        P[0][0] = 1; dP[0][0] = 0; S[0][0] = 1;
        for (n = 1; n <= N; n++) {
            for (m = 0; m <= n; m++) {
                if (n === m) {
                    P[n][m] = st * P[n - 1][m - 1];
                    dP[n][m] = st * dP[n - 1][m - 1] + ct * P[n - 1][m - 1];
                } else if (n === 1) {
                    P[1][0] = ct * P[0][0];
                    dP[1][0] = ct * dP[0][0] - st * P[0][0];
                } else {
                    var K = ((n - 1) * (n - 1) - m * m) / ((2 * n - 1) * (2 * n - 3));
                    P[n][m] = ct * P[n - 1][m] - (m <= n - 2 ? K * P[n - 2][m] : 0);
                    dP[n][m] = ct * dP[n - 1][m] - st * P[n - 1][m] - (m <= n - 2 ? K * dP[n - 2][m] : 0);
                }
            }
        }
        // Normalisation de Schmidt
        S[0][0] = 1;
        for (n = 1; n <= N; n++) {
            S[n][0] = S[n - 1][0] * (2 * n - 1) / n;
            for (m = 1; m <= n; m++) S[n][m] = S[n][m - 1] * Math.sqrt((n - m + 1) * (m === 1 ? 2 : 1) / (n + m));
        }
        var Br = 0, Bt = 0, Bp = 0;
        for (n = 1; n <= N; n++) {
            var ra = Math.pow(RT / r, n + 2);
            for (m = 0; m <= n; m++) {
                i = n * (n + 1) / 2 + m;
                var g = G[i] + dt * DG[i], h = H[i] + dt * DH[i];
                var cm = Math.cos(m * lam), sm = Math.sin(m * lam);
                var pn = P[n][m] * S[n][m], dpn = dP[n][m] * S[n][m];
                Br += ra * (n + 1) * (g * cm + h * sm) * pn;
                Bt += -ra * (g * cm + h * sm) * dpn;
                Bp += ra * m * (g * sm - h * cm) * pn;
            }
        }
        Bp = Bp / st;
        var X1 = -Bt, Z1 = -Br, psi = phiG - phi;
        var X = X1 * Math.cos(psi) - Z1 * Math.sin(psi), Y = Bp;
        return Math.atan2(Y, X) / RAD;
    }
    return { calculer: calculer, perime: perime };
})();
if (typeof module !== 'undefined') module.exports = Declinaison;
