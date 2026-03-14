import { useRef, useEffect } from 'react';
import { useNexus, ASSET_COLORS } from '../context/NexusContext';
import { formatINR } from '../utils/finance';
import { useToast } from '../components/Toast';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

export default function IntelligenceReport() {
    const { assets, params, simResults } = useNexus();
    const { addToast } = useToast();
    const donutRef = useRef(null);
    const chartRef = useRef(null);

    useEffect(() => {
        if (!simResults || !donutRef.current) return;
        if (chartRef.current) chartRef.current.destroy();

        const ctx = donutRef.current.getContext('2d');
        const data = assets.map(a => a.alloc);
        const colors = assets.map(a => a.color);

        chartRef.current = new Chart(ctx, {
            type: 'doughnut',
            data: { labels: assets.map(a => a.name), datasets: [{ data, backgroundColor: colors, borderColor: '#07070D', borderWidth: 3, hoverOffset: 4 }] },
            options: { cutout: '65%', plugins: { legend: { display: false } }, animation: { duration: 600 } }
        });
    }, [simResults, assets]);

    const handleExportCSV = () => {
        if (!simResults) return;
        const r = simResults;
        let csv = `NEXUS RISK INTELLIGENCE REPORT\n\n`;

        csv += `PORTFOLIO ASSETS\nAsset,Class,Allocation %,Return %,Volatility %\n`;
        assets.forEach(a => csv += `"${a.name}",${a.cls},${a.alloc},${a.ret},${a.vol}\n`);

        csv += `\nSIMULATION PARAMETERS\nInitial Investment,${params.initialInv}\nHorizon,${params.horizon}\nInflation Rate,${params.inflation}%\nTax Rate,${params.tax}%\nSimulations,${params.numSims}\nBase Distribution,${params.dist}\nRebalancing,${params.rebalancing}\n`;

        csv += `\nKEY RISK METRICS\nMetric,Value\nSharpe Ratio,${r.sharpe.toFixed(2)}\nSortino Ratio,${r.sortino.toFixed(2)}\nCalmar Ratio,${r.calmar.toFixed(2)}\nBeta,${r.beta.toFixed(2)}\nMax Drawdown,${(r.maxMDD * 100).toFixed(2)}%\nVaR (95%),${r.var95}\nCVaR (95%),${r.cvar95}\nProb. of Profit,${(r.probProfit * 100).toFixed(1)}%\nBeating Inflation,${(r.probInflation * 100).toFixed(1)}%\n`;

        csv += `\nPERCENTILE OUTCOMES\nP90 Best Case,${r.p90}\nP75,${r.p75}\nP50 Median,${r.p50}\nP25,${r.p25}\nP10 Worst Case,${r.p10}\n`;

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'nexus_risk_report.csv';
        link.click();
        addToast('Report exported as CSV successfully', 'success');
    };

    if (!simResults) {
        return (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--amber)' }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>📋</div>
                <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Report Not Available</h2>
                <p style={{ color: 'var(--text3)', fontSize: 13 }}>Run the Monte Carlo simulation to generate your intelligence report.</p>
            </div>
        );
    }

    const { initialInv, horizon } = params;
    const multiple = (simResults.p50 / initialInv).toFixed(1);
    const eqAlloc = assets.filter(a => a.cls === 'equity').reduce((s, a) => s + Number(a.alloc), 0);

    const reqYears = [3, 5, 7, 10, 15].filter(y => y <= horizon);
    const targetMults = [1.25, 1.5, 2, 3, 5];

    const probMatrix = targetMults.map(m => {
        const target = initialInv * m;
        return reqYears.map(y => {
            let count = 0;
            simResults.paths.forEach(p => { if (p.path[y] >= target) count++; });
            return (count / simResults.n) * 100;
        });
    });

    const recommendations = [];
    if (simResults.sharpe > 1.0) recommendations.push({ icon: '🏆', text: 'Excellent Risk/Reward. Your portfolio demonstrates high historical efficiency per unit of risk.' });
    if (simResults.sharpe < 0.5) recommendations.push({ icon: '⚠️', text: 'Poor Risk-Adjusted Returns. Consider replacing low-yield or highly volatile assets to improve your Sharpe ratio.' });
    if (simResults.maxMDD > 0.40) recommendations.push({ icon: '📉', text: 'High Drawdown Risk. Your portfolio max drawdown exceeds 40%. Consider adding fixed income or sovereign gold bonds for downside protection.' });
    if (simResults.probInflation < 0.60) recommendations.push({ icon: '💸', text: 'Inflation Risk. There is a meaningful chance your portfolio returns will not beat inflation. Increase allocation to growth assets like equities or commodities.' });
    if (eqAlloc > 80) recommendations.push({ icon: '📊', text: 'Concentration Risk. Your heavy equity allocation (>80%) creates vulnerability to market crashes. Ensure you have adequate emergency cash and defensive assets.' });
    if (eqAlloc < 30 && horizon > 7) recommendations.push({ icon: '📈', text: 'Growth Drag. For a long-term horizon (>7 years), a low equity allocation (<30%) severely limits your compounding potential.' });
    if (simResults.probProfit > 0.85) recommendations.push({ icon: '✨', text: 'High Capital Preservation. This configuration shows a very strong historical probability (>85%) of turning a profit by the end of the horizon.' });
    recommendations.push({ icon: '💡', text: 'Tax Efficiency Tip: Maximize your §80C tax benefits via ELSS funds (if applicable), and harvest long-term capital gains up to ₹1.25L annually tax-free in India.' });
    recommendations.push({ icon: '🔄', text: 'Rebalancing Advice: Stick to your declared rebalancing schedule. Automated rebalancing forces you to buy low and sell high across asset classes.' });

    const cardStyle = { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: 24, marginBottom: 20 };
    const hStyle = { fontSize: 13, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text)', marginBottom: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 };

    return (
        <div className="report-container" style={{ paddingBottom: 40 }}>
            {/* HEADER & EXPORTS */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                <div>
                    <h1 style={{ fontSize: 26, fontWeight: 800 }}>Intelligence <span style={{ color: 'var(--amber)' }}>Report</span></h1>
                    <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>Comprehensive risk & return outlook based on Monte Carlo inference.</p>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                    <button onClick={() => window.print()} style={{ padding: '8px 16px', borderRadius: 8, background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)', cursor: 'pointer', fontSize: 12, fontFamily: "'Syne', sans-serif", fontWeight: 600 }}>🖨️ Export PDF</button>
                    <button onClick={handleExportCSV} style={{ padding: '8px 16px', borderRadius: 8, background: 'var(--amber)', border: 'none', color: '#000', cursor: 'pointer', fontSize: 12, fontFamily: "'Syne', sans-serif", fontWeight: 700 }}>📊 Export CSV</button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
                {/* LEFT COLUMN - SUMMARY & METRICS & MATRIX */}
                <div>
                    {/* EXEC SUMMARY */}
                    <div style={cardStyle}>
                        <div style={hStyle}><span style={{ color: 'var(--amber)' }}>📝</span> Executive Summary</div>
                        <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text2)' }}>
                            Over the <span style={{ color: 'var(--text)', fontWeight: 600 }}>{horizon}-year</span> simulation horizon, the multi-asset portfolio has an expected median (P50) final value of <span style={{ color: 'var(--amber)', fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{formatINR(simResults.p50)}</span>, representing a <span style={{ color: 'var(--green)', fontWeight: 600 }}>{multiple}×</span> multiple on the invested capital.
                            The configuration exhibits a <span style={{ color: 'var(--text)', fontWeight: 600 }}>{(simResults.probProfit * 100).toFixed(1)}%</span> probability of absolute profit and a Sharpe ratio of <span style={{ color: 'var(--cyan)' }}>{simResults.sharpe.toFixed(2)}</span>, indicating {simResults.sharpe > 1 ? 'excellent' : simResults.sharpe > 0.5 ? 'acceptable' : 'sub-optimal'} risk-adjusted efficiency.
                            The portfolio beta is measured at <span style={{ color: 'var(--text)' }}>{simResults.beta.toFixed(2)}</span>. In a bearish 10th percentile scenario, the ending wealth could compress to <span style={{ color: 'var(--red)', fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{formatINR(simResults.p10)}</span>.
                        </p>
                    </div>

                    {/* KEY METRICS */}
                    <div style={cardStyle}>
                        <div style={hStyle}><span style={{ color: 'var(--cyan)' }}>📊</span> Core Risk Metrics</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                            {[
                                { l: 'Sharpe Ratio', v: simResults.sharpe.toFixed(2), c: 'var(--cyan)' },
                                { l: 'Sortino Ratio', v: simResults.sortino.toFixed(2), c: 'var(--cyan)' },
                                { l: 'Max Drawdown', v: (simResults.maxMDD * 100).toFixed(2) + '%', c: 'var(--red)' },
                                { l: 'Volatility', v: (simResults.wVol * 100).toFixed(2) + '%', c: 'var(--amber)' },
                                { l: 'VaR 95%', v: formatINR(simResults.var95), c: 'var(--amber)' },
                                { l: 'CVaR 95%', v: formatINR(simResults.cvar95), c: 'var(--red)' },
                                { l: 'Prob. Profit', v: (simResults.probProfit * 100).toFixed(1) + '%', c: 'var(--green)' },
                                { l: 'Beat Inflation', v: (simResults.probInflation * 100).toFixed(1) + '%', c: 'var(--green)' },
                            ].map(k => (
                                <div key={k.l} style={{ padding: '12px 16px', background: 'var(--bg3)', borderRadius: 8, border: '1px solid var(--border)' }}>
                                    <div style={{ fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 6 }}>{k.l}</div>
                                    <div style={{ fontSize: 16, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: k.c }}>{k.v}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* PROBABILITY MATRIX */}
                    {reqYears.length > 0 && (
                        <div style={cardStyle}>
                            <div style={hStyle}><span style={{ color: 'var(--green)' }}>🎯</span> Target Probability Matrix</div>
                            <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 16 }}>Likelihood of achieving wealth multiples over specified timeframes.</p>
                            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid var(--border)' }}>
                                <thead>
                                    <tr>
                                        <th style={{ background: 'var(--bg3)', padding: 10, border: '1px solid var(--border)' }}></th>
                                        {reqYears.map(y => <th key={y} style={{ background: 'var(--bg3)', padding: 10, fontSize: 11, color: 'var(--text)', border: '1px solid var(--border)' }}>Year {y}</th>)}
                                    </tr>
                                </thead>
                                <tbody>
                                    {targetMults.map((m, i) => (
                                        <tr key={m}>
                                            <td style={{ background: 'var(--bg3)', padding: 10, fontSize: 11, fontWeight: 700, border: '1px solid var(--border)' }}>{m}× ({(m * initialInv / 100000).toFixed(1)}L)</td>
                                            {probMatrix[i].map((p, j) => {
                                                const bg = p > 50 ? 'rgba(0,227,150,0.15)' : p > 20 ? 'rgba(245,166,35,0.15)' : 'rgba(255,69,96,0.15)';
                                                const col = p > 50 ? 'var(--green)' : p > 20 ? 'var(--amber)' : 'var(--red)';
                                                return <td key={j} style={{ background: bg, color: col, padding: 10, textAlign: 'center', fontSize: 12, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, border: '1px solid var(--border)' }}>
                                                    {p.toFixed(1)}%
                                                </td>
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* RIGHT COLUMN - COMPOSITION & RECOMMENDATIONS */}
                <div>
                    <div style={cardStyle}>
                        <div style={hStyle}>🍩 Composition</div>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
                            <canvas ref={donutRef} width={180} height={180} style={{ maxWidth: 180, maxHeight: 180 }} />
                        </div>
                        <div>
                            {assets.map((a, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--text2)' }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: a.color, display: 'inline-block' }} />{a.name.slice(0, 20)}{a.name.length > 20 ? '...' : ''}</div>
                                    <div style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: 'var(--text)', fontWeight: 600 }}>{a.alloc}%</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div style={{ ...cardStyle, background: 'linear-gradient(180deg, var(--card) 0%, var(--bg3) 100%)' }}>
                        <div style={hStyle}><span style={{ color: 'var(--cyan)' }}>🤖</span> AI Recommendations</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {recommendations.map((r, i) => (
                                <div key={i} style={{ padding: 14, background: 'rgba(255,255,255,0.02)', borderRadius: 8, borderLeft: '3px solid var(--amber)', border: '1px solid var(--border)', borderLeftWidth: 3 }}>
                                    <div style={{ display: 'flex', gap: 10 }}>
                                        <div style={{ fontSize: 16 }}>{r.icon}</div>
                                        <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>{r.text}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
        @media print {
          body { background: white !important; color: black !important; }
          .report-container { padding: 0 !important; }
          * { border-color: #ddd !important; }
          canvas { filter: invert(1) hue-rotate(180deg); }
          button { display: none !important; }
          aside, .topbar { display: none !important; }
          #app { height: auto !important; overflow: visible !important; }
        }
      `}</style>
        </div>
    );
}
