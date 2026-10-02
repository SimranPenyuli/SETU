const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Lightweight .env loader so the local prototype can use SMS credentials
// without adding another dependency. Environment variables already set by
// the OS/process always take precedence.
(function loadDotEnv(){
  try{
    const envFile=path.join(__dirname,'.env');
    if(!fs.existsSync(envFile)) return;
    for(const raw of fs.readFileSync(envFile,'utf8').split(/\\r?\\n/)){
      const line=raw.trim();
      if(!line || line.startsWith('#') || !line.includes('=')) continue;
      const idx=line.indexOf('=');
      const key=line.slice(0,idx).trim();
      let value=line.slice(idx+1).trim();
      if((value.startsWith('"')&&value.endsWith('"'))||(value.startsWith("'")&&value.endsWith("'"))) value=value.slice(1,-1);
      if(key && process.env[key]===undefined) process.env[key]=value;
    }
  }catch(e){ console.warn('SETU .env could not be loaded:',e.message); }
})();
const { resolveIdentity } = require('./lib/match');
const { analyze } = require('./lib/nlp');
const { readJSON, writeJSON } = require('./lib/store');
const { login } = require('./lib/auth');
const { translateText } = require('./lib/translate');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

function loadDB(file) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, 'data', file), 'utf-8'));
}
function now() { return new Date().toISOString(); }
function cleanPhone(phone) { return String(phone || '').replace(/\D/g, '').slice(-10); }
function severityFor(type, description='') {
  const text = String(type || '') + ' ' + String(description || '');
  if (/murder|sexual assault|rape|kidnap|armed robbery|attempted murder|weapon|life threat|terror/i.test(text)) return 'Critical';
  if (/robbery|burglary|missing person|serious road accident|assault|cybercrime|threat/i.test(text)) return 'High';
  if (/theft|harassment|fraud|property dispute|fight|minor/i.test(text)) return 'Medium';
  return 'Low';
}
const COMPLAINT_TYPES = [
  'Murder','Sexual Assault (Rape)','Kidnapping','Attempted Murder','Armed Robbery','Serious Road Accident',
  'Robbery','Burglary / House Breaking','Missing Person','Cybercrime / Online Fraud','Assault / Fight','Threat / Harassment',
  'Vehicle Theft','Phone Theft','Property Theft','Fraud','Property Dispute','Other'
];
const AREA_POINTS = {
  'Meerut Bypass': {city:'Meerut',lat:28.9704,lng:77.7220}, 'Modipuram': {city:'Meerut',lat:29.0100,lng:77.7040},
  'Kanker Khera': {city:'Meerut',lat:29.0157,lng:77.6724}, 'Begum Bridge': {city:'Meerut',lat:28.9897,lng:77.7033},
  'Shastri Nagar': {city:'Meerut',lat:28.9639,lng:77.7180}, 'Delhi Road, Meerut': {city:'Meerut',lat:28.9820,lng:77.7480},
  'Sadar Bazaar, Meerut': {city:'Meerut',lat:28.9907,lng:77.7047}, 'Partapur': {city:'Meerut',lat:28.9208,lng:77.6798},
  'Delhi Central': {city:'Delhi',lat:28.6328,lng:77.2197}, 'Rohini': {city:'Delhi',lat:28.7495,lng:77.0565},
  'Dwarka': {city:'Delhi',lat:28.5921,lng:77.0460}, 'Shahdara': {city:'Delhi',lat:28.6731,lng:77.2890},
  'New Delhi Railway Area': {city:'Delhi',lat:28.6420,lng:77.2195}, 'Saket': {city:'Delhi',lat:28.5244,lng:77.2066},
  'Karol Bagh': {city:'Delhi',lat:28.6514,lng:77.1907}, 'Janakpuri': {city:'Delhi',lat:28.6219,lng:77.0878}
};

app.get('/api/health', (req,res) => res.json({status:'ok', service:'SETU backend', time:now()}));

app.post('/api/login', (req,res) => {
  const { id, password } = req.body || {};
  const officer = login((id || '').trim(), password || '');
  if (!officer) return res.status(401).json({error:'Invalid badge ID or password'});
  if (String(officer.rank || '').toLowerCase() !== 'inspector') return res.status(403).json({error:'Only Inspector login is allowed in SETU.'});
  res.json({ officer });
});

async function geocodeAddress(address){
  const q=String(address||'').trim();
  if(!q) return null;
  try{
    const url='https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=in&q='+encodeURIComponent(q);
    const r=await fetch(url,{headers:{'User-Agent':'SETU-Police-AI/12.0'}});
    if(!r.ok) return null;
    const data=await r.json();
    if(!Array.isArray(data)||!data.length) return null;
    const lat=Number(data[0].lat),lng=Number(data[0].lon);
    if(!Number.isFinite(lat)||!Number.isFinite(lng)) return null;
    return {lat,lng,city:String(data[0].display_name||'').split(',')[0]||''};
  }catch(e){return null;}
}


app.get('/api/identity/search', (req,res) => {
  const q = String(req.query.q || '').trim();
  if (!q) return res.status(400).json({error:'Missing query param \"q\"'});
  const identity=resolveIdentity(q,loadDB('db1_police.json'),loadDB('db2_transport.json'),loadDB('db3_civil.json'),loadDB('db4_criminal.json'));
  const nq=q.toLowerCase().replace(/\s+/g,' ').trim();
  const complaints=readJSON('complaints.json').filter(r=>[r.complainantName,r.accusedName,r.description,r.referenceNumber,r.id].join(' ').toLowerCase().includes(nq));
  res.json({...identity,complaints,firs:complaints,totals:{complaints:complaints.length,criminalHistory:Array.isArray(identity.criminalHistory?.pastCrimes)?identity.criminalHistory.pastCrimes.length:0}});
});

app.get('/api/person/profile', (req,res) => {
  const q=String(req.query.q||'').trim();
  if(!q) return res.status(400).json({error:'Enter a person name.'});
  const identity=resolveIdentity(q,loadDB('db1_police.json'),loadDB('db2_transport.json'),loadDB('db3_civil.json'),loadDB('db4_criminal.json'));
  const nq=q.toLowerCase();
  const complaints=readJSON('complaints.json').filter(r=>[r.complainantName,r.accusedName,r.description].join(' ').toLowerCase().includes(nq)).sort((a,b)=>new Date(b.filedAt)-new Date(a.filedAt));
  if(!identity.matched && !complaints.length) return res.json({matched:false,query:q,complaints:[],firs:[]});
  const criminal=identity.criminalHistory||null, historicalCases=Array.isArray(criminal?.pastCrimes)?criminal.pastCrimes:[];
  res.json({matched:!!identity.matched,query:q,displayName:identity.displayName||q,confidence:identity.confidence||0,police:identity.hits?.find(h=>h.source==='Police records')?.record||null,transport:identity.hits?.find(h=>h.source==='Transport records')?.record||null,civil:identity.hits?.find(h=>h.source==='Civil records')?.record||null,criminal,historicalCases,complaints,firs:complaints.map(r=>({id:r.id,referenceNumber:r.referenceNumber||r.id,complaintType:r.complaintType,complainantName:r.complainantName,accusedName:r.accusedName,description:r.description,area:r.area,location:r.location,severity:r.severity,status:r.status,filedAt:r.filedAt,reportDeadline:r.reportDeadline,filedByOfficerName:r.filedByOfficerName,caseHistory:r.caseHistory||[]}))});
});

app.get('/api/reports/search', (req,res) => {
  const q=String(req.query.q||'').trim().toLowerCase();
  if(!q) return res.status(400).json({error:'Enter a report name or report ID.'});
  const rows=readJSON('complaints.json').filter(r=>[
    r.id,r.complainantName,r.accusedName,r.complaintType,r.area,r.filedByOfficerName
  ].some(v=>String(v||'').toLowerCase().includes(q))).sort((a,b)=>new Date(b.filedAt)-new Date(a.filedAt));
  res.json(rows.slice(0,30));
});

app.post('/api/nlp/analyze', async (req,res) => {
  const text=(req.body?.text||'').trim();
  if(!text) return res.status(400).json({error:'Missing "text" in request body'});
  const result=analyze(text);
  try {
    // Analyze multilingual complaint and always translate the original text to Hindi.
    // The NLP panel is intended to give officers a Hindi rendering of any supported language.
    const detected = String(result.language || '').toLowerCase();
    const source = detected.includes('hindi') ? 'hi' : detected.includes('tamil') ? 'ta' : detected.includes('telugu') ? 'te' : detected.includes('bengali') ? 'bn' : detected.includes('kannada') ? 'kn' : detected.includes('gujarati') ? 'gu' : detected.includes('gurmukhi') ? 'pa' : detected.includes('malayalam') ? 'ml' : detected.includes('english') ? 'en' : 'auto';
    result.translationHi = await translateText(text, 'hi', source);
    result.translationAvailable = true;
  } catch(e) {
    result.translationHi = '';
    result.translationAvailable = false;
    result.translationError = 'Translation service unavailable. Please check the server internet connection.';
  }
  res.json(result);
});
app.post('/api/translate', async (req,res)=>{
  const text=(req.body?.text||'').trim(), target=req.body?.target||'hi';
  if(!text) return res.status(400).json({error:'Missing "text" in request body'});
  try { res.json({translated:await translateText(text,target),target}); } catch(e) { res.status(502).json({error:'Translation service unavailable'}); }
});

app.get('/api/officers',(req,res)=>res.json(readJSON('officers.json').map(({password,...safe})=>safe)));
app.get('/api/officer/stats',(req,res)=>{
  const officerId=String(req.query.officerId||'').trim();
  if(!officerId) return res.status(400).json({error:'Officer ID is required.'});
  const officer=readJSON('officers.json').find(o=>o.id===officerId);
  if(!officer || String(officer.rank||'').toLowerCase()!=='inspector') return res.status(403).json({error:'Inspector record not found.'});
  const attendance=readJSON('attendance.json').filter(r=>r.officerId===officerId).sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,10);
  const cases=readJSON('complaints.json').filter(r=>r.filedByOfficerId===officerId);
  const solved=cases.filter(r=>String(r.status||'').toLowerCase()==='closed').length;
  const present=attendance.filter(r=>String(r.status||'').toLowerCase()==='present').length;
  res.json({officer:{id:officer.id,name:officer.name,rank:officer.rank,station:officer.station},attendance:{records:attendance,total:attendance.length,present},cases:{total:cases.length,solved,solvePercent:cases.length?Number((solved/cases.length*100).toFixed(1)):0}});
});
app.get('/api/attendance',(req,res)=>{
  const {date,officerId}=req.query; let records=readJSON('attendance.json');
  if(date) records=records.filter(r=>r.date===date); if(officerId) records=records.filter(r=>r.officerId===officerId);
  if(officerId&&!date) records=records.sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,10); res.json(records);
});
app.post('/api/attendance',(req,res)=>res.status(403).json({error:'Attendance is read-only in SETU.'}));


app.get('/api/nearby-stations', async (req,res) => {
  const lat=Number(req.query.lat), lng=Number(req.query.lng);
  if(!Number.isFinite(lat)||!Number.isFinite(lng)) {
    return res.status(400).json({error:'Valid latitude and longitude are required.'});
  }

  const query=`[out:json][timeout:12];(
    nwr["amenity"="police"](around:5000,${lat},${lng});
    nwr["office"="government"]["government"="police"](around:5000,${lat},${lng});
  );out center tags;`;

  // Overpass has multiple public instances. If one is busy/down, try the next
  // one instead of making the citizen map look broken.
  const endpoints=[
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://overpass.private.coffee/api/interpreter'
  ];

  const hav=(a,b,c,d)=>{
    const R=6371,rad=x=>x*Math.PI/180,p1=rad(a),p2=rad(c),dp=rad(c-a),dl=rad(d-b);
    const h=Math.sin(dp/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2;
    return 2*R*Math.asin(Math.sqrt(h));
  };

  let lastError=null;
  for(const endpoint of endpoints){
    try{
      const controller=new AbortController();
      const timer=setTimeout(()=>controller.abort(),14000);
      let r;
      try{
        r=await fetch(endpoint,{
          method:'POST',
          headers:{
            'Content-Type':'text/plain;charset=UTF-8',
            'User-Agent':'SETU-Police-AI/1.0 (citizen map)'
          },
          body:query,
          signal:controller.signal
        });
      }finally{clearTimeout(timer);}

      if(!r.ok) throw new Error(`Map service returned HTTP ${r.status}`);
      const data=await r.json();

      const stations=(Array.isArray(data.elements)?data.elements:[]).map(x=>{
        const slat=Number(x.lat ?? x.center?.lat), slng=Number(x.lon ?? x.center?.lon);
        const tags=x.tags||{};
        return {
          name:tags.name||tags['name:en']||tags['name:hi']||'Police Station',
          lat:slat,lng:slng,
          distanceKm:hav(lat,lng,slat,slng),
          address:[tags['addr:housenumber'],tags['addr:street'],tags['addr:city']].filter(Boolean).join(', ')
        };
      }).filter(x=>Number.isFinite(x.lat)&&Number.isFinite(x.lng))
       .sort((a,b)=>a.distanceKm-b.distanceKm)
       .slice(0,8);

      return res.json({ok:true,stations});
    }catch(e){
      lastError=e;
      console.warn('[SETU MAP]',endpoint,e.message);
    }
  }

  console.error('[SETU MAP] all providers failed:',lastError?.message||'unknown error');
  res.status(502).json({
    error:'Nearby police stations are temporarily unavailable. The map itself is still available—please try Refresh stations again.'
  });
});

app.get('/api/complaints/types',(req,res)=>res.json(COMPLAINT_TYPES));
app.get('/api/areas',(req,res)=>res.json(AREA_POINTS));
app.get('/api/complaints',(req,res)=>{
  let records=readJSON('complaints.json');
  if(req.query.status) records=records.filter(r=>r.status===req.query.status);
  if(req.query.city) records=records.filter(r=>r.location?.city===req.query.city);
  if(req.query.severity) records=records.filter(r=>(r.severity||severityFor(r.complaintType,r.description))===req.query.severity);
  if(req.query.type) records=records.filter(r=>r.complaintType===req.query.type);
  const q=String(req.query.q||'').trim().toLowerCase();
  if(q) records=records.filter(r=>[r.id,r.complaintType,r.complainantName,r.accusedName,r.area,r.location?.city].join(' ').toLowerCase().includes(q));
  res.json(records.sort((a,b)=>new Date(b.filedAt)-new Date(a.filedAt)));
});
app.get('/api/complaints/:id',(req,res)=>{
  const rec=readJSON('complaints.json').find(r=>r.id===req.params.id); if(!rec) return res.status(404).json({error:'Not found'}); res.json(rec);
});
app.get('/api/complaints/:id/status',(req,res)=>{
  const rec=readJSON('complaints.json').find(r=>r.id===req.params.id); if(!rec) return res.status(404).json({error:'Complaint ID not found'});
  res.json({id:rec.id,complaintType:rec.complaintType,status:rec.status,filedAt:rec.filedAt,caseHistory:rec.caseHistory||[]});
});

app.post('/api/complaints',async (req,res)=>{
  const body=req.body||{};
  const {complaintType,complainantName,complainantContact,complainantAddress,accusedName,description,filedByOfficerId,filedByOfficerName,area,city}=body;
  if(!complaintType||!complainantName||!description||!filedByOfficerId) return res.status(400).json({error:'Complaint type, name, description and filing source are required.'});
  const normalizedPhone=cleanPhone(complainantContact);
  if(normalizedPhone.length!==10) return res.status(400).json({error:'Wrong number — enter a valid 10-digit mobile number.'});
  const isCitizen=filedByOfficerId==='CITIZEN_PORTAL';
  const officers=readJSON('officers.json');
  const officer=isCitizen?{id:'CITIZEN_PORTAL',name:'Citizen Portal'}:officers.find(o=>o.id===filedByOfficerId);
  if(!officer) return res.status(400).json({error:'Unknown filing officer.'});
  const enteredArea=String(area||complainantAddress||'').trim();
  let location=AREA_POINTS[enteredArea] || null;
  if(!location) location=await geocodeAddress(enteredArea || complainantAddress);
  const records=readJSON('complaints.json');
  const nums=records.map(r=>{const m=String(r.id||'').match(/(?:FIR-|COMP-)(\d+)$/i);return m?Number(m[1]):0}).filter(Number.isFinite);
  const id='FIR-'+String(Math.max(1000,...nums)+1);
  const filedAt=now(), severity=severityFor(complaintType,description);
  const nlpResult=analyze(description); let identityResult=null;
  if(accusedName?.trim()) identityResult=resolveIdentity(accusedName.trim(),loadDB('db1_police.json'),loadDB('db2_transport.json'),loadDB('db3_civil.json'),loadDB('db4_criminal.json'));
  const record={id,referenceNumber:id,recordType:'Police Complaint / FIR Intake Record',complaintType,complainantName,complainantContact:complainantContact||'',complainantAddress:complainantAddress||'',accusedName:accusedName||'',description,area:enteredArea,location,severity,filedByOfficerId,filedByOfficerName:officer.name,status:'Open',caseHistory:[{status:'Open',changedAt:filedAt,changedByOfficerId:filedByOfficerId}],filedAt,nlpResult,identityResult,reportDeadline:new Date(Date.now()+7*24*60*60*1000).toISOString()};
  records.push(record); writeJSON('complaints.json',records); res.status(201).json(record);
});

app.patch('/api/complaints/:id',(req,res)=>{
  const valid=['Open','Under Investigation','Closed']; if(!valid.includes(req.body?.status)) return res.status(400).json({error:'Invalid status'});
  const records=readJSON('complaints.json'), idx=records.findIndex(r=>r.id===req.params.id); if(idx<0) return res.status(404).json({error:'Not found'});
  records[idx].status=req.body.status; records[idx].caseHistory=records[idx].caseHistory||[]; records[idx].caseHistory.push({status:req.body.status,changedAt:now()}); writeJSON('complaints.json',records); res.json(records[idx]);
});

app.get('/api/dashboard',(req,res)=>{
  const records=readJSON('complaints.json');
  const criminalDB=loadDB('db4_criminal.json');
  const historicalCases=criminalDB.reduce((n,r)=>n+(Array.isArray(r.pastCrimes)?r.pastCrimes.length:0),0);
  const bySeverity={Critical:0,High:0,Medium:0,Low:0}; const byCity={}; const byType={};
  records.forEach(r=>{bySeverity[r.severity||severityFor(r.complaintType,r.description)]++; const c=r.location?.city; if(c) byCity[c]=(byCity[c]||0)+1; byType[r.complaintType]=(byType[r.complaintType]||0)+1;});
  res.json({total:records.length,open:records.filter(r=>r.status==='Open').length,investigating:records.filter(r=>r.status==='Under Investigation').length,closed:records.filter(r=>r.status==='Closed').length,bySeverity,byCity,byType,intelligence:{criminalRecords:criminalDB.length,historicalCases,linkedFirs:records.filter(r=>r.accusedName).length}});
});

app.get('/api/dashboard/person',(req,res)=>{
  const q=String(req.query.q||'').trim();
  if(!q) return res.status(400).json({error:'Enter a person name.'});
  const identity=resolveIdentity(q,loadDB('db1_police.json'),loadDB('db2_transport.json'),loadDB('db3_civil.json'),loadDB('db4_criminal.json'));
  const nq=q.toLowerCase().replace(/\s+/g,' ').trim();
  const complaints=readJSON('complaints.json').filter(r=>[r.complainantName,r.accusedName,r.description,r.referenceNumber,r.id].join(' ').toLowerCase().includes(nq) || (identity.displayName&&identity.displayName.toLowerCase().includes(nq) && [r.complainantName,r.accusedName,r.description].join(' ').toLowerCase().includes(identity.displayName.toLowerCase()))).sort((a,b)=>new Date(b.filedAt)-new Date(a.filedAt));
  const criminal=identity.criminalHistory||null;
  const historicalCases=Array.isArray(criminal?.pastCrimes)?criminal.pastCrimes:[];
  res.json({matched:!!identity.matched,query:q,displayName:identity.displayName||q,confidence:identity.confidence||0,police:identity.hits?.find(h=>h.source==='Police records')?.record||null,transport:identity.hits?.find(h=>h.source==='Transport records')?.record||null,civil:identity.hits?.find(h=>h.source==='Civil records')?.record||null,criminal,historicalCases,complaints,totals:{complaints:complaints.length,criminalHistory:historicalCases.length}});
});

app.post('/api/chat',(req,res)=>{
  const raw=String(req.body?.q||'').trim();
  const q=raw.toLowerCase().replace(/[’']/g,'').replace(/\s+/g,' ').trim();
  if(!q) return res.status(400).json({error:'Ask a question first.'});
  const records=readJSON('complaints.json');
  const open=records.filter(r=>r.status==='Open'), investigating=records.filter(r=>r.status==='Under Investigation'), closed=records.filter(r=>r.status==='Closed');
  const critical=records.filter(r=>r.severity==='Critical'), high=records.filter(r=>r.severity==='High');
  const dueSoon=records.filter(r=>r.status==='Open'&&r.reportDeadline&&(new Date(r.reportDeadline)-Date.now())<=3*86400000);
  const byType={}; records.forEach(r=>{byType[r.complaintType]=(byType[r.complaintType]||0)+1});
  let answer=''; let intent='general'; let actions=[];
  if(/^(hi|hello|hey|namaste)\b/.test(q)){intent='welcome';answer=`Hello. I am the SETU operational assistant. I can explain cases, priorities, deadlines, the crime map, complaint filing, identity resolution and NLP. You currently have ${open.length} open, ${investigating.length} undertaken and ${closed.length} closed case(s).`;}
  else if(/which.*cases|cases.*attention|attention.*now|urgent.*cases|open cases|which case|cases need|case need|what case|cases should|priority cases|show.*cases/.test(q)){intent='attention';const list=open.sort((a,b)=>({Critical:0,High:1,Medium:2,Low:3}[a.severity]??9)-({Critical:0,High:1,Medium:2,Low:3}[b.severity]??9)).slice(0,8);answer=list.length?`There are ${open.length} open case(s). Highest-priority open records: ${list.map(r=>`${r.id} (${r.severity}, ${r.complaintType}, ${r.area||'area not provided'})`).join('; ')}. Open Cases & FIRs to take the next action.`:`There are no open cases right now.`;actions=['Open Cases & FIRs'];}
  else if(/map|gis|crime.*map|map.*filter/.test(q)){intent='map';answer=`The Crime Map covers every complaint location stored in SETU; it is not locked to Delhi. Use All crime categories to see everything, then search by area, FIR ID, complainant, accused person or category. The map also shows severity zones for Critical, High, Medium and Low triage.`;actions=['Open Crime Map'];}
  else if(/refresh|reload|latest case|new complaint|new complaint status|recent complaint|recent case|latest complaint/.test(q)){intent='cases';answer=`The Cases & FIR page now loads its records automatically when opened and after every case action, so a separate Refresh button is not required. Current case counts: ${open.length} open, ${investigating.length} undertaken, ${closed.length} closed.`;}
  else if(/take|undertaken|assign|accept.*case|how.*take|how.*assign|pick.*case/.test(q)){intent='take-case';answer=`To take a case, open Cases & FIRs and press Take case on an Open record. SETU changes it to Case Undertaken / Under Investigation and records the status change in the case history. ${dueSoon.length} open case(s) currently have a deadline within three days.`;actions=['Open Cases & FIRs'];}
  else if(/close|finish|complete.*case|how.*close|close.*case/.test(q)){intent='close-case';answer=`A case can be closed only after it has been taken. In Cases & FIRs, use Close case on a Case Undertaken record. The system stores the closure event in the case history.`;}
  else if(/deadline|seven|7.?day|due|when.*due|report.*deadline/.test(q)){intent='deadline';answer=`Each newly registered case receives a seven-day report deadline. SETU highlights open cases approaching that deadline. There are ${dueSoon.length} open case(s) currently within the three-day warning window.`;}
  else if(/critical|priority|severity|urgent|highest priority|high priority/.test(q)){intent='priority';answer=`Priority is a triage aid: ${critical.length} Critical, ${high.length} High and ${records.filter(r=>r.severity==='Medium').length} Medium case(s) are currently stored. Critical cases should receive the fastest operational attention, but the label is not itself a legal conclusion.`;}
  else if(/otp|verification|mobile/.test(q)){intent='verification';answer='SETU Citizen Portal does not require OTP. Enter your details, submit the complaint, receive a case ID, and use the tracking section for updates.';}
  else if(/report.*(find|search|lookup)|find.*report|report.*id|report.*name|search.*fir|find.*fir|look.*report/.test(q)){intent='report-search';answer='Use Identity & Report Resolution → Report lookup. Enter a report ID such as FIR-1001, or search by complainant name, accused name, category or area. SETU returns matching complaint records from the prototype case database.';actions=['Open Identity Resolution'];}
  else if(/(?:who is|find|search|look up|lookup|check|show|details|history).*\b(?:person|criminal|suspect|name|record)\b|\b(?:ramesh(?:\s+kumar)?|criminal history)\b/.test(q)){
    intent='person'; const nm=q.match(/ramesh(?:\s+kumar)?/i)?.[0]||'Ramesh Kumar';
    const identity=resolveIdentity(nm,loadDB('db1_police.json'),loadDB('db2_transport.json'),loadDB('db3_civil.json'),loadDB('db4_criminal.json'));
    const related=records.filter(r=>[r.complainantName,r.accusedName,r.description].join(' ').toLowerCase().includes(nm.toLowerCase()));
    const hist=Array.isArray(identity.criminalHistory?.pastCrimes)?identity.criminalHistory.pastCrimes:[];
    answer=identity.matched?`${identity.displayName} matches the synthetic records with ${Math.round((identity.confidence||0)*100)}% confidence. Criminal history: ${hist.length} historical case(s). ${hist.slice(0,4).map(c=>`${c.caseNo||'Case'} — ${c.crime||'Case'} (${c.year||'year'}, ${c.status||'status'})`).join('; ')||'No historical entries.'} SETU complaints/FIRs linked to this name: ${related.length}.`:`No reliable identity match was found for ${nm}. SETU complaints/FIRs mentioning this name: ${related.length}.`;
    actions=['Open Identity Resolution'];
  }
  else if(/identity|person|history|match|find.*person|search.*person|identify|who is/.test(q)){intent='identity';answer='Identity Resolution searches the synthetic police, transport, civil and criminal datasets and returns the best name match with confidence and available history. Treat the result as investigative assistance, not proof of guilt or identity.';actions=['Open Identity Resolution'];}
  else if(/nlp|language|translate|complaint analysis|translate.*complaint|detect.*language/.test(q)){intent='nlp';answer='Complaint NLP analyzes the supplied complaint text, detects the language and produces a Hindi translation. Use it to help officers understand multilingual reports while keeping the original citizen statement unchanged.';}
  else if(/complaint|file.*report|register|how.*complaint|how.*report|submit.*complaint|file.*complaint/.test(q)){intent='complaint';answer='To register a complaint, open New Complaint, choose a category, enter the exact incident area, describe what happened, optionally use the microphone, then submit. The system assigns a case ID, triage priority and seven-day deadline. The report keeps the area/address entered by the user; it does not invent a city.';actions=['Open New Complaint'];}
  else if(/fir|document|print|generate.*fir|fir.*document/.test(q)){intent='fir';answer='Cases & FIRs lets an officer view a full complaint record and generate the prototype FIR-style document. It is an intake/prototype document and should not be presented as a legally certified FIR without the competent authority process.';}
  else if(/what.*stored|statistics|stats|summary|dashboard|how many|total cases|case count|complaint count/.test(q)){intent='summary';const top=Object.entries(byType).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([k,v])=>`${k}: ${v}`).join(', ')||'No categories yet';answer=`SETU currently stores ${records.length} complaint record(s): ${open.length} open, ${investigating.length} undertaken and ${closed.length} closed. Top categories: ${top}.`}
  else {intent='general';answer=`I can help with: case taking/closure, seven-day deadlines, priority, crime-map filters, complaint filing, citizen complaint filing, Identity Resolution, Complaint NLP and FIR documents. Try asking “Which cases need attention?”, “How do I take a case?”, or “Show me how the map works.”`;}
  res.json({answer,intent,stats:{total:records.length,open:open.length,investigating:investigating.length,closed:closed.length,dueSoon:dueSoon.length,critical:critical.length},actions});
});

app.listen(PORT,()=>console.log(`SETU backend running at http://localhost:${PORT}`));
