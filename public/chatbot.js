(function(){
  'use strict';
  const isPolice=location.pathname==='/' || /index\.html$/i.test(location.pathname);
  const PREFIX=isPolice?'police':'citizen';
  const KEY='setu_ai_sessions_v37_'+PREFIX;
  const LEGACY=['setu_shared_chat_history_v36','setu_shared_chat_history_v31','setu_chat_history'];
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const load=()=>{try{const a=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(a)?a:[]}catch{return[]}};
  const save=a=>{try{localStorage.setItem(KEY,JSON.stringify(a.slice(-30)))}catch{}};
  let current=[];
  let currentTitle='New SETU chat';
  function render(){
    const box=$('setu-ai-messages');if(!box)return;
    if(!current.length){box.innerHTML='<div class="setu-ai-empty"><span class="big">🤖</span><b>Hello! I’m SETU AI</b><span>Choose a topic above or type your question below. Everything you need stays inside this chat box.</span></div>';return}
    box.innerHTML=current.map(m=>`<div class="setu-ai-msg ${m.role==='user'?'user':'ai'}"><small>${m.role==='user'?'You':'SETU AI'}</small><div>${esc(m.text)}</div></div>`).join('');box.scrollTop=box.scrollHeight;
  }
  function add(role,text){current.push({role,text,at:Date.now()});render()}
  function storeCurrent(){if(!current.length)return;const sessions=load();const id=current.id||('s'+Date.now());current.id=id;const first=current.find(x=>x.role==='user');const existing=sessions.findIndex(x=>x.id===id);const item={id,title:currentTitle||(first?.text||'SETU chat'),updatedAt:Date.now(),messages:current};if(existing>=0)sessions[existing]=item;else sessions.push(item);save(sessions)}
  function localAnswer(q){
    const x=q.toLowerCase();
    if(/^(hi|hello|hey|namaste)\b/.test(x))return 'Hello! I’m SETU AI. I can help with complaints, FIRs, case tracking, police cases and person records. What would you like to know?';
    if(/complaint|report|file/.test(x))return 'To file a complaint, open New Complaint, choose the category, enter your details, describe what happened and submit. SETU gives you a case ID that you can use for tracking.';
    if(/track|status/.test(x))return 'To track a case, use the tracking section and enter your SETU complaint or FIR ID. You can then see the current status and available case history.';
    if(/fir/.test(x))return 'An FIR is a formal police record of information about a cognizable offence. In this SETU prototype, the complaint can produce an FIR-style acknowledgement for the case.';
    if(/ramesh|criminal|identity|person|suspect|accused/.test(x))return 'For person intelligence, open Person & Criminal Intelligence in the Police Portal and search a name such as Ramesh Kumar. SETU can match police, civil, transport, criminal-history and linked FIR/case records in the prototype data.';
    if(/case|priority|urgent|attention/.test(x))return 'For police case work, you can ask: “Which cases need attention?”, “Which cases are critical?”, “How do I take a case?”, or “How do I close a case?”';
    if(/map/.test(x))return 'Open Crime Map in the Police Portal to view complaint locations and filter cases by category or severity.';
    if(/otp|verify|mobile/.test(x))return 'Citizen complaints do not require OTP in the current SETU portal. Enter your details and submit the complaint directly.';
    return 'I can help with 📝 complaints, 📄 FIRs, 🔎 tracking, 🚔 police cases, 👤 person search and 🗺️ the crime map. Try one of the topic buttons above.';
  }
  async function backend(q){const r=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({q,portal:PREFIX})});if(!r.ok)throw Error('backend');return r.json()}
  function migrate(){if(load().length)return;for(const k of LEGACY){try{const old=JSON.parse(localStorage.getItem(k)||'[]');if(Array.isArray(old)&&old.length){save([{id:'legacy-'+Date.now(),title:'Previous SETU chat',updatedAt:Date.now(),messages:old.slice(-60)}]);break}}catch{}}}
  window.setuToggle=function(){const p=$('setu-ai-panel');if(!p)return;p.classList.toggle('open');if(p.classList.contains('open')){$('setu-ai-input')?.focus();render()}};
  window.setuShowHistory=function(){const h=$('setu-ai-history'),list=$('setu-ai-history-list');if(!h||!list)return;const a=load().slice().reverse();list.innerHTML=a.length?a.map(s=>`<button type="button" class="setu-ai-history-item" data-id="${esc(s.id)}"><b>${esc(s.title||'Previous SETU chat')}</b><span>${new Date(s.updatedAt||Date.now()).toLocaleString()} • ${(s.messages||[]).filter(m=>m.role==='user').length} questions</span></button>`).join(''):'<div class="setu-ai-history-empty">No previous chats yet.<br>Start a conversation and it will appear here.</div>';list.querySelectorAll('[data-id]').forEach(b=>b.onclick=()=>{const s=load().find(x=>x.id===b.dataset.id);if(s){current=(s.messages||[]).slice();current.id=s.id;currentTitle=s.title||'Previous SETU chat';h.classList.remove('open');render()}});h.classList.add('open')};
  window.setuHideHistory=function(){$('setu-ai-history')?.classList.remove('open')};
  window.setuClearCurrent=function(){current=[];currentTitle='New SETU chat';render();$('setu-ai-actions').innerHTML='';$('setu-ai-input').value='';$('setu-ai-input').focus()};
  window.setuPreset=function(q){const i=$('setu-ai-input');if(i){i.value=q;window.setuAsk()}};
  window.setuAsk=async function(){const i=$('setu-ai-input'),send=$('setu-ai-send'),actions=$('setu-ai-actions');if(!i||i.disabled)return;const q=i.value.trim();if(!q)return;if(!current.length)current.id='s'+Date.now();if(currentTitle==='New SETU chat')currentTitle=q.slice(0,55);add('user',q);i.value='';i.disabled=true;if(send)send.disabled=true;if(actions)actions.innerHTML='';const t=document.createElement('div');t.className='setu-ai-thinking';t.textContent='SETU AI is thinking…';$('setu-ai-messages').appendChild(t);$('setu-ai-messages').scrollTop=$('setu-ai-messages').scrollHeight;let result=null,answer='';try{result=await backend(q);answer=String(result.answer||'')}catch{answer=localAnswer(q)}t.remove();add('assistant',answer||localAnswer(q));storeCurrent();if(result?.actions?.length&&actions){result.actions.forEach(a=>{const b=document.createElement('button');b.type='button';b.textContent=a;b.onclick=()=>{if(a==='Open Cases & FIRs')window.go?.('manage');else if(a==='Open Crime Map')window.go?.('map');else if(a==='Open New Complaint')window.go?.('file');else if(a==='Open Identity Resolution')window.go?.('identity')};actions.appendChild(b)})}i.disabled=false;if(send)send.disabled=false;i.focus()};
  // Preserve previous chats, but deliberately start a clean current chat after refresh.
  function init(){migrate();current=[];currentTitle='New SETU chat';const btn=$('setu-ai-btn'),input=$('setu-ai-input');btn?.addEventListener('click',window.setuToggle);input?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();window.setuAsk()}});$('setu-ai-send')?.addEventListener('click',window.setuAsk);render()}
  window.getChatHistory=()=>current.slice();window.saveChatHistory=storeCurrent;window.renderChatHistory=render;window.toggleChat=window.setuToggle;window.clearChat=window.setuClearCurrent;window.askPreset=window.setuPreset;window.askChat=window.setuAsk;
  document.addEventListener('DOMContentLoaded',init);
})();
