import { createContext, useContext, useState } from 'react';

const NexusContext = createContext();

export const ASSET_COLORS = ['#F5A623', '#00D4FF', '#00E396', '#FF4560', '#C39BD3', '#F39C12', '#1ABC9C', '#E74C3C', '#3498DB', '#9B59B6'];

export function getRemainingAlloc(assets) {
  const used = assets.reduce((s, a) => s + Number(a.alloc), 0);
  return parseFloat((100 - used).toFixed(4));
}

export const SAMPLE_PORTFOLIO = [
  { name: 'Nifty 50 Index', cls: 'equity', alloc: 35, ret: 12.5, vol: 18, color: '#F5A623' },
  { name: 'Midcap 150 Fund', cls: 'equity', alloc: 15, ret: 15.0, vol: 24, color: '#00D4FF' },
  { name: 'Corporate Bond Fund', cls: 'debt', alloc: 20, ret: 7.5, vol: 5, color: '#00E396' },
  { name: 'Gold ETF (Sovereign)', cls: 'commodity', alloc: 15, ret: 8.0, vol: 14, color: '#FFD700' },
  { name: 'US S&P 500 ETF', cls: 'equity', alloc: 10, ret: 11.0, vol: 17, color: '#C39BD3' },
  { name: 'Liquid Fund', cls: 'cash', alloc: 5, ret: 6.5, vol: 1, color: '#95A5A6' },
];

export function NexusProvider({ children }) {
  const [assets, setAssets] = useState([]);
  const [params, setParams] = useState({
    initialInv: 1000000,
    horizon: 10,
    inflation: 6,
    tax: 10,
    numSims: 5000,
    dist: 'lognormal',
    rebalancing: 'annual'
  });
  const [simResults, setSimResults] = useState(null);
  const [simStatus, setSimStatus] = useState('idle'); // idle | running | done
  const [activeScenario, setActiveScenario] = useState(null);

  return (
    <NexusContext.Provider value={{
      assets, setAssets,
      params, setParams,
      simResults, setSimResults,
      simStatus, setSimStatus,
      activeScenario, setActiveScenario
    }}>
      {children}
    </NexusContext.Provider>
  );
}

export const useNexus = () => useContext(NexusContext);
