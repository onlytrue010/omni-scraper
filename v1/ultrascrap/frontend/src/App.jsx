import React, { useState, useRef, useCallback, useEffect } from 'react'
import {
  Zap, Globe, Activity, X, Download, CheckCircle2,
  Clock, Loader2, Eye, BarChart3, Layers, ArrowLeft,
  RefreshCw, Terminal, Cpu, Wifi, Database, ChevronRight,
  TrendingUp, AlertTriangle, Radio
} from 'lucide-react'

const API = ''
const WS_BASE = window.location.protocol === 'https:'
  ? `wss://${window.location.host}`
  : `ws://${window.location.host}`

const DATA_TYPES = [
  { value:'auto',   label:'AUTO DETECT' },
  { value:'text',   label:'TEXT CONTENT' },
  { value:'table',  label:'TABLES / DATA' },
  { value:'links',  label:'LINK GRAPH' },
  { value:'images', label:'MEDIA / IMAGES' },
]

// ── Inject global CSS ────────────────────────────────────────
function injectCSS() {
  if (document.getElementById('us')) return
  const s = document.createElement('style'); s.id='us'
  s.textContent = `
    :root {
      --bg:       #060608;
      --bg2:      #0b0c0f;
      --bg3:      #0f1014;
      --panel:    rgba(12,13,17,0.92);
      --border:   rgba(255,120,40,0.18);
      --border2:  rgba(255,120,40,0.35);
      --orange:   #ff7828;
      --orange2:  #ffaa55;
      --orange3:  #ff5500;
      --cyan:     #00e5cc;
      --cyan2:    #00b8a2;
      --red:      #ff3a4a;
      --green:    #39e87a;
      --yellow:   #ffd060;
      --text:     #e8e2d8;
      --text2:    #8a8070;
      --text3:    #5a5248;
      --mono:     'JetBrains Mono', monospace;
      --display:  'Orbitron', monospace;
      --body:     'Rajdhani', sans-serif;
    }

    /* ── Animations ── */
    @keyframes spin       { to { transform: rotate(360deg) } }
    @keyframes blink      { 0%,100%{opacity:1} 49%{opacity:1} 50%,99%{opacity:0} }
    @keyframes fadeUp     { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:none} }
    @keyframes fadeIn     { from{opacity:0} to{opacity:1} }
    @keyframes scanline   { 0%{transform:translateY(-100%)} 100%{transform:translateY(100vh)} }
    @keyframes glow-pulse {
      0%,100% { box-shadow: 0 0 8px rgba(255,120,40,0.3), inset 0 0 8px rgba(255,120,40,0.05) }
      50%      { box-shadow: 0 0 24px rgba(255,120,40,0.6), inset 0 0 16px rgba(255,120,40,0.1) }
    }
    @keyframes text-glow {
      0%,100% { text-shadow: 0 0 8px rgba(255,120,40,0.5) }
      50%      { text-shadow: 0 0 20px rgba(255,120,40,0.9), 0 0 40px rgba(255,120,40,0.3) }
    }
    @keyframes mesh-move  { 0%{transform:translate(0,0)} 100%{transform:translate(40px,40px)} }
    @keyframes data-rain  {
      0%   { transform: translateY(-20px); opacity:0 }
      10%  { opacity:1 }
      90%  { opacity:0.6 }
      100% { transform: translateY(100px); opacity:0 }
    }
    @keyframes progress-fill { from{width:0} }
    @keyframes slide-r { from{opacity:0;transform:translateX(-20px)} to{opacity:1;transform:none} }
    @keyframes type-in {
      from { width:0 }
      to   { width:100% }
    }
    @keyframes border-chase {
      0%   { background-position: 0% 0%, 100% 0%, 100% 100%, 0% 100% }
      100% { background-position: 100% 0%, 100% 100%, 0% 100%, 0% 0% }
    }
    @keyframes flicker {
      0%,100%{opacity:1} 92%{opacity:1} 93%{opacity:0.4} 94%{opacity:1} 97%{opacity:0.8} 98%{opacity:1}
    }
    @keyframes radar-spin {
      from { transform: rotate(0deg) }
      to   { transform: rotate(360deg) }
    }
    @keyframes ping {
      0%   { transform:scale(1); opacity:0.8 }
      100% { transform:scale(2.5); opacity:0 }
    }

    .spin      { animation: spin 1s linear infinite }
    .blink     { animation: blink 1s step-end infinite }
    .fadeUp    { animation: fadeUp 0.4s ease both }
    .fadeIn    { animation: fadeIn 0.3s ease both }
    .glow-box  { animation: glow-pulse 2.5s ease-in-out infinite }
    .text-glow { animation: text-glow 2s ease-in-out infinite }
    .flicker   { animation: flicker 6s infinite }

    /* ── Layout ── */
    .panel {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 4px;
      backdrop-filter: blur(20px);
      position: relative;
      overflow: hidden;
    }
    .panel::before {
      content: '';
      position: absolute; top:0; left:0; right:0; height:1px;
      background: linear-gradient(90deg, transparent, var(--orange), transparent);
      opacity: 0.6;
    }

    /* ── Scanline overlay ── */
    .scanlines::after {
      content: '';
      position: absolute; inset: 0;
      background: repeating-linear-gradient(
        0deg,
        transparent,
        transparent 2px,
        rgba(0,0,0,0.03) 2px,
        rgba(0,0,0,0.03) 4px
      );
      pointer-events: none;
      z-index: 1;
    }

    /* ── Buttons ── */
    .btn {
      display: inline-flex; align-items: center; gap: 8px;
      font-family: var(--display); font-size: 11px; font-weight: 600;
      letter-spacing: 1.5px; text-transform: uppercase;
      cursor: pointer; border-radius: 3px;
      padding: 10px 20px; border: 1px solid;
      transition: all 0.15s; position: relative; overflow: hidden;
    }
    .btn::after {
      content: '';
      position: absolute; inset: 0;
      background: linear-gradient(135deg, rgba(255,255,255,0.05) 0%, transparent 50%);
      opacity: 0; transition: opacity 0.2s;
    }
    .btn:hover::after { opacity: 1 }

    .btn-primary {
      background: linear-gradient(135deg, rgba(255,120,40,0.2), rgba(255,85,0,0.1));
      border-color: var(--orange);
      color: var(--orange2);
      box-shadow: 0 0 16px rgba(255,120,40,0.2), inset 0 0 16px rgba(255,120,40,0.05);
    }
    .btn-primary:hover {
      background: linear-gradient(135deg, rgba(255,120,40,0.35), rgba(255,85,0,0.2));
      box-shadow: 0 0 28px rgba(255,120,40,0.45), inset 0 0 20px rgba(255,120,40,0.1);
      transform: translateY(-1px);
    }
    .btn-primary:disabled {
      opacity: 0.35; cursor: not-allowed; transform: none;
      box-shadow: none;
    }
    .btn-ghost {
      background: transparent;
      border-color: var(--border2);
      color: var(--text2);
    }
    .btn-ghost:hover {
      border-color: var(--orange);
      color: var(--orange2);
      background: rgba(255,120,40,0.06);
    }
    .btn-danger {
      background: transparent;
      border-color: rgba(255,58,74,0.4);
      color: var(--red);
    }
    .btn-danger:hover { background: rgba(255,58,74,0.08) }

    /* ── Inputs ── */
    .input {
      background: rgba(6,6,8,0.95);
      border: 1px solid var(--border2);
      color: var(--text);
      font-family: var(--mono);
      font-size: 13px;
      border-radius: 3px;
      padding: 12px 16px;
      width: 100%;
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
      caret-color: var(--orange);
    }
    .input::placeholder { color: var(--text3); font-size: 12px }
    .input:focus {
      border-color: var(--orange);
      box-shadow: 0 0 0 2px rgba(255,120,40,0.12), 0 0 16px rgba(255,120,40,0.1);
    }
    select.input {
      appearance: none; cursor: pointer;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%23ff7828' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 12px center;
      padding-right: 34px;
    }

    /* ── Tags ── */
    .tag {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 2px 8px; border-radius: 2px;
      font-family: var(--mono); font-size: 9px;
      font-weight: 700; letter-spacing: 1px; text-transform: uppercase;
    }
    .tag-orange { background: rgba(255,120,40,0.1);  color:var(--orange2); border:1px solid rgba(255,120,40,0.25) }
    .tag-green  { background: rgba(57,232,122,0.08); color:var(--green);   border:1px solid rgba(57,232,122,0.2) }
    .tag-red    { background: rgba(255,58,74,0.08);  color:var(--red);     border:1px solid rgba(255,58,74,0.2) }
    .tag-yellow { background: rgba(255,208,96,0.08); color:var(--yellow);  border:1px solid rgba(255,208,96,0.2) }
    .tag-cyan   { background: rgba(0,229,204,0.08);  color:var(--cyan);    border:1px solid rgba(0,229,204,0.2) }

    /* ── Scrollbar ── */
    .sb::-webkit-scrollbar { width: 3px }
    .sb::-webkit-scrollbar-track { background: transparent }
    .sb::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 2px }

    /* ── Section label ── */
    .sec-label {
      font-family: var(--mono); font-size: 9px; font-weight: 700;
      letter-spacing: 2px; text-transform: uppercase; color: var(--text3);
      display: flex; align-items: center; gap: 8px;
    }
    .sec-label::after {
      content: ''; flex: 1; height: 1px;
      background: linear-gradient(90deg, var(--border), transparent);
    }

    /* ── Mesh background ── */
    .mesh {
      background-image:
        linear-gradient(rgba(255,120,40,0.04) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,120,40,0.04) 1px, transparent 1px),
        radial-gradient(ellipse at 20% 50%, rgba(255,120,40,0.04) 0%, transparent 60%),
        radial-gradient(ellipse at 80% 20%, rgba(0,229,204,0.03) 0%, transparent 50%);
      background-size: 32px 32px, 32px 32px, 100% 100%, 100% 100%;
    }

    /* ── Corner decorations ── */
    .corner-tl::before, .corner-tl::after,
    .corner-br::before, .corner-br::after {
      content: ''; position: absolute; width: 12px; height: 12px;
    }
    .corner-tl::before { top:0; left:0; border-top:2px solid var(--orange); border-left:2px solid var(--orange) }
    .corner-tl::after  { bottom:0; right:0; border-bottom:2px solid var(--orange); border-right:2px solid var(--orange) }

    /* ── Mobile ── */
    @media (max-width: 768px) {
      .hide-mobile { display: none !important }
      .stack-mobile { flex-direction: column !important }
      .full-mobile  { width: 100% !important }
    }
  `
  document.head.appendChild(s)
}

// ── Animated mesh background ─────────────────────────────────
function MeshBackground() {
  return (
    <div style={{
      position:'fixed', inset:0, zIndex:0, pointerEvents:'none',
      overflow:'hidden',
    }}>
      {/* Base mesh */}
      <div className="mesh" style={{position:'absolute',inset:0}}/>
      {/* Radial glow top-left */}
      <div style={{
        position:'absolute', top:'-20%', left:'-10%',
        width:'60vw', height:'60vw',
        background:'radial-gradient(circle, rgba(255,120,40,0.06) 0%, transparent 70%)',
        filter:'blur(40px)',
      }}/>
      {/* Radial glow bottom-right */}
      <div style={{
        position:'absolute', bottom:'-20%', right:'-10%',
        width:'50vw', height:'50vw',
        background:'radial-gradient(circle, rgba(0,229,204,0.04) 0%, transparent 70%)',
        filter:'blur(60px)',
      }}/>
      {/* Scanline sweep */}
      <div style={{
        position:'absolute', left:0, right:0, height:'2px',
        background:'linear-gradient(90deg, transparent, rgba(255,120,40,0.15), transparent)',
        animation:'scanline 8s linear infinite',
        pointerEvents:'none',
      }}/>
      {/* Noise grain */}
      <div style={{
        position:'absolute', inset:0,
        backgroundImage:`url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`,
        opacity:0.5,
      }}/>
    </div>
  )
}

// ── Radar animation ───────────────────────────────────────────
function RadarWidget() {
  return (
    <div style={{position:'relative', width:100, height:100}}>
      {[40,30,20,10].map(r => (
        <div key={r} style={{
          position:'absolute',
          top:`${50-r}%`, left:`${50-r}%`,
          width:`${r*2}%`, height:`${r*2}%`,
          borderRadius:'50%',
          border:`1px solid rgba(255,120,40,${r===40?0.1:r===30?0.15:r===20?0.2:0.3})`,
        }}/>
      ))}
      {/* Sweep arm */}
      <div style={{
        position:'absolute', top:'50%', left:'50%',
        width:'50%', height:'1px',
        transformOrigin:'left center',
        background:'linear-gradient(90deg, rgba(255,120,40,0.8), transparent)',
        animation:'radar-spin 3s linear infinite',
        boxShadow:'0 0 8px rgba(255,120,40,0.5)',
      }}/>
      {/* Center dot */}
      <div style={{
        position:'absolute', top:'50%', left:'50%',
        transform:'translate(-50%,-50%)',
        width:6, height:6, borderRadius:'50%',
        background:'var(--orange)',
        boxShadow:'0 0 8px var(--orange)',
      }}/>
      {/* Ping */}
      <div style={{
        position:'absolute', top:'50%', left:'50%',
        transform:'translate(-50%,-50%)',
        width:6, height:6, borderRadius:'50%',
        background:'transparent',
        border:'1px solid var(--orange)',
        animation:'ping 2s ease-out infinite',
      }}/>
    </div>
  )
}

// ── Status badge ──────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    queued:    { cls:'tag-yellow', label:'QUEUED' },
    running:   { cls:'tag-orange', label:'RUNNING' },
    done:      { cls:'tag-green',  label:'COMPLETE' },
    cancelled: { cls:'tag-red',    label:'CANCELLED' },
    error:     { cls:'tag-red',    label:'ERROR' },
  }
  const c = map[status] || map.queued
  return <span className={`tag ${c.cls}`}>{c.label}</span>
}

// ── Progress ring ─────────────────────────────────────────────
function ProgressRing({ pct=0, size=56, stroke=4 }) {
  const r = (size-stroke)/2
  const c = 2*Math.PI*r
  const off = c-(pct/100)*c
  return (
    <svg width={size} height={size} style={{transform:'rotate(-90deg)'}}>
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke="rgba(255,120,40,0.1)" strokeWidth={stroke}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke="url(#ring-grad)" strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={off}
        style={{transition:'stroke-dashoffset 0.6s ease'}}/>
      <defs>
        <linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ff7828"/>
          <stop offset="100%" stopColor="#00e5cc"/>
        </linearGradient>
      </defs>
    </svg>
  )
}

// ── Terminal log ──────────────────────────────────────────────
function TerminalLog({ events }) {
  const ref = useRef(null)
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight
  }, [events])

  return (
    <div style={{
      background:'rgba(3,3,5,0.95)',
      border:'1px solid var(--border)',
      borderRadius:3, padding:'12px 14px',
      fontFamily:'var(--mono)', fontSize:11,
      lineHeight:1.8,
    }}>
      {/* Terminal header */}
      <div style={{
        display:'flex', alignItems:'center', gap:6,
        marginBottom:10, paddingBottom:8,
        borderBottom:'1px solid var(--border)',
      }}>
        {['#ff3a4a','#ffd060','#39e87a'].map(c=>(
          <div key={c} style={{width:8,height:8,borderRadius:'50%',background:c,opacity:0.7}}/>
        ))}
        <span style={{fontSize:9,color:'var(--text3)',marginLeft:4,fontFamily:'var(--mono)',letterSpacing:1}}>
          ULTRASCRAP — LIVE FEED
        </span>
        <span className="blink" style={{marginLeft:'auto',color:'var(--orange)',fontSize:10}}>█</span>
      </div>
      <div ref={ref} className="sb" style={{height:180,overflowY:'auto'}}>
        {events.length===0 && (
          <span style={{color:'var(--text3)'}}>{'>'} Awaiting target acquisition…<span className="blink">_</span></span>
        )}
        {events.map((e,i) => (
          <div key={i} style={{
            display:'flex', gap:10,
            color: e.type==='success' ? 'var(--green)'
                 : e.type==='error'   ? 'var(--red)'
                 : e.type==='warn'    ? 'var(--yellow)'
                 : 'var(--text2)',
            animation: i===events.length-1 ? 'fadeUp 0.2s ease' : 'none',
          }}>
            <span style={{color:'var(--text3)',minWidth:56,flexShrink:0}}>{e.time}</span>
            <span style={{color: e.type==='success'?'var(--green)': e.type==='error'?'var(--red)': e.type==='warn'?'var(--yellow)':'var(--orange)',flexShrink:0}}>
              {e.type==='success'?'[OK]': e.type==='error'?'[ERR]': e.type==='warn'?'[WARN]':'[SYS]'}
            </span>
            <span style={{wordBreak:'break-all'}}>{e.msg}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Data preview ──────────────────────────────────────────────
function DataPreview({ results }) {
  const [sel, setSel] = useState(0)

  if (!results || results.length===0) return (
    <div style={{
      textAlign:'center', padding:'40px 20px',
      color:'var(--text3)', fontFamily:'var(--mono)', fontSize:12,
    }}>
      <Database size={28} style={{display:'block',margin:'0 auto 12px',opacity:0.2,color:'var(--orange)'}}/>
      <div>AWAITING DATA STREAM</div>
      <div style={{fontSize:10,marginTop:4,opacity:0.6}}>Results appear as pages are extracted</div>
    </div>
  )

  const item  = results[Math.min(sel, results.length-1)]
  const meta  = item?.data || {}
  const inner = meta?.data || {}
  const title  = meta?.title || ''
  const texts  = inner?.text || []
  const tables = inner?.tables || []
  const prices = inner?.prices || []
  const attrs  = inner?.attributes || {}
  const links  = meta?.links || []

  return (
    <div className="fadeIn">
      {/* Page selector */}
      <div style={{display:'flex',gap:4,marginBottom:14,flexWrap:'wrap'}}>
        {results.slice(0,5).map((r,i) => {
          let host = ''
          try { host = new URL(r?.url||'http://x').hostname.replace('www.','').substring(0,18) } catch{}
          return (
            <button key={i} onClick={()=>setSel(i)}
              style={{
                padding:'4px 10px',
                background: sel===i ? 'rgba(255,120,40,0.2)' : 'rgba(255,120,40,0.05)',
                border: `1px solid ${sel===i ? 'var(--orange)' : 'var(--border)'}`,
                color: sel===i ? 'var(--orange2)' : 'var(--text3)',
                borderRadius:2, cursor:'pointer',
                fontFamily:'var(--mono)', fontSize:9,
                fontWeight:700, letterSpacing:1,
                transition:'all 0.15s',
              }}>
              {i+1}:{host}
            </button>
          )
        })}
      </div>

      {/* URL strip */}
      <div style={{
        fontFamily:'var(--mono)', fontSize:10, color:'var(--text3)',
        marginBottom:12, wordBreak:'break-all',
        padding:'6px 10px', background:'rgba(255,120,40,0.04)',
        borderLeft:'2px solid var(--orange)', borderRadius:'0 2px 2px 0',
      }}>
        <span style={{color:'var(--orange)'}}>GET </span>{item?.url}
      </div>

      {/* Title */}
      {title && (
        <div style={{
          fontSize:15, fontWeight:700, color:'var(--text)',
          marginBottom:12, lineHeight:1.35,
          fontFamily:'var(--body)',
        }}>{title}</div>
      )}

      {/* Text blocks */}
      {texts.slice(0,4).map((block,i) => (
        <div key={i} style={{
          padding:'6px 10px', marginBottom:4,
          background:'rgba(255,255,255,0.02)',
          borderLeft:`2px solid ${block.tag.startsWith('h')?'var(--orange)':'rgba(255,120,40,0.2)'}`,
          borderRadius:'0 2px 2px 0', fontSize:12,
          color: block.tag.startsWith('h') ? 'var(--text)' : 'var(--text2)',
          fontWeight: block.tag.startsWith('h') ? 600 : 400,
          lineHeight:1.55,
        }}>
          <span style={{
            fontFamily:'var(--mono)',fontSize:8,
            color:'var(--orange3)',marginRight:8,opacity:0.8,
          }}>{block.tag.toUpperCase()}</span>
          {block.text.substring(0,160)}{block.text.length>160?'…':''}
        </div>
      ))}

      {/* Table preview */}
      {tables[0] && (
        <div style={{overflowX:'auto',marginTop:10}}>
          <table style={{
            borderCollapse:'collapse',width:'100%',
            fontSize:10,fontFamily:'var(--mono)',
          }}>
            <tbody>
              {tables[0].slice(0,4).map((row,ri) => (
                <tr key={ri}>
                  {row.slice(0,5).map((cell,ci) => (
                    <td key={ci} style={{
                      padding:'4px 8px',
                      border:'1px solid var(--border)',
                      background:ri===0?'rgba(255,120,40,0.08)':'transparent',
                      color:ri===0?'var(--orange2)':'var(--text2)',
                      maxWidth:120, overflow:'hidden',
                      textOverflow:'ellipsis', whiteSpace:'nowrap',
                    }}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* KV attrs */}
      {Object.keys(attrs).length>0 && (
        <div style={{
          display:'grid',gridTemplateColumns:'1fr 1fr',gap:4,marginTop:10,
        }}>
          {Object.entries(attrs).slice(0,4).map(([k,v]) => (
            <div key={k} style={{
              padding:'5px 8px',
              background:'rgba(0,229,204,0.04)',
              border:'1px solid rgba(0,229,204,0.12)',
              borderRadius:2, fontSize:10, fontFamily:'var(--mono)',
            }}>
              <div style={{color:'var(--cyan)',marginBottom:2}}>{k}</div>
              <div style={{color:'var(--text2)'}}>{String(v).substring(0,55)}</div>
            </div>
          ))}
        </div>
      )}

      {/* Stats row */}
      <div style={{display:'flex',gap:6,flexWrap:'wrap',marginTop:12}}>
        {texts.length>0  && <span className="tag tag-orange">{texts.length} BLOCKS</span>}
        {tables.length>0 && <span className="tag tag-cyan">{tables.length} TABLES</span>}
        {links.length>0  && <span className="tag tag-orange">{links.length} LINKS</span>}
        {prices.length>0 && <span className="tag tag-green">{prices.length} PRICES</span>}
        {Object.keys(attrs).length>0 && <span className="tag tag-cyan">{Object.keys(attrs).length} KV</span>}
      </div>
    </div>
  )
}

// ── AIMD Rate gauge ───────────────────────────────────────────
function RateGauge({ rateStatus }) {
  if (!rateStatus || Object.keys(rateStatus).length===0) return (
    <div style={{
      fontFamily:'var(--mono)',fontSize:11,
      color:'var(--text3)',textAlign:'center',padding:'14px 0',
    }}>
      ENGINE IDLE — AWAITING TARGET
    </div>
  )
  return (
    <div style={{display:'flex',flexDirection:'column',gap:12}}>
      {Object.entries(rateStatus).map(([domain,s]) => (
        <div key={domain}>
          <div style={{
            display:'flex',justifyContent:'space-between',
            alignItems:'center',marginBottom:8,
          }}>
            <span style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--orange2)'}}>{domain}</span>
            <span className={`tag ${s.error_rate>5?'tag-red':s.error_rate>2?'tag-yellow':'tag-green'}`}>
              {s.error_rate}% ERR
            </span>
          </div>
          <div style={{
            display:'grid',gridTemplateColumns:'repeat(3,1fr)',
            gap:8, marginBottom:8,
          }}>
            {[
              {label:'CONCUR',  val:s.concurrency},
              {label:'DELAY',   val:`${s.delay_range?.[0]}–${s.delay_range?.[1]}s`},
              {label:'SAMPLES', val:s.samples},
            ].map(({label,val}) => (
              <div key={label} style={{
                padding:'6px 8px',
                background:'rgba(255,120,40,0.04)',
                border:'1px solid var(--border)',
                borderRadius:2,
                textAlign:'center',
              }}>
                <div style={{fontFamily:'var(--mono)',fontSize:8,color:'var(--text3)',marginBottom:3}}>{label}</div>
                <div style={{fontFamily:'var(--mono)',fontSize:14,fontWeight:700,color:'var(--orange2)'}}>{val}</div>
              </div>
            ))}
          </div>
          {/* AIMD bar */}
          <div style={{height:2,background:'rgba(255,120,40,0.1)',borderRadius:1}}>
            <div style={{
              height:'100%',
              width:`${Math.min(100,(s.concurrency/20)*100)}%`,
              background:`linear-gradient(90deg, var(--orange3), var(--orange))`,
              borderRadius:1,
              transition:'width 0.6s ease',
              boxShadow:'0 0 8px rgba(255,120,40,0.5)',
            }}/>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Pipeline steps ────────────────────────────────────────────
function PipelineSteps({ steps }) {
  return (
    <div style={{display:'flex',flexDirection:'column',gap:0}}>
      {steps.map(({label,done,active},i) => (
        <div key={label} style={{
          display:'flex',alignItems:'center',gap:10,
          padding:'8px 0',
          borderBottom: i<steps.length-1 ? '1px solid rgba(255,120,40,0.08)' : 'none',
        }}>
          {/* Icon */}
          <div style={{
            width:20,height:20,borderRadius:2,flexShrink:0,
            display:'flex',alignItems:'center',justifyContent:'center',
            background: done ? 'rgba(57,232,122,0.1)' : active ? 'rgba(255,120,40,0.15)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${done?'var(--green)':active?'var(--orange)':'rgba(255,255,255,0.06)'}`,
            transition:'all 0.35s',
            boxShadow: done ? '0 0 8px rgba(57,232,122,0.2)' : active ? '0 0 8px rgba(255,120,40,0.3)' : 'none',
          }}>
            {done
              ? <CheckCircle2 size={11} style={{color:'var(--green)'}}/>
              : active
                ? <Loader2 size={11} style={{color:'var(--orange)'}} className="spin"/>
                : <Clock size={11} style={{color:'var(--text3)'}}/>
            }
          </div>
          {/* Label */}
          <span style={{
            fontFamily:'var(--mono)', fontSize:10,
            fontWeight: done||active ? 600 : 400,
            color: done ? 'var(--green)' : active ? 'var(--orange2)' : 'var(--text3)',
            letterSpacing:'0.5px',
            transition:'color 0.35s',
            flex:1,
          }}>{label}</span>
          {/* Active pulse */}
          {active && (
            <div style={{
              width:40, height:2, background:'rgba(255,120,40,0.15)',
              borderRadius:1, overflow:'hidden',
            }}>
              <div style={{
                height:'100%',
                background:'linear-gradient(90deg,transparent,var(--orange),transparent)',
                animation:'scanline 1s linear infinite',
              }}/>
            </div>
          )}
          {done && (
            <span style={{fontFamily:'var(--mono)',fontSize:8,color:'var(--green)',opacity:0.6}}>✓ OK</span>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Stat card ─────────────────────────────────────────────────
function StatCard({ label, value, color='var(--orange2)', sub }) {
  return (
    <div className="panel" style={{padding:'14px 16px',position:'relative',overflow:'hidden'}}>
      <div style={{
        fontFamily:'var(--mono)',fontSize:8,
        color:'var(--text3)',letterSpacing:2,
        textTransform:'uppercase',marginBottom:6,
      }}>{label}</div>
      <div style={{
        fontFamily:'var(--display)',fontSize:'2rem',
        fontWeight:900, color, letterSpacing:'-1px',
        lineHeight:1,
        textShadow:`0 0 20px ${color}55`,
      }}>{value}</div>
      {sub && <div style={{fontFamily:'var(--mono)',fontSize:9,color:'var(--text3)',marginTop:4}}>{sub}</div>}
      {/* Corner accent */}
      <div style={{
        position:'absolute',top:0,right:0,
        width:0,height:0,
        borderTop:`20px solid ${color}22`,
        borderLeft:'20px solid transparent',
      }}/>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════
export default function App() {
  injectCSS()

  const [view,          setView]          = useState('home')
  const [target,        setTarget]        = useState('')
  const [dataType,      setDataType]      = useState('auto')
  const [maxItems,      setMaxItems]      = useState(20)
  const [concurrency,   setConcurrency]   = useState(3)
  const [loading,       setLoading]       = useState(false)
  const [activeJob,     setActiveJob]     = useState(null)
  const [events,        setEvents]        = useState([])
  const [sampleResults, setSampleResults] = useState([])
  const [rateStatus,    setRateStatus]    = useState({})
  const [progress,      setProgress]      = useState({completed:0,failed:0,total:0})
  const [urls,          setUrls]          = useState([])
  const [activeTab,     setActiveTab]     = useState('preview')
  const wsRef = useRef(null)

  const addEvent = useCallback((msg, type='info') => {
    const time = new Date().toLocaleTimeString('en',{hour12:false})
    setEvents(ev => [...ev.slice(-300), {msg,type,time}])
  }, [])

  const connectWS = useCallback((jobId) => {
    if (wsRef.current) wsRef.current.close()
    const ws = new WebSocket(`${WS_BASE}/ws/${jobId}`)
    wsRef.current = ws
    ws.onmessage = (e) => {
      const d = JSON.parse(e.data)
      if (d.event==='ping') return
      if (d.event==='start') {
        addEvent(`Target acquired — ${d.job?.total} URLs in queue`, 'info')
      } else if (d.event==='progress') {
        setProgress({completed:d.completed,failed:d.failed,total:d.total})
        if (d.rate_status) setRateStatus(d.rate_status)
        if (d.latest_status==='done') {
          addEvent(`Extracted: ${(d.latest_url||'').substring(0,65)}`, 'success')
          if (d.sample) setSampleResults(s => [...s.slice(-7), d.sample])
        } else if (d.latest_status==='error') {
          addEvent(`Failed: ${(d.latest_url||'').substring(0,65)}`, 'error')
        } else if (d.latest_status==='rate_limited') {
          addEvent('AIMD throttle triggered — scaling down rate', 'warn')
        }
      } else if (d.event==='done') {
        addEvent(`Mission complete: ${d.job?.completed} pages extracted`, 'success')
        setActiveJob(j=>({...j,...d.job}))
      } else if (d.event==='state') {
        if (d.job) {
          setActiveJob(d.job)
          setProgress({completed:d.job.completed,failed:d.job.failed,total:d.job.total})
          if (d.job.rate_status) setRateStatus(d.job.rate_status)
          if (d.job.sample_results?.length) setSampleResults(d.job.sample_results)
        }
      }
    }
    ws.onclose = () => addEvent('Connection closed', 'warn')
    ws.onerror = () => addEvent('WebSocket error', 'error')
  }, [addEvent])

  const handleStart = async () => {
    if (!target.trim()) return
    setLoading(true)
    setEvents([]); setSampleResults([]); setRateStatus({})
    setProgress({completed:0,failed:0,total:0}); setUrls([])

    try {
      const cleanTarget = target.trim().replace(/^["']|["']$/g,'')
      addEvent(`Resolving target: ${cleanTarget}`, 'info')

      const res = await fetch(`${API}/api/jobs/create`, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({target:cleanTarget,data_type:dataType,max_items:maxItems,concurrency}),
      })
      const job = await res.json()
      if (job.error) { addEvent(`Error: ${job.error}`,'error'); return }

      setUrls(job.urls||[])
      addEvent(`Discovered ${job.count} target URLs`, 'success')
      setActiveJob({id:job.job_id,status:'queued',total:job.count})
      setView('job')
      connectWS(job.job_id)
      await fetch(`${API}/api/jobs/${job.job_id}/start`,{method:'POST'})
      addEvent('Scrape engine online — AIMD rate controller active','info')
    } catch(err) {
      addEvent(`Connection failed: ${err.message}`,'error')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async () => {
    if (!activeJob) return
    await fetch(`${API}/api/jobs/${activeJob.id}/cancel`,{method:'POST'})
    addEvent('Job terminated by operator','warn')
  }

  const handleDownload = async () => {
    if (!activeJob) return
    const res  = await fetch(`${API}/api/jobs/${activeJob.id}/results?limit=1000`)
    const data = await res.json()
    const blob = new Blob([JSON.stringify(data,null,2)],{type:'application/json'})
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href=url; a.download=`ultrascrap-${activeJob.id.slice(0,8)}.json`
    a.click(); URL.revokeObjectURL(url)
  }

  const pct       = progress.total>0 ? Math.round((progress.completed+progress.failed)/progress.total*100) : 0
  const isRunning = activeJob?.status==='running'
  const isDone    = activeJob?.status==='done'

  // ── HOME VIEW ──────────────────────────────────────────────
  if (view==='home') return (
    <div className="mesh flicker" style={{
      minHeight:'100vh', position:'relative',
      fontFamily:'var(--body)',
    }}>
      <MeshBackground/>

      {/* Header */}
      <header style={{
        position:'relative',zIndex:10,
        padding:'0 clamp(16px,4vw,48px)',
        height:60,
        display:'flex',alignItems:'center',justifyContent:'space-between',
        borderBottom:'1px solid var(--border)',
        backdropFilter:'blur(20px)',
        background:'rgba(6,6,8,0.7)',
      }}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <div style={{
            width:32,height:32,
            border:'1px solid var(--orange)',
            display:'flex',alignItems:'center',justifyContent:'center',
            background:'rgba(255,120,40,0.08)',
            boxShadow:'0 0 16px rgba(255,120,40,0.2)',
          }}>
            <Zap size={16} style={{color:'var(--orange)'}}/>
          </div>
          <span style={{
            fontFamily:'var(--display)',fontSize:14,fontWeight:700,
            letterSpacing:3, color:'var(--text)',
          }}>ULTRA<span style={{color:'var(--orange)'}}>SCRAP</span></span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <span className="tag tag-green" style={{display:'flex',alignItems:'center',gap:5}}>
            <span style={{width:5,height:5,borderRadius:'50%',background:'var(--green)',
              boxShadow:'0 0 6px var(--green)'}}/>
            SYSTEM ONLINE
          </span>
          <span className="tag tag-orange hide-mobile">v1.0 ADAPTIVE</span>
        </div>
      </header>

      {/* Hero */}
      <main style={{
        position:'relative',zIndex:1,
        maxWidth:900,margin:'0 auto',
        padding:'clamp(40px,8vh,100px) clamp(16px,4vw,40px) 60px',
        textAlign:'center',
      }}>

        {/* Radar */}
        <div style={{
          display:'inline-block',marginBottom:32,
          animation:'fadeUp 0.6s ease 0.1s both',
        }}>
          <RadarWidget/>
        </div>

        {/* Title */}
        <div style={{animation:'fadeUp 0.6s ease 0.2s both'}}>
          <div style={{
            fontFamily:'var(--mono)',fontSize:'clamp(9px,1.5vw,11px)',
            color:'var(--orange)',letterSpacing:5,
            textTransform:'uppercase',marginBottom:16,
          }}>
            ◈ INTELLIGENT EXTRACTION SYSTEM ◈
          </div>
          <h1 style={{
            fontFamily:'var(--display)',
            fontSize:'clamp(2.5rem,7vw,6rem)',
            fontWeight:900, letterSpacing:'-2px',
            lineHeight:0.95, marginBottom:20,
            color:'var(--text)',
          }}>
            ULTRA<br/>
            <span style={{
              background:'linear-gradient(135deg,#ff7828,#ffaa55,#ff5500)',
              WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',
              backgroundClip:'text',
              filter:'drop-shadow(0 0 20px rgba(255,120,40,0.4))',
            }}>SCRAP</span>
          </h1>
          <p style={{
            fontFamily:'var(--body)',
            fontSize:'clamp(0.95rem,2vw,1.15rem)',
            color:'var(--text2)', maxWidth:520, margin:'0 auto 48px',
            lineHeight:1.75, fontWeight:400,
          }}>
            Adaptive AIMD rate control. Behavioral simulation. Universal content extraction.
            Drop any URL or type a topic — it handles the rest.
          </p>
        </div>

        {/* Input form */}
        <div style={{
          animation:'fadeUp 0.6s ease 0.35s both',
          maxWidth:700, margin:'0 auto',
        }}>
          <div className="panel corner-tl scanlines glow-box" style={{
            padding:'clamp(18px,3vw,32px)',
            borderRadius:4,
          }}>
            {/* Main input */}
            <div style={{position:'relative',marginBottom:14}}>
              <div style={{
                position:'absolute',left:14,top:'50%',transform:'translateY(-50%)',
                color:'var(--orange)',pointerEvents:'none',
              }}>
                <Terminal size={14}/>
              </div>
              <input className="input"
                style={{paddingLeft:38,fontSize:'clamp(12px,2vw,14px)'}}
                placeholder="https://example.com or 'wikipedia python' or 'bbc news technology'"
                value={target}
                onChange={e=>setTarget(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&handleStart()}
              />
            </div>

            {/* Config row */}
            <div style={{
              display:'grid',
              gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',
              gap:10, marginBottom:18,
            }}>
              {[
                { label:'EXTRACTION MODE', el: (
                  <select className="input" value={dataType} onChange={e=>setDataType(e.target.value)}
                    style={{fontSize:11}}>
                    {DATA_TYPES.map(d=><option key={d.value} value={d.value}>{d.label}</option>)}
                  </select>
                )},
                { label:'MAX PAGES', el: (
                  <input type="number" className="input" min={1} max={200} value={maxItems}
                    onChange={e=>setMaxItems(Number(e.target.value))} style={{fontSize:12}}/>
                )},
                { label:'CONCURRENCY', el: (
                  <input type="number" className="input" min={1} max={10} value={concurrency}
                    onChange={e=>setConcurrency(Number(e.target.value))} style={{fontSize:12}}/>
                )},
              ].map(({label,el}) => (
                <div key={label}>
                  <div className="sec-label" style={{marginBottom:6,fontSize:8}}>{label}</div>
                  {el}
                </div>
              ))}
            </div>

            {/* Launch button */}
            <button className="btn btn-primary" onClick={handleStart}
              disabled={loading||!target.trim()}
              style={{
                width:'100%', padding:'clamp(12px,2vw,16px)',
                fontSize:'clamp(10px,1.5vw,12px)', letterSpacing:3,
                justifyContent:'center',
              }}>
              {loading
                ? <><Loader2 size={15} className="spin"/> INITIALISING SYSTEM…</>
                : <><Radio size={15}/> LAUNCH EXTRACTION</>
              }
            </button>
          </div>
        </div>

        {/* Feature grid */}
        <div style={{
          display:'grid',
          gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',
          gap:10, marginTop:clamp_str(32,48),
          animation:'fadeUp 0.6s ease 0.5s both',
          textAlign:'left',
        }}>
          {[
            {icon:TrendingUp, title:'AIMD RATE CONTROL',  desc:'Scales concurrency in real-time based on error signals'},
            {icon:Globe,      title:'UNIVERSAL EXTRACT',  desc:'Text, tables, prices, links, images — all auto-detected'},
            {icon:Cpu,        title:'STEALTH ENGINE',     desc:'Bézier mouse curves, human scroll, fingerprint spoofing'},
            {icon:BarChart3,  title:'LIVE TELEMETRY',     desc:'Per-domain error rate and throughput monitoring'},
          ].map(({icon:Icon,title,desc}) => (
            <div key={title} className="panel" style={{padding:'16px',cursor:'default'}}>
              <Icon size={16} style={{color:'var(--orange)',marginBottom:10}}/>
              <div style={{
                fontFamily:'var(--display)',fontSize:9,fontWeight:700,
                color:'var(--text)',letterSpacing:1.5,marginBottom:6,
              }}>{title}</div>
              <div style={{
                fontFamily:'var(--body)',fontSize:12,
                color:'var(--text2)',lineHeight:1.5,
              }}>{desc}</div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )

  // ── JOB VIEW ───────────────────────────────────────────────
  return (
    <div className="mesh" style={{minHeight:'100vh',position:'relative',fontFamily:'var(--body)'}}>
      <MeshBackground/>

      {/* Sticky header */}
      <header style={{
        position:'sticky',top:0,zIndex:100,
        padding:'0 clamp(12px,3vw,28px)',
        height:54,
        display:'flex',alignItems:'center',justifyContent:'space-between',
        borderBottom:'1px solid var(--border)',
        backdropFilter:'blur(20px)',
        background:'rgba(6,6,8,0.92)',
        gap:10,
      }}>
        <div style={{display:'flex',alignItems:'center',gap:12,minWidth:0}}>
          <button className="btn btn-ghost" onClick={()=>setView('home')}
            style={{padding:'5px 12px',fontSize:9,letterSpacing:1.5,flexShrink:0}}>
            <ArrowLeft size={10}/> BACK
          </button>
          <div style={{display:'flex',alignItems:'center',gap:8,minWidth:0}}>
            {isRunning && (
              <div style={{width:7,height:7,borderRadius:'50%',background:'var(--green)',flexShrink:0,
                boxShadow:'0 0 8px var(--green)',animation:'ping 1.5s ease-out infinite'}}/>
            )}
            <span style={{
              fontFamily:'var(--display)',fontSize:10,fontWeight:700,
              letterSpacing:2,color:'var(--text)',
              overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',
            }}>
              {isRunning?'EXTRACTING…':isDone?'MISSION COMPLETE':'STANDBY'}
            </span>
            {activeJob && <StatusBadge status={activeJob.status}/>}
          </div>
        </div>
        <div style={{display:'flex',gap:6,flexShrink:0}}>
          {isDone && (
            <button className="btn btn-ghost" onClick={handleDownload}
              style={{padding:'5px 12px',fontSize:9,letterSpacing:1}}>
              <Download size={10}/> <span className="hide-mobile">EXPORT</span>
            </button>
          )}
          {isRunning && (
            <button className="btn btn-danger" onClick={handleCancel}
              style={{padding:'5px 12px',fontSize:9,letterSpacing:1}}>
              <X size={10}/> ABORT
            </button>
          )}
          <button className="btn btn-ghost" onClick={()=>setView('home')}
            style={{padding:'5px 12px',fontSize:9,letterSpacing:1}}>
            <RefreshCw size={10}/> <span className="hide-mobile">NEW</span>
          </button>
        </div>
      </header>

      <div style={{
        maxWidth:1320,margin:'0 auto',
        padding:'clamp(12px,2vw,20px)',
        position:'relative',zIndex:1,
      }}>

        {/* ── Stats row ── */}
        <div style={{
          display:'grid',
          gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))',
          gap:10,marginBottom:14,
        }}>
          <StatCard label="SCRAPED"  value={progress.completed} color="var(--green)"/>
          <StatCard label="FAILED"   value={progress.failed}    color="var(--red)"/>
          <StatCard label="QUEUED"   value={progress.total}     color="var(--orange2)"/>
          <StatCard label="PROGRESS" value={`${pct}%`}          color="var(--cyan)"/>
        </div>

        {/* ── Progress bar ── */}
        <div className="panel" style={{padding:'12px 16px',marginBottom:14}}>
          <div style={{
            display:'flex',justifyContent:'space-between',
            alignItems:'center',marginBottom:8,
          }}>
            <div className="sec-label" style={{fontSize:8}}>EXTRACTION PROGRESS</div>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <span style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--orange)'}}>
                {progress.completed}/{progress.total}
              </span>
              <ProgressRing pct={pct} size={40} stroke={3}/>
            </div>
          </div>
          <div style={{height:4,background:'rgba(255,120,40,0.08)',borderRadius:2,overflow:'hidden'}}>
            <div style={{
              height:'100%',width:`${pct}%`,
              background:'linear-gradient(90deg,var(--orange3),var(--orange),var(--cyan))',
              borderRadius:2,
              transition:'width 0.7s ease',
              boxShadow:'0 0 10px rgba(255,120,40,0.4)',
              position:'relative',overflow:'hidden',
            }}>
              {isRunning && <div style={{
                position:'absolute',inset:0,
                background:'linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.2) 50%,transparent 100%)',
                animation:'scanline 1.2s linear infinite',
              }}/>}
            </div>
          </div>
        </div>

        {/* ── Main grid ── */}
        <div style={{
          display:'grid',
          gridTemplateColumns:'clamp(280px,65%,900px) 1fr',
          gap:14,
        }}>
          {/* LEFT */}
          <div style={{display:'flex',flexDirection:'column',gap:14,minWidth:0}}>

            {/* Tabs */}
            <div className="panel" style={{padding:0,overflow:'hidden'}}>
              <div style={{
                display:'flex',
                borderBottom:'1px solid var(--border)',
                overflowX:'auto',
              }}>
                {[
                  {id:'preview',label:'DATA STREAM',  icon:Database},
                  {id:'log',    label:'SYS LOG',      icon:Terminal},
                  {id:'urls',   label:`URLS ×${urls.length}`,icon:Globe},
                ].map(({id,label,icon:Icon}) => (
                  <button key={id} onClick={()=>setActiveTab(id)} style={{
                    padding:'11px 16px', background:'none', border:'none',
                    borderBottom:`2px solid ${activeTab===id?'var(--orange)':'transparent'}`,
                    color:activeTab===id?'var(--orange2)':'var(--text3)',
                    cursor:'pointer',
                    fontFamily:'var(--mono)',fontSize:9,fontWeight:700,
                    letterSpacing:1.5,textTransform:'uppercase',
                    display:'flex',alignItems:'center',gap:6,
                    marginBottom:-1,transition:'all 0.2s',
                    whiteSpace:'nowrap',
                  }}>
                    <Icon size={11}/>{label}
                  </button>
                ))}
              </div>
              <div style={{padding:16}}>
                {activeTab==='preview' && <DataPreview results={sampleResults}/>}
                {activeTab==='log'     && <TerminalLog events={events}/>}
                {activeTab==='urls'    && (
                  <div className="sb" style={{maxHeight:300,overflowY:'auto'}}>
                    {urls.slice(0,200).map((u,i)=>(
                      <div key={i} style={{
                        display:'flex',gap:10,padding:'5px 0',
                        borderBottom:'1px solid rgba(255,120,40,0.06)',
                        fontFamily:'var(--mono)',fontSize:10,color:'var(--text2)',
                        animation:'fadeUp 0.2s ease both',
                        animationDelay:`${Math.min(i*10,300)}ms`,
                      }}>
                        <span style={{color:'var(--orange3)',minWidth:24,flexShrink:0}}>{i+1}</span>
                        <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{u}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* RIGHT */}
          <div style={{display:'flex',flexDirection:'column',gap:14}}>

            {/* Target */}
            <div className="panel" style={{padding:14}}>
              <div className="sec-label" style={{fontSize:8,marginBottom:10}}>
                <ChevronRight size={10} style={{color:'var(--orange)'}}/> TARGET
              </div>
              <div style={{
                fontFamily:'var(--mono)',fontSize:10,
                color:'var(--text2)',wordBreak:'break-all',lineHeight:1.6,
              }}>{target}</div>
              <div style={{marginTop:10,display:'flex',gap:5,flexWrap:'wrap'}}>
                <span className="tag tag-orange">{dataType}</span>
                <span className="tag tag-orange">×{maxItems}</span>
                <span className="tag tag-orange">C:{concurrency}</span>
              </div>
            </div>

            {/* AIMD */}
            <div className="panel" style={{padding:14}}>
              <div className="sec-label" style={{fontSize:8,marginBottom:12}}>
                <Activity size={10} style={{color:'var(--orange)'}}/> AIMD CONTROLLER
              </div>
              <RateGauge rateStatus={rateStatus}/>
            </div>

            {/* Pipeline */}
            <div className="panel" style={{padding:14}}>
              <div className="sec-label" style={{fontSize:8,marginBottom:12}}>
                <Cpu size={10} style={{color:'var(--orange)'}}/> PIPELINE STATUS
              </div>
              <PipelineSteps steps={[
                {label:'URL DISCOVERY',    done:urls.length>0},
                {label:'BROWSER INIT',     done:progress.completed+progress.failed>0},
                {label:'STEALTH PROFILE',  done:progress.completed+progress.failed>0},
                {label:'CONTENT FETCH',    done:progress.completed>0,   active:isRunning},
                {label:'RATE ADAPTATION',  done:Object.keys(rateStatus).length>0, active:isRunning},
                {label:'DATA STRUCTURING', done:sampleResults.length>0},
                {label:'EXPORT READY',     done:isDone},
              ]}/>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}

function clamp_str(min, max) { return `clamp(${min}px,4vw,${max}px)` }
