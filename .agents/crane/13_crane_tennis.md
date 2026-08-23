# Agent: crane_tennis

## Rolle & Verantwortung
Spezialagent für das **Supertechno 50 Kran-Tennis Match System** (`CraneTennis.tsx`).
Verantwortlich für die Dual-Kran-Kinematik, das Carbon-Tennisschläger-Rig, die Ballflug- und Aufprallphysik, die Schiedsrichter- & Linienrichter-KI, Stadionzuschauer, Spielfeldbeläge sowie die TV-Broadcast-Regie und Scoreboard-Engine.

## Dateien
- `src/components/CraneTennis.tsx`
- `src/model/Supertechno50FBXModel.ts`
- `src/components/RemoteCameraHead.tsx`

## Kernmodule & Baugruppen

### 1. World #1 vs World #2 Match Simulation (Jannik Sinner vs Carlos Alcaraz)
- **Positionierung & Spieler-Profile**:
  - **🇮🇹 Kran 1: Jannik Sinner (ATP Weltrangliste #1 • 11.830 Pkt • Team Blau)**:
    - *Profil*: "The Fox" • Aggressive Baseline Firepower & Ice-Cold Precision.
    - *Signature-Schläge*: 132 km/h Rückhand-Laser Down-the-Line (Tour-Bestwert 77 mph), 176 km/h Flat-Vorhand in die Grundlinien-Ecken, 234 km/h Flat-Bomb 1. Aufschlag, 10.5m Topspin-Lob Winner.
  - **🇪🇸 Kran 2: Carlos Alcaraz (ATP Weltrangliste #2 • 9.850 Pkt • Team Gold)**:
    - *Profil*: "Carlitos" • All-Court Dynamo, Heavy Topspin & Disguised Drop Shots.
    - *Signature-Schläge*: 3.200 RPM Heavy Topspin-Vorhand (Inside-Out Winner), gefühlvoller Disguised Stoppball ans Netzkabel, 248 km/h Monster-Smash über die Stadionwand, Akrobatik-Hechtsprung-Returns.
- **Head-to-Head & Match Statistiken (Reale Web-Daten)**:
  - Gesamt H2H: Alcaraz führt 10–7 (Grand Slam 4–2, Fünfsatz-Krimis 3–0).
  - Integriertes ATP H2H Stats Modal mit Tour-Metriken (Rückhand-Speed, Spinrate, Stoppball-Quote, Aufschlag-Statistiken).
- **Inverse Kinematik (IK)**:
  - Dynamische Verfolgung des Tennisballs in Echtzeit.
  - Berechnung der optimalen Kombination aus Dolly-Fahrt ($X$), Schwenkwinkel (`basePan`), Auslegerneigung (`boomTilt`), Teleskopauszug (`teleExtension`) und Remote-Head-Rotation (`headPan`, `headTilt`, `headRoll`) für Vorhand, Rückhand, Slice, Topspin, Smash und Aufschlag.

### 2. Carbon-Tennisschläger als Kamera-Payload (`CraneTennisRacket`)
- **Konstruktion & Head-Integration**:
  - In diesem Tennis-View ist die Kamera im Remote Head der Tennisschläger selbst (`customPayload` in `RemoteCameraHead`).
  - Hochmodul-Carbon-Rahmen montiert direkt auf dem Schnellwechsel-Kameraträger des 3-Achs Remote Heads.
  - Bespannungs-Gitter (Strings) mit kinetischem Treffer-Glow (Teamfarbe).
  - Ergonomisches Griffband (Grip Tape) und integrierter Saitendämpfer.
  - Impact-Visualizer: Kinetischer Partikelblitz (`impactBurst`) am exakten Sweet-Spot bei Ballkontakt.

### 3. Ball-Physik, Flugkurven-Engine, Lobs, Netz-Volleys & Monster-Smashes (`RallyShot`)
- **Trajektorie & Flugphysik**:
  - **🌈 10.5m Topspin-Lob Winner (`isLob = true, lobKind = 'topspin_winner'`)**: Hebt sich majestätisch in bis zu 10.5 Meter Höhe über den weit am Netz stehenden Teleskopausleger des Gegners hinweg und tropft millimetergenau in die Grundlinien-Ecke ($Z = \pm 12.8\,\text{m}$) für einen unerreichbaren Winner!
  - **🛡️ 11.2m Hohe defensive Sky-Notkerze (`isLob = true, lobKind = 'sky_moonball'`)**: Ball steigt in 11.2 m Höhe bis in die Flutlichtmasten ($t = 1.95\,\text{s}$), ermöglicht Zeitgewinn zur Spielfeld-Erholung und bereitet dem Angreifer den perfekten Schmetterball-Abschlag vor.
  - **🔥 248 km/h Monster-Smashes (`isSmash = true`)**: Steiler, pfeilschneller Abwärtseinschlag in den gegnerischen Vordercourt ($p < 0.48, Y \to 0.16\,\text{m}$), Auslösung einer expandierenden Doppelring-Plasma-Schockwelle (`smashBurst`) und explosiver Rebound-Kick steil nach oben über die Tribünenwand ($Y \to 5.2\,\text{m}, Z \to \pm 17.8\,\text{m}$).
  - **Netz-Volleys (`isVolley = true`)**: Direkte Flugbahn in der Luft ohne Bodenaufprall. Der Ball fliegt knapp über die Netzkante direkt zum Schläger des am Netz stehenden Krans ($Z \approx \pm 1.8\,\text{m} \dots \pm 3.8\,\text{m}$).
  - **⚠️ Authentische Out-Fehler (`isOutError = true`, 58% aller Fehler)**:
    - Entsprechend der realen ATP-Tour-Statistik von Sinner & Alcaraz landen **58% aller Unforced & Forced Errors im Aus** (überzogene Grundlinienbälle oder verzogene Cross-/Inside-Out-Winkel):
      - **Deep Out (60%)**: Ball segelt 2 bis 12 cm hinter die Grundlinie ($|Z| > 11.885\,\text{m}$).
      - **Wide Out (40%)**: Ball verzieht 2 bis 9 cm in den Korridor / ins Seitenaus ($|X| > 4.115\,\text{m}$).
    - Linienrichter signalisiert "OUT!", Schiedsrichter bestätigt den Ausruf und das Scoreboard zeigt ein leuchtendes **`⚠️ OUT (BALL IM AUS)`**-Badge samt Zentimeter-Genauigkeit.
  - **🕸️ Authentische Netzfehler (`isNetError = true`, 37% aller Fehler)**:
    - Der Ball fliegt bis zur Netzmitte ($Z = 0, p = 0.50$), prallt an der Netzkante ($Y \approx 0.65 - 0.88\,\text{m}$) mit Impact-Blitz ab und fällt senkrecht zu Boden an der Netzbasis ($Y \to 0.16\,\text{m}$).
    - Punktgewinn für den Gegner (`pointWinner = nextHitter`), Frustrationsgeste beim Schützen und rotes **`🕸️ NETZFEHLER`**-Badge.
  - **💫 Netzroller-Drama (`isNetCord = true`, 5% aller Ballwechsel)**: Ball streift das weiße Netzkabel bei $Z=0, Y=1.05\,\text{m}$, verliert an Tempo und tropft trudelnd kurz hinter das Netz ins Feld für einen dramatischen Winner.
  - **Ausleger-Netzvorschub (bis 11.2m Hubweg)**: Teleskopausleger fährt weit nach vorne zum Netz ($Z=0$), während der Remote Head knackige Volley-Punch- und Block-Bewegungen ausführt.
  - **Geschwindigkeiten**: Von 110 km/h (Defensiv-Lob) und 130 km/h (Stoppball) bis zu **248–254 km/h (Monster-Schmetterball)**.
- **228 km/h Power-Aufschlag, 1. & 2. Service-Dynamik & Service Winners**:
  - **🏀 Realistische Dribbel-Vorbereitungsphase**: Vor dem Aufwurf steht der Kran an der Grundlinie und dribbelt den Tennisball 3x rhythmisch auf den Boden auf ($Y \approx 0.16 \dots 0.72\,\text{m}$), bevor er den Ball in 5.6m Höhe wirft.
  - **⏱️ Natürliche Pause zwischen 1. und 2. Service**: Bei einem Fehler beim 1. Aufschlag (Netz oder Aus, ~28%) ruft der Schiedsrichter *"FAULT! Zweiter Aufschlag..."*, und der Kran nimmt sich ca. 2.3 Sekunden Zeit, um sich neu zu positionieren und den 2. Aufschlag mit Kick/Topspin (180–195 km/h) sicher ins Feld zu servieren.
  - **⚡ Asse vs. 🎯 Service Winner**: Differenzierung zwischen direkt unberührten Assen (~6%) und schnittigen Service Winnern (~14%), bei denen der Receiver den Ball durch extreme Geschwindigkeit/Spin nur noch unkontrolliert ins Netz oder Aus ablenken kann. Über 80% der Aufschläge münden in spektakuläre Rallies.

### 4. Emotionen & Gestik zwischen den Ballwechseln (`celebrationTimerRef`)
- **2.4 Sekunden Jubel- & Frust-Phase nach jedem Punktgewinn**:
  - **🇮🇹 Jannik Sinner (#1) Winner**:
    - *"Ice-Cold Focus Nod & Steely Fist"*: Ruhiges, fokussiertes Nicken des Remote Heads (`headTilt \leftrightarrow \pm 14°`), leichtes rhythmisch-entschlossenes Schlägertippen (`headRoll \leftrightarrow \pm 10°`), Hubsäule fährt majestätisch auf $2.35\,\text{m}$ hoch.
  - **🇪🇸 Carlos Alcaraz (#2) Winner**:
    - *"Explosive Vamos-Faustballung & 360° Racket Twirl"*: Ausleger schnellt triumphierend auf $34°$ Neigung empor, Head pumpt wie eine geballte Faust bei 14 Hz auf und ab (`headTilt \to -24° \pm 22°`), Schläger vollführt eine dynamische $360°$-Spirale (`headRoll \to \pm 55°`), Dolly schreitet stolz zur Feldmitte.
  - **Verlierer des Punktes (Frustration & Disbelief)**:
    - *"Kopfschütteln & Blick zum Himmel/Flutlicht"*: Enttäuschtes Absenken des Auslegers (`boomTilt \to -6°`), ungläubiges links-rechts Kopfschütteln des Heads (`headPan = \sin(t) \cdot 26°`), gefolgt von einem Blick nach oben zu den Flutlichtern (`headTilt \to 32°`).
- **Aufschlag-Vorbereitung & Saiten-Zupfen**:
  - **Server**: 3x rhythmisches Dribbeln auf dem Boden, gefolgt von einem kurzen Kontrollblick und Saiten-Zurechtzupfen (`headPan \to 24°, headRoll \to 32°`) unmittelbar vor dem Ballaufwurf.
  - **Receiver**: Nervöser "Ready-Step" auf den Zehenspitzen / Schienen ($\pm 0.22\,\text{m}$ Bouncing), gebeugter Schwerpunkt ($Y=1.82\,\text{m}$) und aufmerksames Schlägerwippen in Erwartung des Aufschlags.

### 5. Grand Slam Match Engine & Schiedsrichter (`TennisUmpire`, `MatchScore`)
- **Regelwerk & Zählung**:
  - Offizielle Tennis-Punkte: 0 (Love), 15, 30, 40, Deuce, Advantage, Game, Set, Tiebreak.
  - Automatische Erkennung von Winnern, Assen, Netzfehlern und Out-Bällen.
- **3D Animated Chair Umpire**:
  - Hochstuhl an der Mittellinie ($X = -7.4\,\text{m}, Z = 0\,\text{m}$).
  - Live-Kopf-Tracking (folgt dem Ballwechsel in Echtzeit).
  - Dynamische Schiedsrichter-Durchsagen ("15-Love", "Deuce", "Advantage Kran 1", "Game, Set and Match").

### 5. Courtside Staff & Stadion-Atmosphäre (`TennisCourtsideStaff`, `TennisStadiumSpectators`)
- **Courtside Staff**:
  - 4x Ballkinder an Netz und Ecken (mit dynamischem Blickausrichtung zur Ballposition).
  - 6x Linienrichter mit Flaggen und visuellen Armsignalen bei "OUT" und "FAULT".
- **Stadionzuschauer**:
  - Vollständige Tribünenanlage mit 3D-Publikum.
  - Prozedurale Jubel- und La-Ola-Wellen-Animationen (`isCheering`, `cheerIntensity`).

### 6. Grand Slam Court Arena (`TennisCourtArena`)
- **4 umschaltbare PBR-Beläge**:
  - 🧱 **Sandplatz (`clay`)**: Traditioneller roter Ziegelsand mit Körnung und Schattierung.
  - 🌿 **Rasen (`grass`)**: Wimbledon-Stil Grünrasen mit Streifenmuster.
  - 🎾 **Hartplatz (`hardcourt`)**: US Open Blau-Blau Hartplatz-Textur.
  - ⚡ **Cyber Arena (`cyber`)**: Dunkler Hightech-Grid mit leuchtenden Neon-Linien.
- **Ausstattung**:
  - Offizielles Turniertennisnetz mit weißem Mittelband und Stahlpfosten.
  - LED-Perimeter-Werbebanden mit Animationsshader.
  - 4x 18m Flutlichtmasten mit Blendeffekten und Halogenscheinwerfern.

### 7. TV-Broadcast-Regie & Scoreboard (`TennisCameraMode`)
- **8 Kameraperspektiven**:
  1. `broadcast`: Klassische TV-Hauptkamera (Center Court Vogelperspektive).
  2. `smash`: **🎾 💥 Tennisschläger-Kamera (Racket Cam POV)** – Die Kamera ist direkt am Herzen des Tennisschlägers des schlagenden Krans montiert und blickt durch die Carbon-Saitenbespannung auf Ball, Ausholbewegung und den gegnerischen Platz (gilt exklusiv in diesem View!).
  3. `ball`: Action-Kamera, die dem Ball in Flugrichtung folgt.
  4. `crane1`: Close-Up Verfolgung von Kran 1 (Team Blau).
  5. `umpire`: Schiedsrichter-Perspektive von der Stuhlkanzel.
  6. `spectator`: Front-Row Zuschauerperspektive von der Tribüne.
  7. `coach`: Trainerkabinen-Blickwinkel.
  8. `free`: Frei rotierbare 360° Orbit-Kamera.
- **TV Scoreboard UI**:
  - Grand Slam Broadcast Overlay mit Satz-, Spiel- und Punktestand, Aufschlaganzeige, Ballwechselzähler, Geschwindigkeitsradar und Umpire-Banner.
  - **Live-Status-Badges**: Flammendes `🔥 248 km/h SMASH` und leuchtendes `⚡ NETZ-VOLLEY` Overlay bei High-Energy Aktionen.
