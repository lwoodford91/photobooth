(function(){
'use strict';

const S={
  scr:'s-attract',stream:null,shooting:false,
  frames:[],finalURL:null,gallery:[],
  resetInterval:null,adminTaps:0,adminTapTimer:null,pinEntry:'',
  ed:{canvas:null,ctx:null,objects:[],selected:-1,history:[],bgImg:null,bgDef:null,canvasW:0,canvasH:0},
  savedTemplate:null,savedTemplateURL:null,
  locked:{mode:'single',filter:'none',timer:3,autoReset:15,facing:'user',mirror:true,
    name:'PhotoBooth Studio',tag:'Tap anywhere to begin',overlay:'',color:'#e8365d',
    bgId:'solid-black',customBgURL:null,pin:'0000'},
};
const MODES=[{id:'single',lbl:'Single Shot',shots:1},{id:'duo',lbl:'Side by Side',shots:2},{id:'strip',lbl:'Photo Strip',shots:3},{id:'grid',lbl:'4-Photo Grid',shots:4}];
const FILTERS=[{id:'none',lbl:'Original',ico:'✨'},{id:'bw',lbl:'B&W',ico:'⬛'},{id:'sepia',lbl:'Sepia',ico:'🟤'},{id:'vivid',lbl:'Vivid',ico:'🌈'},{id:'glam',lbl:'Glam',ico:'💅'},{id:'cool',lbl:'Cool',ico:'🔵'},{id:'warm',lbl:'Warm',ico:'🟠'},{id:'vintage',lbl:'Vintage',ico:'📽'}];
const BUILTIN_BGS=[
  {id:'solid-black',label:'Classic Black',type:'solid',color:'#0d0d0d'},{id:'solid-white',label:'Clean White',type:'solid',color:'#f8f8f8'},
  {id:'solid-navy',label:'Deep Navy',type:'solid',color:'#0f1f3d'},{id:'solid-blush',label:'Blush Pink',type:'solid',color:'#f9dde5'},
  {id:'solid-sage',label:'Sage Green',type:'solid',color:'#d2e8d2'},{id:'solid-gold',label:'Gold Cream',type:'solid',color:'#f5e9c8'},
  {id:'grad-sunset',label:'Sunset',type:'grad',colors:['#ff6b35','#f7c59f','#ffe5b4']},
  {id:'grad-ocean',label:'Ocean',type:'grad',colors:['#0f2027','#203a43','#2c5364']},
  {id:'grad-rose',label:'Rose Gold',type:'grad',colors:['#f8cdda','#1d2b64']},
  {id:'grad-aurora',label:'Aurora',type:'grad',colors:['#00c3ff','#7209b7','#ffcc00']},
  {id:'grad-mid',label:'Midnight',type:'grad',colors:['#141e30','#243b55']},
  {id:'grad-peach',label:'Peach',type:'grad',colors:['#ffecd2','#fcb69f']},
  {id:'pat-dots',label:'Polka Dots',type:'pattern',pat:'dots',bg:'#1a1a1a',fg:'#333'},
  {id:'pat-grid',label:'Grid Lines',type:'pattern',pat:'grid',bg:'#f0f0f0',fg:'#ccc'},
  {id:'pat-confetti',label:'Confetti',type:'pattern',pat:'confetti',bg:'#fff'},
];
const STICKERS=['❤️','⭐','🌟','✨','🎉','🎊','🎈','🔥','💫','🌈','🦋','🌸','🍀','💎','🎯','🥳','😍','🤩','💃','🎪'];

/* BOOT */
loadState();applyTheme();buildAdminTemplateGrid();buildAdminSlotsBar();renderGallery();initTemplateEditor();loadAdminFields();

/* NAV */
function showScr(id){document.querySelectorAll('.scr').forEach(s=>s.classList.remove('on'));document.getElementById(id).classList.add('on');S.scr=id;}
window.showScr=showScr;

/* ATTRACT */
document.getElementById('s-attract').addEventListener('click',function(e){if(e.target.id==='admin-tap') return;startGuestSession();});
function startGuestSession(){
  const L=S.locked;S.filter=L.filter;S.facing=L.facing;
  const f=FILTERS.find(x=>x.id===L.filter)||FILTERS[0];
  document.getElementById('filter-icon-live').textContent=f.ico;
  document.getElementById('filter-name-live').textContent=f.lbl;
  const m=MODES.find(x=>x.id===L.mode);
  document.getElementById('mode-pill').textContent=m?m.lbl.toUpperCase():'PHOTO BOOTH';
  buildDots();showScr('s-camera');startCam();
}

/* ADMIN UNLOCK */
window.adminTapCount=function(){S.adminTaps++;clearTimeout(S.adminTapTimer);S.adminTapTimer=setTimeout(()=>{S.adminTaps=0;},2000);if(S.adminTaps>=5){S.adminTaps=0;S.pinEntry='';updatePinDots();showScr('s-pin');}};

/* PIN */
window.pinKey=function(d){
  if(S.pinEntry.length>=4) return;S.pinEntry+=d;updatePinDots();
  if(S.pinEntry.length===4){
    if(S.pinEntry===S.locked.pin){S.pinEntry='';updatePinDots();document.getElementById('pin-err').textContent='';showScr('s-admin');adminTab('template');}
    else{document.getElementById('pin-err').textContent='Incorrect PIN';document.querySelectorAll('.pin-dot').forEach(d=>{d.classList.add('shake');setTimeout(()=>d.classList.remove('shake'),350);});setTimeout(()=>{S.pinEntry='';updatePinDots();document.getElementById('pin-err').textContent='';},600);}
  }
};
window.pinDel=function(){S.pinEntry=S.pinEntry.slice(0,-1);updatePinDots();};
function updatePinDots(){for(let i=0;i<4;i++) document.getElementById('pd'+i).classList.toggle('filled',i<S.pinEntry.length);}
window.adminLogout=function(){showScr('s-attract');};

/* ADMIN TABS */
window.adminTab=function(tab){
  document.querySelectorAll('.admin-tab').forEach(t=>t.classList.remove('on'));
  document.querySelectorAll('.admin-panel').forEach(p=>p.classList.remove('on'));
  document.getElementById('tab-'+tab).classList.add('on');document.getElementById('panel-'+tab).classList.add('on');
  if(tab==='gallery') renderGallery();
};

/* ACTIVATE */
window.activateAndLaunch=function(){readAdminFields();saveState();applyTheme();showScr('s-attract');};

/* SETTINGS */
window.saveEventSettings=function(){readAdminFields();saveState();applyTheme();showToast('Event settings saved ✓');};
function readAdminFields(){
  const L=S.locked;
  L.mode=document.getElementById('a-mode').value;L.filter=document.getElementById('a-filter').value;
  L.timer=parseInt(document.getElementById('a-timer').value)||3;L.autoReset=parseInt(document.getElementById('a-autoreset').value)||15;
  L.name=document.getElementById('a-name').value||'PhotoBooth Studio';L.tag=document.getElementById('a-tag').value||'Tap anywhere to begin';
  L.overlay=document.getElementById('a-overlay').value;L.color=document.getElementById('a-color').value;
  L.mirror=document.getElementById('a-mirror').checked;L.facing=document.getElementById('a-facing').value;
  const pv=document.getElementById('a-pin').value.trim();if(pv.length===4&&/^\d{4}$/.test(pv)) L.pin=pv;
}
function loadAdminFields(){
  const L=S.locked;
  document.getElementById('a-mode').value=L.mode;document.getElementById('a-filter').value=L.filter;
  document.getElementById('a-timer').value=L.timer;document.getElementById('a-autoreset').value=L.autoReset;
  document.getElementById('a-name').value=L.name;document.getElementById('a-tag').value=L.tag;
  document.getElementById('a-overlay').value=L.overlay||'';document.getElementById('a-color').value=L.color;
  document.getElementById('a-mirror').checked=L.mirror;document.getElementById('a-facing').value=L.facing;
  document.getElementById('a-pin').value=L.pin||'0000';
}

/* THEME */
function applyTheme(){
  const L=S.locked;document.documentElement.style.setProperty('--p',L.color);
  const hx=L.color.replace('#','');const r=parseInt(hx.slice(0,2),16),g=parseInt(hx.slice(2,4),16),b=parseInt(hx.slice(4,6),16);
  document.documentElement.style.setProperty('--pg',`rgba(${r},${g},${b},.35)`);
  const name=L.name||'PhotoBooth Studio';const sp=name.indexOf(' ');
  document.getElementById('ttl').innerHTML=sp>0?name.slice(0,sp)+'<em>'+name.slice(sp+1)+'</em>':name+'<em></em>';
  document.getElementById('sub-ttl').textContent=L.tag||'Tap anywhere to begin';
  document.getElementById('attract-badge').textContent='✦ '+(L.name||'PHOTO BOOTH').toUpperCase()+' ✦';
}

/* CAMERA */
function startCam(){
  stopCam();
  navigator.mediaDevices.getUserMedia({video:{facingMode:S.locked.facing,width:{ideal:1920},height:{ideal:1080}},audio:false})
    .then(stream=>{
      S.stream=stream;const vid=document.getElementById('cam-vid'),cvs=document.getElementById('cam-cvs');
      vid.srcObject=stream;vid.play();
      vid.onloadedmetadata=()=>{
        cvs.width=vid.videoWidth;cvs.height=vid.videoHeight;const ctx=cvs.getContext('2d');
        function loop(){if(!vid.srcObject) return;requestAnimationFrame(loop);ctx.save();if(S.locked.mirror&&S.locked.facing==='user'){ctx.translate(cvs.width,0);ctx.scale(-1,1);}ctx.drawImage(vid,0,0,cvs.width,cvs.height);ctx.restore();if(S.locked.filter!=='none') applyFx(ctx,cvs.width,cvs.height);if(S.locked.overlay) drawWM(ctx,cvs.width,cvs.height,S.locked.overlay);}
        loop();
      };
    }).catch(()=>alert('Camera permission required. Please allow and reload.'));
}
function stopCam(){if(S.stream){S.stream.getTracks().forEach(t=>t.stop());S.stream=null;}const v=document.getElementById('cam-vid');if(v) v.srcObject=null;}
window.flipCam=function(){S.locked.facing=S.locked.facing==='user'?'environment':'user';startCam();};
function drawWM(ctx,w,h,t){ctx.save();ctx.font=`500 ${Math.round(h*.026)}px DM Sans,sans-serif`;ctx.fillStyle='rgba(255,255,255,.6)';ctx.textAlign='center';ctx.fillText(t,w/2,h*.968);ctx.restore();}

/* DOTS */
function buildDots(){const m=MODES.find(x=>x.id===S.locked.mode),total=m?m.shots:1;const ind=document.getElementById('shots-ind');ind.innerHTML='';if(total<2) return;for(let i=0;i<total;i++){const d=document.createElement('div');d.className='shot-dot';ind.appendChild(d);}}

/* FILTERS */
function applyFx(ctx,w,h){
  const fns={
    bw(c,w,h){const d=c.getImageData(0,0,w,h);const p=d.data;for(let i=0;i<p.length;i+=4){const g=p[i]*.299+p[i+1]*.587+p[i+2]*.114;p[i]=p[i+1]=p[i+2]=g;}c.putImageData(d,0,0);},
    sepia(c,w,h){const d=c.getImageData(0,0,w,h);const p=d.data;for(let i=0;i<p.length;i+=4){const r=p[i],g=p[i+1],b=p[i+2];p[i]=Math.min(255,r*.393+g*.769+b*.189);p[i+1]=Math.min(255,r*.349+g*.686+b*.168);p[i+2]=Math.min(255,r*.272+g*.534+b*.131);}c.putImageData(d,0,0);},
    vivid(c,w,h){const d=c.getImageData(0,0,w,h);const p=d.data;for(let i=0;i<p.length;i+=4){p[i]=Math.min(255,p[i]*1.3);p[i+1]=Math.min(255,p[i+1]*1.15);p[i+2]=Math.min(255,p[i+2]*1.3);}c.putImageData(d,0,0);},
    glam(c,w,h){const d=c.getImageData(0,0,w,h);const p=d.data;for(let i=0;i<p.length;i+=4){const br=(p[i]+p[i+1]+p[i+2])/3,s=.55;p[i]=Math.min(255,p[i]*(1-s)+br*s+12);p[i+1]=Math.min(255,p[i+1]*(1-s)+br*s+4);p[i+2]=Math.min(255,p[i+2]*(1-s)+br*s+22);}c.putImageData(d,0,0);const vg=c.createRadialGradient(w/2,h/2,h*.25,w/2,h/2,h*.82);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,.3)');c.fillStyle=vg;c.fillRect(0,0,w,h);},
    cool(c,w,h){const d=c.getImageData(0,0,w,h);const p=d.data;for(let i=0;i<p.length;i+=4){p[i]=Math.max(0,p[i]-18);p[i+2]=Math.min(255,p[i+2]+28);}c.putImageData(d,0,0);},
    warm(c,w,h){const d=c.getImageData(0,0,w,h);const p=d.data;for(let i=0;i<p.length;i+=4){p[i]=Math.min(255,p[i]+28);p[i+1]=Math.min(255,p[i+1]+8);p[i+2]=Math.max(0,p[i+2]-18);}c.putImageData(d,0,0);},
    vintage(c,w,h){const d=c.getImageData(0,0,w,h);const p=d.data;for(let i=0;i<p.length;i+=4){const r=p[i],g=p[i+1],b=p[i+2];p[i]=Math.min(255,r*.88+g*.1+18);p[i+1]=Math.min(255,r*.04+g*.84+8);p[i+2]=Math.min(255,b*.78-16);}c.putImageData(d,0,0);const vg=c.createRadialGradient(w/2,h/2,h*.15,w/2,h/2,.9*h);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(70,15,0,.4)');c.fillStyle=vg;c.fillRect(0,0,w,h);},
  };
  if(fns[S.locked.filter]) fns[S.locked.filter](ctx,w,h);
}

/* SHOOT */
window.shoot=async function(){
  if(S.shooting) return;S.shooting=true;document.getElementById('shutter').classList.add('off');S.frames=[];
  const m=MODES.find(x=>x.id===S.locked.mode),total=m?m.shots:1;
  const dots=document.querySelectorAll('.shot-dot');
  for(let i=0;i<total;i++){await countdown(S.locked.timer);await captureFrame();if(dots[i]) dots[i].classList.add('done');if(i<total-1) await sleep(360);}
  document.getElementById('shutter').classList.remove('off');S.shooting=false;stopCam();composeAndShowGuest();
};
function countdown(secs){return new Promise(res=>{const wrap=document.getElementById('cdown-wrap'),num=document.getElementById('cdown-num');wrap.classList.add('dim');let c=secs;showNum(c);const iv=setInterval(()=>{c--;if(c<=0){clearInterval(iv);wrap.classList.remove('dim');num.classList.remove('show');res();}else showNum(c);},1000);});}
function showNum(n){const el=document.getElementById('cdown-num');el.classList.remove('show');void el.offsetWidth;el.textContent=n;el.classList.add('show');}
function captureFrame(){return new Promise(res=>{const fl=document.getElementById('flash');fl.classList.add('go');setTimeout(()=>fl.classList.remove('go'),100);const src=document.getElementById('cam-cvs');const c=document.createElement('canvas');c.width=src.width;c.height=src.height;c.getContext('2d').drawImage(src,0,0);S.frames.push(c);res();});}

/* COMPOSE */
async function composeAndShowGuest(){
  showProc('Creating your photo…');await sleep(80);
  let result=S.savedTemplate?await applyAdminTemplate(S.frames):composeDefault(S.frames);
  S.finalURL=result.toDataURL('image/png');addToGallery(S.finalURL);
  const gc=document.getElementById('gr-canvas');gc.width=result.width;gc.height=result.height;gc.getContext('2d').drawImage(result,0,0);
  hideProc();showScr('s-guest-review');document.getElementById('guest-share-tray').classList.remove('open');
  startAutoReset(S.locked.autoReset||15);
}
async function applyAdminTemplate(frames){
  const tpl=S.savedTemplate;const cW=tpl.canvasW,cH=tpl.canvasH;
  const c=document.createElement('canvas');c.width=cW;c.height=cH;const ctx=c.getContext('2d');
  await drawBg(ctx,cW,cH,S.locked.bgId,S.locked.customBgURL);
  const sorted=[...tpl.objects].sort((a,b)=>a.zIndex-b.zIndex);
  for(const obj of sorted){
    ctx.save();ctx.translate(obj.x+obj.w/2,obj.y+obj.h/2);ctx.rotate(obj.rot||0);
    if(obj.flipH) ctx.scale(-1,1);if(obj.flipV) ctx.scale(1,-1);
    if(obj.type==='photo-slot'){const fi=frames[obj._frameIndex]||frames[0];if(fi) ctx.drawImage(fi,-obj.w/2,-obj.h/2,obj.w,obj.h);}
    else if(obj.type==='text'){ctx.font=`${obj.bold?'600':'400'} ${obj.fontSize||80}px DM Sans,sans-serif`;ctx.fillStyle=obj.color||'#fff';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(obj.text,0,0);}
    else if(obj.type==='sticker'){ctx.font=`${obj.w}px serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(obj.text,0,0);}
    ctx.restore();
  }
  if(S.locked.overlay) drawWM(ctx,cW,cH,S.locked.overlay);
  return c;
}
function composeDefault(frames){
  const mode=S.locked.mode;if(!frames.length) return document.createElement('canvas');
  const fw=frames[0].width,fh=frames[0].height;
  if(mode==='single'){const c=document.createElement('canvas');c.width=fw;c.height=fh;c.getContext('2d').drawImage(frames[0],0,0);return c;}
  if(mode==='strip'){const sw=Math.round(fw*.45),gap=8,ih=Math.round(sw*(fh/fw));const c=document.createElement('canvas');c.width=sw;c.height=frames.length*(ih+gap)+gap;const ctx=c.getContext('2d');ctx.fillStyle='#111';ctx.fillRect(0,0,c.width,c.height);frames.forEach((f,i)=>ctx.drawImage(f,0,gap+i*(ih+gap),sw,ih));return c;}
  if(mode==='duo'){const pw=Math.round((fw*.9-8)/2),ph=Math.round(pw*(fh/fw)),gap=8;const c=document.createElement('canvas');c.width=pw*2+gap*3;c.height=ph+gap*2;const ctx=c.getContext('2d');ctx.fillStyle='#111';ctx.fillRect(0,0,c.width,c.height);[0,1].forEach(i=>ctx.drawImage(frames[i]||frames[0],gap+i*(pw+gap),gap,pw,ph));return c;}
  if(mode==='grid'){const pw=Math.round(fw*.45),ph=Math.round(pw*(fh/fw)),gap=8;const c=document.createElement('canvas');c.width=pw*2+gap*3;c.height=ph*2+gap*3;const ctx=c.getContext('2d');ctx.fillStyle='#111';ctx.fillRect(0,0,c.width,c.height);[0,1,2,3].forEach(i=>{const col=i%2,row=Math.floor(i/2);ctx.drawImage(frames[i]||frames[0],gap+col*(pw+gap),gap+row*(ph+gap),pw,ph);});return c;}
  return document.createElement('canvas');
}

/* AUTO RESET */
function startAutoReset(secs){
  clearAutoReset();let remaining=secs;
  document.getElementById('reset-countdown').textContent=remaining;
  const fill=document.getElementById('reset-fill');fill.style.transition='none';fill.style.width='100%';
  setTimeout(()=>{fill.style.transition=`width ${secs}s linear`;fill.style.width='0%';},50);
  S.resetInterval=setInterval(()=>{remaining--;document.getElementById('reset-countdown').textContent=remaining;if(remaining<=0){clearAutoReset();resetForNextGuest();}},1000);
}
function clearAutoReset(){clearInterval(S.resetInterval);S.resetInterval=null;}
window.resetForNextGuest=function(){clearAutoReset();S.frames=[];S.finalURL=null;showScr('s-attract');};

/* GUEST SHARE */
window.guestToggleShare=function(){document.getElementById('guest-share-tray').classList.toggle('open');};
window.downloadPhoto=function(){if(!S.finalURL) return;const a=document.createElement('a');a.href=S.finalURL;a.download='photobooth-'+Date.now()+'.png';a.click();};
window.nativeShare=async function(){if(!navigator.share){alert('Share not available on this browser.');return;}try{const blob=durlToBlob(S.finalURL);const file=new File([blob],'photobooth.png',{type:'image/png'});await navigator.share({files:[file],title:S.locked.name||'PhotoBooth'});}catch(e){if(e.name!=='AbortError') console.log(e);}};
window.copyPhoto=async function(){try{const blob=durlToBlob(S.finalURL);await navigator.clipboard.write([new ClipboardItem({'image/png':blob})]);showToast('Copied!');}catch(e){alert('Copy not supported.');}};

/* TEMPLATE GRID */
function buildAdminTemplateGrid(){
  const grid=document.getElementById('admin-tpl-grid');if(!grid) return;grid.innerHTML='';
  const up=document.createElement('div');up.className='tpl-upload-card';up.innerHTML='<div style="font-size:26px">📁</div><div style="font-size:11px;color:rgba(245,240,235,.4);text-align:center;padding:0 6px">Upload background</div>';
  up.onclick=()=>document.getElementById('bg-upload-hidden').click();grid.appendChild(up);
  getSavedBgs().forEach((url,i)=>{grid.appendChild(makeTplCard('custom-'+i,null,url,'Custom '+(i+1)));});
  BUILTIN_BGS.forEach(bg=>{grid.appendChild(makeTplCard(bg.id,renderBgPreview(bg,90,120),null,bg.label));});
  updateTplSel();
}
function makeTplCard(id,previewCanvas,imageURL,label){
  const card=document.createElement('div');card.className='tpl-card';card.dataset.id=id;
  if(previewCanvas) card.appendChild(previewCanvas);
  else if(imageURL){const img=document.createElement('img');img.className='tpl-prev';img.src=imageURL;card.appendChild(img);}
  const lbl=document.createElement('div');lbl.className='tpl-lbl';lbl.textContent=label;
  const ring=document.createElement('div');ring.className='sel-ring';
  card.appendChild(lbl);card.appendChild(ring);
  card.onclick=()=>{S.locked.bgId=id;if(imageURL) S.locked.customBgURL=imageURL;else if(!id.startsWith('custom-')) S.locked.customBgURL=null;updateTplSel();loadEditorBg(()=>renderEditor());};
  return card;
}
function updateTplSel(){document.querySelectorAll('#admin-tpl-grid .tpl-card').forEach(c=>c.classList.toggle('sel',c.dataset.id===S.locked.bgId));}
function renderBgPreview(bg,w,h){const c=document.createElement('canvas');c.width=w;c.height=h;c.style.cssText='width:100%;height:100%;display:block';drawBgSync(c.getContext('2d'),bg,w,h);return c;}
function drawBgSync(ctx,bg,w,h){if(bg.type==='solid'){ctx.fillStyle=bg.color;ctx.fillRect(0,0,w,h);}else if(bg.type==='grad'){const g=ctx.createLinearGradient(0,0,w,h);bg.colors.forEach((col,i)=>g.addColorStop(i/(bg.colors.length-1),col));ctx.fillStyle=g;ctx.fillRect(0,0,w,h);}else if(bg.type==='pattern') drawPattern(ctx,bg,w,h);}
function drawPattern(ctx,bg,w,h){ctx.fillStyle=bg.bg||'#fff';ctx.fillRect(0,0,w,h);if(bg.pat==='dots'){ctx.fillStyle=bg.fg||'#555';for(let x=10;x<w;x+=18)for(let y=10;y<h;y+=18){ctx.beginPath();ctx.arc(x,y,2.5,0,Math.PI*2);ctx.fill();}}else if(bg.pat==='grid'){ctx.strokeStyle=bg.fg||'#ccc';ctx.lineWidth=.8;for(let x=0;x<w;x+=18){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}for(let y=0;y<h;y+=18){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}}else if(bg.pat==='confetti'){const cols=['#ff6b6b','#feca57','#48dbfb','#ff9ff3','#54a0ff','#5f27cd'];for(let i=0;i<50;i++){ctx.fillStyle=cols[i%cols.length];ctx.save();ctx.translate(Math.random()*w,Math.random()*h);ctx.rotate(Math.random()*Math.PI);ctx.fillRect(-4,-2,8,4);ctx.restore();}}}
async function drawBg(ctx,cW,cH,bgId,customBgURL){
  if(customBgURL||bgId.startsWith('custom-')){return new Promise(res=>{const url=customBgURL||getSavedBgs()[parseInt(bgId.replace('custom-',''))||0];if(!url){ctx.fillStyle='#1a1a1a';ctx.fillRect(0,0,cW,cH);res();return;}const img=new Image();img.onload=()=>{ctx.drawImage(img,0,0,cW,cH);res();};img.onerror=()=>{ctx.fillStyle='#1a1a1a';ctx.fillRect(0,0,cW,cH);res();};img.src=url;});}
  const bg=BUILTIN_BGS.find(b=>b.id===bgId)||BUILTIN_BGS[0];drawBgSync(ctx,bg,cW,cH);
}
document.getElementById('bg-upload-hidden').addEventListener('change',function(e){const file=e.target.files[0];if(!file) return;const reader=new FileReader();reader.onload=ev=>{const url=ev.target.result;const bgs=getSavedBgs();bgs.unshift(url);try{localStorage.setItem('pb_bgs',JSON.stringify(bgs.slice(0,8)));}catch(ex){}S.locked.bgId='custom-0';S.locked.customBgURL=url;buildAdminTemplateGrid();loadEditorBg(()=>renderEditor());};reader.readAsDataURL(file);this.value='';});
function getSavedBgs(){try{return JSON.parse(localStorage.getItem('pb_bgs')||'[]');}catch(e){return [];}}

/* TEMPLATE EDITOR */
function initTemplateEditor(){
  const cvs=document.getElementById('tpl-ed-canvas');if(!cvs) return;
  const wrap=cvs.parentElement;const wW=Math.min(wrap.clientWidth||360,500);
  let cW,cH;
  if(S.locked.mode==='strip'){cW=900;cH=2700;}else if(S.locked.mode==='duo'){cW=1800;cH=900;}else if(S.locked.mode==='grid'){cW=1800;cH=1800;}else{cW=1080;cH=1350;}
  cvs.width=cW;cvs.height=cH;const scale=Math.min((wW-24)/cW,320/cH);
  cvs.style.width=Math.round(cW*scale)+'px';cvs.style.height=Math.round(cH*scale)+'px';
  const ed=S.ed;ed.canvas=cvs;ed.ctx=cvs.getContext('2d');ed.canvasW=cW;ed.canvasH=cH;ed.objects=[];ed.selected=-1;ed.history=[];
  loadEditorBg(()=>{placeDefaultSlots();renderEditor();});
  cvs.addEventListener('touchstart',edTouchStart,{passive:false});cvs.addEventListener('touchmove',edTouchMove,{passive:false});cvs.addEventListener('touchend',edTouchEnd,{passive:false});
  cvs.addEventListener('mousedown',edMouseDown);window.addEventListener('mousemove',edMouseMove);window.addEventListener('mouseup',edMouseUp);
}
function loadEditorBg(cb){const ed=S.ed;if(S.locked.customBgURL&&S.locked.bgId.startsWith('custom-')){const img=new Image();img.onload=()=>{ed.bgImg=img;ed.bgDef=null;if(cb)cb();};img.src=S.locked.customBgURL;return;}ed.bgImg=null;ed.bgDef=BUILTIN_BGS.find(b=>b.id===S.locked.bgId)||BUILTIN_BGS[0];if(cb)cb();}
function placeDefaultSlots(){const ed=S.ed,cW=ed.canvasW,cH=ed.canvasH;const slots=getLayoutSlots(S.locked.mode,cW,cH);ed.objects=slots.map((sl,i)=>({type:'photo-slot',_frameIndex:i,label:'Photo '+(i+1),x:sl.x,y:sl.y,w:sl.w,h:sl.h,rot:0,flipH:false,flipV:false,zIndex:i+1}));ed.history=[JSON.stringify(ed.objects)];}
function getLayoutSlots(mode,cW,cH){const pad=Math.round(cW*.04);if(mode==='single'){const pw=cW-pad*2,ph=Math.round(pw*(cH-pad*2)/cW);return [{x:pad,y:Math.round((cH-ph)/2),w:pw,h:ph}];}if(mode==='strip'){const pw=cW-pad*2,ph=Math.round((cH-pad*4)/3);return [0,1,2].map(i=>({x:pad,y:pad+i*(ph+pad),w:pw,h:ph}));}if(mode==='duo'){const pw=Math.round((cW-pad*3)/2),ph=cH-pad*2;return [{x:pad,y:pad,w:pw,h:ph},{x:pad*2+pw,y:pad,w:pw,h:ph}];}if(mode==='grid'){const pw=Math.round((cW-pad*3)/2),ph=Math.round((cH-pad*3)/2);return [{x:pad,y:pad,w:pw,h:ph},{x:pad*2+pw,y:pad,w:pw,h:ph},{x:pad,y:pad*2+ph,w:pw,h:ph},{x:pad*2+pw,y:pad*2+ph,w:pw,h:ph}];}return [];}

function renderEditor(){
  const ed=S.ed,ctx=ed.ctx,cW=ed.canvasW,cH=ed.canvasH;ctx.clearRect(0,0,cW,cH);
  if(ed.bgImg) ctx.drawImage(ed.bgImg,0,0,cW,cH);else if(ed.bgDef) drawBgSync(ctx,ed.bgDef,cW,cH);else{ctx.fillStyle='#1a1a1a';ctx.fillRect(0,0,cW,cH);}
  [...ed.objects].sort((a,b)=>a.zIndex-b.zIndex).forEach(obj=>{
    const i=ed.objects.indexOf(obj);ctx.save();ctx.translate(obj.x+obj.w/2,obj.y+obj.h/2);ctx.rotate(obj.rot||0);if(obj.flipH) ctx.scale(-1,1);if(obj.flipV) ctx.scale(1,-1);
    if(obj.type==='photo-slot'){ctx.fillStyle='rgba(255,255,255,.07)';ctx.fillRect(-obj.w/2,-obj.h/2,obj.w,obj.h);ctx.strokeStyle='rgba(255,255,255,.22)';ctx.lineWidth=4;ctx.setLineDash([16,10]);ctx.strokeRect(-obj.w/2,-obj.h/2,obj.w,obj.h);ctx.setLineDash([]);ctx.fillStyle='rgba(255,255,255,.3)';ctx.font=`500 ${Math.round(obj.h*.1)}px DM Sans,sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('📷 '+(obj.label||'Photo'),0,0);}
    else if(obj.type==='text'){ctx.font=`${obj.bold?'600':'400'} ${obj.fontSize||80}px DM Sans,sans-serif`;ctx.fillStyle=obj.color||'#fff';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(obj.text,0,0);}
    else if(obj.type==='sticker'){ctx.font=`${obj.w}px serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(obj.text,0,0);}
    ctx.restore();
    if(i===ed.selected){ctx.save();ctx.translate(obj.x+obj.w/2,obj.y+obj.h/2);ctx.rotate(obj.rot||0);ctx.strokeStyle='#e8365d';ctx.lineWidth=5;ctx.setLineDash([14,7]);ctx.strokeRect(-obj.w/2,-obj.h/2,obj.w,obj.h);ctx.setLineDash([]);[[-obj.w/2,-obj.h/2],[obj.w/2,-obj.h/2],[obj.w/2,obj.h/2],[-obj.w/2,obj.h/2]].forEach(([hx,hy])=>{ctx.beginPath();ctx.arc(hx,hy,16,0,Math.PI*2);ctx.fillStyle='#fff';ctx.fill();ctx.strokeStyle='#e8365d';ctx.lineWidth=3;ctx.stroke();});ctx.beginPath();ctx.arc(0,-obj.h/2-45,16,0,Math.PI*2);ctx.fillStyle='#f5c518';ctx.fill();ctx.stroke();ctx.restore();}
  });
  if(S.locked.overlay){ctx.save();ctx.font=`500 ${Math.round(cH*.022)}px DM Sans,sans-serif`;ctx.fillStyle='rgba(255,255,255,.5)';ctx.textAlign='center';ctx.fillText(S.locked.overlay,cW/2,cH*.978);ctx.restore();}
}

/* touch/mouse editor */
function getCP(e,cvs){const r=cvs.getBoundingClientRect(),sx=cvs.width/r.width,sy=cvs.height/r.height,src=e.touches?e.touches[0]:e;return{x:(src.clientX-r.left)*sx,y:(src.clientY-r.top)*sy};}
function getTs(e,cvs){const r=cvs.getBoundingClientRect(),sx=cvs.width/r.width,sy=cvs.height/r.height;return Array.from(e.touches).map(t=>({x:(t.clientX-r.left)*sx,y:(t.clientY-r.top)*sy}));}
function hitTest(x,y){const ed=S.ed,keys=[...ed.objects.keys()].sort((a,b)=>ed.objects[b].zIndex-ed.objects[a].zIndex);for(const i of keys){const o=ed.objects[i];const dx=x-(o.x+o.w/2),dy=y-(o.y+o.h/2);const ca=Math.cos(-(o.rot||0)),sa=Math.sin(-(o.rot||0));if(Math.abs(dx*ca-dy*sa)<=o.w/2+16&&Math.abs(dx*sa+dy*ca)<=o.h/2+16) return i;}return -1;}
let _d={active:false,mode:'',startX:0,startY:0,startObjX:0,startObjY:0,pinchDist:0,pinchRot:0,startW:0,startH:0,startRot:0,centerX:0,centerY:0};
function edTouchStart(e){e.preventDefault();const ts=getTs(e,S.ed.canvas);if(ts.length===1){const{x,y}=ts[0];const hit=hitTest(x,y);if(hit>=0&&S.ed.selected===hit){const o=S.ed.objects[hit];const dx=x-(o.x+o.w/2),dy=y-(o.y+o.h/2);const ca=Math.cos(-(o.rot||0)),sa=Math.sin(-(o.rot||0));const lx=dx*ca-dy*sa,ly=dx*sa+dy*ca;if(Math.abs(lx)<32&&ly<-o.h/2-25&&ly>-o.h/2-72){_d={active:true,mode:'rotate',startX:x,startY:y,startObjX:o.x+o.w/2,startObjY:o.y+o.h/2,startRot:o.rot||0};return;}const corners=[[-o.w/2,-o.h/2],[o.w/2,-o.h/2],[o.w/2,o.h/2],[-o.w/2,o.h/2]];for(const[cx,cy]of corners){const gx=o.x+o.w/2+(cx*Math.cos(o.rot||0)-cy*Math.sin(o.rot||0));const gy=o.y+o.h/2+(cx*Math.sin(o.rot||0)+cy*Math.cos(o.rot||0));if(Math.hypot(x-gx,y-gy)<34){_d={active:true,mode:'resize',startX:x,startY:y,startW:o.w,startH:o.h,startObjX:o.x,startObjY:o.y,startRot:o.rot||0,centerX:o.x+o.w/2,centerY:o.y+o.h/2};return;}}}S.ed.selected=hit;if(hit>=0){const o=S.ed.objects[hit];_d={active:true,mode:'move',startX:x,startY:y,startObjX:o.x,startObjY:o.y};}renderEditor();}else if(ts.length===2){const[t1,t2]=ts;_d.pinchDist=Math.hypot(t2.x-t1.x,t2.y-t1.y);_d.pinchRot=Math.atan2(t2.y-t1.y,t2.x-t1.x);if(S.ed.selected>=0){const o=S.ed.objects[S.ed.selected];_d.startW=o.w;_d.startH=o.h;_d.startRot=o.rot||0;_d.mode='pinch';}}}
function edTouchMove(e){e.preventDefault();if(!_d.active) return;const ts=getTs(e,S.ed.canvas);if(ts.length===2&&_d.mode==='pinch'&&S.ed.selected>=0){const[t1,t2]=ts;const dist=Math.hypot(t2.x-t1.x,t2.y-t1.y);const rot=Math.atan2(t2.y-t1.y,t2.x-t1.x);const sc=dist/_d.pinchDist;const o=S.ed.objects[S.ed.selected];o.w=Math.max(60,_d.startW*sc);o.h=Math.max(60,_d.startH*sc);o.rot=_d.startRot+(rot-_d.pinchRot);renderEditor();return;}if(ts.length<1) return;const{x,y}=ts[0];if(_d.mode==='move'&&S.ed.selected>=0){const o=S.ed.objects[S.ed.selected];o.x=_d.startObjX+(x-_d.startX);o.y=_d.startObjY+(y-_d.startY);renderEditor();}else if(_d.mode==='rotate'&&S.ed.selected>=0){S.ed.objects[S.ed.selected].rot=Math.atan2(y-_d.startObjY,x-_d.startObjX)+Math.PI/2;renderEditor();}else if(_d.mode==='resize'&&S.ed.selected>=0){const o=S.ed.objects[S.ed.selected];const sc=Math.hypot(x-_d.centerX,y-_d.centerY)/Math.hypot(_d.startW/2,_d.startH/2);o.w=Math.max(60,_d.startW*sc);o.h=Math.max(60,_d.startH*sc);renderEditor();}}
function edTouchEnd(e){e.preventDefault();if(_d.active&&_d.mode!=='') S.ed.history.push(JSON.stringify(S.ed.objects));_d={active:false,mode:''};}
let _m={down:false,startX:0,startY:0,startObjX:0,startObjY:0};
function edMouseDown(e){if(!S.ed.canvas) return;const{x,y}=getCP(e,S.ed.canvas);const hit=hitTest(x,y);S.ed.selected=hit;if(hit>=0){const o=S.ed.objects[hit];_m={down:true,startX:x,startY:y,startObjX:o.x,startObjY:o.y};}renderEditor();}
function edMouseMove(e){if(!_m.down||S.ed.selected<0||!S.ed.canvas) return;const{x,y}=getCP(e,S.ed.canvas);const o=S.ed.objects[S.ed.selected];o.x=_m.startObjX+(x-_m.startX);o.y=_m.startObjY+(y-_m.startY);renderEditor();}
function edMouseUp(){_m.down=false;}

/* editor toolbar */
function buildAdminSlotsBar(){const bar=document.getElementById('admin-slots-bar');if(!bar) return;bar.innerHTML='<span style="font-size:11px;color:rgba(245,240,235,.35);white-space:nowrap;flex-shrink:0;font-weight:500">Slots:</span>';const m=MODES.find(x=>x.id===S.locked.mode)||MODES[0];for(let i=0;i<m.shots;i++){const sl=document.createElement('div');sl.className='pslot';sl.innerHTML='<span style="font-size:11px;color:rgba(245,240,235,.4)">P'+(i+1)+'</span>';sl.onclick=()=>{const obj=S.ed.objects.find(o=>o.type==='photo-slot'&&o._frameIndex===i);if(obj){S.ed.selected=S.ed.objects.indexOf(obj);renderEditor();}};bar.appendChild(sl);}}
window.edUndo=function(){if(S.ed.history.length<=1){S.ed.objects=[];renderEditor();return;}S.ed.history.pop();S.ed.objects=JSON.parse(S.ed.history[S.ed.history.length-1]);S.ed.selected=-1;renderEditor();};
window.edDelete=function(){if(S.ed.selected<0) return;S.ed.history.push(JSON.stringify(S.ed.objects));S.ed.objects.splice(S.ed.selected,1);S.ed.selected=-1;renderEditor();};
window.edFlipH=function(){if(S.ed.selected<0) return;S.ed.objects[S.ed.selected].flipH=!S.ed.objects[S.ed.selected].flipH;renderEditor();};
window.edFlipV=function(){if(S.ed.selected<0) return;S.ed.objects[S.ed.selected].flipV=!S.ed.objects[S.ed.selected].flipV;renderEditor();};
window.edBringFront=function(){if(S.ed.selected<0) return;const max=Math.max(...S.ed.objects.map(o=>o.zIndex));S.ed.objects[S.ed.selected].zIndex=max+1;renderEditor();};
window.edSendBack=function(){if(S.ed.selected<0) return;const min=Math.min(...S.ed.objects.map(o=>o.zIndex));S.ed.objects[S.ed.selected].zIndex=min-1;renderEditor();};
window.edResetLayout=function(){placeDefaultSlots();renderEditor();};
window.edAddText=function(){const txt=prompt('Enter text:');if(!txt) return;S.ed.objects.push({type:'text',text:txt,x:S.ed.canvasW/2-200,y:S.ed.canvasH/2-50,w:400,h:100,rot:0,flipH:false,flipV:false,zIndex:S.ed.objects.length+10,fontSize:80,color:'#ffffff',bold:false});S.ed.selected=S.ed.objects.length-1;S.ed.history.push(JSON.stringify(S.ed.objects));renderEditor();};
window.edAddSticker=function(){const ex=document.getElementById('sticker-picker');if(ex){ex.remove();return;}const pk=document.createElement('div');pk.id='sticker-picker';STICKERS.forEach(s=>{const b=document.createElement('button');b.textContent=s;b.style.cssText='background:none;border:none;font-size:26px;cursor:pointer;padding:4px;border-radius:8px';b.onclick=()=>{S.ed.objects.push({type:'sticker',text:s,x:S.ed.canvasW/2-100,y:S.ed.canvasH/2-100,w:200,h:200,rot:0,flipH:false,flipV:false,zIndex:S.ed.objects.length+10});S.ed.selected=S.ed.objects.length-1;S.ed.history.push(JSON.stringify(S.ed.objects));renderEditor();pk.remove();};pk.appendChild(b);});document.body.appendChild(pk);setTimeout(()=>document.addEventListener('click',()=>pk.remove(),{once:true}),100);};
window.saveTemplate=function(){
  const tpl={canvasW:S.ed.canvasW,canvasH:S.ed.canvasH,objects:S.ed.objects.map(o=>({...o,img:undefined}))};
  S.savedTemplate=tpl;S.savedTemplateURL=S.ed.canvas.toDataURL('image/jpeg',.6);saveState();
  const pv=document.getElementById('saved-tpl-preview');if(pv){pv.style.display='block';const pc=document.getElementById('saved-prev-canvas');const img=new Image();img.onload=()=>{pc.width=img.width;pc.height=img.height;pc.style.cssText='max-width:100%;max-height:180px;border-radius:8px';pc.getContext('2d').drawImage(img,0,0);};img.src=S.savedTemplateURL;}
  showToast('Template saved! All guests will use this layout ✓');
};
document.getElementById('a-mode').addEventListener('change',function(){S.locked.mode=this.value;buildAdminSlotsBar();initTemplateEditor();});

/* GALLERY */
function addToGallery(url){S.gallery.unshift(url);try{localStorage.setItem('pb_gal',JSON.stringify(S.gallery.slice(0,80)));}catch(e){}document.getElementById('gallery-count').textContent=S.gallery.length+' photo'+(S.gallery.length!==1?'s':'');}
function renderGallery(){const gg=document.getElementById('gg');if(!gg) return;gg.innerHTML='';document.getElementById('gallery-count').textContent=S.gallery.length+' photo'+(S.gallery.length!==1?'s':'');if(!S.gallery.length){gg.innerHTML='<div class="g-empty">No photos yet. Go launch the booth!</div>';return;}S.gallery.forEach(url=>{const d=document.createElement('div');d.className='gi';const im=document.createElement('img');im.src=url;im.loading='lazy';d.appendChild(im);d.onclick=()=>openLB(url);gg.appendChild(d);});}
window.clearGallery=function(){if(!confirm('Delete all photos?')) return;S.gallery=[];try{localStorage.removeItem('pb_gal');}catch(e){}renderGallery();};
window.exportAllPhotos=function(){if(!S.gallery.length){alert('No photos.');return;}S.gallery.forEach((url,i)=>setTimeout(()=>{const a=document.createElement('a');a.href=url;a.download='photo-'+(i+1)+'.png';a.click();},i*300));};
function openLB(url){document.getElementById('lb-img').src=url;document.getElementById('lb-dl').onclick=()=>{const a=document.createElement('a');a.href=url;a.download='photo-'+Date.now()+'.png';a.click();};document.getElementById('lb').classList.add('on');}
window.closeLB=function(){document.getElementById('lb').classList.remove('on');};

/* PROC */
function showProc(txt){document.getElementById('proc-txt').textContent=txt;document.getElementById('proc').classList.remove('hide');}
function hideProc(){document.getElementById('proc').classList.add('hide');}

/* TOAST */
function showToast(msg){let t=document.getElementById('toast');if(!t){t=document.createElement('div');t.id='toast';t.style.cssText='position:fixed;bottom:calc(32px + var(--safe-b));left:50%;transform:translateX(-50%);background:#222;border:1px solid rgba(255,255,255,.2);color:#fff;padding:12px 22px;border-radius:100px;font-size:14px;font-weight:500;z-index:500;white-space:nowrap;transition:opacity .3s';document.body.appendChild(t);}t.textContent=msg;t.style.opacity='1';clearTimeout(t._tid);t._tid=setTimeout(()=>{t.style.opacity='0';},2500);}

/* PERSIST */
function saveState(){try{localStorage.setItem('pb_locked',JSON.stringify(S.locked));if(S.savedTemplate) localStorage.setItem('pb_tpl',JSON.stringify(S.savedTemplate));if(S.savedTemplateURL) localStorage.setItem('pb_tpl_prev',S.savedTemplateURL);}catch(e){}}
function loadState(){
  try{const l=JSON.parse(localStorage.getItem('pb_locked')||'null');if(l) Object.assign(S.locked,l);const g=JSON.parse(localStorage.getItem('pb_gal')||'[]');if(Array.isArray(g)) S.gallery=g;const tpl=JSON.parse(localStorage.getItem('pb_tpl')||'null');if(tpl) S.savedTemplate=tpl;const tplPrev=localStorage.getItem('pb_tpl_prev');if(tplPrev){S.savedTemplateURL=tplPrev;setTimeout(()=>{const pv=document.getElementById('saved-tpl-preview');if(pv){pv.style.display='block';const pc=document.getElementById('saved-prev-canvas');const img=new Image();img.onload=()=>{pc.width=img.width;pc.height=img.height;pc.style.cssText='max-width:100%;max-height:180px;border-radius:8px';pc.getContext('2d').drawImage(img,0,0);};img.src=tplPrev;}},200);}
  }catch(e){}
}

/* UTILS */
function sleep(ms){return new Promise(r=>setTimeout(r,ms));}
function durlToBlob(durl){const[h,b]=durl.split(','),mime=h.match(/:(.*?);/)[1],bin=atob(b);const arr=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)arr[i]=bin.charCodeAt(i);return new Blob([arr],{type:mime});}
document.addEventListener('touchmove',e=>{if(e.target===document.body)e.preventDefault();},{passive:false});
document.addEventListener('contextmenu',e=>e.preventDefault());
let wl=null;
async function reqWL(){if('wakeLock' in navigator)try{wl=await navigator.wakeLock.request('screen');}catch(e){}}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&S.scr==='s-camera')reqWL();});
console.log('📸 PhotoBooth Studio Admin/Guest ready');
})();
