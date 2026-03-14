import { useRef } from 'react';
import { useNexus } from '../context/NexusContext';
import { runMonteCarlo, formatINR } from '../utils/finance';
import { useEffect, useState } from 'react';
import { useToast } from '../components/Toast';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

export default function SimulationEngine() {
    const { assets, params, setParams, simResults, setSimResults, simStatus, setSimStatus } = useNexus();
    const { addToast } = useToast();
    const [progress, setProgress] = useState(0);
    const [simMsg, setSimMsg] = useState('Configure portfolio and click Run Simulation');
    const pathsRef = useRef(null);
    const pathsChart = useRef(null);

    const total = assets.reduce((s, a) => s + Number(a.alloc), 0);
    const wRet = assets.length ? assets.reduce((s, a) => s + Number(a.ret) * (Number(a.alloc) / (total || 100)), 0) : 0;
    const wVol = assets.length ? Math.sqrt(assets.reduce((s, a) => s + Math.pow(a.vol * (a.alloc / (total || 100)), 2), 0)) : 0;
    const sharpe = wVol ? ((wRet - 6.5) / wVol).toFixed(2) : '—';

    // Draw simulation paths chart
    useEffect(() => {
        if (!simResults || !pathsRef.current) return;
        if (pathsChart.current) pathsChart.current.destroy();
        const r = simResults;
        const horizon = params.horizon;
        const labels = Array.from({ length: horizon + 1 }, (_, i) => 'Y' + i);
        const bgPaths = Array.from({ length: 40 }, () => {
            const idx = Math.floor(Math.random() * r.paths.length);
            return { data: r.paths[idx].path, borderColor: 'rgba(245,166,35,0.06)', borderWidth: 1, pointRadius: 0, fill: false, tension: 0.4 };
        });
        const overlays = [
            { label: 'P90 Best', data: r.pathP90, color: '#00D4FF', width: 2.5 },
            { label: 'P75', data: r.pathP75, color: 'rgba(0,212,255,0.5)', width: 1.5 },
            { label: 'P50 Median', data: r.pathP50, color: '#F5A623', width: 3 },
            { label: 'P25', data: r.pathP25, color: 'rgba(255,69,96,0.5)', width: 1.5 },
            { label: 'P10 Worst', data: r.pathP10, color: '#FF4560', width: 2.5 },
        ];
        pathsChart.current = new Chart(pathsRef.current.getContext('2d'), {
            type: 'line',
            data: { labels, datasets: [...bgPaths, ...overlays.map(o => ({ label: o.label, data: o.data, borderColor: o.color, borderWidth: o.width, pointRadius: 0, fill: false, tension: 0.4 }))] },
            options: {
                responsive: true,
                plugins: { legend: { display: false }, tooltip: { filter: d => d.datasetIndex >= 40, callbacks: { label: ctx => `${ctx.dataset.label}: ${formatINR(ctx.raw)}` } } },
                scales: {
                    x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: 'rgba(255,255,255,0.4)', font: { size: 11 } } },
                    y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: 'rgba(255,255,255,0.4)', font: { size: 11, family: 'JetBrains Mono' }, callback: v => formatINR(v) } }
                }, animation: { duration: 800 }
            }
        });
    }, [simResults]);

    async function handleRun() {
        if (!assets.length) return alert('Add assets to your portfolio first');
        if (Math.abs(total - 100) > 0.1) return alert(`Allocation is ${total.toFixed(1)}%. Must be 100%.`);
        setSimStatus('running'); setProgress(0);
        setSimMsg('Initializing Monte Carlo engine...');
        try {
            const results = await runMonteCarlo(assets, params, (p) => {
                setProgress(p);
                setSimMsg(`Running... ${Math.round(p * params.numSims).toLocaleString()} / ${params.numSims.toLocaleString()} paths`);
            });
            setSimResults(results);
            setSimStatus('done');
            setSimMsg(`✓ ${results.n.toLocaleString()} simulations complete`);
            addToast(`Simulation completed successfully (${results.n} paths)`, 'success');
        } catch (e) { console.error(e); setSimStatus('idle'); addToast('Simulation failed', 'error'); }
    }

    const cardStyle = { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: 20 };
    const labelStyle = { fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 6, display: 'block', fontWeight: 600 };
    const inputStyle = { width: '100%', padding: '10px 14px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 13, fontFamily: "'Syne', sans-serif", outline: 'none' };
    const kpiCard = (label, value, color, sub) => (
        <div style={{ ...cardStyle, transition: 'all 0.3s' }}>
            <div style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 6 }}>{label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color }}>{value || '—'}</div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>{sub}</div>
        </div>
    );

    return (
        <div>
            <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 26, fontWeight: 800 }}>Simulation <span style={{ color: 'var(--amber)' }}>Engine</span></h1>
                <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>Monte Carlo stochastic modeling with correlated return paths.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 18 }}>
                <div style={cardStyle}>
                    <div style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 14, fontWeight: 600 }}>⚙ Simulation Parameters</div>
                    {[
                        { label: 'Number of Simulations', key: 'numSims', options: [[1000, '1,000 (Fast)'], [5000, '5,000 (Balanced)'], [10000, '10,000 (Accurate)']] },
                        { label: 'Distribution Model', key: 'dist', options: [['normal', 'Normal Distribution'], ['lognormal', 'Log-Normal Distribution'], ['t', 'Student-t (Fat Tails)']] },
                        { label: 'Rebalancing', key: 'rebalancing', options: [['none', 'No Rebalancing'], ['annual', 'Annual Rebalancing'], ['quarterly', 'Quarterly Rebalancing']] },
                    ].map(f => (
                        <div key={f.key} style={{ marginBottom: 14 }}>
                            <label style={labelStyle}>{f.label}</label>
                            <select style={{ ...inputStyle, cursor: 'pointer' }} value={params[f.key]} onChange={e => setParams({ ...params, [f.key]: isNaN(e.target.value) ? e.target.value : +e.target.value })}>
                                {f.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                            </select>
                        </div>
                    ))}
                </div>

                <div style={cardStyle}>
                    <div style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 14, fontWeight: 600 }}>📊 Pre-Simulation Summary</div>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <tbody>
                            {[
                                ['Portfolio Assets', assets.length || '—'],
                                ['Initial Investment', assets.length ? `₹${params.initialInv.toLocaleString('en-IN')}` : '—'],
                                ['Horizon', `${params.horizon} Years`],
                                ['Weighted Avg Return', assets.length ? `${wRet.toFixed(2)}%` : '—'],
                                ['Weighted Avg Volatility', assets.length ? `${wVol.toFixed(2)}%` : '—'],
                                ['Est. Sharpe Ratio', assets.length ? sharpe : '—'],
                            ].map(([lbl, val], i) => (
                                <tr key={i}>
                                    <td style={{ padding: '10px 14px', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text3)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>{lbl}</td>
                                    <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.04)', color: lbl.includes('Return') ? 'var(--green)' : lbl.includes('Vol') ? 'var(--red)' : lbl.includes('Sharpe') ? 'var(--cyan)' : 'var(--text)' }}>{val}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* PROGRESS & RUN */}
            <div style={{ ...cardStyle, marginBottom: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                    <span style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: 'var(--text3)' }}>{simMsg}</span>
                    <span style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: 'var(--text3)' }}>{Math.round(progress * 100)}%</span>
                </div>
                <div style={{ height: 6, background: 'var(--bg3)', borderRadius: 3, overflow: 'hidden', marginBottom: 16 }}>
                    <div style={{ height: '100%', background: 'linear-gradient(90deg, var(--amber), #FFB938)', borderRadius: 3, width: `${progress * 100}%`, transition: 'width 0.1s' }} />
                </div>
                <button onClick={handleRun} disabled={simStatus === 'running'}
                    style={{ width: '100%', padding: 13, borderRadius: 10, background: simStatus === 'running' ? 'rgba(245,166,35,0.4)' : 'var(--amber)', color: '#000', fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 800, border: 'none', cursor: simStatus === 'running' ? 'not-allowed' : 'pointer', letterSpacing: 1 }}>
                    {simStatus === 'running' ? '⏳ RUNNING...' : '▶ RUN MONTE CARLO SIMULATION'}
                </button>
            </div>

            {/* PATHS CHART */}
            {simResults && (
                <>
                    <div style={{ ...cardStyle, marginBottom: 18 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ color: 'var(--amber)' }}>📈</span> Simulation Paths — Portfolio Value Over Time</div>
                        <canvas ref={pathsRef} height={300} />
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 12, justifyContent: 'center' }}>
                            {[['P90 Best', '#00D4FF'], ['P75', 'rgba(0,212,255,0.6)'], ['P50 Median', '#F5A623'], ['P25', 'rgba(255,69,96,0.6)'], ['P10 Worst', '#FF4560']].map(([l, c]) => (
                                <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text2)' }}>
                                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: c, display: 'inline-block' }} />{l}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* KPI GRID */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
                        {kpiCard('Median Final Value', formatINR(simResults.p50), 'var(--amber)', 'P50 Outcome')}
                        {kpiCard('Best Case P90', formatINR(simResults.p90), 'var(--cyan)', 'Top 10% scenario')}
                        {kpiCard('Worst Case P10', formatINR(simResults.p10), 'var(--red)', 'Bottom 10% scenario')}
                        {kpiCard('Prob. of Profit', (simResults.probProfit * 100).toFixed(1) + '%', 'var(--green)', 'Beat initial investment')}
                        {kpiCard('Beat Inflation', (simResults.probInflation * 100).toFixed(1) + '%', 'var(--cyan)', 'Real return positive')}
                        {kpiCard('CVaR (5%)', '-' + formatINR(simResults.cvar95), 'var(--red)', 'Expected shortfall')}
                        {kpiCard('Max Simulated Gain', formatINR(simResults.finals[simResults.finals.length - 1] - params.initialInv), 'var(--green)', 'Best single path')}
                        {kpiCard('Max Simulated Loss', '-' + formatINR(params.initialInv - simResults.finals[0]), 'var(--red)', 'Worst single path')}
                    </div>
                </>
            )}
        </div>
    );
}
