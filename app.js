/* ============================= */
/* First-Year Halloween Pickleball – app.js */
/* ============================= */

(function(){
  const REGIONS = ["NW","SW","NE","SE"];
  const REGION_NAMES = {NW:"Helaman", SW:"Riveria", NE:"Heritage", SE:"Wyview"};

  const $ = (sel, root=document)=>root.querySelector(sel);
  const $$ = (sel, root=document)=>Array.from(root.querySelectorAll(sel));

  const state = {
    title: "First-Year Halloween Pickleball — 64-Team Bracket",
    regionTeams: {},
    rounds: {},
    finals: { semi1:null, semi2:null, champ:null }
  };

  // -------------------------------
  // Manual placement (Y offsets in px)
  // -------------------------------
  const CUSTOM_LAYOUT = {
    enabled: true,
    regions: {
      NW: { 0:[0,40,80,120,160,200,240,280], 1:[50,180,320,460], 2:[135,440], 3:[305] },
      SW: { 0:[0,40,80,120,160,200,240,280], 1:[50,180,320,460], 2:[135,440], 3:[305] },
      NE: { 0:[0,40,80,120,160,200,240,280], 1:[50,180,320,460], 2:[135,440], 3:[305] },
      SE: { 0:[0,40,80,120,160,200,240,280], 1:[50,180,320,460], 2:[135,440], 3:[305] }
    },
    finals: {
      semi1: { y: 0 },
      semi2: { y: 0 },
      champ: { y: 0 }
    }
  };

  const SAMPLE = [
  "Kachow","Dynamos","The Oompaloompas","Dill With It","Dream Team",
  "Breakfast Bunch","The net villians","Holier Than Thou","BYU Barbies",
  "los chamos","Daphne and Velma","American Dawgs","The Things",
  "Paddles Up","Paddle Royale","Dumb and Dumber","The Dinkin’ Dead",
  "Sigma’s","Chugjug","The Minions","Kentucky Fried Champions",
  "Dragon slayers","Benito","Pumpkin Pickleballers","Lisan al-Gaib",
  "The Hamiltons","Dbd","Dink Dynasty","the turties","Pickled rats",
  "Holy Cow","The Lemurs of Madagascar","Double trouble","Tanner ans Ethan",
  "The Pickled Chefs","Mario Brothers","Men in black","Lit and Krunk",
  "Party players!","Waldo’s Dinks","Dragon Army","Team hippie",
  "Waldo and Wenda","California girls","Paddle Shmaddle","Fowl Play",
  "Salon salom","Frosty Fraternity","Pickled Prisoners","Graveyard Grip Masters",
  "67s","Kitchen is closed","Randomly assign","Asians","Team Kachow",
  "Big Dill Ballerz","Girlie-pops","The paddle princesses","Curious Canadians",
  "Spike on Muggles","Sticks","Route 66%","Soda pop","McKenya"
];

  /* ---------- Helpers ---------- */
  // Build Round of 64 in NCAA-style top-to-bottom order
function buildFirstRound(teamList) {
  // ensure teams are in seed order 1..16
  const bySeed = [...teamList].sort((a, b) => (a.seed || 0) - (b.seed || 0));

  const pattern = [
    [1,16],
    [8,9],
    [5,12],
    [4,13],
    [6,11],
    [3,14],
    [7,10],
    [2,15],
  ];

  return pattern.map(([s1, s2]) => ({
    team1: bySeed[s1 - 1],
    team2: bySeed[s2 - 1],
    winnerIndex: null,
    meta: { court: "", time: "" },
  }));
}

function buildRegionRounds(teamList){
  const first = buildFirstRound(teamList);      // ordered Round of 64
  const rounds = [ first ];

  let matches = 8;
  while (matches > 1) {
    matches = matches / 2;
    rounds.push(
      Array.from({ length: matches }, () => ({
        team1: null,
        team2: null,
        winnerIndex: null,
        meta: { court: "", time: "" },
      }))
    );
  }
  return rounds;
}

  function persist(){ try{ localStorage.setItem('fye_bracket_64', JSON.stringify(state)); }catch(e){} }
  function restore(){ try{ const raw = localStorage.getItem('fye_bracket_64'); if(!raw) return false; Object.assign(state, JSON.parse(raw)); return true; }catch(e){ return false; } }
  function hasBracket(){ return REGIONS.every(r => Array.isArray(state.rounds[r]) && state.rounds[r].length > 0); }

  /* ---------- URL Hash encode/decode ---------- */
  function encodeShare(){
    // Flatten all teams so finals can refer by index
    const allTeams = REGIONS.flatMap(r=> state.regionTeams[r]||[]);

    const minimal = {
      title: state.title,
      regionTeams: REGIONS.reduce((o,r)=>{ o[r] = (state.regionTeams[r]||[]).map(t=>t.name); return o; },{}),

      // rounds: include team indices + winner + meta (court/time)
      rounds: REGIONS.map(r=>{
        const teamList = state.regionTeams[r] || [];
        return (state.rounds[r]||[]).map(round => round.map(m=>{
          const t1 = m.team1 ? teamList.findIndex(tt=>tt.name===m.team1.name) : -1;
          const t2 = m.team2 ? teamList.findIndex(tt=>tt.name===m.team2.name) : -1;
          return {
            t1, t2,
            w: (typeof m.winnerIndex==='number'? m.winnerIndex : -1),
            mc: (m.meta?.court ?? ""),
            mt: (m.meta?.time ?? "")
          };
        }));
      }),

      // finals: same idea, but indices are into allTeams
      finals: ['semi1','semi2','champ'].map(k=>{
        const m = state.finals[k];
        if(!m) return null;
        const idx = t=> t? allTeams.findIndex(tt=>tt.name===t.name) : -1;
        return {
          t1: idx(m.team1),
          t2: idx(m.team2),
          w: (typeof m.winnerIndex==='number'? m.winnerIndex:-1),
          mc: (m.meta?.court ?? ""),
          mt: (m.meta?.time ?? "")
        };
      })
    };

    const json = JSON.stringify(minimal);
    const bytes = new TextEncoder().encode(json);
    const binary = Array.from(bytes,b=>String.fromCharCode(b)).join('');
    return '#b=' + btoa(binary);
  }

  function decodeShare(){
    if(!location.hash.startsWith('#b=')) return false;
    try{
      const b64 = location.hash.slice(3);
      const binary = atob(b64);
      const bytes = new Uint8Array([...binary].map(ch=>ch.charCodeAt(0)));
      const min = JSON.parse(new TextDecoder().decode(bytes));

      state.title = min.title || state.title;

      // rebuild region teams
      REGIONS.forEach(r=>{
        const names = min.regionTeams?.[r] || [];
        state.regionTeams[r] = names.map((n,i)=>({name:n, seed:i+1}));
      });

      // rebuild rounds with meta
      REGIONS.forEach((r, ri)=>{
        const encodedRounds = (min.rounds?.[ri] || []);
        const teamList = state.regionTeams[r] || [];
        state.rounds[r] = encodedRounds.map(round => round.map(m=>{
          const obj = {
            team1: m.t1>=0? teamList[m.t1] : null,
            team2: m.t2>=0? teamList[m.t2] : null,
            winnerIndex: (typeof m.w==='number' && m.w>=0)? m.w : null,
            meta: { court: m.mc || "", time: m.mt || "" }
          };
          return obj;
        }));
      });

      // finals with meta
      const allTeams = REGIONS.flatMap(r=> state.regionTeams[r]||[]);
      const finalsArr = min.finals || [];
      const keys = ['semi1','semi2','champ'];
      keys.forEach((k,i)=>{
        const fm = finalsArr[i];
        if(!fm){ state.finals[k]=null; return; }
        state.finals[k] = {
          team1: fm.t1>=0? allTeams[fm.t1]:null,
          team2: fm.t2>=0? allTeams[fm.t2]:null,
          winnerIndex: (typeof fm.w==='number' && fm.w>=0)? fm.w:null,
          meta: { court: fm.mc || "", time: fm.mt || "" }
        };
      });

      return true;
    }catch(e){ return false; }
  }

  /* ---------- Meta UI helpers ---------- */
  function metaBarHTML(meta){
    const c = meta?.court || "";
    const t = meta?.time || "";
    return `
      <div class="meta-bar">
        <span class="meta-label">Court</span>
        <span class="meta-edit" contenteditable="true" data-field="court" spellcheck="false" placeholder="—">${c}</span>
        <span class="meta-sep">•</span>
        <span class="meta-label">Time</span>
        <span class="meta-edit" contenteditable="true" data-field="time" spellcheck="false" placeholder="—">${t}</span>
      </div>`;
  }

  function wireMetaHandlers(cardEl, matchObj){
    const edits = cardEl.querySelectorAll('.meta-edit');
    edits.forEach(el=>{
      el.addEventListener('keydown', (e)=>{
        if(e.key === 'Enter'){
          e.preventDefault();
          el.blur();
        }
      });
      el.addEventListener('blur', ()=>{
        const field = el.dataset.field; // "court" or "time"
        matchObj.meta = matchObj.meta || {court:"", time:""};
        matchObj.meta[field] = el.textContent.trim();
        // persist + refresh share url without full re-render
        persist();
        const url = new URL(location.href);
        url.hash = encodeShare();
        const share = document.getElementById('shareUrl');
        if (share) share.value = url.toString();
      });
    });
  }

  /* ---------- Slot HTML ---------- */
  function slotHTML(team, winner){
    const wClass = (winner? ' winner':'');
    const seed = team?.seed? `#${team.seed}`:'';
    const name = team? team.name:'TBD';
    return `<div class="slot${wClass}"><div class="name">${name}</div><div class="seed">${seed}</div></div>`;
  }

  /* ---------- Rendering ---------- */
  function renderRegion(regionKey){
    const host = document.getElementById(`region-${regionKey}`);
    host.innerHTML='';
    const title = document.createElement('div');
    title.className='round-title';
    title.textContent=`${REGION_NAMES[regionKey]} Region`;
    host.appendChild(title);

    const rounds = state.rounds[regionKey]||[];
    rounds.forEach((round,rIdx)=>{
      const col = document.createElement('div');
      col.className='round';
      col.dataset.region=regionKey;
      col.dataset.round=rIdx;

      const rt=document.createElement('div'); rt.className='round-title';
      rt.textContent=['Round of 64','Round of 32','Spooky 16','Haunted Eight'][rIdx]||`Round ${rIdx+1}`;
      col.appendChild(rt);

      round.forEach((m,mIdx)=>{
        const card=document.createElement('div'); card.className='match'; card.dataset.match=mIdx;

        // meta header + slots
        card.innerHTML = metaBarHTML(m.meta) + (slotHTML(m.team1,m.winnerIndex===0)+slotHTML(m.team2,m.winnerIndex===1));
        wireMetaHandlers(card, m);

        // Clickable rows
        card.querySelectorAll('.slot').forEach((slotEl,i)=>{
          slotEl.addEventListener('click',()=>advanceRegion(regionKey,rIdx,mIdx,i,slotEl));
          const t=(i===0?m.team1:m.team2);
          if(!t) slotEl.style.pointerEvents='none';
        });
        col.appendChild(card);
      });
      host.appendChild(col);
    });
  }

  function renderFinals(){
    const make=(id,mObj)=>{
      const card=document.getElementById(id); 
      card.classList.add('match');
      card.innerHTML='';

      // Always show meta header (even if teams TBD)
      card.insertAdjacentHTML('afterbegin', metaBarHTML(mObj?.meta || {}));
      if (mObj) wireMetaHandlers(card, mObj);

      const makeSlot = (team, isWinner)=> {
        const el = document.createElement('div');
        el.className='slot'+(isWinner?' winner':'');
        el.innerHTML=`<div class="name">${team?team.name:'TBD'}</div><div class="seed">${team?.seed? '#'+team.seed:''}</div>`;
        return el;
      };

      const s1 = makeSlot(mObj?.team1, mObj?.winnerIndex===0);
      const s2 = makeSlot(mObj?.team2, mObj?.winnerIndex===1);
      card.appendChild(s1); card.appendChild(s2);

      card.querySelectorAll('.slot').forEach((slotEl,i)=>{
        slotEl.addEventListener('click',()=>advanceFinal(id,i,slotEl));
        if(!(mObj && ((i===0?mObj.team1:mObj.team2)))) slotEl.style.pointerEvents='none';
      });
    };
    make('semi-1',state.finals.semi1);
    make('champ', state.finals.champ);
    make('semi-2',state.finals.semi2);
  }

  // ---------- Auto centering (fallback) ----------
  function autoAlignRegion(regionKey) {
    const rounds = Array.from(document.querySelectorAll(`#region-${regionKey} .round`));
    if (!rounds.length) return;

    for (let r = 1; r < rounds.length; r++) {
      const prevRound = rounds[r - 1];
      const currRound = rounds[r];

      const prevMatches = Array.from(prevRound.querySelectorAll('.match'));
      const currMatches = Array.from(currRound.querySelectorAll('.match'));
      if (!prevMatches.length || !currMatches.length) continue;

      const currRectTop = currRound.getBoundingClientRect().top;

      const firstCurrMatch = currMatches[0];
      const innerOffset =
        firstCurrMatch ? firstCurrMatch.getBoundingClientRect().top - currRectTop : 0;

      const currStyles = getComputedStyle(currRound);
      const currGap = parseFloat(currStyles.rowGap || currStyles.gap || '0');

      let cursor = 0;
      currMatches.forEach((mEl, i) => {
        const p1 = 2 * i;
        const p2 = 2 * i + 1;
        const prev1 = prevMatches[p1];
        const prev2 = prevMatches[p2];
        if (!prev1 || !prev2) return;

        const rect1 = prev1.getBoundingClientRect();
        const rect2 = prev2.getBoundingClientRect();
        const c1 = rect1.top + rect1.height / 2;
        const c2 = rect2.top + rect2.height / 2;

        const targetCenter = ((c1 + c2) / 2) - currRectTop - innerOffset;
        const mh = mEl.getBoundingClientRect().height;
        const neededTop = targetCenter - mh / 2;

        const marginTop = Math.max(0, neededTop - cursor);
        mEl.style.marginTop = `${marginTop}px`;

        cursor += marginTop + mh + currGap;
      });
    }
  }

  // ---------- Manual placement using CUSTOM_LAYOUT ----------
  function manualAlignRegion(regionKey){
    const rounds = Array.from(document.querySelectorAll(`#region-${regionKey} .round`));
    if (!rounds.length) return;

    for (let r = 0; r < rounds.length; r++) {
      const currRound = rounds[r];
      const matches = Array.from(currRound.querySelectorAll('.match'));
      if (!matches.length) continue;

      const currStyles = getComputedStyle(currRound);
      const currGap = parseFloat(currStyles.rowGap || currStyles.gap || '0');

      let cursor = 0;
      const yList = CUSTOM_LAYOUT.regions?.[regionKey]?.[r] || [];

      matches.forEach((mEl, i) => {
        const mh = mEl.getBoundingClientRect().height;
        const targetTop = (typeof yList[i] === 'number') ? yList[i] : cursor;
        const marginTop = Math.max(0, targetTop - cursor);
        mEl.style.marginTop = `${marginTop}px`;
        cursor += marginTop + mh + currGap;
      });
    }
  }

  function alignRegionSpacing(regionKey){
    if (CUSTOM_LAYOUT.enabled && CUSTOM_LAYOUT.regions?.[regionKey]) {
      manualAlignRegion(regionKey);
    } else {
      autoAlignRegion(regionKey);
    }
  }

  function alignFinalsManual(){
    if (!CUSTOM_LAYOUT.enabled) return;

    const finalsY = CUSTOM_LAYOUT.finals || {};
    const semi1 = $('#semi-1');
    const semi2 = $('#semi-2');
    const champ = $('#champ');

    [semi1, semi2, champ].forEach(el => { if (el) el.style.marginTop = ''; });

    let cursor = 0;
    const gap = 8;

    if (semi1 && typeof finalsY.semi1?.y === 'number') {
      const y = finalsY.semi1.y;
      const mt = Math.max(0, y - cursor);
      semi1.style.marginTop = `${mt}px`;
      cursor = y + semi1.getBoundingClientRect().height + gap;
    } else if (semi1) {
      cursor += semi1.getBoundingClientRect().height + gap;
    }

    if (champ && typeof finalsY.champ?.y === 'number') {
      const y = finalsY.champ.y;
      const mt = Math.max(0, y - cursor);
      champ.style.marginTop = `${mt}px`;
      cursor = y + champ.getBoundingClientRect().height + gap;
    } else if (champ) {
      cursor += champ.getBoundingClientRect().height + gap;
    }

    if (semi2 && typeof finalsY.semi2?.y === 'number') {
      const y = finalsY.semi2.y;
      const mt = Math.max(0, y - cursor);
      semi2.style.marginTop = `${mt}px`;
      cursor = y + semi2.getBoundingClientRect().height + gap;
    }
  }

  function renderAll(){
    document.title = (state.title?.trim()? state.title+" — ":"") + '64-Team Bracket';
    $('#pageTitle').textContent = state.title + ' — 64-Team Bracket';
    REGIONS.forEach(renderRegion);
    renderFinals();

    const url = new URL(location.href);
    url.hash = encodeShare();
    $('#shareUrl').value = url.toString();

    persist();

    // Apply alignment AFTER the DOM exists
    queueMicrotask(() => {
      REGIONS.forEach(alignRegionSpacing);
      if (CUSTOM_LAYOUT.enabled) alignFinalsManual();
      zoomToFit();
    });
  }

  /* ---------- Advance Logic ---------- */
  function advanceRegion(region,rIdx,mIdx,slotIdx,clickedEl){
    const round=state.rounds[region][rIdx];
    const match=round[mIdx];
    match.winnerIndex=slotIdx;
    const winner=slotIdx===0?match.team1:match.team2;

    // Celebrate local advance for non-finals
    celebrateAdvance(clickedEl, winner?.name, false);

    if(rIdx<state.rounds[region].length-1){
      const nextRound=state.rounds[region][rIdx+1];
      const nextMatch=Math.floor(mIdx/2);
      const isTop=(mIdx%2)===0;
      if(isTop) nextRound[nextMatch].team1=winner; else nextRound[nextMatch].team2=winner;
    } else {
      const champ=winner;
      if(region==="NW"||region==="SW"){
        const semi=state.finals.semi1||{team1:null,team2:null,winnerIndex:null, meta:{court:"", time:""}};
        if(region==="NW") semi.team1=champ; else semi.team2=champ;
        semi.meta = semi.meta || {court:"", time:""};
        state.finals.semi1=semi;
      } else {
        const semi=state.finals.semi2||{team1:null,team2:null,winnerIndex:null, meta:{court:"", time:""}};
        if(region==="NE") semi.team1=champ; else semi.team2=champ;
        semi.meta = semi.meta || {court:"", time:""};
        state.finals.semi2=semi;
      }
      state.finals.champ=state.finals.champ||{team1:null,team2:null,winnerIndex:null, meta:{court:"", time:""}};
    }

    renderAll();
  }

  function advanceFinal(containerId,slotIdx,clickedEl){
    const key = (containerId==='semi-1'?'semi1':(containerId==='semi-2'?'semi2':'champ'));
    const match = state.finals[key]; 
    if (!match) return;

    match.winnerIndex = slotIdx;
    const winner = slotIdx===0 ? match.team1 : match.team2;

    // Celebrate: center-screen if we're picking the champion
    celebrateAdvance(clickedEl, winner?.name, key === 'champ');

    if (key==='semi1'){
      const c = state.finals.champ || {team1:null,team2:null,winnerIndex:null, meta:{court:"", time:""}};
      c.team1 = winner; state.finals.champ = c;
    } else if (key==='semi2'){
      const c = state.finals.champ || {team1:null,team2:null,winnerIndex:null, meta:{court:"", time:""}};
      c.team2 = winner; state.finals.champ = c;
    }

    renderAll();
  }

  /* ---------- Inputs ---------- */
  function makeInputs(){
    const host=$('#inputs'); host.innerHTML='';
    REGIONS.forEach(region=>{
      const card=document.createElement('div'); card.className='region-card';
      card.innerHTML=`<h3>${REGION_NAMES[region]} Region</h3>`;
      for(let i=0;i<16;i++){
        const row=document.createElement('div'); row.className='team-input';
        row.innerHTML=`<div class="seed">Seed ${i+1}</div><input type="text" data-region="${region}" data-index="${i}" placeholder="Team ${i+1}">`;
        card.appendChild(row);
      }
      host.appendChild(card);
    });
  }

  function fillSamples(){
    const inputs=$$('#inputs input');
    inputs.forEach((inp,i)=>inp.value=SAMPLE[i%SAMPLE.length]);
  }

  function generate(){
    REGIONS.forEach(region=>{
      const names=$(`#inputs`).querySelectorAll(`input[data-region="${region}"]`);
      const list=Array.from(names).map((inp,i)=>({name:(inp.value.trim()||inp.placeholder),seed:i+1}));
      state.regionTeams[region]=list;
      state.rounds[region]=buildRegionRounds(list);
    });
    state.title=($('#bracketName').value?.trim()||state.title);

    // finals placeholders with meta
    state.finals={
      semi1:{team1:null,team2:null,winnerIndex:null, meta:{court:"", time:""}},
      semi2:{team1:null,team2:null,winnerIndex:null, meta:{court:"", time:""}},
      champ:{team1:null,team2:null,winnerIndex:null, meta:{court:"", time:""}}
    };

    renderAll();
    document.getElementById('bracket').scrollIntoView({behavior:'smooth',block:'start'});
  }

  /* ---------- Zoom to Fit ---------- */
  function computeScale(){
    const shell=document.querySelector('.bracket-shell');
    const wrap=document.getElementById('fitWrap');
    const el=document.getElementById('bracket');
    if(!shell||!wrap||!el) return 1;
    const pad=24;
    const availWidth=shell.clientWidth-pad;
    const top=shell.getBoundingClientRect().top;
    const availHeight=(window.innerHeight-top-pad);
    const naturalW=el.scrollWidth;
    const naturalH=el.scrollHeight;
    const scaleX=availWidth/naturalW;
    const scaleY=availHeight/naturalH;
    const scale=Math.min(scaleX,scaleY,1);
    return Math.max(scale,0.3);
  }

  function applyScale(scale){
    const wrap=document.getElementById('fitWrap');
    const el=document.getElementById('bracket');
    if(!wrap||!el) return;
    el.style.transform=`scale(${scale})`;
    el.style.transformOrigin='top center';
    const naturalH=el.scrollHeight;
    wrap.style.height=(naturalH*scale)+'px';
  }

  function zoomToFit(){ applyScale(computeScale()); }
  function zoomReset(){
    const wrap=document.getElementById('fitWrap');
    const el=document.getElementById('bracket');
    if(!wrap||!el) return;
    el.style.transform=''; wrap.style.height='';
  }
  function zoomHalf(){
    const el = document.getElementById('bracket');
    const wrap = document.getElementById('fitWrap');
    if(!el || !wrap) return;
    const scale = 0.5;
    el.style.transform = `scale(${scale})`;
    el.style.transformOrigin = 'top center';
    wrap.style.height = (el.scrollHeight * scale) + 'px';
  }

  /* ---------- Winner celebration ---------- */
  function celebrateAdvance(slotEl, teamName, isChampion = false) {
    if (!teamName) return;

    if (isChampion) {
      const toast = document.createElement('div');
      toast.className = 'win-toast champion';
      toast.textContent = `${teamName} Wins the Championship! 🏆`;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 4000);
      return;
    }

    if (!slotEl) return;

    slotEl.classList.add('win-anim');
    setTimeout(() => slotEl.classList.remove('win-anim'), 1200);

    const rect = slotEl.getBoundingClientRect();
    const toast = document.createElement('div');
    toast.className = 'win-toast';
    toast.textContent = `${teamName} advance!`;
    toast.style.left = (window.scrollX + rect.left + rect.width / 2) + 'px';
    toast.style.top  = (window.scrollY + rect.top - 10) + 'px';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2600);
  }

  /* ---------- Fullscreen Toggle ---------- */
  document.getElementById('fullscreenBtn')?.addEventListener('click', () => {
    const entering = !document.body.classList.contains('fullscreen');
    document.body.classList.toggle('fullscreen', entering);

    const btn = document.getElementById('fullscreenBtn');
    btn.textContent = entering ? '↩️ Exit Full Screen' : '🕹️ Full Screen Bracket';

    queueMicrotask(() => {
      REGIONS.forEach(alignRegionSpacing);
      if (CUSTOM_LAYOUT.enabled) alignFinalsManual();
      zoomToFit();
    });
  });

  /* ---------- Wire UI ---------- */
  $('#makeInputs').addEventListener('click',makeInputs);
  $('#fillSamples').addEventListener('click',fillSamples);
  $('#generate').addEventListener('click',generate);
  $('#reset').addEventListener('click',()=>{ localStorage.removeItem('fye_bracket_64'); location.hash=''; location.reload(); });
  $('#copyUrl').addEventListener('click',async()=>{
    try{ await navigator.clipboard.writeText($('#shareUrl').value);
      const b=$('#copyUrl'); const t=b.textContent; b.textContent='Copied!';
      setTimeout(()=>b.textContent=t,1200);
    }catch(e){ alert('Copy failed — select and copy manually.'); }
  });
  $('#printBtn').addEventListener('click',()=>window.print());
  $('#bracketName').addEventListener('change',()=>{ state.title=$('#bracketName').value; renderAll(); });
  $('#zoomFit')?.addEventListener('click',zoomToFit);
  $('#zoomReset')?.addEventListener('click',zoomReset);
  $('#zoomHalf')?.addEventListener('click',zoomHalf);

  window.addEventListener('resize', () => {
    const t = document.getElementById('bracket')?.style.transform || '';
    if (t.startsWith('scale(')) {
      REGIONS.forEach(alignRegionSpacing);
      if (CUSTOM_LAYOUT.enabled) alignFinalsManual();
      zoomToFit();
    }
  });

  /* ---------- Init ---------- */
  window.addEventListener('load',()=>{
    if(!decodeShare()){
      if(restore()){ } else { makeInputs(); }
    }
    renderAll();
    if (hasBracket()) {
      queueMicrotask(() => {
        REGIONS.forEach(alignRegionSpacing);
        if (CUSTOM_LAYOUT.enabled) alignFinalsManual();
        zoomToFit();
      });
    }
  });
})();