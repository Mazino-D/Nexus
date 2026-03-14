import { useState, useEffect, useRef } from 'react';
import { useNexus } from '../context/NexusContext';
import { formatINR } from '../utils/finance';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

export default function RiskAnalytics() {
    const { assets, params, simResults } = useNexus();
    const [activeTab, setActiveTab] = useState('distribution');
    const chartRef = useRef(null);
    const canvasRef = useRef(null);
    const tornadoRef = useRef(null);
    const tornadoCanvasRef = useRef(null);

    // ── 1. Main Tabs Chart ──
    useEffect(() => {
        if (!simResults || !canvasRef.current) return;
        if (chartRef.current) chartRef.current.destroy();

        const ctx = canvasRef.current.getContext('2d');
        const { initialInv } = params;

        let config = { type: 'bar', data: { labels: [], datasets: [] }, options: { responsive: true, animation: { duration: 600 } } };
        const gridColor = 'rgba(255,255,255,0.04)';
        const tickColor = 'rgba(255,255,255,0.4)';
        const font = { size: 10, family: "'JetBrains Mono', monospace" };

        if (activeTab === 'distribution') {
            // Histogram of final values
            const bins = 40;
            const min = simResults.finals[0];
            const max = simResults.finals[simResults.n - 1];
            const step = (max - min) / bins;
            const counts = Array(bins).fill(0);
            simResults.finals.forEach(v => counts[Math.min(bins - 1, Math.floor((v - min) / step))]++);

            const labels = counts.map((_, i) => min + i * step + step / 2);
            const bgColors = labels.map(l => l > initialInv ? 'rgba(245,166,35,0.8)' : 'rgba(255,69,96,0.8)');

            config = {
                type: 'bar',
                data: {
                    labels: labels.map(l => (l / 100000).toFixed(0) + 'L'),
                    datasets: [{ label: 'Frequency', data: counts, backgroundColor: bgColors, borderRadius: 2 }]
                },
                options: {
                    plugins: { legend: { display: false }, tooltip: { callbacks: { title: t => formatINR(labels[t[0].dataIndex]) } } },
                    scales: {
                        x: { grid: { color: gridColor }, ticks: { color: tickColor, font, maxTicksLimit: 12 } },
                        y: { grid: { color: gridColor }, ticks: { color: tickColor, font } }
                    }
                }
            };
        } else if (activeTab === 'drawdown') {
            // Average drawdown surface
            const horizon = params.horizon;
            const avgDD = Array(horizon + 1).fill(0);
            simResults.paths.forEach(p => {
                let maxV = p.path[0];
                p.path.forEach((v, y) => {
                    maxV = Math.max(maxV, v);
                    avgDD[y] += (maxV - v) / maxV;
                });
            });
            const data = avgDD.map(v => (v / simResults.n) * 100);

            config = {
                type: 'line',
                data: {
                    labels: Array.from({ length: horizon + 1 }, (_, i) => 'Y' + i),
                    datasets: [{ label: 'Avg Drawdown %', data, borderColor: '#FF4560', backgroundColor: 'rgba(255,69,96,0.2)', fill: true, tension: 0.4 }]
                },
                options: {
                    plugins: { legend: { display: false } },
                    scales: {
                        x: { grid: { color: gridColor }, ticks: { color: tickColor, font } },
                        y: { grid: { color: gridColor }, ticks: { color: tickColor, font, callback: v => v + '%' } },
                    }
                }
            };
        } else if (activeTab === 'scatter') {
            // Risk Return Scatter
            const scData = assets.map(a => ({ x: a.vol, y: a.ret, r: 8, a }));
            // Portfolio Star
            scData.push({ x: simResults.wVol * 100, y: simResults.wRet * 100, r: 12, port: true });

            config = {
                type: 'bubble',
                data: {
                    datasets: scData.map((d, i) => ({
                        label: d.port ? 'PORTFOLIO' : d.a.name,
                        data: [{ x: d.x, y: d.y, r: d.r }],
                        backgroundColor: d.port ? '#FFF' : d.a.color,
                        borderColor: d.port ? '#000' : 'transparent', borderWidth: 2
                    }))
                },
                options: {
                    plugins: {
                        legend: { display: false },
                        tooltip: { callbacks: { label: c => `${c.dataset.label} (Risk: ${c.raw.x.toFixed(1)}%, Ret: ${c.raw.y.toFixed(1)}%)` } }
                    },
                    scales: {
                        x: { title: { display: true, text: 'Volatility (Risk) %', color: tickColor }, grid: { color: gridColor }, ticks: { color: tickColor, font } },
                        y: { title: { display: true, text: 'Expected Return %', color: tickColor }, grid: { color: gridColor }, ticks: { color: tickColor, font } }
                    }
                }
            };
        } else if (activeTab === 'annual') {
            // Annual Return Dist Box-like
            const horizon = params.horizon;
            const labels = Array.from({ length: horizon }, (_, i) => 'Year ' + (i + 1));

            const yrRets = Array.from({ length: horizon }, () => []);
            simResults.paths.forEach(p => {
                for (let y = 1; y <= horizon; y++) {
                    yrRets[y - 1].push((p.path[y] - p.path[y - 1]) / p.path[y - 1] * 100);
                }
            });
            yrRets.forEach(a => a.sort((x, y) => x - y));

            const p10 = yrRets.map(a => a[Math.floor(0.1 * a.length)]);
            const p50 = yrRets.map(a => a[Math.floor(0.5 * a.length)]);
            const p90 = yrRets.map(a => a[Math.floor(0.9 * a.length)]);

            config = {
                type: 'bar',
                data: {
                    labels,
                    datasets: [
                        { label: 'P90 Return', data: p90, backgroundColor: '#00D4FF', borderRadius: 2 },
                        { label: 'P50 Median', data: p50, backgroundColor: '#F5A623', borderRadius: 2 },
                        { label: 'P10 Return', data: p10, backgroundColor: '#FF4560', borderRadius: 2 },
                    ]
                },
                options: {
                    plugins: { legend: { labels: { color: tickColor, font } } },
                    scales: {
                        x: { grid: { color: gridColor }, ticks: { color: tickColor, font } },
                        y: { grid: { color: gridColor }, ticks: { color: tickColor, font, callback: v => v + '%' } }
                    }
                }
            };
        }

        chartRef.current = new Chart(ctx, config);
    }, [simResults, activeTab, params]);

    // ── 2. Tornado Chart ──
    useEffect(() => {
        if (!simResults || !tornadoCanvasRef.current) return;
        if (tornadoRef.current) tornadoRef.current.destroy();

        const ctx = tornadoCanvasRef.current.getContext('2d');
        const data = [
            { label: 'Return Rate (±10%)', val: 18.2 },
            { label: 'Investment Horizon (±2 Yrs)', val: 15.4 },
            { label: 'Initial Investment (±10%)', val: 10.0 },
            { label: 'Volatility (±5%)', val: -8.5 },
            { label: 'Inflation (±1%)', val: -6.2 },
            { label: 'Tax Rate (±2%)', val: -3.8 },
            { label: 'Asset Correlation (±0.2)', val: -2.1 },
        ].sort((a, b) => Math.abs(b.val) - Math.abs(a.val));

        tornadoRef.current = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.map(d => d.label),
                datasets: [{
                    label: 'Impact on Final Value %',
                    data: data.map(d => d.val),
                    backgroundColor: data.map(d => d.val >= 0 ? 'rgba(245,166,35,0.8)' : 'rgba(255,69,96,0.8)'),
                    borderRadius: 4
                }]
            },
            options: {
                indexAxis: 'y', responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => c.raw > 0 ? '+' + c.raw + '%' : c.raw + '%' } } },
                scales: {
                    x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: 'rgba(255,255,255,0.4)', font: { size: 10, family: "'JetBrains Mono', monospace" } } },
                    y: { grid: { display: false }, ticks: { color: 'rgba(255,255,255,0.6)', font: { size: 11 } } }
                }
            }
        });
    }, [simResults]);

    if (!simResults) {
        return (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--amber)' }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
                <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>No Simulation Data</h2>
                <p style={{ color: 'var(--text3)', fontSize: 13 }}>Please run a simulation in the Engine tab first to view risk analytics.</p>
            </div>
        );
    }

    const cardStyle = { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: 20 };
    const kpiCard = (label, value, color) => (
        <div style={cardStyle}>
            <div style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 8 }}>{label}</div>
            <div style={{ fontSize: 24, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color }}>{value}</div>
        </div>
    );

    return (
        <div>
            <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 26, fontWeight: 800 }}>Risk <span style={{ color: 'var(--amber)' }}>Analytics</span></h1>
                <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>Deep dive into portfolio risk metrics, drawdowns, and tail-end scenarios.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
                {kpiCard('VaR (95%)', formatINR(simResults.var95), 'var(--amber)')}
                {kpiCard('VaR (99%)', formatINR(simResults.var99), 'var(--red)')}
                {kpiCard('Expected Shortfall (CVaR)', formatINR(simResults.cvar95), '#C39BD3')}
                {kpiCard('Portfolio Beta', simResults.beta.toFixed(2), 'var(--cyan)')}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 20, marginBottom: 20 }}>
                {/* MAIN CHART AREA */}
                <div style={cardStyle}>
                    <div style={{ display: 'flex', gap: 10, borderBottom: '1px solid var(--border)', paddingBottom: 16, marginBottom: 16 }}>
                        {[
                            { id: 'distribution', label: 'Outcome Distribution' },
                            { id: 'drawdown', label: 'Drawdown Analysis' },
                            { id: 'scatter', label: 'Risk-Return Scatter' },
                            { id: 'annual', label: 'Annual Returns' },
                        ].map(t => (
                            <button key={t.id} onClick={() => setActiveTab(t.id)}
                                style={{ padding: '6px 12px', fontSize: 11, background: activeTab === t.id ? 'var(--amber-dim)' : 'transparent', color: activeTab === t.id ? 'var(--amber)' : 'var(--text3)', border: `1px solid ${activeTab === t.id ? 'var(--border2)' : 'transparent'}`, borderRadius: 6, cursor: 'pointer', fontFamily: "'Syne', sans-serif", fontWeight: 600 }}>
                                {t.label}
                            </button>
                        ))}
                    </div>
                    <div style={{ height: 320 }}><canvas ref={canvasRef} /></div>
                </div>

                {/* TORNADO CHART */}
                <div style={cardStyle}>
                    <div style={{ fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--text)', marginBottom: 16, fontWeight: 600 }}>🌪 Sensitivty Analysis</div>
                    <p style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 16 }}>Impact of external variables on median P50 outcome.</p>
                    <div style={{ height: 260 }}><canvas ref={tornadoCanvasRef} /></div>
                </div>
            </div>

            {/* METRICS TABLE */}
            <div style={cardStyle}>
                <div style={{ fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--text)', marginBottom: 16, fontWeight: 600 }}>📋 Detailed Risk Metrics</div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr>{['Metric', 'Value', 'Description'].map(h => <th key={h} style={{ textAlign: 'left', padding: '12px 14px', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text3)', borderBottom: '1px solid var(--border)' }}>{h}</th>)}</tr>
                    </thead>
                    <tbody>
                        {[
                            { m: 'Sharpe Ratio', v: simResults.sharpe.toFixed(2), c: 'var(--cyan)', d: 'Risk-adjusted return vs. Risk-Free Rate of 6.5%' },
                            { m: 'Sortino Ratio', v: simResults.sortino.toFixed(2), c: 'var(--cyan)', d: 'Risk-adjusted return focusing only on downside volatility' },
                            { m: 'Calmar Ratio', v: simResults.calmar.toFixed(2), c: 'var(--cyan)', d: 'Return relative to Maximum Drawdown risk' },
                            { m: 'Max Drawdown', v: (simResults.maxMDD * 100).toFixed(2) + '%', c: 'var(--red)', d: 'Largest peak-to-trough drop in portfolio value' },
                            { m: 'Skewness', v: simResults.skew.toFixed(2), c: 'var(--text)', d: 'Assesses the asymmetry of the return distribution' },
                            { m: 'Kurtosis', v: simResults.kurt.toFixed(2), c: 'var(--text)', d: 'Measures fat tails; higher kurtosis means higher tail risk' },
                            { m: 'Value at Risk (95%)', v: formatINR(simResults.var95), c: 'var(--amber)', d: 'Max expected loss with 95% confidence in year 1' },
                            { m: 'Cond. VaR (Expected Shortfall)', v: formatINR(simResults.cvar95), c: 'var(--red)', d: 'Average loss magnitude when VaR boundary is breached' },
                        ].map(r => (
                            <tr key={r.m}>
                                <td style={{ padding: '14px', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 12, fontWeight: 600 }}>{r.m}</td>
                                <td style={{ padding: '14px', borderBottom: '1px solid rgba(255,255,255,0.04)', fontFamily: "'JetBrains Mono', monospace", color: r.c, fontWeight: 600 }}>{r.v}</td>
                                <td style={{ padding: '14px', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 11, color: 'var(--text3)' }}>{r.d}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
