import React, { useState, useRef, useCallback, useEffect } from 'react'
import {
  Zap, Globe, Activity, X, Download, CheckCircle2,
  Clock, Loader2, Eye, BarChart3, Layers, ArrowLeft,
  RefreshCw, Terminal, Cpu, Wifi, Database, ChevronRight,
  TrendingUp, AlertTriangle, Radio, Filter, Edit3, Search,
  Scissors, CalendarClock, Play, Trash2, ToggleLeft, ToggleRight,
  RotateCcw, Plus
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

const EXPORT_FORMATS = [
  { value:'csv',     label:'CSV',          desc:'pandas, Excel, Sheets' },
  { value:'tsv',     label:'TSV',          desc:'R, NLP tools' },
  { value:'jsonl',   label:'JSONL',        desc:'ML datasets, HuggingFace' },
  { value:'json',    label:'JSON',         desc:'APIs, general use' },
  { value:'parquet', label:'Parquet',      desc:'Spark, DuckDB, BigQuery' },
  { value:'xlsx',    label:'Excel .xlsx',  desc:'Spreadsheets' },
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
      --text:     #ffffff;
      --text2:    #ffffff;
      --text3:    #93908b;
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

// ── Data Table (Phase 2) ──────────────────────────────────────
function DataTable({ results, jobDone, fieldConfig }) {
  const [sortCol,   setSortCol]   = useState(null)
  const [sortAsc,   setSortAsc]   = useState(true)
  const [filterCol, setFilterCol] = useState('all')
  const [filterVal, setFilterVal] = useState('')
  const [page,      setPage]      = useState(0)
  const ROWS_PER_PAGE = 20

  if (!results || results.length === 0) return (
    <div style={{
      textAlign:'center', padding:'48px 20px',
      color:'var(--text3)', fontFamily:'var(--mono)', fontSize:13,
    }}>
      <Database size={32} style={{display:'block',margin:'0 auto 14px',opacity:0.2,color:'var(--orange)'}}/>
      <div>AWAITING DATA STREAM</div>
      <div style={{fontSize:11,marginTop:6,opacity:0.6}}>Rows appear as pages are scraped</div>
    </div>
  )

  // ── Build rename map from fieldConfig ──
  // key -> { label (display name), included }
  const renameMap = {}
  if (fieldConfig && fieldConfig.length > 0) {
    fieldConfig.forEach(f => {
      renameMap[f.key] = { label: f.label || f.key, include: f.include }
    })
  }
  const hasConfig = fieldConfig && fieldConfig.length > 0

  // ── Flatten result into a row using original keys ──
  const flatten = (r) => {
    const data  = r?.data || {}
    const inner = data?.data || {}
    const texts      = inner?.text || []
    const headings   = texts.filter(b => b.tag?.startsWith('h')).map(b => b.text)
    const paragraphs = texts.filter(b => b.tag === 'p').map(b => b.text)
    const prices     = (inner?.prices || []).map(p => p.price).join(' | ')
    const attrs      = inner?.attributes || {}
    const row = {
      url:               r.url || '',
      title:             data.title || '',
      status:            r.status || '',
      http_code:         r.http_code ?? '',
      duration_ms:       r.duration_ms ?? '',
      heading:           headings[0]?.substring(0,200) || '',
      first_para:        paragraphs[0]?.substring(0,300) || '',
      text_block_count:  texts.length || 0,
      table_count:       (inner?.tables || []).length,
      link_count:        (data.links || []).length,
      image_count:       (data.images || []).length,
      prices,
    }
    Object.entries(attrs).forEach(([k, v]) => {
      row['attr_' + k.replace(/\s+/g, '_').toLowerCase().substring(0, 25)] = String(v).substring(0, 120)
    })
    return row
  }

  const allRows = results.map(flatten)

  // ── Determine which columns to show ──
  const allOriginalKeys = allRows.length > 0
    ? Object.keys(allRows.reduce((acc, r) => ({ ...acc, ...r }), {}))
    : []

  // If fieldConfig exists, only show included keys in fieldConfig order
  const originalKeys = hasConfig
    ? fieldConfig.filter(f => f.include).map(f => f.key).filter(k => allOriginalKeys.includes(k))
    : allOriginalKeys

  // Display name for a column key
  const displayName = (key) => (renameMap[key]?.label) || key

  // ── Null rate ──
  const nullRate = (key) => {
    const empty = allRows.filter(r => r[key] === undefined || r[key] === '' || r[key] === null).length
    return Math.round((empty / allRows.length) * 100)
  }

  // ── Filter ──
  const filtered = allRows.filter(row => {
    if (!filterVal) return true
    const src = filterCol === 'all'
      ? originalKeys.map(k => String(row[k] || '')).join(' ')
      : String(row[filterCol] || '')
    return src.toLowerCase().includes(filterVal.toLowerCase())
  })

  // ── Sort ──
  const sorted = sortCol
    ? [...filtered].sort((a, b) => {
        const av = a[sortCol] ?? '', bv = b[sortCol] ?? ''
        const n = Number(av) - Number(bv)
        const cmp = !isNaN(n) && av !== '' ? n : String(av).localeCompare(String(bv))
        return sortAsc ? cmp : -cmp
      })
    : filtered

  const totalPages = Math.ceil(sorted.length / ROWS_PER_PAGE)
  const pageRows   = sorted.slice(page * ROWS_PER_PAGE, (page + 1) * ROWS_PER_PAGE)

  const handleSort = (key) => {
    if (sortCol === key) setSortAsc(a => !a)
    else { setSortCol(key); setSortAsc(true) }
    setPage(0)
  }

  const nullColor = (r) => r > 70 ? 'var(--red)' : r > 40 ? 'var(--yellow)' : 'var(--green)'

  return (
    <div className="fadeIn">

      {/* Summary bar */}
      <div style={{
        display:'flex', gap:8, flexWrap:'wrap',
        alignItems:'center', marginBottom:14,
      }}>
        <span className="tag tag-green">{allRows.length} ROWS</span>
        <span className="tag tag-orange">{originalKeys.length} COLS</span>
        {results.filter(r => r.status === 'done').length < results.length && (
          <span className="tag tag-red">
            {results.filter(r => r.status !== 'done').length} ERRORS
          </span>
        )}
        {jobDone && <span className="tag tag-cyan">COMPLETE</span>}
        {hasConfig && (
          <span className="tag tag-orange" style={{opacity:0.7}}>
            {fieldConfig.filter(f=>f.include&&f.label!==f.key).length} RENAMED
          </span>
        )}
        <div style={{marginLeft:'auto', display:'flex', gap:6, alignItems:'center'}}>
          <select
            value={filterCol}
            onChange={e => { setFilterCol(e.target.value); setPage(0) }}
            style={{
              background:'rgba(6,6,8,0.9)', border:'1px solid var(--border2)',
              color:'var(--text2)', fontFamily:'var(--mono)', fontSize:10,
              borderRadius:3, padding:'4px 8px', cursor:'pointer', outline:'none',
            }}>
            <option value="all">All cols</option>
            {originalKeys.map(k => (
              <option key={k} value={k}>{displayName(k)}</option>
            ))}
          </select>
          <input
            placeholder="Filter…"
            value={filterVal}
            onChange={e => { setFilterVal(e.target.value); setPage(0) }}
            style={{
              background:'rgba(6,6,8,0.9)', border:'1px solid var(--border2)',
              color:'var(--text)', fontFamily:'var(--mono)', fontSize:11,
              borderRadius:3, padding:'4px 10px', outline:'none', width:110,
            }}/>
        </div>
      </div>

      {/* Null rate bars */}
      <div style={{
        display:'flex', gap:6, flexWrap:'wrap', alignItems:'flex-end',
        marginBottom:12, paddingBottom:12,
        borderBottom:'1px solid var(--border)',
      }}>
        <span style={{
          fontFamily:'var(--mono)', fontSize:9, color:'var(--text3)',
          alignSelf:'center', marginRight:4, letterSpacing:1,
        }}>NULL %</span>
        {originalKeys.map(key => {
          const r = nullRate(key)
          return (
            <div key={key} title={`${displayName(key)}: ${r}% null`} style={{
              display:'flex', flexDirection:'column', alignItems:'center', gap:3,
            }}>
              <div style={{
                width:34, height:4, borderRadius:1,
                background: nullColor(r), opacity:0.75,
              }}/>
              <span style={{fontFamily:'var(--mono)',fontSize:8,color:nullColor(r)}}>{r}%</span>
            </div>
          )
        })}
      </div>

      {/* Table */}
      <div style={{overflowX:'auto', marginBottom:12}}>
        <table style={{
          borderCollapse:'collapse', width:'100%',
          fontFamily:'var(--mono)', fontSize:11,
          minWidth: originalKeys.length * 130,
        }}>
          <thead>
            <tr>
              <th style={{
                padding:'8px 10px', textAlign:'left',
                borderBottom:'2px solid var(--border2)',
                color:'var(--text3)', fontWeight:400, fontSize:9,
                whiteSpace:'nowrap', background:'rgba(255,120,40,0.05)',
                minWidth:36,
              }}>#</th>
              {originalKeys.map(key => (
                <th key={key}
                  onClick={() => handleSort(key)}
                  style={{
                    padding:'8px 12px', textAlign:'left',
                    borderBottom:'2px solid var(--border2)',
                    color: sortCol === key ? 'var(--orange2)' : 'var(--text2)',
                    fontWeight: sortCol === key ? 700 : 400,
                    fontSize:11, whiteSpace:'nowrap',
                    cursor:'pointer', userSelect:'none',
                    background:'rgba(255,120,40,0.05)',
                    letterSpacing:'0.3px',
                    transition:'color 0.15s',
                  }}>
                  {displayName(key)}
                  {/* Show original key if renamed */}
                  {renameMap[key] && renameMap[key].label !== key && (
                    <span style={{
                      display:'block', fontSize:8, color:'var(--text3)',
                      fontWeight:400, marginTop:1, opacity:0.7,
                    }}>{key}</span>
                  )}
                  {sortCol === key && (
                    <span style={{marginLeft:5, color:'var(--orange)'}}>
                      {sortAsc ? '↑' : '↓'}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {pageRows.map((row, ri) => (
              <tr key={ri} style={{
                background: ri % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.018)',
              }}>
                <td style={{
                  padding:'7px 10px',
                  borderBottom:'1px solid rgba(255,120,40,0.05)',
                  color:'var(--text3)', fontSize:9,
                }}>
                  {page * ROWS_PER_PAGE + ri + 1}
                </td>
                {originalKeys.map(key => {
                  const val      = row[key]
                  const isEmpty  = val === undefined || val === '' || val === null
                  const isUrl    = key === 'url'
                  const isCode   = key === 'http_code'
                  const codeOk   = Number(val) >= 200 && Number(val) < 300
                  return (
                    <td key={key} style={{
                      padding:'7px 12px',
                      borderBottom:'1px solid rgba(255,120,40,0.05)',
                      color: isEmpty  ? 'var(--text3)'
                           : isCode   ? (codeOk ? 'var(--green)' : 'var(--red)')
                           : 'var(--text2)',
                      maxWidth:220, overflow:'hidden',
                      textOverflow:'ellipsis', whiteSpace:'nowrap',
                      fontSize:11,
                    }}>
                      {isEmpty ? (
                        <span style={{opacity:0.2}}>—</span>
                      ) : isUrl ? (
                        <span title={String(val)}>
                          {String(val).replace(/^https?:\/\/(www\.)?/, '').substring(0, 40)}
                          {String(val).length > 45 ? '…' : ''}
                        </span>
                      ) : (
                        <span title={String(val)}>
                          {String(val).substring(0, 70)}{String(val).length > 70 ? '…' : ''}
                        </span>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>

          {/* Summary footer */}
          <tfoot>
            <tr>
              <td style={{
                padding:'6px 10px', borderTop:'2px solid var(--border2)',
                color:'var(--text3)', fontSize:9,
                background:'rgba(255,120,40,0.03)',
              }}>Σ</td>
              {originalKeys.map(key => {
                const vals = allRows.map(r => r[key]).filter(v => v !== '' && v != null)
                const nums = vals.map(Number).filter(v => !isNaN(v) && String(vals[0]) !== '')
                const summary = nums.length === vals.length && nums.length > 0
                  ? `avg ${(nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(1)}`
                  : `${vals.length} filled`
                return (
                  <td key={key} style={{
                    padding:'6px 12px', borderTop:'2px solid var(--border2)',
                    color:'var(--text3)', fontSize:9,
                    background:'rgba(255,120,40,0.03)', whiteSpace:'nowrap',
                  }}>
                    {summary}
                  </td>
                )
              })}
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{
          display:'flex', alignItems:'center', justifyContent:'center',
          gap:8, marginTop:8,
        }}>
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
            style={{
              background:'transparent', border:'1px solid var(--border2)',
              color: page === 0 ? 'var(--text3)' : 'var(--orange2)',
              borderRadius:3, padding:'4px 14px',
              fontFamily:'var(--mono)', fontSize:10, cursor:'pointer',
              opacity: page === 0 ? 0.4 : 1,
            }}>← PREV</button>
          <span style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--text3)'}}>
            {page + 1} / {totalPages}
            <span style={{marginLeft:8, opacity:0.5}}>({filtered.length} rows)</span>
          </span>
          <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
            style={{
              background:'transparent', border:'1px solid var(--border2)',
              color: page >= totalPages - 1 ? 'var(--text3)' : 'var(--orange2)',
              borderRadius:3, padding:'4px 14px',
              fontFamily:'var(--mono)', fontSize:10, cursor:'pointer',
              opacity: page >= totalPages - 1 ? 0.4 : 1,
            }}>NEXT →</button>
        </div>
      )}
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

// ── Schedules View (Phase 5) ──────────────────────────────────

const CRON_PRESETS = [
  { label:'Every hour',        cron:'0 * * * *'   },
  { label:'Every 6 hours',     cron:'0 */6 * * *' },
  { label:'Daily at midnight', cron:'0 0 * * *'   },
  { label:'Daily at 6am',      cron:'0 6 * * *'   },
  { label:'Daily at noon',     cron:'0 12 * * *'  },
  { label:'Weekly (Monday)',   cron:'0 6 * * 1'   },
  { label:'Every weekday',     cron:'0 6 * * 1-5' },
  { label:'Monthly (1st)',     cron:'0 6 1 * *'   },
]

function fmt_ts(ts) {
  if (!ts) return '—'
  return new Date(ts * 1000).toLocaleString('en', {
    month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'
  })
}

function SchedulesView({ onBack, target, dataType, maxItems, concurrency,
                         fieldConfig, cleaningConfig, exportFormat, isMobile }) {
  const [schedules,   setSchedules]   = useState([])
  const [loading,     setLoading]     = useState(false)
  const [creating,    setCreating]    = useState(false)
  const [actionBusy,  setActionBusy]  = useState(null) // schedule_id being actioned
  const [showForm,    setShowForm]    = useState(false)
  const [error,       setError]       = useState('')

  // Form state
  const [name,       setName]       = useState('')
  const [cron,       setCron]       = useState('0 6 * * *')
  const [deltaMode,  setDeltaMode]  = useState(true)
  const [customCron, setCustomCron] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/schedules')
      const d = await r.json()
      setSchedules(d.schedules || [])
    } catch(e) {
      setError('Could not load schedules')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleCreate = async () => {
    if (!name.trim() || !target.trim() || !cron.trim()) return
    setCreating(true); setError('')
    try {
      const included = fieldConfig.filter(f => f.include)
      const fields   = included.map(f => f.key)
      const renames  = {}
      included.forEach(f => { if (f.label !== f.key) renames[f.key] = f.label })

      const r = await fetch('/api/schedules', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
          name: name.trim(),
          target: target.trim(),
          cron,
          data_type: dataType,
          max_items: maxItems,
          concurrency,
          delta_mode: deltaMode,
          export_fmt: exportFormat,
          fields,
          renames,
          cleaning: cleaningConfig,
        }),
      })
      const d = await r.json()
      if (d.error) { setError(d.error); return }
      setShowForm(false); setName(''); setError('')
      await load()
    } catch(e) {
      setError(e.message)
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id) => {
    setActionBusy(id)
    await fetch(`/api/schedules/${id}`, { method:'DELETE' })
    await load()
    setActionBusy(null)
  }

  const handleToggle = async (id) => {
    setActionBusy(id)
    await fetch(`/api/schedules/${id}/toggle`, { method:'POST' })
    await load()
    setActionBusy(null)
  }

  const handleRunNow = async (id) => {
    setActionBusy(id)
    await fetch(`/api/schedules/${id}/run-now`, { method:'POST' })
    setTimeout(load, 1500)
    setActionBusy(null)
  }

  const handleClearDelta = async (id) => {
    setActionBusy(id)
    await fetch(`/api/schedules/${id}/clear-delta`, { method:'POST' })
    await load()
    setActionBusy(null)
  }

  const statusColor = (s) =>
    s === 'done'    ? 'var(--green)'
  : s === 'error'   ? 'var(--red)'
  : s === 'running' ? 'var(--orange)'
  : s === 'skipped' ? 'var(--yellow)'
  : 'var(--text3)'

  return (
    <div style={{ maxWidth:1100, margin:'0 auto',
      padding: isMobile ? '16px 12px' : '28px 28px',
      position:'relative', zIndex:1 }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:24 }}>
        <button className="btn btn-ghost" onClick={onBack}
          style={{ padding:'6px 14px', fontSize:10, flexShrink:0 }}>
          <ArrowLeft size={11}/> BACK
        </button>
        <div>
          <div style={{ fontFamily:'var(--display)', fontSize:14, fontWeight:700,
            color:'var(--text)', letterSpacing:2 }}>SCHEDULED JOBS</div>
          <div style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--text3)', marginTop:3 }}>
            Recurring scrapes with delta mode — only new pages each run
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(s => !s)}
          style={{ marginLeft:'auto', padding:'8px 16px', fontSize:10, letterSpacing:1.5 }}>
          <Plus size={12}/> NEW SCHEDULE
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="panel" style={{ padding:20, marginBottom:20 }}>
          <div className="sec-label" style={{ fontSize:8, marginBottom:16 }}>CREATE SCHEDULE</div>

          <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:12, marginBottom:12 }}>
            <div>
              <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--text3)', marginBottom:5 }}>SCHEDULE NAME</div>
              <input
                className="input"
                placeholder="e.g. Daily BBC News"
                value={name}
                onChange={e => setName(e.target.value)}
                style={{ fontSize:12 }}
              />
            </div>
            <div>
              <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--text3)', marginBottom:5 }}>TARGET</div>
              <input
                className="input"
                value={target}
                readOnly
                style={{ fontSize:11, opacity:0.7, cursor:'not-allowed' }}
              />
            </div>
          </div>

          {/* Cron picker */}
          <div style={{ marginBottom:12 }}>
            <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--text3)', marginBottom:8 }}>FREQUENCY</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(160px,1fr))', gap:6, marginBottom:10 }}>
              {CRON_PRESETS.map(p => (
                <button key={p.cron} onClick={() => { setCron(p.cron); setCustomCron(false) }}
                  style={{
                    padding:'8px 10px', textAlign:'left',
                    background: cron === p.cron && !customCron ? 'rgba(255,120,40,0.15)' : 'rgba(255,120,40,0.03)',
                    border: `1px solid ${cron === p.cron && !customCron ? 'var(--orange)' : 'var(--border)'}`,
                    borderRadius:3, cursor:'pointer', transition:'all 0.12s',
                  }}>
                  <div style={{ fontFamily:'var(--mono)', fontSize:10,
                    color: cron === p.cron && !customCron ? 'var(--orange2)' : 'var(--text2)' }}>
                    {p.label}
                  </div>
                  <div style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--text3)', marginTop:2 }}>
                    {p.cron}
                  </div>
                </button>
              ))}
              <button onClick={() => setCustomCron(true)}
                style={{
                  padding:'8px 10px', textAlign:'left',
                  background: customCron ? 'rgba(0,229,204,0.08)' : 'rgba(0,229,204,0.02)',
                  border: `1px solid ${customCron ? 'var(--cyan)' : 'var(--border)'}`,
                  borderRadius:3, cursor:'pointer',
                }}>
                <div style={{ fontFamily:'var(--mono)', fontSize:10, color: customCron ? 'var(--cyan)' : 'var(--text2)' }}>Custom cron</div>
                <div style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--text3)', marginTop:2 }}>Enter manually</div>
              </button>
            </div>
            {customCron && (
              <input
                className="input"
                placeholder="*/30 * * * *"
                value={cron}
                onChange={e => setCron(e.target.value)}
                style={{ fontSize:13, fontFamily:'var(--mono)', maxWidth:220 }}
              />
            )}
          </div>

          {/* Delta mode toggle */}
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16,
            padding:'12px 14px', background:'rgba(0,229,204,0.04)',
            border:'1px solid rgba(0,229,204,0.15)', borderRadius:4 }}>
            <div onClick={() => setDeltaMode(d => !d)} style={{ cursor:'pointer' }}>
              {deltaMode
                ? <ToggleRight size={24} style={{ color:'var(--cyan)' }}/>
                : <ToggleLeft  size={24} style={{ color:'var(--text3)' }}/>
              }
            </div>
            <div>
              <div style={{ fontFamily:'var(--mono)', fontSize:12, fontWeight:700,
                color: deltaMode ? 'var(--cyan)' : 'var(--text2)' }}>Delta mode</div>
              <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--text3)', marginTop:2 }}>
                {deltaMode
                  ? 'Only scrape URLs not seen in previous runs — saves time and bandwidth'
                  : 'Full re-scrape every run — ignores previous results'}
              </div>
            </div>
            {deltaMode && <span className="tag tag-cyan" style={{ marginLeft:'auto', flexShrink:0 }}>ACTIVE</span>}
          </div>

          {/* Config summary */}
          <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:16 }}>
            <span className="tag tag-orange">{dataType}</span>
            <span className="tag tag-orange">×{maxItems} pages</span>
            <span className="tag tag-orange">C:{concurrency}</span>
            <span className="tag tag-orange">{exportFormat.toUpperCase()}</span>
            {fieldConfig.filter(f=>f.include).length > 0 && (
              <span className="tag tag-cyan">{fieldConfig.filter(f=>f.include).length} fields</span>
            )}
            {Object.values(cleaningConfig).some(Boolean) && (
              <span className="tag tag-cyan">cleaning on</span>
            )}
          </div>

          {error && (
            <div style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--red)', marginBottom:12 }}>{error}</div>
          )}

          <div style={{ display:'flex', gap:8 }}>
            <button className="btn btn-primary" onClick={handleCreate}
              disabled={creating || !name.trim()}
              style={{ padding:'10px 24px', fontSize:10, letterSpacing:1.5 }}>
              {creating ? <><Loader2 size={12} className="spin"/> CREATING…</> : <><CalendarClock size={12}/> CREATE SCHEDULE</>}
            </button>
            <button className="btn btn-ghost" onClick={() => setShowForm(false)}
              style={{ padding:'10px 16px', fontSize:10 }}>CANCEL</button>
          </div>
        </div>
      )}

      {/* Schedule list */}
      {loading ? (
        <div style={{ textAlign:'center', padding:'48px', fontFamily:'var(--mono)',
          fontSize:12, color:'var(--text3)' }}>
          <Loader2 size={24} className="spin" style={{ display:'block', margin:'0 auto 12px', color:'var(--orange)' }}/>
          Loading schedules…
        </div>
      ) : schedules.length === 0 ? (
        <div style={{ textAlign:'center', padding:'64px 20px' }}>
          <CalendarClock size={40} style={{ display:'block', margin:'0 auto 16px',
            opacity:0.15, color:'var(--orange)' }}/>
          <div style={{ fontFamily:'var(--mono)', fontSize:13, color:'var(--text3)', marginBottom:8 }}>
            No schedules yet
          </div>
          <div style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--text3)', opacity:0.6 }}>
            Create a schedule to run this scrape automatically
          </div>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {schedules.map(sc => (
            <div key={sc.id} className="panel" style={{
              padding:0, overflow:'hidden',
              opacity: sc.enabled ? 1 : 0.55,
              transition:'opacity 0.2s',
            }}>
              {/* Schedule header */}
              <div style={{ display:'flex', alignItems:'center', gap:12,
                padding:'14px 18px', borderBottom:'1px solid var(--border)' }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                    <span style={{ fontFamily:'var(--mono)', fontSize:13, fontWeight:700,
                      color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {sc.name}
                    </span>
                    {!sc.enabled && <span className="tag tag-yellow">PAUSED</span>}
                    {sc.last_status === 'running' && <span className="tag tag-orange">RUNNING</span>}
                    {sc.last_status === 'done'    && <span className="tag tag-green">DONE</span>}
                    {sc.last_status === 'error'   && <span className="tag tag-red">ERROR</span>}
                    {sc.last_status === 'skipped' && <span className="tag tag-yellow">SKIPPED</span>}
                    {sc.delta_mode && <span className="tag tag-cyan">DELTA</span>}
                  </div>
                  <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--text3)',
                    overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {sc.target}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                  <button onClick={() => handleRunNow(sc.id)}
                    disabled={actionBusy === sc.id}
                    title="Run now"
                    style={{ background:'transparent', border:'1px solid var(--border2)',
                      color:'var(--green)', borderRadius:3, padding:'5px 10px',
                      cursor:'pointer', display:'flex', alignItems:'center', gap:5,
                      fontFamily:'var(--mono)', fontSize:9 }}>
                    <Play size={10}/>
                    {!isMobile && 'RUN NOW'}
                  </button>
                  <button onClick={() => handleToggle(sc.id)}
                    disabled={actionBusy === sc.id}
                    title={sc.enabled ? 'Pause' : 'Resume'}
                    style={{ background:'transparent', border:'1px solid var(--border)',
                      color: sc.enabled ? 'var(--yellow)' : 'var(--cyan)',
                      borderRadius:3, padding:'5px 10px', cursor:'pointer',
                      display:'flex', alignItems:'center', gap:5,
                      fontFamily:'var(--mono)', fontSize:9 }}>
                    {sc.enabled ? <ToggleLeft size={10}/> : <ToggleRight size={10}/>}
                    {!isMobile && (sc.enabled ? 'PAUSE' : 'RESUME')}
                  </button>
                  {sc.delta_mode && (
                    <button onClick={() => handleClearDelta(sc.id)}
                      disabled={actionBusy === sc.id}
                      title="Reset seen URLs — next run will re-scrape everything"
                      style={{ background:'transparent', border:'1px solid var(--border)',
                        color:'var(--text3)', borderRadius:3, padding:'5px 10px',
                        cursor:'pointer', display:'flex', alignItems:'center', gap:5,
                        fontFamily:'var(--mono)', fontSize:9 }}>
                      <RotateCcw size={10}/>
                      {!isMobile && 'RESET DELTA'}
                    </button>
                  )}
                  <button onClick={() => handleDelete(sc.id)}
                    disabled={actionBusy === sc.id}
                    title="Delete schedule"
                    style={{ background:'transparent', border:'1px solid rgba(255,58,74,0.3)',
                      color:'var(--red)', borderRadius:3, padding:'5px 10px',
                      cursor:'pointer', display:'flex', alignItems:'center', gap:5,
                      fontFamily:'var(--mono)', fontSize:9 }}>
                    <Trash2 size={10}/>
                  </button>
                </div>
              </div>

              {/* Schedule meta */}
              <div style={{ display:'grid',
                gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(5,1fr)',
                gap:0 }}>
                {[
                  { label:'Cron',       val: sc.cron },
                  { label:'Last run',   val: fmt_ts(sc.last_run_at) },
                  { label:'Next run',   val: fmt_ts(sc.next_run_at) },
                  { label:'Total runs', val: sc.total_runs },
                  { label:'Known URLs', val: sc.seen_url_count ?? 0 },
                ].map(({ label, val }) => (
                  <div key={label} style={{
                    padding:'10px 14px',
                    borderRight:'1px solid rgba(255,120,40,0.07)',
                    borderTop:'1px solid rgba(255,120,40,0.07)',
                  }}>
                    <div style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--text3)',
                      letterSpacing:1, marginBottom:4 }}>{label}</div>
                    <div style={{ fontFamily:'var(--mono)', fontSize:11,
                      color:'var(--text2)', fontWeight:600 }}>{val}</div>
                  </div>
                ))}
              </div>

              {/* Run history */}
              {sc.run_history && sc.run_history.length > 0 && (
                <div style={{ padding:'8px 14px', borderTop:'1px solid rgba(255,120,40,0.07)',
                  background:'rgba(0,0,0,0.15)' }}>
                  <div style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--text3)',
                    letterSpacing:1, marginBottom:6 }}>RECENT RUNS</div>
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                    {sc.run_history.slice(0,5).map((r, i) => (
                      <div key={i} style={{
                        display:'flex', alignItems:'center', gap:5,
                        padding:'3px 8px',
                        background:'rgba(255,255,255,0.03)',
                        border:'1px solid rgba(255,120,40,0.08)',
                        borderRadius:3,
                      }}>
                        <span style={{ width:6, height:6, borderRadius:'50%', flexShrink:0,
                          background: statusColor(r.status) }}/>
                        <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--text3)' }}>
                          {fmt_ts(r.ran_at)}
                        </span>
                        <span style={{ fontFamily:'var(--mono)', fontSize:9,
                          color: r.new_urls > 0 ? 'var(--green)' : 'var(--text3)' }}>
                          +{r.new_urls}
                        </span>
                        {r.skipped > 0 && (
                          <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--text3)' }}>
                            skip:{r.skipped}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Cleaning Options (Phase 4) ────────────────────────────────
const CLEANING_OPTIONS = [
  {
    key: 'strip_html',
    label: 'Strip HTML tags',
    desc: 'Remove <tags> and decode &amp; entities from all text fields',
    recommended: true,
  },
  {
    key: 'normalize_ws',
    label: 'Normalize whitespace',
    desc: 'Collapse multiple spaces and newlines into a single space',
    recommended: true,
  },
  {
    key: 'deduplicate',
    label: 'Remove duplicate URLs',
    desc: 'Keep only the first occurrence when the same URL appears twice',
    recommended: true,
  },
  {
    key: 'remove_empty_rows',
    label: 'Remove empty rows',
    desc: 'Drop rows where every field except URL is blank',
    recommended: false,
  },
  {
    key: 'parse_prices',
    label: 'Parse prices to number',
    desc: 'Convert "$1,299.99" → 1299.99 in price / cost / amount columns',
    recommended: false,
  },
  {
    key: 'parse_dates',
    label: 'Normalize dates to ISO 8601',
    desc: 'Convert date strings → YYYY-MM-DD in date / timestamp columns',
    recommended: false,
  },
]

function CleaningOptions({ cleaning, setCleaning }) {
  const activeCount = Object.values(cleaning).filter(Boolean).length

  const toggle = (key) =>
    setCleaning(prev => ({ ...prev, [key]: !prev[key] }))

  const applyRecommended = () => {
    const next = { ...cleaning }
    CLEANING_OPTIONS.forEach(o => { if (o.recommended) next[o.key] = true })
    setCleaning(next)
  }

  const clearAll = () =>
    setCleaning(Object.fromEntries(CLEANING_OPTIONS.map(o => [o.key, false])))

  return (
    <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 18px',
        borderBottom: '1px solid var(--border)',
        background: 'rgba(255,120,40,0.03)',
      }}>
        <Scissors size={13} style={{ color: 'var(--orange)', flexShrink: 0 }} />
        <span style={{
          fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700,
          color: 'var(--text)', letterSpacing: 1.5,
        }}>DATA CLEANING</span>
        {activeCount > 0 && (
          <span className="tag tag-orange" style={{ marginLeft: 4 }}>
            {activeCount} ACTIVE
          </span>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button onClick={applyRecommended} style={{
            background: 'transparent', border: '1px solid var(--border2)',
            color: 'var(--cyan)', fontFamily: 'var(--mono)', fontSize: 9,
            borderRadius: 3, padding: '3px 10px', cursor: 'pointer',
            letterSpacing: 0.5,
          }}>Recommended</button>
          <button onClick={clearAll} style={{
            background: 'transparent', border: '1px solid var(--border)',
            color: 'var(--text3)', fontFamily: 'var(--mono)', fontSize: 9,
            borderRadius: 3, padding: '3px 10px', cursor: 'pointer',
          }}>Clear</button>
        </div>
      </div>

      {/* Options grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: 0,
      }}>
        {CLEANING_OPTIONS.map((opt, i) => {
          const on = !!cleaning[opt.key]
          return (
            <div
              key={opt.key}
              onClick={() => toggle(opt.key)}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 12,
                padding: '14px 18px',
                cursor: 'pointer',
                background: on ? 'rgba(255,120,40,0.06)' : 'transparent',
                borderBottom: '1px solid rgba(255,120,40,0.06)',
                borderRight: i % 2 === 0 ? '1px solid rgba(255,120,40,0.06)' : 'none',
                transition: 'background 0.12s',
              }}
            >
              {/* Checkbox */}
              <div style={{
                width: 18, height: 18, borderRadius: 3, flexShrink: 0, marginTop: 1,
                border: `1.5px solid ${on ? 'var(--orange)' : 'var(--border2)'}`,
                background: on ? 'rgba(255,120,40,0.3)' : 'rgba(0,0,0,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.12s',
              }}>
                {on && <span style={{ color: 'var(--orange2)', fontSize: 11, fontWeight: 700 }}>✓</span>}
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                  <span style={{
                    fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700,
                    color: on ? 'var(--orange2)' : 'var(--text)',
                    transition: 'color 0.12s',
                  }}>{opt.label}</span>
                  {opt.recommended && (
                    <span style={{
                      fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--cyan)',
                      border: '1px solid rgba(0,229,204,0.3)', borderRadius: 2,
                      padding: '1px 5px', letterSpacing: 0.5,
                    }}>REC</span>
                  )}
                </div>
                <div style={{
                  fontFamily: 'var(--mono)', fontSize: 10, lineHeight: 1.5,
                  color: on ? 'var(--text2)' : 'var(--text3)',
                }}>{opt.desc}</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Max text length row */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '12px 18px',
        borderTop: '1px solid var(--border)',
        background: 'rgba(0,0,0,0.15)',
      }}>
        <div style={{
          width: 18, height: 18, borderRadius: 3, flexShrink: 0,
          border: `1.5px solid ${cleaning.max_text_len > 0 ? 'var(--orange)' : 'var(--border2)'}`,
          background: cleaning.max_text_len > 0 ? 'rgba(255,120,40,0.3)' : 'rgba(0,0,0,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
        }} onClick={() => setCleaning(prev => ({
          ...prev,
          max_text_len: prev.max_text_len > 0 ? 0 : 500,
        }))}>
          {cleaning.max_text_len > 0 && (
            <span style={{ color: 'var(--orange2)', fontSize: 11, fontWeight: 700 }}>✓</span>
          )}
        </div>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>
          Truncate long text fields
        </span>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text3)' }}>
          max characters:
        </span>
        <input
          type="number"
          min={50} max={5000} step={50}
          value={cleaning.max_text_len || 500}
          disabled={!cleaning.max_text_len}
          onChange={e => setCleaning(prev => ({ ...prev, max_text_len: Number(e.target.value) }))}
          style={{
            background: 'rgba(6,6,8,0.9)',
            border: `1px solid ${cleaning.max_text_len > 0 ? 'var(--border2)' : 'transparent'}`,
            color: 'var(--text)', fontFamily: 'var(--mono)', fontSize: 11,
            borderRadius: 3, padding: '4px 8px', outline: 'none', width: 80,
            opacity: cleaning.max_text_len > 0 ? 1 : 0.3,
          }}
        />
        <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text3)' }}>
          Applies to heading, first_para, title
        </span>
      </div>
    </div>
  )
}

// ── Field Selector helpers (OUTSIDE component to prevent remount on re-render) ─
const FS_CORE_KEYS = ['url','title','status','http_code','duration_ms',
  'heading','first_para','text_block_count','table_count',
  'link_count','image_count','prices','json_ld','first_table_json']

function FSFieldRow({ f, onToggle, onRename }) {
  return (
    <div style={{
      display:'grid', gridTemplateColumns:'36px minmax(0,1.2fr) minmax(0,2fr) minmax(0,1.4fr)',
      gap:12, alignItems:'center',
      padding:'10px 16px',
      background: f.include ? 'rgba(255,120,40,0.05)' : 'transparent',
      borderBottom:'1px solid rgba(255,120,40,0.06)',
      transition:'background 0.12s',
    }}>
      {/* Checkbox */}
      <div
        onClick={() => onToggle(f.key)}
        style={{
          width:18, height:18, borderRadius:3, cursor:'pointer', flexShrink:0,
          border:`1.5px solid ${f.include ? 'var(--orange)' : 'var(--border2)'}`,
          background: f.include ? 'rgba(255,120,40,0.3)' : 'rgba(0,0,0,0.3)',
          display:'flex', alignItems:'center', justifyContent:'center',
          transition:'all 0.12s',
        }}>
        {f.include && <span style={{color:'var(--orange2)',fontSize:11,lineHeight:1,fontWeight:700}}>✓</span>}
      </div>

      {/* Original key */}
      <div style={{
        fontFamily:'var(--mono)', fontSize:11, lineHeight:1.4,
        color: f.include ? 'var(--text2)' : 'var(--text3)',
        overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
      }} title={f.key}>
        {f.key}
      </div>

      {/* Sample value */}
      <div style={{
        fontFamily:'var(--mono)', fontSize:11, lineHeight:1.4,
        color: f.include ? 'var(--text)' : 'var(--text3)',
        overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
        opacity: f.include ? 1 : 0.5,
      }} title={f.sample}>
        {f.sample
          ? f.sample
          : <span style={{opacity:0.3, fontStyle:'italic'}}>— empty —</span>
        }
      </div>

      {/* Rename input */}
      <input
        value={f.label}
        onChange={e => onRename(f.key, e.target.value)}
        disabled={!f.include}
        style={{
          background: f.include ? 'rgba(6,6,8,0.95)' : 'transparent',
          border:`1px solid ${f.include ? 'var(--border2)' : 'transparent'}`,
          color:'var(--text)', fontFamily:'var(--mono)', fontSize:11,
          borderRadius:3, padding:'5px 8px', outline:'none', width:'100%',
          opacity: f.include ? 1 : 0,
          transition:'opacity 0.12s',
        }}
      />
    </div>
  )
}

function FSGroupSection({ title, items, defaultOpen, onToggle, onRename }) {
  const [open, setOpen] = useState(defaultOpen)
  if (!items.length) return null
  const on = items.filter(f => f.include).length
  return (
    <div>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display:'flex', alignItems:'center', gap:10,
          padding:'8px 16px', cursor:'pointer',
          background:'rgba(255,120,40,0.07)',
          borderBottom:'1px solid var(--border)',
          borderTop:'1px solid var(--border)',
          userSelect:'none',
        }}>
        <span style={{
          fontFamily:'var(--mono)', fontSize:10, color:'var(--orange)',
          letterSpacing:1.5, fontWeight:700,
        }}>{title}</span>
        <span style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--text3)'}}>
          {on}/{items.length} selected
        </span>
        <span style={{marginLeft:'auto',color:'var(--text3)',fontSize:11}}>{open ? '▲' : '▼'}</span>
      </div>
      {open && items.map(f => (
        <FSFieldRow key={f.key} f={f} onToggle={onToggle} onRename={onRename} />
      ))}
    </div>
  )
}

// ── Field Selector (Phase 3) ──────────────────────────────────
function FieldSelector({ fields, setFields, onConfirm, onBack, sampleUrl, isMobile, cleaning, setCleaning }) {
  const [search, setSearch] = useState('')

  const allChecked  = fields.every(f => f.include)
  const someChecked = fields.some(f => f.include)
  const selectedCount = fields.filter(f => f.include).length

  // Stable callbacks — don't recreate on every render
  const toggleAll  = useCallback(() => {
    setFields(prev => prev.map(f => ({ ...f, include: !prev.every(x => x.include) })))
  }, [setFields])

  const toggleField = useCallback((key) => {
    setFields(prev => prev.map(f => f.key === key ? { ...f, include: !f.include } : f))
  }, [setFields])

  const renameField = useCallback((key, label) => {
    setFields(prev => prev.map(f => f.key === key ? { ...f, label } : f))
  }, [setFields])

  const visible = search
    ? fields.filter(f =>
        f.key.toLowerCase().includes(search.toLowerCase()) ||
        f.label.toLowerCase().includes(search.toLowerCase()) ||
        (f.sample || '').toLowerCase().includes(search.toLowerCase()))
    : fields

  const groups = {
    core:  visible.filter(f => FS_CORE_KEYS.includes(f.key)),
    meta:  visible.filter(f => f.key.startsWith('meta_')),
    attr:  visible.filter(f => f.key.startsWith('attr_')),
    other: visible.filter(f => !FS_CORE_KEYS.includes(f.key) && !f.key.startsWith('meta_') && !f.key.startsWith('attr_')),
  }

  const quickActions = [
    { label:'Core fields only',  fn:() => setFields(prev => prev.map(f => ({ ...f, include: FS_CORE_KEYS.includes(f.key) }))) },
    { label:'Remove meta tags',  fn:() => setFields(prev => prev.map(f => ({ ...f, include: f.include && !f.key.startsWith('meta_') }))) },
    { label:'Non-empty only',    fn:() => setFields(prev => prev.map(f => ({ ...f, include: !f.empty }))) },
    { label:'Select all',        fn:() => setFields(prev => prev.map(f => ({ ...f, include: true }))) },
    { label:'Clear all',         fn:() => setFields(prev => prev.map(f => ({ ...f, include: false }))) },
  ]

  return (
    <div style={{
      maxWidth:1100, margin:'0 auto',
      padding: isMobile ? '16px 12px' : '28px 28px',
      position:'relative', zIndex:1,
    }}>

      {/* Header */}
      <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:22}}>
        <button className="btn btn-ghost" onClick={onBack}
          style={{padding:'6px 14px',fontSize:10,flexShrink:0,letterSpacing:1}}>
          <ArrowLeft size={11}/> BACK
        </button>
        <div>
          <div style={{fontFamily:'var(--display)',fontSize:14,fontWeight:700,
            color:'var(--text)',letterSpacing:2}}>
            FIELD SELECTOR
          </div>
          <div style={{fontFamily:'var(--mono)',fontSize:11,color:'var(--text3)',marginTop:3}}>
            Sampled from: <span style={{color:'var(--orange2)'}}>{sampleUrl}</span>
          </div>
        </div>
        <span className="tag tag-orange" style={{marginLeft:'auto'}}>
          STEP 2 OF 3
        </span>
      </div>

      <div style={{
        display:'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 280px',
        gap:16, alignItems:'start',
      }}>

        {/* ── Left: field list ── */}
        <div className="panel" style={{padding:0,overflow:'hidden'}}>

          {/* Toolbar */}
          <div style={{
            display:'flex', alignItems:'center', gap:10,
            padding:'10px 16px',
            borderBottom:'1px solid var(--border)',
            background:'rgba(255,120,40,0.03)',
          }}>
            {/* Select-all checkbox */}
            <div onClick={toggleAll} style={{
              width:18, height:18, borderRadius:3, cursor:'pointer', flexShrink:0,
              border:`1.5px solid ${allChecked || someChecked ? 'var(--orange)' : 'var(--border2)'}`,
              background: allChecked ? 'rgba(255,120,40,0.3)' : 'rgba(0,0,0,0.3)',
              display:'flex', alignItems:'center', justifyContent:'center',
            }}>
              {allChecked  && <span style={{color:'var(--orange2)',fontSize:11,fontWeight:700}}>✓</span>}
              {!allChecked && someChecked && <span style={{color:'var(--orange)',fontSize:13,lineHeight:1}}>–</span>}
            </div>
            <span style={{fontFamily:'var(--mono)',fontSize:11,color:'var(--text3)'}}>
              <span style={{color:'var(--orange2)',fontWeight:700}}>{selectedCount}</span>
              /{fields.length} fields selected
            </span>

            {/* Search */}
            <div style={{
              marginLeft:'auto', display:'flex', alignItems:'center', gap:7,
              border:'1px solid var(--border2)', borderRadius:3,
              padding:'5px 10px', background:'rgba(6,6,8,0.9)',
            }}>
              <Search size={11} style={{color:'var(--text3)', flexShrink:0}}/>
              <input
                placeholder="Search fields…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  background:'transparent', border:'none', outline:'none',
                  fontFamily:'var(--mono)', fontSize:11, color:'var(--text)',
                  width:130,
                }}/>
            </div>
          </div>

          {/* Column header row */}
          <div style={{
            display:'grid',
            gridTemplateColumns:'36px minmax(0,1.2fr) minmax(0,2fr) minmax(0,1.4fr)',
            gap:12, padding:'6px 16px',
            background:'rgba(0,0,0,0.25)',
            borderBottom:'1px solid var(--border)',
          }}>
            {['', 'Original key', 'Sample value', 'Column name (rename)'].map(h => (
              <span key={h} style={{
                fontFamily:'var(--mono)', fontSize:9,
                color:'var(--text3)', letterSpacing:1, textTransform:'uppercase',
              }}>{h}</span>
            ))}
          </div>

          {/* Field groups */}
          <div className="sb" style={{maxHeight:500, overflowY:'auto'}}>
            <FSGroupSection title="CORE FIELDS" items={groups.core}  defaultOpen={true}  onToggle={toggleField} onRename={renameField}/>
            <FSGroupSection title="META TAGS"   items={groups.meta}  defaultOpen={false} onToggle={toggleField} onRename={renameField}/>
            <FSGroupSection title="ATTRIBUTES"  items={groups.attr}  defaultOpen={true}  onToggle={toggleField} onRename={renameField}/>
            <FSGroupSection title="OTHER"       items={groups.other} defaultOpen={true}  onToggle={toggleField} onRename={renameField}/>
            {visible.length === 0 && (
              <div style={{padding:'32px', textAlign:'center',
                fontFamily:'var(--mono)', fontSize:12, color:'var(--text3)'}}>
                No fields match "{search}"
              </div>
            )}
          </div>
        </div>

        {/* ── Right: summary + actions ── */}
        <div style={{display:'flex', flexDirection:'column', gap:12}}>

          {/* Summary */}
          <div className="panel" style={{padding:18}}>
            <div className="sec-label" style={{fontSize:8,marginBottom:14}}>SUMMARY</div>
            {[
              { label:'Selected',   val:selectedCount,                                                   color:'var(--green)' },
              { label:'Excluded',   val:fields.length - selectedCount,                                   color:'var(--text3)' },
              { label:'Meta tags',  val:fields.filter(f=>f.key.startsWith('meta_')&&f.include).length,   color:'var(--text2)' },
              { label:'Attributes', val:fields.filter(f=>f.key.startsWith('attr_')&&f.include).length,   color:'var(--cyan)' },
              { label:'Renamed',    val:fields.filter(f=>f.include&&f.label!==f.key).length,             color:'var(--orange2)' },
            ].map(({ label, val, color }) => (
              <div key={label} style={{
                display:'flex', justifyContent:'space-between', alignItems:'center',
                marginBottom:10, paddingBottom:10,
                borderBottom:'1px solid rgba(255,120,40,0.06)',
              }}>
                <span style={{fontFamily:'var(--mono)',fontSize:11,color:'var(--text3)'}}>{label}</span>
                <span style={{fontFamily:'var(--display)',fontSize:20,fontWeight:900,color,letterSpacing:'-1px'}}>{val}</span>
              </div>
            ))}
          </div>

          {/* Quick select */}
          <div className="panel" style={{padding:18}}>
            <div className="sec-label" style={{fontSize:8,marginBottom:12}}>QUICK SELECT</div>
            <div style={{display:'flex', flexDirection:'column', gap:7}}>
              {quickActions.map(({ label, fn }) => (
                <button key={label} onClick={fn} style={{
                  background:'transparent',
                  border:'1px solid var(--border)',
                  color:'var(--text2)',
                  borderRadius:3, padding:'8px 12px',
                  fontFamily:'var(--mono)', fontSize:11,
                  cursor:'pointer', textAlign:'left',
                  transition:'all 0.12s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor='var(--orange)'; e.currentTarget.style.color='var(--orange2)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border)';  e.currentTarget.style.color='var(--text2)' }}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Launch */}
          <button
            className="btn btn-primary"
            onClick={onConfirm}
            disabled={selectedCount === 0}
            style={{width:'100%', padding:'15px', fontSize:11, letterSpacing:2, justifyContent:'center'}}>
            <Radio size={13}/> LAUNCH — {selectedCount} FIELDS
          </button>
          {selectedCount === 0 && (
            <div style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--red)',textAlign:'center'}}>
              Select at least one field to continue
            </div>
          )}
        </div>
      </div>

      {/* ── Cleaning options — full width below the grid ── */}
      <div style={{ marginTop: 16 }}>
        <CleaningOptions cleaning={cleaning} setCleaning={setCleaning} />
      </div>
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
  const [exportFormat,  setExportFormat]  = useState('csv')
  const [loading,       setLoading]       = useState(false)
  const [sampling,      setSampling]      = useState(false)
  const [fieldConfig,   setFieldConfig]   = useState([])
  const [sampledUrls,   setSampledUrls]   = useState([])
  const [sampleUrl,     setSampleUrl]     = useState('')
  const [cleaningConfig, setCleaningConfig] = useState({
    strip_html:        false,
    normalize_ws:      false,
    deduplicate:       false,
    remove_empty_rows: false,
    parse_prices:      false,
    parse_dates:       false,
    max_text_len:      0,
  })
  const [activeJob,     setActiveJob]     = useState(null)
  const [events,        setEvents]        = useState([])
  const [sampleResults, setSampleResults] = useState([])
  const [rateStatus,    setRateStatus]    = useState({})
  const [progress,      setProgress]      = useState({completed:0,failed:0,total:0})
  const [urls,          setUrls]          = useState([])
  const [activeTab,     setActiveTab]     = useState('preview')
  const [scheduleView,  setScheduleView]  = useState(false)
  const [winW,          setWinW]          = useState(window.innerWidth)
  const wsRef = useRef(null)

  useEffect(() => {
    const h = () => setWinW(window.innerWidth)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])

  const isMobile = winW < 640
  const isTablet = winW < 1024
  const pad = isMobile ? '10px' : isTablet ? '14px' : '20px'

  const addEvent = useCallback((msg, type='info') => {
    const time = new Date().toLocaleTimeString('en',{hour12:false})
    setEvents(ev => [...ev.slice(-300), {msg,type,time}])
  }, [])

  const connectWS = useCallback((jobId) => {
    if (wsRef.current) wsRef.current.close()
    const ws = new WebSocket(`${WS_BASE}/ws/${jobId}`)
    wsRef.current = ws
    ws.onmessage = async (e) => {
      const d = JSON.parse(e.data)
      if (d.event==='ping') return
      if (d.event==='start') {
        addEvent(`Target acquired — ${d.job?.total} URLs in queue`, 'info')
      } else if (d.event==='progress') {
        setProgress({completed:d.completed,failed:d.failed,total:d.total})
        if (d.rate_status) setRateStatus(d.rate_status)
        if (d.latest_status==='done') {
          addEvent(`Extracted: ${(d.latest_url||'').substring(0,65)}`, 'success')
          if (d.sample) setSampleResults(s => [...s, d.sample])
        } else if (d.latest_status==='error') {
          addEvent(`Failed: ${(d.latest_url||'').substring(0,65)}`, 'error')
        } else if (d.latest_status==='rate_limited') {
          addEvent('AIMD throttle triggered — scaling down rate', 'warn')
        }
      } else if (d.event==='done') {
        addEvent(`Mission complete: ${d.job?.completed} pages extracted`, 'success')
        setActiveJob(j=>({...j,...d.job}))
        // Phase 4: fetch cleaning activity log if any cleaning options are active
        const hasCleaningOpts = Object.entries(cleaningConfig).some(([k,v]) =>
          k === 'max_text_len' ? v > 0 : Boolean(v)
        )
        if (hasCleaningOpts && d.job?.id) {
          try {
            const cr = await fetch(`${API}/api/jobs/${d.job.id}/clean-preview`, {
              method: 'POST',
              headers: {'Content-Type':'application/json'},
              body: JSON.stringify({ cleaning: cleaningConfig }),
            })
            const cd = await cr.json()
            if (cd.log) {
              addEvent('── Cleaning report ──', 'info')
              cd.log.forEach(entry => {
                const type = entry.type === 'removed_duplicate' ? 'warn'
                           : entry.type === 'removed_empty'     ? 'warn'
                           : 'info'
                addEvent(entry.message, type)
              })
            }
          } catch(e) {
            // silently ignore cleaning log errors
          }
        }
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
    setSampling(true)
    setLoading(true)
    addEvent(`Sampling target: ${target.trim()}`, 'info')
    try {
      const cleanTarget = target.trim().replace(/^["']|["']$/g, '')
      const res  = await fetch(`${API}/api/sample`, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({target:cleanTarget, data_type:dataType, max_items:maxItems, concurrency}),
      })
      const data = await res.json()
      if (data.error) {
        addEvent(`Sample failed: ${data.error}`, 'error')
        setSampling(false); setLoading(false); return
      }
      addEvent(`Detected ${data.fields.length} fields from ${data.sample_url}`, 'success')
      setFieldConfig(data.fields)
      setSampledUrls(data.urls)
      setSampleUrl(data.sample_url)
      setView('field-select')
    } catch(err) {
      addEvent(`Connection failed: ${err.message}`, 'error')
    } finally {
      setLoading(false)
      setSampling(false)
    }
  }

  const handleLaunch = async () => {
    setEvents([]); setSampleResults([]); setRateStatus({})
    setProgress({completed:0,failed:0,total:0}); setUrls(sampledUrls)
    try {
      const cleanTarget = target.trim().replace(/^["']|["']$/g, '')
      addEvent(`Creating job for ${sampledUrls.length} URLs…`, 'info')
      const res = await fetch(`${API}/api/jobs/create`, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({target:cleanTarget, data_type:dataType, max_items:maxItems, concurrency}),
      })
      const job = await res.json()
      if (job.error) { addEvent(`Error: ${job.error}`, 'error'); return }
      setUrls(job.urls || [])
      addEvent(`${job.count} URLs queued`, 'success')
      setActiveJob({id:job.job_id, status:'queued', total:job.count})
      setView('job')
      connectWS(job.job_id)
      await fetch(`${API}/api/jobs/${job.job_id}/start`, {method:'POST'})
      addEvent('Scrape engine online — AIMD rate controller active', 'info')
    } catch(err) {
      addEvent(`Launch failed: ${err.message}`, 'error')
    }
  }

  const handleCancel = async () => {
    if (!activeJob) return
    await fetch(`${API}/api/jobs/${activeJob.id}/cancel`, {method:'POST'})
    addEvent('Job terminated by operator', 'warn')
  }

  const handleDownload = async (fmt) => {
    if (!activeJob) return
    const format   = fmt || exportFormat
    const included = fieldConfig.filter(f => f.include)
    const fields   = included.map(f => f.key)
    const renames  = {}
    included.forEach(f => { if (f.label !== f.key) renames[f.key] = f.label })

    const useFieldFilter = fields.length > 0 && fieldConfig.length > 0
    let res
    if (useFieldFilter) {
      res = await fetch(`${API}/api/jobs/${activeJob.id}/export?fmt=${format}`, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ fmt:format, fields, renames, cleaning: cleaningConfig }),
      })
    } else {
      res = await fetch(`${API}/api/jobs/${activeJob.id}/export?fmt=${format}`)
    }
    if (!res.ok) {
      const err = await res.json().catch(()=>({}))
      addEvent(`Export failed: ${err.error || res.statusText}`, 'error'); return
    }
    const blob = await res.blob()
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `ultrascrap-${activeJob.id.slice(0,8)}.${format}`
    a.click(); URL.revokeObjectURL(url)
    addEvent(`Exported ${fields.length || 'all'} fields as ${format.toUpperCase()}`, 'success')
  }

  const pct       = progress.total>0 ? Math.round((progress.completed+progress.failed)/progress.total*100) : 0
  const isRunning = activeJob?.status==='running'
  const isDone    = activeJob?.status==='done'

  // ── FIELD SELECT VIEW ──────────────────────────────────────
  if (view==='field-select') return (
    <div className="mesh" style={{minHeight:'100vh',position:'relative',fontFamily:'var(--body)'}}>
      <MeshBackground/>
      <header style={{
        position:'relative',zIndex:10,padding:`0 ${isMobile?'14px':'clamp(16px,4vw,48px)'}`,
        height:54,display:'flex',alignItems:'center',justifyContent:'space-between',
        borderBottom:'1px solid var(--border)',backdropFilter:'blur(20px)',
        background:'rgba(6,6,8,0.85)',
      }}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:28,height:28,border:'1px solid var(--orange)',
            display:'flex',alignItems:'center',justifyContent:'center',
            background:'rgba(255,120,40,0.08)'}}>
            <Filter size={13} style={{color:'var(--orange)'}}/>
          </div>
          <span style={{fontFamily:'var(--display)',fontSize:isMobile?10:12,
            fontWeight:700,letterSpacing:3,color:'var(--text)'}}>
            ULTRA<span style={{color:'var(--orange)'}}>SCRAP</span>
          </span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:6}}>
          <span className="tag tag-orange">STEP 2 OF 3</span>
          <span className="tag tag-cyan">FIELD SELECTOR</span>
        </div>
      </header>
      <FieldSelector
        fields={fieldConfig}
        setFields={setFieldConfig}
        onConfirm={handleLaunch}
        onBack={()=>setView('home')}
        sampleUrl={sampleUrl}
        isMobile={isMobile}
        cleaning={cleaningConfig}
        setCleaning={setCleaningConfig}
      />
    </div>
  )

  // ── HOME VIEW ──────────────────────────────────────────────
  if (view==='home') return (
    <div className="mesh flicker" style={{minHeight:'100vh',position:'relative',fontFamily:'var(--body)'}}>
      <MeshBackground/>
      <header style={{
        position:'relative',zIndex:10,
        padding:`0 ${isMobile?'14px':'clamp(16px,4vw,48px)'}`,
        height:60,
        display:'flex',alignItems:'center',justifyContent:'space-between',
        borderBottom:'1px solid var(--border)',
        backdropFilter:'blur(20px)',
        background:'rgba(6,6,8,0.7)',
      }}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{
            width:32,height:32,
            border:'1px solid var(--orange)',
            display:'flex',alignItems:'center',justifyContent:'center',
            background:'rgba(255,120,40,0.08)',
            boxShadow:'0 0 16px rgba(255,120,40,0.2)',
          }}>
            <Zap size={16} style={{color:'var(--orange)'}}/>
          </div>
          <span style={{fontFamily:'var(--display)',fontSize:isMobile?12:14,fontWeight:700,letterSpacing:3,color:'var(--text)'}}>
            ULTRA<span style={{color:'var(--orange)'}}>SCRAP</span>
          </span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <span className="tag tag-green" style={{display:'flex',alignItems:'center',gap:5}}>
            <span style={{width:5,height:5,borderRadius:'50%',background:'var(--green)',boxShadow:'0 0 6px var(--green)'}}/>
            {isMobile ? 'ONLINE' : 'SYSTEM ONLINE'}
          </span>
          {!isMobile && <span className="tag tag-orange">v1.0 ADAPTIVE</span>}
        </div>
      </header>

      <main style={{
        position:'relative',zIndex:1,maxWidth:900,margin:'0 auto',
        padding:`${isMobile?'40px 14px 40px':'clamp(40px,8vh,100px) clamp(16px,4vw,40px) 60px'}`,
        textAlign:'center',
      }}>
        <div style={{display:'inline-block',marginBottom:isMobile?20:32,animation:'fadeUp 0.6s ease 0.1s both'}}>
          <RadarWidget/>
        </div>
        <div style={{animation:'fadeUp 0.6s ease 0.2s both'}}>
          <div style={{fontFamily:'var(--mono)',fontSize:isMobile?8:11,color:'var(--orange)',letterSpacing:isMobile?3:5,textTransform:'uppercase',marginBottom:14}}>
            ◈ INTELLIGENT EXTRACTION SYSTEM ◈
          </div>
          <h1 style={{
            fontFamily:'var(--display)',
            fontSize:`clamp(${isMobile?'2rem':'2.5rem'},7vw,6rem)`,
            fontWeight:900,letterSpacing:'-2px',lineHeight:0.95,marginBottom:16,color:'var(--text)',
          }}>
            ULTRA<br/>
            <span style={{
              background:'linear-gradient(135deg,#ff7828,#ffaa55,#ff5500)',
              WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text',
              filter:'drop-shadow(0 0 20px rgba(255,120,40,0.4))',
            }}>SCRAP</span>
          </h1>
          <p style={{
            fontFamily:'var(--body)',fontSize:isMobile?'0.9rem':'clamp(0.95rem,2vw,1.1rem)',
            color:'var(--text2)',maxWidth:520,margin:'0 auto 36px',lineHeight:1.75,
          }}>
            Adaptive AIMD rate control. Behavioral simulation. Universal content extraction.
            Drop any URL or type a topic.
          </p>
        </div>

        <div style={{animation:'fadeUp 0.6s ease 0.35s both',maxWidth:700,margin:'0 auto'}}>
          <div className="panel corner-tl scanlines glow-box" style={{padding:isMobile?'16px':'clamp(18px,3vw,32px)',borderRadius:4}}>
            <div style={{position:'relative',marginBottom:12}}>
              <div style={{position:'absolute',left:13,top:'50%',transform:'translateY(-50%)',color:'var(--orange)',pointerEvents:'none'}}>
                <Terminal size={13}/>
              </div>
              <input className="input"
                style={{paddingLeft:36,fontSize:isMobile?12:13}}
                placeholder="https://example.com or 'wikipedia python'"
                value={target}
                onChange={e=>setTarget(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&handleStart()}
              />
            </div>
            <div style={{
              display:'grid',
              gridTemplateColumns:isMobile?'1fr 1fr':'repeat(3,1fr)',
              gap:8,marginBottom:14,
            }}>
              <div style={{gridColumn:isMobile?'1/-1':'auto'}}>
                <div className="sec-label" style={{fontSize:7,marginBottom:5}}>EXTRACTION MODE</div>
                <select className="input" value={dataType} onChange={e=>setDataType(e.target.value)} style={{fontSize:11}}>
                  {DATA_TYPES.map(d=><option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>
              <div>
                <div className="sec-label" style={{fontSize:7,marginBottom:5}}>MAX PAGES</div>
                <input type="number" className="input" min={1} max={200} value={maxItems}
                  onChange={e=>setMaxItems(Number(e.target.value))} style={{fontSize:12}}/>
              </div>
              <div>
                <div className="sec-label" style={{fontSize:7,marginBottom:5}}>CONCURRENCY</div>
                <input type="number" className="input" min={1} max={10} value={concurrency}
                  onChange={e=>setConcurrency(Number(e.target.value))} style={{fontSize:12}}/>
              </div>
            </div>

            {/* Export format selector */}
            <div style={{marginBottom:14}}>
              <div className="sec-label" style={{fontSize:7,marginBottom:8}}>EXPORT FORMAT</div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6}}>
                {EXPORT_FORMATS.map(f=>(
                  <button key={f.value} onClick={()=>setExportFormat(f.value)}
                    style={{
                      padding:'8px 6px',
                      background: exportFormat===f.value ? 'rgba(255,120,40,0.18)' : 'rgba(255,120,40,0.03)',
                      border: `1px solid ${exportFormat===f.value ? 'var(--orange)' : 'var(--border)'}`,
                      borderRadius:3, cursor:'pointer', textAlign:'left',
                      transition:'all 0.15s',
                    }}>
                    <div style={{fontFamily:'var(--display)',fontSize:9,fontWeight:700,
                      color:exportFormat===f.value?'var(--orange2)':'var(--text2)',
                      letterSpacing:1,marginBottom:2}}>{f.label}</div>
                    <div style={{fontFamily:'var(--mono)',fontSize:8,
                      color:exportFormat===f.value?'var(--text2)':'var(--text3)'}}>{f.desc}</div>
                  </button>
                ))}
              </div>
            </div>
            <button className="btn btn-primary" onClick={handleStart}
              disabled={loading||!target.trim()}
              style={{width:'100%',padding:isMobile?'12px':'14px',fontSize:isMobile?10:11,letterSpacing:2,justifyContent:'center'}}>
              {sampling ? <><Loader2 size={13} className="spin"/> SAMPLING PAGE…</> : loading ? <><Loader2 size={13} className="spin"/> INITIALISING…</> : <><Radio size={13}/> SAMPLE &amp; SELECT FIELDS</>}
            </button>
          </div>
        </div>

        <div style={{
          display:'grid',
          gridTemplateColumns:isMobile?'repeat(2,1fr)':'repeat(auto-fit,minmax(180px,1fr))',
          gap:8,marginTop:isMobile?24:40,
          animation:'fadeUp 0.6s ease 0.5s both',textAlign:'left',
        }}>
          {[
            {icon:TrendingUp,title:'AIMD RATE CONTROL', desc:'Scales concurrency in real-time based on error signals'},
            {icon:Globe,     title:'UNIVERSAL EXTRACT', desc:'Text, tables, prices, links — all auto-detected'},
            {icon:Cpu,       title:'STEALTH ENGINE',    desc:'Bézier mouse curves, human scroll, fingerprint spoofing'},
            {icon:BarChart3, title:'LIVE TELEMETRY',    desc:'Per-domain error rate and throughput monitoring'},
          ].map(({icon:Icon,title,desc})=>(
            <div key={title} className="panel" style={{padding:isMobile?'12px':'16px'}}>
              <Icon size={14} style={{color:'var(--orange)',marginBottom:8}}/>
              <div style={{fontFamily:'var(--display)',fontSize:8,fontWeight:700,color:'var(--text)',letterSpacing:1.5,marginBottom:5}}>{title}</div>
              <div style={{fontFamily:'var(--body)',fontSize:isMobile?11:12,color:'var(--text2)',lineHeight:1.5}}>{desc}</div>
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

      {/* ── NEON LOADER BAR — fixed top, visible on all devices ── */}
      {isRunning && (
        <div style={{position:'fixed',top:0,left:0,right:0,zIndex:9999,height:3,overflow:'visible'}}>
          {/* filled track */}
          <div style={{
            position:'absolute',left:0,top:0,bottom:0,
            width:`${pct}%`,
            background:'linear-gradient(90deg,#ff5500,#ff7828,#ffaa55,#00e5cc)',
            transition:'width 0.7s ease',
            boxShadow:'0 0 10px #ff7828, 0 0 20px rgba(255,120,40,0.7), 0 0 40px rgba(255,120,40,0.4)',
          }}/>
          {/* shimmer sweep */}
          {/* <div style={{
            position:'absolute',left:0,top:0,bottom:0,right:0,
            background:'linear-gradient(90deg,transparent 0%,rgba(255,220,150,0.5) 50%,transparent 100%)',
            backgroundSize:'200% 100%',
            animation:'scanline 1s linear infinite',
          }}/> */}
          {/* glow drip */}
          <div style={{
            position:'absolute',left:0,right:0,top:3,height:28,
            background:'linear-gradient(180deg,rgba(255,120,40,0.3) 0%,transparent 100%)',
            pointerEvents:'none',
          }}/>
          {/* leading edge dot */}
          <div style={{
            position:'absolute',top:'50%',left:`${pct}%`,
            transform:'translate(-50%,-50%)',
            width:8,height:8,borderRadius:'50%',
            background:'white',
            boxShadow:'0 0 6px white, 0 0 12px #ff7828, 0 0 24px rgba(255,120,40,0.8)',
            display: pct>0 && pct<100 ? 'block' : 'none',
          }}/>
        </div>
      )}

      {/* ── Sticky header ── */}
      <header style={{
        position:'sticky',top:0,zIndex:100,
        padding:`0 ${pad}`,
        height:isMobile?48:54,
        display:'flex',alignItems:'center',justifyContent:'space-between',
        borderBottom:'1px solid var(--border)',
        backdropFilter:'blur(20px)',
        background:'rgba(6,6,8,0.93)',
        gap:8,
        boxShadow: isRunning
          ? '0 2px 24px rgba(255,120,40,0.18), 0 1px 0 rgba(255,120,40,0.25)'
          : isDone
            ? '0 2px 16px rgba(57,232,122,0.12)'
            : 'none',
        transition:'box-shadow 0.5s ease',
      }}>
        <div style={{display:'flex',alignItems:'center',gap:isMobile?6:12,minWidth:0,flex:1}}>
          <button className="btn btn-ghost" onClick={()=>setView('home')}
            style={{padding:isMobile?'4px 8px':'5px 12px',fontSize:9,letterSpacing:1,flexShrink:0}}>
            <ArrowLeft size={10}/>{!isMobile&&' BACK'}
          </button>
          <div style={{display:'flex',alignItems:'center',gap:7,minWidth:0,flex:1}}>
            {/* Pulsing indicator */}
            {isRunning && (
              <div style={{position:'relative',width:14,height:14,flexShrink:0}}>
                <div style={{position:'absolute',inset:0,borderRadius:'50%',background:'rgba(255,120,40,0.2)',animation:'ping 1.2s ease-out infinite'}}/>
                <div style={{position:'absolute',inset:'20%',borderRadius:'50%',background:'var(--orange)',
                  boxShadow:'0 0 6px var(--orange),0 0 14px rgba(255,120,40,0.6)'}}/>
              </div>
            )}
            {isDone && <CheckCircle2 size={13} style={{color:'var(--green)',flexShrink:0,filter:'drop-shadow(0 0 5px var(--green))'}}/>}
            <span style={{
              fontFamily:'var(--display)',fontSize:isMobile?8:10,fontWeight:700,
              letterSpacing:isMobile?1:2,
              color:isRunning?'var(--orange2)':isDone?'var(--green)':'var(--text)',
              overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',
              textShadow:isRunning?'0 0 12px rgba(255,120,40,0.5)':isDone?'0 0 10px rgba(57,232,122,0.4)':'none',
              transition:'color 0.4s,text-shadow 0.4s',
            }}>
              {isRunning?(isMobile?'RUNNING…':'EXTRACTING DATA…'):isDone?'MISSION COMPLETE':'STANDBY'}
            </span>
            {activeJob && !isMobile && <StatusBadge status={activeJob.status}/>}
          </div>
        </div>
        <div style={{display:'flex',gap:5,flexShrink:0}}>
          {isDone && (
            <>
              <select
                value={exportFormat}
                onChange={e=>setExportFormat(e.target.value)}
                style={{
                  background:'rgba(6,6,8,0.95)',
                  border:'1px solid var(--border2)',
                  color:'var(--orange2)',
                  fontFamily:'var(--mono)',
                  fontSize:9,
                  borderRadius:3,
                  padding:isMobile?'4px 6px':'5px 10px',
                  cursor:'pointer',
                  outline:'none',
                }}>
                {EXPORT_FORMATS.map(f=>(
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
              <button className="btn btn-ghost" onClick={()=>handleDownload()}
                style={{padding:isMobile?'4px 8px':'5px 12px',fontSize:9}}>
                <Download size={10}/>{!isMobile&&' EXPORT'}
              </button>
              <button className="btn btn-ghost" onClick={()=>setScheduleView(v=>!v)}
                style={{padding:isMobile?'4px 8px':'5px 12px',fontSize:9,
                  borderColor: scheduleView ? 'var(--cyan)' : undefined,
                  color: scheduleView ? 'var(--cyan)' : undefined}}>
                <CalendarClock size={10}/>{!isMobile&&' SCHEDULES'}
              </button>
            </>
          )}
          {isRunning && (
            <button className="btn btn-danger" onClick={handleCancel}
              style={{padding:isMobile?'4px 8px':'5px 12px',fontSize:9}}>
              <X size={10}/>{!isMobile&&' ABORT'}
            </button>
          )}
          <button className="btn btn-ghost" onClick={()=>setView('home')}
            style={{padding:isMobile?'4px 8px':'5px 12px',fontSize:9}}>
            <RefreshCw size={10}/>{!isMobile&&' NEW'}
          </button>
        </div>
      </header>

      {/* Mobile running strip */}
      {isRunning && isMobile && (
        <div style={{
          background:'rgba(255,120,40,0.07)',
          borderBottom:'1px solid rgba(255,120,40,0.2)',
          padding:'7px 12px',
          display:'flex',alignItems:'center',justifyContent:'space-between',
          fontFamily:'var(--mono)',fontSize:10,
        }}>
          <div style={{display:'flex',alignItems:'center',gap:7}}>
            <Loader2 size={10} className="spin" style={{color:'var(--orange)'}}/>
            <span style={{color:'var(--orange2)'}}>{progress.completed}/{progress.total} extracted</span>
          </div>
          <span style={{color:'var(--orange)',fontWeight:700}}>{pct}%</span>
        </div>
      )}

      <div style={{maxWidth:1320,margin:'0 auto',padding:pad,position:'relative',zIndex:1}}>

        {/* Phase 5: Schedules panel — shown when SCHEDULES button is active */}
        {scheduleView && isDone && (
          <div style={{marginBottom:16}}>
            <SchedulesView
              onBack={() => setScheduleView(false)}
              target={target}
              dataType={dataType}
              maxItems={maxItems}
              concurrency={concurrency}
              fieldConfig={fieldConfig}
              cleaningConfig={cleaningConfig}
              exportFormat={exportFormat}
              isMobile={isMobile}
            />
          </div>
        )}

        {/* Stats */}
        <div style={{
          display:'grid',
          gridTemplateColumns:isMobile?'repeat(2,1fr)':'repeat(4,1fr)',
          gap:isMobile?8:10,marginBottom:isMobile?8:12,
        }}>
          <StatCard label="SCRAPED"  value={progress.completed} color="var(--green)"/>
          <StatCard label="FAILED"   value={progress.failed}    color="var(--red)"/>
          <StatCard label="TOTAL"    value={progress.total}     color="var(--orange2)"/>
          <StatCard label="PROGRESS" value={`${pct}%`}          color="var(--cyan)"/>
        </div>

        {/* Progress bar */}
        <div className="panel" style={{padding:isMobile?'10px 12px':'12px 16px',marginBottom:isMobile?8:12}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:7}}>
            <div className="sec-label" style={{fontSize:7}}>EXTRACTION PROGRESS</div>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <span style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--orange)'}}>
                {progress.completed}/{progress.total}
              </span>
              {!isMobile && <ProgressRing pct={pct} size={38} stroke={3}/>}
            </div>
          </div>
          <div style={{height:isMobile?3:4,background:'rgba(255,120,40,0.08)',borderRadius:2,overflow:'hidden'}}>
            <div style={{
              height:'100%',width:`${pct}%`,
              background:'linear-gradient(90deg,#ff5500,#ff7828,#00e5cc)',
              borderRadius:2,transition:'width 0.7s ease',
              boxShadow:'0 0 10px rgba(255,120,40,0.5)',
              position:'relative',overflow:'hidden',
            }}>
              {isRunning && <div style={{
                position:'absolute',inset:0,
                background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.25),transparent)',
                animation:'scanline 1.2s linear infinite',
              }}/>}
            </div>
          </div>
        </div>

        {/* Main layout */}
        <div style={{
          display:'grid',
          gridTemplateColumns:isTablet?'1fr':'1fr 310px',
          gap:isMobile?8:12,
        }}>
          {/* LEFT */}
          <div style={{display:'flex',flexDirection:'column',gap:isMobile?8:12,minWidth:0}}>

            {/* Tabs */}
            <div className="panel" style={{padding:0,overflow:'hidden'}}>
              <div style={{display:'flex',borderBottom:'1px solid var(--border)',overflowX:'auto'}}>
                {[
                  {id:'preview',label:isMobile?'TABLE':'DATA TABLE',   icon:Database},
                  {id:'log',    label:isMobile?'LOG':'SYS LOG',        icon:Terminal},
                  {id:'urls',   label:isMobile?`×${urls.length}`:`URLS ×${urls.length}`, icon:Globe},
                ].map(({id,label,icon:Icon})=>(
                  <button key={id} onClick={()=>setActiveTab(id)} style={{
                    padding:isMobile?'9px 0':'11px 16px',
                    background:'none',border:'none',
                    borderBottom:`2px solid ${activeTab===id?'var(--orange)':'transparent'}`,
                    color:activeTab===id?'var(--orange2)':'var(--text3)',
                    cursor:'pointer',
                    fontFamily:'var(--mono)',fontSize:isMobile?8:9,
                    fontWeight:700,letterSpacing:1,textTransform:'uppercase',
                    display:'flex',alignItems:'center',justifyContent:'center',gap:5,
                    marginBottom:-1,transition:'all 0.2s',whiteSpace:'nowrap',
                    flex: isMobile ? 1 : 'none',
                    minWidth: isMobile ? 0 : 'auto',
                  }}>
                    <Icon size={10}/>{label}
                  </button>
                ))}
              </div>
              <div style={{padding:isMobile?10:16}}>
                {activeTab==='preview' && <DataTable results={sampleResults} jobDone={isDone} fieldConfig={fieldConfig}/>}
                {activeTab==='log'     && <TerminalLog events={events}/>}
                {activeTab==='urls'    && (
                  <div className="sb" style={{maxHeight:isMobile?220:280,overflowY:'auto'}}>
                    {urls.slice(0,200).map((u,i)=>(
                      <div key={i} style={{
                        display:'flex',gap:8,padding:'4px 0',
                        borderBottom:'1px solid rgba(255,120,40,0.05)',
                        fontFamily:'var(--mono)',fontSize:isMobile?9:10,color:'var(--text2)',
                        animation:'fadeUp 0.2s ease both',
                        animationDelay:`${Math.min(i*10,300)}ms`,
                      }}>
                        <span style={{color:'var(--orange3)',minWidth:20,flexShrink:0}}>{i+1}</span>
                        <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{u}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Tablet/mobile: show sidebar panels in a grid below tabs */}
            {isTablet && (
              <>
                <div style={{
                  display:'grid',
                  gridTemplateColumns:isMobile?'1fr':'repeat(2,1fr)',
                  gap:isMobile?8:12,
                }}>
                  {/* Target */}
                  <div className="panel" style={{padding:isMobile?10:14}}>
                    <div className="sec-label" style={{fontSize:7,marginBottom:8}}>
                      <ChevronRight size={9} style={{color:'var(--orange)'}}/> TARGET
                    </div>
                    <div style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--text2)',wordBreak:'break-all',lineHeight:1.6}}>
                      {target.length>100?target.substring(0,100)+'…':target}
                    </div>
                    <div style={{marginTop:8,display:'flex',gap:5,flexWrap:'wrap'}}>
                      <span className="tag tag-orange">{dataType}</span>
                      <span className="tag tag-orange">×{maxItems}</span>
                      <span className="tag tag-orange">C:{concurrency}</span>
                    </div>
                  </div>
                  {/* AIMD */}
                  <div className="panel" style={{padding:isMobile?10:14}}>
                    <div className="sec-label" style={{fontSize:7,marginBottom:10}}>
                      <Activity size={9} style={{color:'var(--orange)'}}/> AIMD CONTROLLER
                    </div>
                    <RateGauge rateStatus={rateStatus}/>
                  </div>
                </div>

                {/* Pipeline — compact grid on mobile/tablet */}
                <div className="panel" style={{padding:isMobile?10:14}}>
                  <div className="sec-label" style={{fontSize:7,marginBottom:10}}>
                    <Cpu size={9} style={{color:'var(--orange)'}}/> PIPELINE STATUS
                  </div>
                  <div style={{
                    display:'grid',
                    gridTemplateColumns:isMobile?'repeat(2,1fr)':'repeat(4,1fr)',
                    gap:6,
                  }}>
                    {[
                      {label:'URL DISCOVERY',  done:urls.length>0},
                      {label:'BROWSER INIT',   done:progress.completed+progress.failed>0},
                      {label:'STEALTH',        done:progress.completed+progress.failed>0},
                      {label:'FETCH',          done:progress.completed>0,active:isRunning},
                      {label:'RATE ADAPT',     done:Object.keys(rateStatus).length>0,active:isRunning},
                      {label:'STRUCTURING',    done:sampleResults.length>0},
                      {label:'EXPORT',         done:isDone},
                    ].map(({label,done,active})=>(
                      <div key={label} style={{
                        padding:'7px 8px',
                        background:done?'rgba(57,232,122,0.06)':active?'rgba(255,120,40,0.08)':'rgba(255,255,255,0.02)',
                        border:`1px solid ${done?'rgba(57,232,122,0.2)':active?'rgba(255,120,40,0.25)':'rgba(255,255,255,0.05)'}`,
                        borderRadius:3,display:'flex',alignItems:'center',gap:5,
                        transition:'all 0.35s',
                      }}>
                        {done
                          ? <CheckCircle2 size={9} style={{color:'var(--green)',flexShrink:0}}/>
                          : active
                            ? <Loader2 size={9} className="spin" style={{color:'var(--orange)',flexShrink:0}}/>
                            : <Clock size={9} style={{color:'var(--text3)',flexShrink:0}}/>
                        }
                        <span style={{
                          fontFamily:'var(--mono)',fontSize:8,letterSpacing:0.5,
                          color:done?'var(--green)':active?'var(--orange2)':'var(--text3)',
                          fontWeight:done||active?700:400,
                        }}>{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* RIGHT sidebar — desktop only */}
          {!isTablet && (
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              <div className="panel" style={{padding:14}}>
                <div className="sec-label" style={{fontSize:7,marginBottom:10}}>
                  <ChevronRight size={10} style={{color:'var(--orange)'}}/> TARGET
                </div>
                <div style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--text2)',wordBreak:'break-all',lineHeight:1.6}}>
                  {target}
                </div>
                <div style={{marginTop:10,display:'flex',gap:5,flexWrap:'wrap'}}>
                  <span className="tag tag-orange">{dataType}</span>
                  <span className="tag tag-orange">×{maxItems}</span>
                  <span className="tag tag-orange">C:{concurrency}</span>
                  {Object.values(cleaningConfig).filter(Boolean).length > 0 && (
                    <span className="tag tag-cyan">
                      {Object.values(cleaningConfig).filter(Boolean).length} CLEANING OPS
                    </span>
                  )}
                </div>
              </div>
              <div className="panel" style={{padding:14}}>
                <div className="sec-label" style={{fontSize:7,marginBottom:12}}>
                  <Activity size={10} style={{color:'var(--orange)'}}/> AIMD CONTROLLER
                </div>
                <RateGauge rateStatus={rateStatus}/>
              </div>
              <div className="panel" style={{padding:14}}>
                <div className="sec-label" style={{fontSize:7,marginBottom:12}}>
                  <Cpu size={10} style={{color:'var(--orange)'}}/> PIPELINE STATUS
                </div>
                <PipelineSteps steps={[
                  {label:'URL DISCOVERY',    done:urls.length>0},
                  {label:'BROWSER INIT',     done:progress.completed+progress.failed>0},
                  {label:'STEALTH PROFILE',  done:progress.completed+progress.failed>0},
                  {label:'CONTENT FETCH',    done:progress.completed>0,active:isRunning},
                  {label:'RATE ADAPTATION',  done:Object.keys(rateStatus).length>0,active:isRunning},
                  {label:'DATA STRUCTURING', done:sampleResults.length>0},
                  {label:'CLEANING',         done:isDone && Object.entries(cleaningConfig).some(([k,v])=>k==='max_text_len'?v>0:Boolean(v)), active:false},
                  {label:'EXPORT READY',     done:isDone},
                ]}/>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function clamp_str(min, max) { return `clamp(${min}px,4vw,${max}px)` }