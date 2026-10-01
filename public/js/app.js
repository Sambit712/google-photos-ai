/**
 * Google Photos — Semantic Photo Locator
 *
 * Search model:
 *   Exact concept match → score 1.0
 *   User searched PARENT, photo has CHILD  → score 0.75  (broad → specific)
 *   User searched CHILD,  photo has PARENT → score 0.40  (specific → broad)
 *   Grandparent match                      → score 0.50
 *   Incidental elements                    → score 0    (never surfaces)
 *
 * Time tags are AUTO-DERIVED from the photo's captureTime field:
 *   - Time of day  (Dawn / Morning / Afternoon / Evening / Night …)
 *   - Weekday / Weekend
 *   - Season (Indian calendar)
 *   - Year, Month
 * The user's date-range filter is completely separate from these semantic tags.
 *
 * No episode / cross-photo memory inference — only direct photo semantics
 * plus the hierarchy relationships above.
 */

document.addEventListener('DOMContentLoaded', () => {

  // ==========================================================================
  // 1. CONCEPT HIERARCHY TREE
  //    Defines parent ↔ child relationships for directional relevance scoring.
  //    Searching "NATURE.WATER" surfaces NATURE.BEACH at 0.75 strength.
  //    Searching "NATURE.BEACH" surfaces NATURE.WATER at only 0.40 strength.
  // ==========================================================================
  const HIERARCHY = {
    // ── NATURE ──────────────────────────────────────────────────────────────
    'NATURE': { children:['NATURE.TERRAIN','NATURE.WATER','NATURE.SKY','NATURE.PLANTS'] },
    'NATURE.TERRAIN': {
      parent:'NATURE',
      children:['NATURE.MOUNTAIN','NATURE.HILL','NATURE.VALLEY','NATURE.CLIFF','NATURE.DESERT','NATURE.CAVE']
    },
    'NATURE.MOUNTAIN': { parent:'NATURE.TERRAIN', children:['NATURE.MOUNTAIN.SNOW'] },
    'NATURE.MOUNTAIN.SNOW': { parent:'NATURE.MOUNTAIN' },
    'NATURE.HILL':   { parent:'NATURE.TERRAIN' },
    'NATURE.VALLEY': { parent:'NATURE.TERRAIN' },
    'NATURE.CLIFF':  { parent:'NATURE.TERRAIN' },
    'NATURE.DESERT': { parent:'NATURE.TERRAIN' },
    'NATURE.CAVE':   { parent:'NATURE.TERRAIN' },
    'NATURE.WATER': {
      parent:'NATURE',
      children:['NATURE.BEACH','NATURE.RIVER','NATURE.LAKE','NATURE.WATERFALL','NATURE.OCEAN']
    },
    'NATURE.BEACH':     { parent:'NATURE.WATER' },
    'NATURE.RIVER':     { parent:'NATURE.WATER' },
    'NATURE.LAKE':      { parent:'NATURE.WATER' },
    'NATURE.WATERFALL': { parent:'NATURE.WATER' },
    'NATURE.OCEAN':     { parent:'NATURE.WATER' },
    'NATURE.SKY': {
      parent:'NATURE',
      children:['NATURE.SKY.SUNSET','NATURE.SKY.SUNRISE','NATURE.SKY.GOLDEN_HOUR','NATURE.SKY.CLOUDY']
    },
    'NATURE.SKY.SUNSET':     { parent:'NATURE.SKY' },
    'NATURE.SKY.SUNRISE':    { parent:'NATURE.SKY' },
    'NATURE.SKY.GOLDEN_HOUR':{ parent:'NATURE.SKY' },
    'NATURE.SKY.CLOUDY':     { parent:'NATURE.SKY' },
    // Keep legacy aliases pointing here
    'NATURE.SUNSET':     { parent:'NATURE.SKY' },
    'NATURE.SUNRISE':    { parent:'NATURE.SKY' },
    'NATURE.GOLDEN_HOUR':{ parent:'NATURE.SKY' },
    'NATURE.PLANTS': {
      parent:'NATURE',
      children:['NATURE.PLANTS.TREES','NATURE.PLANTS.FLOWERS','NATURE.PLANTS.GRASS','NATURE.PLANTS.BUSHES']
    },
    'NATURE.PLANTS.TREES':   { parent:'NATURE.PLANTS' },
    'NATURE.PLANTS.FLOWERS': { parent:'NATURE.PLANTS' },
    'NATURE.PLANTS.GRASS':   { parent:'NATURE.PLANTS' },
    'NATURE.PLANTS.BUSHES':  { parent:'NATURE.PLANTS' },

    // ── PLACE ───────────────────────────────────────────────────────────────
    'PLACE': {
      children:['PLACE.HOME','PLACE.CITY','PLACE.CAFE','PLACE.RESTAURANT',
                'PLACE.HOTEL','PLACE.BEACH','PLACE.MARKET','PLACE.AIRPORT',
                'PLACE.MONUMENT','PLACE.CHURCH','PLACE.POOL','PLACE.PARK',
                'PLACE.STREET','PLACE.GOA']
    },
    'PLACE.HOME':     { parent:'PLACE', children:['PLACE.HOME.BALCONY','PLACE.HOME.KITCHEN'] },
    'PLACE.HOME.BALCONY': { parent:'PLACE.HOME' },
    'PLACE.HOME.KITCHEN': { parent:'PLACE.HOME' },
    'PLACE.CITY':     { parent:'PLACE', children:['PLACE.STREET'] },
    'PLACE.STREET':   { parent:'PLACE.CITY' },
    'PLACE.CAFE':     { parent:'PLACE' },
    'PLACE.RESTAURANT':{ parent:'PLACE' },
    'PLACE.HOTEL':    { parent:'PLACE' },
    'PLACE.BEACH':    { parent:'PLACE' },
    'PLACE.MARKET':   { parent:'PLACE' },
    'PLACE.AIRPORT':  { parent:'PLACE' },
    'PLACE.MONUMENT': { parent:'PLACE' },
    'PLACE.CHURCH':   { parent:'PLACE' },
    'PLACE.POOL':     { parent:'PLACE' },
    'PLACE.PARK':     { parent:'PLACE' },
    'PLACE.GOA':      { parent:'PLACE' },

    // ── FOOD & DRINK ─────────────────────────────────────────────────────────
    'FOOD': {
      children:['FOOD.BEVERAGE','FOOD.DINING','FOOD.DESSERT','FOOD.INDIAN','FOOD.INTERNATIONAL']
    },
    'FOOD.BEVERAGE': {
      parent:'FOOD',
      children:['FOOD.BEVERAGE.COFFEE','FOOD.BEVERAGE.TEA','FOOD.BEVERAGE.JUICE','FOOD.BEVERAGE.COCONUT_WATER']
    },
    'FOOD.BEVERAGE.COFFEE':       { parent:'FOOD.BEVERAGE' },
    'FOOD.BEVERAGE.TEA':          { parent:'FOOD.BEVERAGE' },
    'FOOD.BEVERAGE.JUICE':        { parent:'FOOD.BEVERAGE' },
    'FOOD.BEVERAGE.COCONUT_WATER':{ parent:'FOOD.BEVERAGE' },
    'FOOD.DINING':         { parent:'FOOD' },
    'FOOD.DESSERT':        { parent:'FOOD' },
    'FOOD.INDIAN':         { parent:'FOOD' },
    'FOOD.INTERNATIONAL':  { parent:'FOOD' },

    // ── PEOPLE ───────────────────────────────────────────────────────────────
    'PEOPLE': {
      children:['PEOPLE.FRIENDS','PEOPLE.FAMILY','PEOPLE.COUPLE',
                'PEOPLE.SOLO','PEOPLE.GROUP','PEOPLE.COLLEAGUES','PEOPLE.CLASSMATES']
    },
    'PEOPLE.FRIENDS':    { parent:'PEOPLE' },
    'PEOPLE.FAMILY':     { parent:'PEOPLE' },
    'PEOPLE.COUPLE':     { parent:'PEOPLE' },
    'PEOPLE.SOLO':       { parent:'PEOPLE' },
    'PEOPLE.GROUP':      { parent:'PEOPLE' },
    'PEOPLE.COLLEAGUES': { parent:'PEOPLE' },
    'PEOPLE.CLASSMATES': { parent:'PEOPLE' },

    // ── ACTIVITY ─────────────────────────────────────────────────────────────
    'ACTIVITY': {
      children:['ACTIVITY.TRAVEL','ACTIVITY.SOCIAL','ACTIVITY.SPORTS',
                'ACTIVITY.NIGHTLIFE','ACTIVITY.SHOPPING','ACTIVITY.PHOTOGRAPHY']
    },
    'ACTIVITY.TRAVEL': {
      parent:'ACTIVITY',
      children:['ACTIVITY.TRAVEL.FLIGHT','ACTIVITY.TRAVEL.ROAD_TRIP',
                'ACTIVITY.TRAVEL.HIKING','ACTIVITY.TRAVEL.BEACH_TRIP']
    },
    'ACTIVITY.TRAVEL.FLIGHT':     { parent:'ACTIVITY.TRAVEL' },
    'ACTIVITY.TRAVEL.ROAD_TRIP':  { parent:'ACTIVITY.TRAVEL' },
    'ACTIVITY.TRAVEL.HIKING':     { parent:'ACTIVITY.TRAVEL' },
    'ACTIVITY.TRAVEL.BEACH_TRIP': { parent:'ACTIVITY.TRAVEL' },
    'ACTIVITY.SOCIAL': {
      parent:'ACTIVITY',
      children:['ACTIVITY.SOCIAL.HANGOUT','ACTIVITY.SOCIAL.PARTY','ACTIVITY.SOCIAL.DINING']
    },
    'ACTIVITY.SOCIAL.HANGOUT': { parent:'ACTIVITY.SOCIAL' },
    'ACTIVITY.SOCIAL.PARTY':   { parent:'ACTIVITY.SOCIAL' },
    'ACTIVITY.SOCIAL.DINING':  { parent:'ACTIVITY.SOCIAL' },
    'ACTIVITY.SPORTS': {
      parent:'ACTIVITY',
      children:['ACTIVITY.SPORTS.SWIMMING','ACTIVITY.SPORTS.CYCLING','ACTIVITY.SPORTS.RUNNING']
    },
    'ACTIVITY.SPORTS.SWIMMING': { parent:'ACTIVITY.SPORTS' },
    'ACTIVITY.SPORTS.CYCLING':  { parent:'ACTIVITY.SPORTS' },
    'ACTIVITY.SPORTS.RUNNING':  { parent:'ACTIVITY.SPORTS' },
    'ACTIVITY.NIGHTLIFE':    { parent:'ACTIVITY' },
    'ACTIVITY.SHOPPING':     { parent:'ACTIVITY' },
    'ACTIVITY.PHOTOGRAPHY':  { parent:'ACTIVITY' },

    // ── TRANSPORT ────────────────────────────────────────────────────────────
    'TRANSPORT': { children:['TRANSPORT.AIRPLANE','TRANSPORT.CAR','TRANSPORT.BOAT','TRANSPORT.TRAIN'] },
    'TRANSPORT.AIRPLANE': { parent:'TRANSPORT' },
    'TRANSPORT.CAR':      { parent:'TRANSPORT' },
    'TRANSPORT.BOAT':     { parent:'TRANSPORT' },
    'TRANSPORT.TRAIN':    { parent:'TRANSPORT' },

    // ── EVENTS ───────────────────────────────────────────────────────────────
    'EVENT': {
      children:['EVENT.BIRTHDAY','EVENT.WEDDING','EVENT.GRADUATION',
                'EVENT.CHRISTMAS','EVENT.DIWALI','EVENT.HOLI','EVENT.REUNION','EVENT.FAREWELL']
    },
    'EVENT.BIRTHDAY':   { parent:'EVENT' },
    'EVENT.WEDDING':    { parent:'EVENT' },
    'EVENT.GRADUATION': { parent:'EVENT' },
    'EVENT.CHRISTMAS':  { parent:'EVENT' },
    'EVENT.DIWALI':     { parent:'EVENT' },
    'EVENT.HOLI':       { parent:'EVENT' },
    'EVENT.REUNION':    { parent:'EVENT' },
    'EVENT.FAREWELL':   { parent:'EVENT' },

    // ── TIME (auto-derived from captureTime — user never assigns these) ───────
    'TIME': {
      children:['TIME.DAWN','TIME.MORNING','TIME.LATE_MORNING','TIME.AFTERNOON',
                'TIME.EVENING','TIME.SUNSET','TIME.DUSK','TIME.NIGHT','TIME.MIDNIGHT']
    },
    'TIME.DAWN':         { parent:'TIME' },
    'TIME.MORNING':      { parent:'TIME' },
    'TIME.LATE_MORNING': { parent:'TIME' },
    'TIME.AFTERNOON':    { parent:'TIME' },
    'TIME.EVENING':      { parent:'TIME' },
    'TIME.SUNSET':       { parent:'TIME' },
    'TIME.DUSK':         { parent:'TIME' },
    'TIME.NIGHT':        { parent:'TIME' },
    'TIME.MIDNIGHT':     { parent:'TIME' },
    // Calendar
    'TIME.CALENDAR': { children:['TIME.CALENDAR.WEEKDAY','TIME.CALENDAR.WEEKEND'] },
    'TIME.CALENDAR.WEEKDAY': { parent:'TIME.CALENDAR' },
    'TIME.CALENDAR.WEEKEND': { parent:'TIME.CALENDAR' },
    // Season
    'TIME.SEASON': {
      children:['TIME.SEASON.SUMMER','TIME.SEASON.MONSOON','TIME.SEASON.AUTUMN','TIME.SEASON.WINTER','TIME.SEASON.SPRING']
    },
    'TIME.SEASON.SUMMER':  { parent:'TIME.SEASON' },
    'TIME.SEASON.MONSOON': { parent:'TIME.SEASON' },
    'TIME.SEASON.AUTUMN':  { parent:'TIME.SEASON' },
    'TIME.SEASON.WINTER':  { parent:'TIME.SEASON' },
    'TIME.SEASON.SPRING':  { parent:'TIME.SEASON' },

    // ── WEATHER ──────────────────────────────────────────────────────────────
    'WEATHER': { children:['WEATHER.SUNNY','WEATHER.RAINY','WEATHER.FOGGY','WEATHER.CLOUDY','WEATHER.SNOWY'] },
    'WEATHER.SUNNY':  { parent:'WEATHER' },
    'WEATHER.RAINY':  { parent:'WEATHER' },
    'WEATHER.FOGGY':  { parent:'WEATHER' },
    'WEATHER.CLOUDY': { parent:'WEATHER' },
    'WEATHER.SNOWY':  { parent:'WEATHER' },
  };

  // ==========================================================================
  // 2. DIRECTIONAL RELEVANCE SCORER
  //    Spec: "Exact → direct child/parent → closely related concept"
  // ==========================================================================
  function conceptRelevance(queryId, photoId) {
    if (queryId === photoId) return 1.0;                             // exact

    const qNode = HIERARCHY[queryId];
    const pNode = HIERARCHY[photoId];
    if (!qNode || !pNode) return 0;

    // Query is parent, photo is direct child  → broad search returns specific
    if (qNode.children && qNode.children.includes(photoId)) return 0.75;

    // Query is child, photo is direct parent  → specific search returns broad
    if (pNode.children && pNode.children.includes(queryId)) return 0.40;

    // Query is grandparent (photo is grandchild or query's sibling's child)
    if (qNode.children) {
      for (const child of qNode.children) {
        const cNode = HIERARCHY[child];
        if (cNode && cNode.children && cNode.children.includes(photoId)) return 0.50;
      }
    }

    // Photo is grandparent of query
    if (pNode.children) {
      for (const child of pNode.children) {
        const cNode = HIERARCHY[child];
        if (cNode && cNode.children && cNode.children.includes(queryId)) return 0.25;
      }
    }

    return 0;
  }

  // ==========================================================================
  // 3. AUTO-DERIVE TIME CONCEPTS FROM TIMESTAMP
  //    Spec: "Derive this automatically from the timestamp"
  //    captureTime: "HH:MM" string on each photo
  // ==========================================================================
  function deriveTimeConcepts(dateStr, captureTime) {
    const dt = new Date(`${dateStr}T${captureTime || '12:00'}:00`);
    const hour  = dt.getHours();
    const dow   = dt.getDay();   // 0=Sun, 6=Sat
    const month = dt.getMonth() + 1; // 1–12

    const concepts = [];

    // ── Time of day ──────────────────────────────────────────────────
    let tod;
    if      (hour >=  5 && hour <  7) tod = 'TIME.DAWN';
    else if (hour >=  7 && hour < 10) tod = 'TIME.MORNING';
    else if (hour >= 10 && hour < 13) tod = 'TIME.LATE_MORNING';
    else if (hour >= 13 && hour < 17) tod = 'TIME.AFTERNOON';
    else if (hour >= 17 && hour < 19) tod = 'TIME.EVENING';
    else if (hour >= 19 && hour < 20) tod = 'TIME.SUNSET';
    else if (hour >= 20 && hour < 21) tod = 'TIME.DUSK';
    else if (hour >= 21 || hour <  2) tod = 'TIME.NIGHT';
    else                              tod = 'TIME.MIDNIGHT';
    concepts.push({ id: tod, label: tod.replace('TIME.','').replace('_',' ').toLowerCase(), imp:'primary' });

    // ── Weekday / Weekend ─────────────────────────────────────────────
    const isWeekend = (dow === 0 || dow === 6);
    concepts.push({
      id: isWeekend ? 'TIME.CALENDAR.WEEKEND' : 'TIME.CALENDAR.WEEKDAY',
      label: isWeekend ? 'Weekend' : 'Weekday',
      imp: 'secondary'
    });

    // ── Season (India-adjusted) ───────────────────────────────────────
    let season, seasonLabel;
    if      (month >= 3  && month <= 5)  { season = 'TIME.SEASON.SUMMER';  seasonLabel = 'Summer'; }
    else if (month >= 6  && month <= 9)  { season = 'TIME.SEASON.MONSOON'; seasonLabel = 'Monsoon'; }
    else if (month >= 10 && month <= 11) { season = 'TIME.SEASON.AUTUMN';  seasonLabel = 'Autumn'; }
    else                                  { season = 'TIME.SEASON.WINTER';  seasonLabel = 'Winter'; }
    concepts.push({ id: season, label: seasonLabel, imp:'secondary' });

    return concepts;
  }

  // ==========================================================================
  // 4. MULTILINGUAL ALIAS TABLE  (surface form → canonical concept ID)
  //    Includes umbrella/parent terms: "nature", "terrain", "water", "people" …
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

    // ── Umbrella / parent concepts (broad searches) ─────────────────
    add('NATURE','nature','प्रकृति','প্রকৃতি','இயற்கை','ప్రకృతి','ਕੁਦਰਤ','ನಿಸರ್ಗ','പ്രകൃതി','ପ୍ରକୃତି');
    add('NATURE.TERRAIN','terrain','landscape','hills','mountains','पहाड़','पर्वत','ভূমি','நிலத்திட்டு');
    add('NATURE.WATER','water','waterway','जल','পানি','நீர்','జలం','ਪਾਣੀ','ನೀರು','വെള்ளம்','ଜଳ');
    add('NATURE.PLANTS','plants','vegetation','flora','plants','पेड़-पौधे','গাছপালা','தாவரங்கள்','మొక்కలు');
    add('NATURE.PLANTS.TREES','tree','trees','पेड़','গাছ','மரம்','చెట్టు','ਦਰਖਤ','ಮರ','മരം','ଗଛ');
    add('NATURE.PLANTS.FLOWERS','flower','flowers','फूल','ফুল','பூக்கள்','పూలు','ਫੁੱਲ','ಹೂವು','പൂക்കൾ');
    add('PLACE','place','location','spot','स्थान','জায়গা','இடம்','స్థలం','ਸਥਾਨ','ಸ್ಥಳ','സ്ഥലം','ସ୍ଥାନ');
    add('FOOD','food','meal','खाना','খাবার','உணவு','ఆహారం','ਖਾਣਾ','ಆಹಾರ','ഭക്ഷണം','ଖାଦ୍ୟ');
    add('FOOD.BEVERAGE','drink','drinks','beverage','beverages','पेय','পানীয়','பానம்','పానీయాలు','ਪੀਣ','ಪಾನೀಯ','പാനീయം');
    add('PEOPLE','people','person','persons','लोग','মানুষ','மக்கள்','జనులు','ਲੋਕ','ಜನರು','ആളുകൾ','ଲୋକ');
    add('ACTIVITY','activity','activities','action','करना','কার্যকলাপ','செயல்','కార్యకలాపం');
    add('TRANSPORT','transport','vehicle','vehicles','वाहन','যানবাহন','வாகனம்','వాహనం','ਵਾਹਨ','ವಾಹನ','വാഹനം','ଯାନ');
    add('EVENT','event','occasion','celebration','कार्यक्रम','অনুষ্ঠান','நிகழ்வு','కార్యక్రమం','ਸਮਾਗਮ','ಕಾರ್ಯಕ್ರಮ','ഇവന്റ്');
    add('WEATHER','weather','climate','मौसम','আবহাওয়া','வானிலை','వాతావరణం','ਮੌਸਮ','ಹವಾಮಾನ','കാലാവസ്ഥ','ପ∘ weather');
    add('TIME','time','timing','समय','সময়','நேரம்','సమయం','ਸਮਾਂ','ಸಮಯ','സമയം','ସମୟ');

    // ── Nature specifics ────────────────────────────────────────────────
    add('NATURE.MOUNTAIN','mountain','mountains','hill','peak',
      'पहाड़','पर्वत','পাহাড়','পর্বত','மலை','పర్వతం','కొండ','डोंगर','ਪਹਾੜ','ಪರ್ವತ','ಬೆಟ್ಟ','മല','ପାହାଡ');
    add('NATURE.MOUNTAIN.SNOW','snow mountain','snowy mountain','snow','बर्फ','তুষার','பனி','మంచు','ਬਰਫ਼','ಹಿಮ','മഞ്ഞ്');
    add('NATURE.BEACH','beach','sea','ocean','coast','shore','waves',
      'समुद्र','সমুদ্র','கடல்','సముద్రం','ਸਮੁੰਦਰ','ಸಮುদ್ರ','കടൽ','ସমুদ্र');
    add('NATURE.RIVER','river','stream','नदी','নদী','ஆறு','నది','ਨਦੀ','ನদি','നദി');
    add('NATURE.LAKE','lake','pond','झील','জলাশয়','ஏரி','సరస్సు','ਝੀਲ','ಕೆರೆ','തടാകம');
    add('NATURE.WATERFALL','waterfall','falls','झरना','জলপ্রপাত','அருவி','జలపాతం','ਝਰਨਾ','ಜಲಪಾತ');
    add('NATURE.SUNSET','sunset','sundown','सूर्यास्त','সূর্যাস্ত','மாலைச் சூரியன்','ਸੂਰਜ ਡੁੱਬਣਾ');
    add('NATURE.SKY.GOLDEN_HOUR','golden hour','magic hour','सुनहरा समय');

    // ── Place specifics ─────────────────────────────────────────────────
    add('PLACE.HOME','home','house','घर','বাড়ি','வீடு','ఇల్లు','ਘਰ','ಮನೆ','വീട്','ଘর');
    add('PLACE.CITY','city','downtown','शहर','শহর','நகரம்','నగరం','ਸ਼ਹਿਰ','ನಗರ');
    add('PLACE.CAFE','café','cafe','coffee shop','cafeteria',
      'कैफे','ক্যাফে','கஃபே','కేఫ్','ਕੈਫੇ','ಕೆಫೆ','കഫേ','କaffe');
    add('PLACE.RESTAURANT','restaurant','eatery','diner','रेस्तरां','রেস্তরাঁ','உணவகம்','రెస్టారెంట్','ਰੈਸਟੋਰੈਂਟ');
    add('PLACE.HOTEL','hotel','resort','hostel','होटल','হোটেল','ஹோட்டல்','హోటల్','ਹੋਟਲ','ಹೋಟೆಲ್','ഹോട്ടൽ');
    add('PLACE.BEACH','beach','sand','shore','समुद्र तट','সৈকত','கடற்கரை','బీచ్','ਬੀਚ','ಕಡಲ ತೀರ','കടൽത്തീरম');
    add('PLACE.MARKET','market','bazaar','flea market','बाजार','বাজার','சந்தை','మార్కెట్','ਬਾਜ਼ਾਰ');
    add('PLACE.AIRPORT','airport','terminal','हवाई अड्डा','বিমানবন্দর','விமான நிலையம்','విమానాశ్రయం','ਹਵਾਈ ਅੱਡਾ');
    add('PLACE.MONUMENT','monument','heritage','fort','palace','स्मारक','স্মৃতিস্তম্ভ','நினைவிடம்','స్మారకం');
    add('PLACE.CHURCH','church','chapel','गिरजा','চার্চ','தேவாலயம்','చర్చి','ਚਰਚ');
    add('PLACE.POOL','pool','swimming pool','पूल','সুইমিং পুল','குளம்','కొలను');
    add('PLACE.PARK','park','garden','बगीचा','বাগান','பூங்கா','పార్కు','ਪਾਰਕ');
    add('PLACE.STREET','street','road','alley','सड़क','রাস্তা','தெரு','రోడ్డు','ਸੜਕ');
    add('PLACE.GOA','goa','गोवा','গোয়া','கோவா','గోవా','ਗੋਆ','ಗೋವಾ','ഗോവ');

    // ── Food & Drink ────────────────────────────────────────────────────
    add('FOOD.BEVERAGE.COFFEE','coffee','espresso','cappuccino','latte','cold coffee',
      'कॉफ़ी','कॉफी','কফি','காபி','కాఫీ','ਕੌਫੀ','ಕಾಫಿ','കാപ്പി');
    add('FOOD.BEVERAGE.TEA','tea','chai','green tea','चाय','চা','தேநீர்','టీ','ਚਾਹ','ಚಹಾ','ചായ');
    add('FOOD.BEVERAGE.COCONUT_WATER','coconut water','nariyal pani','नारियल पानी','ডাব','இளநீர்','కొబ్బరి నీళ్ళు');
    add('FOOD.DESSERT','cake','ice cream','pastry','dessert','chocolate','gulab jamun','rasgulla','jalebi','kulfi',
      'केक','आइसक्रीम','কেক','কেক','கேக்','కేక');
    add('FOOD.DINING','dining','lunch','dinner','breakfast','meal','eating',
      'खाना','खाने','খাওয়া','உணவு','భోజనం','ਖਾਣਾ','ಆಹಾರ','ഭക്ഷണം');
    add('FOOD.INDIAN','biryani','dosa','curry','thali','samosa','pakora','momos','chaat','dal','paneer','tandoori',
      'बिरयानी','दोसा','কারি','দোসা','குறிப்பு','కర్రీ');
    add('FOOD.INTERNATIONAL','pizza','burger','pasta','sandwich','sushi','noodles','steak',
      'पिज्जा','বার্গার','பீஸ்ஸா','పిజ్జా');

    // ── People ───────────────────────────────────────────────────────────
    add('PEOPLE.FRIENDS','friends','friend','buddy','yaar','dost',
      'बन्धु','बन्धुओं','दोस्त','यार','বন্ধু','நண்பர்கள்','నేస్తాలు','ਦੋਸਤ','ಗೆಳೆಯರು','സുഹൃത്ത്','ବନ୍ଧୁ');
    add('PEOPLE.FAMILY','family','relatives','परिवार','घरवाले','পরিবার','குடும்பம்','కుటుంబం','ਪਰਿਵਾਰ','ಕುಟುಂಬ','കുടുംബം');
    add('PEOPLE.COUPLE','couple','partner','date','रोमांस','প্রেমিক জুটি','காதலர்','జంట');
    add('PEOPLE.SOLO','solo','alone','self','एकला','एकांत','একা','தனியாக','ఒంటరి');
    add('PEOPLE.GROUP','group','gang','crew','crowd','टोली','দল','குழு','గ్రూప్');
    add('PEOPLE.COLLEAGUES','colleagues','coworkers','office','सहयोगी','সহকর্মী');
    add('PEOPLE.CLASSMATES','classmates','college friends','class','सहपाठी','সহপাঠী');

    // ── Activities ───────────────────────────────────────────────────────
    add('ACTIVITY.TRAVEL','travel','trip','tour','vacation','holiday','journey',
      'यात्रा','সফর','பயணம்','ప్రయాణం','ਯਾਤਰਾ','ಪ್ರಯಾಣ','യാത്ര');
    add('ACTIVITY.TRAVEL.FLIGHT','flight','flying','airplane','plane','उड़ान','বিমান','விமானம்','విమానం');
    add('ACTIVITY.TRAVEL.ROAD_TRIP','road trip','drive','driving','सड़क यात्रा','রোড ট্রিপ');
    add('ACTIVITY.TRAVEL.HIKING','hiking','trekking','trek','hike','ट्रैकिंग','ট্রেকিং');
    add('ACTIVITY.TRAVEL.BEACH_TRIP','beach trip','beach day','beach holiday','समुद्र यात्रा');
    add('ACTIVITY.SOCIAL.HANGOUT','hangout','outing','chill','मौज','आड्डा','আড্ডা','adda');
    add('ACTIVITY.SOCIAL.PARTY','party','celebration','पार्टी','পার্টি','விழா','పార్టీ');
    add('ACTIVITY.SOCIAL.DINING','dining out','dinner out','eating out','khana');
    add('ACTIVITY.NIGHTLIFE','nightlife','night out','club','bar','pub','नाइटलाइफ','রাতের আড্ডা');
    add('ACTIVITY.SPORTS.SWIMMING','swimming','swim','तैराकी','সাঁতার','நீச்சல்','ఈత');
    add('ACTIVITY.SHOPPING','shopping','mall','खरीदारी','শপিং','কেনাকাটা');

    // ── Events ───────────────────────────────────────────────────────────
    add('EVENT.BIRTHDAY','birthday','bday','जन्मदिन','জন্মদিন','பிறந்தநாள்','పుట్టినరోజు','ਜਨਮਦਿਨ','ಹುಟ್ಟುಹಬ್ಬ');
    add('EVENT.WEDDING','wedding','marriage','शादी','বিয়ে','திருமணம்','పెళ్ళి','ਵਿਆਹ','ಮದುವೆ');
    add('EVENT.GRADUATION','graduation','convocation','পড়াশেষ','graduate');
    add('EVENT.CHRISTMAS','christmas','xmas','क्रिसमस','ক্রিসমাস','கிறிஸ்துமஸ்','క్రిస్మస్');
    add('EVENT.DIWALI','diwali','deepavali','दिवाली','দীপাবলি','தீபாவளி','దీపావళి','ਦੀਵਾਲੀ');
    add('EVENT.HOLI','holi','होली','হোলি','ஹோலி','హోలీ','ਹੋਲੀ');
    add('EVENT.REUNION','reunion','meetup','मिलन','মিলনমেলা');
    add('EVENT.FAREWELL','farewell','goodbye','alvida','अलविदा','বিদায়');

    // ── Time of day (aliases — all resolve to TIME.* for hierarchy scoring) ─
    add('TIME.MORNING','morning','सुबह','সকাল','காலை','ఉదయం','ਸਵੇਰੇ','ಬೆಳಿಗ್ಗೆ','रaaviley');
    add('TIME.LATE_MORNING','late morning','mid morning');
    add('TIME.AFTERNOON','afternoon','दोपहर','বিকেল','மதியம்','మధ్యాహ్నం','ਦੁਪਹਿਰ');
    add('TIME.EVENING','evening','शाम','বিকাল','மாலை','సాయంత్రం','ਸ਼ਾਮ','ಸಂಜೆ','sandhya','संध्या');
    add('TIME.NIGHT','night','रात','রাত','இரவு','రాత్రి','ਰਾਤ','ರಾತ್ರಿ','rati');
    add('TIME.DAWN','dawn','daybreak','तड़का','ভোর','விடியற்காலை');
    add('TIME.SUNSET','sunset time','evening sunset');

    // ── Time calendar / season ───────────────────────────────────────────
    add('TIME.CALENDAR.WEEKEND','weekend','saturday','sunday','शनिवार','रविवार','সপ্তাহান্ত','weekends');
    add('TIME.CALENDAR.WEEKDAY','weekday','workday','weekdays','सप्ताह का दिन','কর্মদিবস');
    add('TIME.SEASON.SUMMER','summer','गर्मी','গ্রীষ্ম','கோடை','వేసవి','ਗਰਮੀ','ಬೇಸಿಗೆ','വേനൽ');
    add('TIME.SEASON.MONSOON','monsoon','rainy season','बारिश का मौसम','বর্ষা','மழைக்காலம்','వర్షాకాలం','ਬਰਸਾਤ');
    add('TIME.SEASON.WINTER','winter','ठंड','শীতকাল','குளிர்காலம்','శీతాకాలం','ਸਰਦੀਆਂ','ಚಳಿಗಾಲ','ശൈത്യകാലം');
    add('TIME.SEASON.SPRING','spring','वसंत','বসন্ত','வசந்த காலம்','వసంతం','ਬਸੰਤ');
    add('TIME.SEASON.AUTUMN','autumn','fall','शरद','হেমন্ত','இலையுதிர்காலம்','శరదృతువు','ਪਤਝੜ');

    // ── Transport ────────────────────────────────────────────────────────
    add('TRANSPORT.AIRPLANE','airplane','flight','plane','विमान','বিমান','விமானம்','విమానం');
    add('TRANSPORT.CAR','car','automobile','गाड़ी','গাড়ি','கார்','కారు','ਕਾਰ','ಕಾರು','കാർ');
    add('TRANSPORT.BOAT','boat','ship','ferry','नाव','নৌকা','படகு','పడవ','ਕਿਸ਼ਤੀ');
    add('TRANSPORT.TRAIN','train','rail','ट्रेन','ট্রেন','ரயில்','రైలు','ਰੇਲ');

    // ── Weather ──────────────────────────────────────────────────────────
    add('WEATHER.SUNNY','sunny','sunshine','sunny day','धूप','রোদ','வெயில்','ਧੁੱਪ','ಬಿಸಿಲು');
    add('WEATHER.RAINY','rain','rainy','raining','बारिश','বৃষ্টি','மழை','వర్షం','ਬਾਰਿਸ਼','ಮಳೆ');
    add('WEATHER.FOGGY','fog','foggy','mist','misty','धुंध','কুয়াশা','மூடுபனி');
    add('WEATHER.CLOUDY','cloudy','overcast','clouds','बादल','মেঘ','மேகம்','మేఘాలు','ਬੱਦਲ');

    return m;
  }

  // ==========================================================================
  // 5. PHOTO DATABASE — each photo has captureTime (HH:MM) instead of episode
  //    Time concepts are auto-derived at match time, not stored manually.
  // ==========================================================================
  const PHOTO_DB = [

    // ── Nov 14, 2023 — Bangalore ──────────────────────────────────────────
    { id:'p001', date:'2023-11-14', captureTime:'08:30', dateStr:'Nov 14, 2023', loc:'Bangalore',
      url:'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=400&q=80',
      sem:{ place:[{id:'PLACE.HOME',label:'Home',imp:'primary'}],
            people:[{id:'PEOPLE.FAMILY',label:'Family',imp:'primary'}],
            food:[{id:'FOOD.BEVERAGE.COFFEE',label:'Coffee',imp:'primary'}],
            objects:[], activity:[], event:[], weather:[], environment:[] },
      relations:['PEOPLE.FAMILY → sharing → FOOD.BEVERAGE.COFFEE → at → PLACE.HOME'],
      displayTags:['home','coffee','family'] },

    { id:'p002', date:'2023-11-14', captureTime:'09:15', dateStr:'Nov 14, 2023', loc:'Bangalore',
      url:'https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=400&q=80',
      sem:{ place:[{id:'PLACE.HOME',label:'Home',imp:'primary'},{id:'PLACE.HOME.BALCONY',label:'Balcony',imp:'secondary'}],
            people:[{id:'PEOPLE.FAMILY',label:'Family',imp:'primary'}],
            objects:[], food:[], activity:[], event:[], weather:[], environment:[] },
      relations:['PEOPLE.FAMILY → on → PLACE.HOME.BALCONY → at → PLACE.HOME'],
      displayTags:['home','balcony','family'] },

    { id:'p003', date:'2023-11-14', captureTime:'18:45', dateStr:'Nov 14, 2023', loc:'Bangalore',
      url:'https://images.unsplash.com/photo-1543362906-acfc16c67564?auto=format&fit=crop&w=400&q=80',
      sem:{ place:[{id:'PLACE.CITY',label:'City',imp:'primary'},{id:'PLACE.STREET',label:'Street',imp:'secondary'}],
            objects:[{id:'TRANSPORT.CAR',label:'Cars',imp:'incidental'}],
            people:[], food:[], activity:[], event:[], weather:[], environment:[] },
      relations:['PLACE.STREET → in → PLACE.CITY'],
      displayTags:['street','city','evening'] },

    { id:'p004', date:'2023-11-14', captureTime:'15:20', dateStr:'Nov 14, 2023', loc:'Bangalore',
      url:'https://images.unsplash.com/photo-1533900298318-6b8da08a523e?auto=format&fit=crop&w=400&q=80',
      sem:{ place:[{id:'PLACE.MARKET',label:'Market',imp:'primary'}],
            activity:[{id:'ACTIVITY.SHOPPING',label:'Shopping',imp:'secondary'}],
            objects:[], people:[], food:[], event:[], weather:[], environment:[] },
      relations:['ACTIVITY.SHOPPING → at → PLACE.MARKET'],
      displayTags:['market','shopping'] },

    { id:'p005', date:'2023-11-14', captureTime:'16:10', dateStr:'Nov 14, 2023', loc:'Bangalore',
      url:'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=400&q=80',
      sem:{ place:[{id:'PLACE.CAFE',label:'Café',imp:'primary'}],
            people:[{id:'PEOPLE.FRIENDS',label:'Friends',imp:'primary'}],
            food:[{id:'FOOD.BEVERAGE.COFFEE',label:'Coffee',imp:'primary'}],
            activity:[{id:'ACTIVITY.SOCIAL.HANGOUT',label:'Hangout',imp:'secondary'}],
            objects:[{id:'TRANSPORT.CAR',label:'Car outside',imp:'incidental'}],
            event:[], weather:[], environment:[] },
      relations:['PEOPLE.FRIENDS → drinking → FOOD.BEVERAGE.COFFEE → at → PLACE.CAFE'],
      displayTags:['café','friends','coffee'] },

    { id:'p006', date:'2023-11-14', captureTime:'19:00', dateStr:'Nov 14, 2023', loc:'Bangalore',
      url:'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=400&q=80',
      sem:{ place:[{id:'PLACE.CAFE',label:'Café',imp:'primary'}],
            people:[{id:'PEOPLE.FRIENDS',label:'Friends',imp:'primary'}],
            food:[{id:'FOOD.DESSERT',label:'Pastry',imp:'primary'},{id:'FOOD.BEVERAGE.COFFEE',label:'Coffee',imp:'secondary'}],
            activity:[{id:'ACTIVITY.SOCIAL.HANGOUT',label:'Hangout',imp:'secondary'}],
            objects:[], event:[], weather:[], environment:[] },
      relations:['PEOPLE.FRIENDS → sharing → FOOD.DESSERT → at → PLACE.CAFE'],
      displayTags:['café','friends','pastry'] },

    // ── Nov 15, 2023 — Travel to Goa ────────────────────────────────────
    { id:'p007', date:'2023-11-15', captureTime:'07:45', dateStr:'Nov 15, 2023', loc:'Bangalore Airport',
      url:'https://images.unsplash.com/photo-1529074963764-98f45c47344b?auto=format&fit=crop&w=400&q=80',
      sem:{ place:[{id:'PLACE.AIRPORT',label:'Airport',imp:'primary'},{id:'PLACE.GOA',label:'Goa (destination)',imp:'secondary'}],
            activity:[{id:'ACTIVITY.TRAVEL',label:'Travel',imp:'primary'},{id:'ACTIVITY.TRAVEL.FLIGHT',label:'Flight',imp:'primary'}],
            objects:[{id:'TRANSPORT.AIRPLANE',label:'Airplane',imp:'secondary'}],
            people:[], food:[], event:[], weather:[], environment:[] },
      relations:['ACTIVITY.TRAVEL → via → TRANSPORT.AIRPLANE → to → PLACE.GOA'],
      displayTags:['airport','travel','flight'] },

    { id:'p008', date:'2023-11-15', captureTime:'09:00', dateStr:'Nov 15, 2023', loc:'In Flight',
      url:'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=400&q=80',
      sem:{ activity:[{id:'ACTIVITY.TRAVEL.FLIGHT',label:'In-flight',imp:'primary'},{id:'ACTIVITY.TRAVEL',label:'Travel',imp:'primary'}],
            objects:[{id:'TRANSPORT.AIRPLANE',label:'Airplane',imp:'primary'}],
            place:[], people:[], food:[], event:[], weather:[], environment:[] },
      relations:['ACTIVITY.TRAVEL → in → TRANSPORT.AIRPLANE → towards → PLACE.GOA'],
      displayTags:['in-flight','travel','airplane'] },

    { id:'p009', date:'2023-11-15', captureTime:'14:30', dateStr:'Nov 15, 2023', loc:'Panaji, Goa',
      url:'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=400&q=80',
      sem:{ place:[{id:'PLACE.GOA',label:'Goa',imp:'primary'},{id:'PLACE.HOTEL',label:'Hotel',imp:'primary'}],
            people:[{id:'PEOPLE.FRIENDS',label:'Friends',imp:'primary'}],
            activity:[{id:'ACTIVITY.TRAVEL',label:'Travel',imp:'secondary'}],
            objects:[], food:[], event:[], weather:[], environment:[] },
      relations:['PEOPLE.FRIENDS → arrived at → PLACE.HOTEL → in → PLACE.GOA'],
      displayTags:['goa','hotel','friends'] },

    { id:'p010', date:'2023-11-15', captureTime:'15:45', dateStr:'Nov 15, 2023', loc:'Panaji, Goa',
      url:'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=400&q=80',
      sem:{ place:[{id:'PLACE.GOA',label:'Goa',imp:'primary'},{id:'PLACE.HOTEL',label:'Hotel',imp:'primary'},{id:'PLACE.POOL',label:'Pool',imp:'primary'}],
            people:[{id:'PEOPLE.FRIENDS',label:'Friends',imp:'primary'}],
            activity:[{id:'ACTIVITY.SOCIAL.HANGOUT',label:'Poolside',imp:'secondary'}],
            objects:[], food:[], event:[], weather:[], environment:[] },
      relations:['PEOPLE.FRIENDS → relaxing at → PLACE.POOL → PLACE.HOTEL → PLACE.GOA'],
      displayTags:['goa','hotel','pool','friends'] },

    { id:'p011', date:'2023-11-15', captureTime:'18:20', dateStr:'Nov 15, 2023', loc:'Baga Beach, Goa',
      url:'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80',
      sem:{ place:[{id:'PLACE.GOA',label:'Goa',imp:'primary'},{id:'PLACE.BEACH',label:'Baga Beach',imp:'primary'}],
            people:[{id:'PEOPLE.FRIENDS',label:'Friends',imp:'primary'}],
            environment:[{id:'NATURE.BEACH',label:'Ocean waves',imp:'primary'},{id:'NATURE.SUNSET',label:'Sunset',imp:'primary'}],
            activity:[{id:'ACTIVITY.TRAVEL.BEACH_TRIP',label:'Beach day',imp:'secondary'}],
            objects:[], food:[], event:[], weather:[] },
      relations:['PEOPLE.FRIENDS → watching → NATURE.SUNSET → at → PLACE.BEACH → PLACE.GOA'],
      displayTags:['goa','beach','sunset','friends'] },

    { id:'p012', date:'2023-11-15', captureTime:'19:05', dateStr:'Nov 15, 2023', loc:'Baga Beach, Goa',
      url:'https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=400&q=80',
      sem:{ place:[{id:'PLACE.GOA',label:'Goa',imp:'primary'},{id:'PLACE.BEACH',label:'Beach',imp:'primary'}],
            people:[{id:'PEOPLE.FRIENDS',label:'Friends',imp:'primary'}],
            environment:[{id:'NATURE.BEACH',label:'Waves',imp:'primary'}],
            objects:[], food:[], activity:[], event:[], weather:[] },
      relations:['PEOPLE.FRIENDS → at → PLACE.BEACH → PLACE.GOA'],
      displayTags:['goa','beach','waves','friends'] },

    // ── Nov 16, 2023 — Anjuna Flea Market + Café Evening ────────────────
    { id:'p013', date:'2023-11-16', captureTime:'07:30', dateStr:'Nov 16, 2023', loc:'Anjuna, Goa',
      url:'https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&w=400&q=80',
      sem:{ place:[{id:'PLACE.GOA',label:'Goa',imp:'primary'},{id:'PLACE.BEACH',label:'Anjuna Beach',imp:'primary'}],
            environment:[{id:'NATURE.BEACH',label:'Beach',imp:'primary'},{id:'NATURE.SKY.GOLDEN_HOUR',label:'Golden hour',imp:'secondary'}],
            objects:[], people:[], food:[], activity:[], event:[], weather:[] },
      relations:['NATURE.SKY.GOLDEN_HOUR → over → PLACE.BEACH → PLACE.GOA'],
      displayTags:['goa','beach','golden hour'] },

    { id:'p014', date:'2023-11-16', captureTime:'10:00', dateStr:'Nov 16, 2023', loc:'Anjuna, Goa',
      url:'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=400&q=80',
      sem:{ place:[{id:'PLACE.GOA',label:'Goa',imp:'primary'},{id:'PLACE.MARKET',label:'Flea Market',imp:'primary'}],
            people:[{id:'PEOPLE.FRIENDS',label:'Friends',imp:'primary'}],
            activity:[{id:'ACTIVITY.SHOPPING',label:'Shopping',imp:'primary'}],
            objects:[], food:[], event:[], weather:[], environment:[] },
      relations:['PEOPLE.FRIENDS → browsing → PLACE.MARKET → PLACE.GOA'],
      displayTags:['goa','flea market','friends','shopping'] },

    { id:'p015', date:'2023-11-16', captureTime:'13:30', dateStr:'Nov 16, 2023', loc:'Anjuna, Goa',
      url:'https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=400&q=80',
      sem:{ place:[{id:'PLACE.GOA',label:'Goa',imp:'primary'},{id:'PLACE.MARKET',label:'Market',imp:'primary'}],
            activity:[{id:'ACTIVITY.SHOPPING',label:'Shopping',imp:'primary'}],
            objects:[], people:[], food:[], event:[], weather:[], environment:[] },
      relations:['ACTIVITY.SHOPPING → at → PLACE.MARKET → PLACE.GOA'],
      displayTags:['goa','market','shopping'] },

    { id:'p016', date:'2023-11-16', captureTime:'19:15', dateStr:'Nov 16, 2023', loc:'Café Lilliput, Anjuna',
      url:'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=400&q=80',
      sem:{ place:[{id:'PLACE.GOA',label:'Goa',imp:'primary'},{id:'PLACE.CAFE',label:'Café Lilliput',imp:'primary'},{id:'PLACE.BEACH',label:'Beach (view)',imp:'secondary'}],
            people:[{id:'PEOPLE.FRIENDS',label:'Friends',imp:'primary'}],
            food:[{id:'FOOD.DINING',label:'Dinner',imp:'primary'},{id:'FOOD.INDIAN',label:'Seafood',imp:'secondary'}],
            activity:[{id:'ACTIVITY.SOCIAL.DINING',label:'Dining',imp:'primary'},{id:'ACTIVITY.SOCIAL.HANGOUT',label:'Hangout',imp:'secondary'}],
            objects:[{id:'TRANSPORT.CAR',label:'Car outside',imp:'incidental'}],
            event:[], weather:[], environment:[] },
      relations:['PEOPLE.FRIENDS → dining at → PLACE.CAFE → PLACE.GOA','PLACE.CAFE → overlooks → PLACE.BEACH'],
      displayTags:['goa','café','friends','dinner'] },

    { id:'p017', date:'2023-11-16', captureTime:'20:30', dateStr:'Nov 16, 2023', loc:'Café Lilliput, Anjuna',
      url:'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=400&q=80',
      sem:{ place:[{id:'PLACE.GOA',label:'Goa',imp:'primary'},{id:'PLACE.CAFE',label:'Café',imp:'primary'}],
            people:[{id:'PEOPLE.FRIENDS',label:'Friends',imp:'primary'}],
            food:[{id:'FOOD.BEVERAGE.COFFEE',label:'Coffee',imp:'primary'},{id:'FOOD.DESSERT',label:'Dessert',imp:'secondary'}],
            activity:[{id:'ACTIVITY.SOCIAL.HANGOUT',label:'Hangout',imp:'primary'}],
            objects:[{id:'TRANSPORT.CAR',label:'Street car',imp:'incidental'}],
            event:[], weather:[], environment:[] },
      relations:['PEOPLE.FRIENDS → drinking → FOOD.BEVERAGE.COFFEE → at → PLACE.CAFE → PLACE.GOA'],
      displayTags:['goa','café','coffee','friends'] },

    { id:'p018', date:'2023-11-16', captureTime:'22:00', dateStr:'Nov 16, 2023', loc:'Curlies, Anjuna Beach',
      url:'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=400&q=80',
      sem:{ place:[{id:'PLACE.GOA',label:'Goa',imp:'primary'},{id:'PLACE.BEACH',label:'Anjuna Beach',imp:'primary'}],
            people:[{id:'PEOPLE.FRIENDS',label:'Friends',imp:'primary'}],
            activity:[{id:'ACTIVITY.NIGHTLIFE',label:'Nightlife',imp:'primary'},{id:'ACTIVITY.SOCIAL.PARTY',label:'Party',imp:'primary'}],
            objects:[], food:[], event:[], weather:[], environment:[] },
      relations:['PEOPLE.FRIENDS → partying at → PLACE.BEACH → PLACE.GOA'],
      displayTags:['goa','nightlife','beach party','friends'] },

    // ── Nov 17, 2023 — Heritage & Café ──────────────────────────────────
    { id:'p019', date:'2023-11-17', captureTime:'09:30', dateStr:'Nov 17, 2023', loc:'Old Goa',
      url:'https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=400&q=80',
      sem:{ place:[{id:'PLACE.GOA',label:'Goa',imp:'primary'},{id:'PLACE.MONUMENT',label:'Old Goa Church',imp:'primary'},{id:'PLACE.CHURCH',label:'Church',imp:'primary'}],
            activity:[{id:'ACTIVITY.TRAVEL',label:'Sightseeing',imp:'primary'}],
            objects:[], people:[], food:[], event:[], weather:[], environment:[] },
      relations:['ACTIVITY.TRAVEL → visiting → PLACE.MONUMENT → PLACE.GOA'],
      displayTags:['goa','heritage','church','sightseeing'] },

    { id:'p020', date:'2023-11-17', captureTime:'10:45', dateStr:'Nov 17, 2023', loc:'Old Goa',
      url:'https://images.unsplash.com/photo-1519817650390-64a93db51149?auto=format&fit=crop&w=400&q=80',
      sem:{ place:[{id:'PLACE.GOA',label:'Goa',imp:'primary'},{id:'PLACE.MONUMENT',label:'Heritage site',imp:'primary'}],
            activity:[{id:'ACTIVITY.TRAVEL',label:'Sightseeing',imp:'primary'}],
            objects:[], people:[], food:[], event:[], weather:[], environment:[] },
      relations:['ACTIVITY.TRAVEL → at → PLACE.MONUMENT → PLACE.GOA'],
      displayTags:['goa','architecture','heritage'] },

    { id:'p021', date:'2023-11-17', captureTime:'13:00', dateStr:'Nov 17, 2023', loc:'Fontainhas, Panaji',
      url:'https://images.unsplash.com/photo-1559925393-8be0ec4767c8?auto=format&fit=crop&w=400&q=80',
      sem:{ place:[{id:'PLACE.GOA',label:'Goa',imp:'primary'},{id:'PLACE.CAFE',label:'Café Fontainhas',imp:'primary'}],
            people:[{id:'PEOPLE.FRIENDS',label:'Friends',imp:'primary'}],
            food:[{id:'FOOD.DINING',label:'Brunch',imp:'primary'},{id:'FOOD.BEVERAGE.COFFEE',label:'Coffee',imp:'secondary'}],
            activity:[{id:'ACTIVITY.SOCIAL.DINING',label:'Brunch',imp:'primary'}],
            objects:[], event:[], weather:[], environment:[] },
      relations:['PEOPLE.FRIENDS → brunch at → PLACE.CAFE → PLACE.GOA'],
      displayTags:['goa','café','brunch','friends'] },

    { id:'p022', date:'2023-11-17', captureTime:'15:00', dateStr:'Nov 17, 2023', loc:'Fontainhas, Panaji',
      url:'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=400&q=80',
      sem:{ place:[{id:'PLACE.GOA',label:'Goa',imp:'primary'},{id:'PLACE.STREET',label:'Heritage streets',imp:'primary'}],
            people:[{id:'PEOPLE.FRIENDS',label:'Friends',imp:'primary'}],
            activity:[{id:'ACTIVITY.TRAVEL',label:'Exploring',imp:'primary'}],
            objects:[], food:[], event:[], weather:[], environment:[] },
      relations:['PEOPLE.FRIENDS → exploring → PLACE.STREET → PLACE.GOA'],
      displayTags:['goa','street walk','friends','exploring'] },

    { id:'p023', date:'2023-11-17', captureTime:'17:45', dateStr:'Nov 17, 2023', loc:'Calangute Beach, Goa',
      url:'https://images.unsplash.com/photo-1542397284385-6010376c5337?auto=format&fit=crop&w=400&q=80',
      sem:{ place:[{id:'PLACE.GOA',label:'Goa',imp:'primary'},{id:'PLACE.BEACH',label:'Calangute Beach',imp:'primary'}],
            people:[{id:'PEOPLE.FRIENDS',label:'Friends',imp:'primary'}],
            environment:[{id:'NATURE.BEACH',label:'Beach',imp:'primary'},{id:'NATURE.SUNSET',label:'Sunset',imp:'primary'}],
            activity:[{id:'ACTIVITY.TRAVEL.BEACH_TRIP',label:'Beach day',imp:'secondary'}],
            objects:[], food:[], event:[], weather:[] },
      relations:['PEOPLE.FRIENDS → watching → NATURE.SUNSET → at → PLACE.BEACH → PLACE.GOA'],
      displayTags:['goa','beach','sunset','friends'] },

    { id:'p024', date:'2023-11-17', captureTime:'18:30', dateStr:'Nov 17, 2023', loc:'Calangute Beach, Goa',
      url:'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=401&q=80',
      sem:{ place:[{id:'PLACE.GOA',label:'Goa',imp:'primary'},{id:'PLACE.BEACH',label:'Beach',imp:'primary'}],
            environment:[{id:'NATURE.BEACH',label:'Ocean',imp:'primary'},{id:'NATURE.SUNSET',label:'Sunset',imp:'primary'}],
            objects:[], people:[], food:[], activity:[], event:[], weather:[] },
      relations:['NATURE.SUNSET → over → NATURE.BEACH → PLACE.GOA'],
      displayTags:['goa','beach','sunset','ocean'] },

    { id:'p025', date:'2023-11-17', captureTime:'19:45', dateStr:'Nov 17, 2023', loc:'Beach Shack, Calangute',
      url:'https://images.unsplash.com/photo-1543007630-9710e4a00a20?auto=format&fit=crop&w=400&q=80',
      sem:{ place:[{id:'PLACE.GOA',label:'Goa',imp:'primary'},{id:'PLACE.CAFE',label:'Beach shack',imp:'primary'},{id:'PLACE.BEACH',label:'Beach',imp:'secondary'}],
            people:[{id:'PEOPLE.FRIENDS',label:'Friends',imp:'primary'}],
            food:[{id:'FOOD.DINING',label:'Dinner',imp:'primary'},{id:'FOOD.BEVERAGE.COCONUT_WATER',label:'Coconut water',imp:'secondary'}],
            activity:[{id:'ACTIVITY.SOCIAL.DINING',label:'Beach dinner',imp:'primary'}],
            objects:[], event:[], weather:[], environment:[] },
      relations:['PEOPLE.FRIENDS → dinner at → PLACE.CAFE → on → PLACE.BEACH → PLACE.GOA'],
      displayTags:['goa','beach café','dinner','friends'] },

    { id:'p026', date:'2023-11-17', captureTime:'21:30', dateStr:'Nov 17, 2023', loc:'Beach Shack, Calangute',
      url:'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=401&q=80',
      sem:{ place:[{id:'PLACE.GOA',label:'Goa',imp:'primary'},{id:'PLACE.CAFE',label:'Café',imp:'primary'}],
            people:[{id:'PEOPLE.FRIENDS',label:'Friends',imp:'primary'}],
            food:[{id:'FOOD.INDIAN',label:'Indian food',imp:'primary'},{id:'FOOD.BEVERAGE.COFFEE',label:'Coffee',imp:'secondary'}],
            activity:[{id:'ACTIVITY.SOCIAL.HANGOUT',label:'Night hangout',imp:'secondary'}],
            objects:[], event:[], weather:[], environment:[] },
      relations:['PEOPLE.FRIENDS → dining → PLACE.CAFE → PLACE.GOA'],
      displayTags:['goa','café','night','friends','food'] },

    // ── Nov 18, 2023 — Last day + Departure ─────────────────────────────
    { id:'p027', date:'2023-11-18', captureTime:'08:00', dateStr:'Nov 18, 2023', loc:'Anjuna Beach, Goa',
      url:'https://images.unsplash.com/photo-1562259929-b4e1fd3aef09?auto=format&fit=crop&w=400&q=80',
      sem:{ place:[{id:'PLACE.GOA',label:'Goa',imp:'primary'},{id:'PLACE.BEACH',label:'Anjuna Beach',imp:'primary'}],
            environment:[{id:'NATURE.BEACH',label:'Beach',imp:'primary'}],
            objects:[], people:[], food:[], activity:[], event:[], weather:[] },
      relations:['PLACE.BEACH → PLACE.GOA'],
      displayTags:['goa','beach','last day'] },

    { id:'p028', date:'2023-11-18', captureTime:'09:30', dateStr:'Nov 18, 2023', loc:'Anjuna Beach, Goa',
      url:'https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=401&q=80',
      sem:{ place:[{id:'PLACE.GOA',label:'Goa',imp:'primary'},{id:'PLACE.BEACH',label:'Beach',imp:'primary'}],
            people:[{id:'PEOPLE.FRIENDS',label:'Friends',imp:'primary'}],
            activity:[{id:'ACTIVITY.SPORTS.SWIMMING',label:'Swimming',imp:'primary'},{id:'ACTIVITY.TRAVEL.BEACH_TRIP',label:'Beach day',imp:'secondary'}],
            environment:[{id:'NATURE.BEACH',label:'Ocean',imp:'primary'}],
            objects:[], food:[], event:[], weather:[] },
      relations:['PEOPLE.FRIENDS → swimming at → PLACE.BEACH → PLACE.GOA'],
      displayTags:['goa','beach','swimming','friends'] },

    { id:'p029', date:'2023-11-18', captureTime:'14:00', dateStr:'Nov 18, 2023', loc:'Goa Airport',
      url:'https://images.unsplash.com/photo-1529074963764-98f45c47344b?auto=format&fit=crop&w=401&q=80',
      sem:{ place:[{id:'PLACE.AIRPORT',label:'Airport',imp:'primary'},{id:'PLACE.GOA',label:'Goa',imp:'secondary'}],
            activity:[{id:'ACTIVITY.TRAVEL',label:'Travel',imp:'primary'},{id:'ACTIVITY.TRAVEL.FLIGHT',label:'Departure',imp:'primary'}],
            objects:[{id:'TRANSPORT.AIRPLANE',label:'Airplane',imp:'secondary'}],
            people:[], food:[], event:[], weather:[], environment:[] },
      relations:['ACTIVITY.TRAVEL → departing → PLACE.GOA → via → PLACE.AIRPORT'],
      displayTags:['airport','departure','goa'] },

    { id:'p030', date:'2023-11-18', captureTime:'20:00', dateStr:'Nov 18, 2023', loc:'Back Home, Bangalore',
      url:'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=401&q=80',
      sem:{ place:[{id:'PLACE.HOME',label:'Home',imp:'primary'}],
            people:[{id:'PEOPLE.FAMILY',label:'Family',imp:'primary'}],
            food:[{id:'FOOD.BEVERAGE.COFFEE',label:'Coffee',imp:'primary'}],
            objects:[], activity:[], event:[], weather:[], environment:[] },
      relations:['PEOPLE.FAMILY → PLACE.HOME'],
      displayTags:['home','coffee','family'] },

    // ── Dec 4, 2023 — Bangalore ───────────────────────────────────────────
    { id:'p031', date:'2023-12-04', captureTime:'18:30', dateStr:'Dec 4, 2023', loc:'Bangalore',
      url:'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=400&q=80',
      sem:{ place:[{id:'PLACE.CITY',label:'City',imp:'primary'},{id:'PLACE.STREET',label:'Street',imp:'secondary'}],
            people:[{id:'PEOPLE.FRIENDS',label:'Friends',imp:'primary'}],
            activity:[{id:'ACTIVITY.SOCIAL.HANGOUT',label:'Hangout',imp:'primary'}],
            objects:[{id:'TRANSPORT.CAR',label:'Cars on street',imp:'incidental'}],
            food:[], event:[], weather:[], environment:[] },
      relations:['PEOPLE.FRIENDS → hanging out → PLACE.CITY'],
      displayTags:['city','friends','hangout'] },

    { id:'p032', date:'2023-12-04', captureTime:'16:00', dateStr:'Dec 4, 2023', loc:'Bangalore',
      url:'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=401&q=80',
      sem:{ place:[{id:'PLACE.CAFE',label:'Café',imp:'primary'}],
            people:[{id:'PEOPLE.FRIENDS',label:'Friends',imp:'primary'}],
            food:[{id:'FOOD.BEVERAGE.COFFEE',label:'Coffee',imp:'secondary'}],
            activity:[{id:'ACTIVITY.SOCIAL.HANGOUT',label:'Hangout',imp:'primary'}],
            objects:[], event:[], weather:[], environment:[] },
      relations:['PEOPLE.FRIENDS → hanging out → PLACE.CAFE'],
      displayTags:['café','friends','hangout'] },

    { id:'p033', date:'2023-12-04', captureTime:'19:30', dateStr:'Dec 4, 2023', loc:'Bangalore',
      url:'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=401&q=80',
      sem:{ place:[{id:'PLACE.CAFE',label:'Café',imp:'primary'}],
            people:[{id:'PEOPLE.SOLO',label:'Solo',imp:'primary'}],
            food:[{id:'FOOD.BEVERAGE.COFFEE',label:'Coffee',imp:'primary'}],
            activity:[], objects:[], event:[], weather:[], environment:[] },
      relations:['PEOPLE.SOLO → alone with → FOOD.BEVERAGE.COFFEE → at → PLACE.CAFE'],
      displayTags:['café','solo','coffee'] },

    // ── Dec 25, 2023 — Christmas ──────────────────────────────────────────
    { id:'p034', date:'2023-12-25', captureTime:'20:00', dateStr:'Dec 25, 2023', loc:'Bangalore',
      url:'https://images.unsplash.com/photo-1449495169669-7b118f960251?auto=format&fit=crop&w=400&q=80',
      sem:{ event:[{id:'EVENT.CHRISTMAS',label:'Christmas',imp:'primary'}],
            people:[{id:'PEOPLE.FAMILY',label:'Family',imp:'primary'}],
            activity:[{id:'ACTIVITY.SOCIAL.PARTY',label:'Celebration',imp:'primary'}],
            place:[{id:'PLACE.HOME',label:'Home',imp:'secondary'}],
            objects:[], food:[], weather:[], environment:[] },
      relations:['PEOPLE.FAMILY → celebrating → EVENT.CHRISTMAS → at → PLACE.HOME'],
      displayTags:['christmas','family','celebration'] },

    { id:'p035', date:'2023-12-25', captureTime:'21:30', dateStr:'Dec 25, 2023', loc:'Bangalore',
      url:'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=400&q=80',
      sem:{ event:[{id:'EVENT.CHRISTMAS',label:'Christmas',imp:'primary'}],
            people:[{id:'PEOPLE.FAMILY',label:'Family',imp:'primary'}],
            food:[{id:'FOOD.DINING',label:'Christmas dinner',imp:'primary'}],
            place:[{id:'PLACE.HOME',label:'Home',imp:'secondary'}],
            objects:[], activity:[], weather:[], environment:[] },
      relations:['PEOPLE.FAMILY → christmas dinner → FOOD.DINING → PLACE.HOME'],
      displayTags:['christmas','family','dinner'] },

    { id:'p036', date:'2023-12-25', captureTime:'22:30', dateStr:'Dec 25, 2023', loc:'Bangalore',
      url:'https://images.unsplash.com/photo-1418985991508-e47386d96a71?auto=format&fit=crop&w=400&q=80',
      sem:{ event:[{id:'EVENT.CHRISTMAS',label:'Christmas',imp:'primary'}],
            people:[{id:'PEOPLE.FRIENDS',label:'Friends',imp:'primary'}],
            activity:[{id:'ACTIVITY.SOCIAL.PARTY',label:'Party',imp:'primary'}],
            place:[{id:'PLACE.HOME',label:'Home',imp:'secondary'}],
            objects:[], food:[], weather:[], environment:[] },
      relations:['PEOPLE.FRIENDS → christmas party → ACTIVITY.SOCIAL.PARTY'],
      displayTags:['christmas','friends','party'] },
  ];

  // ==========================================================================
  // 6. DOM REFS
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
  // 7. STATE
  // ==========================================================================
  let activeQuery    = '';
  let rawTokens      = [];
  let activeConcepts = new Set();
  let matchIds       = [];
  let currentMatchIdx = 0;
  let activePreset   = 'any';
  let tfFrom = null;
  let tfTo   = null;

  // ==========================================================================
  // 8. QUERY RESOLVER: raw text → canonical concept IDs (10 languages)
  // ==========================================================================
  function resolveQuery(rawText) {
    const tokens = rawText.toLowerCase().trim().split(/[\s,+]+/).filter(Boolean);
    const concepts = new Set();
    tokens.forEach(token => {
      if (ALIAS_MAP.has(token)) {
        ALIAS_MAP.get(token).forEach(c => concepts.add(c));
        return;
      }
      for (const [alias, cids] of ALIAS_MAP.entries()) {
        if (alias.length > 2 && (alias.includes(token) || token.includes(alias))) {
          cids.forEach(c => concepts.add(c));
        }
      }
    });
    return { concepts, rawTokens: tokens };
  }

  // ==========================================================================
  // 9. IMPORTANCE-AWARE HIERARCHICAL MATCH SCORER
  //    Score = conceptRelevance × importanceWeight
  //    Incidental → always 0 (background car never surfaces)
  // ==========================================================================
  function scorePhoto(photo, queryConcepts) {
    if (queryConcepts.size === 0) return 0;

    // Merge visual semantics + auto-derived time concepts
    const timeConcepts = deriveTimeConcepts(photo.date, photo.captureTime);
    const allElements  = [];
    Object.values(photo.sem).forEach(dim => {
      if (Array.isArray(dim)) dim.forEach(el => allElements.push(el));
    });
    timeConcepts.forEach(el => allElements.push(el));

    let totalScore = 0;
    for (const qc of queryConcepts) {
      let bestScore = 0;
      for (const el of allElements) {
        if (el.imp === 'incidental') continue; // never
        const rel = conceptRelevance(qc, el.id);
        if (rel === 0) continue;
        const impW = el.imp === 'primary' ? 10 : 4; // secondary = 4
        const s = rel * impW;
        if (s > bestScore) bestScore = s;
      }
      totalScore += bestScore;
    }
    return totalScore;
  }

  // ==========================================================================
  // 10. BUILD TIMELINE
  // ==========================================================================
  function buildTimeline() {
    const groups = {};
    PHOTO_DB.forEach(p => {
      if (!groups[p.date]) groups[p.date] = { dateStr:p.dateStr, loc:p.loc, photos:[] };
      groups[p.date].photos.push(p);
    });
    Object.keys(groups).sort().forEach(date => {
      const g = groups[date];
      const groupEl = document.createElement('div');
      groupEl.className = 'gp-group'; groupEl.id = `grp-${date}`;
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
        cell.innerHTML = `
          <img src="${photo.url}" alt="${photo.dateStr} · ${photo.loc}" loading="lazy" />
          <div class="gp-match-dot"></div>
          <div class="gp-photo-tags">
            ${photo.displayTags.map(t=>`<span class="gp-photo-tag-chip">${t}</span>`).join('')}
          </div>`;
        cell.addEventListener('click', () => openViewer(photo));
        grid.appendChild(cell);
      });
      groupEl.appendChild(grid);
      gpTimeline.appendChild(groupEl);
    });
    adjustTimelinePadding();
  }

  function adjustTimelinePadding() {
    const tb = document.querySelector('.gp-top-bar');
    if (tb) gpTimeline.style.paddingTop = tb.offsetHeight + 'px';
  }

  // ==========================================================================
  // 11. SEARCH
  // ==========================================================================
  function doSearch(rawQuery) {
    activeQuery = rawQuery.trim();
    if (!activeQuery) { clearSearch(); return; }
    const resolved = resolveQuery(activeQuery);
    activeConcepts = resolved.concepts;
    rawTokens      = resolved.rawTokens;

    matchIds = [];
    PHOTO_DB.forEach(photo => {
      const cell = document.getElementById(`cell-${photo.id}`);
      if (!cell) return;
      cell.classList.remove('is-match','is-match-secondary','is-current-match');

      if (!isInTimeframe(new Date(photo.date))) return;

      const score = scorePhoto(photo, activeConcepts);
      if (score >= 10) {                      // strong match (at least one primary-exact)
        cell.classList.add('is-match');
        matchIds.push(photo.id);
      } else if (score >= 4) {                // secondary/parent match
        cell.classList.add('is-match-secondary');
        matchIds.push(photo.id);
      }
      cell.dataset.score = score;
    });

    // Keep chronological order
    matchIds.sort((a,b) => {
      const pA = PHOTO_DB.find(p=>p.id===a);
      const pB = PHOTO_DB.find(p=>p.id===b);
      return pA.date < pB.date ? -1 : pA.date > pB.date ? 1 : parseInt(a.slice(1))-parseInt(b.slice(1));
    });

    renderTagChips();
    if (matchIds.length > 0) {
      const tfSuffix = activePreset !== 'any' ? ` within ${timeframeBtnLabel.textContent}` : '';
      searchInfoText.textContent = `Found ${matchIds.length} matching photo${matchIds.length>1?'s':''}${tfSuffix}`;
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
    document.querySelectorAll('.gp-photo-cell.is-current-match').forEach(c=>c.classList.remove('is-current-match'));
    if (!matchIds.length) return;
    const cell = document.getElementById(`cell-${matchIds[currentMatchIdx]}`);
    if (cell) cell.classList.add('is-current-match');
  }
  function scrollToCurrentMatch() {
    if (!matchIds.length) return;
    const cell = document.getElementById(`cell-${matchIds[currentMatchIdx]}`);
    if (cell) cell.scrollIntoView({ behavior:'smooth', block:'center' });
  }
  function updateNavigator() {
    navCounter.textContent = `${currentMatchIdx+1} of ${matchIds.length}`;
    btnPrevMatch.disabled = currentMatchIdx <= 0;
    btnNextMatch.disabled = currentMatchIdx >= matchIds.length-1;
  }
  function renderTagChips() {
    searchTagsList.innerHTML = '';
    rawTokens.forEach(term => {
      const chip = document.createElement('div');
      chip.className = 'gp-search-tag-chip';
      chip.innerHTML = `<span>${term}</span><button class="gp-search-tag-remove" data-term="${term}">✕</button>`;
      chip.querySelector('.gp-search-tag-remove').addEventListener('click', () => {
        const nq = rawTokens.filter(t=>t!==term).join(' ');
        searchInput.value = nq;
        nq ? doSearch(nq) : clearSearch();
      });
      searchTagsList.appendChild(chip);
    });
    searchTagsRow.style.display = rawTokens.length ? 'flex' : 'none';
    adjustTimelinePadding();
  }
  function clearSearch() {
    activeQuery=''; rawTokens=[]; activeConcepts=new Set(); matchIds=[]; currentMatchIdx=0;
    searchInput.value=''; btnClearSearch.style.display='none';
    searchInfoBar.style.display='none'; searchTagsRow.style.display='none';
    matchNavigator.style.display='none'; suggestionsOverlay.style.display='none';
    searchTagsList.innerHTML='';
    document.querySelectorAll('.gp-photo-cell').forEach(c=>c.classList.remove('is-match','is-match-secondary','is-current-match'));
    adjustTimelinePadding();
  }

  // ==========================================================================
  // 12. SEARCH INPUT EVENTS
  // ==========================================================================
  searchInput.addEventListener('focus', () => { if (!searchInput.value.trim()) suggestionsOverlay.style.display='block'; });
  searchInput.addEventListener('input', () => {
    btnClearSearch.style.display = searchInput.value ? 'flex' : 'none';
    if (!searchInput.value.trim()) { suggestionsOverlay.style.display='block'; clearSearch(); }
    else suggestionsOverlay.style.display='none';
  });
  searchInput.addEventListener('keydown', e => {
    if (e.key==='Enter') { suggestionsOverlay.style.display='none'; searchInput.blur(); doSearch(searchInput.value); }
    if (e.key==='Escape') { clearSearch(); searchInput.blur(); }
  });
  btnClearSearch.addEventListener('click', () => { clearSearch(); searchInput.focus(); });
  document.addEventListener('click', e => {
    if (!e.target.closest('#gpSearchBar') && !e.target.closest('#suggestionsOverlay'))
      suggestionsOverlay.style.display='none';
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
  // 13. NEXT / PREVIOUS NAVIGATION
  // ==========================================================================
  btnNextMatch.addEventListener('click', () => {
    if (currentMatchIdx < matchIds.length-1) { currentMatchIdx++; highlightCurrentMatch(); scrollToCurrentMatch(); updateNavigator(); }
  });
  btnPrevMatch.addEventListener('click', () => {
    if (currentMatchIdx > 0) { currentMatchIdx--; highlightCurrentMatch(); scrollToCurrentMatch(); updateNavigator(); }
  });
  btnGoHome.addEventListener('click', () => { clearSearch(); window.scrollTo({top:0,behavior:'smooth'}); });

  // ==========================================================================
  // 14. TIME FRAME FILTER (date-range — separate from semantic time-of-day tags)
  // ==========================================================================
  function isInTimeframe(photoDate) {
    if (activePreset==='any') return true;
    if (tfFrom && photoDate < tfFrom) return false;
    if (tfTo   && photoDate > tfTo)   return false;
    return true;
  }
  function applyPreset(preset) {
    const now=new Date(), today=new Date(now.getFullYear(),now.getMonth(),now.getDate());
    activePreset=preset; tfFrom=null; tfTo=null;
    if (preset==='today') { tfFrom=today; tfTo=new Date(today.getTime()+86399999); }
    else if (preset==='week') { const d=today.getDay(); tfFrom=new Date(today); tfFrom.setDate(today.getDate()-d); tfTo=new Date(today); tfTo.setDate(today.getDate()+(6-d)); }
    else if (preset==='month') { tfFrom=new Date(now.getFullYear(),now.getMonth(),1); tfTo=new Date(now.getFullYear(),now.getMonth()+1,0); }
    else if (preset==='year') { tfFrom=new Date(now.getFullYear(),0,1); tfTo=new Date(now.getFullYear(),11,31); }
    else if (preset==='last_year') { tfFrom=new Date(now.getFullYear()-1,0,1); tfTo=new Date(now.getFullYear()-1,11,31); }
  }
  function timeframeLabel() {
    if (activePreset==='any') return null;
    if (activePreset==='today') return 'Today';
    if (activePreset==='week') return 'This week';
    if (activePreset==='month') return 'This month';
    if (activePreset==='year') return 'This year';
    if (activePreset==='last_year') return 'Last year';
    if (activePreset==='custom'&&tfFrom&&tfTo) return `${fmtDate(tfFrom)} – ${fmtDate(tfTo)}`;
    return null;
  }
  function fmtDate(d) { return d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}); }
  function updateTimeframeUI() {
    const label=timeframeLabel();
    if (label) { timeframeBtnLabel.textContent=label; btnTimeframe.classList.add('active'); timeframeActivePillText.textContent=label; timeframeActiveRow.style.display='block'; }
    else { timeframeBtnLabel.textContent='Any time'; btnTimeframe.classList.remove('active'); timeframeActiveRow.style.display='none'; }
    if (rawTokens.length) doSearch(searchInput.value);
    adjustTimelinePadding();
  }
  function openDropdown() {
    const r=document.getElementById('timeframeRow').getBoundingClientRect();
    timeframeDropdown.style.top=(r.bottom+4)+'px'; timeframeDropdown.style.display='block';
    btnTimeframe.setAttribute('aria-expanded','true');
    document.querySelectorAll('.gp-tf-option').forEach(o=>o.classList.toggle('selected',o.dataset.preset===activePreset));
  }
  function closeDropdown() { timeframeDropdown.style.display='none'; btnTimeframe.setAttribute('aria-expanded','false'); tfCustomPanel.style.display='none'; }
  btnTimeframe.addEventListener('click', e=>{e.stopPropagation(); timeframeDropdown.style.display==='none'?openDropdown():closeDropdown();});
  document.addEventListener('click', e=>{ if (!e.target.closest('#timeframeDropdown')&&!e.target.closest('#btnTimeframe')) closeDropdown(); });
  document.querySelectorAll('.gp-tf-option').forEach(opt=>{
    opt.addEventListener('click', ()=>{
      if (opt.dataset.preset==='custom') { tfCustomPanel.style.display='flex'; document.querySelectorAll('.gp-tf-option').forEach(o=>o.classList.toggle('selected',o.dataset.preset==='custom')); return; }
      applyPreset(opt.dataset.preset); closeDropdown(); updateTimeframeUI();
    });
  });
  btnApplyCustom.addEventListener('click', ()=>{
    if (!tfFromDate.value||!tfToDate.value) return;
    activePreset='custom'; tfFrom=new Date(tfFromDate.value); tfTo=new Date(tfToDate.value); tfTo.setHours(23,59,59,999);
    closeDropdown(); updateTimeframeUI();
  });
  btnClearTimeframe.addEventListener('click', ()=>{ applyPreset('any'); updateTimeframeUI(); });

  // ==========================================================================
  // 15. PHOTO VIEWER — shows visual semantics + auto-derived time tags
  // ==========================================================================
  function openViewer(photo) {
    viewerImg.src = photo.url;
    viewerDate.textContent = photo.dateStr + (photo.captureTime ? ' · ' + formatTime(photo.captureTime) : '');
    viewerLoc.textContent  = photo.loc;

    // Visual semantic tags (primary bold, secondary normal, incidental hidden)
    const visEls = [];
    Object.values(photo.sem).forEach(dim => {
      if (!Array.isArray(dim)) return;
      dim.forEach(el => { if (el.imp !== 'incidental') visEls.push(el); });
    });

    // Auto-derived time tags
    const timeTags = deriveTimeConcepts(photo.date, photo.captureTime);

    const tagHTML = [
      ...visEls.map(el => `<span class="gp-viewer-tag ${el.imp==='primary'?'gp-viewer-tag-primary':''}">${el.label}</span>`),
      ...timeTags.map(el => `<span class="gp-viewer-tag gp-viewer-tag-time">${el.label}</span>`),
    ].join('');

    const relHTML = (photo.relations||[]).map(r => `<div class="gp-viewer-relation">${r}</div>`).join('');

    viewerTags.innerHTML = tagHTML + (relHTML ? `<div class="gp-viewer-relations">${relHTML}</div>` : '');
    photoViewer.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }

  function formatTime(hhmm) {
    const [h, m] = hhmm.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${h%12||12}:${String(m).padStart(2,'0')} ${ampm}`;
  }

  function closeViewer() { photoViewer.style.display='none'; viewerImg.src=''; document.body.style.overflow=''; }
  btnViewerClose.addEventListener('click', closeViewer);
  document.addEventListener('keydown', e=>{ if (e.key==='Escape'&&photoViewer.style.display!=='none') closeViewer(); });

  // INIT
  buildTimeline();
});
