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

### 2. Dedizierter 3-Achs Tennis-Racket-Head (`CraneTennisRacketHead.tsx`)
- **Konstruktion & Kinematik (Top-Mounted / Overslung Architecture)**:
  - **Stehend nach oben montiert (Overslung Mount)**: Der Mitchell-Mount-Flansch sitzt auf der Oberseite des Auslegerkopfs (Beam 4). Die gesamte Gabelstruktur, der Tilt-Yoke und der Schläger erstrecken sich nach oben in den freien Luftraum ($+Y$).
  - **Vollständige Kollisionsfreiheit & Bewegungsspielraum**: Durch die stehende Überkopf-Montage ist der Schläger niemals dem eigenen Ausleger im Weg und hat maximale Bodenfreiheit bei tiefen Slice- und Vorhandbällen sowie uneingeschränkte Reichweite bei Überkopf-Smashes und Aufschlägen.
  - **Pan-Achse (Yaw / Follow-Through Swing)**: Großer Schwenkwinkel für Cross-, Longline- und Slice-Ausschwung.
  - **Tilt-Achse (Pitch / Schlagwinkel-Neigung)**: Schnelle Steigungswinkel für Überkopf-Smashes, flache Laser-Drives und Lobs.
  - **Roll- / Wrist-Achse (Handgelenk-Pronation & Spin-Engine)**: Dynamische Handgelenks-Drehung für 3.200 RPM Heavy Topspin (geschlossenes Schlägerblatt), Slice (offenes Schlägerblatt) und 234 km/h Flat-Aufschlag-Pronation.
- **Integrierter High-Modulus Carbon-Tennisschläger**:
  - Aerodynamischer Kohlefaser-Rahmen mit Team-Lackierung (Blau für 🇮🇹 Sinner, Gelb für 🇪🇸 Alcaraz).
  - High-Tension Saitengitter mit beleuchtetem Sweet-Spot-Ring (`stringGlow`).
  - Integrierter Sweet-Spot Tracker (`racketTargetRef`) für Balltreffpunkterkennung, Impact-Partikelblitz (`impactBurst`) und First-Person Racket Cam POV.
- **Zero Gap Garantie**:
  - Direkt auf den `jointNeck`-Bone des FBX-Skeletts synchronisiert (`MountedCranePlayer`). Keine Lücken, kein Versatz, 100% stabile Koppelung bei jeder Auslenkung.

### 3. Ball-Physik, Flugkurven-Engine, Lobs, Netz-Volleys & Monster-Smashes (`RallyShot`)
- **Trajektorie & Flugphysik**:
  - **🌈 10.5m Topspin-Lob Winner (`isLob = true, lobKind = 'topspin_winner'`)**: Hebt sich majestätisch in bis zu 10.5 Meter Höhe über den weit am Netz stehenden Teleskopausleger des Gegners hinweg und tropft millimetergenau in die Grundlinien-Ecke ($Z = \pm 12.8\,\text{m}$) für einen unerreichbaren Winner!
  - **🛡️ 11.2m Hohe defensive Sky-Notkerze (`isLob = true, lobKind = 'sky_moonball'`)**: Ball steigt in 11.2 m Höhe bis in die Flutlichtmasten ($t = 1.95\,\text{s}$), ermöglicht Zeitgewinn zur Spielfeld-Erholung und bereitet dem Angreifer den perfekten Schmetterball-Abschlag vor.
  - **🔥 248 km/h Monster-Smashes (`isSmash = true`)**: Steiler, pfeilschneller Abwärtseinschlag in den gegnerischen Vordercourt ($p < 0.48, Y \to 0.16\,\text{m}$), Auslösung einer expandierenden Doppelring-Plasma-Schockwelle (`smashBurst`) und explosiver Rebound-Kick steil nach oben über die Tribünenwand ($Y \to 5.2\,\text{m}, Z \to \pm 17.8\,\text{m}$).
  - **Netz-Volleys (`isVolley = true`)**: Direkte Flugbahn in der Luft ohne Bodenaufprall. Der Ball fliegt knapp über die Netzkante direkt zum Schläger des am Netz stehenden Krans ($Z \approx \pm 1.8\,\text{m} \dots \pm 3.8\,\text{m}$).
  - **🎾 Nahtlose Ballistische Flug- & Auslauf-Physik (`stepBallPhysicsContinuation`)**:
    - Wenn ein Ball im **Aus (OUT)** landet oder ein **Punkt (Winner, Ace, Smash)** erzielt wird, friert der Tennisball niemals abrupt ein:
    - Der Ball dotzt mit physikalischem Bodenrebound auf dem Platzbelag auf, behält seinen vollen Geschwindigkeitsvektor ($V_x, V_y, V_z$), segelt in realer Ballistik an den Kränen vorbei tief in den Auslaufbereich / an die Stadionbanden ($Z \to \pm 18\,\text{m} \dots \pm 28\,\text{m}$) und rollt mit realistischer Reibung aus, während die Spieler jubeln oder den Kopf schütteln.
  - **⚠️ Authentische Out-Fehler (`isOutError = true`, 58% aller Fehler)**:
    - Entsprechend der realen ATP-Tour-Statistik von Sinner & Alcaraz landen **58% aller Unforced & Forced Errors im Aus** (überzogene Grundlinienbälle oder verzogene Cross-/Inside-Out-Winkel):
      - **Deep Out (60%)**: Ball segelt 2 bis 12 cm hinter die Grundlinie ($|Z| > 11.885\,\text{m}$), prallt dort auf und fliegt weiter in den Hintergrund.
      - **Wide Out (40%)**: Ball verzieht 2 bis 9 cm in den Korridor / ins Seitenaus ($|X| > 4.115\,\text{m}$).
    - Linienrichter signalisiert "OUT!", Schiedsrichter bestätigt den Ausruf und das Scoreboard zeigt ein leuchtendes **`⚠️ OUT (BALL IM AUS)`**-Badge samt Zentimeter-Genauigkeit.
  - **🕸️ Authentische Netzfehler (`isNetError = true`, 37% aller Fehler)**:
    - Der Ball fliegt bis zur Netzmitte ($Z = 0, p = 0.50$), prallt an der Netzkante ($Y \approx 0.65 - 0.88\,\text{m}$) mit Impact-Blitz ab, fällt senkrecht zu Boden und rollt an der Netzbasis aus.
    - Punktgewinn für den Gegner (`pointWinner = nextHitter`), Frustrationsgeste beim Schützen und rotes **`🕸️ NETZFEHLER`**-Badge.
  - **💫 Netzroller-Drama (`isNetCord = true`, 5% aller Ballwechsel)**: Ball streift das weiße Netzkabel bei $Z=0, Y=1.05\,\text{m}$, verliert an Tempo und tropft trudelnd kurz hinter das Netz ins Feld für einen dramatischen Winner.
  - **Ausleger-Netzvorschub (bis 11.4m Hubweg)**: Teleskopausleger fährt weit nach vorne zum Netz ($Z=0$), während der Remote Head knackige Volley-Punch- und Block-Bewegungen ausführt.
  - **Geschwindigkeiten**: Von 110 km/h (Defensiv-Lob) und 130 km/h (Stoppball) bis zu **248–254 km/h (Monster-Schmetterball)**.
- **234 km/h Power-Aufschlag, Deuce/Ad-Positionierung & Biomechanik**:
  - **📐 Offizielle Deuce- & Ad-Court-Positionierung**:
    - Bei geradem Punktestand (0:0, 15:15, 30:30, 40:40) serviert der Server von der **rechten Seite (Deuce Court, $X = \pm 2.2\,\text{m}$)** diagonal in das gegnerische Aufschlagfeld.
    - Bei ungeradem Punktestand (15:0, 0:15, 30:15, 40:30, Advantage) serviert er von der **linken Seite (Ad Court, $X = \mp 2.2\,\text{m}$)**.
    - Präzise Aufschlag-Varianten: *Down the T* (T-Linie, $X = \pm 0.40\,\text{m}$), *Wide Slice/Kick* (Weit nach außen, $X = \pm 3.60\,\text{m}$) und *Body* (Körper-Aufschlag, $X = \pm 1.90\,\text{m}$).
  - **Kran voll eingefahren (`teleExtension = 0.0m`)**:
    - Der Teleskopausleger bleibt während der gesamten Aufschlagbewegung vollständig eingefahren und stabil an der Grundlinie ($Z = \pm 16.8\,\text{m}$, Schläger bei $Z \approx \pm 12.6\,\text{m}$).
    - **Der 3-Achs Schlägerkopf (`CraneTennisRacketHead`) führt die gesamte Aufschlag-Choreografie autonom aus**.
  - **🏀 Phase 1: Dribbel-Vorbereitungsphase (`p < 0.28`)**: Der Schläger tippt 3x rhythmisch von oben auf den Ball (`headTilt \to -28^\circ \dots -8^\circ`), während der Ball synchron am Boden aufprellt.
  - **🚀 Phase 2: Parabolischer Ballaufwurf & Trophy Pose (`0.28 \le p < 0.50`)**: Ball steigt in 5.8 Meter Höhe auf, während der Schlägerkopf in die klassische ATP-Trophy-Pose fällt (`headTilt \to +46^\circ`, `headRoll \to \pm 52^\circ`, `headPan \to \mp 16^\circ`).
  - **⚡ Phase 3: Explosiver Treffpunkt & Handgelenks-Pronation (`p \ge 0.50`)**: Racket peitscht durch den Ball mit massiver Vorwärts-Abwärts-Pronation (`headTilt \to -36^\circ`, `headRoll \to \pm 78^\circ`, `headPan \to \pm 12^\circ`) bei bis zu 234 km/h und schwingt geschmeidig zur Hüfte aus (`headTilt \to -42^\circ`).
  - **⏱️ Natürliche Pause zwischen 1. und 2. Service**: Bei einem Fehler beim 1. Aufschlag (Netz oder Aus, ~28%) ruft der Schiedsrichter *"FAULT! Zweiter Aufschlag..."*, und der Kran nimmt sich ca. 2.3 Sekunden Zeit, um sich neu zu positionieren und den 2. Aufschlag mit Kick/Topspin (180–195 km/h) sicher ins Feld zu servieren.
  - **⚡ Asse vs. 🎯 Service Winner**: Differenzierung zwischen direkt unberührten Assen (~7%) und schnittigen Service Winnern (~15%), bei denen der Receiver den Ball durch extreme Geschwindigkeit/Spin nur noch unkontrolliert ins Netz oder Aus ablenken kann. Über 80% der Aufschläge münden in spektakuläre Rallies.

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
  1. `free`: **🔓 Frei rotierbare 360° Orbit-Kamera (Default)** – Unbeschränkte freie Kamerasteuerung per Maus/Touch (Drehen, Schwenken, Zoomen).
  2. `broadcast`: Klassische TV-Hauptkamera (Center Court Vogelperspektive).
  3. `smash`: **🎾 💥 Tennisschläger-Kamera (Racket Cam POV)** – Die Kamera ist direkt am Herzen des Tennisschlägers des schlagenden Krans montiert und blickt durch die Carbon-Saitenbespannung auf Ball, Ausholbewegung und den gegnerischen Platz (gilt exklusiv in diesem View!).
  4. `ball`: Action-Kamera, die dem Ball in Flugrichtung folgt.
  5. `crane1`: Close-Up Verfolgung von Kran 1 (Team Blau).
  6. `umpire`: Schiedsrichter-Perspektive von der Stuhlkanzel.
  7. `spectator`: Front-Row Zuschauerperspektive von der Tribüne.
  8. `coach`: Trainerkabinen-Blickwinkel.
- **Offizielles TV Broadcast Scoreboard Overlay (Links unten)**:
  - **Authentisches 2-Zeilen-Format (ATP Tour & Grand Slam Standard)**:
    - **Positionierung**: Unten links (`bottom: 20px, left: 20px`), wie bei echten TV-Übertragungen (BBC Wimbledon, ESPN, Eurosport).
    - **Header**: `🏆 ATP FINALS • CHAMPIONSHIP MATCH | SET X • FINAL`
    - **Spielerzeilen**: Flaggen-Badge (`🇮🇹` / `🇪🇸`), Setzliste `[1]` / `[2]`, Name in Großbuchstaben (`J. SINNER` / `C. ALCARAZ`), **leuchtender Aufschlag-Ball `🟡`** beim aktiven Server.
    - **Spalten-Struktur**: `SETS` (Gewonnene Sätze), `GAMES` (Aktueller Spielstand) und **hervorgehobene `POINTS`-Boxen** (`0`, `15`, `30`, `40`, `AD`) mit dynamischer Führungsausleuchtung in Team-Gold/Cyan.
    - **Match-Ticker & Schnellaktionen**: `⏸️ Stop / Freeze`, `🔄 Restart Match`, `📊 ATP H2H`, Live-Umpire-Durchsagen (`🪑 UMPIRE: Deuce / Advantage / Game Sinner`) und Live-Schlaganalyse mit Event-Badges (`🔥 248 km/h SMASH`, `⚡ DIREKTES ASS`, `🎯 SERVICE WINNER`, `🕸️ NETZFEHLER`, `⚠️ OUT`, `💫 NETZROLLER`, `⏸️ EINGEFROREN`).
  - **Einklappbare Steuerung Rechts Oben (`isControlsOpen`)**:
    - Aufgeräumtes UI mit platzsparendem, einklappbarem Steuerungs-Drawer oben rechts (`top: 20px, right: 20px`, `◀ 🎾 Steuerung & Schläge` / `Einklappen ▶`).
  - **Standardmäßig ausgeblendete Stadion-Elemente**: Zuschauer (`showSpectators`), Schiedsrichter & Ballkinder (`showCourtsideStaff`) sowie Tribünen (`showGrandstands`) sind initial auf `false` geschaltet für einen sauberen, performanten und unverstellten Blick auf die Kran-Kinematik, und können bei Bedarf jederzeit im Menü aktiviert werden.
- **Voll-Ausfahr-Showcase & Einführender Perspektivenwechsel (`showcaseTimerRef`)**:
  - **Auslöser**: Bei jedem Matchstart (Initialisierung / Match-Reset) und unmittelbar nach jedem gewonnenen Spiel (Game-Wechsel).
  - **4.8s Kinematik-Ablauf**: Beide Supertechno 50 Kräne heben ihre Hubsäulen auf 3.25m an, neigen die Ausleger auf 30° und **fahren synchron bis zum mechanischen Endanschlag von 11.3m voll aus**, vollführen eine Schläger-Glow-Kalibrierung und fahren anschließend sanft zurück auf die 5.5m Service-Grundlinie.
  - **Cinematische Kamera-Tour**: Dynamischer 3-Phasen Kameraflug (Tiefe Weitwinkel-Aufnahme von Südwest -> Kurvenflug über das Netz -> sanfte Landung in TV-Broadcast-Perspektive).
- **Match-Freeze / Stop-Modus & Match-Restart**:
  - **`⏸️ Stop / Freeze`**: Sofortiges Einfrieren aller Ballflugkurven, Dolly-Fahrten und Ausleger-Bewegungen bei laufendem Match, um beliebige Spielsituationen und Kran-Posen mit der freien 360° Orbit-Kamera im Detail zu inspizieren.
  - **`🔄 Restart Match`**: Setzt das gesamte Match auf 0:0 zurück und startet unmittelbar die 11.3m Voll-Ausfahr-Zeremonie.
- **Hierarchische Szenegraph-Koppelung (`MountedCranePlayer`)**:
  - Vollständige und dauerhafte Vermeidung von Lücken (Zero Gap) durch direkte Schachtelung des Remote Heads in die lokale Three.js-Transformationskette des Krans.
