(function(){
  const root=document.documentElement; root.classList.add('js');
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $=s=>document.querySelector(s);
  const dpr=Math.min(devicePixelRatio||1,2);
  const cleanups=[];   /* undo timers and observers of the current page before another page is swapped in */
  const intro=$('#intro'), isHome=!!intro;
  let opened=false; try{ opened=sessionStorage.getItem('rn-opened')==='1' }catch(e){}
  let finished=!isHome||opened, dustOn=false;   /* sub-pages, and a return visit to home, skip the opening */
  if(isHome&&!opened) document.body.classList.add('locked');

  if(isHome){
  /* ── mandala behind the intro ── */
  (function(){
    let h='';
    [[90,24,10],[70,18,12],[50,12,10],[30,8,7]].forEach(([r,n,l])=>{
      h+=`<circle r="${r}" fill="none" stroke="currentColor" stroke-width=".25"/>`;
      for(let k=0;k<n;k++){h+=`<path transform="rotate(${k*360/n})" d="M0 ${-r}C${l*.6} ${-r+l*.4} ${l*.6} ${-r+l} 0 ${-r+l*1.4}C${-l*.6} ${-r+l} ${-l*.6} ${-r+l*.4} 0 ${-r}z" fill="none" stroke="currentColor" stroke-width=".3"/>`}
    });
    $('#mandala').innerHTML=h;
  })();

  /* ── gold dust gathering into the seal ── */
  const dust=$('#dust'), dctx=dust.getContext('2d'), sealEl=$('#seal');
  let dw,dh,parts=[],t0=performance.now(); dustOn=!reduce&&!opened;
  function sizeDust(){dw=dust.clientWidth;dh=dust.clientHeight;dust.width=dw*dpr;dust.height=dh*dpr;dctx.setTransform(dpr,0,0,dpr,0,0)}
  sizeDust(); addEventListener('resize',sizeDust);
  for(let k=0;k<180;k++)parts.push({sx:Math.random(),sy:Math.random(),a:Math.random()*6.283,o:.9+Math.random()*.4,s:Math.random()*1.7+.4,d:600+Math.random()*900,tw:Math.random()*6.28,sp:(Math.random()*.4+.1)*(Math.random()<.5?-1:1)});
  const ease=x=>1-Math.pow(1-x,3);
  function drawDust(now){
    if(!dustOn){dctx.clearRect(0,0,dw,dh);return}
    const t=now-t0, r=sealEl.getBoundingClientRect(), cx=r.left+r.width/2, cy=r.top+r.height/2, R=r.width/2*1.2;
    dctx.clearRect(0,0,dw,dh);
    for(const p of parts){
      const e=ease(Math.min(1,Math.max(0,(t-p.d)/1800))), ang=p.a+t*.0005*p.sp;
      const tx=cx+Math.cos(ang)*R*p.o, ty=cy+Math.sin(ang)*R*p.o;
      const x=p.sx*dw+(tx-p.sx*dw)*e, y=p.sy*dh+(ty-p.sy*dh)*e;
      const fade=t>3600?Math.max(.18,1-(t-3600)/2000):1;
      dctx.globalAlpha=(.45+.55*Math.abs(Math.sin(t*.003+p.tw)))*fade*.9; dctx.fillStyle=p.s>1.5?'#FFF1C9':'#E3BC62';
      dctx.beginPath();dctx.arc(x,y,p.s,0,6.283);dctx.fill();
    }
    requestAnimationFrame(drawDust);
  }
  requestAnimationFrame(drawDust);
  }

  /* ── sound: synthesised temple bells + the background song (starts only after a tap) ── */
  let actx=null, out=null, verb=null, musicOn=false, soundOn=true, fadeT=null;
  try{ if(localStorage.getItem('rn-sound')==='off') soundOn=false }catch(e){}
  const bgm=new Audio('music.mp3'); bgm.loop=true; bgm.preload='auto'; bgm.volume=0;
  const BGM_VOL=.55;
  try{ const t=+sessionStorage.getItem('rn-bgm-t'); if(t>0) bgm.addEventListener('loadedmetadata',()=>{ try{ bgm.currentTime=t%(bgm.duration||t+1) }catch(e){} },{once:true}) }catch(e){}
  addEventListener('pagehide',()=>{ try{ sessionStorage.setItem('rn-bgm-t',bgm.currentTime||0) }catch(e){} });
  function ctx(){
    if(!actx){
      const AC=window.AudioContext||window.webkitAudioContext; if(!AC) return null;
      try{ if(navigator.audioSession) navigator.audioSession.type='playback' }catch(e){}
      actx=new AC();
      out=actx.createGain(); out.gain.value=1; out.connect(actx.destination);
      verb=actx.createConvolver();
      const len=Math.floor(actx.sampleRate*3.5), ir=actx.createBuffer(2,len,actx.sampleRate);
      for(let c=0;c<2;c++){const d=ir.getChannelData(c);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,3.2)}
      verb.buffer=ir; const wet=actx.createGain(); wet.gain.value=.4; verb.connect(wet); wet.connect(out);
    }
    if(actx.state==='suspended'&&!document.hidden) actx.resume();
    return actx;
  }
  function bell(strong){
    if(!soundOn||!ctx())return;
    const now=actx.currentTime, g=actx.createGain(); g.gain.value=strong?.12:.08; g.connect(out); g.connect(verb);
    [[1,1,3.2],[2.32,.55,2.2],[4.25,.32,1.6],[6.63,.18,1.1],[9.38,.1,.8]].forEach(([m,a,d])=>{
      const o=actx.createOscillator(), v=actx.createGain(); o.type='sine'; o.frequency.value=520*m;
      v.gain.setValueAtTime(0,now); v.gain.linearRampToValueAtTime(a,now+.006); v.gain.exponentialRampToValueAtTime(.0001,now+d);
      o.connect(v); v.connect(g); o.start(now); o.stop(now+d+.05);
    });
  }
  function fadeTo(v,ms,done){
    clearInterval(fadeT); const st=bgm.volume, t0=performance.now();
    fadeT=setInterval(()=>{const k=Math.min(1,(performance.now()-t0)/ms); try{bgm.volume=Math.max(0,Math.min(1,st+(v-st)*k))}catch(e){} if(k>=1){clearInterval(fadeT);done&&done()}},50);
  }
  let primed=false;
  function primeMusic(){   /* called inside the tap so phones allow the song to start later */
    if(primed) return; primed=true;
    try{ bgm.muted=true; const pr=bgm.play(); if(pr&&pr.then) pr.then(()=>{ if(!musicOn){bgm.pause();bgm.currentTime=0} bgm.muted=false }).catch(()=>{bgm.muted=false}); else bgm.muted=false }catch(e){bgm.muted=false}
  }
  function startMusic(){
    if(!soundOn||musicOn||!finished) return;
    bgm.muted=false;
    musicOn=true;
    const pr=bgm.play(); if(pr&&pr.catch) pr.catch(()=>{musicOn=false});
    fadeTo(BGM_VOL,3500);
  }
  function stopMusic(){ musicOn=false; fadeTo(0,700,()=>{ if(!musicOn) bgm.pause() }) }
  function syncSoundUI(){
    const f=$('#musicFab');
    f.classList.toggle('muted',!soundOn); f.classList.toggle('playing',soundOn);
    f.setAttribute('aria-pressed',soundOn); f.setAttribute('aria-label',soundOn?'Mute music':'Play music');
    if($('#soundBtn')){ $('#soundBtn').setAttribute('aria-pressed',soundOn); $('#soundTxt').textContent=soundOn?'Music on':'Music off'; $('#soundWave').style.opacity=soundOn?1:.15 }
    $('#fabTip').textContent=soundOn?'Tap to mute music':'Tap to play music';
  }
  function setSound(on){
    soundOn=on; try{localStorage.setItem('rn-sound',on?'on':'off')}catch(e){}
    if(on) startMusic(); else stopMusic();
    syncSoundUI();
  }
  if($('#soundBtn')) $('#soundBtn').addEventListener('click',()=>setSound(!soundOn));
  $('#musicFab').addEventListener('click',()=>setSound(!soundOn));
  document.addEventListener('pointerdown',()=>{ if(soundOn&&!musicOn) startMusic() });
  document.addEventListener('keydown',()=>{ if(soundOn&&!musicOn) startMusic() });
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){ bgm.pause(); if(actx) actx.suspend(); }
    else if(soundOn){ if(musicOn) bgm.play().catch(()=>{}); if(actx) actx.resume(); }
  });
  syncSoundUI();

  if(isHome){
  /* ── darshan: five blessings, one by one ── */
  const gods=[
    {deva:'॥ श्री गणेशाय नमः ॥',name:'Jay Ganesh',line:'Vighnaharta, remover of every obstacle. With his blessing, we begin.'},
    {deva:'॥ जय उमिया माँ ॥',name:'Jay Umiya Mata',line:'Our Kuldevi, Maa Umiya, blesses this union with her boundless grace.'},
    {deva:'॥ ॐ नमः शिवाय ॥',name:'Jay Mahadev',line:'Har Har Mahadev. May Shree Bhimnath Mahadev give them strength, peace and devotion.'},
    {deva:'॥ जय स्वामिनारायण ॥',name:'Jay Swaminarayan',line:'With the blessings of Pragat Guruhari Mahant Swami Maharaj, may their home always be a mandir.'},
    {deva:'॥ जय द्वारकाधीश ॥',name:'Jay Dwarkadhish',line:'May Shree Krishna fill their life with love, music and joy.'}
  ];
  const godEls=[...document.querySelectorAll('.god')], dotEls=[...document.querySelectorAll('#darDots i')], dt=$('#darText');
  const DUR=reduce?1200:3800; let timers=[], started=false;
  const later=(fn,ms)=>timers.push(setTimeout(fn,ms));
  const slideDur=k=>k===0?DUR+700:k===gods.length-1?DUR+800:DUR;
  function showGod(k){
    godEls.forEach((g,j)=>g.classList.toggle('on',j===k));
    dotEls.forEach((d,j)=>{d.className=j<k?'done':j===k?'now':'';d.style.setProperty('--dur',slideDur(k)+'ms')});
    dt.classList.add('out');
    later(()=>{$('#darDeva').textContent=gods[k].deva;$('#darName').textContent=gods[k].name;$('#darLine').textContent=gods[k].line;dt.classList.remove('out')},450);
    bell(k===0); smallShower();   /* a temple bell rings on every new darshan */
    if(k<gods.length-1)later(()=>showGod(k+1),slideDur(k)); else later(finish,slideDur(k));
  }
  function openInvite(){
    if(started)return; started=true; clearTimeout(autoT);
    bell(false); primeMusic();
    $('#env').classList.add('open');
    $('#skipBtn').hidden=false;
    later(()=>{dustOn=false;$('#stEnv').classList.add('away')},reduce?100:2000);
    later(()=>{$('#stDar').classList.add('on');showGod(0)},reduce?200:2600);
  }
  function finish(){
    if(finished)return; finished=true; timers.forEach(clearTimeout); started=true; dustOn=false; clearTimeout(autoT);
    $('#flash').classList.add('go'); bell(true); startMusic();
    try{ sessionStorage.setItem('rn-opened','1') }catch(e){}
    setTimeout(()=>{intro.classList.add('done');document.body.classList.remove('locked');burst()},reduce?50:600);
    setTimeout(()=>{intro.hidden=true;showFabs()},reduce?100:1900);
  }
  $('#openBtn').addEventListener('click',openInvite);
  $('#seal').addEventListener('click',openInvite);
  $('#skipBtn').addEventListener('click',finish);
  const autoT=0;   /* no automatic opening: phones only allow sound after a tap, so the guest's tap opens the card */
  $('#stEnv').addEventListener('click',e=>{ if(!e.target.closest('#openBtn,#seal')) openInvite() });
  if(opened){ intro.hidden=true; started=true }
  }

  function initCountdown(){ if(!$('#cdD')) return;
  /* ── countdown (IST) ── */
  const start=Date.parse('2027-02-09T14:00:00+05:30'), jaan=Date.parse('2027-02-11T14:00:00+05:30');
  const pad=n=>String(n).padStart(2,'0');
  function tick(){
    const now=Date.now(); let target=start;
    if(now>=start&&now<jaan){target=jaan;$('#cdLabel').textContent='until the baraat leaves for Sampla'}
    if(now>=jaan)$('#cdLabel').textContent='Rushi and Naisargi are married. Thank you for your blessings!';
    let d=Math.max(0,target-now);
    const D=Math.floor(d/864e5);d-=D*864e5;const H=Math.floor(d/36e5);d-=H*36e5;const M=Math.floor(d/6e4);d-=M*6e4;const S=Math.floor(d/1e3);
    $('#cdD').textContent=D;$('#cdH').textContent=pad(H);$('#cdM').textContent=pad(M);$('#cdS').textContent=pad(S);
  }
  tick(); const cdIv=setInterval(tick,1000); cleanups.push(()=>clearInterval(cdIv));
  }

  function initWheel(){ if(!$('#wheel')) return;
  /* ── saptapadi wheel ── */
  const steps=[
    ['Ishe ekapadi bhava','ॐ इषे एकपदी भव','Nourishment','Together we will provide for each other and for our home, so that no one under our roof goes hungry.'],
    ['Urje dvipadi bhava','ऊर्जे द्विपदी भव','Strength','Together we will grow strong in body, mind and spirit, and lift each other up when one of us is tired.'],
    ['Rayasposhaya tripadi bhava','रायस्पोषाय त्रिपदी भव','Prosperity','Together we will earn honestly, spend wisely and share generously with those around us.'],
    ['Mayobhavaya chatushpadi bhava','मयोभवाय चतुष्पदी भव','Happiness','Together we will nurture love, trust and joy, and honour each other\'s families as our own.'],
    ['Prajabhyah panchapadi bhava','प्रजाभ्यः पञ्चपदी भव','Family','Together we will care for our family and raise the generations to come with good values.'],
    ['Ritubhyah shatpadi bhava','ऋतुभ्यः षट्पदी भव','Every season','Together we will walk through every season of life, its springs and its winters, side by side.'],
    ['Sakhe saptapadi bhava','सखे सप्तपदी भव','Friendship','With this seventh step, we become friends for life: companions in every joy and every challenge.']
  ];
  const ord=['First','Second','Third','Fourth','Fifth','Sixth','Seventh'];
  const wheel=$('#wheel'), sbody=$('#stepBody'), sdots=$('#stepDots'); let cur=0, auto=null;
  steps.forEach((s,k)=>{
    const a=-Math.PI/2+k*2*Math.PI/7, b=document.createElement('button');
    b.type='button';b.className='step';b.textContent=k+1;b.setAttribute('aria-label',ord[k]+' step: '+s[2]);
    b.style.left=(50+39*Math.cos(a))+'%';b.style.top=(50+39*Math.sin(a))+'%';
    b.addEventListener('click',()=>{clearInterval(auto);showStep(k)});
    wheel.appendChild(b); sdots.appendChild(document.createElement('i'));
  });
  function showStep(k){
    cur=k; const s=steps[k];
    wheel.querySelectorAll('.step').forEach((b,j)=>b.classList.toggle('on',j===k));
    sdots.querySelectorAll('i').forEach((d,j)=>d.classList.toggle('on',j<=k));
    sbody.innerHTML=`<p class="num">${ord[k]} step</p><h3 style="margin-top:.6rem"><em>${s[2]}</em></h3><p class="deva" style="margin-top:.8rem">${s[1]}</p><p class="roman">${s[0]}</p><p class="m" style="margin-top:.8rem">${s[3]}</p>`;
    sbody.classList.remove('anim');void sbody.offsetWidth;sbody.classList.add('anim');
  }
  showStep(0);
  if(!reduce)auto=setInterval(()=>showStep((cur+1)%7),4500);
  cleanups.push(()=>clearInterval(auto));
  }

  function initRail(){ if(!$('#rail')) return;
  /* ── ritual journey ── */
  const rituals=[
    ['9 Feb · Derol','Mandap Muhurat','Lord Ganesha is worshipped and the first pillar of the mandap is raised, marking the start of the wedding.'],
    ['9 Feb · Derol','Pithi','Turmeric paste is applied to the groom by the family, for a glow on the big day and protection from the evil eye.'],
    ['10 Feb · Derol','Mosalu','The maternal uncle\'s family arrives with clothes, jewellery and sweets, a gift of love from the mosal.'],
    ['10 Feb · Derol','Grah Shanti','A havan to the nine planets so that the stars smile on the couple\'s new life.'],
    ['11 Feb · Derol','Jaan','The baraat leaves for the bride\'s home, with dhol, dancing and the groom at its heart.'],
    ['Wedding day · Sampla','Ponkhanu','The bride\'s mother welcomes the groom with an aarti thali and playfully tries to catch his nose.'],
    ['Wedding day · Sampla','Antarpat & Varmala','A cloth held between them is lowered at the auspicious moment, and the couple exchange garlands.'],
    ['Wedding day · Sampla','Kanyadaan & Hast Melap','The bride\'s parents place her hand in the groom\'s, and their scarves are tied in a sacred knot.'],
    ['Wedding day · Sampla','Mangal Fera','Four rounds around the holy fire, for dharma, artha, kama and moksha.'],
    ['Wedding day · Sampla','Saptapadi','Seven steps together, seven promises for a lifetime.'],
    ['Wedding day · Sampla','Kansar','The newlyweds feed each other sweet kansar, their first meal as husband and wife.'],
    ['Wedding day · Sampla','Vidaai','With tears and blessings, the bride leaves her parents\' home to begin a new chapter.']
  ];
  const rail=$('#rail');
  function ritCard([w,t,d],k,clone){
    const a=document.createElement('article');a.className='rit';
    a.innerHTML=`<span class="no">${String(k+1).padStart(2,'0')}</span><span class="when">${w}</span><h3>${t}</h3><p>${d}</p>`;
    if(clone){a.setAttribute('aria-hidden','true');a.inert=true}
    rail.appendChild(a);
  }
  rituals.forEach((r,k)=>ritCard(r,k,false));
  if(!reduce) rituals.forEach((r,k)=>ritCard(r,k,true));   /* a second copy makes the loop seamless */
  const stepW=()=>rail.querySelector('.rit').offsetWidth+parseFloat(getComputedStyle(rail).columnGap||18);
  const loopW=()=>reduce?Infinity:rail.scrollWidth/2;
  let rpos=0, rPaused=false, rResume=null, rInView=false, rLast=0, rAlive=true;
  cleanups.push(()=>{ rAlive=false; clearTimeout(rResume); rio.disconnect() });
  function railPause(ms){ rPaused=true; clearTimeout(rResume); if(ms!=null) rResume=setTimeout(()=>{rpos=rail.scrollLeft;rPaused=false},ms) }
  rail.addEventListener('pointerenter',e=>{ if(e.pointerType==='mouse') railPause() });
  rail.addEventListener('pointerleave',e=>{ if(e.pointerType==='mouse') railPause(900) });
  ['touchstart','wheel','focusin','keydown'].forEach(ev=>rail.addEventListener(ev,()=>railPause(5000),{passive:true}));
  rail.addEventListener('touchend',()=>railPause(4000),{passive:true});
  const rio=new IntersectionObserver(es=>{rInView=es[0].isIntersecting}); rio.observe(rail);
  function railTick(ts){
    if(!rAlive) return;
    const dt=rLast?Math.min(50,ts-rLast):16; rLast=ts;
    if(!rPaused&&rInView&&!document.hidden){
      rpos+=dt*.03;                       /* about 30 px per second: slow enough to read */
      const L=loopW(); if(rpos>=L) rpos-=L;
      rail.scrollLeft=rpos;
    }
    requestAnimationFrame(railTick);
  }
  if(!reduce) requestAnimationFrame(railTick);
  function by(d){
    railPause(6000);
    const L=loopW();
    if(d<0&&rail.scrollLeft<stepW()&&L!==Infinity) rail.scrollLeft+=L;
    rail.scrollTo({left:rail.scrollLeft+d*stepW(),behavior:reduce?'auto':'smooth'});
  }
  $('#railPrev').addEventListener('click',()=>by(-1)); $('#railNext').addEventListener('click',()=>by(1));
  }

  function initGita(){ if(!$('#gitaTabs')) return;
  /* ── Gita gyan ── */
  const gita=[
    ['Selfless love','Chapter 2 · Verse 47','कर्मण्येवाधिकारस्ते मा फलेषु कदाचन ।<br>मा कर्मफलहेतुर्भूर्मा ते सङ्गोऽस्त्वकर्मणि ॥','Karmanye vadhikaraste, ma phaleshu kadachana,<br>Ma karma-phala-hetur bhur, ma te sango \'stv akarmani.','You have a right to your actions, but never to their fruits. Let not the fruit be your motive, and do not cling to inaction either.','In marriage, give without keeping score. Love offered freely, without counting what comes back, is the love that lasts.'],
    ['Patience','Chapter 2 · Verse 14','मात्रास्पर्शास्तु कौन्तेय शीतोष्णसुखदुःखदाः ।<br>आगमापायिनोऽनित्यास्तांस्तितिक्षस्व भारत ॥','Matra-sparshas tu kaunteya, shitoshna-sukha-duhkha-dah,<br>Agamapayino \'nityas, tams titikshasva bharata.','Cold and heat, pleasure and pain come and go; they do not last. Bear them patiently, O Arjuna.','Every marriage has its summers and winters. Neither lasts forever; the hand you hold through both is what remains.'],
    ['Growing together','Chapter 6 · Verse 5','उद्धरेदात्मनात्मानं नात्मानमवसादयेत् ।<br>आत्मैव ह्यात्मनो बन्धुरात्मैव रिपुरात्मनः ॥','Uddhared atmanatmanam, natmanam avasadayet,<br>Atmaiva hy atmano bandhur, atmaiva ripur atmanah.','Lift yourself up by your own mind, and never let yourself fall. The mind is your friend, and the mind can be your enemy.','Two people who keep growing build a home that keeps growing. Help each other become your best selves.'],
    ['Small gestures','Chapter 9 · Verse 26','पत्रं पुष्पं फलं तोयं यो मे भक्त्या प्रयच्छति ।<br>तदहं भक्त्युपहृतमश्नामि प्रयतात्मनः ॥','Patram pushpam phalam toyam, yo me bhaktya prayacchati,<br>Tad aham bhakty-upahritam, ashnami prayatatmanah.','Whoever offers Me with devotion a leaf, a flower, a fruit or a little water, I accept that offering of love from a pure heart.','It is never the size of the gift. A cup of tea made just right, a flower, a kind word: love lives in small, sincere gestures.'],
    ['Kindness','Chapter 12 · Verse 13','अद्वेष्टा सर्वभूतानां मैत्रः करुण एव च ।<br>निर्ममो निरहङ्कारः समदुःखसुखः क्षमी ॥','Adveshta sarva-bhutanam, maitrah karuna eva cha,<br>Nirmamo nirahankarah, sama-duhkha-sukhah kshami.','One who bears ill will toward none, who is friendly and compassionate, free of ego, steady in joy and sorrow, and forgiving, is dear to Me.','Forgive quickly, speak kindly and leave ego at the door. These are the quiet foundations of a happy home.'],
    ['Together, unstoppable','Chapter 18 · Verse 78','यत्र योगेश्वरः कृष्णो यत्र पार्थो धनुर्धरः ।<br>तत्र श्रीर्विजयो भूतिर्ध्रुवा नीतिर्मतिर्मम ॥','Yatra yogeshvarah krishno, yatra partho dhanur-dharah,<br>Tatra shrir vijayo bhutir, dhruva nitir matir mama.','Wherever there is Krishna, the master of yoga, and Arjuna, the archer, there will surely be prosperity, victory, abundance and righteousness.','When faith and effort walk together, nothing is out of reach. May Rushi and Naisargi always be that pair for each other.']
  ];
  const gTabs=$('#gitaTabs'), gBody=$('#gitaBody'), GD=11000; let gCur=0, gAuto=null;
  gita.forEach((g,k)=>{
    const b=document.createElement('button'); b.type='button'; b.setAttribute('role','tab'); b.id='gt'+k;
    b.innerHTML=`<b>${g[0]}</b><span>${g[1].replace('Chapter ','Ch ').replace(' · Verse ',' · ')}</span><i class="bar"></i>`;
    b.addEventListener('click',()=>{clearInterval(gAuto);gAuto=null;showGita(k)});
    gTabs.appendChild(b);
  });
  function showGita(k){
    gCur=k; const g=gita[k];
    gTabs.querySelectorAll('button').forEach((b,j)=>{b.setAttribute('aria-selected',j===k);b.tabIndex=j===k?0:-1;const bar=b.querySelector('.bar');bar.classList.remove('run');if(j===k&&gAuto){void bar.offsetWidth;bar.style.setProperty('--gd',GD+'ms');bar.classList.add('run')}});
    $('#gitaPanel').setAttribute('aria-labelledby','gt'+k);
    gBody.innerHTML=`<p class="ref">${g[1]}</p><p class="deva">${g[2]}</p><p class="roman">${g[3]}</p><p class="mean">${g[4]}</p><div class="les"><span>For a married life</span><p>${g[5]}</p></div>`;
    gBody.classList.remove('anim'); void gBody.offsetWidth; gBody.classList.add('anim');
  }
  if(!reduce) gAuto=setInterval(()=>showGita((gCur+1)%gita.length),GD);
  cleanups.push(()=>clearInterval(gAuto));
  showGita(0);
  }

  /* ── scroll reveal ── */
  const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{rootMargin:'0px 0px -8% 0px'});

  /* ── mobile menu ── */
  const menuBtn=$('#menuBtn'), mnav=$('#mnav');
  function setMenu(open){
    menuBtn.setAttribute('aria-expanded',open); menuBtn.setAttribute('aria-label',open?'Close menu':'Open menu');
    document.body.classList.toggle('menu-open',open);
    if(open){ mnav.hidden=false; requestAnimationFrame(()=>requestAnimationFrame(()=>mnav.classList.add('open'))) }
    else { mnav.classList.remove('open'); setTimeout(()=>{ if(menuBtn.getAttribute('aria-expanded')==='false') mnav.hidden=true },350) }
  }
  menuBtn.addEventListener('click',()=>setMenu(menuBtn.getAttribute('aria-expanded')!=='true'));
  mnav.addEventListener('click',e=>{ if(e.target.closest('a')) setMenu(false) });
  addEventListener('keydown',e=>{ if(e.key==='Escape'&&menuBtn.getAttribute('aria-expanded')==='true'){ setMenu(false); menuBtn.focus() } });
  matchMedia('(min-width:901px)').addEventListener('change',e=>{ if(e.matches) setMenu(false) });

  /* ── floating controls: music toggle + back to top with scroll progress ── */
  const topFab=$('#topFab'), prog=$('#topProg'), C=2*Math.PI*26;
  function showFabs(){
    const f=$('#musicFab'); f.hidden=false;
    let seen=false; try{ seen=sessionStorage.getItem('rn-tip')==='1'; sessionStorage.setItem('rn-tip','1') }catch(e){}
    const tip=$('#fabTip'); if(!seen){ setTimeout(()=>tip.classList.add('show'),400); setTimeout(()=>tip.classList.remove('show'),5200) }
  }
  function onScroll(){
    const h=document.documentElement.scrollHeight-innerHeight, y=scrollY;
    topFab.classList.toggle('show',y>500);
    prog.style.strokeDashoffset=C*(1-(h>0?Math.min(1,y/h):0));
  }
  addEventListener('scroll',onScroll,{passive:true}); onScroll();
  if(finished) showFabs();
  topFab.addEventListener('click',()=>scrollTo({top:0,behavior:reduce?'auto':'smooth'}));

  /* ── count-up for the numbers band ── */
  function initNums(){ const n=$('#nums'); if(!n) return;
  const numIO=new IntersectionObserver(es=>es.forEach(e=>{
    if(!e.isIntersecting) return; numIO.disconnect(); if(reduce) return;
    e.target.querySelectorAll('b[data-n]').forEach(b=>{
      const n=+b.dataset.n, t0=performance.now();
      (function step(now){const k=Math.min(1,(now-t0)/1400);b.textContent=Math.round(n*(1-Math.pow(1-k,3)));if(k<1)requestAnimationFrame(step)})(t0);
    });
  }),{threshold:.4});
  numIO.observe(n); cleanups.push(()=>numIO.disconnect());
  }

  /* ── petals ── */
  const pc=$('#petals'), px=pc.getContext('2d'); let pw,ph,petals=[];
  function sizeP(){pw=pc.clientWidth;ph=pc.clientHeight;pc.width=pw*dpr;pc.height=ph*dpr;px.setTransform(dpr,0,0,dpr,0,0)}
  sizeP(); addEventListener('resize',sizeP);
  const cols=['#E7A99A','#F2C4B8','#E3BC62','#D98C7C','#F5A623'];
  function mk(x,y,b){return{x:x??Math.random()*pw,y:y??-20,r:Math.random()*6+5,vx:b?(Math.random()-.5)*7:(Math.random()-.5)*.4,vy:b?-Math.random()*7-2:Math.random()*.8+.6,rot:Math.random()*6.28,vr:(Math.random()-.5)*.05,sw:Math.random()*6.28,c:cols[Math.random()*cols.length|0],b}}
  function burst(){if(reduce)return;for(let k=0;k<80;k++)petals.push(mk(pw/2+(Math.random()-.5)*140,ph*.45,true))}
  function smallShower(){if(reduce)return;for(let k=0;k<14;k++)petals.push(mk(pw/2+(Math.random()-.5)*pw*.6,-10-Math.random()*60))}
  function petal(p){px.save();px.translate(p.x,p.y);px.rotate(p.rot);px.fillStyle=p.c;px.globalAlpha=.78;px.beginPath();px.moveTo(0,-p.r);px.bezierCurveTo(p.r*.9,-p.r*.6,p.r*.7,p.r*.6,0,p.r);px.bezierCurveTo(-p.r*.7,p.r*.6,-p.r*.9,-p.r*.6,0,-p.r);px.fill();px.restore()}
  let last=0;
  function loop(now){
    px.clearRect(0,0,pw,ph);
    if(finished&&now-last>900&&petals.filter(p=>!p.b).length<(pw<600?10:18)){petals.push(mk());last=now}
    petals=petals.filter(p=>{if(p.b){p.vy+=.12;p.vx*=.985}p.sw+=.02;p.x+=p.vx+Math.sin(p.sw)*.5;p.y+=p.vy;p.rot+=p.vr;petal(p);return p.y<ph+30});
    requestAnimationFrame(loop);
  }
  if(!reduce)requestAnimationFrame(loop);
  /* ── page setup, run on first load and after every in-page navigation ── */
  function initPage(){
    initCountdown(); initWheel(); initRail(); initGita(); initNums();
    document.querySelectorAll('main .rv:not(.in)').forEach(el=>io.observe(el));
  }

  /* ── in-page navigation: other pages are swapped into this document, so the song never stops ── */
  const cache={};
  const curPage=()=>($('main')&&$('main').dataset.page)||'index.html';
  function linkTarget(a){
    if(!a||(a.target&&a.target!=='_self')||a.hasAttribute('download')) return null;
    const href=a.getAttribute('href')||'';
    if(/^#[\w-]+$/.test(href)) return {file:curPage(),hash:href};
    const m=href.match(/^(index|rituals|stories|gita)\.html(#[\w-]+)?$/);
    return m?{file:m[1]+'.html',hash:m[2]||''}:null;
  }
  function getPage(file){
    return cache[file]||(cache[file]=fetch(file,{credentials:'same-origin'})
      .then(r=>{ if(!r.ok) throw new Error(r.status); return r.text() })
      .then(t=>new DOMParser().parseFromString(t,'text/html'))
      .catch(e=>{ delete cache[file]; throw e }));
  }
  function toHash(hash,smooth){
    const el=hash&&hash.length>1?document.getElementById(hash.slice(1)):null;
    if(el) el.scrollIntoView({behavior:smooth&&!reduce?'smooth':'auto',block:'start'});
    else scrollTo({top:0,behavior:'auto'});
  }
  function remember(file,hash,push){ try{ history[push?'pushState':'replaceState']({file,hash},'',file+(hash||'')) }catch(e){} }
  let navBusy=false;
  async function go(file,hash,push){
    if(file===curPage()){ if(push) remember(file,hash,true); toHash(hash,true); return }
    if(navBusy) return; navBusy=true;
    const main=$('main'); main.classList.add('leaving');
    let doc=null;
    try{ doc=await getPage(file) }catch(e){}
    const nm=doc&&doc.querySelector('main[data-page]');
    if(!nm){ location.href=file+(hash||''); return }   /* fall back to a normal page load */
    if(!reduce) await new Promise(r=>setTimeout(r,230));
    cleanups.splice(0).forEach(f=>{ try{f()}catch(e){} });
    const fresh=document.importNode(nm,true); fresh.classList.add('entering');
    main.replaceWith(fresh);
    const nu=doc.querySelector('.nav ul'), mi=doc.querySelector('#mnav .mnav-in');
    if(nu) $('.nav ul').innerHTML=nu.innerHTML;
    if(mi) $('#mnav .mnav-in').innerHTML=mi.innerHTML;
    if(doc.title) document.title=doc.title;
    if(push) remember(file,hash,true);
    initPage(); toHash(hash,false); onScroll();
    requestAnimationFrame(()=>requestAnimationFrame(()=>fresh.classList.remove('entering')));
    navBusy=false;
  }
  document.addEventListener('click',e=>{
    if(e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey) return;
    const t=linkTarget(e.target.closest&&e.target.closest('a'));
    if(!t) return;
    e.preventDefault(); go(t.file,t.hash,true);
  });
  const warm=e=>{ const t=linkTarget(e.target.closest&&e.target.closest('a')); if(t&&t.file!==curPage()) getPage(t.file).catch(()=>{}) };
  document.addEventListener('pointerover',warm,{passive:true});
  document.addEventListener('touchstart',warm,{passive:true});
  remember(curPage(),location.hash,false);
  addEventListener('popstate',e=>{ const st=e.state; if(st&&st.file) go(st.file,st.hash,false) });

  initPage();
})();
