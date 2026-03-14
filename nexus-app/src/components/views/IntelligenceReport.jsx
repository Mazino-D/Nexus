import React from 'react';
import { ClipboardList, Download } from 'lucide-react';

export function IntelligenceReport() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} className="animate-fade-in delay-1">
                <div>
                    <h2>Intelligence <span className="amber-text">Report</span></h2>
                    <p style={{ color: 'var(--text-muted)' }}>Comprehensive quantitative summary.</p>
                </div>
                <button className="glass-panel" style={{
                    padding: '0.75rem 1.5rem', display: 'flex', gap: '0.75rem', alignItems: 'center',
                    background: 'rgba(255,255,255,0.05)', color: 'var(--text-platinum)', border: '1px solid rgba(255,255,255,0.1)',
                    cursor: 'pointer', transition: 'all 0.2s'
                }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--accent-amber)';
                        e.currentTarget.style.color = 'var(--accent-amber)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                        e.currentTarget.style.color = 'var(--text-platinum)';
                    }}
                >
                    <Download size={18} /> EXPORT PDF
                </button>
            </div>

            <div className="glass-panel animate-fade-in delay-2">
                <h3 style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.75rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ClipboardList size={20} className="amber-text" /> Executive Summary
                </h3>
                <p style={{ color: 'var(--text-platinum)', lineHeight: 1.6 }}>
                    Based on the current allocation strategy and historical backtesting over the past 10 years, the portfolio exhibits a strong risk-adjusted return profile.
                    The Sortino ratio suggests adequate compensation for downside risk. However, heavy tech sector leaning introduces potential single-point vulnerabilities.
                </p>
            </div>
        </div>
    );
}
