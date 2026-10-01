/**
 * Benchmark Test Suite: 100 Natural Language Memory Scenarios
 *
 * Scenarios rigorously evaluate anchor discovery across 5 distinct categories:
 * 1. Multi-Clue Balanced (Place + Activity + People + Time) - 25 scenarios
 * 2. Place & POI Dominant - 20 scenarios
 * 3. Activity & Action Dominant - 20 scenarios
 * 4. Temporal & Season Dominant - 20 scenarios
 * 5. People & Social Group Dominant - 15 scenarios
 */

export interface BenchmarkScenario {
  id: string;
  query: string;
  expectedEpisodeId: string;
  category: 'multi_clue' | 'place_dominant' | 'activity_dominant' | 'time_dominant' | 'people_dominant';
  clueDimensions: ('place' | 'activity' | 'people' | 'time')[];
  description: string;
}

export const BENCHMARK_SCENARIOS: BenchmarkScenario[] = [
  // ==========================================================================
  // Category 1: Multi-Clue Balanced (25 scenarios)
  // ==========================================================================
  {
    id: 'sc_001',
    query: 'those photos from Goa when we went to a café with friends in the evening',
    expectedEpisodeId: 'ep_anjuna_cafe_evening',
    category: 'multi_clue',
    clueDimensions: ['place', 'activity', 'people', 'time'],
    description: 'Target beach café evening with friends'
  },
  {
    id: 'sc_002',
    query: 'relaxing at Café Lilliput in Anjuna having dinner with friends at dusk',
    expectedEpisodeId: 'ep_anjuna_cafe_evening',
    category: 'multi_clue',
    clueDimensions: ['place', 'activity', 'people', 'time'],
    description: 'Specific venue Café Lilliput dinner'
  },
  {
    id: 'sc_003',
    query: 'watching the sunset on Baga beach with friends having beer in golden hour',
    expectedEpisodeId: 'ep_baga_sunset',
    category: 'multi_clue',
    clueDimensions: ['place', 'activity', 'people', 'time'],
    description: 'Baga beach sunset golden hour'
  },
  {
    id: 'sc_004',
    query: 'shopping around flea market stalls in Anjuna with friends on Friday afternoon',
    expectedEpisodeId: 'ep_anjuna_flea_market',
    category: 'multi_clue',
    clueDimensions: ['place', 'activity', 'people', 'time'],
    description: 'Anjuna flea market afternoon shopping'
  },
  {
    id: 'sc_005',
    query: 'arriving at the villa in Panaji and swimming in the pool with friends afternoon',
    expectedEpisodeId: 'ep_goa_checkin',
    category: 'multi_clue',
    clueDimensions: ['place', 'activity', 'people', 'time'],
    description: 'Villa checkin pool lounge in Panaji'
  },
  {
    id: 'sc_006',
    query: 'late night dancing and drinks at Curlies beach shack with friends',
    expectedEpisodeId: 'ep_curlies_night',
    category: 'multi_clue',
    clueDimensions: ['place', 'activity', 'people', 'time'],
    description: 'Curlies beach shack night party'
  },
  {
    id: 'sc_007',
    query: 'morning heritage church walk at Basilica of Bom Jesus in Old Goa with friends',
    expectedEpisodeId: 'ep_old_goa_heritage',
    category: 'multi_clue',
    clueDimensions: ['place', 'activity', 'people', 'time'],
    description: 'Basilica Old Goa morning heritage walk'
  },
  {
    id: 'sc_008',
    query: 'Sunday morning brunch with pastries in Latin Quarter Fontainhas with friends',
    expectedEpisodeId: 'ep_panaji_brunch',
    category: 'multi_clue',
    clueDimensions: ['place', 'activity', 'people', 'time'],
    description: 'Fontainhas brunch Sunday morning'
  },
  {
    id: 'sc_009',
    query: 'brewing morning filter coffee at home in Bangalore with mom and family',
    expectedEpisodeId: 'ep_home_bangalore_coffee',
    category: 'multi_clue',
    clueDimensions: ['place', 'activity', 'people', 'time'],
    description: 'Bangalore home morning filter coffee'
  },
  {
    id: 'sc_010',
    query: 'drinking evening coffee with Rohan and Vikram at an outdoor beach café in Goa',
    expectedEpisodeId: 'ep_anjuna_cafe_evening',
    category: 'multi_clue',
    clueDimensions: ['place', 'activity', 'people', 'time'],
    description: 'Named friends coffee beach cafe'
  },
  {
    id: 'sc_011',
    query: 'golden hour sunset drinks with Ananya on the sand at Baga beach',
    expectedEpisodeId: 'ep_baga_sunset',
    category: 'multi_clue',
    clueDimensions: ['place', 'activity', 'people', 'time'],
    description: 'Sunset drinks with friend on beach sand'
  },
  {
    id: 'sc_012',
    query: 'browsing clothes and jewelry at Anjuna market with friends in the afternoon sun',
    expectedEpisodeId: 'ep_anjuna_flea_market',
    category: 'multi_clue',
    clueDimensions: ['place', 'activity', 'people', 'time'],
    description: 'Market clothes browsing afternoon'
  },
  {
    id: 'sc_013',
    query: 'midnight cocktails and trance music with friends on Anjuna beach',
    expectedEpisodeId: 'ep_curlies_night',
    category: 'multi_clue',
    clueDimensions: ['place', 'activity', 'people', 'time'],
    description: 'Midnight beach cocktails and music'
  },
  {
    id: 'sc_014',
    query: 'visiting old Portuguese churches in Old Goa with friends during the morning',
    expectedEpisodeId: 'ep_old_goa_heritage',
    category: 'multi_clue',
    clueDimensions: ['place', 'activity', 'people', 'time'],
    description: 'Portuguese churches Old Goa'
  },
  {
    id: 'sc_015',
    query: 'having breakfast pastries at Bodega cafe in Panaji with friends in morning',
    expectedEpisodeId: 'ep_panaji_brunch',
    category: 'multi_clue',
    clueDimensions: ['place', 'activity', 'people', 'time'],
    description: 'Bodega cafe breakfast pastries'
  },
  {
    id: 'sc_016',
    query: 'unloading luggage and jumping into villa swimming pool in Panaji afternoon',
    expectedEpisodeId: 'ep_goa_checkin',
    category: 'multi_clue',
    clueDimensions: ['place', 'activity', 'people', 'time'],
    description: 'Luggage and swimming pool afternoon'
  },
  {
    id: 'sc_017',
    query: 'evening beach dining with friends watching ocean waves at Goa cafe',
    expectedEpisodeId: 'ep_anjuna_cafe_evening',
    category: 'multi_clue',
    clueDimensions: ['place', 'activity', 'people', 'time'],
    description: 'Beach dining ocean waves evening'
  },
  {
    id: 'sc_018',
    query: 'quiet weekend breakfast and filter coffee at home in Bangalore',
    expectedEpisodeId: 'ep_home_bangalore_coffee',
    category: 'multi_clue',
    clueDimensions: ['place', 'activity', 'people', 'time'],
    description: 'Quiet weekend breakfast at home'
  },
  {
    id: 'sc_019',
    query: 'sun setting over Arabian sea at Baga beach shacks with friends in evening',
    expectedEpisodeId: 'ep_baga_sunset',
    category: 'multi_clue',
    clueDimensions: ['place', 'activity', 'people', 'time'],
    description: 'Sun setting Arabian sea shacks'
  },
  {
    id: 'sc_020',
    query: 'exploring colorful colonial streets of Fontainhas with friends before noon',
    expectedEpisodeId: 'ep_panaji_brunch',
    category: 'multi_clue',
    clueDimensions: ['place', 'activity', 'people', 'time'],
    description: 'Colonial streets Fontainhas before noon'
  },
  {
    id: 'sc_021',
    query: 'admiring church architecture and altar at Bom Jesus Basilica in the morning',
    expectedEpisodeId: 'ep_old_goa_heritage',
    category: 'multi_clue',
    clueDimensions: ['place', 'activity', 'people', 'time'],
    description: 'Altar Bom Jesus morning architecture'
  },
  {
    id: 'sc_022',
    query: 'sipping warm coffee at our kitchen table in Bangalore on morning',
    expectedEpisodeId: 'ep_home_bangalore_coffee',
    category: 'multi_clue',
    clueDimensions: ['place', 'activity', 'people', 'time'],
    description: 'Kitchen table Bangalore morning coffee'
  },
  {
    id: 'sc_023',
    query: 'night party under neon lights with friends at Curlies shack',
    expectedEpisodeId: 'ep_curlies_night',
    category: 'multi_clue',
    clueDimensions: ['place', 'activity', 'people', 'time'],
    description: 'Neon lights party Curlies'
  },
  {
    id: 'sc_024',
    query: 'Friday afternoon shopping souvenirs at flea market with Rohan and Ananya',
    expectedEpisodeId: 'ep_anjuna_flea_market',
    category: 'multi_clue',
    clueDimensions: ['place', 'activity', 'people', 'time'],
    description: 'Souvenir flea market with named friends'
  },
  {
    id: 'sc_025',
    query: 'dusk dinner on the patio at Café Lilliput with our travel group',
    expectedEpisodeId: 'ep_anjuna_cafe_evening',
    category: 'multi_clue',
    clueDimensions: ['place', 'activity', 'people', 'time'],
    description: 'Patio Lilliput dusk dinner'
  },

  // ==========================================================================
  // Category 2: Place & POI Dominant (20 scenarios)
  // ==========================================================================
  { id: 'sc_026', query: 'photos taken at Café Lilliput in Goa', expectedEpisodeId: 'ep_anjuna_cafe_evening', category: 'place_dominant', clueDimensions: ['place'], description: 'Café Lilliput explicit POI' },
  { id: 'sc_027', query: 'our visit to Basilica of Bom Jesus', expectedEpisodeId: 'ep_old_goa_heritage', category: 'place_dominant', clueDimensions: ['place'], description: 'Bom Jesus explicit POI' },
  { id: 'sc_028', query: 'photos at Baga beach', expectedEpisodeId: 'ep_baga_sunset', category: 'place_dominant', clueDimensions: ['place'], description: 'Baga beach POI' },
  { id: 'sc_029', query: 'at the Anjuna flea market', expectedEpisodeId: 'ep_anjuna_flea_market', category: 'place_dominant', clueDimensions: ['place'], description: 'Anjuna flea market POI' },
  { id: 'sc_030', query: 'photos at Curlies beach shack', expectedEpisodeId: 'ep_curlies_night', category: 'place_dominant', clueDimensions: ['place'], description: 'Curlies beach shack POI' },
  { id: 'sc_031', query: 'in Fontainhas Latin Quarter', expectedEpisodeId: 'ep_panaji_brunch', category: 'place_dominant', clueDimensions: ['place'], description: 'Fontainhas neighborhood' },
  { id: 'sc_032', query: 'our heritage villa in Panaji', expectedEpisodeId: 'ep_goa_checkin', category: 'place_dominant', clueDimensions: ['place'], description: 'Heritage villa Panaji' },
  { id: 'sc_033', query: 'at home in Bangalore Indiranagar', expectedEpisodeId: 'ep_home_bangalore_coffee', category: 'place_dominant', clueDimensions: ['place'], description: 'Indiranagar Bangalore home' },
  { id: 'sc_034', query: 'pictures in Old Goa', expectedEpisodeId: 'ep_old_goa_heritage', category: 'place_dominant', clueDimensions: ['place'], description: 'Old Goa region' },
  { id: 'sc_035', query: 'beachfront cafe in Anjuna', expectedEpisodeId: 'ep_anjuna_cafe_evening', category: 'place_dominant', clueDimensions: ['place'], description: 'Anjuna beachfront cafe' },
  { id: 'sc_036', query: 'Baga beach shacks', expectedEpisodeId: 'ep_baga_sunset', category: 'place_dominant', clueDimensions: ['place'], description: 'Baga shacks' },
  { id: 'sc_037', query: 'Bodega cafe courtyard in Panaji', expectedEpisodeId: 'ep_panaji_brunch', category: 'place_dominant', clueDimensions: ['place'], description: 'Bodega courtyard' },
  { id: 'sc_038', query: 'the villa resort pool in Goa', expectedEpisodeId: 'ep_goa_checkin', category: 'place_dominant', clueDimensions: ['place'], description: 'Villa resort pool' },
  { id: 'sc_039', query: 'Anjuna seaside market stalls', expectedEpisodeId: 'ep_anjuna_flea_market', category: 'place_dominant', clueDimensions: ['place'], description: 'Anjuna market stalls' },
  { id: 'sc_040', query: 'our apartment in Bangalore', expectedEpisodeId: 'ep_home_bangalore_coffee', category: 'place_dominant', clueDimensions: ['place'], description: 'Bangalore apartment' },
  { id: 'sc_041', query: 'historic monument in Old Goa', expectedEpisodeId: 'ep_old_goa_heritage', category: 'place_dominant', clueDimensions: ['place'], description: 'Historic monument Old Goa' },
  { id: 'sc_042', query: 'nightclub shack at south Anjuna beach', expectedEpisodeId: 'ep_curlies_night', category: 'place_dominant', clueDimensions: ['place'], description: 'South Anjuna shack' },
  { id: 'sc_043', query: 'yellow Portuguese houses in Fontainhas', expectedEpisodeId: 'ep_panaji_brunch', category: 'place_dominant', clueDimensions: ['place'], description: 'Portuguese houses Fontainhas' },
  { id: 'sc_044', query: 'villa checkin stay in Panaji', expectedEpisodeId: 'ep_goa_checkin', category: 'place_dominant', clueDimensions: ['place'], description: 'Villa checkin stay' },
  { id: 'sc_045', query: 'sunset coast at Baga', expectedEpisodeId: 'ep_baga_sunset', category: 'place_dominant', clueDimensions: ['place'], description: 'Sunset coast Baga' },

  // ==========================================================================
  // Category 3: Activity & Action Dominant (20 scenarios)
  // ==========================================================================
  { id: 'sc_046', query: 'drinking evening tea and dinner at a seaside café', expectedEpisodeId: 'ep_anjuna_cafe_evening', category: 'activity_dominant', clueDimensions: ['activity'], description: 'Drinking evening tea and dinner' },
  { id: 'sc_047', query: 'watching the sunset by the waves', expectedEpisodeId: 'ep_baga_sunset', category: 'activity_dominant', clueDimensions: ['activity'], description: 'Watching sunset by waves' },
  { id: 'sc_048', query: 'flea market shopping and handicraft stalls', expectedEpisodeId: 'ep_anjuna_flea_market', category: 'activity_dominant', clueDimensions: ['activity'], description: 'Flea market shopping' },
  { id: 'sc_049', query: 'swimming in the villa pool and luggage arrival', expectedEpisodeId: 'ep_goa_checkin', category: 'activity_dominant', clueDimensions: ['activity'], description: 'Swimming pool and luggage' },
  { id: 'sc_050', query: 'late night dancing and clubbing at beach shack', expectedEpisodeId: 'ep_curlies_night', category: 'activity_dominant', clueDimensions: ['activity'], description: 'Late night clubbing' },
  { id: 'sc_051', query: 'historic church sightseeing and architecture tour', expectedEpisodeId: 'ep_old_goa_heritage', category: 'activity_dominant', clueDimensions: ['activity'], description: 'Church sightseeing tour' },
  { id: 'sc_052', query: 'brunch pastries, waffles, and iced coffee', expectedEpisodeId: 'ep_panaji_brunch', category: 'activity_dominant', clueDimensions: ['activity'], description: 'Brunch pastries and coffee' },
  { id: 'sc_053', query: 'making south Indian filter coffee in the kitchen', expectedEpisodeId: 'ep_home_bangalore_coffee', category: 'activity_dominant', clueDimensions: ['activity'], description: 'Making filter coffee' },
  { id: 'sc_054', query: 'eating dinner with snacks and coffee at cafe', expectedEpisodeId: 'ep_anjuna_cafe_evening', category: 'activity_dominant', clueDimensions: ['activity'], description: 'Eating dinner and snacks' },
  { id: 'sc_055', query: 'walking on the beach during golden hour sunset', expectedEpisodeId: 'ep_baga_sunset', category: 'activity_dominant', clueDimensions: ['activity'], description: 'Walking on beach golden hour' },
  { id: 'sc_056', query: 'bargaining for clothes at the flea market', expectedEpisodeId: 'ep_anjuna_flea_market', category: 'activity_dominant', clueDimensions: ['activity'], description: 'Bargaining for clothes' },
  { id: 'sc_057', query: 'cocktails and music party at seaside shack', expectedEpisodeId: 'ep_curlies_night', category: 'activity_dominant', clueDimensions: ['activity'], description: 'Cocktails and music party' },
  { id: 'sc_058', query: 'heritage monument exploration walk', expectedEpisodeId: 'ep_old_goa_heritage', category: 'activity_dominant', clueDimensions: ['activity'], description: 'Monument exploration walk' },
  { id: 'sc_059', query: 'Sunday morning brunch dining in Goa', expectedEpisodeId: 'ep_panaji_brunch', category: 'activity_dominant', clueDimensions: ['activity'], description: 'Sunday brunch dining' },
  { id: 'sc_060', query: 'weekend morning coffee brewing at home', expectedEpisodeId: 'ep_home_bangalore_coffee', category: 'activity_dominant', clueDimensions: ['activity'], description: 'Weekend coffee brewing' },
  { id: 'sc_061', query: 'beach dining with dinner plates and drinks', expectedEpisodeId: 'ep_anjuna_cafe_evening', category: 'activity_dominant', clueDimensions: ['activity'], description: 'Beach dining plates' },
  { id: 'sc_062', query: 'holding beer bottles watching sunset over ocean', expectedEpisodeId: 'ep_baga_sunset', category: 'activity_dominant', clueDimensions: ['activity'], description: 'Holding beer sunset' },
  { id: 'sc_063', query: 'browsing colorful stalls and hippie clothes', expectedEpisodeId: 'ep_anjuna_flea_market', category: 'activity_dominant', clueDimensions: ['activity'], description: 'Browsing hippie clothes' },
  { id: 'sc_064', query: 'late night beach rave party', expectedEpisodeId: 'ep_curlies_night', category: 'activity_dominant', clueDimensions: ['activity'], description: 'Late night beach rave' },
  { id: 'sc_065', query: 'admiring church paintings and sacred relics', expectedEpisodeId: 'ep_old_goa_heritage', category: 'activity_dominant', clueDimensions: ['activity'], description: 'Church paintings relics' },

  // ==========================================================================
  // Category 4: Temporal & Solar Time Dominant (20 scenarios)
  // ==========================================================================
  { id: 'sc_066', query: 'Friday evening dinner at beach café', expectedEpisodeId: 'ep_anjuna_cafe_evening', category: 'time_dominant', clueDimensions: ['time'], description: 'Friday evening' },
  { id: 'sc_067', query: 'Thursday golden hour sunset at Baga', expectedEpisodeId: 'ep_baga_sunset', category: 'time_dominant', clueDimensions: ['time'], description: 'Thursday golden hour' },
  { id: 'sc_068', query: 'Friday afternoon at the flea market', expectedEpisodeId: 'ep_anjuna_flea_market', category: 'time_dominant', clueDimensions: ['time'], description: 'Friday afternoon' },
  { id: 'sc_069', query: 'Thursday afternoon villa checkin', expectedEpisodeId: 'ep_goa_checkin', category: 'time_dominant', clueDimensions: ['time'], description: 'Thursday afternoon' },
  { id: 'sc_070', query: 'Friday night party at Curlies', expectedEpisodeId: 'ep_curlies_night', category: 'time_dominant', clueDimensions: ['time'], description: 'Friday night' },
  { id: 'sc_071', query: 'Saturday morning church heritage walk', expectedEpisodeId: 'ep_old_goa_heritage', category: 'time_dominant', clueDimensions: ['time'], description: 'Saturday morning' },
  { id: 'sc_072', query: 'Sunday morning brunch in Panaji', expectedEpisodeId: 'ep_panaji_brunch', category: 'time_dominant', clueDimensions: ['time'], description: 'Sunday morning brunch' },
  { id: 'sc_073', query: 'October morning coffee at home', expectedEpisodeId: 'ep_home_bangalore_coffee', category: 'time_dominant', clueDimensions: ['time'], description: 'October morning coffee' },
  { id: 'sc_074', query: 'evening dusk photos at Goa café', expectedEpisodeId: 'ep_anjuna_cafe_evening', category: 'time_dominant', clueDimensions: ['time'], description: 'Evening dusk cafe' },
  { id: 'sc_075', query: 'sunset golden hour on beach', expectedEpisodeId: 'ep_baga_sunset', category: 'time_dominant', clueDimensions: ['time'], description: 'Sunset golden hour' },
  { id: 'sc_076', query: 'afternoon market shopping under the sun', expectedEpisodeId: 'ep_anjuna_flea_market', category: 'time_dominant', clueDimensions: ['time'], description: 'Afternoon sun market' },
  { id: 'sc_077', query: 'midnight trance party at shack', expectedEpisodeId: 'ep_curlies_night', category: 'time_dominant', clueDimensions: ['time'], description: 'Midnight trance shack' },
  { id: 'sc_078', query: 'morning church walk in Old Goa', expectedEpisodeId: 'ep_old_goa_heritage', category: 'time_dominant', clueDimensions: ['time'], description: 'Morning church walk' },
  { id: 'sc_079', query: 'late morning brunch on Sunday in Goa', expectedEpisodeId: 'ep_panaji_brunch', category: 'time_dominant', clueDimensions: ['time'], description: 'Late morning Sunday brunch' },
  { id: 'sc_080', query: 'dusk dinner with evening breeze', expectedEpisodeId: 'ep_anjuna_cafe_evening', category: 'time_dominant', clueDimensions: ['time'], description: 'Dusk dinner evening breeze' },
  { id: 'sc_081', query: 'golden hour sunset over sea waves', expectedEpisodeId: 'ep_baga_sunset', category: 'time_dominant', clueDimensions: ['time'], description: 'Golden hour waves' },
  { id: 'sc_082', query: 'post lunch pool lounge at villa', expectedEpisodeId: 'ep_goa_checkin', category: 'time_dominant', clueDimensions: ['time'], description: 'Post lunch pool lounge' },
  { id: 'sc_083', query: '2 AM night drinks on the beach', expectedEpisodeId: 'ep_curlies_night', category: 'time_dominant', clueDimensions: ['time'], description: '2 AM night drinks' },
  { id: 'sc_084', query: '10 AM Sunday brunch pastries in Goa', expectedEpisodeId: 'ep_panaji_brunch', category: 'time_dominant', clueDimensions: ['time'], description: '10 AM Sunday brunch' },
  { id: 'sc_085', query: '8:30 AM morning coffee brewing', expectedEpisodeId: 'ep_home_bangalore_coffee', category: 'time_dominant', clueDimensions: ['time'], description: '8:30 AM morning coffee' },

  // ==========================================================================
  // Category 5: People & Social Group Dominant (15 scenarios)
  // ==========================================================================
  { id: 'sc_086', query: 'photos with friends having dinner at café in Goa', expectedEpisodeId: 'ep_anjuna_cafe_evening', category: 'people_dominant', clueDimensions: ['people'], description: 'Friends dinner at cafe' },
  { id: 'sc_087', query: 'hanging out with Rohan, Ananya and Vikram at sunset', expectedEpisodeId: 'ep_baga_sunset', category: 'people_dominant', clueDimensions: ['people'], description: 'Named friends sunset' },
  { id: 'sc_088', query: 'shopping with friends at the flea market', expectedEpisodeId: 'ep_anjuna_flea_market', category: 'people_dominant', clueDimensions: ['people'], description: 'Shopping with friends' },
  { id: 'sc_089', query: 'swimming pool photos with our friends group', expectedEpisodeId: 'ep_goa_checkin', category: 'people_dominant', clueDimensions: ['people'], description: 'Friends group pool' },
  { id: 'sc_090', query: 'party photos with friends dancing at night shack', expectedEpisodeId: 'ep_curlies_night', category: 'people_dominant', clueDimensions: ['people'], description: 'Friends dancing shack' },
  { id: 'sc_091', query: 'heritage photos with friends at Bom Jesus church', expectedEpisodeId: 'ep_old_goa_heritage', category: 'people_dominant', clueDimensions: ['people'], description: 'Friends Bom Jesus church' },
  { id: 'sc_092', query: 'Sunday brunch with friends in Fontainhas', expectedEpisodeId: 'ep_panaji_brunch', category: 'people_dominant', clueDimensions: ['people'], description: 'Friends Sunday brunch' },
  { id: 'sc_093', query: 'quiet morning with mom having coffee at home', expectedEpisodeId: 'ep_home_bangalore_coffee', category: 'people_dominant', clueDimensions: ['people'], description: 'Quiet morning with mom' },
  { id: 'sc_094', query: 'sitting with Vikram at Café Lilliput in Goa', expectedEpisodeId: 'ep_anjuna_cafe_evening', category: 'people_dominant', clueDimensions: ['people'], description: 'Sitting with Vikram cafe' },
  { id: 'sc_095', query: 'standing with Ananya on the beach at sunset', expectedEpisodeId: 'ep_baga_sunset', category: 'people_dominant', clueDimensions: ['people'], description: 'Standing with Ananya sunset' },
  { id: 'sc_096', query: 'group photo with friends at villa arrival', expectedEpisodeId: 'ep_goa_checkin', category: 'people_dominant', clueDimensions: ['people'], description: 'Group photo villa arrival' },
  { id: 'sc_097', query: 'walking with friends around Old Goa churches', expectedEpisodeId: 'ep_old_goa_heritage', category: 'people_dominant', clueDimensions: ['people'], description: 'Walking with friends Old Goa' },
  { id: 'sc_098', query: 'laughing with Rohan and friends over Sunday brunch', expectedEpisodeId: 'ep_panaji_brunch', category: 'people_dominant', clueDimensions: ['people'], description: 'Laughing over brunch with Rohan' },
  { id: 'sc_099', query: 'family coffee time with mom in Bangalore', expectedEpisodeId: 'ep_home_bangalore_coffee', category: 'people_dominant', clueDimensions: ['people'], description: 'Family coffee with mom' },
  { id: 'sc_100', query: 'late night group selfies with friends at shack', expectedEpisodeId: 'ep_curlies_night', category: 'people_dominant', clueDimensions: ['people'], description: 'Late night selfies with friends' }
];
