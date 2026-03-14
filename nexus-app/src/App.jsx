import { useState, useEffect, useRef } from 'react';
import { NexusProvider } from './context/NexusContext';
import { ToastProvider } from './components/Toast';
import Sidebar from './components/layout/Sidebar';
import TopBar from './components/layout/TopBar';
import PortfolioSetup from './pages/PortfolioSetup';
import SimulationEngine from './pages/SimulationEngine';
import RiskAnalytics from './pages/RiskAnalytics';
import ScenarioStressTest from './pages/ScenarioStressTest';
import IntelligenceReport from './pages/IntelligenceReport';

const PAGES = {
  portfolio: PortfolioSetup,
  simulation: SimulationEngine,
  analytics: RiskAnalytics,
  scenario: ScenarioStressTest,
  report: IntelligenceReport,
};

function ParticleBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    const particles = Array.from({ length: 60 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      size: Math.random() * 2 + 0.5,
      alpha: Math.random() * 0.5 + 0.1
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(245, 166, 35, ${p.alpha})`;
        ctx.fill();
      });
      animationFrameId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 0, pointerEvents: 'none' }} />;
}

export default function App() {
  const [activePage, setActivePage] = useState('portfolio');
  const PageComponent = PAGES[activePage];

  return (
    <ToastProvider>
      <NexusProvider>
        <ParticleBackground />
        <div id="app" style={{ zIndex: 1, position: 'relative' }}>
          <Sidebar activePage={activePage} setActivePage={setActivePage} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <TopBar activePage={activePage} />
            <div style={{ flex: 1, overflowY: 'auto', padding: 28, scrollbarWidth: 'thin', scrollbarColor: 'rgba(245,166,35,0.3) transparent' }}>
              <PageComponent />
            </div>
          </div>
        </div>
      </NexusProvider>
    </ToastProvider>
  );
}
