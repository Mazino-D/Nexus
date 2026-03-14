import { useState, useEffect, useRef } from 'react';
import { useNexus } from '../context/NexusContext';
import { runScenarioPath, formatINR } from '../utils/finance';
import { useToast } from '../components/Toast';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

const SCENARIOS = [
    { id: 'gfc', icon: '🔴', name: '2008 Global Financial Crisis', desc: 'Global credit freeze. Equity crashed, liquidity dried up.', impact: -34.2, equity: -0.55, debt: 0.08, comm: 0.25, recovery: 3 },
    { id: 'covid', icon: '⚡', name: 'COVID-19 Market Crash 2020', desc: 'Rapid liquidity crisis followed by V-shaped recovery.', impact: -22.1, equity: -0.38, debt: 0.05, comm: 0.18, recovery: 1 },
    { id: 'dotcom', icon: '💥', name: 'Dot-Com Bust 2000–2002', desc: 'Technology sector collapse with prolonged bear market.', impact: -29.4, equity: -0.49, debt: 0.12, comm: -0.05, recovery: 5 },
    { id: 'ilfs', icon: '🇮🇳', name: 'Indian IL&FS Crisis 2018', desc: 'NBFC credit crisis, IL&FS default, market correction.', impact: -15.3, equity: -0.26, debt: -0.08, comm: 0.05, recovery: 2 },
    { id: 'inflation', icon: '📈', name: 'Inflation Surge (RBI Hike)', desc: 'Inflation hits 12%, RBI hikes rates aggressively.', impact: -18.7, equity: -0.30, debt: -0.12, comm: 0.15, recovery: 3 },
    { id: 'bull', icon: '🟢', name: 'Bull Market Boom (2023-Style)', desc: 'Sustained Nifty rally, FII inflows, strong earnings.', impact: 28.5, equity: 0.40, debt: 0.03, comm: 0.10, recovery: 0 },
];

export default function ScenarioStressTest() {
    const { assets, params, simResults } = useNexus();
    const { addToast } = useToast();
    const [activeScenario, setActiveScenario] = useState(SCENARIOS[0]);
    const [customForm, setCustomForm] = useState({ shockYear: 3, eqShock: -30, debtShock: 5, commShock: 15, recovYrs: 2 });
    const chartRef = useRef(null);
    const canvasRef = useRef(null);

    // ── Baseline path
    const baseline = simResults?.pathP50 || (() => {
        let v = params.initialInv;
        return [v, ...Array.from({ length: params.horizon }, () => v *= 1.10)]; // 10% flat
    })();

    // ── Chart update
    useEffect(() => {
        if (!canvasRef.current) return;
        if (chartRef.current) chartRef.current.destroy();

        const config = activeScenario.id === 'custom'
            ? { shockYear: customForm.shockYear, eqShock: customForm.eqShock / 100, debtShock: customForm.debtShock / 100, commShock: customForm.commShock / 100, recovYrs: customForm.recovYrs }
            : { shockYear: 3, eqShock: activeScenario.equity, debtShock: activeScenario.debt, commShock: activeScenario.comm, recovYrs: activeScenario.recovery };

        const stressPath = runScenarioPath(assets, params, config);
        const isPositive = stressPath[stressPath.length - 1] >= baseline[baseline.length - 1];
        const stressColor = isPositive ? '#00E396' : '#FF4560';

        const ctx = canvasRef.current.getContext('2d');
        chartRef.current = new Chart(ctx, {
            type: 'line',
            data: {
                labels: Array.from({ length: params.horizon + 1 }, (_, i) => 'Y' + i),
                datasets: [
                    { label: 'Base Case (P50)', data: baseline, borderColor: '#F5A623', borderWidth: 2, borderDash: [5, 5], pointRadius: 0, tension: 0.3 },
                    { label: activeScenario.name, data: stressPath, borderColor: stressColor, backgroundColor: isPositive ? 'rgba(0,227,150,0.1)' : 'rgba(255,69,96,0.1)', borderWidth: 3, pointRadius: 0, fill: true, tension: 0.3 }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { tooltip: { callbacks: { label: c => `${c.dataset.label}: ${formatINR(c.raw)}` } }, legend: { labels: { color: 'rgba(255,255,255,0.7)', font: { family: "'Syne', sans-serif" } } } },
                scales: {
                    x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: 'rgba(255,255,255,0.4)', font: { size: 10, family: "'JetBrains Mono', monospace" } } },
                    y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: 'rgba(255,255,255,0.4)', font: { size: 11, family: "'JetBrains Mono', monospace" }, callback: v => formatINR(v) } }
                }
            }
        });
    }, [activeScenario, assets, params, baseline, customForm]);

    const handleCustomRun = () => {
        setActiveScenario({ id: 'custom', name: 'Custom User Scenario', impact: 0 }); // impact calc is complex here, omit for custom in table if needed
        addToast('Custom scenario applied', 'success');
    };

    const cardStyle = { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: 20 };
    const inputStyle = { width: '100%', padding: '10px 14px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 13, fontFamily: "'Syne', sans-serif", outline: 'none' };
    const labelStyle = { fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text3)', display: 'block', marginBottom: 6, fontWeight: 600 };

    return (
        <div>
            <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 26, fontWeight: 800 }}>Scenario <span style={{ color: 'var(--amber)' }}>Stress Test</span></h1>
                <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>Evaluate portfolio resilience against historical market shocks and black swan events.</p>
            </div>

            {assets.length === 0 ? (
                <div style={{ height: 300, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--amber)' }}>
                    <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
                    <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>No Portfolio Data</h2>
                    <p style={{ color: 'var(--text3)', fontSize: 13 }}>Please add assets in the Setup tab first to run shock scenarios.</p>
                </div>
            ) : (
                <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
                        {SCENARIOS.map(s => {
                            const active = activeScenario.id === s.id;
                            return (
                                <div key={s.id} onClick={() => setActiveScenario(s)}
                                    style={{ ...cardStyle, cursor: 'pointer', border: `1px solid ${active ? 'var(--amber)' : 'var(--border)'}`, background: active ? 'var(--amber-dim)' : 'var(--card)', transition: 'all 0.2s', transform: active ? 'translateY(-2px)' : 'none', boxShadow: active ? '0 8px 20px rgba(245,166,35,0.1)' : 'none' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                                        <div style={{ fontSize: 22 }}>{s.icon}</div>
                                        <div style={{ fontSize: 14, fontWeight: 700 }}>{s.name}</div>
                                    </div>
                                    <p style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 14, minHeight: 30 }}>{s.desc}</p>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                        <span style={{ fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text3)', fontWeight: 600 }}>Est. Impact</span>
                                        <span style={{ fontSize: 16, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: s.impact > 0 ? 'var(--green)' : 'var(--red)' }}>{s.impact > 0 ? '+' : ''}{s.impact}%</span>
                                    </div>
                                    <div style={{ display: 'flex', gap: 6 }}>
                                        <span style={{ fontSize: 9, padding: '3px 6px', background: 'rgba(0,212,255,0.1)', color: '#00D4FF', borderRadius: 4 }}>Eq {s.equity * 100}%</span>
                                        <span style={{ fontSize: 9, padding: '3px 6px', background: 'rgba(0,227,150,0.1)', color: '#00E396', borderRadius: 4 }}>Db {s.debt * 100}%</span>
                                        <span style={{ fontSize: 9, padding: '3px 6px', background: 'rgba(245,166,35,0.1)', color: '#F5A623', borderRadius: 4 }}>Gd {s.comm * 100}%</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, marginBottom: 20 }}>
                        {/* CHART */}
                        <div style={cardStyle}>
                            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ color: 'var(--amber)' }}>📈</span> Path Comparison: Base vs {activeScenario.name}</div>
                            <div style={{ height: 340 }}><canvas ref={canvasRef} /></div>
                        </div>

                        {/* CUSTOM SCENARIO BUILDER */}
                        <div style={cardStyle}>
                            <div style={{ fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--text)', marginBottom: 16, fontWeight: 600 }}>🛠 Custom Shock Builder</div>
                            {[
                                { label: 'Shock Year (1 to Horizon)', key: 'shockYear', type: 'number', min: 1, max: params.horizon },
                                { label: 'Equity Shock %', key: 'eqShock', type: 'number' },
                                { label: 'Debt Shock %', key: 'debtShock', type: 'number' },
                                { label: 'Commodity Shock %', key: 'commShock', type: 'number' },
                            ].map(f => (
                                <div key={f.key} style={{ marginBottom: 14 }}>
                                    <label style={labelStyle}>{f.label}</label>
                                    <input style={inputStyle} type="number" value={customForm[f.key]} min={f.min} max={f.max} onChange={e => setCustomForm({ ...customForm, [f.key]: +e.target.value })} />
                                </div>
                            ))}
                            <div style={{ marginBottom: 16 }}>
                                <label style={labelStyle}>Recovery Years</label>
                                <select style={inputStyle} value={customForm.recovYrs} onChange={e => setCustomForm({ ...customForm, recovYrs: +e.target.value })}>
                                    <option value={0}>0 (No Drop, Instant Bounce)</option>
                                    <option value={1}>1 (V-Shape Recovery)</option>
                                    <option value={2}>2 (U-Shape Recovery)</option>
                                    <option value={5}>5 (L-Shape / Prolonged)</option>
                                </select>
                            </div>
                            <button onClick={handleCustomRun}
                                style={{ width: '100%', padding: 13, borderRadius: 10, background: 'var(--bg3)', border: '1px solid var(--border2)', color: 'var(--amber)', fontFamily: "'Syne', sans-serif", fontSize: 12, fontWeight: 700, cursor: 'pointer', letterSpacing: 1 }}>
                                ▶ RUN CUSTOM SCENARIO
                            </button>
                        </div>
                    </div>

                    {/* COMPARISON TABLE */}
                    <div style={cardStyle}>
                        <div style={{ fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--text)', marginBottom: 16, fontWeight: 600 }}>📊 Scenario Outcomes</div>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr>{['Historical Scenario', 'Drop Impact', 'Est. Final Value (₹)', 'Net Loss vs Base (₹)', 'Recovery Profile'].map(h => <th key={h} style={{ textAlign: h === 'Historical Scenario' ? 'left' : 'right', padding: '12px 14px', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text3)', borderBottom: '1px solid var(--border)' }}>{h}</th>)}</tr>
                            </thead>
                            <tbody>
                                {SCENARIOS.map(s => {
                                    const cfg = { shockYear: 3, eqShock: s.equity, debtShock: s.debt, commShock: s.comm, recovYrs: s.recovery };
                                    const path = runScenarioPath(assets, params, cfg);
                                    const fVal = path[path.length - 1];
                                    const bVal = baseline[baseline.length - 1];
                                    const diff = fVal - bVal;
                                    return (
                                        <tr key={s.id} onClick={() => setActiveScenario(s)} style={{ cursor: 'pointer', background: activeScenario.id === s.id ? 'var(--amber-dim)' : 'transparent' }}>
                                            <td style={{ padding: '14px', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 12, fontWeight: 600 }}>{s.icon} {s.name}</td>
                                            <td style={{ padding: '14px', textAlign: 'right', borderBottom: '1px solid rgba(255,255,255,0.04)', fontFamily: "'JetBrains Mono', monospace", color: s.impact > 0 ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>{s.impact > 0 ? '+' : ''}{s.impact}%</td>
                                            <td style={{ padding: '14px', textAlign: 'right', borderBottom: '1px solid rgba(255,255,255,0.04)', fontFamily: "'JetBrains Mono', monospace", color: 'var(--text)', fontWeight: 600 }}>{formatINR(fVal)}</td>
                                            <td style={{ padding: '14px', textAlign: 'right', borderBottom: '1px solid rgba(255,255,255,0.04)', fontFamily: "'JetBrains Mono', monospace", color: diff > 0 ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>{diff > 0 ? '+' : ''}{formatINR(diff)}</td>
                                            <td style={{ padding: '14px', textAlign: 'right', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 11, color: 'var(--text2)' }}>{s.recovery} yrs</td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
}
