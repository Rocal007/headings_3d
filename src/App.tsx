import { useState } from 'react';
import './App.css';
import Truck from './components/Truck';
import TruckRace from './components/TruckRace';
import Crane from './components/Crane';
import CraneTennis from './components/CraneTennis';
import { ReadyPlayerMeStudio } from './components/rpm/ReadyPlayerMeStudio';
import ErrorBoundary from './components/ErrorBoundary';

export type AppViewMode = 'crane' | 'truck' | 'tennis' | 'race' | 'avatar';

interface NavigationBarProps {
  currentView: AppViewMode;
  onSelectView: (view: AppViewMode) => void;
}

function MainNavigationBar({ currentView, onSelectView }: NavigationBarProps) {
  const menuItems: { id: AppViewMode; label: string; icon: string; activeColor: string; activeGradient: string }[] = [
    {
      id: 'crane',
      label: 'Show Kran',
      icon: '🏗️',
      activeColor: '#e5c500',
      activeGradient: 'linear-gradient(135deg, #e5c500 0%, #ca8a04 100%)'
    },
    {
      id: 'truck',
      label: 'Show LKW',
      icon: '🚚',
      activeColor: '#38bdf8',
      activeGradient: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)'
    },
    {
      id: 'tennis',
      label: 'Tennis',
      icon: '🎾',
      activeColor: '#4ade80',
      activeGradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
    },
    {
      id: 'race',
      label: 'Das Rennen',
      icon: '🏎️',
      activeColor: '#ec4899',
      activeGradient: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)'
    },
    {
      id: 'avatar',
      label: 'Avatar Studio',
      icon: '🧑',
      activeColor: '#a855f7',
      activeGradient: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)'
    }
  ];

  return (
    <nav
      style={{
        position: 'fixed',
        top: 16,
        left: 20,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        background: 'rgba(11, 16, 28, 0.88)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: 14,
        padding: '5px 8px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.55), 0 0 20px rgba(0, 0, 0, 0.25)',
        fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
        userSelect: 'none'
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '0 8px 0 4px',
        borderRight: '1px solid rgba(255, 255, 255, 0.14)',
        marginRight: 2
      }}>
        <div style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: '#e5c500',
          boxShadow: '0 0 8px #e5c500'
        }} />
        <span style={{
          fontSize: 10,
          fontWeight: 900,
          color: '#cbd5e1',
          letterSpacing: '1.2px',
          textTransform: 'uppercase'
        }}>
          SUPERTECHNO
        </span>
      </div>

      {menuItems.map(item => {
        const isActive = currentView === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onSelectView(item.id)}
            style={{
              padding: '7px 14px',
              borderRadius: 10,
              border: isActive ? 'none' : '1px solid rgba(255, 255, 255, 0.08)',
              background: isActive ? item.activeGradient : 'rgba(255, 255, 255, 0.04)',
              color: isActive ? (item.id === 'crane' ? '#000000' : '#ffffff') : '#94a3b8',
              fontWeight: isActive ? 800 : 600,
              fontSize: 12,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: isActive ? `0 4px 14px ${item.activeColor}55` : 'none',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          >
            <span style={{ fontSize: 13 }}>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function App() {
  const [viewMode, setViewMode] = useState<AppViewMode>('crane');

  return (
    <div className="app-container">
      <MainNavigationBar currentView={viewMode} onSelectView={setViewMode} />

      {viewMode === 'crane' && (
        <ErrorBoundary fallbackTitle="Supertechno 50 3D Crane Simulation">
          <Crane />
        </ErrorBoundary>
      )}

      {viewMode === 'truck' && (
        <ErrorBoundary fallbackTitle="MAN TGL 12.250 LKW Showroom">
          <Truck onOpenRace={() => setViewMode('race')} />
        </ErrorBoundary>
      )}

      {viewMode === 'tennis' && (
        <ErrorBoundary fallbackTitle="Kran-Tennis Match Arena">
          <CraneTennis />
        </ErrorBoundary>
      )}

      {viewMode === 'race' && (
        <ErrorBoundary fallbackTitle="Grand Prix Rennstrecke & Supertechno 50 Trackside Kameras">
          <TruckRace onOpenStudio={() => setViewMode('truck')} />
        </ErrorBoundary>
      )}

      {viewMode === 'avatar' && (
        <ErrorBoundary fallbackTitle="Ready Player Me 3D Avatar Studio">
          <ReadyPlayerMeStudio
            onApplyToCrane={() => setViewMode('crane')}
            onApplyToTennis={() => setViewMode('tennis')}
          />
        </ErrorBoundary>
      )}
    </div>
  );
}

export default App;

