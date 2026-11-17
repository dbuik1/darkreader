import {writeFileSync} from 'fs';
const out = new URL('./', import.meta.url).pathname;
const I = {
 side:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/>',
 minus:'<path d="M5 12h14"/>', plus:'<path d="M5 12h14M12 5v14"/>',
 search:'<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/>',
 up:'<path d="M6 15l6-6 6 6"/>', down:'<path d="M6 9l6 6 6-6"/>',
 more:'<circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/>',
 print:'<path d="M7 9V4h10v5M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2"/><rect x="7" y="14" width="10" height="6"/>',
 dl:'<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
 x:'<path d="M6 6l12 12M18 6L6 18"/>',
 list:'<path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/>',
 grid:'<rect x="4" y="3" width="7" height="9"/><rect x="13" y="3" width="7" height="9"/><rect x="4" y="14" width="7" height="7"/><rect x="13" y="14" width="7" height="7"/>',
 rotate:'<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>',
 full:'<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
};
const svg = (n,s=20)=>`<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[n]}</svg>`;
const ib = (n,label,extra='')=>`<button type="button" class="ib${extra}" aria-label="${label}" title="${label}">${svg(n)}</button>`;
const page = (h, w, opts={}) => {
  const lines = (n, wd=[92,88,95,70]) => Array.from({length:n},(_,i)=>`<div class="ln" style="width: ${wd[i%wd.length]}%"></div>`).join('');
  return `<div class="pg" style="width: ${w}px; height: ${h}px">
<div class="hd" style="width: 46%"></div>${lines(4)}
${opts.chart===false?'':`<div class="chart"><div class="bar" style="height: 55%; background: #6f9bff"></div><div class="bar" style="height: 85%; background: #ff8a80"></div><div class="bar" style="height: 45%; background: #2fa05a"></div></div>`}
${lines(3)}${opts.photo?'<div class="photo"></div>':''}</div>`;
};
const thumb = (n, cur) => `<a href="#" class="th${cur?' cur':''}" aria-label="Page ${n}"${cur?' aria-current="page"':''}><span class="tp"><span class="tl" style="width: 60%"></span><span class="tl"></span><span class="tl" style="width: 80%"></span><span class="tl"></span></span><span class="tn">${n}</span></a>`;
const thumbs = (from, to, cur) => Array.from({length:to-from+1},(_,i)=>thumb(from+i, from+i===cur)).join('');
const outline = `<ol class="toc">
<li><a href="#">Summary</a><span class="pgn">1</span></li>
<li class="on"><a href="#" aria-current="true">Results</a><span class="pgn">3</span></li>
<li class="sub"><a href="#">Sales by region</a><span class="pgn">4</span></li>
<li class="sub"><a href="#">Customer growth</a><span class="pgn">7</span></li>
<li><a href="#">Costs</a><span class="pgn">11</span></li>
<li><a href="#">Outlook</a><span class="pgn">18</span></li>
<li><a href="#">Appendix</a><span class="pgn">21</span></li></ol>`;
const tabs = (active) => `<div class="tabs" role="tablist"><button type="button" role="tab" class="tab${active==='pages'?' on':''}" aria-selected="${active==='pages'}">Pages</button><button type="button" role="tab" class="tab${active==='contents'?' on':''}" aria-selected="${active==='contents'}">Contents</button></div>`;
const zoom = `<div class="grp">${ib('minus','Zoom out')}<button type="button" class="sel">Fit width ${svg('down',16)}</button>${ib('plus','Zoom in')}</div>`;
const pageNum = `<div class="grp"><label class="sr" for="pn">Page</label><input id="pn" class="num" value="3" inputmode="numeric"><span class="mut">of 24</span></div>`;
const menu = (items) => `<div class="menu" role="menu">${items.map(i=>i==='-'?'<div class="sep"></div>':`<button type="button" role="menuitem" class="mi">${i[0]?svg(i[0],18):'<span style="width: 18px"></span>'}<span>${i[1]}</span>${i[2]?`<span class="kbd">${i[2]}</span>`:''}</button>`).join('')}</div>`;
const fullMenu = [['rotate','Rotate','R'],['grid','Two-page view'],['full','Present'],'-',['dl','Download','Ctrl+S'],['print','Print','Ctrl+P'],'-',['','Original colours'],['','Properties'],['','Open in browser viewer']];
const find = (q=true)=>`<form class="find" role="search"><label class="sr" for="fq">Find</label>${svg('search',18)}<input id="fq" class="fq" value="${q?'revenue':''}"><span class="mut">${q?'2 of 9':''}</span>${ib('up','Previous match')}${ib('down','Next match')}</form>`;

const css = `body{margin:0}
.ab{width:1400px;height:700px;box-sizing:border-box;padding:30px;display:flex;gap:40px;align-items:flex-start;background:#07090b;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#eef1f4;font-size:15px;line-height:1.4}
.d,.p{position:relative;overflow:hidden;background:#111418;border:1px solid #2d343c;border-radius:10px;display:flex;flex-direction:column}
.d{width:960px;height:600px}.p{width:340px;height:640px;border-radius:24px}
.ib{width:44px;height:44px;flex:none;display:inline-flex;align-items:center;justify-content:center;background:transparent;color:#eef1f4;border:0;border-radius:8px;padding:0;font:inherit}
.ib.on{background:#232a31;color:#8fd3e8}
.grp{display:flex;align-items:center;gap:4px}
.sel{height:36px;display:inline-flex;align-items:center;gap:6px;background:#111418;color:#eef1f4;border:1px solid #7d8894;border-radius:8px;padding:0 10px;font:inherit;font-size:14px}
.num{width:40px;height:34px;box-sizing:border-box;background:#111418;color:#eef1f4;border:1px solid #7d8894;border-radius:8px;text-align:center;font:inherit;font-size:14px}
.mut{color:#b3bcc6;font-size:14px;white-space:nowrap}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}
.bar0{display:flex;align-items:center;gap:8px;padding:2px 8px;background:#1b2026;border-bottom:1px solid #2d343c;flex:none}
.sp{flex:1}
.title{font-size:14px;color:#eef1f4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:220px}
.stage{flex:1;min-height:0;display:flex;position:relative}
.pages{flex:1;min-width:0;overflow:hidden;display:flex;flex-direction:column;align-items:center;gap:16px;padding:16px 0;background:#111418}
.pg{flex:none;box-sizing:border-box;background:#1c1c1c;box-shadow:0 0 0 1px #232a31;padding:6% 8%;display:flex;flex-direction:column;gap:9px;overflow:hidden}
.hd{height:16px;background:#d9dde2;border-radius:2px;margin-bottom:6px}
.ln{height:7px;background:#8e959c;border-radius:2px}
.chart{height:90px;display:flex;align-items:flex-end;gap:14px;border-bottom:1px solid #d9dde2;width:45%;margin:8px 0}
.bar{width:26px}
.photo{height:80px;width:60%;background:linear-gradient(#dfe5ee,#b8c9e6);border-radius:2px}
.panel{width:200px;flex:none;background:#1b2026;border-right:1px solid #2d343c;display:flex;flex-direction:column;min-height:0}
.panel.r{border-right:0;border-left:1px solid #2d343c;width:260px}
.tabs{display:flex;gap:4px;padding:8px}
.tab{flex:1;height:36px;background:transparent;color:#b3bcc6;border:0;border-radius:8px;font:inherit;font-size:14px}
.tab.on{background:#232a31;color:#eef1f4;box-shadow:inset 0 -2px 0 #8fd3e8}
.ths{display:flex;flex-direction:column;align-items:center;gap:12px;padding:8px;overflow:hidden}
.th{display:flex;flex-direction:column;align-items:center;gap:4px;text-decoration:none;color:#b3bcc6;font-size:13px}
.tp{width:84px;height:108px;box-sizing:border-box;background:#1c1c1c;box-shadow:0 0 0 1px #3a424b;padding:10px 9px;display:flex;flex-direction:column;gap:5px}
.th.cur .tp{box-shadow:0 0 0 3px #8fd3e8}.th.cur{color:#8fd3e8}
.tl{display:block;height:4px;background:#8e959c}
.toc{list-style:none;margin:0;padding:4px 8px;display:flex;flex-direction:column}
.toc li{display:flex;align-items:center;min-height:40px;padding:0 8px;border-radius:8px;font-size:14px}
.toc li a{flex:1;color:#eef1f4;text-decoration:none}
.toc li.sub{padding-left:22px}.toc li.sub a{color:#b3bcc6}
.toc li.on{background:#232a31}.toc li.on a{color:#8fd3e8}
.pgn{color:#b3bcc6;font-size:13px}
.menu{position:absolute;background:#232a31;border:1px solid #4a545f;border-radius:10px;padding:6px;display:flex;flex-direction:column;width:250px;box-shadow:0 12px 32px rgba(0,0,0,.5);z-index:3}
.mi{display:flex;align-items:center;gap:12px;height:40px;padding:0 10px;background:transparent;border:0;border-radius:6px;color:#eef1f4;font:inherit;font-size:14px;text-align:left}
.mi span:nth-child(2){flex:1}
.kbd{color:#b3bcc6;font-size:12px}
.sep{height:1px;background:#4a545f;margin:4px 6px}
.find{display:flex;align-items:center;gap:6px;height:40px;background:#111418;border:1px solid #7d8894;border-radius:8px;padding:0 0 0 10px;color:#b3bcc6}
.fq{width:110px;background:transparent;border:0;color:#eef1f4;font:inherit;font-size:14px}
.find .ib{width:36px;height:38px}
.panel .fq{width:72px}
.dock{position:absolute;left:50%;transform:translateX(-50%);bottom:16px;display:flex;align-items:center;gap:6px;background:#232a31;border:1px solid #4a545f;border-radius:999px;padding:4px 10px;box-shadow:0 10px 28px rgba(0,0,0,.5)}
.vsep{width:1px;height:24px;background:#4a545f}
.rail{width:56px;flex:none;background:#1b2026;border-right:1px solid #2d343c;display:flex;flex-direction:column;align-items:center;gap:4px;padding:8px 0}
.badge{position:absolute;right:16px;bottom:16px;background:#232a31;border:1px solid #4a545f;border-radius:999px;padding:6px 12px;font-size:13px;color:#eef1f4}
.res{display:flex;flex-direction:column;gap:2px;padding:4px 8px}
.res a{display:block;padding:8px;border-radius:8px;color:#eef1f4;text-decoration:none;font-size:13px}
.res a.on{background:#232a31}
.res b{color:#ffd166;font-weight:600}
.res .pgl{display:block;color:#b3bcc6;font-size:12px}
.ph{font-size:13px;color:#b3bcc6;padding:12px 16px 4px;font-weight:600}
.scrub{position:absolute;right:6px;top:12px;bottom:12px;width:24px;display:flex;flex-direction:column;align-items:center}
.track{flex:1;width:4px;background:#2d343c;border-radius:2px;position:relative}
.knob{position:absolute;left:-8px;width:20px;height:36px;background:#8fd3e8;border-radius:10px}
.tick{position:absolute;left:-4px;width:12px;height:2px;background:#7d8894}
.pop{position:absolute;right:40px;display:flex;align-items:center;gap:10px;background:#232a31;border:1px solid #4a545f;border-radius:10px;padding:8px 12px 8px 8px;box-shadow:0 10px 28px rgba(0,0,0,.5)}
.cmd{display:flex;align-items:center;gap:8px;height:40px;width:380px;background:#111418;border:1px solid #8fd3e8;border-radius:10px;padding:0 12px;color:#b3bcc6}
.cmd input{flex:1;background:transparent;border:0;color:#eef1f4;font:inherit;font-size:14px}
.drop{position:absolute;top:50px;left:50%;transform:translateX(-50%);width:420px;background:#232a31;border:1px solid #4a545f;border-radius:10px;padding:6px;box-shadow:0 12px 32px rgba(0,0,0,.5);z-index:3}
.drop .ph{padding:8px 10px 4px}
.strip{flex:none;display:flex;gap:10px;padding:8px 12px;background:#1b2026;border-top:1px solid #2d343c;overflow:hidden;align-items:center}
.strip .tp{width:44px;height:56px;padding:6px 5px;gap:3px}
.strip .tl{height:2px}
.strip .th{font-size:12px}
.sheet{position:absolute;left:0;right:0;bottom:0;background:#1b2026;border-top:1px solid #4a545f;border-radius:16px 16px 0 0;box-shadow:0 -10px 28px rgba(0,0,0,.5);display:flex;flex-direction:column;z-index:3}
.grab{width:36px;height:4px;border-radius:2px;background:#7d8894;margin:8px auto 0}
.tabbar{flex:none;display:flex;justify-content:space-around;background:#1b2026;border-top:1px solid #2d343c;padding:2px 0}
.chip{font-size:13px;color:#eef1f4;background:#232a31;border:1px solid #4a545f;border-radius:999px;padding:4px 10px}
.scrim{position:absolute;inset:0;background:rgba(0,0,0,.55);z-index:2}
`;
const wrap = (title, desktop, phone) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${title}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
<style>
${css}</style>
</helmet>
<div class="ab">
<div class="d">${desktop}</div>
<div class="p">${phone}</div>
</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{"$preview":{"width":1400,"height":700}}'>
class Component extends DCLogic {
renderVals() {
return {};
}
}
</script>
</body>
</html>
`;
const phonePages = (n=2) => `<div class="pages" style="padding: 10px 0; gap: 10px">${page(300,320,{photo:false})}${page(300,320,{chart:false,photo:true})}</div>`;
const deskPages = (w=600) => `<div class="pages">${page(560,w)}</div>`;
const boards = {};

// A: classic top bar + left panel
boards['A-top-bar.dc.html'] = ['A – Top bar and side panel', wrap('Top bar and side panel',
`<header class="bar0">${ib('side','Hide pages panel',' on')}<span class="title">Annual report 2025</span><span class="sp"></span>${pageNum}<span class="vsep"></span>${zoom}<span class="sp"></span>${ib('search','Find (Ctrl+F)')}${ib('print','Print (Ctrl+P)')}${ib('more','More')}</header>
<div class="stage"><nav class="panel" aria-label="Pages">${tabs('pages')}<div class="ths">${thumbs(1,4,3)}</div></nav>${deskPages(560)}
<div style="position: absolute; right: 12px; top: 4px; width: 250px; z-index: 3">${menu(fullMenu.filter(i=>i==='-'||i[1]!=='Print'))}</div></div>`,
`<header class="bar0" style="padding: 2px 4px">${ib('side','Show pages')}<span class="mut" style="color: #eef1f4">3 of 24</span><span class="sp"></span>${ib('search','Find')}${ib('more','More')}</header>
<div class="stage">${phonePages()}<div class="scrim"></div><div class="sheet" style="top: 80px">${'<div class="grab"></div>'}${tabs('contents')}${outline}</div></div>`)];

// B: floating dock
boards['B-floating-dock.dc.html'] = ['B – Floating dock', wrap('Floating dock',
`<div class="stage">${deskPages(640)}
<nav class="panel" aria-label="Contents" style="position: absolute; left: 12px; top: 12px; bottom: 84px; border: 1px solid #4a545f; border-radius: 12px; width: 230px; z-index: 2; box-shadow: 0 10px 28px rgba(0,0,0,.5)">${tabs('contents')}${outline}</nav>
<div class="dock">${ib('side','Hide contents',' on')}<span class="vsep"></span>${pageNum}<span class="vsep"></span>${zoom}<span class="vsep"></span>${ib('search','Find (Ctrl+F)')}${ib('more','More')}</div></div>`,
`<div class="stage">${phonePages()}<div class="dock" style="bottom: 12px; gap: 2px; padding: 4px 6px">${ib('side','Pages and contents')}<span class="mut" style="color: #eef1f4; padding: 0 6px">3 / 24</span>${ib('search','Find')}${ib('more','More')}</div></div>`)];

// C: left rail with panels; find results listed
boards['C-left-rail.dc.html'] = ['C – Tool rail', wrap('Tool rail',
`<div class="stage"><nav class="rail" aria-label="PDF tools">${ib('grid','Pages')}${ib('list','Contents')}${ib('search','Find',' on')}<span style="height: 12px"></span>${ib('plus','Zoom in')}${ib('minus','Zoom out')}<span class="sp"></span>${ib('print','Print')}${ib('more','More')}</nav>
<section class="panel" aria-label="Find" style="width: 260px"><div style="padding: 10px">${find()}</div><div class="ph">9 matches</div><div class="res"><a href="#">Total <b>revenue</b> rose to £4.2m<span class="pgl">Page 1</span></a><a href="#" class="on" aria-current="true"><b>Revenue</b> by region, 2025<span class="pgl">Page 3</span></a><a href="#">North grew fastest in <b>revenue</b><span class="pgl">Page 4</span></a><a href="#">Recurring <b>revenue</b> now 61%<span class="pgl">Page 7</span></a></div></section>
${deskPages(520)}<span class="badge">Page 3 of 24</span></div>`,
`<div class="stage">${phonePages()}<span class="badge" style="bottom: 12px; right: 12px">3 / 24</span></div><nav class="tabbar" aria-label="PDF tools">${ib('grid','Pages')}${ib('list','Contents')}${ib('search','Find')}${ib('more','More')}</nav>`)];

// D: scrubber
boards['D-page-scrubber.dc.html'] = ['D – Page scrubber', wrap('Page scrubber',
`<header class="bar0"><span class="title" style="padding-left: 8px">Annual report 2025</span><span class="sp"></span>${find(false)}${ib('more','More')}</header>
<div class="stage">${deskPages(640)}
<div class="scrub" aria-hidden="true"><div class="track">${[8,30,52,74,92].map(t=>`<span class="tick" style="top: ${t}%"></span>`).join('')}<span class="knob" style="top: 10%"></span></div></div>
<div class="pop" style="top: 34px">${thumb(3,true)}<div style="display: flex; flex-direction: column; gap: 2px"><span style="font-size: 14px">Page 3 of 24</span><span class="mut">Results</span></div></div>
<div class="dock" style="left: auto; right: 44px; transform: none; padding: 4px">${ib('minus','Zoom out')}<button type="button" class="sel" style="border: 0">Fit width</button>${ib('plus','Zoom in')}</div></div>`,
`<header class="bar0" style="padding: 2px 4px"><span class="title" style="padding-left: 8px; max-width: 180px">Annual report 2025</span><span class="sp"></span>${ib('search','Find')}${ib('more','More')}</header>
<div class="stage">${phonePages()}<div class="scrub" aria-hidden="true"><div class="track"><span class="knob" style="top: 10%"></span></div></div><div class="pop" style="top: 30px; right: 36px; padding: 8px 12px"><span style="font-size: 14px">Page 3 of 24</span></div></div>`)];

// E: one box + filmstrip
boards['E-one-box.dc.html'] = ['E – One box', wrap('One box',
`<header class="bar0" style="justify-content: center; padding: 6px 8px">${ib('grid','Hide page strip',' on')}<span class="sp"></span><label class="cmd">${svg('search',18)}<span class="sr">Find or go to page</span><input value="res"></label><span class="sp"></span>${zoom}${ib('more','More')}</header>
<div class="stage">${deskPages(600)}
<div class="drop" role="listbox"><div class="ph">Sections</div><button type="button" class="mi" style="width: 100%"><span></span><span>Results</span><span class="kbd">Page 3</span></button><div class="ph">Text, 14 matches</div><button type="button" class="mi" style="width: 100%"><span></span><span>Total revenue rose to £4.2m</span><span class="kbd">Page 1</span></button><button type="button" class="mi" style="width: 100%"><span></span><span>Results by region, 2025</span><span class="kbd">Page 3</span></button></div></div>
<nav class="strip" aria-label="Pages">${thumbs(1,12,3)}</nav>`,
`<header class="bar0" style="padding: 6px"><label class="cmd" style="width: auto; flex: 1">${svg('search',18)}<span class="sr">Find or go to page</span><input placeholder="Find or go to page"></label>${ib('more','More')}</header>
<div class="stage">${phonePages()}</div><nav class="strip" aria-label="Pages">${thumbs(1,5,3)}</nav>`)];

// F: right side panel
boards['F-right-panel.dc.html'] = ['F – Reading panel on the right', wrap('Reading panel on the right',
`<header class="bar0"><span class="title" style="padding-left: 8px">Annual report 2025</span><span class="sp"></span>${pageNum}<span class="vsep"></span>${zoom}<span class="vsep"></span>${ib('side','Hide panel',' on')}${ib('more','More')}</header>
<div class="stage">${deskPages(560)}<aside class="panel r" aria-label="Contents and find"><div style="padding: 10px 10px 0">${find(false)}</div>${tabs('contents')}${outline}</aside></div>`,
`<header class="bar0" style="padding: 2px 4px"><span class="mut" style="color: #eef1f4; padding-left: 8px">3 of 24</span><span class="sp"></span>${ib('side','Show panel')}${ib('more','More')}</header>
<div class="stage">${phonePages()}<div class="scrim"></div><div class="sheet" style="top: 120px"><div class="grab"></div><div style="padding: 10px">${find()}</div><div class="res"><a href="#">Total <b>revenue</b> rose to £4.2m<span class="pgl">Page 1</span></a><a href="#" class="on"><b>Revenue</b> by region, 2025<span class="pgl">Page 3</span></a></div></div></div>`)];

const notesText = {
 'A-top-bar.dc.html':'A – Top bar and side panel. Closest to Chrome: one bar across the top, thumbnails or contents in a panel on the left that pushes the pages over. Phone: the panel opens as a sheet.',
 'B-floating-dock.dc.html':'B – Floating dock. Pages use the whole window; one pill of controls floats at the bottom and fades while you scroll. Contents open as a card over the pages.',
 'C-left-rail.dc.html':'C – Tool rail. A slim icon rail on the left opens one panel at a time; find lists every match with its sentence. Phone: the rail becomes a bottom tab bar.',
 'D-page-scrubber.dc.html':'D – Page scrubber. No sidebar: drag the handle on the right edge and a preview shows the page and its section. Zoom floats bottom right.',
 'E-one-box.dc.html':'E – One box. A single field finds text, jumps to a page number or a section. A strip of page thumbnails runs along the bottom.',
 'F-right-panel.dc.html':'F – Reading panel on the right. Find, contents and pages share one panel on the right, open by default on wide screens. Phone: a bottom sheet.',
};
const keys = Object.keys(boards);
const canvas = {v:3,createdOnFiles:{v:1,at:new Date().toISOString()},title:'PDF viewer layouts',launch:{view:'canvas'},pages:[],boards:{},order:[],notes:{t:{x:0,y:-260,text:'PDF viewer – layout round',kind:'title1',maxW:2880}},designSystems:[]};
keys.forEach((k,i)=>{
  const col=i%2,row=Math.floor(i/2);
  const x=col*(1400+80+460), y=row*(700+120+120);
  canvas.boards[k]={x,y,w:1400,h:700,title:boards[k][0]};
  canvas.order.push(k);
  canvas.notes['n'+i]={x:x+1420,y:y,text:notesText[k],w:400,fill:'gray'};
  writeFileSync(out+k, boards[k][1]);
});
writeFileSync(out+'canvas.json', JSON.stringify(canvas,null,1));
