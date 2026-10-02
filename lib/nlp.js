// SETU Indian-Language NLP prototype.
// Supports 10 language/script categories for demo analysis.
const PERSON_NAMES = [
  'ramesh','suresh','anita','vikram','rajesh','deepak','ravi','priya','amit','sunil','rahul','mohit','aman','arjun','neeraj','kunal','pankaj','nitin','sanjay','imran','manoj','ajay','vijay',
  'sharma','kumar','yadav','singh','verma','patel','reddy','nair','das','chauhan','mishra',
  'ரமேஷ்','சுரேஷ்','அனிதா','விக்ரம்','ராஜேஷ்','தீபக்','பிரியா',
  'రమేష్','సురేష్','అనిత','విక్రమ్','రాజేష్','దీపక్','ప్రియా',
  'রামেশ','সুরেশ','অনিতা','বিক্রম','রাজেশ','দীপক','প্রিয়া',
  'ರಮೇಶ್','ಸುರೇಶ್','ಅನಿತಾ','ವಿಕ್ರಮ್','ರಾಜೇಶ್','ದೀಪಕ್','ಪ್ರಿಯಾ',
  'રમેશ','સુરેશ','અનિતા','વિક્રમ','રાજેશ','દીપક','પ્રિયા',
  'रमेश','सुरेश','अनिता','विक्रम','राजेश','दीपक','प्रिया','राहुल','अमन','अर्जुन',
  'ਰਮੇਸ਼','ਸੁਰੇਸ਼','ਅਨੀਤਾ','ਵਿਕਰਮ','ਰਾਜੇਸ਼','ਦੀਪਕ','ਪ੍ਰਿਆ',
  'മേഷ്','സുരേഷ്','അനിത','വിക്രം','രാജേഷ്','ദീപക്','പ്രിയ'
];
const LOCATIONS = [
  'mumbai','delhi','lucknow','faridabad','jalandhar','bareilly','kanpur','pune','jaipur','patna','meerut','muzaffarnagar','ghaziabad','noida','kolkata','hyderabad','chennai','ahmedabad','kochi','india','up','bihar',
  'மும்பை','சென்னை','டெல்லி','கோயம்புத்தூர்','மதுரை','இந்தியா','தமிழ்நாடு','மீரட்',
  'ముంబై','చెన్నై','ఢిల్లీ','హైదరాబాద్','భారతదేశం',
  'মুম্বাই','চেন্নাই','দিল্লি','কলকাতা','ভারত',
  'ಮುಂಬೈ','ಚೆನ್ನೈ','ದೆಹಲಿ','ಬೆಂಗಳೂರು','ಭಾರತ',
  'મુંબઈ','ચેન્નાઈ','દિલ્હી','અમદાવાદ','ભારત',
  'ਚੇਨਈ','ਦਿੱਲੀ','ਅੰਮ੍ਰਿਤਸਰ','ਭਾਰਤ',
  'ചെന്നൈ','ഡൽഹി','കൊച്ചി','ഇന്ത്യ'
];
const ORGS = ['traders','police station','transport dept','bank','company','ltd','police','municipal corporation','நிறுவனம்','வங்கி','காவல் நிலையம்','సంస్థ','బ్యాంక్','పోలీసు','প্রতিষ্ঠান','ব্যাংক','পুলিশ','ಸಂಸ್ಥೆ','ಬ್ಯಾಂಕ್','ಪೊಲೀಸ್','સંસ્થા','બેંક','પોલીસ','ਪੁਲਿਸ','ਸੰਸਥਾ','ബാങ്ക്'];
const RISK_WORDS = ['dhamki','धमकी','threat','हमला','hamla','attack','bomb','बम','weapon','हथियार','kidnap','अपहरण','चोरी','चोर','लूट','हत्या','திருட்டு','தாக்குதல்','மிரட்டல்','கடத்தல்','கொலை','దొంగతనం','దాడి','బెదిరింపు','అపహరణ','హత్య','চুরি','আক্রমণ','হুমকি','অপহরণ','হত্যা','ಕಳ್ಳತನ','ದಾಳಿ','ಬೆದರಿಕೆ','ಅಪಹರಣ','ಕೊಲೆ','ચોરી','હુમલો','ધમકી','અપહરણ','હત્યા','ਚੋਰੀ','ਹਮਲਾ','ਧਮਕੀ','ਅਗਵਾ','ਕਤਲ','മോഷണം','ആക്രമണം','ഭീഷണി','തട്ടിക്കൊണ്ടുപോകൽ','കൊലപാതകം'];
const SCRIPTS = [
  { name:'Hindi (Devanagari)', regex:/[\u0900-\u097F]/g },
  { name:'Tamil', regex:/[\u0B80-\u0BFF]/g },
  { name:'Telugu', regex:/[\u0C00-\u0C7F]/g },
  { name:'Bengali', regex:/[\u0980-\u09FF]/g },
  { name:'Kannada', regex:/[\u0C80-\u0CFF]/g },
  { name:'Gujarati', regex:/[\u0A80-\u0AFF]/g },
  { name:'Gurmukhi (Punjabi)', regex:/[\u0A00-\u0A7F]/g },
  { name:'Malayalam', regex:/[\u0D00-\u0D7F]/g },
  { name:'English (Latin)', regex:/[a-zA-Z]/g }
];
function detectLanguage(text){
  const active=SCRIPTS.map(s=>({name:s.name,count:(text.match(s.regex)||[]).length})).filter(s=>s.count>0).sort((a,b)=>b.count-a.count);
  if(!active.length) return 'Unknown';
  if(active.length===1) return active[0].name;
  return 'Mixed — '+active.map(a=>a.name).join(' + ');
}
function analyze(text){
  const lang=detectLanguage(text);
  const tokens=text.split(/(\s+|[.,!?।])/);
  let personCount=0,locCount=0,orgCount=0,riskCount=0;
  const tagged=tokens.map(tok=>{
    const clean=tok.trim().toLowerCase().replace(/[.,!?।]/g,'');
    if(!clean) return {text:tok,type:null};
    if(RISK_WORDS.includes(clean)){riskCount++;return {text:tok,type:'risk'};}
    if(PERSON_NAMES.includes(clean)){personCount++;return {text:tok,type:'person'};}
    if(LOCATIONS.includes(clean)){locCount++;return {text:tok,type:'location'};}
    if(ORGS.some(o=>clean.includes(o))){orgCount++;return {text:tok,type:'org'};}
    return {text:tok,type:null};
  });
  return {language:lang,supportedLanguages:SCRIPTS.map(s=>s.name),tokens:tagged,counts:{person:personCount,location:locCount,org:orgCount,risk:riskCount}};
}
module.exports={detectLanguage,analyze};
