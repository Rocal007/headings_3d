import React, { useState } from 'react';
import {
  type GalleryContainerState,
  type ContainerColorId,
  type ContainerStackMode,
  type GalleryCameraId,
  type GalleryEnvironmentId,
  CONTAINER_COLOR_OPTIONS,
  CONTAINER_STACK_OPTIONS,
  GALLERY_CAMERA_PRESETS,
  GALLERY_ENVIRONMENTS,
  kelvinToHex,
} from '../../types/galleryTypes';

interface GalleryControlDrawerProps {
  state: GalleryContainerState;
  onChange: (patch: Partial<GalleryContainerState>) => void;
  isOpen: boolean;
  onToggleOpen: () => void;
}

type TabType = 'architecture' | 'lighting' | 'environment' | 'camera';

export const GalleryControlDrawer: React.FC<GalleryControlDrawerProps> = ({
  state,
  onChange,
  isOpen,
  onToggleOpen,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('architecture');

  return (
    <>
      {/* Floating Drawer Trigger Button */}
      <button
        type="button"
        className="gallery-drawer-toggle"
        onClick={onToggleOpen}
        aria-label={isOpen ? 'Bedienpanel schließen' : 'Bedienpanel öffnen'}
        style={{
          position: 'fixed',
          top: '76px',
          right: '20px',
          zIndex: 100,
          background: 'rgba(15, 23, 42, 0.88)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          color: '#f8fafc',
          padding: '10px 18px',
          borderRadius: '12px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '13px',
          fontWeight: 700,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35)',
          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <span>{isOpen ? '✕' : '🎛️'}</span>
        <span>{isOpen ? 'Schließen' : 'Freie Regie & Setup'}</span>
      </button>

      {/* Main Glassmorphic Slide-Out Drawer */}
      <aside
        className={`gallery-drawer ${isOpen ? 'open' : 'closed'}`}
        role="region"
        aria-label="Container Galerie Steuerung"
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: 'clamp(330px, 85vw, 440px)',
          height: '100vh',
          background: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(24px)',
          borderLeft: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '-12px 0 40px rgba(0, 0, 0, 0.5)',
          zIndex: 99,
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
          display: 'flex',
          flexDirection: 'column',
          color: '#f8fafc',
          overflow: 'hidden',
        }}
      >
        {/* Drawer Header */}
        <div
          style={{
            padding: '20px 20px 16px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>🎨</span>
              <h2
                style={{
                  margin: 0,
                  fontSize: '16px',
                  fontWeight: 800,
                  letterSpacing: '0.5px',
                  color: '#f8fafc',
                }}
              >
                GALLERY CONTAINER 3D
              </h2>
            </div>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: '4px',
                background: 'rgba(56, 189, 248, 0.2)',
                color: '#38bdf8',
                border: '1px solid rgba(56, 189, 248, 0.35)',
              }}
            >
              FREIE REGIE
            </span>
          </div>
          <p
            style={{
              margin: 0,
              fontSize: '11px',
              color: '#94a3b8',
              lineHeight: 1.4,
            }}
          >
            Modulare 20ft Container-Architektur, Beleuchtung, Kuration & Drehteller-Showroom
          </p>
        </div>

        {/* Tab Navigation */}
        <nav
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '2px',
            padding: '8px 10px',
            background: 'rgba(2, 6, 23, 0.6)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          {[
            { id: 'architecture' as TabType, icon: '🏗️', label: 'Bauform' },
            { id: 'lighting' as TabType, icon: '💡', label: 'Licht' },
            { id: 'environment' as TabType, icon: '⭕', label: 'Studio' },
            { id: 'camera' as TabType, icon: '🎬', label: 'Kamera' },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                style={{
                  background: isActive ? 'rgba(56, 189, 248, 0.18)' : 'transparent',
                  border: 'none',
                  borderBottom: isActive ? '2px solid #38bdf8' : '2px solid transparent',
                  color: isActive ? '#38bdf8' : '#94a3b8',
                  padding: '8px 2px',
                  cursor: 'pointer',
                  borderRadius: '6px 6px 0 0',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '2px',
                  fontSize: '11px',
                  fontWeight: isActive ? 700 : 500,
                  transition: 'all 0.15s ease',
                }}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Scrollable Tab Content Body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          {/* ========================================================= */}
          {/* TAB 1: ARCHITEKTUR & TÜREN                                */}
          {/* ========================================================= */}
          {activeTab === 'architecture' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* 1. Modular Stacking Mode Selector */}
              <div>
                <label
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: '#94a3b8',
                    marginBottom: '8px',
                    display: 'block',
                  }}
                >
                  🏗️ Modulare Bauform & Stapelung
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                  {Object.values(CONTAINER_STACK_OPTIONS).map((opt) => {
                    const isSelected = state.stackMode === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => onChange({ stackMode: opt.id as ContainerStackMode })}
                        style={{
                          background: isSelected ? 'rgba(56, 189, 248, 0.18)' : 'rgba(30, 41, 59, 0.6)',
                          border: isSelected ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: '10px',
                          padding: '10px 8px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-start',
                          gap: '4px',
                          cursor: 'pointer',
                          textAlign: 'left',
                          color: '#f8fafc',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '16px' }}>{opt.icon}</span>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: isSelected ? '#38bdf8' : '#f8fafc' }}>
                            {opt.name}
                          </span>
                        </div>
                        <span style={{ fontSize: '9px', color: '#94a3b8', lineHeight: 1.3 }}>
                          {opt.description}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Container Color & PBR Finish */}
              <div>
                <label
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: '#94a3b8',
                    marginBottom: '8px',
                    display: 'block',
                  }}
                >
                  Container-Farbe & PBR Finish
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                  {Object.values(CONTAINER_COLOR_OPTIONS).map((c) => {
                    const isSelected = state.containerColor === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => onChange({ containerColor: c.id as ContainerColorId })}
                        style={{
                          background: isSelected ? 'rgba(56, 189, 248, 0.15)' : 'rgba(30, 41, 59, 0.6)',
                          border: isSelected ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: '8px',
                          padding: '8px 10px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          cursor: 'pointer',
                          textAlign: 'left',
                          color: '#f8fafc',
                        }}
                      >
                        <span
                          style={{
                            width: '16px',
                            height: '16px',
                            borderRadius: '4px',
                            background: c.hex,
                            border: '1px solid rgba(255,255,255,0.2)',
                            flexShrink: 0,
                          }}
                        />
                        <span style={{ fontSize: '11px', fontWeight: 600 }}>{c.name.split(' ')[0]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Color Input if selected */}
              {state.containerColor === 'custom' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <label style={{ fontSize: '11px', color: '#cbd5e1' }}>RGB Farbton:</label>
                  <input
                    type="color"
                    value={state.customColorHex}
                    onChange={(e) => onChange({ customColorHex: e.target.value })}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      width: '36px',
                      height: '30px',
                    }}
                  />
                  <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#94a3b8' }}>
                    {state.customColorHex}
                  </span>
                </div>
              )}

              {/* Weathering Slider */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label style={{ fontSize: '12px', color: '#cbd5e1' }}>Stahl-Patina / Alterung:</label>
                  <span style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 700 }}>
                    {Math.round(state.weathering * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={state.weathering}
                  onChange={(e) => onChange({ weathering: parseFloat(e.target.value) })}
                  style={{ width: '100%', accentColor: '#38bdf8' }}
                />
              </div>

              {/* Door Kinematics Section (Outward Swing) */}
              <div
                style={{
                  padding: '14px',
                  background: 'rgba(2, 6, 23, 0.4)',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#f8fafc' }}>
                    🚪 Türkinematik (Nach außen öffnend)
                  </span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() =>
                        onChange({
                          egDoorsOpen: 0.9,
                          ogDoorsOpen: 0.9,
                          slidingDoorOpen: 0.9,
                        })
                      }
                      style={{
                        background: 'rgba(56, 189, 248, 0.15)',
                        border: '1px solid #38bdf8',
                        color: '#38bdf8',
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                      }}
                    >
                      Alle auf
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onChange({
                          egDoorsOpen: 0,
                          ogDoorsOpen: 0,
                          slidingDoorOpen: 0,
                        })
                      }
                      style={{
                        background: 'rgba(255, 255, 255, 0.06)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        color: '#cbd5e1',
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                      }}
                    >
                      Alle zu
                    </button>
                  </div>
                </div>

                {/* EG End Doors */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '11px', color: '#cbd5e1' }}>EG Flügeltüren (nach außen):</span>
                    <span style={{ fontSize: '11px', color: '#e5c500', fontWeight: 700 }}>
                      {Math.round(state.egDoorsOpen * 150)}° nach außen
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.02"
                    value={state.egDoorsOpen}
                    onChange={(e) => onChange({ egDoorsOpen: parseFloat(e.target.value) })}
                    style={{ width: '100%', accentColor: '#e5c500' }}
                  />
                </div>

                {/* 1. OG End Doors */}
                {state.stackMode !== 'single_story' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '11px', color: '#cbd5e1' }}>1. OG Flügeltüren (nach außen):</span>
                      <span style={{ fontSize: '11px', color: '#e5c500', fontWeight: 700 }}>
                        {Math.round(state.ogDoorsOpen * 150)}° nach außen
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.02"
                      value={state.ogDoorsOpen}
                      onChange={(e) => onChange({ ogDoorsOpen: parseFloat(e.target.value) })}
                      style={{ width: '100%', accentColor: '#e5c500' }}
                    />
                  </div>
                )}

                {/* Front Sliding Door */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '11px', color: '#cbd5e1' }}>EG Glas-Schiebetür:</span>
                    <span style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 700 }}>
                      {Math.round(state.slidingDoorOpen * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.02"
                    value={state.slidingDoorOpen}
                    onChange={(e) => onChange({ slidingDoorOpen: parseFloat(e.target.value) })}
                    style={{ width: '100%', accentColor: '#38bdf8' }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 2: BELEUCHTUNG & CCT / RGB                            */}
          {/* ========================================================= */}
          {activeTab === 'lighting' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Tunable CCT Kelvin Slider */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label style={{ fontSize: '12px', color: '#cbd5e1' }}>Farbtemperatur (CCT):</label>
                  <span
                    style={{
                      fontSize: '11px',
                      color: kelvinToHex(state.cctKelvin),
                      fontWeight: 700,
                    }}
                  >
                    {state.cctKelvin} K ({state.cctKelvin < 3500 ? 'Warmweiß' : state.cctKelvin < 5000 ? 'Neutral' : 'Kaltweiß'})
                  </span>
                </div>
                <input
                  type="range"
                  min="2700"
                  max="6500"
                  step="100"
                  value={state.cctKelvin}
                  onChange={(e) => onChange({ cctKelvin: parseInt(e.target.value, 10), useRgbGlow: false })}
                  style={{ width: '100%', accentColor: kelvinToHex(state.cctKelvin) }}
                />
                {/* Kelvin Color Bar preview */}
                <div
                  style={{
                    height: '6px',
                    borderRadius: '3px',
                    background: 'linear-gradient(to right, #ff8a12, #ffebd9, #d6eaff, #a6d8ff)',
                    marginTop: '6px',
                  }}
                />
              </div>

              {/* RGB Custom Color Glow Toggle */}
              <div
                style={{
                  padding: '12px',
                  background: 'rgba(2, 6, 23, 0.4)',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 600 }}>RGB-Farblicht & Neon-Glow</div>
                    <div style={{ fontSize: '10px', color: '#94a3b8' }}>Stimmungsvolles Farblicht statt CCT</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={state.useRgbGlow}
                    onChange={(e) => onChange({ useRgbGlow: e.target.checked })}
                    style={{ width: '18px', height: '18px', accentColor: '#38bdf8', cursor: 'pointer' }}
                  />
                </div>

                {state.useRgbGlow && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <label style={{ fontSize: '11px', color: '#cbd5e1' }}>RGB Farbe:</label>
                    <input
                      type="color"
                      value={state.rgbColorGlow}
                      onChange={(e) => onChange({ rgbColorGlow: e.target.value })}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        width: '36px',
                        height: '30px',
                      }}
                    />
                    <span style={{ fontSize: '11px', fontFamily: 'monospace', color: state.rgbColorGlow, fontWeight: 700 }}>
                      {state.rgbColorGlow}
                    </span>
                  </div>
                )}
              </div>

              {/* Linear LED Ceiling Lights (EG & OG) */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label style={{ fontSize: '12px', color: '#cbd5e1' }}>EG LED-Deckenbänder:</label>
                  <span style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 700 }}>
                    {Math.round(((state.egLinearLed ?? state.linearLedIntensity) / 2.5) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="2.5"
                  step="0.1"
                  value={state.egLinearLed ?? state.linearLedIntensity}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    onChange({ egLinearLed: val, linearLedIntensity: val });
                  }}
                  style={{ width: '100%', accentColor: '#38bdf8' }}
                />
              </div>

              {state.stackMode !== 'single_story' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label style={{ fontSize: '12px', color: '#cbd5e1' }}>1. OG LED-Deckenbänder:</label>
                    <span style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 700 }}>
                      {Math.round(((state.ogLinearLed ?? state.linearLedIntensity) / 2.5) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="2.5"
                    step="0.1"
                    value={state.ogLinearLed ?? state.linearLedIntensity}
                    onChange={(e) => onChange({ ogLinearLed: parseFloat(e.target.value) })}
                    style={{ width: '100%', accentColor: '#38bdf8' }}
                  />
                </div>
              )}

              {/* Artwork Spotlights */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label style={{ fontSize: '12px', color: '#cbd5e1' }}>Kunstwerk-Spotlights:</label>
                  <span style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 700 }}>
                    {Math.round((state.spotlightsIntensity / 2.5) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="2.5"
                  step="0.1"
                  value={state.spotlightsIntensity}
                  onChange={(e) => onChange({ spotlightsIntensity: parseFloat(e.target.value) })}
                  style={{ width: '100%', accentColor: '#38bdf8' }}
                />
              </div>

              {/* Exterior Ground Up-Lights */}
              <div
                style={{
                  padding: '12px',
                  background: 'rgba(2, 6, 23, 0.4)',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 600 }}>Architektur-Außenfluter</div>
                    <div style={{ fontSize: '10px', color: '#94a3b8' }}>Bodenstrahler für Fassade & Drehteller</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={state.exteriorUpLights}
                    onChange={(e) => onChange({ exteriorUpLights: e.target.checked })}
                    style={{ width: '18px', height: '18px', accentColor: '#38bdf8', cursor: 'pointer' }}
                  />
                </div>

                {state.exteriorUpLights && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '10px', color: '#cbd5e1' }}>Strahler-Intensität:</span>
                      <span style={{ fontSize: '10px', color: '#e5c500', fontWeight: 700 }}>
                        {Math.round((state.exteriorUpLightsIntensity / 2.5) * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.2"
                      max="2.5"
                      step="0.1"
                      value={state.exteriorUpLightsIntensity}
                      onChange={(e) => onChange({ exteriorUpLightsIntensity: parseFloat(e.target.value) })}
                      style={{ width: '100%', accentColor: '#e5c500' }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 3: STUDIO SHOWROOM & DREHTELLER-MOTOR                 */}
          {/* ========================================================= */}
          {activeTab === 'environment' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <label
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: '#94a3b8',
                }}
              >
                Studio-Raum & Drehteller (wie Fahrzeuge)
              </label>

              {Object.values(GALLERY_ENVIRONMENTS).map((env) => {
                const isSelected = state.environment === env.id;
                return (
                  <button
                    key={env.id}
                    type="button"
                    onClick={() => onChange({ environment: env.id as GalleryEnvironmentId })}
                    style={{
                      background: isSelected ? 'rgba(56, 189, 248, 0.15)' : 'rgba(30, 41, 59, 0.5)',
                      border: isSelected ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '10px',
                      padding: '10px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      color: '#f8fafc',
                    }}
                  >
                    <span style={{ fontSize: '20px' }}>{env.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: isSelected ? '#38bdf8' : '#f8fafc' }}>
                        {env.name}
                      </div>
                      <div style={{ fontSize: '10px', color: '#94a3b8' }}>{env.description}</div>
                    </div>
                  </button>
                );
              })}

              {/* Turntable Motor & Rotation Controls */}
              <div
                style={{
                  padding: '14px',
                  background: 'rgba(2, 6, 23, 0.4)',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#f8fafc' }}>
                      🔄 Showroom Drehteller-Motor
                    </div>
                    <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                      Kontinuierliche Präsentations-Drehung
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={state.turntableMotorActive}
                    onChange={(e) => onChange({ turntableMotorActive: e.target.checked })}
                    style={{ width: '18px', height: '18px', accentColor: '#22c55e', cursor: 'pointer' }}
                  />
                </div>

                {state.turntableMotorActive ? (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '11px', color: '#cbd5e1' }}>Drehzahl (RPM):</span>
                      <span style={{ fontSize: '11px', color: '#22c55e', fontWeight: 700 }}>
                        {state.turntableSpeedRPM.toFixed(1)} RPM
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="8.0"
                      step="0.5"
                      value={state.turntableSpeedRPM}
                      onChange={(e) => onChange({ turntableSpeedRPM: parseFloat(e.target.value) })}
                      style={{ width: '100%', accentColor: '#22c55e' }}
                    />
                  </div>
                ) : (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '11px', color: '#cbd5e1' }}>Manueller Drehwinkel:</span>
                      <span style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 700 }}>
                        {Math.round(state.containerRotationY)}°
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="360"
                      step="2"
                      value={state.containerRotationY}
                      onChange={(e) => onChange({ containerRotationY: parseFloat(e.target.value) })}
                      style={{ width: '100%', accentColor: '#38bdf8' }}
                    />
                  </div>
                )}
              </div>

              <div
                style={{
                  padding: '12px',
                  background: 'rgba(2, 6, 23, 0.4)',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  fontSize: '11px',
                  color: '#94a3b8',
                  lineHeight: 1.4,
                }}
              >
                ✨ <strong style={{ color: '#cbd5e1' }}>Studio-Fokus:</strong> Der zweistöckige Kunst-Container steht auf einem Ø 18m Präsentations-Drehteller mit Leuchtring im isolierten Raum – ohne störende Außenumgebung.
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 5: KAMERA-REGIE & OPTIK                               */}
          {/* ========================================================= */}
          {activeTab === 'camera' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <label
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: '#94a3b8',
                }}
              >
                🎬 Cineastische Kameraführung & Freie Regie
              </label>

              {Object.values(GALLERY_CAMERA_PRESETS).map((cam) => {
                const isSelected = state.activeCamera === cam.id;
                return (
                  <button
                    key={cam.id}
                    type="button"
                    onClick={() => onChange({ activeCamera: cam.id as GalleryCameraId })}
                    style={{
                      background: isSelected ? 'rgba(56, 189, 248, 0.18)' : 'rgba(30, 41, 59, 0.5)',
                      border: isSelected ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '10px',
                      padding: '10px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      color: '#f8fafc',
                    }}
                  >
                    <span style={{ fontSize: '20px' }}>{cam.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: isSelected ? '#38bdf8' : '#f8fafc' }}>
                        {cam.name}
                      </div>
                      <div style={{ fontSize: '10px', color: '#94a3b8' }}>{cam.description}</div>
                    </div>
                  </button>
                );
              })}

              {/* FOV / Lens Focal Length Slider */}
              <div
                style={{
                  padding: '12px',
                  background: 'rgba(2, 6, 23, 0.4)',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                  <label style={{ fontSize: '12px', color: '#cbd5e1' }}>Kamera-Brennweite / FOV:</label>
                  <span style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 700 }}>
                    {state.cameraFov}° ({state.cameraFov < 35 ? 'Tele' : state.cameraFov < 55 ? 'Normal' : 'Weitwinkel'})
                  </span>
                </div>
                <input
                  type="range"
                  min="24"
                  max="85"
                  step="1"
                  value={state.cameraFov}
                  onChange={(e) => onChange({ cameraFov: parseInt(e.target.value, 10) })}
                  style={{ width: '100%', accentColor: '#38bdf8' }}
                />
              </div>

              {/* Auto-Rotate Toggle */}
              <div
                style={{
                  padding: '12px',
                  background: 'rgba(2, 6, 23, 0.4)',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontSize: '12px', color: '#cbd5e1' }}>🔄 360° Kamera-Autodrehung</span>
                <input
                  type="checkbox"
                  checked={state.autoRotate}
                  onChange={(e) => onChange({ autoRotate: e.target.checked })}
                  style={{ width: '18px', height: '18px', accentColor: '#38bdf8', cursor: 'pointer' }}
                />
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default GalleryControlDrawer;
