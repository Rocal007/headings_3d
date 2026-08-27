import { useState, useEffect } from 'react';
import './App.css';
import Truck from './components/Truck';
import TruckRace from './components/TruckRace';
import Crane from './components/Crane';
import CameraHead from './components/CameraHead';
import CraneTennis from './components/CraneTennis';
import { ReadyPlayerMeStudio } from './components/rpm/ReadyPlayerMeStudio';
import Jeep from './components/Jeep';
import ErrorBoundary from './components/ErrorBoundary';

export type AppViewMode = 'crane' | 'head' | 'truck' | 'tennis' | 'race' | 'avatar' | 'jeep';

interface NavigationBarProps {
  currentView: AppViewMode;
  onSelectView: (view: AppViewMode) => void;
}

const MENU_ITEMS: { id: AppViewMode; label: string; icon: string; desc: string; activeColor: string; activeGradient: string }[] = [
  {
    id: 'crane',
    label: 'Show Kran',
    desc: 'Supertechno 50 Teleskopkran',
    icon: '🏗️',
    activeColor: '#e5c500',
    activeGradient: 'linear-gradient(135deg, #e5c500 0%, #ca8a04 100%)'
  },
  {
    id: 'head',
    label: 'Show Head',
    desc: '3-Achs Remote Camera Head',
    icon: '🎥',
    activeColor: '#f97316',
    activeGradient: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)'
  },
  {
    id: 'truck',
    label: 'Show LKW',
    desc: 'MAN TGL 12.250 Transport',
    icon: '🚚',
    activeColor: '#38bdf8',
    activeGradient: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)'
  },
  {
    id: 'jeep',
    label: 'Show Jeep',
    desc: 'Willys MB 1/4-Ton 4x4 Geländewagen',
    icon: '🚙',
    activeColor: '#c4a675',
    activeGradient: 'linear-gradient(135deg, #c4a675 0%, #8c6d3d 100%)'
  },
  {
    id: 'tennis',
    label: 'Tennis Match',
    desc: 'Dual-Kran ATP Grand Slam Arena',
    icon: '🎾',
    activeColor: '#4ade80',
    activeGradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
  },
  {
    id: 'race',
    label: 'Das Rennen',
    desc: 'Grand Prix Rennstrecke & Kameras',
    icon: '🏎️',
    activeColor: '#ec4899',
    activeGradient: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)'
  },
  {
    id: 'avatar',
    label: 'Avatar Studio',
    desc: 'Ready Player Me 3D Humanoids',
    icon: '🧑',
    activeColor: '#a855f7',
    activeGradient: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)'
  }
];

function MainNavigationBar({ currentView, onSelectView }: NavigationBarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 960 : false);

  // Responsive Breakpoint Listener (< 960px switches to Hamburger Navigation)
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 960;
      setIsMobile(mobile);
      if (!mobile) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Keyboard Escape Handler to close drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const activeItem = MENU_ITEMS.find(item => item.id === currentView) || MENU_ITEMS[0];

  const handleSelect = (id: AppViewMode) => {
    onSelectView(id);
    setIsMobileMenuOpen(false);
  };

  // --- MOBILE & TABLET HAMBURGER BAR + SLIDE-OUT DRAWER ---
  if (isMobile) {
    return (
      <>
        {/* Compact Mobile Top Bar */}
        <header className="mobile-nav-bar" role="banner">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: activeItem.activeColor,
              boxShadow: `0 0 10px ${activeItem.activeColor}`
            }} />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{
                fontSize: 10,
                fontWeight: 900,
                color: '#cbd5e1',
                letterSpacing: '1.2px',
                textTransform: 'uppercase'
              }}>
                SUPERTECHNO 50
              </span>
              <span style={{
                fontSize: 11,
                fontWeight: 800,
                color: activeItem.activeColor,
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}>
                <span>{activeItem.icon}</span> {activeItem.label}
              </span>
            </div>
          </div>

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="hamburger-btn"
            aria-label={isMobileMenuOpen ? 'Menü schließen' : 'Menü öffnen'}
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? '✕' : '☰'}
          </button>
        </header>

        {/* Dimming Backdrop Overlay */}
        {isMobileMenuOpen && (
          <div
            className="mobile-backdrop"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Mobile Slide-Out Drawer Navigation */}
        <aside
          className={`slide-drawer-left custom-scrollbar ${isMobileMenuOpen ? 'open' : 'closed'}`}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            bottom: 0,
            width: 'min(320px, 85vw)',
            background: 'rgba(10, 14, 24, 0.96)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            borderRight: '1px solid rgba(255, 255, 255, 0.14)',
            padding: 'calc(16px + env(safe-area-inset-top, 0px)) 16px 20px 16px',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            boxShadow: '8px 0 36px rgba(0, 0, 0, 0.75)',
            overflowY: 'auto'
          }}
          role="navigation"
          aria-label="Hauptnavigation"
        >
          {/* Drawer Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
            paddingBottom: 12,
            marginBottom: 4
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: '#e5c500',
                boxShadow: '0 0 10px #e5c500'
              }} />
              <span style={{
                fontSize: 12,
                fontWeight: 900,
                color: '#f8fafc',
                letterSpacing: '1.4px'
              }}>
                SUPERTECHNO
              </span>
            </div>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.14)',
                borderRadius: 8,
                color: '#cbd5e1',
                padding: '4px 8px',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              ✕
            </button>
          </div>

          <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.8px', paddingLeft: 4 }}>
            3D Simulations-Module
          </div>

          {/* Module Links */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {MENU_ITEMS.map(item => {
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 14px',
                    borderRadius: 12,
                    border: isActive ? 'none' : '1px solid rgba(255, 255, 255, 0.08)',
                    background: isActive ? item.activeGradient : 'rgba(255, 255, 255, 0.04)',
                    color: isActive ? (item.id === 'crane' || item.id === 'jeep' ? '#000000' : '#ffffff') : '#cbd5e1',
                    fontWeight: isActive ? 800 : 600,
                    fontSize: 13,
                    cursor: 'pointer',
                    boxShadow: isActive ? `0 4px 18px ${item.activeColor}55` : 'none',
                    textAlign: 'left',
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    minHeight: 48
                  }}
                >
                  <span style={{ fontSize: 18 }}>{item.icon}</span>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span>{item.label}</span>
                    <span style={{
                      fontSize: 10,
                      fontWeight: 400,
                      color: isActive ? (item.id === 'crane' || item.id === 'jeep' ? '#1e293b' : '#e2e8f0') : '#64748b'
                    }}>
                      {item.desc}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Footer Info */}
          <div style={{
            marginTop: 'auto',
            paddingTop: 16,
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            fontSize: 10,
            color: '#64748b',
            display: 'flex',
            flexDirection: 'column',
            gap: 2
          }}>
            <div>Supertechno 50 3D Studio</div>
            <div style={{ color: '#4ade80' }}>● 60 FPS WebGL Engine Active</div>
          </div>
        </aside>
      </>
    );
  }

  // --- DESKTOP HORIZONTAL GLASSMORPHIC NAVBAR ---
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

      {MENU_ITEMS.map(item => {
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
              color: isActive ? (item.id === 'crane' || item.id === 'jeep' ? '#000000' : '#ffffff') : '#94a3b8',
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

      {viewMode === 'head' && (
        <ErrorBoundary fallbackTitle="Supertechno 3-Achs Remote Camera Head Studio">
          <CameraHead />
        </ErrorBoundary>
      )}

      {viewMode === 'truck' && (
        <ErrorBoundary fallbackTitle="MAN TGL 12.250 LKW Showroom">
          <Truck onOpenRace={() => setViewMode('race')} />
        </ErrorBoundary>
      )}

      {viewMode === 'jeep' && (
        <ErrorBoundary fallbackTitle="Willys MB 1/4-Ton 4x4 Offroad Studio">
          <Jeep />
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

