// ── INR FORMATTING ──────────────────────────────────────────
export function formatINR(val) {
    const abs = Math.abs(val);
    let str, unit = '';
    if (abs >= 1e7) { str = (abs / 1e7).toFixed(2); unit = ' Cr'; }
    else if (abs >= 1e5) { str = (abs / 1e5).toFixed(2); unit = ' L'; }
    else { str = Math.round(abs).toLocaleString('en-IN'); unit = ''; }
    return (val < 0 ? '-' : '') + '₹' + str + unit;
}

export function formatINRFull(val) {
    return '₹' + Math.abs(val).toLocaleString('en-IN');
}

// ── RANDOM NORMAL ────────────────────────────────────────────
function randn() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// ── MONTE CARLO ENGINE ───────────────────────────────────────
export function runMonteCarlo(assets, params, onProgress) {
    return new Promise((resolve) => {
        const { initialInv, horizon, inflation, tax, numSims, dist } = params;
        const n = assets.length;
        const weights = assets.map(a => a.alloc / 100);
        const returns = assets.map(a => a.ret / 100);
        const vols = assets.map(a => a.vol / 100);
        const taxRate = tax / 100;
        const total = assets.reduce((s, a) => s + Number(a.alloc), 0);

        let allPaths = [];
        let completed = 0;
        const chunkSize = 250;

        function runChunk() {
            const end = Math.min(completed + chunkSize, numSims);
            for (let s = completed; s < end; s++) {
                let portVal = initialInv;
                let path = [portVal];
                let maxVal = portVal;
                let maxDD = 0;

                for (let y = 0; y < horizon; y++) {
                    const z0 = randn();
                    const portReturn = assets.reduce((sum, a, i) => {
                        const corrFactor = a.cls === 'equity' ? 0.7 : a.cls === 'debt' ? 0.3 : a.cls === 'commodity' ? 0.4 : 0;
                        const z = corrFactor * z0 + Math.sqrt(1 - corrFactor ** 2) * randn();
                        let r;
                        if (dist === 'lognormal') {
                            r = Math.exp(returns[i] - 0.5 * vols[i] ** 2 + vols[i] * z) - 1;
                        } else if (dist === 't') {
                            const chi = (randn() ** 2 + randn() ** 2 + randn() ** 2) / 3;
                            r = returns[i] + vols[i] * (z / Math.sqrt(Math.max(0.01, chi / 3))) * 0.7;
                        } else {
                            r = returns[i] + vols[i] * z;
                        }
                        return sum + (a.alloc / total) * r;
                    }, 0);

                    const gain = portVal * portReturn;
                    const taxPaid = gain > 0 ? gain * taxRate * 0.3 : 0;
                    portVal = Math.max(0, portVal * (1 + portReturn) - taxPaid);
                    path.push(portVal);
                    maxVal = Math.max(maxVal, portVal);
                    maxDD = Math.max(maxDD, (maxVal - portVal) / maxVal);
                }
                allPaths.push({ path, maxDD, final: portVal });
            }

            completed = end;
            onProgress(completed / numSims);

            if (completed < numSims) {
                setTimeout(runChunk, 0);
            } else {
                resolve(processResults(allPaths, initialInv, params, assets));
            }
        }

        setTimeout(runChunk, 0);
    });
}

// ── PROCESS RESULTS ──────────────────────────────────────────
function processResults(paths, initialInv, params, assets) {
    const { horizon, inflation, tax } = params;
    const finals = paths.map(p => p.final).sort((a, b) => a - b);
    const n = finals.length;
    const pct = (arr, p) => arr[Math.floor(p / 100 * (arr.length - 1))];

    const sorted = [...paths].sort((a, b) => a.final - b.final);
    const pathP10 = sorted[Math.floor(0.10 * n)].path;
    const pathP25 = sorted[Math.floor(0.25 * n)].path;
    const pathP50 = sorted[Math.floor(0.50 * n)].path;
    const pathP75 = sorted[Math.floor(0.75 * n)].path;
    const pathP90 = sorted[Math.floor(0.90 * n)].path;

    const year1s = paths.map(p => p.path[1] || p.path[p.path.length - 1]).sort((a, b) => a - b);
    const var95idx = Math.floor(0.05 * n);
    const var95 = initialInv - year1s[var95idx];
    const var99 = initialInv - year1s[Math.floor(0.01 * n)];
    const cvar95 = initialInv - (year1s.slice(0, var95idx).reduce((s, v) => s + v, 0) / (var95idx || 1));

    const maxDDs = paths.map(p => p.maxDD);
    const avgMDD = maxDDs.reduce((s, v) => s + v, 0) / n;
    const maxMDD = Math.max(...maxDDs);

    const inflTarget = initialInv * Math.pow(1 + inflation / 100, horizon);
    const probProfit = finals.filter(v => v > initialInv).length / n;
    const probInflation = finals.filter(v => v > inflTarget).length / n;

    const mean = finals.reduce((s, v) => s + v, 0) / n;
    const std = Math.sqrt(finals.reduce((s, v) => s + (v - mean) ** 2, 0) / n);
    const skew = finals.reduce((s, v) => s + ((v - mean) / std) ** 3, 0) / n;
    const kurt = finals.reduce((s, v) => s + ((v - mean) / std) ** 4, 0) / n - 3;

    const total = assets.reduce((s, a) => s + Number(a.alloc), 0);
    const wRet = assets.reduce((s, a) => s + a.ret * (a.alloc / total), 0) / 100;
    const wVol = Math.sqrt(assets.reduce((s, a) => s + (a.vol / 100 * (a.alloc / total)) ** 2, 0));
    const rfr = 0.065;
    const sharpe = (wRet - rfr) / wVol;
    const sortino = (wRet - rfr) / (wVol * 0.7);
    const calmar = wRet / (avgMDD || 0.01);
    const beta = assets.reduce((s, a) => {
        const b = a.cls === 'equity' ? 1.1 : a.cls === 'debt' ? 0.2 : a.cls === 'commodity' ? 0.3 : 0;
        return s + b * (a.alloc / total);
    }, 0);

    return {
        paths, finals, n,
        p10: pct(finals, 10), p25: pct(finals, 25),
        p50: pct(finals, 50), p75: pct(finals, 75), p90: pct(finals, 90),
        pathP10, pathP25, pathP50, pathP75, pathP90,
        var95, var99, cvar95,
        avgMDD, maxMDD,
        probProfit, probInflation,
        skew, kurt, sharpe, sortino, calmar, beta,
        wRet, wVol, mean, std, year1s
    };
}

// ── CORRELATION MATRIX ───────────────────────────────────────
export function buildCorrMatrix(assets) {
    const n = assets.length;
    return Array.from({ length: n }, (_, i) =>
        Array.from({ length: n }, (_, j) => {
            if (i === j) return 1.0;
            const ci = assets[i].cls, cj = assets[j].cls;
            if (ci === cj) return 0.55;
            if ((ci === 'equity' && cj === 'commodity') || (ci === 'commodity' && cj === 'equity')) return -0.1;
            if ((ci === 'equity' && cj === 'debt') || (ci === 'debt' && cj === 'equity')) return -0.2;
            if (ci === 'cash' || cj === 'cash') return 0.0;
            return 0.1;
        })
    );
}

// ── SCENARIO ENGINE ──────────────────────────────────────────
export function runScenarioPath(assets, params, shockConfig) {
    const { initialInv, horizon } = params;
    const total = assets.reduce((s, a) => s + Number(a.alloc), 0) || 100;
    const { shockYear, eqShock, debtShock, commShock, recovYrs } = shockConfig;

    const path = [initialInv];
    let val = initialInv;
    for (let y = 1; y <= horizon; y++) {
        const portRet = assets.reduce((s, a) => {
            let r = a.ret / 100;
            if (y === shockYear) {
                r = a.cls === 'equity' ? eqShock : a.cls === 'debt' ? debtShock : a.cls === 'commodity' ? commShock : 0.04;
            } else if (y > shockYear && y <= shockYear + recovYrs && recovYrs > 0) {
                const progress = (y - shockYear) / recovYrs;
                const shockR = a.cls === 'equity' ? eqShock : a.cls === 'debt' ? debtShock : commShock;
                r = shockR + (a.ret / 100 - shockR) * progress;
            }
            return s + (a.alloc / total) * r;
        }, 0);
        val = Math.max(0, val * (1 + portRet));
        path.push(val);
    }
    return path;
}
