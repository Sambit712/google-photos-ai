/**
 * Google Photos — Semantic Photo Locator
 * Interaction: SEARCH → HIGHLIGHT → EXPLORE CONTEXT → NEXT MATCH
 *
 * Tag architecture (from semantic_memory_tag_taxonomy_antigravity.txt):
 *   Category → Subcategory → Specific Tag → Multilingual aliases
 *   e.g.  NATURE.MOUNTAIN, FOOD.BEVERAGE.COFFEE, PEOPLE.FRIENDS
 *
 * Search resolves any query word (English or 10 Indian languages) to canonical
 * concept IDs, then matches photos whose concept sets intersect.
 *
 * The timeline is NEVER filtered — matching photos are highlighted in-place.
 */

document.addEventListener('DOMContentLoaded', () => {

  // ==========================================================================
  // 1.  MULTILINGUAL ALIAS TABLE
  //     Maps every surface-form term (any language) → canonical concept ID(s)
  //     Spec: "All language variants must map to one canonical concept ID"
  // ==========================================================================
  const ALIAS_MAP = buildAliasMap();

  function buildAliasMap() {
    // alias string (lowercased) → Set of canonical concept IDs
    const m = new Map();

    function add(conceptId, ...aliases) {
      for (const a of aliases) {
        const key = a.toLowerCase().trim();
        if (!m.has(key)) m.set(key, new Set());
        m.get(key).add(conceptId);
      }
    }

    // ── 01. PLACE ──────────────────────────────────────────────────────────
    add('PLACE.HOME',
      'home','घर','বাড়ি','வீடு','ఇల్లు','घर','ઘર','ಮನೆ','വീട്','ਘਰ','ଘର');
    add('PLACE.CITY',
      'city','शहर','শহর','நகரம்','నగరం','शहर','શહેર','ನಗರ','നഗരം','ਸ਼ਹਿਰ','ସହର');
    add('PLACE.CAFE',
      'café','cafe','coffee shop','कैफे','ক্যাফে','கஃபே','కేఫ్','कॅफे','કૅફે','ಕೆಫೆ','കഫേ','ਕੈਫੇ','କାଫେ');
    add('PLACE.RESTAURANT',
      'restaurant','dining','eatery','रेस्तरां','রেস्तরাঁ','உணவகம்','రెస్టారెంట్','रेस्टॉरंट','રેસ્ટોરન્ટ','ರೆಸ್ಟಾರೆಂಟ್','റെസ്റ്റോറന്റ്','ਰੈਸਟੋਰੈਂਟ','ରେଷ୍ଟୁରାଣ୍ଟ');
    add('PLACE.HOTEL',
      'hotel','hostel','resort','होटल','হোটেল','ஹோட்டல்','హోటల్','हॉटेल','હોટેલ','ಹೋಟೆಲ್','ഹോട്ടൽ','ਹੋਟਲ','ହୋଟେଲ');
    add('PLACE.BEACH',
      'beach','coast','shore','समुद्र तट','সমুद्र সৈকত','கடற்கரை','బీచ్','किनारा','દરિયા કિનારો','ಕಡಲ ತೀರ','കടൽത്തീരം','ਬੀਚ','ସମୁଦ୍ର ତୀର');
    add('PLACE.MARKET',
      'market','bazaar','flea market','बाजार','বাজার','சந்தை','మార్కెట్','बाजार','બજાર','ಮಾರುಕಟ್ಟೆ','ചന்তை','ਬਾਜ਼ਾਰ','ବଜାର');
    add('PLACE.AIRPORT',
      'airport','terminal','हवाई अड्डा','বিমানবন্দর','விமான நிலையம்','విమానాశ్రయం','विमानतळ','એરપોર્ट','ವಿಮಾನ ನಿಲ್ದಾಣ','വിമാനത്താവളം','ਹਵਾਈ ਅੱਡਾ','ବିମାନ ବନ୍ଦର');
    add('PLACE.TEMPLE',
      'temple','mandir','मंदिर','মন্দির','கோவில்','గుడి','मंदिर','મંદિર','ದೇವಾಲಯ','ക്ഷേത്രം','ਮੰਦਰ','ମନ୍ଦିର');
    add('PLACE.CHURCH',
      'church','chapel','चर्च','চার্চ','தேவாலயம்','చర్చి','चर्च','ચર્ચ','ಚರ್ಚ್','ചര്ച്ച്','ਚਰਚ','ଚର୍ଚ');
    add('PLACE.MONUMENT',
      'monument','heritage','fort','palace','स्मारक','স্মৃতিস্তম্ভ','நினைவுச்சின்னம்','స్మారకం','किल्ला','ﻗﻠﻌه','ಸ್ಮಾರಕ','സ്മാരകം','ਸਮਾਰਕ','ସ୍ମାରକ');
    add('PLACE.GOA', 'goa','गोवा','গোয়া');

    // ── 02. NATURE & LANDSCAPE ──────────────────────────────────────────────
    add('NATURE.MOUNTAIN',
      'mountain','mountains','पहाड़','पर्वत','পাহাড়','পর্বত','மலை','పర్వతం','కొండ','डोंगर','ডুংগর','ಪರ್ವತ','ಬೆಟ್ಟ','മല','പർവതം','ਪਹਾੜ','ପାହାଡ଼','ପର୍ବତ');
    add('NATURE.MOUNTAIN.SNOW',
      'snow mountain','snowy','snow','हिमालय','बर्फीला पहाड़','তুষার পর্বত','பனி மலை','మంచు పర్వతం');
    add('NATURE.BEACH',
      'beach','sea','ocean','waves','समुद्र','সমুদ্র','கடல்','సముద్రం','সাগর','ಸಮುದ್ರ','കടൽ','ਸਮੁੰਦਰ','ସମୁଦ୍ର');
    add('NATURE.FOREST',
      'forest','jungle','woods','जंगल','वन','জঙ্গল','காடு','అడవి','जंगल','ਜੰਗਲ','ಕಾಡು','കാട്','ਵਣ','ଜଙ୍ଗଲ');
    add('NATURE.WATERFALL',
      'waterfall','falls','झरना','জলপ্রপাত','அருவி','జలపాతం','धबधबा','滝','滝','ಜಲಪಾತ','ജലപ്രപാതം','ਝਰਨਾ','ଝର ଝର');
    add('NATURE.RIVER',
      'river','stream','नदी','নদী','ஆறு','నది','नदी','ਨਦੀ','ನದಿ','നദി','ndi','ନଦୀ');
    add('NATURE.LAKE',
      'lake','pond','झील','তালাব','ஏரி','సరస్సు','तळे','ਝੀਲ','ಕೆರೆ','തടാകം','ਝੀਲ','ହ୍ରଦ');
    add('NATURE.SUNSET',
      'sunset','golden hour','সূর্যাস্ত','सूर्यास्त','மாலை நேரம்','석양','सूर्यास्त','ਸੂਰਜ ਡੁੱਬਣਾ','ಸೂರ್ಯಾಸ್ತ','അസ്തമനം');
    add('NATURE.SUNRISE',
      'sunrise','dawn','सूर्योदय','সূর্যোদয়','சூரிய உதயம்','సూర్యోదయం','ਸੂਰਜ ਚੜ੍ਹਨਾ');
    add('NATURE.SKY',
      'sky','clouds','cloudy','आकाश','আকাশ','வானம்','ఆకాశం','ਅਕਾਸ਼','ಆಕಾಶ','ആകാശം');

    // ── 03. PLACES & ENVIRONMENTS ──────────────────────────────────────────
    add('PLACE.HOME.BALCONY','balcony','बालकनी','বারান্দা','பால்கனி','బాల్కనీ','BalconyONA');
    add('PLACE.HOME.KITCHEN','kitchen','रसोई','রান্নাঘর','சமையலறை','వంటగది');
    add('PLACE.STREET','street','road','alley','सड़क','রাস্তা','தெரு','రోడ్డు','ਸੜਕ','ರಸ್ತೆ','റോഡ്');
    add('PLACE.PARK','park','garden','बगीचा','বাগান','பூங்கா','పార్కు','ਪਾਰਕ','ಉದ್ಯಾನ','പൂന്തോട്ടം');
    add('PLACE.POOL','pool','swimming pool','पूल','সুইমিং পুল','குளம்','కొలను');

    // ── 04. FOOD & DRINK ──────────────────────────────────────────────────
    add('FOOD.BEVERAGE.COFFEE',
      'coffee','espresso','cappuccino','latte','cold coffee',
      'कॉफ़ी','कॉफी','কফি','காபி','కాఫీ','कॉफी','કૉફી','ಕಾಫಿ','കാപ്പി','ਕੌਫੀ','କଫି');
    add('FOOD.BEVERAGE.TEA',
      'tea','chai','green tea','milk tea',
      'चाय','চা','தேநீர்','టీ','चहा','ਚਾਹ','ಚಹಾ','ചായ','ਚਾ','ଚା');
    add('FOOD.BEVERAGE.JUICE','juice','smoothie','jugo','रस','জুস','பழச்சாறு','జ్యూస్');
    add('FOOD.BEVERAGE.COCONUT_WATER','coconut water','nariyal pani','नारियल पानी','ডাব','இளநீர்','కొబ్బరి నీళ్ళు');
    add('FOOD.INDIAN',
      'biryani','dosa','idli','vada','samosa','pakora','chole','roti','naan','paratha',
      'curry','thali','pulao','dal','paneer','tandoori','kebab','chaat','pani puri','momos',
      'बिरयानी','दोसा','इडली','वड़ा','बिरियানি','কারি','দোসা');
    add('FOOD.INTERNATIONAL',
      'pizza','burger','pasta','sandwich','sushi','noodles','steak','tacos','fried chicken',
      'french fries','salad','soup','पिज्जा','বার্গার','பீஸ்ஸா','పిజ్జా');
    add('FOOD.DESSERT',
      'cake','ice cream','pastry','donut','brownie','chocolate','cookies','pudding',
      'gulab jamun','rasgulla','jalebi','kulfi',
      'केक','आइसक्रीम','কেক','আইসক্রিম','கேக்','కేక్','गुलाबजाम','রসগোল্লা');
    add('FOOD.DINING',
      'dining','eating','lunch','dinner','breakfast','meal','food','snack',
      'खाना','भोजन','খাবার','உணவு','భోజనం','जेवण','ਖਾਣਾ','ಆಹಾರ','ഭക്ഷണം','ଖାଦ୍ୟ');

    // ── 05. PEOPLE ────────────────────────────────────────────────────────
    add('PEOPLE.FRIENDS',
      'friends','friend','buddy','বন্ধু','दोस्त','友人','친구','மித்ரர்','నేస్తాలు',
      'doston','dost','यार','यारों','ਦੋਸਤ','ಗೆಳೆಯರು','സുഹൃത്ത്','ਦੋਸਤਾਂ','ବନ୍ଧୁ');
    add('PEOPLE.FAMILY',
      'family','relatives','घर परिवार','परिवार','পরিবার','குடும்பம்','కుటుంబం','कुटुंब',
      'ਪਰਿਵਾਰ','ಕುಟುಂಬ','കുടുംബം','ਪਰਵਾਰ','ପରିବାର');
    add('PEOPLE.COUPLE',
      'couple','partner','date','रोमांस','প্রেমিক জুটি','காதலர்','జంట');
    add('PEOPLE.SOLO',
      'solo','alone','self','एकला','alone','একা','தனியாக','ఒంటరిగా');
    add('PEOPLE.GROUP',
      'group','gang','crew','crowd','टोली','দল','குழு','గ్రూప్');
    add('PEOPLE.COLLEAGUES',
      'colleagues','office friends','coworkers','सहयोगी','সহকর্মী','sahakari');
    add('PEOPLE.CLASSMATES',
      'classmates','college friends','class','सहपाठी','সহপাঠী','classmates');

    // ── 06. ACTIVITIES ────────────────────────────────────────────────────
    add('ACTIVITY.TRAVEL',
      'travel','trip','tour','vacation','holiday','travelling','journey',
      'यात्रा','সফর','பயணம்','ప్రయాణం','प्रवास','ਯਾਤਰਾ','ಪ್ರಯಾಣ','യാത്ര','ଯାତ୍ରା');
    add('ACTIVITY.TRAVEL.BEACH_TRIP',
      'beach trip','beach holiday','समुद्र यात्रा','বিচ ট্রিপ','கடற்கரை பயணம்');
    add('ACTIVITY.TRAVEL.HIKING',
      'hiking','trekking','trek','hike','पैदल यात्रा','ट्रैकिंग','ট্রেকিং','குத்தகை','ట్రెక్కింగ்');
    add('ACTIVITY.TRAVEL.ROAD_TRIP',
      'road trip','drive','road','सड़क यात्रा','রোড ট্রিপ','ரோடு டிரிப்');
    add('ACTIVITY.TRAVEL.FLIGHT',
      'flight','flying','airplane','plane','उड़ान','বিমান','விமானம்','విమానం');
    add('ACTIVITY.SOCIAL.HANGOUT',
      'hangout','outing','chill','मौज','আড্ডা','வெளியில் சுற்றுவது','అడ్డా','adda');
    add('ACTIVITY.SOCIAL.PARTY',
      'party','celebration','পার্টি','পার্টি','पार्टी','party','விழா','పార్టీ');
    add('ACTIVITY.SOCIAL.DINING',
      'dining','dinner out','eating out','खाने पर','রেস্তোরাঁয়');
    add('ACTIVITY.SPORTS.SWIMMING',
      'swimming','swim','तैराकी','সাঁতার','நீச்சல்','ఈత');
    add('ACTIVITY.SPORTS.CYCLING',
      'cycling','cycling trip','साइकिलिंग','সাইকেলিং','சைக்கிளிங்');
    add('ACTIVITY.NIGHTLIFE',
      'nightlife','night out','club','bar','pub','नाइटलाइफ','রাতের আড্ডা','இரவு கேளிக்கை');
    add('ACTIVITY.PHOTOGRAPHY',
      'photography','photo shoot','clicking photos','shooting','फोटोग्राफी','ফটোগ্রাফি');
    add('ACTIVITY.SHOPPING',
      'shopping','mall','store','खरीदारी','শপিং','கடை','షాపింగ్');
    add('ACTIVITY.STUDYING',
      'studying','reading','notes','पढ़ाई','পড়াশোনা','படிப்பு','చదువు');

    // ── 07. EVENTS & OCCASIONS ────────────────────────────────────────────
    add('EVENT.BIRTHDAY',
      'birthday','bday','जन्मदिन','জন্মদিন','பிறந்தநாள்','పుట్టినరోజు','वाढदिवस','ਜਨਮਦਿਨ','ಹುಟ್ಟುಹಬ್ಬ','ജന്മദിനം','ଜନ୍ମଦିନ');
    add('EVENT.WEDDING',
      'wedding','marriage','শাদী','शादी','திருமணம்','పెళ్ళి','लग्न','ਵਿਆਹ','ಮದುವೆ','വിവാഹം','ବିବାହ');
    add('EVENT.GRADUATION',
      'graduation','convocation','गraduation','স্নাতক','பட்டப்படிப்பு','పట్టభద్రత','पदवीदान');
    add('EVENT.CHRISTMAS',
      'christmas','xmas','क्रिसमस','ক্রিসমাস','கிறிஸ்துமஸ்','క్రిస్మస్','क्रिसमस');
    add('EVENT.DIWALI',
      'diwali','deepavali','दिवाली','দীপাবলি','தீபாவளி','దీపావళి','दिवाळी','ਦੀਵਾਲੀ','ದೀಪಾವಳಿ','ദീപാവലി','ଦୀପାବଳି');
    add('EVENT.HOlI',
      'holi','होली','হোলি','ஹோலி','హోలీ','ਹੋਲੀ','ಹೋಳಿ','ഹോളി','ହୋଲି');
    add('EVENT.REUNION',
      'reunion','meetup','মিলনমেলা','reunion','मिलन','再会','재회');
    add('EVENT.FAREWELL','farewell','goodbye','alvida','अलविदा','বিদায়','விடைபெறுதல்','వీడ్కోలు');

    // ── 08. ANIMALS ───────────────────────────────────────────────────────
    add('ANIMAL.DOG','dog','puppy','कुत्ता','কুকুর','நாய்','కుక్క','ਕੁੱਤਾ','ನಾಯಿ','നായ','କୁକୁର');
    add('ANIMAL.CAT','cat','kitten','बिल्ली','বিড়াল','பூனை','పిల్లి','ਬਿੱਲੀ','ಬೆಕ್ಕು','പൂച്ച','ବିଲେଇ');

    // ── 09. VEHICLES ──────────────────────────────────────────────────────
    add('VEHICLE.CAR','car','automobile','गाड़ी','গাড়ি','கார்','కారు','ਕਾਰ','ಕಾರು','കാർ','କାର');
    add('VEHICLE.TRAIN','train','rail','ट्रेन','ট্রেন','ரயில்','రైలు','ਰੇਲ','ರೈಲು','ട്രെയിൻ','ଟ୍ରେନ');
    add('VEHICLE.BOAT','boat','ship','ferry','नाव','নৌকা','படகு','పడవ','ਕਿਸ਼ਤੀ','ದೋಣಿ','ബോട്ട്','ଡଙ୍ଗା');

    // ── 13. TIME OF DAY ───────────────────────────────────────────────────
    add('TIME.MORNING',
      'morning','सुबह','সকাল','காலை','ఉదయం','सकाळ','ਸਵੇਰੇ','ಬೆಳಿಗ್ಗೆ','രാവിലെ','ସକାଳ');
    add('TIME.AFTERNOON',
      'afternoon','दोपहर','বিকেল','மதியம்','మధ్యాహ్నం','दुपार','ਦੁਪਹਿਰ','ಮಧ್ಯಾಹ್ನ','ഉച്ചനേരം','ଦୁପ୍ରହର');
    add('TIME.EVENING',
      'evening','शाम','বিকাল','மாலை','సాయంత్రం','संध्याकाळ','ਸ਼ਾਮ','ಸಂಜೆ','വൈകുന്നേരം','ସନ୍ଧ୍ୟା');
    add('TIME.NIGHT',
      'night','रात','রাত','இரவு','రాత్రి','रात्र','ਰਾਤ','ರಾತ್ರಿ','രാത്രി','ରାତ');
    add('TIME.DAWN','dawn','sunrise time','तड़का','ভোর','விடியற்காலை');
    add('TIME.GOLDEN_HOUR','golden hour','magic hour','सुनहरी रोशनी');

    // ── 14. WEATHER ───────────────────────────────────────────────────────
    add('WEATHER.SUNNY','sunny','sunshine','धूप','রোদ','வெயில்','ఎండ','ਧੁੱਪ','ಬಿಸಿಲು','വെയിൽ');
    add('WEATHER.RAINY','rain','rainy','बारिश','বৃষ্টি','மழை','వర్షం','पाऊस','ਬਾਰਿਸ਼','ಮಳೆ','മഴ','ବର୍ଷା');
    add('WEATHER.FOGGY','fog','foggy','mist','misty','霧','धुंध','কুয়াশা','மூடுபனி','పొగమంచు');
    add('WEATHER.CLOUDY','cloudy','overcast','clouds','बादल','মেঘ','மேகம்','మేఘాలు','ਬੱਦਲ');

    // ── 15. PHOTO TYPE ────────────────────────────────────────────────────
    add('PHOTOTYPE.SELFIE','selfie','सेल्फी','সেলফি','செல்ஃபி','సెల్ఫీ','ਸੈਲਫੀ','ಸೆಲ್ಫಿ','സെൽഫി');
    add('PHOTOTYPE.GROUP_PHOTO','group photo','group pic','समूह फोटो','গ্রুপ ফটো','குழு புகைப்படம்');
    add('PHOTOTYPE.PORTRAIT','portrait','close-up','पोर्ट्रेट','পোর্ট্রেট');

    // ── 16. MEMORY / CONTEXT ─────────────────────────────────────────────
    add('MEMORY.GOA_TRIP','goa trip','goa vacation','गोवा यात्रा','গোয়া ট্রিপ','கோவா பயணம்','గోవా ట్రిప్');
    add('MEMORY.COLLEGE_LIFE','college','college life','கல்லூரி','కాలేజీ','collège','कॉलेज','কলেজ');
    add('MEMORY.DAILY_LIFE','daily life','routine','everyday','दैनिक जीवन','দৈনন্দিন জীবন','அன்றாட வாழ்க்கை');
    add('MEMORY.FAMILY_GATHERING','family gathering','family get together','पारिवारिक मिलन','পরিবার মেলা');

    return m;
  }

  // ==========================================================================
  // 2.  QUERY → CANONICAL CONCEPTS RESOLVER
  //     Takes raw user text (any language) → Set of canonical IDs to match
  // ==========================================================================
  function resolveQuery(rawText) {
    const tokens = rawText.toLowerCase().trim().split(/[\s,+]+/).filter(Boolean);
    const concepts = new Set();

    tokens.forEach(token => {
      // exact match
      if (ALIAS_MAP.has(token)) {
        ALIAS_MAP.get(token).forEach(c => concepts.add(c));
        return;
      }
      // partial: if token is a substring of any alias key or vice-versa
      for (const [alias, cids] of ALIAS_MAP.entries()) {
        if (alias.includes(token) || token.includes(alias)) {
          cids.forEach(c => concepts.add(c));
        }
      }
    });

    // If nothing resolved, fall back to fuzzy raw-token search (original behaviour)
    return { concepts, rawTokens: tokens };
  }

  // ==========================================================================
  // 3.  PHOTO DATABASE — hierarchical canonical concept tags
  //     Each photo carries concept IDs from the taxonomy, not flat keywords.
  //     Multilingual queries resolve to these same concept IDs.
  // ==========================================================================
  const PHOTO_DB = [
    // ── Nov 14, 2023 — Bangalore (before the Goa trip) ────────────────────
    { id: 'p001', date: '2023-11-14', dateStr: 'Nov 14, 2023', loc: 'Bangalore',
      url: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=400&q=80',
      concepts: ['PLACE.HOME','FOOD.BEVERAGE.COFFEE','TIME.MORNING','PEOPLE.FAMILY'],
      displayTags: ['home','coffee','morning','family'] },
    { id: 'p002', date: '2023-11-14', dateStr: 'Nov 14, 2023', loc: 'Bangalore',
      url: 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=400&q=80',
      concepts: ['PLACE.HOME','PLACE.HOME.BALCONY','TIME.MORNING','PEOPLE.FAMILY'],
      displayTags: ['home','balcony','morning','family'] },
    { id: 'p003', date: '2023-11-14', dateStr: 'Nov 14, 2023', loc: 'Bangalore',
      url: 'https://images.unsplash.com/photo-1543362906-acfc16c67564?auto=format&fit=crop&w=400&q=80',
      concepts: ['PLACE.STREET','PLACE.CITY','TIME.EVENING'],
      displayTags: ['street','city','evening'] },
    { id: 'p004', date: '2023-11-14', dateStr: 'Nov 14, 2023', loc: 'Bangalore',
      url: 'https://images.unsplash.com/photo-1533900298318-6b8da08a523e?auto=format&fit=crop&w=400&q=80',
      concepts: ['PLACE.MARKET','TIME.AFTERNOON'],
      displayTags: ['market','afternoon'] },
    { id: 'p005', date: '2023-11-14', dateStr: 'Nov 14, 2023', loc: 'Bangalore',
      url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=400&q=80',
      concepts: ['FOOD.BEVERAGE.COFFEE','PLACE.CAFE','PEOPLE.FRIENDS','TIME.AFTERNOON'],
      displayTags: ['coffee','café','friends','afternoon'] },
    { id: 'p006', date: '2023-11-14', dateStr: 'Nov 14, 2023', loc: 'Bangalore',
      url: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=400&q=80',
      concepts: ['PLACE.CAFE','PEOPLE.FRIENDS','FOOD.DESSERT','TIME.EVENING'],
      displayTags: ['café','friends','pastry','evening'] },

    // ── Nov 15, 2023 — Travel to Goa ────────────────────────────────────
    { id: 'p007', date: '2023-11-15', dateStr: 'Nov 15, 2023', loc: 'Bangalore Airport',
      url: 'https://images.unsplash.com/photo-1529074963764-98f45c47344b?auto=format&fit=crop&w=400&q=80',
      concepts: ['PLACE.AIRPORT','ACTIVITY.TRAVEL','ACTIVITY.TRAVEL.FLIGHT','TIME.MORNING','PLACE.GOA'],
      displayTags: ['airport','travel','flight','morning'] },
    { id: 'p008', date: '2023-11-15', dateStr: 'Nov 15, 2023', loc: 'In Flight',
      url: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=400&q=80',
      concepts: ['ACTIVITY.TRAVEL','ACTIVITY.TRAVEL.FLIGHT','TIME.MORNING','PLACE.GOA'],
      displayTags: ['travel','flight','in-flight','morning'] },
    { id: 'p009', date: '2023-11-15', dateStr: 'Nov 15, 2023', loc: 'Panaji, Goa',
      url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=400&q=80',
      concepts: ['PLACE.GOA','PLACE.HOTEL','TIME.AFTERNOON','ACTIVITY.TRAVEL','PEOPLE.FRIENDS'],
      displayTags: ['goa','villa','friends','afternoon'] },
    { id: 'p010', date: '2023-11-15', dateStr: 'Nov 15, 2023', loc: 'Panaji, Goa',
      url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=400&q=80',
      concepts: ['PLACE.GOA','PLACE.HOTEL','PLACE.POOL','TIME.AFTERNOON','PEOPLE.FRIENDS'],
      displayTags: ['goa','hotel','pool','afternoon','friends'] },
    { id: 'p011', date: '2023-11-15', dateStr: 'Nov 15, 2023', loc: 'Baga Beach, Goa',
      url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80',
      concepts: ['PLACE.GOA','PLACE.BEACH','NATURE.BEACH','NATURE.SUNSET','TIME.EVENING','PEOPLE.FRIENDS'],
      displayTags: ['goa','beach','sunset','friends','evening'] },
    { id: 'p012', date: '2023-11-15', dateStr: 'Nov 15, 2023', loc: 'Baga Beach, Goa',
      url: 'https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=400&q=80',
      concepts: ['PLACE.GOA','PLACE.BEACH','NATURE.BEACH','TIME.EVENING','PEOPLE.FRIENDS'],
      displayTags: ['goa','beach','waves','evening','friends'] },

    // ── Nov 16, 2023 — Goa Day 1 (Anjuna Flea Market + Café evening) ───────
    { id: 'p013', date: '2023-11-16', dateStr: 'Nov 16, 2023', loc: 'Anjuna, Goa',
      url: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&w=400&q=80',
      concepts: ['PLACE.GOA','PLACE.BEACH','NATURE.BEACH','TIME.MORNING','TIME.GOLDEN_HOUR'],
      displayTags: ['goa','beach','morning','golden hour'] },
    { id: 'p014', date: '2023-11-16', dateStr: 'Nov 16, 2023', loc: 'Anjuna, Goa',
      url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=400&q=80',
      concepts: ['PLACE.GOA','PLACE.MARKET','TIME.MORNING','PEOPLE.FRIENDS','ACTIVITY.SHOPPING'],
      displayTags: ['goa','market','crafts','morning','friends'] },
    { id: 'p015', date: '2023-11-16', dateStr: 'Nov 16, 2023', loc: 'Anjuna, Goa',
      url: 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=400&q=80',
      concepts: ['PLACE.GOA','PLACE.MARKET','TIME.AFTERNOON','ACTIVITY.SHOPPING'],
      displayTags: ['goa','flea market','shopping','afternoon'] },
    { id: 'p016', date: '2023-11-16', dateStr: 'Nov 16, 2023', loc: 'Café Lilliput, Anjuna',
      url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=400&q=80',
      concepts: ['PLACE.GOA','PLACE.CAFE','PEOPLE.FRIENDS','TIME.EVENING','FOOD.DINING'],
      displayTags: ['goa','café','friends','evening','dinner'] },
    { id: 'p017', date: '2023-11-16', dateStr: 'Nov 16, 2023', loc: 'Café Lilliput, Anjuna',
      url: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=400&q=80',
      concepts: ['PLACE.GOA','PLACE.CAFE','FOOD.BEVERAGE.COFFEE','TIME.EVENING','PEOPLE.FRIENDS'],
      displayTags: ['goa','café','coffee','evening','friends'] },
    { id: 'p018', date: '2023-11-16', dateStr: 'Nov 16, 2023', loc: 'Curlies, Anjuna',
      url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=400&q=80',
      concepts: ['PLACE.GOA','ACTIVITY.NIGHTLIFE','TIME.NIGHT','PEOPLE.FRIENDS','PLACE.BEACH'],
      displayTags: ['goa','nightlife','music','beach','friends','night'] },

    // ── Nov 17, 2023 — Goa Day 2 (Heritage + Café evening) ──────────────
    { id: 'p019', date: '2023-11-17', dateStr: 'Nov 17, 2023', loc: 'Old Goa',
      url: 'https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=400&q=80',
      concepts: ['PLACE.GOA','PLACE.CHURCH','PLACE.MONUMENT','TIME.MORNING','ACTIVITY.TRAVEL'],
      displayTags: ['goa','heritage','church','morning'] },
    { id: 'p020', date: '2023-11-17', dateStr: 'Nov 17, 2023', loc: 'Old Goa',
      url: 'https://images.unsplash.com/photo-1519817650390-64a93db51149?auto=format&fit=crop&w=400&q=80',
      concepts: ['PLACE.GOA','PLACE.MONUMENT','TIME.MORNING','ACTIVITY.TRAVEL'],
      displayTags: ['goa','architecture','history','morning'] },
    { id: 'p021', date: '2023-11-17', dateStr: 'Nov 17, 2023', loc: 'Fontainhas, Panaji',
      url: 'https://images.unsplash.com/photo-1559925393-8be0ec4767c8?auto=format&fit=crop&w=400&q=80',
      concepts: ['PLACE.GOA','PLACE.CAFE','FOOD.DINING','PEOPLE.FRIENDS','TIME.AFTERNOON'],
      displayTags: ['goa','café','brunch','friends','afternoon'] },
    { id: 'p022', date: '2023-11-17', dateStr: 'Nov 17, 2023', loc: 'Fontainhas, Panaji',
      url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=400&q=80',
      concepts: ['PLACE.GOA','PLACE.STREET','PEOPLE.FRIENDS','TIME.AFTERNOON','ACTIVITY.TRAVEL'],
      displayTags: ['goa','walking','street','afternoon','friends'] },
    { id: 'p023', date: '2023-11-17', dateStr: 'Nov 17, 2023', loc: 'Calangute Beach, Goa',
      url: 'https://images.unsplash.com/photo-1542397284385-6010376c5337?auto=format&fit=crop&w=400&q=80',
      concepts: ['PLACE.GOA','PLACE.BEACH','NATURE.BEACH','NATURE.SUNSET','TIME.EVENING','PEOPLE.FRIENDS'],
      displayTags: ['goa','beach','sunset','evening','friends'] },
    { id: 'p024', date: '2023-11-17', dateStr: 'Nov 17, 2023', loc: 'Calangute Beach, Goa',
      url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=401&q=80',
      concepts: ['PLACE.GOA','NATURE.BEACH','NATURE.SUNSET','TIME.EVENING'],
      displayTags: ['goa','beach','sunset','water'] },
    { id: 'p025', date: '2023-11-17', dateStr: 'Nov 17, 2023', loc: 'Beach Shack, Calangute',
      url: 'https://images.unsplash.com/photo-1543007630-9710e4a00a20?auto=format&fit=crop&w=400&q=80',
      concepts: ['PLACE.GOA','PLACE.CAFE','PLACE.BEACH','FOOD.DINING','PEOPLE.FRIENDS','TIME.EVENING'],
      displayTags: ['goa','beach café','dinner','friends','evening'] },
    { id: 'p026', date: '2023-11-17', dateStr: 'Nov 17, 2023', loc: 'Beach Shack, Calangute',
      url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=401&q=80',
      concepts: ['PLACE.GOA','PLACE.CAFE','TIME.NIGHT','PEOPLE.FRIENDS','FOOD.INDIAN'],
      displayTags: ['goa','café','night','friends','food'] },

    // ── Nov 18, 2023 — Goa Day 3 + Departure ───────────────────────────
    { id: 'p027', date: '2023-11-18', dateStr: 'Nov 18, 2023', loc: 'Anjuna Beach, Goa',
      url: 'https://images.unsplash.com/photo-1562259929-b4e1fd3aef09?auto=format&fit=crop&w=400&q=80',
      concepts: ['PLACE.GOA','PLACE.BEACH','NATURE.BEACH','TIME.MORNING','ACTIVITY.TRAVEL.BEACH_TRIP'],
      displayTags: ['goa','beach','last day','morning'] },
    { id: 'p028', date: '2023-11-18', dateStr: 'Nov 18, 2023', loc: 'Anjuna Beach, Goa',
      url: 'https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=401&q=80',
      concepts: ['PLACE.GOA','PLACE.BEACH','ACTIVITY.SPORTS.SWIMMING','TIME.MORNING','PEOPLE.FRIENDS'],
      displayTags: ['goa','beach','swimming','morning','friends'] },
    { id: 'p029', date: '2023-11-18', dateStr: 'Nov 18, 2023', loc: 'Goa Airport',
      url: 'https://images.unsplash.com/photo-1529074963764-98f45c47344b?auto=format&fit=crop&w=401&q=80',
      concepts: ['PLACE.AIRPORT','PLACE.GOA','ACTIVITY.TRAVEL','ACTIVITY.TRAVEL.FLIGHT','TIME.AFTERNOON'],
      displayTags: ['goa','airport','departure','afternoon'] },
    { id: 'p030', date: '2023-11-18', dateStr: 'Nov 18, 2023', loc: 'Back Home, Bangalore',
      url: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=401&q=80',
      concepts: ['PLACE.HOME','FOOD.BEVERAGE.COFFEE','TIME.EVENING','PEOPLE.FAMILY'],
      displayTags: ['home','coffee','evening','family'] },

    // ── Dec 4, 2023 — Bangalore hangout ────────────────────────────────
    { id: 'p031', date: '2023-12-04', dateStr: 'Dec 4, 2023', loc: 'Bangalore',
      url: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=400&q=80',
      concepts: ['PLACE.CITY','TIME.EVENING','PEOPLE.FRIENDS','ACTIVITY.SOCIAL.HANGOUT'],
      displayTags: ['city','evening','friends','hangout'] },
    { id: 'p032', date: '2023-12-04', dateStr: 'Dec 4, 2023', loc: 'Bangalore',
      url: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=401&q=80',
      concepts: ['PLACE.CAFE','PEOPLE.FRIENDS','TIME.AFTERNOON','ACTIVITY.SOCIAL.HANGOUT'],
      displayTags: ['café','friends','afternoon','hangout'] },
    { id: 'p033', date: '2023-12-04', dateStr: 'Dec 4, 2023', loc: 'Bangalore',
      url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=401&q=80',
      concepts: ['PLACE.CAFE','FOOD.BEVERAGE.COFFEE','TIME.EVENING','PEOPLE.SOLO'],
      displayTags: ['café','coffee','evening','alone'] },

    // ── Dec 25, 2023 — Christmas ────────────────────────────────────────
    { id: 'p034', date: '2023-12-25', dateStr: 'Dec 25, 2023', loc: 'Bangalore',
      url: 'https://images.unsplash.com/photo-1449495169669-7b118f960251?auto=format&fit=crop&w=400&q=80',
      concepts: ['EVENT.CHRISTMAS','PEOPLE.FAMILY','ACTIVITY.SOCIAL.PARTY','TIME.EVENING'],
      displayTags: ['christmas','family','celebration','evening'] },
    { id: 'p035', date: '2023-12-25', dateStr: 'Dec 25, 2023', loc: 'Bangalore',
      url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=400&q=80',
      concepts: ['EVENT.CHRISTMAS','FOOD.DINING','PEOPLE.FAMILY','TIME.NIGHT'],
      displayTags: ['christmas','dinner','family','night'] },
    { id: 'p036', date: '2023-12-25', dateStr: 'Dec 25, 2023', loc: 'Bangalore',
      url: 'https://images.unsplash.com/photo-1418985991508-e47386d96a71?auto=format&fit=crop&w=400&q=80',
      concepts: ['EVENT.CHRISTMAS','ACTIVITY.SOCIAL.PARTY','PEOPLE.FRIENDS','TIME.NIGHT'],
      displayTags: ['christmas','party','friends','night'] },
  ];

  // ==========================================================================
  // 4.  DOM REFS
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

  // Timeframe DOM refs
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
  // 5.  STATE
  // ==========================================================================
  let activeQuery     = '';
  let rawTokens       = [];
  let activeConcepts  = new Set();  // resolved canonical IDs from query
  let matchIds        = [];
  let currentMatchIdx = 0;

  // Timeframe state
  let activePreset = 'any';
  let tfFrom = null;
  let tfTo   = null;

  // ==========================================================================
  // 6.  BUILD CHRONOLOGICAL TIMELINE (rendered once, never removed)
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
        // Store BOTH concepts (for semantic matching) and display tags
        cell.dataset.concepts = photo.concepts.join(',');
        cell.dataset.displayTags = photo.displayTags.join(',');

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
  // 7.  CORE SEARCH LOGIC
  //     Resolves query → canonical concepts → matches photos in-place
  // ==========================================================================
  function doSearch(rawQuery) {
    activeQuery = rawQuery.trim();
    if (!activeQuery) { clearSearch(); return; }

    const resolved = resolveQuery(activeQuery);
    activeConcepts = resolved.concepts;
    rawTokens      = resolved.rawTokens;

    matchIds = [];
    document.querySelectorAll('.gp-photo-cell').forEach(cell => {
      const photoConcepts = (cell.dataset.concepts || '').split(',');
      const photoDate     = new Date(cell.dataset.date);

      // Semantic concept match: ANY query concept found in photo's concepts
      let isConceptMatch = false;
      if (activeConcepts.size > 0) {
        isConceptMatch = [...activeConcepts].some(qc =>
          photoConcepts.some(pc => pc === qc || pc.startsWith(qc + '.') || qc.startsWith(pc + '.'))
        );
      }

      // Fallback raw-token match (handles edge-case terms not in alias table)
      const rawTagText = (cell.dataset.concepts + ',' + (cell.dataset.displayTags || '')).toLowerCase();
      const isRawMatch = rawTokens.some(tok => rawTagText.includes(tok));

      const isSemanticMatch = isConceptMatch || (!activeConcepts.size && isRawMatch);
      const isDateMatch = isInTimeframe(photoDate);

      cell.classList.remove('is-match', 'is-current-match');
      if (isSemanticMatch && isDateMatch) {
        matchIds.push(cell.dataset.id);
        cell.classList.add('is-match');
      }
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
      chip.querySelector('.gp-search-tag-remove').addEventListener('click', () => removeTerm(term));
      searchTagsList.appendChild(chip);
    });
    searchTagsRow.style.display = rawTokens.length ? 'flex' : 'none';
    adjustTimelinePadding();
  }

  function removeTerm(termToRemove) {
    const newQuery = rawTokens.filter(t => t !== termToRemove).join(' ');
    searchInput.value = newQuery;
    if (newQuery) doSearch(newQuery);
    else clearSearch();
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
      c.classList.remove('is-match', 'is-current-match'));
    adjustTimelinePadding();
  }

  // ==========================================================================
  // 8.  SEARCH INPUT EVENTS
  // ==========================================================================
  searchInput.addEventListener('focus', () => {
    if (!searchInput.value.trim()) suggestionsOverlay.style.display = 'block';
  });
  searchInput.addEventListener('input', () => {
    const val = searchInput.value;
    btnClearSearch.style.display = val ? 'flex' : 'none';
    if (!val.trim()) { suggestionsOverlay.style.display = 'block'; clearSearch(); }
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
      const q = chip.dataset.query;
      searchInput.value = q;
      btnClearSearch.style.display = 'flex';
      suggestionsOverlay.style.display = 'none';
      searchInput.blur();
      doSearch(q);
    });
  });

  // ==========================================================================
  // 9.  NEXT / PREVIOUS NAVIGATION (spec §9–§11)
  // ==========================================================================
  btnNextMatch.addEventListener('click', () => {
    if (currentMatchIdx < matchIds.length - 1) {
      currentMatchIdx++;
      highlightCurrentMatch(); scrollToCurrentMatch(); updateNavigator();
    }
  });
  btnPrevMatch.addEventListener('click', () => {
    if (currentMatchIdx > 0) {
      currentMatchIdx--;
      highlightCurrentMatch(); scrollToCurrentMatch(); updateNavigator();
    }
  });
  btnGoHome.addEventListener('click', () => {
    clearSearch(); window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // ==========================================================================
  // 10.  TIME FRAME FILTER
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
    if (preset === 'today') {
      tfFrom = today; tfTo = new Date(today.getTime() + 86399999);
    } else if (preset === 'week') {
      const dow = today.getDay();
      tfFrom = new Date(today); tfFrom.setDate(today.getDate() - dow);
      tfTo   = new Date(today); tfTo.setDate(today.getDate() + (6 - dow));
    } else if (preset === 'month') {
      tfFrom = new Date(now.getFullYear(), now.getMonth(), 1);
      tfTo   = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (preset === 'year') {
      tfFrom = new Date(now.getFullYear(), 0, 1);
      tfTo   = new Date(now.getFullYear(), 11, 31);
    } else if (preset === 'last_year') {
      tfFrom = new Date(now.getFullYear() - 1, 0, 1);
      tfTo   = new Date(now.getFullYear() - 1, 11, 31);
    }
  }

  function timeframeLabel() {
    if (activePreset === 'any')       return null;
    if (activePreset === 'today')     return 'Today';
    if (activePreset === 'week')      return 'This week';
    if (activePreset === 'month')     return 'This month';
    if (activePreset === 'year')      return 'This year';
    if (activePreset === 'last_year') return 'Last year';
    if (activePreset === 'custom' && tfFrom && tfTo)
      return `${fmtDate(tfFrom)} – ${fmtDate(tfTo)}`;
    return null;
  }

  function fmtDate(d) {
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function updateTimeframeUI() {
    const label = timeframeLabel();
    if (label) {
      timeframeBtnLabel.textContent = label;
      btnTimeframe.classList.add('active');
      timeframeActivePillText.textContent = label;
      timeframeActiveRow.style.display = 'block';
    } else {
      timeframeBtnLabel.textContent = 'Any time';
      btnTimeframe.classList.remove('active');
      timeframeActiveRow.style.display = 'none';
    }
    if (rawTokens.length) doSearch(searchInput.value);
    adjustTimelinePadding();
  }

  function openDropdown() {
    const rowRect = document.getElementById('timeframeRow').getBoundingClientRect();
    timeframeDropdown.style.top = (rowRect.bottom + 4) + 'px';
    timeframeDropdown.style.display = 'block';
    btnTimeframe.setAttribute('aria-expanded', 'true');
    document.querySelectorAll('.gp-tf-option').forEach(opt =>
      opt.classList.toggle('selected', opt.dataset.preset === activePreset));
  }

  function closeDropdown() {
    timeframeDropdown.style.display = 'none';
    btnTimeframe.setAttribute('aria-expanded', 'false');
    tfCustomPanel.style.display = 'none';
  }

  btnTimeframe.addEventListener('click', e => {
    e.stopPropagation();
    timeframeDropdown.style.display === 'none' ? openDropdown() : closeDropdown();
  });

  document.addEventListener('click', e => {
    if (!e.target.closest('#timeframeDropdown') && !e.target.closest('#btnTimeframe'))
      closeDropdown();
  });

  document.querySelectorAll('.gp-tf-option').forEach(opt => {
    opt.addEventListener('click', () => {
      const preset = opt.dataset.preset;
      if (preset === 'custom') {
        tfCustomPanel.style.display = 'flex';
        document.querySelectorAll('.gp-tf-option').forEach(o =>
          o.classList.toggle('selected', o.dataset.preset === 'custom'));
        return;
      }
      applyPreset(preset); closeDropdown(); updateTimeframeUI();
    });
  });

  btnApplyCustom.addEventListener('click', () => {
    const fromVal = tfFromDate.value, toVal = tfToDate.value;
    if (!fromVal || !toVal) return;
    activePreset = 'custom';
    tfFrom = new Date(fromVal);
    tfTo   = new Date(toVal); tfTo.setHours(23, 59, 59, 999);
    closeDropdown(); updateTimeframeUI();
  });

  btnClearTimeframe.addEventListener('click', () => { applyPreset('any'); updateTimeframeUI(); });

  // ==========================================================================
  // 11.  FULLSCREEN PHOTO VIEWER
  // ==========================================================================
  function openViewer(photo) {
    viewerImg.src = photo.url;
    viewerDate.textContent = photo.dateStr;
    viewerLoc.textContent = photo.loc;
    viewerTags.innerHTML = photo.displayTags
      .map(t => `<span class="gp-viewer-tag">${t}</span>`).join('');
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

  // ==========================================================================
  // INIT
  // ==========================================================================
  buildTimeline();
});
