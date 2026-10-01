/**
 * Google Photos — Semantic Photo Locator
 *
 * Architecture: DETECT → UNDERSTAND → STRUCTURE → RANK → CONNECT
 *
 * Each photo carries a structured multi-dimensional semantic representation:
 *   - Dimensions: PLACE, PEOPLE, ACTIVITY, FOOD, ENVIRONMENT, TIME, WEATHER, OBJECTS, EVENT, MEMORY
 *   - Every element has Importance: 'primary' | 'secondary' | 'incidental'
 *   - Relationships between elements (Friends → sitting at → Café → in → Goa)
 *   - Memory-level grouping: consecutive photos form Episodes (trips/events)
 *
 * Search:
 *   Query → resolve canonical concepts → match against structured semantics
 *   Primary match   → full highlight (is-match)
 *   Secondary match → lighter highlight (is-match-secondary)
 *   Incidental only → NOT highlighted (background car doesn't dominate)
 *
 * Timeline: NEVER filtered. All photos stay in chronological positions.
 * NEXT/PREV navigates between primary/secondary matches only.
 */

document.addEventListener('DOMContentLoaded', () => {

  // ==========================================================================
  // 1. MULTILINGUAL ALIAS TABLE
  //    Any surface-form term (10 languages) → Set of canonical concept IDs
  //    Spec: "All language variants must map to one canonical concept ID"
  // ==========================================================================
  const ALIAS_MAP = buildAliasMap();

  function buildAliasMap() {
    const m = new Map();
    function add(conceptId, ...aliases) {
      for (const a of aliases) {
        const key = a.toLowerCase().trim();
        if (!m.has(key)) m.set(key, new Set());
        m.get(key).add(conceptId);
      }
    }

    // PLACE
    add('PLACE.HOME','home','घर','বাড়ি','வீடு','ఇల్లు','ઘર','ಮನೆ','വീട്','ਘਰ','ଘর');
    add('PLACE.CITY','city','शहर','শহর','நகரம்','నగరం','शहर','ਸ਼ਹਿਰ','ಶಹರ','ସহর');
    add('PLACE.CAFE','café','cafe','coffee shop','कैफे','ক্যাফে','கஃபே','కేఫ్','ਕੈਫੇ','ಕೆಫೆ','കഫേ','କାଫେ');
    add('PLACE.RESTAURANT','restaurant','dining','रेस्तरां','রেস্তরাঁ','உணவகம்','రెస్టారెంట్','ਰੈਸਟੋਰੈਂਟ','ರೆಸ್ಟಾರೆಂಟ್','ରେଷ୍ଟୁରାଣ୍ଟ');
    add('PLACE.HOTEL','hotel','hostel','resort','होटल','হোটেল','ஹோட்டல்','హోటల్','ਹੋਟਲ','ಹೋಟೆಲ್','ഹോട്ടൽ','ହୋଟେଲ');
    add('PLACE.BEACH','beach','coast','shore','समुद्र तट','সমুদ্র সৈকত','கடற்கரை','బీచ్','ਬੀਚ','ಕಡಲ ತೀರ','കടൽത്തീരം','ସମୁଦ୍ର ତୀର');
    add('PLACE.MARKET','market','bazaar','flea market','बाजार','বাজার','சந்தை','మార్కెట్','ਬਾਜ਼ਾਰ','ಮಾರুকಟ್ಟೆ','ചൈ','ବଜାর');
    add('PLACE.AIRPORT','airport','terminal','हवाई अड्डा','বিমানবন্দর','விமான நிலையம்','విమానాశ్రయం','ਹਵਾਈ ਅੱਡਾ','ವಿಮಾನ ನಿಲ್ದಾಣ','ബിமาനதாவলம്','ବিমাନ ବନ୍ଦর');
    add('PLACE.MONUMENT','monument','heritage','fort','palace','स्मारक','স্মৃতিস্তম্ভ','நினைவுச்சின்னம்','స్మారకం','ਸਮਾਰਕ','ಸ್ಮಾರಕ','സ്മാരকം','ସ୍ମାরক');
    add('PLACE.CHURCH','church','chapel','गिरजा','চার্চ','தேவாலயம்','చర్చి','ਚਰਚ','ಚರ್ಚ್','ഇടവക','ଚର୍ਚ');
    add('PLACE.POOL','pool','swimming pool','पूल','সুইমিং পুল','குளம்','కొలను','ਪੂਲ','ಕೊಳ','നീന്തൽക്കുളം');
    add('PLACE.PARK','park','garden','बगीचा','বাগান','பூங்கா','పార్కు','ਪਾਰਕ','ಉದ್ಯಾನ','പൂന്തോट्टம');
    add('PLACE.STREET','street','road','सड़क','রাস্তা','தெரு','రోడ్డు','ਸੜਕ','ರಸ್ತೆ','റോഡ്');
    add('PLACE.GOA','goa','गोवा','গোয়া','கோவா','గోవా','ਗੋਆ','ಗೋವಾ','ഗോവ','ଗୋଆ');

    // NATURE & LANDSCAPE
    add('NATURE.MOUNTAIN','mountain','mountains','hill','पहाड़','पर्वत','পাহাড়','পর্বত','மலை','పర్వతం','కొండ','डोंगर','ਪਹਾੜ','ಪರ್ವತ','ಬೆಟ್ಟ','മല','ପाహাড');
    add('NATURE.MOUNTAIN.SNOW','snow mountain','snowy','snow','बर्फीला','तुषार','পর্বত তুষার','பனி மலை','మంచు');
    add('NATURE.BEACH','sea','ocean','waves','समुद्र','সমুদ্র','কডল','கடல்','సముద్రం','ਸਮੁੰਦਰ','ಸಮুದ্ர','കടൽ','ସムुदر');
    add('NATURE.FOREST','forest','jungle','woods','जंगल','वन','জঙ্গল','காடு','అడవి','ਜੰਗਲ','ಕಾಡু','కாட्','ଜঙ্গल');
    add('NATURE.WATERFALL','waterfall','falls','झरना','জলপ্রপাত','அருவி','జలపాతం','ਝਰਨਾ','ಜलपात','ജलپ्रपात');
    add('NATURE.RIVER','river','stream','नदी','নদী','ஆறு','నది','ਨਦੀ','ನদি','നদி','ନदी');
    add('NATURE.SUNSET','sunset','golden hour','सूर्यास्त','সূর্যাস্ত','மாலை','ਸੂਰਜ ਡੁੱਬਣਾ','ಸূর্ঢ়াস্তু','അസ্তমनम');
    add('NATURE.SUNRISE','sunrise','dawn','सूर्योदय','সূর্যোদয়','சூரிய உதயம்','ਸੂਰਜ ਚੜ੍ਹਣਾ');
    add('NATURE.SKY','sky','clouds','cloudy','आकाश','আকাশ','வானம்','ఆకాశం','ਅਕਾਸ਼','ಆಕਾਸ਼','ആकाश');

    // FOOD & DRINK
    add('FOOD.BEVERAGE.COFFEE','coffee','espresso','cappuccino','latte','cold coffee',
      'कॉफ़ी','कॉफी','কফি','காபி','కాఫీ','कॅफे','ਕੌਫੀ','ಕಾಫಿ','കാপ്പി','କफि');
    add('FOOD.BEVERAGE.TEA','tea','chai','green tea','milk tea',
      'चाय','চা','தேநீர்','టీ','ਚਾਹ','ಚಹಾ','ചায','ଚा');
    add('FOOD.BEVERAGE.JUICE','juice','smoothie','रस','জুস','பழச்சாறு','జ్యూస్');
    add('FOOD.BEVERAGE.COCONUT_WATER','coconut water','nariyal pani','नारियल पानी','ডাব','இளநீர்','కొబ్బరి నీళ్ళు');
    add('FOOD.INDIAN','biryani','dosa','idli','vada','samosa','pakora','curry','thali','dal','paneer','tandoori','kebab','chaat','pani puri','momos',
      'बिरयानी','दोसा','বিরিয়ানি','ビリヤニ','கரி','داল');
    add('FOOD.INTERNATIONAL','pizza','burger','pasta','sandwich','sushi','noodles','steak','tacos','salad','soup',
      'पिज्जा','বার্গার','பீஸ்ஸா','పిజ్జా');
    add('FOOD.DESSERT','cake','ice cream','pastry','donut','brownie','chocolate','cookies','pudding',
      'gulab jamun','rasgulla','jalebi','kulfi',
      'केक','আইসক্রিম','கேக்','కేక்','ਕੇਕ');
    add('FOOD.DINING','dining','eating','lunch','dinner','breakfast','meal','food','snack',
      'खाना','भोजन','খাবার','உணவு','భోజనం','ਖਾਣਾ','ಆಹಾರ','ഭക्ഷणம','ଖ亂ਦ');

    // PEOPLE
    add('PEOPLE.FRIENDS','friends','friend','buddy','বন্ধু','दोस्त','یار','دوست',
      'yaar','dost','यार','ਦੋਸਤ','ಗেళৈয়র','സুഹৃত','ミtres','বন্ধুরা');
    add('PEOPLE.FAMILY','family','relatives','परिवार','পরিবার','குடும்பம்','కుటుంబం','ਪਰਿਵਾਰ','ಕুটুংব','കুടুംബം','ପরিবার');
    add('PEOPLE.COUPLE','couple','partner','date','रोमांस','প্রেমিক জুটি','காதலர்','జంట');
    add('PEOPLE.SOLO','solo','alone','self','alone','एकला','একা','தனியாக','ఒంటرিగా');
    add('PEOPLE.GROUP','group','gang','crew','crowd','टोली','দল','குழু','గ్రూప్');
    add('PEOPLE.COLLEAGUES','colleagues','coworkers','सहयोगी','সহকর্মী');
    add('PEOPLE.CLASSMATES','classmates','college friends','सहपाठी','সহপাঠী');

    // ACTIVITIES
    add('ACTIVITY.TRAVEL','travel','trip','tour','vacation','holiday','यात्रा','সফর','பயணம்','ప্రయాణం','ਯਾਤਰਾ','ಪ್ರYaaNa','যাত্রা');
    add('ACTIVITY.TRAVEL.FLIGHT','flight','flying','airplane','plane','उड़ान','বিমান','விமானம்','విమానం');
    add('ACTIVITY.TRAVEL.ROAD_TRIP','road trip','drive','road','सड़क यात्रा','রোড ট্রিপ');
    add('ACTIVITY.TRAVEL.HIKING','hiking','trekking','trek','hike','ट्रैकिंग','ট্রেকিং','ट्रेकिंग');
    add('ACTIVITY.TRAVEL.BEACH_TRIP','beach trip','beach holiday','beach vacation','समुद्र यात्रा');
    add('ACTIVITY.SOCIAL.HANGOUT','hangout','outing','chill','मौज','আড্ডা','adda','अड्डा');
    add('ACTIVITY.SOCIAL.PARTY','party','celebration','पार्टी','পার্টি','விழা','పার్టీ');
    add('ACTIVITY.SOCIAL.DINING','dining out','dinner out','eating out','bhojan','খাওয়া');
    add('ACTIVITY.NIGHTLIFE','nightlife','night out','club','bar','pub','नाइटलाइफ','রাতের আड्ডা');
    add('ACTIVITY.SPORTS.SWIMMING','swimming','swim','तैराकी','সাঁতার','நீச்சல்','ఈత');
    add('ACTIVITY.SHOPPING','shopping','mall','खरीदारी','শপিং','கடை','షాపింग్');

    // EVENTS
    add('EVENT.BIRTHDAY','birthday','bday','जन्मदिन','জন্মদিন','பிறந்தநாள்','పుట్టినరోజు','ਜਨਮਦਿਨ','ಹुट्टुहब्ब','ജন്മദिনம','ଜन्मदिন');
    add('EVENT.WEDDING','wedding','marriage','शादी','বিয়ে','திருமணம்','పెళ్ళি','ਵਿਆਹ','ಮदुवे','വিवாহம');
    add('EVENT.GRADUATION','graduation','convocation','স্নাতক','பட்டப்படிப்பு','పట్టభদ্রত');
    add('EVENT.CHRISTMAS','christmas','xmas','क्रिसमस','ক্রিসমাস','கிறிஸ்துமஸ்','క్రిస్మస్');
    add('EVENT.DIWALI','diwali','deepavali','दिवाली','দীপাবলি','தீபாவளி','దীపావళి','ਦੀਵਾਲੀ','ദீপāவলി','ଦীপাবলি');
    add('EVENT.HOLI','holi','होली','হোলি','ஹோலி','హోలీ','ਹੋਲੀ','ಹোళি','ഹോళি');
    add('EVENT.REUNION','reunion','meetup','मिलन','মিলনমেলা');
    add('EVENT.FAREWELL','farewell','goodbye','alvida','अलविदा','বিদায়','விடைபெறுதல்');

    // TIME OF DAY
    add('TIME.MORNING','morning','सुबह','সকাল','காலை','ఉదయం','ਸਵੇਰੇ','ಬেళিগ்গे','রাবিলे');
    add('TIME.AFTERNOON','afternoon','दोपहर','বিকেল','மதியம்','మధ్యాహ్నం','ਦੁਪਹਿਰ','मध्यान');
    add('TIME.EVENING','evening','शाम','বিকাল','மாலை','సాయంత్రం','ਸ਼ਾਮ','ಸಂజे','वेळ');
    add('TIME.NIGHT','night','रात','রাত','இரவு','రాత్రి','ਰਾਤ','ராत्र','rati');
    add('TIME.DAWN','dawn','तड़का','ভোর','விடியற்காலை');
    add('TIME.GOLDEN_HOUR','golden hour','magic hour','सुनहरी रोशनी');

    // WEATHER
    add('WEATHER.SUNNY','sunny','sunshine','धूप','রোদ','வெயில்','ਧੁੱਪ','ಬিসিল');
    add('WEATHER.RAINY','rain','rainy','बारिश','বৃষ্টি','மழை','వర్षం','ਬਾਰਿਸ਼','ಮಳে','ବর्षা');
    add('WEATHER.FOGGY','fog','foggy','mist','misty','धुंध','কুয়াশা','மூடுபனி');
    add('WEATHER.CLOUDY','cloudy','overcast','clouds','बादल','মেঘ','مॅఘ');

    // TRANSPORT / OBJECTS
    add('TRANSPORT.AIRPLANE','airplane','flight','plane','विमान','বিমান','விமானம்','విమానం');
    add('TRANSPORT.CAR','car','automobile','गाड़ी','গাড়ি','கார்','కారు','ਕਾਰ');
    add('TRANSPORT.BOAT','boat','ship','ferry','नाव','নৌকা','படகு','పడవ');

    // MEMORY CONTEXT
    add('MEMORY.GOA_TRIP','goa trip','goa vacation','गोवा यात्रा','গোয়া ট্রিপ','கோவா பயணம்');
    add('MEMORY.COLLEGE_LIFE','college','college life','কলেজ','कॉलेज','ਕਾਲਜ');
    add('MEMORY.DAILY_LIFE','daily life','routine','everyday','दैनिक जीवन','দৈনন্দিন');
    add('MEMORY.FAMILY_GATHERING','family gathering','family get together','পরিবার মেলা');

    // PHOTO TYPE
    add('PHOTOTYPE.SELFIE','selfie','सेल्फी','সেলফি','செல்ஃபி');
    add('PHOTOTYPE.GROUP_PHOTO','group photo','group pic','समूह फोटो','গ্রুপ ফটো');
    add('PHOTOTYPE.PORTRAIT','portrait','close-up','পোর্ট্রেট');

    return m;
  }

  // ==========================================================================
  // 2. QUERY RESOLVER: raw text → canonical concept IDs
  // ==========================================================================
  function resolveQuery(rawText) {
    const tokens = rawText.toLowerCase().trim().split(/[\s,+]+/).filter(Boolean);
    const concepts = new Set();

    tokens.forEach(token => {
      // exact alias match
      if (ALIAS_MAP.has(token)) {
        ALIAS_MAP.get(token).forEach(c => concepts.add(c));
        return;
      }
      // substring match (bidirectional)
      for (const [alias, cids] of ALIAS_MAP.entries()) {
        if (alias.length > 2 && (alias.includes(token) || token.includes(alias))) {
          cids.forEach(c => concepts.add(c));
        }
      }
    });

    return { concepts, rawTokens: tokens };
  }

  // ==========================================================================
  // 3. PHOTO DATABASE — Structured multi-dimensional semantic representation
  //
  //  Each photo element carries:
  //    id: canonical concept ID (hierarchical, e.g. FOOD.BEVERAGE.COFFEE)
  //    label: human display label
  //    imp: 'primary' | 'secondary' | 'incidental'
  //
  //  Dimensions: place, people, activity, food, environment, objects, time, weather, event, memory
  //  Relations: natural-language strings describing element relationships
  //  Episode: which memory episode this photo belongs to
  // ==========================================================================
  const PHOTO_DB = [

    // ─── Nov 14, 2023 — Bangalore (home, pre-trip) ─────────────────────────
    { id:'p001', date:'2023-11-14', dateStr:'Nov 14, 2023', loc:'Bangalore',
      episode:'HOME_NOV23',
      url:'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=400&q=80',
      sem:{ place:[{id:'PLACE.HOME',label:'Home',imp:'primary'}],
            people:[{id:'PEOPLE.FAMILY',label:'Family',imp:'primary'}],
            food:[{id:'FOOD.BEVERAGE.COFFEE',label:'Coffee',imp:'primary'}],
            time:[{id:'TIME.MORNING',label:'Morning',imp:'primary'}],
            activity:[{id:'MEMORY.DAILY_LIFE',label:'Daily life',imp:'secondary'}],
            objects:[] },
      relations:['PEOPLE.FAMILY → sharing → FOOD.BEVERAGE.COFFEE → at → PLACE.HOME'],
      displayTags:['home','coffee','family','morning'] },

    { id:'p002', date:'2023-11-14', dateStr:'Nov 14, 2023', loc:'Bangalore',
      episode:'HOME_NOV23',
      url:'https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=400&q=80',
      sem:{ place:[{id:'PLACE.HOME',label:'Home',imp:'primary'},{id:'PLACE.HOME',label:'Balcony',imp:'primary'}],
            people:[{id:'PEOPLE.FAMILY',label:'Family',imp:'primary'}],
            time:[{id:'TIME.MORNING',label:'Morning',imp:'primary'}],
            objects:[], food:[], activity:[] },
      relations:['PEOPLE.FAMILY → on balcony → PLACE.HOME'],
      displayTags:['home','balcony','family','morning'] },

    { id:'p003', date:'2023-11-14', dateStr:'Nov 14, 2023', loc:'Bangalore',
      episode:'HOME_NOV23',
      url:'https://images.unsplash.com/photo-1543362906-acfc16c67564?auto=format&fit=crop&w=400&q=80',
      sem:{ place:[{id:'PLACE.CITY',label:'City',imp:'primary'},{id:'PLACE.STREET',label:'Street',imp:'primary'}],
            time:[{id:'TIME.EVENING',label:'Evening',imp:'primary'}],
            objects:[{id:'TRANSPORT.CAR',label:'Car',imp:'incidental'}],
            people:[], food:[], activity:[] },
      relations:['PLACE.STREET → in → PLACE.CITY → at → TIME.EVENING'],
      displayTags:['street','city','evening'] },

    { id:'p004', date:'2023-11-14', dateStr:'Nov 14, 2023', loc:'Bangalore',
      episode:'HOME_NOV23',
      url:'https://images.unsplash.com/photo-1533900298318-6b8da08a523e?auto=format&fit=crop&w=400&q=80',
      sem:{ place:[{id:'PLACE.MARKET',label:'Market',imp:'primary'}],
            activity:[{id:'ACTIVITY.SHOPPING',label:'Shopping',imp:'secondary'}],
            time:[{id:'TIME.AFTERNOON',label:'Afternoon',imp:'primary'}],
            objects:[], people:[], food:[] },
      relations:['ACTIVITY.SHOPPING → at → PLACE.MARKET → TIME.AFTERNOON'],
      displayTags:['market','shopping','afternoon'] },

    { id:'p005', date:'2023-11-14', dateStr:'Nov 14, 2023', loc: 'Bangalore',
      episode:'HOME_NOV23',
      url:'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=400&q=80',
      sem:{ place:[{id:'PLACE.CAFE',label:'Café',imp:'primary'}],
            people:[{id:'PEOPLE.FRIENDS',label:'Friends',imp:'primary'}],
            food:[{id:'FOOD.BEVERAGE.COFFEE',label:'Coffee',imp:'primary'}],
            time:[{id:'TIME.AFTERNOON',label:'Afternoon',imp:'primary'}],
            activity:[{id:'ACTIVITY.SOCIAL.HANGOUT',label:'Hangout',imp:'secondary'}],
            objects:[{id:'TRANSPORT.CAR',label:'Car outside',imp:'incidental'}] },
      relations:['PEOPLE.FRIENDS → drinking → FOOD.BEVERAGE.COFFEE → at → PLACE.CAFE'],
      displayTags:['café','friends','coffee','afternoon'] },

    { id:'p006', date:'2023-11-14', dateStr:'Nov 14, 2023', loc:'Bangalore',
      episode:'HOME_NOV23',
      url:'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=400&q=80',
      sem:{ place:[{id:'PLACE.CAFE',label:'Café',imp:'primary'}],
            people:[{id:'PEOPLE.FRIENDS',label:'Friends',imp:'primary'}],
            food:[{id:'FOOD.DESSERT',label:'Pastry',imp:'primary'},{id:'FOOD.BEVERAGE.COFFEE',label:'Coffee',imp:'secondary'}],
            time:[{id:'TIME.EVENING',label:'Evening',imp:'primary'}],
            activity:[{id:'ACTIVITY.SOCIAL.HANGOUT',label:'Hangout',imp:'secondary'}],
            objects:[] },
      relations:['PEOPLE.FRIENDS → sharing → FOOD.DESSERT → at → PLACE.CAFE → TIME.EVENING'],
      displayTags:['café','friends','pastry','evening'] },

    // ─── Nov 15, 2023 — Travel to Goa ────────────────────────────────────
    { id:'p007', date:'2023-11-15', dateStr:'Nov 15, 2023', loc:'Bangalore Airport',
      episode:'GOA_TRIP_NOV23',
      url:'https://images.unsplash.com/photo-1529074963764-98f45c47344b?auto=format&fit=crop&w=400&q=80',
      sem:{ place:[{id:'PLACE.AIRPORT',label:'Airport',imp:'primary'},{id:'PLACE.GOA',label:'Goa (destination)',imp:'secondary'}],
            activity:[{id:'ACTIVITY.TRAVEL',label:'Travel',imp:'primary'},{id:'ACTIVITY.TRAVEL.FLIGHT',label:'Flight',imp:'primary'}],
            time:[{id:'TIME.MORNING',label:'Morning',imp:'primary'}],
            memory:[{id:'MEMORY.GOA_TRIP',label:'Goa Trip',imp:'primary'}],
            people:[], food:[], objects:[{id:'TRANSPORT.AIRPLANE',label:'Airplane',imp:'secondary'}] },
      relations:['ACTIVITY.TRAVEL → via → TRANSPORT.AIRPLANE → to → PLACE.GOA'],
      displayTags:['airport','travel','flight','morning'] },

    { id:'p008', date:'2023-11-15', dateStr:'Nov 15, 2023', loc:'In Flight',
      episode:'GOA_TRIP_NOV23',
      url:'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=400&q=80',
      sem:{ activity:[{id:'ACTIVITY.TRAVEL.FLIGHT',label:'In-Flight',imp:'primary'},{id:'ACTIVITY.TRAVEL',label:'Travel',imp:'primary'}],
            time:[{id:'TIME.MORNING',label:'Morning',imp:'primary'}],
            memory:[{id:'MEMORY.GOA_TRIP',label:'Goa Trip',imp:'primary'}],
            objects:[{id:'TRANSPORT.AIRPLANE',label:'Airplane',imp:'primary'}],
            place:[], people:[], food:[] },
      relations:['ACTIVITY.TRAVEL → in → TRANSPORT.AIRPLANE → towards → PLACE.GOA'],
      displayTags:['in-flight','travel','morning','airplane'] },

    { id:'p009', date:'2023-11-15', dateStr:'Nov 15, 2023', loc:'Panaji, Goa',
      episode:'GOA_TRIP_NOV23',
      url:'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=400&q=80',
      sem:{ place:[{id:'PLACE.GOA',label:'Goa',imp:'primary'},{id:'PLACE.HOTEL',label:'Hotel',imp:'primary'}],
            people:[{id:'PEOPLE.FRIENDS',label:'Friends',imp:'primary'}],
            activity:[{id:'ACTIVITY.TRAVEL',label:'Travel',imp:'primary'}],
            time:[{id:'TIME.AFTERNOON',label:'Afternoon',imp:'primary'}],
            memory:[{id:'MEMORY.GOA_TRIP',label:'Goa Trip',imp:'primary'}],
            objects:[], food:[] },
      relations:['PEOPLE.FRIENDS → arrived at → PLACE.HOTEL → in → PLACE.GOA'],
      displayTags:['goa','hotel','friends','afternoon'] },

    { id:'p010', date:'2023-11-15', dateStr:'Nov 15, 2023', loc:'Panaji, Goa',
      episode:'GOA_TRIP_NOV23',
      url:'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=400&q=80',
      sem:{ place:[{id:'PLACE.GOA',label:'Goa',imp:'primary'},{id:'PLACE.HOTEL',label:'Hotel',imp:'primary'},{id:'PLACE.POOL',label:'Pool',imp:'primary'}],
            people:[{id:'PEOPLE.FRIENDS',label:'Friends',imp:'primary'}],
            time:[{id:'TIME.AFTERNOON',label:'Afternoon',imp:'primary'}],
            memory:[{id:'MEMORY.GOA_TRIP',label:'Goa Trip',imp:'primary'}],
            activity:[{id:'ACTIVITY.SOCIAL.HANGOUT',label:'Chilling',imp:'secondary'}],
            objects:[], food:[] },
      relations:['PEOPLE.FRIENDS → relaxing at → PLACE.POOL → at → PLACE.HOTEL → in → PLACE.GOA'],
      displayTags:['goa','hotel','pool','friends','afternoon'] },

    { id:'p011', date:'2023-11-15', dateStr:'Nov 15, 2023', loc:'Baga Beach, Goa',
      episode:'GOA_TRIP_NOV23',
      url:'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80',
      sem:{ place:[{id:'PLACE.GOA',label:'Goa',imp:'primary'},{id:'PLACE.BEACH',label:'Baga Beach',imp:'primary'}],
            people:[{id:'PEOPLE.FRIENDS',label:'Friends',imp:'primary'}],
            activity:[{id:'ACTIVITY.TRAVEL.BEACH_TRIP',label:'Beach trip',imp:'primary'}],
            environment:[{id:'NATURE.BEACH',label:'Ocean waves',imp:'primary'},{id:'NATURE.SUNSET',label:'Sunset',imp:'primary'}],
            time:[{id:'TIME.EVENING',label:'Evening',imp:'primary'}],
            memory:[{id:'MEMORY.GOA_TRIP',label:'Goa Trip',imp:'primary'}],
            objects:[], food:[] },
      relations:['PEOPLE.FRIENDS → watching → NATURE.SUNSET → at → PLACE.BEACH → in → PLACE.GOA'],
      displayTags:['goa','beach','sunset','friends','evening'] },

    { id:'p012', date:'2023-11-15', dateStr:'Nov 15, 2023', loc:'Baga Beach, Goa',
      episode:'GOA_TRIP_NOV23',
      url:'https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=400&q=80',
      sem:{ place:[{id:'PLACE.GOA',label:'Goa',imp:'primary'},{id:'PLACE.BEACH',label:'Beach',imp:'primary'}],
            people:[{id:'PEOPLE.FRIENDS',label:'Friends',imp:'primary'}],
            environment:[{id:'NATURE.BEACH',label:'Waves',imp:'primary'}],
            time:[{id:'TIME.EVENING',label:'Evening',imp:'primary'}],
            memory:[{id:'MEMORY.GOA_TRIP',label:'Goa Trip',imp:'primary'}],
            activity:[], objects:[], food:[] },
      relations:['PEOPLE.FRIENDS → at → PLACE.BEACH → PLACE.GOA → TIME.EVENING'],
      displayTags:['goa','beach','waves','friends','evening'] },

    // ─── Nov 16, 2023 — Anjuna (Flea Market + Café evening) ──────────────
    { id:'p013', date:'2023-11-16', dateStr:'Nov 16, 2023', loc:'Anjuna, Goa',
      episode:'GOA_TRIP_NOV23',
      url:'https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&w=400&q=80',
      sem:{ place:[{id:'PLACE.GOA',label:'Goa',imp:'primary'},{id:'PLACE.BEACH',label:'Anjuna Beach',imp:'primary'}],
            environment:[{id:'NATURE.BEACH',label:'Beach',imp:'primary'},{id:'NATURE.SUNSET',label:'Golden hour',imp:'primary'}],
            time:[{id:'TIME.MORNING',label:'Morning',imp:'primary'},{id:'TIME.GOLDEN_HOUR',label:'Golden hour',imp:'secondary'}],
            memory:[{id:'MEMORY.GOA_TRIP',label:'Goa Trip',imp:'primary'}],
            people:[], objects:[], food:[], activity:[] },
      relations:['NATURE.SUNSET → over → PLACE.BEACH → in → PLACE.GOA → TIME.MORNING'],
      displayTags:['goa','beach','morning','golden hour'] },

    { id:'p014', date:'2023-11-16', dateStr:'Nov 16, 2023', loc:'Anjuna, Goa',
      episode:'GOA_TRIP_NOV23',
      url:'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=400&q=80',
      sem:{ place:[{id:'PLACE.GOA',label:'Goa',imp:'primary'},{id:'PLACE.MARKET',label:'Flea Market',imp:'primary'}],
            people:[{id:'PEOPLE.FRIENDS',label:'Friends',imp:'primary'}],
            activity:[{id:'ACTIVITY.SHOPPING',label:'Shopping',imp:'primary'}],
            time:[{id:'TIME.MORNING',label:'Morning',imp:'primary'}],
            memory:[{id:'MEMORY.GOA_TRIP',label:'Goa Trip',imp:'primary'}],
            objects:[], food:[] },
      relations:['PEOPLE.FRIENDS → browsing → PLACE.MARKET → in → PLACE.GOA → TIME.MORNING'],
      displayTags:['goa','flea market','friends','morning'] },

    { id:'p015', date:'2023-11-16', dateStr:'Nov 16, 2023', loc:'Anjuna, Goa',
      episode:'GOA_TRIP_NOV23',
      url:'https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=400&q=80',
      sem:{ place:[{id:'PLACE.GOA',label:'Goa',imp:'primary'},{id:'PLACE.MARKET',label:'Flea Market',imp:'primary'}],
            activity:[{id:'ACTIVITY.SHOPPING',label:'Shopping',imp:'primary'}],
            time:[{id:'TIME.AFTERNOON',label:'Afternoon',imp:'primary'}],
            memory:[{id:'MEMORY.GOA_TRIP',label:'Goa Trip',imp:'primary'}],
            objects:[], people:[], food:[] },
      relations:['ACTIVITY.SHOPPING → at → PLACE.MARKET → PLACE.GOA → TIME.AFTERNOON'],
      displayTags:['goa','market','shopping','afternoon'] },

    { id:'p016', date:'2023-11-16', dateStr:'Nov 16, 2023', loc:'Café Lilliput, Anjuna',
      episode:'GOA_TRIP_NOV23',
      url:'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=400&q=80',
      sem:{ place:[{id:'PLACE.GOA',label:'Goa',imp:'primary'},{id:'PLACE.CAFE',label:'Café Lilliput',imp:'primary'},{id:'PLACE.BEACH',label:'Beach (visible)',imp:'secondary'}],
            people:[{id:'PEOPLE.FRIENDS',label:'Friends',imp:'primary'}],
            food:[{id:'FOOD.DINING',label:'Dinner',imp:'primary'},{id:'FOOD.INDIAN',label:'Seafood',imp:'secondary'}],
            time:[{id:'TIME.EVENING',label:'Evening',imp:'primary'}],
            activity:[{id:'ACTIVITY.SOCIAL.DINING',label:'Dining',imp:'primary'},{id:'ACTIVITY.SOCIAL.HANGOUT',label:'Hangout',imp:'secondary'}],
            memory:[{id:'MEMORY.GOA_TRIP',label:'Goa Trip',imp:'primary'}],
            objects:[{id:'TRANSPORT.CAR',label:'Car parked outside',imp:'incidental'}] },
      relations:['PEOPLE.FRIENDS → dining at → PLACE.CAFE → in → PLACE.GOA → TIME.EVENING','PLACE.CAFE → overlooks → PLACE.BEACH'],
      displayTags:['goa','café','friends','dinner','evening'] },

    { id:'p017', date:'2023-11-16', dateStr:'Nov 16, 2023', loc:'Café Lilliput, Anjuna',
      episode:'GOA_TRIP_NOV23',
      url:'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=400&q=80',
      sem:{ place:[{id:'PLACE.GOA',label:'Goa',imp:'primary'},{id:'PLACE.CAFE',label:'Café',imp:'primary'}],
            people:[{id:'PEOPLE.FRIENDS',label:'Friends',imp:'primary'}],
            food:[{id:'FOOD.BEVERAGE.COFFEE',label:'Coffee',imp:'primary'},{id:'FOOD.DESSERT',label:'Dessert',imp:'secondary'}],
            time:[{id:'TIME.EVENING',label:'Evening',imp:'primary'}],
            activity:[{id:'ACTIVITY.SOCIAL.HANGOUT',label:'Hangout',imp:'primary'}],
            memory:[{id:'MEMORY.GOA_TRIP',label:'Goa Trip',imp:'primary'}],
            objects:[{id:'TRANSPORT.CAR',label:'Street car',imp:'incidental'}] },
      relations:['PEOPLE.FRIENDS → drinking → FOOD.BEVERAGE.COFFEE → at → PLACE.CAFE → in → PLACE.GOA → TIME.EVENING'],
      displayTags:['goa','café','coffee','friends','evening'] },

    { id:'p018', date:'2023-11-16', dateStr:'Nov 16, 2023', loc:'Curlies, Anjuna Beach',
      episode:'GOA_TRIP_NOV23',
      url:'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=400&q=80',
      sem:{ place:[{id:'PLACE.GOA',label:'Goa',imp:'primary'},{id:'PLACE.BEACH',label:'Anjuna Beach',imp:'primary'}],
            people:[{id:'PEOPLE.FRIENDS',label:'Friends',imp:'primary'}],
            activity:[{id:'ACTIVITY.NIGHTLIFE',label:'Nightlife',imp:'primary'},{id:'ACTIVITY.SOCIAL.PARTY',label:'Beach party',imp:'primary'}],
            time:[{id:'TIME.NIGHT',label:'Night',imp:'primary'}],
            memory:[{id:'MEMORY.GOA_TRIP',label:'Goa Trip',imp:'primary'}],
            objects:[], food:[] },
      relations:['PEOPLE.FRIENDS → partying at → PLACE.BEACH → in → PLACE.GOA → TIME.NIGHT'],
      displayTags:['goa','nightlife','beach party','friends','night'] },

    // ─── Nov 17, 2023 — Heritage + Fontainhas + Beach ────────────────────
    { id:'p019', date:'2023-11-17', dateStr:'Nov 17, 2023', loc:'Old Goa',
      episode:'GOA_TRIP_NOV23',
      url:'https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=400&q=80',
      sem:{ place:[{id:'PLACE.GOA',label:'Goa',imp:'primary'},{id:'PLACE.MONUMENT',label:'Old Goa Church',imp:'primary'},{id:'PLACE.CHURCH',label:'Church',imp:'primary'}],
            activity:[{id:'ACTIVITY.TRAVEL',label:'Sightseeing',imp:'primary'}],
            time:[{id:'TIME.MORNING',label:'Morning',imp:'primary'}],
            memory:[{id:'MEMORY.GOA_TRIP',label:'Goa Trip',imp:'primary'}],
            people:[], objects:[], food:[] },
      relations:['ACTIVITY.TRAVEL → visiting → PLACE.MONUMENT → in → PLACE.GOA → TIME.MORNING'],
      displayTags:['goa','heritage','church','sightseeing','morning'] },

    { id:'p020', date:'2023-11-17', dateStr:'Nov 17, 2023', loc:'Old Goa',
      episode:'GOA_TRIP_NOV23',
      url:'https://images.unsplash.com/photo-1519817650390-64a93db51149?auto=format&fit=crop&w=400&q=80',
      sem:{ place:[{id:'PLACE.GOA',label:'Goa',imp:'primary'},{id:'PLACE.MONUMENT',label:'Old Goa',imp:'primary'}],
            activity:[{id:'ACTIVITY.TRAVEL',label:'Sightseeing',imp:'primary'}],
            time:[{id:'TIME.MORNING',label:'Morning',imp:'primary'}],
            memory:[{id:'MEMORY.GOA_TRIP',label:'Goa Trip',imp:'primary'}],
            people:[], objects:[], food:[] },
      relations:['ACTIVITY.TRAVEL → at → PLACE.MONUMENT → PLACE.GOA → TIME.MORNING'],
      displayTags:['goa','architecture','heritage','morning'] },

    { id:'p021', date:'2023-11-17', dateStr:'Nov 17, 2023', loc:'Fontainhas, Panaji',
      episode:'GOA_TRIP_NOV23',
      url:'https://images.unsplash.com/photo-1559925393-8be0ec4767c8?auto=format&fit=crop&w=400&q=80',
      sem:{ place:[{id:'PLACE.GOA',label:'Goa',imp:'primary'},{id:'PLACE.CAFE',label:'Café Fontainhas',imp:'primary'}],
            people:[{id:'PEOPLE.FRIENDS',label:'Friends',imp:'primary'}],
            food:[{id:'FOOD.DINING',label:'Brunch',imp:'primary'},{id:'FOOD.BEVERAGE.COFFEE',label:'Coffee',imp:'secondary'}],
            time:[{id:'TIME.AFTERNOON',label:'Afternoon',imp:'primary'}],
            activity:[{id:'ACTIVITY.SOCIAL.DINING',label:'Brunch',imp:'primary'}],
            memory:[{id:'MEMORY.GOA_TRIP',label:'Goa Trip',imp:'primary'}],
            objects:[] },
      relations:['PEOPLE.FRIENDS → brunch at → PLACE.CAFE → in → PLACE.GOA → TIME.AFTERNOON'],
      displayTags:['goa','café','brunch','friends','afternoon'] },

    { id:'p022', date:'2023-11-17', dateStr:'Nov 17, 2023', loc:'Fontainhas, Panaji',
      episode:'GOA_TRIP_NOV23',
      url:'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=400&q=80',
      sem:{ place:[{id:'PLACE.GOA',label:'Goa',imp:'primary'},{id:'PLACE.STREET',label:'Heritage streets',imp:'primary'}],
            people:[{id:'PEOPLE.FRIENDS',label:'Friends',imp:'primary'}],
            activity:[{id:'ACTIVITY.TRAVEL',label:'Exploring',imp:'primary'}],
            time:[{id:'TIME.AFTERNOON',label:'Afternoon',imp:'primary'}],
            memory:[{id:'MEMORY.GOA_TRIP',label:'Goa Trip',imp:'primary'}],
            objects:[], food:[] },
      relations:['PEOPLE.FRIENDS → exploring → PLACE.STREET → in → PLACE.GOA → TIME.AFTERNOON'],
      displayTags:['goa','street walk','friends','exploring','afternoon'] },

    { id:'p023', date:'2023-11-17', dateStr:'Nov 17, 2023', loc:'Calangute Beach, Goa',
      episode:'GOA_TRIP_NOV23',
      url:'https://images.unsplash.com/photo-1542397284385-6010376c5337?auto=format&fit=crop&w=400&q=80',
      sem:{ place:[{id:'PLACE.GOA',label:'Goa',imp:'primary'},{id:'PLACE.BEACH',label:'Calangute Beach',imp:'primary'}],
            people:[{id:'PEOPLE.FRIENDS',label:'Friends',imp:'primary'}],
            environment:[{id:'NATURE.BEACH',label:'Beach',imp:'primary'},{id:'NATURE.SUNSET',label:'Sunset',imp:'primary'}],
            time:[{id:'TIME.EVENING',label:'Evening',imp:'primary'}],
            memory:[{id:'MEMORY.GOA_TRIP',label:'Goa Trip',imp:'primary'}],
            activity:[{id:'ACTIVITY.TRAVEL.BEACH_TRIP',label:'Beach time',imp:'primary'}],
            objects:[], food:[] },
      relations:['PEOPLE.FRIENDS → at → PLACE.BEACH → watching → NATURE.SUNSET → TIME.EVENING → PLACE.GOA'],
      displayTags:['goa','beach','sunset','friends','evening'] },

    { id:'p024', date:'2023-11-17', dateStr:'Nov 17, 2023', loc:'Calangute Beach, Goa',
      episode:'GOA_TRIP_NOV23',
      url:'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=401&q=80',
      sem:{ place:[{id:'PLACE.GOA',label:'Goa',imp:'primary'},{id:'PLACE.BEACH',label:'Beach',imp:'primary'}],
            environment:[{id:'NATURE.BEACH',label:'Ocean',imp:'primary'},{id:'NATURE.SUNSET',label:'Sunset',imp:'primary'}],
            time:[{id:'TIME.EVENING',label:'Evening',imp:'primary'}],
            memory:[{id:'MEMORY.GOA_TRIP',label:'Goa Trip',imp:'primary'}],
            people:[], objects:[], food:[], activity:[] },
      relations:['NATURE.SUNSET → over → NATURE.BEACH → at → PLACE.GOA → TIME.EVENING'],
      displayTags:['goa','beach','sunset','ocean'] },

    { id:'p025', date:'2023-11-17', dateStr:'Nov 17, 2023', loc:'Beach Shack, Calangute',
      episode:'GOA_TRIP_NOV23',
      url:'https://images.unsplash.com/photo-1543007630-9710e4a00a20?auto=format&fit=crop&w=400&q=80',
      sem:{ place:[{id:'PLACE.GOA',label:'Goa',imp:'primary'},{id:'PLACE.CAFE',label:'Beach shack',imp:'primary'},{id:'PLACE.BEACH',label:'Beach',imp:'secondary'}],
            people:[{id:'PEOPLE.FRIENDS',label:'Friends',imp:'primary'}],
            food:[{id:'FOOD.DINING',label:'Dinner',imp:'primary'},{id:'FOOD.BEVERAGE.COCONUT_WATER',label:'Coconut water',imp:'secondary'}],
            time:[{id:'TIME.EVENING',label:'Evening',imp:'primary'}],
            activity:[{id:'ACTIVITY.SOCIAL.DINING',label:'Beach dinner',imp:'primary'}],
            memory:[{id:'MEMORY.GOA_TRIP',label:'Goa Trip',imp:'primary'}],
            objects:[] },
      relations:['PEOPLE.FRIENDS → dinner at → PLACE.CAFE → on → PLACE.BEACH → PLACE.GOA → TIME.EVENING'],
      displayTags:['goa','beach café','dinner','friends','evening'] },

    { id:'p026', date:'2023-11-17', dateStr:'Nov 17, 2023', loc:'Beach Shack, Calangute',
      episode:'GOA_TRIP_NOV23',
      url:'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=401&q=80',
      sem:{ place:[{id:'PLACE.GOA',label:'Goa',imp:'primary'},{id:'PLACE.CAFE',label:'Café',imp:'primary'}],
            people:[{id:'PEOPLE.FRIENDS',label:'Friends',imp:'primary'}],
            food:[{id:'FOOD.INDIAN',label:'Indian food',imp:'primary'},{id:'FOOD.BEVERAGE.COFFEE',label:'Coffee',imp:'secondary'}],
            time:[{id:'TIME.NIGHT',label:'Night',imp:'primary'}],
            activity:[{id:'ACTIVITY.SOCIAL.HANGOUT',label:'Night hangout',imp:'secondary'}],
            memory:[{id:'MEMORY.GOA_TRIP',label:'Goa Trip',imp:'primary'}],
            objects:[] },
      relations:['PEOPLE.FRIENDS → dining → PLACE.CAFE → PLACE.GOA → TIME.NIGHT'],
      displayTags:['goa','café','night','friends','food'] },

    // ─── Nov 18, 2023 — Last day + Departure ─────────────────────────────
    { id:'p027', date:'2023-11-18', dateStr:'Nov 18, 2023', loc:'Anjuna Beach, Goa',
      episode:'GOA_TRIP_NOV23',
      url:'https://images.unsplash.com/photo-1562259929-b4e1fd3aef09?auto=format&fit=crop&w=400&q=80',
      sem:{ place:[{id:'PLACE.GOA',label:'Goa',imp:'primary'},{id:'PLACE.BEACH',label:'Anjuna Beach',imp:'primary'}],
            environment:[{id:'NATURE.BEACH',label:'Beach',imp:'primary'}],
            time:[{id:'TIME.MORNING',label:'Morning',imp:'primary'}],
            memory:[{id:'MEMORY.GOA_TRIP',label:'Goa Trip',imp:'primary'}],
            people:[], objects:[], food:[], activity:[] },
      relations:['PLACE.BEACH → PLACE.GOA → TIME.MORNING → last day'],
      displayTags:['goa','beach','last day','morning'] },

    { id:'p028', date:'2023-11-18', dateStr:'Nov 18, 2023', loc:'Anjuna Beach, Goa',
      episode:'GOA_TRIP_NOV23',
      url:'https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=401&q=80',
      sem:{ place:[{id:'PLACE.GOA',label:'Goa',imp:'primary'},{id:'PLACE.BEACH',label:'Beach',imp:'primary'}],
            people:[{id:'PEOPLE.FRIENDS',label:'Friends',imp:'primary'}],
            activity:[{id:'ACTIVITY.SPORTS.SWIMMING',label:'Swimming',imp:'primary'},{id:'ACTIVITY.TRAVEL.BEACH_TRIP',label:'Beach day',imp:'secondary'}],
            environment:[{id:'NATURE.BEACH',label:'Ocean',imp:'primary'}],
            time:[{id:'TIME.MORNING',label:'Morning',imp:'primary'}],
            memory:[{id:'MEMORY.GOA_TRIP',label:'Goa Trip',imp:'primary'}],
            objects:[], food:[] },
      relations:['PEOPLE.FRIENDS → swimming at → PLACE.BEACH → PLACE.GOA → TIME.MORNING'],
      displayTags:['goa','beach','swimming','friends','morning'] },

    { id:'p029', date:'2023-11-18', dateStr:'Nov 18, 2023', loc:'Goa Airport',
      episode:'GOA_TRIP_NOV23',
      url:'https://images.unsplash.com/photo-1529074963764-98f45c47344b?auto=format&fit=crop&w=401&q=80',
      sem:{ place:[{id:'PLACE.AIRPORT',label:'Airport',imp:'primary'},{id:'PLACE.GOA',label:'Goa (departure)',imp:'secondary'}],
            activity:[{id:'ACTIVITY.TRAVEL',label:'Travel',imp:'primary'},{id:'ACTIVITY.TRAVEL.FLIGHT',label:'Departure flight',imp:'primary'}],
            time:[{id:'TIME.AFTERNOON',label:'Afternoon',imp:'primary'}],
            memory:[{id:'MEMORY.GOA_TRIP',label:'Goa Trip',imp:'primary'}],
            objects:[{id:'TRANSPORT.AIRPLANE',label:'Airplane',imp:'secondary'}],
            people:[], food:[] },
      relations:['ACTIVITY.TRAVEL → departing → PLACE.GOA → via → PLACE.AIRPORT'],
      displayTags:['goa','airport','departure','afternoon'] },

    { id:'p030', date:'2023-11-18', dateStr:'Nov 18, 2023', loc:'Back Home, Bangalore',
      episode:'HOME_NOV23',
      url:'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=401&q=80',
      sem:{ place:[{id:'PLACE.HOME',label:'Home',imp:'primary'}],
            people:[{id:'PEOPLE.FAMILY',label:'Family',imp:'primary'}],
            food:[{id:'FOOD.BEVERAGE.COFFEE',label:'Coffee',imp:'primary'}],
            time:[{id:'TIME.EVENING',label:'Evening',imp:'primary'}],
            activity:[{id:'MEMORY.DAILY_LIFE',label:'Back home',imp:'secondary'}],
            objects:[], memory:[] },
      relations:['PEOPLE.FAMILY → welcoming back → PLACE.HOME → TIME.EVENING'],
      displayTags:['home','coffee','family','evening'] },

    // ─── Dec 4, 2023 — Bangalore hangout ────────────────────────────────
    { id:'p031', date:'2023-12-04', dateStr:'Dec 4, 2023', loc:'Bangalore',
      episode:'BLR_DEC23',
      url:'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=400&q=80',
      sem:{ place:[{id:'PLACE.CITY',label:'City',imp:'primary'},{id:'PLACE.STREET',label:'Street',imp:'secondary'}],
            people:[{id:'PEOPLE.FRIENDS',label:'Friends',imp:'primary'}],
            activity:[{id:'ACTIVITY.SOCIAL.HANGOUT',label:'Hangout',imp:'primary'}],
            time:[{id:'TIME.EVENING',label:'Evening',imp:'primary'}],
            objects:[{id:'TRANSPORT.CAR',label:'Cars in street',imp:'incidental'}],
            food:[], memory:[] },
      relations:['PEOPLE.FRIENDS → hanging out → PLACE.CITY → TIME.EVENING'],
      displayTags:['city','friends','hangout','evening'] },

    { id:'p032', date:'2023-12-04', dateStr:'Dec 4, 2023', loc:'Bangalore',
      episode:'BLR_DEC23',
      url:'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=401&q=80',
      sem:{ place:[{id:'PLACE.CAFE',label:'Café',imp:'primary'}],
            people:[{id:'PEOPLE.FRIENDS',label:'Friends',imp:'primary'}],
            food:[{id:'FOOD.BEVERAGE.COFFEE',label:'Coffee',imp:'secondary'},{id:'FOOD.DESSERT',label:'Snack',imp:'secondary'}],
            time:[{id:'TIME.AFTERNOON',label:'Afternoon',imp:'primary'}],
            activity:[{id:'ACTIVITY.SOCIAL.HANGOUT',label:'Hangout',imp:'primary'}],
            objects:[], memory:[] },
      relations:['PEOPLE.FRIENDS → hanging out → PLACE.CAFE → TIME.AFTERNOON'],
      displayTags:['café','friends','hangout','afternoon'] },

    { id:'p033', date:'2023-12-04', dateStr:'Dec 4, 2023', loc:'Bangalore',
      episode:'BLR_DEC23',
      url:'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=401&q=80',
      sem:{ place:[{id:'PLACE.CAFE',label:'Café',imp:'primary'}],
            people:[{id:'PEOPLE.SOLO',label:'Solo',imp:'primary'}],
            food:[{id:'FOOD.BEVERAGE.COFFEE',label:'Coffee',imp:'primary'}],
            time:[{id:'TIME.EVENING',label:'Evening',imp:'primary'}],
            activity:[{id:'MEMORY.DAILY_LIFE',label:'Solo time',imp:'secondary'}],
            objects:[], memory:[] },
      relations:['PEOPLE.SOLO → alone with → FOOD.BEVERAGE.COFFEE → at → PLACE.CAFE → TIME.EVENING'],
      displayTags:['café','solo','coffee','evening'] },

    // ─── Dec 25, 2023 — Christmas ─────────────────────────────────────────
    { id:'p034', date:'2023-12-25', dateStr:'Dec 25, 2023', loc:'Bangalore',
      episode:'CHRISTMAS_23',
      url:'https://images.unsplash.com/photo-1449495169669-7b118f960251?auto=format&fit=crop&w=400&q=80',
      sem:{ event:[{id:'EVENT.CHRISTMAS',label:'Christmas',imp:'primary'}],
            people:[{id:'PEOPLE.FAMILY',label:'Family',imp:'primary'}],
            activity:[{id:'ACTIVITY.SOCIAL.PARTY',label:'Celebration',imp:'primary'}],
            time:[{id:'TIME.EVENING',label:'Evening',imp:'primary'}],
            place:[{id:'PLACE.HOME',label:'Home',imp:'secondary'}],
            objects:[], food:[], memory:[] },
      relations:['PEOPLE.FAMILY → celebrating → EVENT.CHRISTMAS → at → PLACE.HOME → TIME.EVENING'],
      displayTags:['christmas','family','celebration','evening'] },

    { id:'p035', date:'2023-12-25', dateStr:'Dec 25, 2023', loc:'Bangalore',
      episode:'CHRISTMAS_23',
      url:'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=400&q=80',
      sem:{ event:[{id:'EVENT.CHRISTMAS',label:'Christmas',imp:'primary'}],
            people:[{id:'PEOPLE.FAMILY',label:'Family',imp:'primary'}],
            food:[{id:'FOOD.DINING',label:'Christmas dinner',imp:'primary'}],
            time:[{id:'TIME.NIGHT',label:'Night',imp:'primary'}],
            place:[{id:'PLACE.HOME',label:'Home',imp:'secondary'}],
            objects:[], activity:[], memory:[] },
      relations:['PEOPLE.FAMILY → christmas dinner → FOOD.DINING → at → PLACE.HOME → TIME.NIGHT'],
      displayTags:['christmas','family','dinner','night'] },

    { id:'p036', date:'2023-12-25', dateStr:'Dec 25, 2023', loc:'Bangalore',
      episode:'CHRISTMAS_23',
      url:'https://images.unsplash.com/photo-1418985991508-e47386d96a71?auto=format&fit=crop&w=400&q=80',
      sem:{ event:[{id:'EVENT.CHRISTMAS',label:'Christmas',imp:'primary'}],
            people:[{id:'PEOPLE.FRIENDS',label:'Friends',imp:'primary'}],
            activity:[{id:'ACTIVITY.SOCIAL.PARTY',label:'Party',imp:'primary'}],
            time:[{id:'TIME.NIGHT',label:'Night',imp:'primary'}],
            place:[{id:'PLACE.HOME',label:'Home',imp:'secondary'}],
            objects:[], food:[], memory:[] },
      relations:['PEOPLE.FRIENDS → christmas party → ACTIVITY.SOCIAL.PARTY → TIME.NIGHT'],
      displayTags:['christmas','friends','party','night'] },
  ];

  // ==========================================================================
  // 4. EPISODE INDEX (memory-level understanding)
  //    Groups of photos that form a coherent memory episode
  // ==========================================================================
  const EPISODES = {
    GOA_TRIP_NOV23:  { label:'Goa Trip', icon:'🏖️', dateRange:'15–18 Nov 2023' },
    HOME_NOV23:      { label:'Home · Bangalore', icon:'🏠', dateRange:'Nov 2023' },
    BLR_DEC23:       { label:'Bangalore Hangouts', icon:'☕', dateRange:'Dec 2023' },
    CHRISTMAS_23:    { label:'Christmas 2023', icon:'🎄', dateRange:'25 Dec 2023' },
  };

  // ==========================================================================
  // 5. DOM REFS
  // ==========================================================================
  const searchInput         = document.getElementById('searchInput');
  const btnClearSearch      = document.getElementById('btnClearSearch');
  const searchInfoBar       = document.getElementById('searchInfoBar');
  const searchInfoText      = document.getElementById('searchInfoText');
  const searchTagsRow       = document.getElementById('searchTagsRow');
  const searchTagsList      = document.getElementById('searchTagsList');
  const suggestionsOverlay  = document.getElementById('suggestionsOverlay');
  const gpTimeline          = document.getElementById('gpTimeline');
  const matchNavigator      = document.getElementById('matchNavigator');
  const btnPrevMatch        = document.getElementById('btnPrevMatch');
  const btnNextMatch        = document.getElementById('btnNextMatch');
  const navCounter          = document.getElementById('navCounter');
  const photoViewer         = document.getElementById('photoViewer');
  const btnViewerClose      = document.getElementById('btnViewerClose');
  const viewerImg           = document.getElementById('viewerImg');
  const viewerDate          = document.getElementById('viewerDate');
  const viewerLoc           = document.getElementById('viewerLoc');
  const viewerTags          = document.getElementById('viewerTags');
  const btnGoHome           = document.getElementById('btnGoHome');

  const btnTimeframe            = document.getElementById('btnTimeframe');
  const timeframeBtnLabel       = document.getElementById('timeframeBtnLabel');
  const timeframeDropdown       = document.getElementById('timeframeDropdown');
  const timeframeActiveRow      = document.getElementById('timeframeActiveRow');
  const timeframeActivePillText = document.getElementById('timeframeActivePillText');
  const btnClearTimeframe       = document.getElementById('btnClearTimeframe');
  const tfCustomPanel           = document.getElementById('tfCustomPanel');
  const tfFromDate              = document.getElementById('tfFromDate');
  const tfToDate                = document.getElementById('tfToDate');
  const btnApplyCustom          = document.getElementById('btnApplyCustom');

  // ==========================================================================
  // 6. STATE
  // ==========================================================================
  let activeQuery     = '';
  let rawTokens       = [];
  let activeConcepts  = new Set();
  let matchIds        = [];           // strong matches (primary/secondary)
  let currentMatchIdx = 0;
  let activePreset    = 'any';
  let tfFrom          = null;
  let tfTo            = null;

  // ==========================================================================
  // 7. IMPORTANCE-AWARE SEARCH ENGINE
  //    Spec: "Rank — How important are they to this photo?"
  //    primary match   → is-match (full highlight, included in NEXT/PREV)
  //    secondary match → is-match-secondary (lighter, included in NEXT/PREV)
  //    incidental only → NOT highlighted (background car doesn't dominate)
  // ==========================================================================

  function matchScore(photo, queryConcepts) {
    if (queryConcepts.size === 0) return 0;

    let primaryHits   = 0;
    let secondaryHits = 0;
    let incidentalHits = 0;
    let queryHits = 0;  // how many query concepts found at all

    for (const qc of queryConcepts) {
      let foundAtLevel = null;
      // Search all dimensions
      const dims = Object.values(photo.sem);
      for (const dim of dims) {
        if (!Array.isArray(dim)) continue;
        for (const el of dim) {
          const matches = el.id === qc
            || el.id.startsWith(qc + '.')
            || qc.startsWith(el.id + '.');
          if (matches) {
            // Take the highest importance level found
            if (el.imp === 'primary' && foundAtLevel !== 'primary') foundAtLevel = 'primary';
            else if (el.imp === 'secondary' && !foundAtLevel) foundAtLevel = 'secondary';
            else if (el.imp === 'incidental' && !foundAtLevel) foundAtLevel = 'incidental';
          }
        }
      }
      if (foundAtLevel === 'primary')    { primaryHits++;    queryHits++; }
      else if (foundAtLevel === 'secondary') { secondaryHits++; queryHits++; }
      else if (foundAtLevel === 'incidental') { incidentalHits++; /* not a queryHit */ }
    }

    // Must hit at least one primary or secondary to be a real match
    if (queryHits === 0) return 0;

    // Score: primary = 10pts, secondary = 4pts, incidental = 0
    return primaryHits * 10 + secondaryHits * 4;
  }

  // ==========================================================================
  // 8. BUILD TIMELINE
  // ==========================================================================
  function buildTimeline() {
    const groups = {};
    PHOTO_DB.forEach(p => {
      if (!groups[p.date]) groups[p.date] = { dateStr: p.dateStr, loc: p.loc, photos: [] };
      groups[p.date].photos.push(p);
    });

    Object.keys(groups).sort().forEach(date => {
      const g = groups[date];
      const groupEl = document.createElement('div');
      groupEl.className = 'gp-group';
      groupEl.id = `grp-${date}`;

      const head = document.createElement('div');
      head.className = 'gp-group-head';
      head.innerHTML = `<span class="gp-group-date">${g.dateStr}</span><span class="gp-group-loc">${g.loc}</span>`;
      groupEl.appendChild(head);

      const grid = document.createElement('div');
      grid.className = 'gp-photo-grid';

      g.photos.forEach(photo => {
        const cell = document.createElement('div');
        cell.className = 'gp-photo-cell';
        cell.id = `cell-${photo.id}`;
        cell.dataset.id = photo.id;
        cell.dataset.date = photo.date;
        cell.dataset.episode = photo.episode || '';

        cell.innerHTML = `
          <img src="${photo.url}" alt="${photo.dateStr} · ${photo.loc}" loading="lazy" />
          <div class="gp-match-dot"></div>
          <div class="gp-photo-tags">
            ${photo.displayTags.map(t => `<span class="gp-photo-tag-chip">${t}</span>`).join('')}
          </div>
        `;
        cell.addEventListener('click', () => openViewer(photo));
        grid.appendChild(cell);
      });

      groupEl.appendChild(grid);
      gpTimeline.appendChild(groupEl);
    });

    adjustTimelinePadding();
  }

  function adjustTimelinePadding() {
    const topBar = document.querySelector('.gp-top-bar');
    if (topBar) gpTimeline.style.paddingTop = topBar.offsetHeight + 'px';
  }

  // ==========================================================================
  // 9. SEARCH
  // ==========================================================================
  function doSearch(rawQuery) {
    activeQuery = rawQuery.trim();
    if (!activeQuery) { clearSearch(); return; }

    const resolved = resolveQuery(activeQuery);
    activeConcepts = resolved.concepts;
    rawTokens      = resolved.rawTokens;

    // Score every photo
    const scored = PHOTO_DB.map(photo => ({
      photo,
      score: matchScore(photo, activeConcepts),
      inTimeframe: isInTimeframe(new Date(photo.date))
    }));

    matchIds = [];

    scored.forEach(({ photo, score, inTimeframe }) => {
      const cell = document.getElementById(`cell-${photo.id}`);
      if (!cell) return;
      cell.classList.remove('is-match', 'is-match-secondary', 'is-current-match');
      cell.dataset.score = score;

      if (score > 0 && inTimeframe) {
        if (score >= 10) {
          // Strong match (at least one primary concept)
          cell.classList.add('is-match');
          matchIds.push(photo.id);
        } else {
          // Secondary-only match (lighter highlight, still navigable)
          cell.classList.add('is-match-secondary');
          matchIds.push(photo.id);
        }
      }
    });

    // Sort matchIds by score desc within same date group, then chronologically
    matchIds.sort((a, b) => {
      const pA = PHOTO_DB.find(p => p.id === a);
      const pB = PHOTO_DB.find(p => p.id === b);
      // Primarily chronological — keeps timeline navigation meaningful
      return pA.date < pB.date ? -1 : pA.date > pB.date ? 1
        : (parseInt(a.slice(1)) - parseInt(b.slice(1)));
    });

    renderTagChips();

    if (matchIds.length > 0) {
      const tfSuffix = (activePreset !== 'any') ? ` within ${timeframeBtnLabel.textContent}` : '';
      searchInfoText.textContent = `Found ${matchIds.length} matching photo${matchIds.length > 1 ? 's' : ''}${tfSuffix}`;
      searchInfoBar.style.display = 'block';
      currentMatchIdx = 0;
      highlightCurrentMatch();
      matchNavigator.style.display = 'flex';
      updateNavigator();
      scrollToCurrentMatch(true);
    } else {
      searchInfoText.textContent = 'No photos match your search';
      searchInfoBar.style.display = 'block';
      matchNavigator.style.display = 'none';
    }

    adjustTimelinePadding();
  }

  function highlightCurrentMatch() {
    document.querySelectorAll('.gp-photo-cell.is-current-match').forEach(c =>
      c.classList.remove('is-current-match'));
    if (!matchIds.length) return;
    const cell = document.getElementById(`cell-${matchIds[currentMatchIdx]}`);
    if (cell) cell.classList.add('is-current-match');
  }

  function scrollToCurrentMatch(firstTime = false) {
    if (!matchIds.length) return;
    const cell = document.getElementById(`cell-${matchIds[currentMatchIdx]}`);
    if (cell) cell.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function updateNavigator() {
    navCounter.textContent = `${currentMatchIdx + 1} of ${matchIds.length}`;
    btnPrevMatch.disabled = currentMatchIdx <= 0;
    btnNextMatch.disabled = currentMatchIdx >= matchIds.length - 1;
  }

  function renderTagChips() {
    searchTagsList.innerHTML = '';
    rawTokens.forEach(term => {
      const chip = document.createElement('div');
      chip.className = 'gp-search-tag-chip';
      chip.innerHTML = `
        <span>${term}</span>
        <button class="gp-search-tag-remove" aria-label="Remove ${term}" data-term="${term}">✕</button>
      `;
      chip.querySelector('.gp-search-tag-remove').addEventListener('click', () => {
        const newQ = rawTokens.filter(t => t !== term).join(' ');
        searchInput.value = newQ;
        if (newQ) doSearch(newQ); else clearSearch();
      });
      searchTagsList.appendChild(chip);
    });
    searchTagsRow.style.display = rawTokens.length ? 'flex' : 'none';
    adjustTimelinePadding();
  }

  function clearSearch() {
    activeQuery = ''; rawTokens = []; activeConcepts = new Set();
    matchIds = []; currentMatchIdx = 0;
    searchInput.value = '';
    btnClearSearch.style.display = 'none';
    searchInfoBar.style.display = 'none';
    searchTagsRow.style.display = 'none';
    matchNavigator.style.display = 'none';
    suggestionsOverlay.style.display = 'none';
    searchTagsList.innerHTML = '';
    document.querySelectorAll('.gp-photo-cell').forEach(c =>
      c.classList.remove('is-match','is-match-secondary','is-current-match'));
    adjustTimelinePadding();
  }

  // ==========================================================================
  // 10. SEARCH INPUT EVENTS
  // ==========================================================================
  searchInput.addEventListener('focus', () => {
    if (!searchInput.value.trim()) suggestionsOverlay.style.display = 'block';
  });
  searchInput.addEventListener('input', () => {
    btnClearSearch.style.display = searchInput.value ? 'flex' : 'none';
    if (!searchInput.value.trim()) { suggestionsOverlay.style.display = 'block'; clearSearch(); }
    else suggestionsOverlay.style.display = 'none';
  });
  searchInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') { suggestionsOverlay.style.display = 'none'; searchInput.blur(); doSearch(searchInput.value); }
    if (e.key === 'Escape') { clearSearch(); searchInput.blur(); }
  });
  btnClearSearch.addEventListener('click', () => { clearSearch(); searchInput.focus(); });
  document.addEventListener('click', e => {
    if (!e.target.closest('#gpSearchBar') && !e.target.closest('#suggestionsOverlay'))
      suggestionsOverlay.style.display = 'none';
  });
  document.querySelectorAll('.gp-suggestion-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      searchInput.value = chip.dataset.query;
      btnClearSearch.style.display = 'flex';
      suggestionsOverlay.style.display = 'none';
      searchInput.blur();
      doSearch(chip.dataset.query);
    });
  });

  // ==========================================================================
  // 11. NAVIGATION
  // ==========================================================================
  btnNextMatch.addEventListener('click', () => {
    if (currentMatchIdx < matchIds.length - 1) {
      currentMatchIdx++; highlightCurrentMatch(); scrollToCurrentMatch(); updateNavigator();
    }
  });
  btnPrevMatch.addEventListener('click', () => {
    if (currentMatchIdx > 0) {
      currentMatchIdx--; highlightCurrentMatch(); scrollToCurrentMatch(); updateNavigator();
    }
  });
  btnGoHome.addEventListener('click', () => { clearSearch(); window.scrollTo({ top:0, behavior:'smooth' }); });

  // ==========================================================================
  // 12. TIME FRAME FILTER
  // ==========================================================================
  function isInTimeframe(photoDate) {
    if (activePreset === 'any') return true;
    if (tfFrom && photoDate < tfFrom) return false;
    if (tfTo   && photoDate > tfTo)   return false;
    return true;
  }
  function applyPreset(preset) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    activePreset = preset; tfFrom = null; tfTo = null;
    if (preset === 'today') { tfFrom = today; tfTo = new Date(today.getTime()+86399999); }
    else if (preset === 'week') { const d=today.getDay(); tfFrom=new Date(today); tfFrom.setDate(today.getDate()-d); tfTo=new Date(today); tfTo.setDate(today.getDate()+(6-d)); }
    else if (preset === 'month') { tfFrom=new Date(now.getFullYear(),now.getMonth(),1); tfTo=new Date(now.getFullYear(),now.getMonth()+1,0); }
    else if (preset === 'year') { tfFrom=new Date(now.getFullYear(),0,1); tfTo=new Date(now.getFullYear(),11,31); }
    else if (preset === 'last_year') { tfFrom=new Date(now.getFullYear()-1,0,1); tfTo=new Date(now.getFullYear()-1,11,31); }
  }
  function timeframeLabel() {
    if (activePreset==='any') return null;
    if (activePreset==='today') return 'Today';
    if (activePreset==='week') return 'This week';
    if (activePreset==='month') return 'This month';
    if (activePreset==='year') return 'This year';
    if (activePreset==='last_year') return 'Last year';
    if (activePreset==='custom' && tfFrom && tfTo) return `${fmtDate(tfFrom)} – ${fmtDate(tfTo)}`;
    return null;
  }
  function fmtDate(d) { return d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}); }
  function updateTimeframeUI() {
    const label = timeframeLabel();
    if (label) {
      timeframeBtnLabel.textContent = label; btnTimeframe.classList.add('active');
      timeframeActivePillText.textContent = label; timeframeActiveRow.style.display = 'block';
    } else {
      timeframeBtnLabel.textContent = 'Any time'; btnTimeframe.classList.remove('active');
      timeframeActiveRow.style.display = 'none';
    }
    if (rawTokens.length) doSearch(searchInput.value);
    adjustTimelinePadding();
  }
  function openDropdown() {
    const r = document.getElementById('timeframeRow').getBoundingClientRect();
    timeframeDropdown.style.top = (r.bottom+4)+'px';
    timeframeDropdown.style.display = 'block';
    btnTimeframe.setAttribute('aria-expanded','true');
    document.querySelectorAll('.gp-tf-option').forEach(o => o.classList.toggle('selected', o.dataset.preset===activePreset));
  }
  function closeDropdown() {
    timeframeDropdown.style.display='none';
    btnTimeframe.setAttribute('aria-expanded','false');
    tfCustomPanel.style.display='none';
  }
  btnTimeframe.addEventListener('click', e => { e.stopPropagation(); timeframeDropdown.style.display==='none' ? openDropdown() : closeDropdown(); });
  document.addEventListener('click', e => {
    if (!e.target.closest('#timeframeDropdown') && !e.target.closest('#btnTimeframe')) closeDropdown();
  });
  document.querySelectorAll('.gp-tf-option').forEach(opt => {
    opt.addEventListener('click', () => {
      if (opt.dataset.preset==='custom') {
        tfCustomPanel.style.display='flex';
        document.querySelectorAll('.gp-tf-option').forEach(o => o.classList.toggle('selected',o.dataset.preset==='custom'));
        return;
      }
      applyPreset(opt.dataset.preset); closeDropdown(); updateTimeframeUI();
    });
  });
  btnApplyCustom.addEventListener('click', () => {
    if (!tfFromDate.value || !tfToDate.value) return;
    activePreset='custom'; tfFrom=new Date(tfFromDate.value); tfTo=new Date(tfToDate.value); tfTo.setHours(23,59,59,999);
    closeDropdown(); updateTimeframeUI();
  });
  btnClearTimeframe.addEventListener('click', () => { applyPreset('any'); updateTimeframeUI(); });

  // ==========================================================================
  // 13. PHOTO VIEWER — shows structured semantic dimensions
  // ==========================================================================
  function openViewer(photo) {
    viewerImg.src = photo.url;
    viewerDate.textContent = photo.dateStr;
    viewerLoc.textContent = photo.loc;

    // Build tags from primary + secondary elements only (not incidental)
    const visibleTags = [];
    const allDims = Object.values(photo.sem);
    allDims.forEach(dim => {
      if (!Array.isArray(dim)) return;
      dim.forEach(el => {
        if (el.imp !== 'incidental') visibleTags.push({ label: el.label, imp: el.imp });
      });
    });

    // Add relationship strings
    const relStr = (photo.relations || []).map(r =>
      `<div class="gp-viewer-relation">${r}</div>`).join('');

    // Episode badge
    const ep = photo.episode ? EPISODES[photo.episode] : null;
    const epBadge = ep ? `<div class="gp-viewer-episode">${ep.icon} ${ep.label} · ${ep.dateRange}</div>` : '';

    viewerTags.innerHTML = epBadge
      + visibleTags.map(t =>
        `<span class="gp-viewer-tag ${t.imp === 'primary' ? 'gp-viewer-tag-primary' : ''}">${t.label}</span>`
      ).join('')
      + (relStr ? `<div class="gp-viewer-relations">${relStr}</div>` : '');

    photoViewer.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }

  function closeViewer() {
    photoViewer.style.display = 'none';
    viewerImg.src = '';
    document.body.style.overflow = '';
  }

  btnViewerClose.addEventListener('click', closeViewer);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && photoViewer.style.display !== 'none') closeViewer();
  });

  // INIT
  buildTimeline();
});
