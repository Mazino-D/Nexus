import React from 'react';
import { Hexagon, Moon, Sun, Activity } from 'lucide-react';

export function Header() {
    const status = 'Idle'; // Idle | Running | Complete

    return (
        <header style={{
            height: 'var(--header-height)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 2rem',
            backgroundColor: 'rgba(10, 10, 15, 0.8)',
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid rgba(245, 166, 35, 0.2)',
            position: 'sticky',
            top: 0,
            zIndex: 90
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <Hexagon className="amber-text" size={24} />
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.25rem 0.75rem',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '20px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    fontSize: '0.85rem'
                }}>
                    <Activity size={14} className={status === 'Running' ? 'amber-text' : 'text-muted'} />
                    <span style={{ color: 'var(--text-muted)' }}>Status:</span>
                    <span className={status === 'Running' ? 'amber-text' : 'data-text'}>{status}</span>
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <button style={{
                    background: 'transparent',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '50%',
                    width: '40px',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-platinum)',
                    transition: 'all 0.2s ease'
                }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent-amber)'}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
                >
                    <Sun size={18} />
                </button>
            </div>
        </header>
    );
}
