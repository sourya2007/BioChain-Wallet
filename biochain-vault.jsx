import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const ACCENT = "#00d4ff";
const ACCENT2 = "#00ff9d";
const RED = "#ff3b5c";
const YELLOW = "#ffd43b";
const BG = "#060810";
const SURFACE = "#0a0f1e";
const BORDER = "rgba(0,212,255,0.12)";
const BORDER_BRIGHT = "rgba(0,212,255,0.35)";
const MUTED = "#4a6080";
const TEXT = "#c8d8f0";
const DIM = "#1e2d44";

// ─── FONTS & BASE CSS ─────────────────────────────────────────────────────────
const BASE_CSS = `
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600&family=IBM+Plex+Sans:wght@300;400;500;600;700&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
html,body,#root{height:100%;background:${BG};color:${TEXT};font-family:'IBM Plex Sans',sans-serif;-webkit-font-smoothing:antialiased;}
body{overflow-x:hidden;}
::-webkit-scrollbar{width:3px;height:3px;}
::-webkit-scrollbar-track{background:transparent;}
::-webkit-scrollbar-thumb{background:${ACCENT};border-radius:2px;}
input,button,select{font-family:inherit;}
::selection{background:rgba(0,212,255,0.25);color:#fff;}

@keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes scanLine{0%{top:-2px}100%{top:100%}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}
@keyframes glitch{0%,95%{transform:none;clip-path:none}96%{transform:translateX(-2px);clip-path:inset(20% 0 60% 0)}97%{transform:translateX(2px);clip-path:inset(60% 0 20% 0)}98%{transform:translateX(-1px);clip-path:inset(40% 0 40% 0)}100%{transform:none;clip-path:none}}
@keyframes blink{0%,49%{opacity:1}50%,100%{opacity:0}}
@keyframes ticker{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
@keyframes dnaWave{0%,100%{transform:scaleY(1)}50%{transform:scaleY(1.4)}}
@keyframes matrixRain{0%{opacity:0;transform:translateY(-20px)}10%{opacity:1}90%{opacity:1}100%{opacity:0;transform:translateY(100vh)}}
@keyframes geoScan{0%{stroke-dashoffset:1000}100%{stroke-dashoffset:0}}
@keyframes progressFill{from{width:0%}to{width:var(--target-w)}}
@keyframes screenFlicker{0%,98%,100%{opacity:1}99%{opacity:0.85}}
@keyframes slideRight{from{transform:translateX(-100%);opacity:0}to{transform:translateX(0);opacity:1}}
@keyframes zoomIn{from{transform:scale(0.92);opacity:0}to{transform:scale(1);opacity:1}}
@keyframes numberCount{from{opacity:0}to{opacity:1}}
@keyframes borderPulse{0%,100%{border-color:rgba(0,212,255,0.12)}50%{border-color:rgba(0,212,255,0.5)}}

.fade-up{animation:fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) both;}
.fade-in{animation:fadeIn 0.4s ease both;}
.zoom-in{animation:zoomIn 0.4s cubic-bezier(0.16,1,0.3,1) both;}
.mono{font-family:'IBM Plex Mono',monospace;}
.blink{animation:blink 1s step-end infinite;}
.pulse-border{animation:borderPulse 2s ease infinite;}

/* Bloomberg-style grid lines */
.bb-cell{border-right:1px solid ${BORDER};border-bottom:1px solid ${BORDER};}
.bb-cell:last-child{border-right:none;}

/* Inputs */
.terminal-input{
  width:100%;padding:11px 14px;
  background:rgba(0,212,255,0.04);
  border:1px solid rgba(0,212,255,0.18);
  border-radius:4px;color:${TEXT};
  font-family:'IBM Plex Mono',monospace;font-size:13px;
  outline:none;transition:border-color 0.2s,box-shadow 0.2s;
  letter-spacing:0.02em;
}
.terminal-input:focus{border-color:${ACCENT};box-shadow:0 0 0 2px rgba(0,212,255,0.15),inset 0 0 12px rgba(0,212,255,0.04);}
.terminal-input::placeholder{color:${MUTED};font-style:normal;}

/* Buttons */
.btn-terminal{
  padding:10px 22px;border:1px solid ${ACCENT};border-radius:3px;
  background:rgba(0,212,255,0.08);color:${ACCENT};
  font-family:'IBM Plex Mono',monospace;font-size:12px;font-weight:500;
  letter-spacing:0.08em;text-transform:uppercase;
  cursor:pointer;transition:all 0.2s;position:relative;overflow:hidden;
}
.btn-terminal::before{content:'';position:absolute;top:0;left:-100%;width:100%;height:100%;background:linear-gradient(90deg,transparent,rgba(0,212,255,0.1),transparent);transition:left 0.4s;}
.btn-terminal:hover::before{left:100%;}
.btn-terminal:hover{background:rgba(0,212,255,0.16);box-shadow:0 0 20px rgba(0,212,255,0.25);}
.btn-terminal:active{transform:scale(0.98);}
.btn-terminal:disabled{opacity:0.35;cursor:not-allowed;transform:none;}

.btn-primary-term{background:${ACCENT};color:#000;border-color:${ACCENT};font-weight:600;}
.btn-primary-term:hover{background:#00eeff;box-shadow:0 0 30px rgba(0,212,255,0.5);}

/* Tags */
.tag{display:inline-flex;align-items:center;gap:5px;padding:2px 8px;border-radius:2px;font-size:10px;font-weight:600;letter-spacing:0.08em;font-family:'IBM Plex Mono',monospace;}
.tag-green{background:rgba(0,255,157,0.1);color:${ACCENT2};border:1px solid rgba(0,255,157,0.2);}
.tag-red{background:rgba(255,59,92,0.1);color:${RED};border:1px solid rgba(255,59,92,0.2);}
.tag-blue{background:rgba(0,212,255,0.1);color:${ACCENT};border:1px solid rgba(0,212,255,0.2);}
.tag-yellow{background:rgba(255,212,59,0.1);color:${YELLOW};border:1px solid rgba(255,212,59,0.2);}

/* BB Panel */
.bb-panel{background:${SURFACE};border:1px solid ${BORDER};position:relative;}
.bb-panel-header{padding:6px 10px;border-bottom:1px solid ${BORDER};display:flex;align-items:center;justify-content:space-between;background:rgba(0,212,255,0.03);}
.bb-panel-title{font-family:'IBM Plex Mono',monospace;font-size:10px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:${ACCENT};}

/* Spinner */
.spin-ring{width:18px;height:18px;border:2px solid rgba(0,212,255,0.15);border-top-color:${ACCENT};border-radius:50%;animation:spin 0.7s linear infinite;flex-shrink:0;}

/* Dot indicators */
.live-dot{width:6px;height:6px;border-radius:50%;background:${ACCENT2};animation:pulse 1.5s ease-in-out infinite;}
.err-dot{width:6px;height:6px;border-radius:50%;background:${RED};animation:pulse 1.5s ease-in-out infinite;}

/* Tooltip override */
.recharts-tooltip-wrapper{filter:drop-shadow(0 4px 20px rgba(0,0,0,0.8));}
`;

// ─── UTILS ────────────────────────────────────────────────────────────────────
async function sha256(str) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}
const fmt2 = n => String(n).padStart(2, "0");
const fmtTime = () => { const d = new Date(); return `${fmt2(d.getHours())}:${fmt2(d.getMinutes())}:${fmt2(d.getSeconds())}`; };
const fmtDate = () => new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
const fmtNum = (n, d = 2) => Number(n).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
const pct = n => (n >= 0 ? "+" : "") + n.toFixed(2) + "%";
const shortAddr = a => a.slice(0, 6) + "…" + a.slice(-4);

// ─── MOCK MARKET DATA ─────────────────────────────────────────────────────────
const SYMBOLS = {
  BTC: { name: "Bitcoin", price: 67842.5, change: 2.14 },
  ETH: { name: "Ethereum", price: 3541.2, change: -0.87 },
  SOL: { name: "Solana", price: 178.43, change: 4.32 },
  AAPL: { name: "Apple Inc.", price: 213.45, change: 0.54 },
  TSLA: { name: "Tesla Inc.", price: 248.32, change: -1.23 },
  NVDA: { name: "NVIDIA Corp.", price: 875.6, change: 3.77 },
  MSFT: { name: "Microsoft", price: 415.2, change: 0.21 },
  AMZN: { name: "Amazon", price: 192.8, change: 1.05 },
  SPY: { name: "S&P 500 ETF", price: 528.4, change: 0.33 },
  QQQ: { name: "Nasdaq ETF", price: 447.2, change: 0.68 },
};

function generateCandleData(basePrice, days = 90, volatility = 0.02) {
  const data = [];
  let price = basePrice * (0.75 + Math.random() * 0.1);
  const now = Date.now();
  for (let i = days; i >= 0; i--) {
    const open = price;
    const change = (Math.random() - 0.48) * volatility * price;
    const close = Math.max(open + change, open * 0.95);
    const high = Math.max(open, close) * (1 + Math.random() * 0.01);
    const low = Math.min(open, close) * (1 - Math.random() * 0.01);
    const volume = Math.floor(Math.random() * 5000000 + 1000000);
    data.push({
      date: new Date(now - i * 86400000).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      open: +open.toFixed(2), close: +close.toFixed(2),
      high: +high.toFixed(2), low: +low.toFixed(2),
      volume, price: +close.toFixed(2),
    });
    price = close;
  }
  return data;
}

function generateMockTxs(walletAddr) {
  const types = ["SEND", "RECEIVE", "STEALTH", "ROTATE", "DECOY"];
  const statuses = ["CONFIRMED", "CONFIRMED", "CONFIRMED", "PENDING"];
  return Array.from({ length: 24 }, (_, i) => ({
    id: "0x" + Math.random().toString(16).slice(2, 14),
    type: types[Math.floor(Math.random() * types.length)],
    status: statuses[Math.floor(Math.random() * statuses.length)],
    amount: (Math.random() * 5).toFixed(4),
    asset: ["ETH", "BTC", "SOL"][Math.floor(Math.random() * 3)],
    from: shortAddr("0x" + Math.random().toString(16).slice(2, 42)),
    to: shortAddr("0x" + Math.random().toString(16).slice(2, 42)),
    gas: (Math.random() * 0.002).toFixed(5),
    block: Math.floor(19000000 + Math.random() * 500000),
    time: new Date(Date.now() - Math.random() * 7 * 86400000).toLocaleString(),
    trustScore: (0.6 + Math.random() * 0.4).toFixed(3),
  }));
}

// ─── MARKET API (uses free public APIs) ───────────────────────────────────────
async function searchMarket(query) {
  try {
    const upper = query.toUpperCase().trim();
    // Try local known symbols first
    if (SYMBOLS[upper]) {
      const base = SYMBOLS[upper];
      const noise = (Math.random() - 0.5) * 0.02;
      return [{
        symbol: upper, name: base.name,
        price: +(base.price * (1 + noise)).toFixed(2),
        change: +(base.change + (Math.random() - 0.5)).toFixed(2),
        volume: Math.floor(Math.random() * 50e6 + 10e6),
        marketCap: Math.floor(Math.random() * 1e12 + 100e9),
      }];
    }
    // Fallback mock for any other query
    await new Promise(r => setTimeout(r, 600));
    return [{
      symbol: upper, name: `${query} Corp.`,
      price: +(50 + Math.random() * 500).toFixed(2),
      change: +((Math.random() - 0.5) * 6).toFixed(2),
      volume: Math.floor(Math.random() * 20e6 + 1e6),
      marketCap: Math.floor(Math.random() * 500e9 + 10e9),
    }];
  } catch { return []; }
}

// Inject CSS once
let cssInjected = false;
function ensureCSS() {
  if (cssInjected) return;
  cssInjected = true;
  const el = document.createElement("style");
  el.textContent = BASE_CSS;
  document.head.appendChild(el);
}

// ─── SHARED SMALL COMPONENTS ──────────────────────────────────────────────────
function Spinner({ size = 18 }) {
  return <div className="spin-ring" style={{ width: size, height: size }} />;
}

function TerminalCursor() {
  return <span className="blink mono" style={{ color: ACCENT, fontSize: 14 }}>█</span>;
}

function BBPanel({ title, children, right, style, noPad }) {
  return (
    <div className="bb-panel" style={{ ...style }}>
      <div className="bb-panel-header">
        <span className="bb-panel-title">{title}</span>
        {right && <span style={{ fontSize: 10, color: MUTED, fontFamily: "'IBM Plex Mono',monospace" }}>{right}</span>}
      </div>
      <div style={noPad ? {} : { padding: "10px" }}>
        {children}
      </div>
    </div>
  );
}

function MiniTicker({ symbol, price, change }) {
  const up = change >= 0;
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "center", padding: "4px 12px", borderRight: `1px solid ${BORDER}`, flexShrink: 0 }}>
      <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, fontWeight: 600, color: ACCENT }}>{symbol}</span>
      <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11 }}>{fmtNum(price)}</span>
      <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: up ? ACCENT2 : RED }}>{pct(change)}</span>
    </div>
  );
}

// Custom chart tooltip
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#0a0f1e", border: `1px solid ${BORDER_BRIGHT}`, padding: "8px 12px", borderRadius: 3 }}>
      <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: MUTED, marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: p.color || ACCENT }}>
          {p.name}: {typeof p.value === "number" ? fmtNum(p.value) : p.value}
        </div>
      ))}
    </div>
  );
}

// ─── STAGE 1: LOGIN ───────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [bootLines, setBootLines] = useState([]);
  const canvasRef = useRef(null);

  // Matrix rain background
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const cols = Math.floor(canvas.width / 16);
    const drops = Array.from({ length: cols }, () => Math.random() * -100);
    const chars = "BIOCHAIN01アイウエオカキクケコ0123456789ABCDEF".split("");

    const draw = () => {
      ctx.fillStyle = "rgba(6,8,16,0.05)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "rgba(0,212,255,0.18)";
      ctx.font = "12px 'IBM Plex Mono'";
      drops.forEach((y, i) => {
        const char = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(char, i * 16, y * 16);
        if (y * 16 > canvas.height && Math.random() > 0.975) drops[i] = 0;
        drops[i] += 0.5;
      });
    };
    const id = setInterval(draw, 50);
    return () => clearInterval(id);
  }, []);

  // Boot sequence
  useEffect(() => {
    const lines = [
      "BIOCHAIN VAULT OS v4.7.2 — INITIALIZING...",
      "SECURE ENCLAVE: [████████████████] READY",
      "DNA MODULE: ARMED",
      "GEO-GENOMIC TRUST ENGINE: ONLINE",
      "CRYPTOGRAPHIC IDENTITY LAYER: ACTIVE",
      "AWAITING OPERATOR CREDENTIALS...",
    ];
    lines.forEach((l, i) => setTimeout(() => setBootLines(prev => [...prev, l]), i * 280));
  }, []);

  const handleLogin = async () => {
    if (user !== "admin" || pass !== "1234") {
      setError("ACCESS DENIED");
      return;
    }
    setLoading(true);
    setError("");
    await new Promise(r => setTimeout(r, 1200));
    setLoading(false);
    onLogin({ username: user, displayName: user.toUpperCase() });
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: BG, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, opacity: 0.6 }} />

      {/* Center panel */}
      <div className="zoom-in" style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 440, padding: "0 20px" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 64, height: 64, margin: "0 auto 16px", position: "relative" }}>
            <svg viewBox="0 0 64 64" style={{ width: "100%", height: "100%" }}>
              <circle cx="32" cy="32" r="30" fill="none" stroke={ACCENT} strokeWidth="1" opacity="0.3" />
              <circle cx="32" cy="32" r="24" fill="none" stroke={ACCENT} strokeWidth="0.5" opacity="0.5"
                strokeDasharray="4 4" style={{ animation: "spin 20s linear infinite", transformOrigin: "32px 32px" }} />
              {/* DNA helix */}
              <path d="M22 16 Q32 24 42 32 Q32 40 22 48" fill="none" stroke={ACCENT} strokeWidth="2" opacity="0.9" />
              <path d="M42 16 Q32 24 22 32 Q32 40 42 48" fill="none" stroke={ACCENT2} strokeWidth="2" opacity="0.9" />
              {[20, 28, 36, 44].map(y => (
                <line key={y} x1={22 + (y - 20) * 0.5} y1={y} x2={42 - (y - 20) * 0.5} y2={y}
                  stroke="rgba(0,212,255,0.4)" strokeWidth="1" />
              ))}
            </svg>
          </div>
          <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 22, fontWeight: 600, letterSpacing: "0.15em", color: ACCENT }}>
            BIOCHAIN
          </div>
          <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, letterSpacing: "0.35em", color: MUTED, marginTop: 3 }}>
            VAULT TERMINAL ∷ SECURE ACCESS
          </div>
        </div>

        {/* Boot log */}
        <div style={{ background: "rgba(0,0,0,0.5)", border: `1px solid ${BORDER}`, borderRadius: 4, padding: "12px 14px", marginBottom: 20, minHeight: 120 }}>
          {bootLines.map((l, i) => (
            <div key={i} className="fade-in" style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: i === bootLines.length - 1 ? ACCENT : "rgba(0,212,255,0.4)", marginBottom: 4, animationDelay: `${i * 0.1}s` }}>
              <span style={{ color: "rgba(0,255,157,0.5)", marginRight: 8 }}>›</span>{l}
              {i === bootLines.length - 1 && <TerminalCursor />}
            </div>
          ))}
        </div>

        {/* Login form */}
        <div style={{ background: "rgba(10,15,30,0.92)", border: `1px solid ${BORDER_BRIGHT}`, borderRadius: 4, padding: 24, backdropFilter: "blur(20px)" }}>
          <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: ACCENT, letterSpacing: "0.1em", marginBottom: 16 }}>
            ┌─ OPERATOR AUTHENTICATION ─────────────────┐
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: MUTED, marginBottom: 5, letterSpacing: "0.08em" }}>
                USER_ID <span style={{ color: RED }}>*</span>
              </div>
              <input className="terminal-input" placeholder="operator@biochain.vault" value={user}
                onChange={e => setUser(e.target.value)} onKeyDown={e => e.key === "Enter" && handleLogin()} />
            </div>
            <div>
              <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: MUTED, marginBottom: 5, letterSpacing: "0.08em" }}>
                PASSPHRASE <span style={{ color: RED }}>*</span>
              </div>
              <input className="terminal-input" type="password" placeholder="••••••••••••" value={pass}
                onChange={e => setPass(e.target.value)} onKeyDown={e => e.key === "Enter" && handleLogin()} />
            </div>

            {error && (
              <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: RED, padding: "6px 10px", background: "rgba(255,59,92,0.08)", border: `1px solid rgba(255,59,92,0.2)`, borderRadius: 3 }}>
                ⚠ {error}
              </div>
            )}

            <button className="btn-terminal btn-primary-term" onClick={handleLogin} disabled={loading}
              style={{ width: "100%", marginTop: 4, padding: "12px", fontSize: 11, letterSpacing: "0.15em" }}>
              {loading ? (
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <Spinner size={14} /> AUTHENTICATING...
                </span>
              ) : "INITIALIZE SESSION"}
            </button>
          </div>

          <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: MUTED, marginTop: 14, textAlign: "center" }}>
            └─────────── ENCRYPTED TLS 1.3 ─────────────┘
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: 16, fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, color: "rgba(74,96,128,0.5)", letterSpacing: "0.08em" }}>
          BIOCHAIN VAULT OS · {fmtDate()} · {fmtTime()} UTC
        </div>
      </div>
    </div>
  );
}

// ─── STAGE 2: DNA VERIFICATION ────────────────────────────────────────────────
function DNAVerificationScreen({ user, onVerified }) {
  const SAMPLE11_BACKEND_COMMITMENT = "17a7dc0caf2b6a901845245811bdb104462eee513935eb9a57f2daa9506ee609";
  const [stage, setStage] = useState("dna"); // dna | geo | processing | done
  const [dnaInput, setDnaInput] = useState("");
  const [dnaLoading, setDnaLoading] = useState(true);
  const [dnaLoadingLine, setDnaLoadingLine] = useState("Loading genomic sample11...");
  const [geoData, setGeoData] = useState({ lat: "", lon: "", device: "FP-" + Math.random().toString(36).slice(2, 10).toUpperCase() });
  const [dnaHash, setDnaHash] = useState("");
  const [progress, setProgress] = useState(0);
  const [log, setLog] = useState([]);
  const [trustResult, setTrustResult] = useState(null);

  const addLog = (msg, type = "info") => setLog(l => [...l, { msg, type, t: fmtTime() }]);

  useEffect(() => {
    if (stage !== "dna") {
      return;
    }

    setDnaLoading(true);
    setDnaInput("");
    const steps = [
      [300, "Fetching backend DNA commitment map..."],
      [900, "Resolving sample11.vcf canonical variant block..."],
      [1500, "Applying backend SHA-256 DNA commitment..."]
    ];

    const timers = steps.map(([delay, message]) => setTimeout(() => setDnaLoadingLine(message), delay));
    const doneTimer = setTimeout(() => {
      setDnaInput(SAMPLE11_BACKEND_COMMITMENT);
      setDnaLoading(false);
      setDnaLoadingLine("sample11 commitment loaded");
      addLog("sample11 backend DNA commitment injected", "ok");
    }, 2100);

    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(doneTimer);
    };
  }, [stage]);

  const handleDNA = async () => {
    if (!dnaInput.trim()) return;
    const dnaValue = dnaInput.trim();
    const isPreHashedCommitment = /^[a-f0-9]{64}$/i.test(dnaValue);
    let hash = dnaValue;

    if (isPreHashedCommitment) {
      addLog("Using precomputed backend DNA commitment from sample11", "ok");
    } else {
      addLog("Computing SHA-256 commitment from DNA source...");
      hash = await sha256(dnaValue);
    }

    setDnaHash(hash);
    addLog("DNA commitment: " + hash.slice(0, 32) + "...", "ok");
    addLog("ZK proof generation: SIMULATING...");
    await new Promise(r => setTimeout(r, 800));
    addLog("Nullifier computed, proof valid ✓", "ok");
    setTimeout(() => setStage("geo"), 600);
  };

  const handleGeo = async () => {
    if (!geoData.lat || !geoData.lon) return;
    setStage("processing");
    setProgress(0);

    const steps = [
      [200, "Initializing geo-genomic trust engine...", 15],
      [400, `Evaluating location: ${geoData.lat}, ${geoData.lon}`, 30],
      [600, "Cross-referencing device fingerprint: " + geoData.device, 45],
      [900, "Running genomic pattern match against vault commitment...", 60],
      [1200, "Computing trust zone classification...", 75],
      [1500, "Generating access token...", 88],
      [1900, "TRUST ZONE VERIFIED — FULL ACCESS GRANTED", 100],
    ];

    for (const [delay, msg, prog] of steps) {
      await new Promise(r => setTimeout(r, delay));
      addLog(msg, prog === 100 ? "ok" : "info");
      setProgress(prog);
    }

    const score = 0.82 + Math.random() * 0.15;
    setTrustResult({ score, zone: "HIGH", action: "full_access", delay: 0 });
    setStage("done");
  };

  useEffect(() => {
    if (stage === "done" && trustResult) {
      setTimeout(() => onVerified({ dnaHash, geoData, trustResult }), 2000);
    }
  }, [stage, trustResult]);

  return (
    <div style={{ position: "fixed", inset: 0, background: BG, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      {/* Animated grid BG */}
      <div style={{ position: "absolute", inset: 0, opacity: 0.06, backgroundImage: `linear-gradient(${BORDER} 1px, transparent 1px), linear-gradient(90deg, ${BORDER} 1px, transparent 1px)`, backgroundSize: "40px 40px" }} />

      <div style={{ width: "100%", maxWidth: 680, position: "relative", zIndex: 1 }}>
        {/* Header */}
        <div className="fade-up" style={{ marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: ACCENT, letterSpacing: "0.12em" }}>
              BIOCHAIN VAULT ∷ BIOMETRIC GATE
            </div>
            <div style={{ fontFamily: "'IBM Plex Sans',sans-serif", fontSize: 20, fontWeight: 700, marginTop: 4 }}>
              Identity Verification
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: MUTED }}>OPERATOR</div>
            <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 13, color: ACCENT }}>{user.displayName}</div>
          </div>
        </div>

        {/* Progress steps */}
        <div className="fade-up" style={{ display: "flex", gap: 0, marginBottom: 24, animationDelay: "0.1s" }}>
          {[["01", "DNA COMMITMENT", "dna"], ["02", "GEO-GENOMIC TRUST", "geo"], ["03", "ACCESS GRANTED", "done"]].map(([num, label, s], i) => {
            const active = stage === s || (s === "geo" && stage === "processing") || (s === "done" && stage === "done");
            const past = (s === "dna" && ["geo", "processing", "done"].includes(stage)) ||
              (s === "geo" && ["processing", "done"].includes(stage));
            return (
              <div key={num} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
                  {i > 0 && <div style={{ flex: 1, height: 1, background: past ? ACCENT : BORDER }} />}
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    border: `1px solid ${active || past ? ACCENT : BORDER}`,
                    background: past ? ACCENT : active ? "rgba(0,212,255,0.15)" : "transparent",
                    fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, fontWeight: 600,
                    color: past ? BG : active ? ACCENT : MUTED,
                    transition: "all 0.4s",
                  }}>
                    {past ? "✓" : num}
                  </div>
                  {i < 2 && <div style={{ flex: 1, height: 1, background: past ? ACCENT : BORDER }} />}
                </div>
                <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, color: active || past ? ACCENT : MUTED, marginTop: 6, letterSpacing: "0.08em", textAlign: "center" }}>
                  {label}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {/* Left: input panel */}
          <div>
            {stage === "dna" && (
              <div className="bb-panel zoom-in" style={{ padding: 20 }}>
                <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: ACCENT, marginBottom: 4 }}>STEP 01 — DNA SOURCE</div>
                <div style={{ fontSize: 12, color: MUTED, marginBottom: 16, lineHeight: 1.6 }}>
                  Enter your genomic source string. It will be locally hashed — never transmitted raw.
                </div>

                <div style={{ margin: "0 0 12px", padding: "8px 10px", borderRadius: 3, border: `1px solid ${dnaLoading ? "rgba(255,212,59,0.25)" : "rgba(0,255,157,0.22)"}`, background: dnaLoading ? "rgba(255,212,59,0.08)" : "rgba(0,255,157,0.08)", fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: dnaLoading ? YELLOW : ACCENT2 }}>
                  {dnaLoading ? "⟳ " : "✓ "}{dnaLoadingLine}
                </div>

                {/* DNA visualization */}
                <div style={{ margin: "0 0 16px", display: "flex", gap: 3, justifyContent: "center", height: 36 }}>
                  {Array.from({ length: 24 }, (_, i) => (
                    <div key={i} style={{
                      width: 4, background: i % 3 === 0 ? ACCENT : i % 3 === 1 ? ACCENT2 : "rgba(0,212,255,0.2)",
                      borderRadius: 2, height: "100%", opacity: dnaInput ? 1 : 0.3,
                      transform: `scaleY(${0.4 + Math.sin(i * 0.5) * 0.6})`,
                      animation: dnaInput ? `dnaWave ${0.5 + i * 0.08}s ease-in-out ${i * 0.04}s infinite alternate` : "none",
                      transition: "opacity 0.3s",
                    }} />
                  ))}
                </div>

                <input className="terminal-input" type="text" placeholder="Genomic source string..."
                  value={dnaInput} onChange={e => setDnaInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleDNA()} disabled={dnaLoading} />

                {dnaHash && (
                  <div style={{ marginTop: 10, padding: "8px 10px", background: "rgba(0,255,157,0.06)", border: `1px solid rgba(0,255,157,0.15)`, borderRadius: 3 }}>
                    <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, color: ACCENT2, wordBreak: "break-all" }}>
                      ✓ {dnaHash}
                    </div>
                  </div>
                )}

                <button className="btn-terminal btn-primary-term" onClick={handleDNA} disabled={!dnaInput || dnaLoading}
                  style={{ width: "100%", marginTop: 14, fontSize: 11, letterSpacing: "0.12em" }}>
                  COMMIT DNA HASH
                </button>
              </div>
            )}

            {stage === "geo" && (
              <div className="bb-panel zoom-in" style={{ padding: 20 }}>
                <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: ACCENT, marginBottom: 4 }}>STEP 02 — GEO-GENOMIC TRUST</div>
                <div style={{ fontSize: 12, color: MUTED, marginBottom: 14, lineHeight: 1.6 }}>
                  Provide geolocation for trust zone classification.
                </div>

                {/* Globe SVG */}
                <div style={{ textAlign: "center", margin: "0 0 16px" }}>
                  <svg viewBox="0 0 100 100" width="80" height="80">
                    <circle cx="50" cy="50" r="38" fill="none" stroke={ACCENT} strokeWidth="0.5" opacity="0.3" />
                    <ellipse cx="50" cy="50" rx="20" ry="38" fill="none" stroke={ACCENT} strokeWidth="0.5" opacity="0.3" />
                    <ellipse cx="50" cy="50" rx="38" ry="15" fill="none" stroke={ACCENT} strokeWidth="0.5" opacity="0.3" />
                    <circle cx="50" cy="50" r="4" fill={ACCENT} opacity="0.8">
                      <animate attributeName="r" values="3;6;3" dur="2s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.8;0.3;0.8" dur="2s" repeatCount="indefinite" />
                    </circle>
                    <circle cx="50" cy="50" r="38" fill="none" stroke={ACCENT} strokeWidth="1.5"
                      strokeDasharray="240" strokeDashoffset="240" style={{ animation: "geoScan 2s ease forwards" }} />
                  </svg>
                </div>

                <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <input className="terminal-input" placeholder="Latitude" value={geoData.lat}
                    onChange={e => setGeoData(g => ({ ...g, lat: e.target.value }))} style={{ flex: 1 }} />
                  <input className="terminal-input" placeholder="Longitude" value={geoData.lon}
                    onChange={e => setGeoData(g => ({ ...g, lon: e.target.value }))} style={{ flex: 1 }} />
                </div>
                <input className="terminal-input" placeholder="Device fingerprint" value={geoData.device}
                  onChange={e => setGeoData(g => ({ ...g, device: e.target.value }))} style={{ marginBottom: 14 }} />

                <button className="btn-terminal" onClick={() => {
                  if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(p => {
                      setGeoData(g => ({ ...g, lat: p.coords.latitude.toFixed(4), lon: p.coords.longitude.toFixed(4) }));
                    });
                  } else {
                    setGeoData(g => ({ ...g, lat: "22.5726", lon: "88.3639" }));
                  }
                }} style={{ width: "100%", marginBottom: 8, fontSize: 10 }}>
                  ⊕ AUTO-DETECT LOCATION
                </button>

                <button className="btn-terminal btn-primary-term" onClick={handleGeo}
                  disabled={!geoData.lat || !geoData.lon}
                  style={{ width: "100%", fontSize: 11, letterSpacing: "0.12em" }}>
                  RUN TRUST EVALUATION
                </button>
              </div>
            )}

            {(stage === "processing" || stage === "done") && (
              <div className="bb-panel zoom-in" style={{ padding: 20 }}>
                <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: ACCENT, marginBottom: 14 }}>
                  {stage === "done" ? "✓ VERIFICATION COMPLETE" : "⟳ PROCESSING..."}
                </div>

                {/* Progress bar */}
                <div style={{ height: 3, background: DIM, borderRadius: 2, marginBottom: 16, overflow: "hidden" }}>
                  <div style={{ height: "100%", background: `linear-gradient(90deg, ${ACCENT}, ${ACCENT2})`, width: `${progress}%`, transition: "width 0.4s ease", borderRadius: 2 }} />
                </div>

                {stage === "done" && trustResult && (
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 48, fontWeight: 700, fontFamily: "'IBM Plex Mono',monospace", color: ACCENT2, lineHeight: 1 }}>
                      {Math.round(trustResult.score * 100)}%
                    </div>
                    <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: MUTED, marginTop: 4 }}>TRUST SCORE</div>
                    <div style={{ marginTop: 12 }}>
                      <span className="tag tag-green">● {trustResult.zone} TRUST ZONE</span>
                    </div>
                    <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: MUTED, marginTop: 10 }}>
                      Redirecting to vault terminal...
                    </div>
                  </div>
                )}

                {stage === "processing" && (
                  <div style={{ display: "flex", justifyContent: "center", padding: "20px 0" }}>
                    <Spinner size={32} />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: log panel */}
          <div className="bb-panel" style={{ padding: 0, display: "flex", flexDirection: "column" }}>
            <div className="bb-panel-header">
              <span className="bb-panel-title">VERIFICATION LOG</span>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div className="live-dot" />
                <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, color: ACCENT2 }}>LIVE</span>
              </div>
            </div>
            <div style={{ flex: 1, padding: "10px 12px", overflowY: "auto", maxHeight: 340 }}>
              {log.length === 0 && (
                <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: DIM, padding: "20px 0" }}>
                  Awaiting input... <TerminalCursor />
                </div>
              )}
              {log.map((l, i) => (
                <div key={i} className="fade-in" style={{ marginBottom: 8, fontFamily: "'IBM Plex Mono',monospace", fontSize: 10 }}>
                  <span style={{ color: MUTED, marginRight: 8 }}>{l.t}</span>
                  <span style={{ color: l.type === "ok" ? ACCENT2 : l.type === "err" ? RED : "rgba(0,212,255,0.7)" }}>
                    {l.type === "ok" ? "✓" : l.type === "err" ? "✗" : "›"} {l.msg}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── STAGE 3: BLOOMBERG DASHBOARD ────────────────────────────────────────────
function Dashboard({ user, verificationData, onLogout }) {
  const [activeSymbol, setActiveSymbol] = useState("BTC");
  const [chartData, setChartData] = useState({});
  const [tickerPrices, setTickerPrices] = useState({ ...SYMBOLS });
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [searching, setSearching] = useState(false);
  const [activeTab, setActiveTab] = useState("chart");
  const [txs] = useState(() => generateMockTxs("0x" + Math.random().toString(16).slice(2, 42)));
  const [time, setTime] = useState(fmtTime());
  const tickerRef = useRef(null);

  // Pre-generate chart data for all symbols
  useEffect(() => {
    const data = {};
    Object.keys(SYMBOLS).forEach(sym => {
      data[sym] = generateCandleData(SYMBOLS[sym].price);
    });
    setChartData(data);
  }, []);

  // Live clock + price updates
  useEffect(() => {
    const id = setInterval(() => {
      setTime(fmtTime());
      setTickerPrices(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(sym => {
          const drift = (Math.random() - 0.499) * 0.002;
          next[sym] = { ...next[sym], price: +(next[sym].price * (1 + drift)).toFixed(2), change: +(next[sym].change + (Math.random() - 0.5) * 0.05).toFixed(2) };
        });
        return next;
      });
    }, 2000);
    return () => clearInterval(id);
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchResult(null);
    const results = await searchMarket(searchQuery);
    if (results.length > 0) {
      setSearchResult(results[0]);
      const sym = results[0].symbol;
      if (!chartData[sym]) {
        setChartData(prev => ({ ...prev, [sym]: generateCandleData(results[0].price) }));
      }
      setActiveSymbol(sym);
      setTickerPrices(prev => ({ ...prev, [sym]: results[0] }));
    }
    setSearching(false);
    setSearchQuery("");
  };

  const active = tickerPrices[activeSymbol] || SYMBOLS[activeSymbol] || {};
  const activeChart = chartData[activeSymbol] || [];
  const isUp = (active.change || 0) >= 0;
  const chartColor = isUp ? ACCENT2 : RED;

  // Portfolio metrics (mock)
  const portfolio = {
    totalValue: 284712.48,
    dayPnL: +1842.33,
    dayPnLPct: 0.65,
    allTimePnL: +48293.12,
    walletCount: txs.filter(t => t.type === "RECEIVE").length,
    txVolume: txs.reduce((sum, t) => sum + parseFloat(t.amount), 0).toFixed(3),
  };

  // Volume chart data
  const volumeData = activeChart.slice(-30).map(d => ({
    date: d.date, volume: d.volume,
    color: d.close >= d.open ? ACCENT2 : RED,
  }));

  // TX type distribution
  const txTypeDist = txs.reduce((acc, t) => { acc[t.type] = (acc[t.type] || 0) + 1; return acc; }, {});
  const txChartData = Object.entries(txTypeDist).map(([type, count]) => ({ type, count }));

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: BG, overflow: "hidden" }}>
      {/* ── TOP BAR ── */}
      <div style={{ background: SURFACE, borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
        {/* Ticker tape */}
        <div style={{ height: 28, borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", overflow: "hidden", background: "rgba(0,0,0,0.3)" }}>
          <div style={{ display: "flex", animation: "ticker 40s linear infinite", whiteSpace: "nowrap" }}>
            {[...Object.keys(tickerPrices), ...Object.keys(tickerPrices)].map((sym, i) => {
              const d = tickerPrices[sym];
              return <MiniTicker key={`${sym}-${i}`} symbol={sym} price={d?.price || 0} change={d?.change || 0} />;
            })}
          </div>
        </div>

        {/* Nav bar */}
        <div style={{ height: 44, display: "flex", alignItems: "center", padding: "0 16px", gap: 16 }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <div style={{ width: 22, height: 22, borderRadius: 3, background: `linear-gradient(135deg, ${ACCENT}, #006899)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg viewBox="0 0 16 16" width="12" height="12"><path d="M4 2 Q8 5 12 8 Q8 11 4 14" fill="none" stroke="#fff" strokeWidth="2" /><path d="M12 2 Q8 5 4 8 Q8 11 12 14" fill="none" stroke="rgba(0,255,157,0.8)" strokeWidth="2" /></svg>
            </div>
            <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", color: ACCENT }}>BCV</span>
          </div>

          {/* Search */}
          <div style={{ display: "flex", gap: 6, flex: 1, maxWidth: 340 }}>
            <input className="terminal-input" placeholder="Search symbol: BTC, ETH, AAPL..." value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSearch()}
              style={{ fontSize: 12, padding: "6px 10px" }} />
            <button className="btn-terminal" onClick={handleSearch} disabled={searching} style={{ padding: "6px 12px", fontSize: 10, flexShrink: 0 }}>
              {searching ? <Spinner size={12} /> : "GO"}
            </button>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 2, flex: 1, justifyContent: "center" }}>
            {[["chart", "MARKETS"], ["portfolio", "PORTFOLIO"], ["transactions", "CHAIN LEDGER"], ["analytics", "ANALYTICS"]].map(([id, label]) => (
              <button key={id} onClick={() => setActiveTab(id)}
                style={{
                  fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, letterSpacing: "0.08em",
                  padding: "5px 12px", border: "none", borderRadius: 2, cursor: "pointer",
                  background: activeTab === id ? ACCENT : "transparent",
                  color: activeTab === id ? BG : MUTED,
                  fontWeight: activeTab === id ? 700 : 400,
                  transition: "all 0.15s",
                }}>
                {label}
              </button>
            ))}
          </div>

          {/* User + time */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
            <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: MUTED }}>{time}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div className="live-dot" />
              <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: ACCENT }}>{user.displayName}</span>
            </div>
            <span className="tag tag-green">VERIFIED</span>
            <button onClick={onLogout} className="btn-terminal" style={{ padding: "4px 12px", fontSize: 9, letterSpacing: "0.1em", borderColor: "rgba(255,59,92,0.4)", color: RED, background: "rgba(255,59,92,0.06)" }}>
              ⏻ LOGOUT
            </button>
          </div>
        </div>
      </div>

      {/* ── MARKETS TAB ── */}
      {activeTab === "chart" && (
        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "200px 1fr 240px", gridTemplateRows: "auto 1fr auto", overflow: "hidden" }}>
          {/* Symbol list */}
          <div style={{ gridRow: "1 / 4", borderRight: `1px solid ${BORDER}`, overflowY: "auto", background: SURFACE }}>
            <div style={{ padding: "6px 10px", borderBottom: `1px solid ${BORDER}`, fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, color: ACCENT, letterSpacing: "0.12em" }}>
              WATCHLIST
            </div>
            {Object.keys(tickerPrices).map(sym => {
              const d = tickerPrices[sym];
              const up = (d?.change || 0) >= 0;
              return (
                <div key={sym} onClick={() => setActiveSymbol(sym)}
                  style={{
                    padding: "9px 12px", cursor: "pointer", borderBottom: `1px solid ${BORDER}`,
                    background: activeSymbol === sym ? "rgba(0,212,255,0.08)" : "transparent",
                    borderLeft: activeSymbol === sym ? `2px solid ${ACCENT}` : "2px solid transparent",
                    transition: "all 0.15s",
                  }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, fontWeight: 600, color: activeSymbol === sym ? ACCENT : TEXT }}>{sym}</span>
                    <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, color: up ? ACCENT2 : RED }}>{pct(d?.change || 0)}</span>
                  </div>
                  <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: MUTED, marginTop: 2 }}>{fmtNum(d?.price || 0)}</div>
                </div>
              );
            })}
          </div>

          {/* Chart header */}
          <div style={{ borderBottom: `1px solid ${BORDER}`, padding: "10px 16px", display: "flex", alignItems: "center", gap: 20, background: SURFACE }}>
            <div>
              <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 22, fontWeight: 700, color: TEXT }}>{activeSymbol}</span>
              <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: MUTED, marginLeft: 10 }}>{(SYMBOLS[activeSymbol] || {}).name || activeSymbol}</span>
            </div>
            <div>
              <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 24, fontWeight: 700, color: isUp ? ACCENT2 : RED }}>
                {fmtNum(active.price || 0)}
              </span>
              <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, color: isUp ? ACCENT2 : RED, marginLeft: 10 }}>
                {isUp ? "▲" : "▼"} {pct(active.change || 0)}
              </span>
            </div>
            <div style={{ marginLeft: "auto", display: "flex", gap: 16 }}>
              {[["VOL", fmtNum((active.volume || 0) / 1e6, 1) + "M"], ["MKT CAP", active.marketCap ? "$" + fmtNum(active.marketCap / 1e9, 1) + "B" : "—"], ["HIGH", fmtNum((activeChart[activeChart.length - 1] || {}).high || 0)], ["LOW", fmtNum((activeChart[activeChart.length - 1] || {}).low || 0)]].map(([l, v]) => (
                <div key={l} style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, color: MUTED }}>{l}</div>
                  <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Main chart */}
          <div style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div style={{ flex: 1, minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activeChart} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={chartColor} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={BORDER} strokeDasharray="none" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, fill: MUTED }} tickLine={false} axisLine={false} interval={14} />
                  <YAxis tick={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, fill: MUTED }} tickLine={false} axisLine={false} tickFormatter={v => "$" + fmtNum(v, 0)} width={70} domain={["auto", "auto"]} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="price" stroke={chartColor} strokeWidth={1.5} fill="url(#colorGrad)" dot={false} name="Price" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            {/* Volume bars */}
            <div style={{ height: 70, borderTop: `1px solid ${BORDER}` }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={volumeData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }} barSize={3}>
                  <XAxis dataKey="date" hide />
                  <YAxis hide />
                  <Bar dataKey="volume" fill={ACCENT} opacity={0.5} radius={[1, 1, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Right panel */}
          <div style={{ gridRow: "2 / 4", borderLeft: `1px solid ${BORDER}`, overflowY: "auto", background: SURFACE, display: "flex", flexDirection: "column", gap: 0 }}>
            {/* Trust zone */}
            <BBPanel title="TRUST ZONE" right={fmtTime()}>
              <div style={{ textAlign: "center", padding: "8px 0" }}>
                <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 36, fontWeight: 700, color: ACCENT2, lineHeight: 1 }}>
                  {Math.round(verificationData.trustResult.score * 100)}%
                </div>
                <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, color: MUTED, marginTop: 2 }}>TRUST SCORE</div>
                <div style={{ marginTop: 8 }}><span className="tag tag-green">● HIGH ZONE</span></div>
                <div style={{ marginTop: 8, fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, color: MUTED }}>
                  GEO: {verificationData.geoData.lat}, {verificationData.geoData.lon}
                </div>
              </div>
            </BBPanel>

            {/* Order book style recent TXs */}
            <BBPanel title="RECENT TRANSACTIONS" noPad>
              <div style={{ padding: "4px 0" }}>
                {txs.slice(0, 8).map((tx, i) => (
                  <div key={i} style={{ padding: "6px 10px", borderBottom: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <span className={`tag ${tx.type === "SEND" ? "tag-red" : tx.type === "RECEIVE" ? "tag-green" : "tag-blue"}`} style={{ fontSize: 8, padding: "1px 5px" }}>{tx.type}</span>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: tx.type === "SEND" ? RED : ACCENT2 }}>
                        {tx.type === "SEND" ? "-" : "+"}{tx.amount} {tx.asset}
                      </div>
                      <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 8, color: MUTED }}>{tx.id.slice(0, 10)}...</div>
                    </div>
                  </div>
                ))}
              </div>
            </BBPanel>

            {/* Market news feed (mock) */}
            <BBPanel title="SIGNAL FEED">
              {["BTC breaks $68K resistance — momentum building", "ETH gas fees drop 40% post-merge optimization", "SOL ecosystem TVL reaches new ATH", "Genomic identity protocols gain institutional adoption", "BioChain Vault processes 1M daily verifications"].map((item, i) => (
                <div key={i} style={{ padding: "6px 0", borderBottom: i < 4 ? `1px solid ${BORDER}` : "none", fontSize: 10, lineHeight: 1.5, color: i === 0 ? TEXT : MUTED }}>
                  <span style={{ color: ACCENT, marginRight: 6, fontFamily: "'IBM Plex Mono',monospace" }}>›</span>{item}
                </div>
              ))}
            </BBPanel>
          </div>

          {/* Bottom status bar */}
          <div style={{ gridColumn: "2 / 3", borderTop: `1px solid ${BORDER}`, padding: "4px 16px", display: "flex", gap: 20, alignItems: "center", background: "rgba(0,0,0,0.4)" }}>
            {[["DNA", "VERIFIED"], ["ZK PROOF", "ACTIVE"], ["ENCLAVE", "ARMED"], ["SESSION", "SECURE"]].map(([l, v]) => (
              <div key={l} style={{ display: "flex", gap: 5, alignItems: "center" }}>
                <div className="live-dot" style={{ width: 4, height: 4 }} />
                <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, color: MUTED }}>{l}:</span>
                <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, color: ACCENT2 }}>{v}</span>
              </div>
            ))}
            <div style={{ marginLeft: "auto", fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, color: MUTED }}>
              BIOCHAIN VAULT TERMINAL v4.7.2 ∷ {fmtDate()}
            </div>
          </div>
        </div>
      )}

      {/* ── PORTFOLIO TAB ── */}
      {activeTab === "portfolio" && (
        <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gridTemplateRows: "auto", gap: 1, background: BG }}>
          {/* Portfolio value card */}
          {[
            { label: "PORTFOLIO VALUE", value: "$" + fmtNum(portfolio.totalValue), sub: "Total NAV", color: TEXT },
            { label: "DAY P&L", value: (portfolio.dayPnL >= 0 ? "+" : "") + "$" + fmtNum(portfolio.dayPnL), sub: pct(portfolio.dayPnLPct), color: portfolio.dayPnL >= 0 ? ACCENT2 : RED },
            { label: "ALL-TIME P&L", value: "+$" + fmtNum(portfolio.allTimePnL), sub: "+20.4%", color: ACCENT2 },
            { label: "CHAIN VOLUME", value: portfolio.txVolume + " ETH", sub: txs.length + " transactions", color: ACCENT },
          ].map(card => (
            <BBPanel key={card.label} title={card.label} style={{ borderRadius: 0 }}>
              <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 26, fontWeight: 700, color: card.color, lineHeight: 1.1 }}>{card.value}</div>
              <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: MUTED, marginTop: 4 }}>{card.sub}</div>
            </BBPanel>
          ))}

          {/* Holdings chart */}
          <div style={{ gridColumn: "1 / 3" }}>
            <BBPanel title="PORTFOLIO PERFORMANCE — 90D" style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={generateCandleData(284712, 90, 0.015)} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="pfGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={ACCENT} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={ACCENT} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={BORDER} vertical={false} />
                  <XAxis dataKey="date" tick={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, fill: MUTED }} tickLine={false} axisLine={false} interval={14} />
                  <YAxis tick={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, fill: MUTED }} tickLine={false} axisLine={false} tickFormatter={v => "$" + (v / 1000).toFixed(0) + "k"} width={55} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="price" stroke={ACCENT} strokeWidth={1.5} fill="url(#pfGrad)" dot={false} name="Value" />
                </AreaChart>
              </ResponsiveContainer>
            </BBPanel>
          </div>

          {/* Allocation */}
          <div style={{ gridColumn: "3 / 5" }}>
            <BBPanel title="ASSET ALLOCATION" style={{ height: 300 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "4px 0" }}>
                {[["BTC", 45.2, ACCENT2], ["ETH", 28.7, ACCENT], ["SOL", 12.4, YELLOW], ["AAPL", 8.1, "#a78bfa"], ["OTHER", 5.6, MUTED]].map(([name, pctVal, color]) => (
                  <div key={name}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11 }}>{name}</span>
                      <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color }}>{pctVal}%</span>
                    </div>
                    <div style={{ height: 3, background: DIM, borderRadius: 2 }}>
                      <div style={{ height: "100%", width: `${pctVal}%`, background: color, borderRadius: 2, transition: "width 1s ease" }} />
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 16 }}>
                <BBPanel title="TX TYPE DISTRIBUTION" style={{ background: "transparent", border: "none" }} noPad>
                  <ResponsiveContainer width="100%" height={90}>
                    <BarChart data={txChartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                      <XAxis dataKey="type" tick={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 8, fill: MUTED }} axisLine={false} tickLine={false} />
                      <YAxis hide />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar dataKey="count" fill={ACCENT} opacity={0.7} radius={[2, 2, 0, 0]} name="Count" />
                    </BarChart>
                  </ResponsiveContainer>
                </BBPanel>
              </div>
            </BBPanel>
          </div>

          {/* Positions table */}
          <div style={{ gridColumn: "1 / 5" }}>
            <BBPanel title="OPEN POSITIONS" noPad>
              <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'IBM Plex Mono',monospace", fontSize: 11 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                    {["SYMBOL", "QTY", "ENTRY", "CURRENT", "P&L", "P&L %", "VALUE", "TRUST"].map(h => (
                      <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 9, color: MUTED, fontWeight: 600, letterSpacing: "0.08em" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[["BTC", "1.842", 62100, 67842.5], ["ETH", "24.3", 3200, 3541.2], ["SOL", "187.5", 142, 178.43], ["NVDA", "32", 820, 875.6], ["AAPL", "95", 195, 213.45]].map(([sym, qty, entry, curr]) => {
                    const pl = (curr - entry) * parseFloat(qty);
                    const plPct = ((curr - entry) / entry) * 100;
                    const val = curr * parseFloat(qty);
                    const up = pl >= 0;
                    return (
                      <tr key={sym} style={{ borderBottom: `1px solid ${BORDER}`, cursor: "pointer", transition: "background 0.15s" }}
                        onMouseEnter={e => e.currentTarget.style.background = "rgba(0,212,255,0.04)"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                        onClick={() => { setActiveSymbol(sym); setActiveTab("chart"); }}>
                        <td style={{ padding: "9px 12px", color: ACCENT, fontWeight: 600 }}>{sym}</td>
                        <td style={{ padding: "9px 12px" }}>{qty}</td>
                        <td style={{ padding: "9px 12px", color: MUTED }}>{fmtNum(entry)}</td>
                        <td style={{ padding: "9px 12px" }}>{fmtNum(curr)}</td>
                        <td style={{ padding: "9px 12px", color: up ? ACCENT2 : RED }}>{up ? "+" : ""}{fmtNum(pl)}</td>
                        <td style={{ padding: "9px 12px", color: up ? ACCENT2 : RED }}>{pct(plPct)}</td>
                        <td style={{ padding: "9px 12px" }}>${fmtNum(val)}</td>
                        <td style={{ padding: "9px 12px" }}><span className="tag tag-green" style={{ fontSize: 8 }}>HIGH</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </BBPanel>
          </div>
        </div>
      )}

      {/* ── CHAIN LEDGER TAB ── */}
      {activeTab === "transactions" && (
        <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
          <BBPanel title={`BLOCKCHAIN LEDGER — ${txs.length} TRANSACTIONS`} right={fmtDate()} noPad>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'IBM Plex Mono',monospace", fontSize: 11 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER_BRIGHT}` }}>
                  {["TX HASH", "TYPE", "STATUS", "FROM", "TO", "AMOUNT", "ASSET", "GAS", "BLOCK", "TRUST", "TIME"].map(h => (
                    <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontSize: 9, color: ACCENT, fontWeight: 600, letterSpacing: "0.1em", whiteSpace: "nowrap", background: "rgba(0,212,255,0.04)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {txs.map((tx, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${BORDER}`, transition: "background 0.1s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(0,212,255,0.04)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <td style={{ padding: "7px 10px", color: ACCENT }}>{tx.id.slice(0, 12)}…</td>
                    <td style={{ padding: "7px 10px" }}>
                      <span className={`tag ${tx.type === "SEND" ? "tag-red" : tx.type === "RECEIVE" ? "tag-green" : tx.type === "STEALTH" ? "tag-blue" : "tag-yellow"}`} style={{ fontSize: 8 }}>{tx.type}</span>
                    </td>
                    <td style={{ padding: "7px 10px" }}>
                      <span className={`tag ${tx.status === "CONFIRMED" ? "tag-green" : "tag-yellow"}`} style={{ fontSize: 8 }}>{tx.status}</span>
                    </td>
                    <td style={{ padding: "7px 10px", color: MUTED }}>{tx.from}</td>
                    <td style={{ padding: "7px 10px", color: MUTED }}>{tx.to}</td>
                    <td style={{ padding: "7px 10px", color: tx.type === "SEND" ? RED : ACCENT2, fontWeight: 500 }}>
                      {tx.type === "SEND" ? "-" : "+"}{tx.amount}
                    </td>
                    <td style={{ padding: "7px 10px", color: ACCENT }}>{tx.asset}</td>
                    <td style={{ padding: "7px 10px", color: MUTED }}>{tx.gas}</td>
                    <td style={{ padding: "7px 10px", color: MUTED }}>{tx.block.toLocaleString()}</td>
                    <td style={{ padding: "7px 10px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <div style={{ width: 32, height: 3, background: DIM, borderRadius: 2, overflow: "hidden" }}>
                          <div style={{ width: `${tx.trustScore * 100}%`, height: "100%", background: parseFloat(tx.trustScore) > 0.8 ? ACCENT2 : YELLOW, borderRadius: 2 }} />
                        </div>
                        <span style={{ fontSize: 9, color: MUTED }}>{tx.trustScore}</span>
                      </div>
                    </td>
                    <td style={{ padding: "7px 10px", color: MUTED, fontSize: 9, whiteSpace: "nowrap" }}>{tx.time.split(",")[0]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </BBPanel>
        </div>
      )}

      {/* ── ANALYTICS TAB ── */}
      {activeTab === "analytics" && (
        <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 1 }}>
          {/* Multi-asset comparison */}
          <div style={{ gridColumn: "1 / 3" }}>
            <BBPanel title="MULTI-ASSET PERFORMANCE — NORMALIZED 90D" style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={BORDER} vertical={false} />
                  <XAxis dataKey="date" data={chartData["BTC"] || []} tick={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, fill: MUTED }} tickLine={false} axisLine={false} interval={14} />
                  <YAxis tick={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, fill: MUTED }} tickLine={false} axisLine={false} width={45} />
                  <Tooltip content={<ChartTooltip />} />
                  {[["BTC", ACCENT2], ["ETH", ACCENT], ["SOL", YELLOW]].map(([sym, color]) => (
                    <Line key={sym} data={chartData[sym] || []} type="monotone" dataKey="price" stroke={color} strokeWidth={1.2} dot={false} name={sym} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </BBPanel>
          </div>

          {/* Heatmap */}
          <BBPanel title="MARKET HEATMAP" style={{ height: 280 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 3, padding: "4px 0" }}>
              {Object.entries(tickerPrices).map(([sym, d]) => {
                const up = (d.change || 0) >= 0;
                const intensity = Math.min(Math.abs(d.change || 0) / 5, 1);
                return (
                  <div key={sym} onClick={() => { setActiveSymbol(sym); setActiveTab("chart"); }}
                    style={{
                      padding: "8px 4px", borderRadius: 3, textAlign: "center", cursor: "pointer",
                      background: up ? `rgba(0,255,157,${0.06 + intensity * 0.2})` : `rgba(255,59,92,${0.06 + intensity * 0.2})`,
                      border: `1px solid ${up ? "rgba(0,255,157,0.15)" : "rgba(255,59,92,0.15)"}`,
                      transition: "all 0.2s",
                    }}>
                    <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, fontWeight: 700, color: up ? ACCENT2 : RED }}>{sym}</div>
                    <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 8, color: up ? ACCENT2 : RED, marginTop: 2 }}>{pct(d.change || 0)}</div>
                  </div>
                );
              })}
            </div>
          </BBPanel>

          {/* Volume analysis */}
          <BBPanel title="VOLUME ANALYSIS — BTC 30D" style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height={190}>
              <BarChart data={volumeData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={BORDER} vertical={false} />
                <XAxis dataKey="date" tick={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 8, fill: MUTED }} tickLine={false} axisLine={false} interval={6} />
                <YAxis tick={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 8, fill: MUTED }} tickLine={false} axisLine={false} tickFormatter={v => (v / 1e6).toFixed(0) + "M"} width={35} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="volume" fill={ACCENT} opacity={0.6} radius={[2, 2, 0, 0]} name="Volume" />
              </BarChart>
            </ResponsiveContainer>
          </BBPanel>

          {/* Chain analytics */}
          <BBPanel title="CHAIN ANALYTICS" style={{ height: 240 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[["Avg Trust Score", (txs.reduce((s, t) => s + parseFloat(t.trustScore), 0) / txs.length).toFixed(3), ACCENT2],
                ["Stealth TX Ratio", ((txs.filter(t => t.type === "STEALTH").length / txs.length) * 100).toFixed(1) + "%", ACCENT],
                ["Confirmed Rate", ((txs.filter(t => t.status === "CONFIRMED").length / txs.length) * 100).toFixed(1) + "%", ACCENT2],
                ["Avg Gas (ETH)", (txs.reduce((s, t) => s + parseFloat(t.gas), 0) / txs.length).toFixed(5), MUTED],
                ["Unique Assets", [...new Set(txs.map(t => t.asset))].length, YELLOW],
              ].map(([label, value, color]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: `1px solid ${BORDER}` }}>
                  <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: MUTED }}>{label}</span>
                  <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, color, fontWeight: 600 }}>{value}</span>
                </div>
              ))}
            </div>
          </BBPanel>

          {/* DNA verification status */}
          <div style={{ gridColumn: "2 / 4" }}>
            <BBPanel title="BIOMETRIC VERIFICATION STATUS">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                {[
                  { label: "DNA COMMITMENT", value: verificationData.dnaHash.slice(0, 16) + "…", status: "VALID", color: ACCENT2 },
                  { label: "GEO TRUST ZONE", value: `${verificationData.geoData.lat}, ${verificationData.geoData.lon}`, status: "HIGH", color: ACCENT2 },
                  { label: "DEVICE FP", value: verificationData.geoData.device, status: "KNOWN", color: ACCENT },
                  { label: "ZK PROOF", value: "nullifier_" + verificationData.dnaHash.slice(0, 8), status: "ACTIVE", color: ACCENT2 },
                  { label: "SESSION TOKEN", value: "tok_" + Math.random().toString(36).slice(2, 12), status: "LIVE", color: ACCENT },
                  { label: "ENCLAVE STATUS", value: "TEE_SECURE", status: "ARMED", color: ACCENT2 },
                ].map(item => (
                  <div key={item.label} style={{ padding: "10px 12px", background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, borderRadius: 3 }}>
                    <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 8, color: MUTED, letterSpacing: "0.1em" }}>{item.label}</div>
                    <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: TEXT, marginTop: 4, wordBreak: "break-all" }}>{item.value}</div>
                    <div style={{ marginTop: 6 }}><span className="tag tag-green" style={{ fontSize: 7 }}>● {item.status}</span></div>
                  </div>
                ))}
              </div>
            </BBPanel>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [stage, setStage] = useState("login"); // login | dna | dashboard
  const [user, setUser] = useState(null);
  const [verificationData, setVerificationData] = useState(null);

  useEffect(() => { ensureCSS(); }, []);

  return (
    <>
      {stage === "login" && (
        <LoginScreen onLogin={u => { setUser(u); setStage("dna"); }} />
      )}
      {stage === "dna" && user && (
        <DNAVerificationScreen user={user} onVerified={vd => { setVerificationData(vd); setStage("dashboard"); }} />
      )}
      {stage === "dashboard" && user && verificationData && (
        <Dashboard user={user} verificationData={verificationData} onLogout={() => { setUser(null); setVerificationData(null); setStage("login"); }} />
      )}
    </>
  );
}
