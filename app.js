(function(){
const $=s=>document.querySelector(s), app=$('#app'), title=$('#title'), back=$('#back');
let map=null, user=null, userLL=null, accC=null, watchId=null, stopEls=[];
const LS={get:k=>{try{return localStorage.getItem(k)}catch(e){return null}},set:(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}}};
const dist=(a,b)=>{const R=6371,r=Math.PI/180,dl=(b[0]-a[0])*r,dn=(b[1]-a[1])*r,x=Math.sin(dl/2)**2+Math.cos(a[0]*r)*Math.cos(b[0]*r)*Math.sin(dn/2)**2;return 2*R*Math.asin(Math.sqrt(x))};
const fmt=k=>k<1?Math.round(k*1000)+' m':k<100?k.toFixed(1)+' km':Math.round(k)+' km';
function todayIdx(){const d=LS.get('start');if(!d)return -1;const n=Math.floor((new Date(new Date().toDateString())-new Date(d+'T00:00:00'))/864e5)+1;return n>=1&&n<=12?n:-1}
function killMap(){if(watchId!=null){navigator.geolocation.clearWatch(watchId);watchId=null}if(map){map.remove();map=null}user=accC=userLL=null}

function home(){
  killMap();title.textContent='Vietnam';back.hidden=true;const t=todayIdx();
  app.innerHTML=`<div class="hero"><h2>Exploration vietnamienne</h2><div>12 jours · 9 nuits · 2 vols intérieurs</div>
  <label>Date de départ (pour repérer le jour en cours)<br><input type="date" id="start" value="${LS.get('start')||''}"></label></div>`+
  DAYS.map(d=>`<a class="day${d.n===t?' today':''}" href="#j${d.n}"><b class="n">J${d.n}</b><div><strong>${d.t}</strong><small>${d.km}</small></div></a>`).join('');
  $('#start').onchange=e=>{LS.set('start',e.target.value);home()};
  if(t>0)location.hash==='#'||history.replaceState(null,'','#');
}
function pratique(){
  killMap();title.textContent='Infos pratiques';back.hidden=false;back.href='#';
  app.innerHTML=PRATIQUE.map(([h,t])=>`<div class="card"><h3>${h}</h3>${t}</div>`).join('')+'<p class="warn">Données du PDF du circuit ; vérifiez les formalités et le change avant le départ.</p>';
}
function day(n){
  killMap();const d=DAYS[n-1];if(!d)return home();
  title.textContent=`Jour ${n} · ${d.t}`;back.hidden=false;back.href='#';
  const hotel=d.url?`<a href="${d.url}" target="_blank" rel="noopener">${d.hotel}</a>`:d.hotel;
  app.innerHTML=`<div class="tags"><span>${d.km}</span><span>🛏 ${hotel}</span></div>
  <div class="bar"><button id="loc">📍 Ma position</button><button class="alt" id="fit">Voir l'étape</button></div>
  <div id="map"></div><div class="warn" id="gps">Autorisez la localisation pour voir votre position et la distance aux étapes. Positions des sites approximatives.</div>
  <div class="card"><h3>Étapes du jour</h3><div id="stops"></div></div>
  <div class="card"><h3>Programme</h3><ul>${d.prog.map(x=>`<li>${x}</li>`).join('')}</ul></div>
  <div class="card"><h3>Repas</h3>${d.meals}</div>
  <div class="card"><h3>À savoir (géographie, histoire, tourisme)</h3><ul>${d.info.map(x=>`<li>${x}</li>`).join('')}</ul></div>
  <div class="nav">${n>1?`<a class="btn" href="#j${n-1}">‹ J${n-1}</a>`:'<span></span>'}${n<12?`<a class="btn" href="#j${n+1}">J${n+1} ›</a>`:'<span></span>'}</div>`;
  map=L.map('map');
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'© les contributeurs <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}).addTo(map);
  const pts=d.stops.map(s=>[s[0],s[1]]);
  if(pts.length>1)L.polyline(pts,{color:'#c00000',weight:3,dashArray:'6 6',opacity:.7}).addTo(map);
  stopEls=[];
  const box=$('#stops');
  d.stops.forEach((s,i)=>{
    const m=L.marker([s[0],s[1]],{icon:L.divIcon({className:'',html:`<div class="pin">${i+1}</div>`,iconSize:[24,24],iconAnchor:[12,12]})}).addTo(map).bindPopup(`<b>${s[2]}</b><br>${s[3]}`);
    const el=document.createElement('div');el.className='stop';el.innerHTML=`<i>${i+1}</i><div><strong>${s[2]}</strong><br><small>${s[3]}</small></div><em></em>`;
    el.onclick=()=>{map.setView([s[0],s[1]],Math.max(map.getZoom(),13));m.openPopup();$('#map').scrollIntoView({behavior:'smooth',block:'center'})};
    box.appendChild(el);stopEls.push(el);
  });
  const fit=()=>pts.length>1?map.fitBounds(pts,{padding:[30,30],maxZoom:13}):map.setView(pts[0],12);
  fit();$('#fit').onclick=fit;$('#loc').onclick=()=>{if(userLL)map.fitBounds([userLL,...pts],{padding:[30,30]});else locate()};
  locate();
}
function locate(){
  const g=$('#gps');
  if(!navigator.geolocation){g.textContent='Géolocalisation indisponible sur cet appareil.';return}
  if(watchId!=null)return;
  watchId=navigator.geolocation.watchPosition(p=>{
    userLL=[p.coords.latitude,p.coords.longitude];
    if(!map)return;
    if(!user){user=L.circleMarker(userLL,{radius:8,color:'#fff',weight:3,fillColor:'#1a73e8',fillOpacity:1}).addTo(map);accC=L.circle(userLL,{radius:p.coords.accuracy,color:'#1a73e8',weight:1,fillOpacity:.1}).addTo(map)}
    else{user.setLatLng(userLL);accC.setLatLng(userLL);accC.setRadius(p.coords.accuracy)}
    const d=DAYS[+(location.hash.slice(2))-1];
    if(d)d.stops.forEach((s,i)=>{const e=stopEls[i]&&stopEls[i].querySelector('em');if(e)e.textContent=fmt(dist(userLL,[s[0],s[1]]))});
    g.textContent=`Position mise à jour (précision ≈ ${Math.round(p.coords.accuracy)} m).`;
  },e=>{g.textContent='Position indisponible ('+e.message+'). Vérifiez l\'autorisation de localisation.';watchId=null},{enableHighAccuracy:true,maximumAge:10000,timeout:20000});
}
function route(){
  const h=location.hash;window.scrollTo(0,0);
  if(h==='#infos')pratique();else{const m=/^#j(\d+)$/.exec(h);m?day(+m[1]):home()}
}
window.addEventListener('hashchange',route);route();
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
})();
