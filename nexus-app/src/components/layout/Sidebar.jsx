import { useNexus } from '../../context/NexusContext';

const NAV_ITEMS = [
    { id: 'portfolio', icon: '◎', label: 'Portfolio Setup' },
    { id: 'simulation', icon: '⚡', label: 'Simulation Engine' },
    { id: 'analytics', icon: '📊', label: 'Risk Analytics' },
    { id: 'scenario', icon: '🌊', label: 'Scenario Stress Test' },
    { id: 'report', icon: '📋', label: 'Intelligence Report' },
];

export default function Sidebar({ activePage, setActivePage }) {
    const { simStatus } = useNexus();
    const statusColor = simStatus === 'running' ? '#00D4FF' : simStatus === 'done' ? '#00E396' : '#F5A623';
    const statusLabel = simStatus.charAt(0).toUpperCase() + simStatus.slice(1);

    return (
        <aside style={{ width: 240, minWidth: 240, background: 'var(--bg2)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
            {/* LOGO */}
            <div style={{ padding: '22px 20px 18px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, background: 'var(--amber)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>⬡</div>
                    <div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--amber)', letterSpacing: 2 }}>NEXUS</div>
                        <div style={{ fontSize: 9, color: 'var(--text3)', letterSpacing: 3, textTransform: 'uppercase' }}>Risk Intelligence</div>
                    </div>
                </div>
            </div>

            {/* NAV */}
            <nav style={{ padding: '16px 12px', flex: 1 }}>
                {NAV_ITEMS.map(item => (
                    <div key={item.id}
                        onClick={() => setActivePage(item.id)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            padding: '11px 14px', borderRadius: 10, cursor: 'pointer',
                            color: activePage === item.id ? 'var(--amber)' : 'var(--text2)',
                            background: activePage === item.id ? 'var(--amber-dim)' : 'transparent',
                            border: `1px solid ${activePage === item.id ? 'var(--border2)' : 'transparent'}`,
                            fontSize: 13, fontWeight: 500, marginBottom: 4,
                            boxShadow: activePage === item.id ? '0 0 30px rgba(245,166,35,0.15)' : 'none',
                            transition: 'all 0.2s'
                        }}
                    >
                        <span style={{ fontSize: 16, width: 20, textAlign: 'center' }}>{item.icon}</span>
                        {item.label}
                    </div>
                ))}
            </nav>

            {/* STATUS */}
            <div style={{ padding: '16px 12px', borderTop: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--bg3)', borderRadius: 8, border: '1px solid var(--border)' }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: statusColor, boxShadow: `0 0 8px ${statusColor}` }} />
                    <span style={{ fontSize: 11, color: 'var(--text3)' }}>Status: </span>
                    <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: statusColor }}>{statusLabel}</span>
                </div>
            </div>
        </aside>
    );
}
