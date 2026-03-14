import { useNexus } from '../../context/NexusContext';

const PAGE_NAMES = {
    portfolio: 'Portfolio Setup', simulation: 'Simulation Engine',
    analytics: 'Risk Analytics', scenario: 'Scenario Stress Test', report: 'Intelligence Report'
};

export default function TopBar({ activePage }) {
    const { assets, setAssets } = useNexus();

    function loadSamplePortfolio() {
        const sampleAssets = [
            { name: 'Nifty 50 Index Fund', cls: 'equity', alloc: 35, ret: 13.5, vol: 18, color: '#F5A623' },
            { name: 'Nifty Midcap 150 Fund', cls: 'equity', alloc: 20, ret: 16.0, vol: 26, color: '#00D4FF' },
            { name: 'HDFC Corporate Bond Fund', cls: 'debt', alloc: 15, ret: 7.8, vol: 4, color: '#00E396' },
            { name: 'Sovereign Gold Bond', cls: 'commodity', alloc: 10, ret: 8.5, vol: 14, color: '#FFD700' },
            { name: 'US S&P 500 FOF', cls: 'equity', alloc: 10, ret: 11.5, vol: 17, color: '#C39BD3' },
            { name: 'Mirae ELSS Tax Saver', cls: 'equity', alloc: 5, ret: 14.0, vol: 22, color: '#F39C12' },
            { name: 'Liquid Fund', cls: 'cash', alloc: 5, ret: 6.5, vol: 1, color: '#95A5A6' },
        ];

        // Verify total is exactly 100
        const total = sampleAssets.reduce((s, a) => s + a.alloc, 0);
        console.log('Sample portfolio total allocation:', total); // Should be 100

        setAssets(sampleAssets);
    }

    return (
        <div style={{ height: 56, minHeight: 56, background: 'var(--bg2)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ fontSize: 12, color: 'var(--text3)', letterSpacing: 1, textTransform: 'uppercase' }}>{PAGE_NAMES[activePage]}</span>
                {(() => {
                    const total = assets.reduce((s, a) => s + Number(a.alloc), 0);
                    const remaining = parseFloat((100 - total).toFixed(4));
                    const isComplete = Math.abs(total - 100) < 0.1;
                    const isOver = total > 100.1;

                    if (assets.length === 0) return null;

                    return (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8
                        }}>
                            <div style={{
                                padding: '4px 12px',
                                borderRadius: 20,
                                fontSize: 12,
                                fontWeight: 600,
                                fontFamily: "'JetBrains Mono', monospace",
                                border: `1px solid ${isOver ? 'rgba(255,69,96,0.5)' : isComplete ? 'rgba(0,227,150,0.4)' : 'var(--border2)'}`,
                                color: isOver ? 'var(--red)' : isComplete ? 'var(--green)' : 'var(--amber)',
                                background: isOver ? 'rgba(255,69,96,0.12)' : isComplete ? 'rgba(0,227,150,0.1)' : 'var(--amber-dim)'
                            }}>
                                {isComplete && '✓ '}
                                {isOver && '⚠ '}
                                Allocated: {total.toFixed(1)}%
                                {!isComplete && !isOver && assets.length > 0 && ` · ${remaining.toFixed(1)}% free`}
                            </div>
                        </div>
                    );
                })()}
            </div>
            <button onClick={loadSamplePortfolio}
                style={{ padding: '7px 16px', borderRadius: 8, background: 'transparent', border: '1px solid var(--border2)', color: 'var(--amber)', cursor: 'pointer', fontSize: 12, fontFamily: "'Syne', sans-serif", fontWeight: 600, letterSpacing: '0.5px' }}>
                ⬇ Load Indian Sample
            </button>
        </div>
    );
}
