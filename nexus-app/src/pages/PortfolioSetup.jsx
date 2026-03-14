import { useState, useEffect, useRef } from 'react';
import { useNexus, ASSET_COLORS } from '../context/NexusContext';
import { buildCorrMatrix } from '../utils/finance';
import { Chart } from 'chart.js/auto';

export default function PortfolioSetup() {
    const { assets, setAssets, params, setParams } = useNexus();
    const [form, setForm] = useState({ name: '', cls: 'equity', alloc: 20, ret: 12, vol: 18 });
    const donutRef = useRef(null);
    const chartRef = useRef(null);

    // ── Donut Chart
    useEffect(() => {
        if (chartRef.current) chartRef.current.destroy();
        if (!donutRef.current) return;
        const ctx = donutRef.current.getContext('2d');
        const data = assets.length ? assets.map(a => a.alloc) : [100];
        const colors = assets.length ? assets.map(a => a.color) : ['rgba(90,90,114,0.3)'];
        chartRef.current = new Chart(ctx, {
            type: 'doughnut',
            data: { labels: assets.length ? assets.map(a => a.name) : ['Empty'], datasets: [{ data, backgroundColor: colors, borderColor: '#07070D', borderWidth: 3, hoverOffset: 6 }] },
            options: { cutout: '68%', plugins: { legend: { display: false } }, animation: { duration: 600 } }
        });
        return () => chartRef.current?.destroy();
    }, [assets]);

    function addAsset() {
        if (!form.name.trim()) {
            alert('Please enter an asset name');
            return;
        }
        if (form.alloc <= 0) {
            alert('Allocation % must be greater than 0');
            return;
        }

        const usedTotal = assets.reduce((s, a) => s + Number(a.alloc), 0);
        const remaining = parseFloat((100 - usedTotal).toFixed(4));

        if (remaining <= 0) {
            alert('Portfolio is already 100% allocated. Remove or reduce an existing asset first.');
            return;
        }

        if (Number(form.alloc) > remaining + 0.01) {
            alert(`Only ${remaining.toFixed(1)}% allocation remaining. Please enter ${remaining.toFixed(1)}% or less.`);
            setForm({ ...form, alloc: parseFloat(remaining.toFixed(1)) });
            return;
        }

        const newAsset = {
            name: form.name.trim(),
            cls: form.cls,
            alloc: Number(form.alloc),
            ret: Number(form.ret),
            vol: Number(form.vol),
            color: ASSET_COLORS[assets.length % ASSET_COLORS.length]
        };

        const updatedAssets = [...assets, newAsset];
        setAssets(updatedAssets);

        const newUsed = updatedAssets.reduce((s, a) => s + Number(a.alloc), 0);
        const newRemaining = parseFloat((100 - newUsed).toFixed(4));

        setForm({
            name: '',
            cls: 'equity',
            alloc: newRemaining > 0 ? parseFloat(Math.min(20, newRemaining).toFixed(1)) : 0,
            ret: 12,
            vol: 18
        });
    }

    const total = assets.reduce((s, a) => s + Number(a.alloc), 0);
    const corr = buildCorrMatrix(assets);

    // Tag colors
    const tagStyle = (cls) => {
        const map = { equity: ['rgba(0,212,255,0.1)', '#00D4FF'], debt: ['rgba(0,227,150,0.1)', '#00E396'], commodity: ['rgba(245,166,35,0.1)', '#F5A623'], realestate: ['rgba(155,89,182,0.15)', '#C39BD3'], cash: ['rgba(127,140,141,0.15)', '#95A5A6'] };
        const [bg, color] = map[cls] || map.cash;
        return { padding: '3px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600, background: bg, color, textTransform: 'uppercase', letterSpacing: 1 };
    };

    const inputStyle = { width: '100%', padding: '10px 14px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 13, fontFamily: "'Syne', sans-serif", outline: 'none' };
    const labelStyle = { fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text3)', margin: '0 0 6px 0', display: 'block', fontWeight: 600 };
    const cardStyle = { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: 20 };

    return (
        <div>
            <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 26, fontWeight: 800 }}>Portfolio <span style={{ color: 'var(--amber)' }}>Setup</span></h1>
                <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>Configure Indian assets with returns, volatility and allocation weights.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 18, marginBottom: 18 }}>
                {/* ADD ASSET FORM */}
                <div style={cardStyle}>
                    <div style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 14, fontWeight: 600 }}>➕ Add New Asset</div>
                    <div style={{ marginBottom: 14 }}>
                        <label style={labelStyle}>Asset Name</label>
                        <input style={inputStyle} type="text" value={form.name} placeholder="e.g. Nifty 50 Index Fund"
                            onChange={e => setForm({ ...form, name: e.target.value })}
                            onFocus={e => e.target.style.borderColor = 'var(--amber)'}
                            onBlur={e => e.target.style.borderColor = 'var(--border)'}
                        />
                    </div>

                    {/* Allocation % field with live remaining indicator */}
                    <div style={{ marginBottom: 14 }}>
                        <label style={{
                            ...labelStyle,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <span>Allocation %</span>
                            <span style={{
                                fontFamily: "'JetBrains Mono', monospace",
                                fontSize: 10,
                                letterSpacing: 1,
                                color: (() => {
                                    const used = assets.reduce((s, a) => s + Number(a.alloc), 0);
                                    const rem = 100 - used;
                                    return rem < 5 ? 'var(--red)' : rem < 20 ? 'var(--amber)' : 'var(--green)';
                                })()
                            }}>
                                {(() => {
                                    const used = assets.reduce((s, a) => s + Number(a.alloc), 0);
                                    return `${(100 - used).toFixed(1)}% remaining`;
                                })()}
                            </span>
                        </label>

                        <input
                            style={inputStyle}
                            type="number"
                            min="0.1"
                            max="100"
                            step="0.1"
                            value={form.alloc}
                            onChange={e => setForm({ ...form, alloc: e.target.value })}
                            onFocus={e => e.target.style.borderColor = 'var(--amber)'}
                            onBlur={e => e.target.style.borderColor = 'var(--border)'}
                        />

                        {/* Visual allocation progress bar */}
                        <div style={{
                            height: 4,
                            background: 'var(--bg3)',
                            borderRadius: 2,
                            marginTop: 8,
                            overflow: 'hidden'
                        }}>
                            <div style={{
                                height: '100%',
                                borderRadius: 2,
                                transition: 'width 0.3s, background 0.3s',
                                background: (() => {
                                    const used = assets.reduce((s, a) => s + Number(a.alloc), 0);
                                    return used > 90 ? 'var(--red)' : used > 70 ? 'var(--amber)' : 'var(--green)';
                                })(),
                                width: `${Math.min(100, assets.reduce((s, a) => s + Number(a.alloc), 0))}%`
                            }} />
                        </div>

                        <div style={{
                            fontSize: 10,
                            color: 'var(--text3)',
                            marginTop: 4,
                            fontFamily: "'JetBrains Mono', monospace"
                        }}>
                            Used: {assets.reduce((s, a) => s + Number(a.alloc), 0).toFixed(1)}% / 100%
                            &nbsp;·&nbsp;
                            {assets.length} asset{assets.length !== 1 ? 's' : ''} added
                        </div>
                    </div>

                    {[
                        { label: 'Expected Annual Return %', key: 'ret', type: 'number', min: -50, max: 100 },
                        { label: 'Annual Volatility %', key: 'vol', type: 'number', min: 0, max: 80 },
                    ].map(f => (
                        <div key={f.key} style={{ marginBottom: 14 }}>
                            <label style={labelStyle}>{f.label}</label>
                            <input style={inputStyle} type={f.type} value={form[f.key]} placeholder={f.placeholder || ''} min={f.min} max={f.max}
                                onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                                onFocus={e => e.target.style.borderColor = 'var(--amber)'}
                                onBlur={e => e.target.style.borderColor = 'var(--border)'}
                            />
                        </div>
                    ))}
                    <div style={{ marginBottom: 14 }}>
                        <label style={labelStyle}>Asset Class</label>
                        <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.cls} onChange={e => setForm({ ...form, cls: e.target.value })}>
                            {['equity', 'debt', 'commodity', 'realestate', 'cash'].map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                        </select>
                    </div>
                    {(() => {
                        const used = assets.reduce((s, a) => s + Number(a.alloc), 0);
                        const remaining = parseFloat((100 - used).toFixed(4));
                        const isFull = remaining <= 0;

                        return (
                            <button
                                onClick={addAsset}
                                disabled={isFull}
                                style={{
                                    width: '100%',
                                    padding: 13,
                                    borderRadius: 10,
                                    background: isFull ? 'rgba(90,90,114,0.3)' : 'var(--amber)',
                                    color: isFull ? 'var(--text3)' : '#000',
                                    fontFamily: "'Syne', sans-serif",
                                    fontSize: 14,
                                    fontWeight: 800,
                                    border: 'none',
                                    cursor: isFull ? 'not-allowed' : 'pointer',
                                    letterSpacing: 1,
                                    marginTop: 8,
                                    transition: 'all 0.2s'
                                }}
                            >
                                {isFull
                                    ? '✓ Portfolio 100% Allocated'
                                    : `＋ INSERT ASSET (${remaining.toFixed(1)}% left)`}
                            </button>
                        );
                    })()}
                </div>

                {/* CURRENT PORTFOLIO TABLE */}
                <div>
                    <div style={{ ...cardStyle, marginBottom: 18 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ color: 'var(--amber)' }}>◎</span> Current Portfolio</div>
                        {assets.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text3)', fontSize: 13 }}>No assets added yet — load the Indian sample or add assets.</div>
                        ) : (
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr>{['Asset', 'Class', 'Alloc', 'Return', 'Vol', ''].map(h => <th key={h} style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--text3)', padding: '8px 10px', textAlign: h === 'Asset' ? 'left' : 'right', borderBottom: '1px solid var(--border)' }}>{h}</th>)}</tr>
                                </thead>
                                <tbody>
                                    {assets.map((a, i) => (
                                        <tr key={i}>
                                            <td style={{ padding: '10px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                                <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: a.color, marginRight: 8, verticalAlign: 'middle' }} />{a.name}
                                            </td>
                                            <td style={{ padding: '10px', borderBottom: '1px solid rgba(255,255,255,0.04)', textAlign: 'right' }}><span style={tagStyle(a.cls)}>{a.cls}</span></td>
                                            <td style={{ padding: '10px', borderBottom: '1px solid rgba(255,255,255,0.04)', textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", color: 'var(--amber)' }}>{Number(a.alloc).toFixed(1)}%</td>
                                            <td style={{ padding: '10px', borderBottom: '1px solid rgba(255,255,255,0.04)', textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", color: 'var(--green)' }}>{a.ret > 0 ? '+' : ''}{Number(a.ret).toFixed(1)}%</td>
                                            <td style={{ padding: '10px', borderBottom: '1px solid rgba(255,255,255,0.04)', textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", color: 'var(--red)' }}>{Number(a.vol).toFixed(1)}%</td>
                                            <td style={{ padding: '10px', borderBottom: '1px solid rgba(255,255,255,0.04)', textAlign: 'right' }}>
                                                <button onClick={() => setAssets(assets.filter((_, j) => j !== i))} style={{ padding: '6px 12px', borderRadius: 6, background: 'rgba(255,69,96,0.12)', border: '1px solid rgba(255,69,96,0.25)', color: 'var(--red)', cursor: 'pointer', fontSize: 12 }}>✕</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* PARAMS */}
                    <div style={cardStyle}>
                        <div style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 14, fontWeight: 600 }}>⚙ Portfolio Parameters</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                            {[
                                { label: 'Initial Investment (₹)', key: 'initialInv', type: 'number' },
                                { label: 'Inflation Rate %', key: 'inflation', type: 'number' },
                                { label: 'LTCG Tax Rate %', key: 'tax', type: 'number' },
                            ].map(f => (
                                <div key={f.key}>
                                    <label style={labelStyle}>{f.label}</label>
                                    <input style={inputStyle} type="number" value={params[f.key]} onChange={e => setParams({ ...params, [f.key]: +e.target.value })} />
                                </div>
                            ))}
                            <div>
                                <label style={labelStyle}>Investment Horizon: <span style={{ color: 'var(--amber)', fontFamily: "'JetBrains Mono', monospace" }}>{params.horizon} yrs</span></label>
                                <input type="range" min={1} max={30} value={params.horizon} onChange={e => setParams({ ...params, horizon: +e.target.value })}
                                    style={{ width: '100%', accentColor: 'var(--amber)', cursor: 'pointer', marginTop: 8 }} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* DONUT + CORRELATION ROW */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                <div style={cardStyle}>
                    <div style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 14, fontWeight: 600 }}>🍩 Live Allocation Donut</div>
                    <div style={{ position: 'relative', height: 200, display: 'flex', justifyContent: 'center' }}>
                        <canvas ref={donutRef} width={200} height={200} style={{ maxWidth: 200, maxHeight: 200 }} />
                        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center' }}>
                            <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: 'var(--amber)' }}>{total.toFixed(0)}%</div>
                            <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 2, color: 'var(--text3)' }}>Allocated</div>
                        </div>
                    </div>
                    {assets.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 16 }}>
                            {assets.map(a => <div key={a.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text2)' }}>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: a.color, display: 'inline-block' }} />{a.name} ({a.alloc}%)
                            </div>)}
                        </div>
                    )}
                </div>

                <div style={cardStyle}>
                    <div style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 14, fontWeight: 600 }}>🔗 Asset Correlation Matrix</div>
                    {assets.length < 2 ? (
                        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text3)', fontSize: 12 }}>Add at least 2 assets to see the correlation matrix</div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: `60px repeat(${assets.length}, 1fr)`, gap: 2 }}>
                                <div />
                                {assets.map((a, i) => <div key={`col-${i}`} style={{ fontSize: 9, color: 'var(--text3)', textAlign: 'center', padding: 2, wordBreak: 'break-all', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>{a.name.slice(0, 7)}</div>)}
                                {assets.map((a, i) => [
                                    <div key={`lbl-${i}`} style={{ fontSize: 9, color: 'var(--text3)', textAlign: 'right', padding: '4px 4px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>{a.name.slice(0, 7)}</div>,
                                    ...corr[i].map((v, j) => {
                                        const r = v > 0 ? Math.round(v * 220) : 0;
                                        const g = v < 0 ? Math.round(Math.abs(v) * 180) : 0;
                                        return <div key={`${i}-${j}`} style={{ aspectRatio: '1/1', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `rgba(${r},${g},${v === 1 ? 120 : 40},${Math.abs(v) * 0.8 + 0.15})`, borderRadius: 4, fontSize: 9, fontFamily: "'JetBrains Mono', monospace", color: Math.abs(v) > 0.5 ? '#fff' : 'rgba(255,255,255,0.6)', fontWeight: 600 }}>{v.toFixed(1)}</div>;
                                    })
                                ])}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
