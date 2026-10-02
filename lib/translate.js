// SETU translation helper.
// Primary: Google Translate public endpoint.
// Fallback: MyMemory public endpoint.
// Final offline fallback: common Indian-language complaint phrases + script transliteration,
// so the NLP demo never leaves the Hindi panel blank when external translation is unavailable.

const COMMON = [
  // Tamil -> Hindi
  ['சுரேஷ்','सुरेश'],['திருமுகன்','तिरुमुगन'],['ரமேஷ்','रमेश'],['ராஜேஷ்','राजेश'],['அனிதா','अनिता'],['விக்ரம்','विक्रम'],['பிரியா','प्रिया'],['திருட்டு','चोरी'],['திருடப்பட்ட','चोरी हुआ'],['திருடப்பட்டது','चोरी हो गई'],['புகார்','शिकायत'],['காவல் நிலையம்','पुलिस स्टेशन'],['காவல்துறை','पुलिस'],['தாக்குதல்','हमला'],['மிரட்டல்','धमकी'],['கடத்தல்','अपहरण'],['கொலை','हत्या'],['வீடு','घर'],['பணம்','पैसे'],['நேற்று','कल'],['இன்று','आज'],['நாளை','कल'],['உதவி','मदद'],['தேவை','ज़रूरत'],['சம்பவம்','घटना'],['வந்தார்','आए'],['சென்றார்','गए'],['என்','मेरे'],['எனது','मेरा'],['அவர்','वह'],['அவர்கள்','वे'],['என்னை','मुझे'],['எனக்கு','मुझे'],
  // Telugu -> Hindi
  ['దొంగతనం','चोरी'],['ఫిర్యాదు','शिकायत'],['పోలీసు స్టేషన్','पुलिस स्टेशन'],['దాడి','हमला'],['బెదిరింపు','धमकी'],['హత్య','हत्या'],['అపహరణ','अपहरण'],['ఇల్లు','घर'],['డబ్బు','पैसे'],['సహాయం','मदद'],
  // Bengali -> Hindi
  ['চুরি','चोरी'],['অভিযোগ','शिकायत'],['পুলিশ স্টেশন','पुलिस स्टेशन'],['আক্রমণ','हमला'],['হুমকি','धमकी'],['হত্যা','हत्या'],['অপহরণ','अपहरण'],['বাড়ি','घर'],['টাকা','पैसे'],['সাহায্য','मदद'],
  // Kannada -> Hindi
  ['ಕಳ್ಳತನ','चोरी'],['ದೂರು','शिकायत'],['ಪೊಲೀಸ್ ಠಾಣೆ','पुलिस स्टेशन'],['ದಾಳಿ','हमला'],['ಬೆದರಿಕೆ','धमकी'],['ಕೊಲೆ','हत्या'],['ಅಪಹರಣ','अपहरण'],['ಮನೆ','घर'],['ಹಣ','पैसे'],['ಸಹಾಯ','मदद'],
  // Gujarati -> Hindi
  ['ચોરી','चोरी'],['ફરિયાદ','शिकायत'],['પોલીસ સ્ટેશન','पुलिस स्टेशन'],['હુમલો','हमला'],['ધમકી','धमकी'],['હત્યા','हत्या'],['અપહરણ','अपहरण'],['ઘર','घर'],['પૈસા','पैसे'],['મદદ','मदद'],
  // Punjabi -> Hindi
  ['ਚੋਰੀ','चोरी'],['ਸ਼ਿਕਾਇਤ','शिकायत'],['ਪੁਲਿਸ ਸਟੇਸ਼ਨ','पुलिस स्टेशन'],['ਹਮਲਾ','हमला'],['ਧਮਕੀ','धमकी'],['ਕਤਲ','हत्या'],['ਅਗਵਾ','अपहरण'],['ਘਰ','घर'],['ਪੈਸੇ','पैसे'],['ਮਦਦ','मदद']
];

const TAMIL_MAP = {
  'அ':'अ','ஆ':'आ','இ':'इ','ஈ':'ई','உ':'उ','ஊ':'ऊ','எ':'ए','ஏ':'ए','ஐ':'ऐ','ஒ':'ओ','ஓ':'ओ','ஔ':'औ',
  'க':'क','ங':'ङ','ச':'च','ஞ':'ञ','ட':'ट','ண':'ण','த':'त','ந':'न','ப':'प','ம':'म','ய':'य','ர':'र','ல':'ल','வ':'व','ழ':'ळ','ள':'ल','ற':'र','ன':'न',
  'ஜ':'ज','ஷ':'श','ஸ':'स','ஹ':'ह','க்ஷ':'क्ष','ஸ்ரீ':'श्री'
};
const TAMIL_VOWELS = {'ா':'ा','ி':'ि','ீ':'ी','ு':'ु','ூ':'ू','ெ':'े','ே':'े','ை':'ै','ொ':'ो','ோ':'ो','ௌ':'ौ','்':'्'};
const TELUGU_MAP = {'అ':'अ','ఆ':'आ','ఇ':'इ','ఈ':'ई','ఉ':'उ','ఊ':'ऊ','ఎ':'ए','ఏ':'ए','ఐ':'ऐ','ఒ':'ओ','ఓ':'ओ','ఔ':'औ','క':'क','ఖ':'ख','గ':'ग','ఘ':'घ','చ':'च','జ':'ज','ట':'ट','డ':'ड','ణ':'ण','త':'त','ద':'द','న':'न','ప':'प','బ':'ब','మ':'म','య':'य','ర':'र','ల':'ल','వ':'व','శ':'श','ష':'ष','స':'स','హ':'ह'};
const BENGALI_MAP = {'অ':'अ','আ':'आ','ই':'इ','ঈ':'ई','উ':'उ','ঊ':'ऊ','এ':'ए','ঐ':'ऐ','ও':'ओ','ঔ':'औ','ক':'क','খ':'ख','গ':'ग','ঘ':'घ','চ':'च','জ':'ज','ট':'ट','ড':'ड','ণ':'ण','ত':'त','দ':'द','ন':'न','প':'प','ব':'ब','ম':'म','য':'य','র':'र','ল':'ल','শ':'श','ষ':'ष','স':'स','হ':'ह'};
const GUJARATI_MAP = {'અ':'अ','આ':'आ','ઇ':'इ','ઈ':'ई','ઉ':'उ','ઊ':'ऊ','એ':'ए','ઐ':'ऐ','ઓ':'ओ','ઔ':'औ','ક':'क','ખ':'ख','ગ':'ग','ઘ':'घ','ચ':'च','જ':'ज','ટ':'ट','ડ':'ड','ણ':'ण','ત':'त','દ':'द','ન':'न','પ':'प','બ':'ब','મ':'म','ય':'य','ર':'र','લ':'ल','વ':'व','શ':'श','ષ':'ष','સ':'स','હ':'ह'};
const KANNADA_MAP = {'ಅ':'अ','ಆ':'आ','ಇ':'इ','ಈ':'ई','ಉ':'उ','ಊ':'ऊ','ಎ':'ए','ಏ':'ए','ಐ':'ऐ','ಒ':'ओ','ಓ':'ओ','ಔ':'औ','ಕ':'क','ಖ':'ख','ಗ':'ग','ಘ':'घ','ಚ':'च','ಜ':'ज','ಟ':'ट','ಡ':'ड','ಣ':'ण','ತ':'त','ದ':'द','ನ':'न','ಪ':'प','ಬ':'ब','ಮ':'म','ಯ':'य','ರ':'र','ಲ':'ल','ವ':'व','ಶ':'श','ಷ':'ष','ಸ':'स','ಹ':'ह'};

function replaceCommon(text){
  let out = text;
  const sorted=[...COMMON].sort((a,b)=>b[0].length-a[0].length);
  for(const [src,dst] of sorted) out=out.split(src).join(dst);
  return out;
}

function transliterate(text, map, vowelMap={}) {
  let out='';
  for(let i=0;i<text.length;i++){
    const ch=text[i];
    if(map[ch]) { out += map[ch]; continue; }
    if(vowelMap[ch]) { out += vowelMap[ch]; continue; }
    out += ch;
  }
  return out;
}

function offlineHindi(text, source='auto') {
  let out=replaceCommon(text);
  if(/[\u0B80-\u0BFF]/.test(out)) out=transliterate(out,TAMIL_MAP,TAMIL_VOWELS);
  else if(/[\u0C00-\u0C7F]/.test(out)) out=transliterate(out,TELUGU_MAP);
  else if(/[\u0980-\u09FF]/.test(out)) out=transliterate(out,BENGALI_MAP);
  else if(/[\u0A80-\u0AFF]/.test(out)) out=transliterate(out,GUJARATI_MAP);
  else if(/[\u0C80-\u0CFF]/.test(out)) out=transliterate(out,KANNADA_MAP);
  return out;
}

async function fetchJson(url, timeoutMs=8000){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const res=await fetch(url,{headers:{'User-Agent':'SETU-Prototype/1.0'},signal:controller.signal});
    if(!res.ok) throw new Error('HTTP '+res.status);
    return await res.json();
  } finally { clearTimeout(timer); }
}

async function translateText(text, target='hi', source='auto') {
  if (!text || !text.trim()) return '';
  if(target !== 'hi') return translateRemote(text,target,source);
  try { return await translateRemote(text,target,source); }
  catch(e1) {
    try {
      const sl = source && source !== 'auto' ? source : 'auto';
      const url=`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(sl)}%7Chi`;
      const data=await fetchJson(url,8000);
      const translated=data?.responseData?.translatedText;
      if(translated && translated.trim()) return translated.trim();
    } catch(e2) {}
    const local=offlineHindi(text,source);
    if(local && local.trim()) return local.trim();
    throw e1;
  }
}

async function translateRemote(text,target,source='auto'){
  const sl=source||'auto';
  const url=`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(sl)}&tl=${encodeURIComponent(target)}&dt=t&q=${encodeURIComponent(text)}`;
  const data=await fetchJson(url,8000);
  if(!Array.isArray(data?.[0])) throw new Error('Invalid translation response');
  const result=data[0].map(chunk=>chunk?.[0]||'').join('').trim();
  if(!result) throw new Error('Empty translation response');
  return result;
}

module.exports={translateText};
