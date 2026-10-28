# Aura – AI Desktop Companion & Control Center

Asistent AI local pentru desktop (**widget plutitor** cu expandare adaptivă în toate cele 4 colțuri + **Control Center** complet pentru personalizare, monitorizare hardware, fișiere locale și licențiere).

**Stack:** Electron · React 19 · Vite · Tailwind CSS v4 · Motion · Web Speech API (TTS & STT) · Ollama (LLM local)

---

## Pornire & Împachetare (`.exe`)

```bash
npm install
npm run dev        # Vite + Electron cu hot reload pentru dezvoltare
npm run dev:ui     # doar UI în browser (bridge mock) – util pentru design rapid
npm start          # build de producție + rulare Electron
npm run pack       # generează executabilul dezarhivat în release/win-unpacked/Aura.exe
npm run dist       # generează installerul Windows Setup (.exe) și versiunea Portable (.exe) în release/
```

Pentru AI local, instalează [Ollama](https://ollama.com):

```bash
ollama pull llama3.2:3b
ollama serve
```

---

## Funcționalități Principale

### 1. Widgetul Flotant (Desktop Companion)
- **Hover-to-Expand & Click-Through**: fereastră transparentă care lasă click-urile să treacă spre desktop în zonele libere și se extinde cu animație spring când aduci cursorul pe pastilă.
- **Ancorare Adaptivă în 4 Colțuri**: poți trage pastila sau panoul în orice colț al monitorului; panoul de chat se deschide automat spre interiorul ecranului (*stânga/dreapta × sus/jos*).
- **Voce (TTS & Dictare)**:
  - Buton **Auto-Speak (`🔊`)** în antet și buton **„Ascultă”** pe fiecare răspuns al asistentului.
  - Buton **Microfon (`🎤`)** în composer pentru dictare vocală.
- **Comenzi Rapide pentru Fișiere Locale**:
  - `/caută <termen>` — caută după nume și în conținutul documentelor indexate.
  - `/rezumă <nume-fișier>` (sau butonul **„✨ Rezumă”** din rezultatele căutării) — citește fișierul local și îl trimite ca context modelului AI.
- **System Tray Icon**: iconiță lângă ceasul Windows generată dinamic în culorile temei active, cu meniu rapid pentru schimbarea temei, a personalității și resetarea poziției.

### 2. Control Mouse & Desktop Co-Pilot (`Ctrl+Shift+A` / `/controlează`)
- **Control Real Mouse & Tastatură**: Aura mută cursorul neon electric, dă click și tastează la cererea utilizatorului.
- **Animații Neon & Ripple Waves**: feedback vizual complet la fiecare acțiune (undă de click neon, insignă plutitoare `Aura controlează PC-ul`, mișcare lină cu interpolare cubică).
- **Oprire Imediată**: utilizatorul poate opri oricând controlul prin tasta `Esc` sau butonul dedicat.
- **Planuri cu Aprobare**: fiecare acțiune pregătește pașii pentru confirmare înainte de execuție.

### 3. Control Center (Dashboard — `Ctrl+Shift+D`)
- **Personalizare**: 6 teme vizuale (*Aurora*, *Ocean*, *Sunset*, *Forest*, *Rose*, *Graphite*), opacitate, nume custom, 5 personalități, temperatură/creativitate, configurare completă **Voce & TTS** și previzualizare live.
- **Modele AI & Monitorizare Hardware**: telemetrie live pentru **CPU**, **RAM** și **GPU / VRAM** (`nvidia-smi` + fallback Windows CIM), modele încărcate în VRAM (`ollama ps`) cu eliberare la 1-click, selectare/ștergere modele instalate și descărcare cu progres live (`ollama pull`).
- **Cont, Abonament & Licență**: planuri *Starter (Gratuit)*, *Aura Pro* și *Aura Team*, comutator lunar/anual (-25%), activare cheie de licență (`AURA-PRO-XXXX-XXXX`), chei demo la 1-click, checkout și descărcare facturi.
- **Confidențialitate & Fișiere Locale**: comutatoare de securitate, blocare automată a fișierelor cu secrete (`.env`, `.pem`, `.key`, `id_rsa`), gestionare foldere autorizate cu selector nativ Windows și indexator full-text local.
