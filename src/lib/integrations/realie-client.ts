/**
 * Realie.ai Property Data API Client
 *
 * Primary source for property data: ownership, tax assessments, sales history,
 * valuations, and parcel boundaries sourced directly from county records.
 *
 * API Documentation: https://docs.realie.ai
 *
 * Authentication: API Key passed in x-api-key header
 * Base URL: https://api.realie.ai/v1
 */

const DEFAULT_BASE_URL = "https://app.realie.ai/api/public";

// Realie /property/search/ requires state. Map zip code prefixes → state.
const ZIP_PREFIX_TO_STATE: Record<string, string> = {
  "005":"NY","006":"PR","007":"PR","008":"VI","009":"PR",
  "010":"MA","011":"MA","012":"MA","013":"MA","014":"MA","015":"MA","016":"MA","017":"MA","018":"MA","019":"MA",
  "020":"MA","021":"MA","022":"MA","023":"MA","024":"MA","025":"MA","026":"MA","027":"MA",
  "028":"RI","029":"RI",
  "030":"NH","031":"NH","032":"NH","033":"NH","034":"NH","035":"NH","036":"NH","037":"NH","038":"NH",
  "039":"ME",
  "040":"ME","041":"ME","042":"ME","043":"ME","044":"ME","045":"ME","046":"ME","047":"ME","048":"ME","049":"ME",
  "050":"VT","051":"VT","052":"VT","053":"VT","054":"VT","055":"VT","056":"VT","057":"VT","058":"VT","059":"VT",
  "060":"CT","061":"CT","062":"CT","063":"CT","064":"CT","065":"CT","066":"CT","067":"CT","068":"CT","069":"CT",
  "070":"NJ","071":"NJ","072":"NJ","073":"NJ","074":"NJ","075":"NJ","076":"NJ","077":"NJ","078":"NJ","079":"NJ",
  "080":"NJ","081":"NJ","082":"NJ","083":"NJ","084":"NJ","085":"NJ","086":"NJ","087":"NJ","088":"NJ","089":"NJ",
  "100":"NY","101":"NY","102":"NY","103":"NY","104":"NY","105":"NY","106":"NY","107":"NY","108":"NY","109":"NY",
  "110":"NY","111":"NY","112":"NY","113":"NY","114":"NY","115":"NY","116":"NY","117":"NY","118":"NY","119":"NY",
  "120":"NY","121":"NY","122":"NY","123":"NY","124":"NY","125":"NY","126":"NY","127":"NY","128":"NY","129":"NY",
  "130":"NY","131":"NY","132":"NY","133":"NY","134":"NY","135":"NY","136":"NY","137":"NY","138":"NY","139":"NY",
  "140":"NY","141":"NY","142":"NY","143":"NY","144":"NY","145":"NY","146":"NY","147":"NY","148":"NY","149":"NY",
  "150":"PA","151":"PA","152":"PA","153":"PA","154":"PA","155":"PA","156":"PA","157":"PA","158":"PA","159":"PA",
  "160":"PA","161":"PA","162":"PA","163":"PA","164":"PA","165":"PA","166":"PA","167":"PA","168":"PA","169":"PA",
  "170":"PA","171":"PA","172":"PA","173":"PA","174":"PA","175":"PA","176":"PA","177":"PA","178":"PA","179":"PA",
  "180":"PA","181":"PA","182":"PA","183":"PA","184":"PA","185":"PA","186":"PA","187":"PA","188":"PA","189":"PA",
  "190":"PA","191":"PA","192":"PA","193":"PA","194":"PA","195":"PA","196":"PA",
  "197":"DE","198":"DE","199":"DE",
  "200":"DC","201":"VA","202":"DC","203":"DC","204":"DC","205":"DC",
  "206":"MD","207":"MD","208":"MD","209":"MD","210":"MD","211":"MD","212":"MD","214":"MD","215":"MD","216":"MD","217":"MD","218":"MD","219":"MD",
  "220":"VA","221":"VA","222":"VA","223":"VA","224":"VA","225":"VA","226":"VA","227":"VA","228":"VA","229":"VA",
  "230":"VA","231":"VA","232":"VA","233":"VA","234":"VA","235":"VA","236":"VA","237":"VA","238":"VA","239":"VA",
  "240":"VA","241":"VA","242":"VA","243":"VA","244":"VA","245":"VA","246":"VA",
  "247":"WV","248":"WV","249":"WV","250":"WV","251":"WV","252":"WV","253":"WV","254":"WV","255":"WV","256":"WV",
  "257":"WV","258":"WV","259":"WV","260":"WV","261":"WV","262":"WV","263":"WV","264":"WV","265":"WV","266":"WV",
  "267":"WV","268":"WV",
  "270":"NC","271":"NC","272":"NC","273":"NC","274":"NC","275":"NC","276":"NC","277":"NC","278":"NC","279":"NC",
  "280":"NC","281":"NC","282":"NC","283":"NC","284":"NC","285":"NC","286":"NC","287":"NC","288":"NC","289":"NC",
  "290":"SC","291":"SC","292":"SC","293":"SC","294":"SC","295":"SC","296":"SC","297":"SC","298":"SC","299":"SC",
  "300":"GA","301":"GA","302":"GA","303":"GA","304":"GA","305":"GA","306":"GA","307":"GA","308":"GA","309":"GA",
  "310":"GA","311":"GA","312":"GA","313":"GA","314":"GA","315":"GA","316":"GA","317":"GA","318":"GA","319":"GA",
  "320":"FL","321":"FL","322":"FL","323":"FL","324":"FL","325":"FL","326":"FL","327":"FL","328":"FL","329":"FL",
  "330":"FL","331":"FL","332":"FL","333":"FL","334":"FL","335":"FL","336":"FL","337":"FL","338":"FL","339":"FL",
  "340":"FL","341":"FL","342":"FL","344":"FL","346":"FL","347":"FL","349":"FL",
  "350":"AL","351":"AL","352":"AL","354":"AL","355":"AL","356":"AL","357":"AL","358":"AL","359":"AL",
  "360":"AL","361":"AL","362":"AL","363":"AL","364":"AL","365":"AL","366":"AL","367":"AL","368":"AL","369":"AL",
  "370":"TN","371":"TN","372":"TN","373":"TN","374":"TN","375":"TN","376":"TN","377":"TN","378":"TN","379":"TN",
  "380":"TN","381":"TN","382":"TN","383":"TN","384":"TN","385":"TN",
  "386":"MS","387":"MS","388":"MS","389":"MS","390":"MS","391":"MS","392":"MS","393":"MS","394":"MS","395":"MS",
  "396":"MS","397":"MS",
  "400":"KY","401":"KY","402":"KY","403":"KY","404":"KY","405":"KY","406":"KY","407":"KY","408":"KY","409":"KY",
  "410":"KY","411":"KY","412":"KY","413":"KY","414":"KY","415":"KY","416":"KY","417":"KY","418":"KY",
  "420":"KY","421":"KY","422":"KY","423":"KY","424":"KY","425":"KY","426":"KY","427":"KY",
  "430":"OH","431":"OH","432":"OH","433":"OH","434":"OH","435":"OH","436":"OH","437":"OH","438":"OH","439":"OH",
  "440":"OH","441":"OH","442":"OH","443":"OH","444":"OH","445":"OH","446":"OH","447":"OH","448":"OH","449":"OH",
  "450":"OH","451":"OH","452":"OH","453":"OH","454":"OH","455":"OH","456":"OH","457":"OH","458":"OH",
  "460":"IN","461":"IN","462":"IN","463":"IN","464":"IN","465":"IN","466":"IN","467":"IN","468":"IN","469":"IN",
  "470":"IN","471":"IN","472":"IN","473":"IN","474":"IN","475":"IN","476":"IN","477":"IN","478":"IN","479":"IN",
  "480":"MI","481":"MI","482":"MI","483":"MI","484":"MI","485":"MI","486":"MI","487":"MI","488":"MI","489":"MI",
  "490":"MI","491":"MI","492":"MI","493":"MI","494":"MI","495":"MI","496":"MI","497":"MI","498":"MI","499":"MI",
  "500":"IA","501":"IA","502":"IA","503":"IA","504":"IA","505":"IA","506":"IA","507":"IA","508":"IA","509":"IA",
  "510":"IA","511":"IA","512":"IA","513":"IA","514":"IA","515":"IA","516":"IA","520":"IA","521":"IA","522":"IA",
  "523":"IA","524":"IA","525":"IA","526":"IA","527":"IA","528":"IA",
  "530":"WI","531":"WI","532":"WI","534":"WI","535":"WI","537":"WI","538":"WI","539":"WI",
  "540":"WI","541":"WI","542":"WI","543":"WI","544":"WI","545":"WI","546":"WI","547":"WI","548":"WI","549":"WI",
  "550":"MN","551":"MN","553":"MN","554":"MN","555":"MN","556":"MN","557":"MN","558":"MN","559":"MN",
  "560":"MN","561":"MN","562":"MN","563":"MN","564":"MN","565":"MN","566":"MN","567":"MN",
  "570":"SD","571":"SD","572":"SD","573":"SD","574":"SD","575":"SD","576":"SD","577":"SD",
  "580":"ND","581":"ND","582":"ND","583":"ND","584":"ND","585":"ND","586":"ND","587":"ND","588":"ND",
  "590":"MT","591":"MT","592":"MT","593":"MT","594":"MT","595":"MT","596":"MT","597":"MT","598":"MT","599":"MT",
  "600":"IL","601":"IL","602":"IL","603":"IL","604":"IL","605":"IL","606":"IL","607":"IL","608":"IL","609":"IL",
  "610":"IL","611":"IL","612":"IL","613":"IL","614":"IL","615":"IL","616":"IL","617":"IL","618":"IL","619":"IL",
  "620":"IL","621":"IL","622":"IL","623":"IL","624":"IL","625":"IL","626":"IL","627":"IL","628":"IL","629":"IL",
  "630":"MO","631":"MO","633":"MO","634":"MO","635":"MO","636":"MO","637":"MO","638":"MO","639":"MO",
  "640":"KS","641":"MO","644":"MO","645":"MO","646":"MO","647":"MO","648":"MO","649":"MO",
  "650":"MO","651":"MO","652":"MO","653":"MO","654":"MO","655":"MO","656":"MO","657":"MO","658":"MO",
  "660":"KS","661":"KS","662":"KS","664":"KS","665":"KS","666":"KS","667":"KS","668":"KS","669":"KS",
  "670":"KS","671":"KS","672":"KS","673":"KS","674":"KS","675":"KS","676":"KS","677":"KS","678":"KS","679":"KS",
  "680":"NE","681":"NE","683":"NE","684":"NE","685":"NE","686":"NE","687":"NE","688":"NE","689":"NE",
  "690":"NE","691":"NE","692":"NE","693":"NE",
  "700":"LA","701":"LA","703":"LA","704":"LA","705":"LA","706":"LA","707":"LA","708":"LA","710":"LA","711":"LA",
  "712":"LA","713":"LA","714":"LA",
  "716":"AR","717":"AR","718":"AR","719":"AR","720":"AR","721":"AR","722":"AR","723":"AR","724":"AR","725":"AR",
  "726":"AR","727":"AR","728":"AR","729":"AR",
  "730":"OK","731":"OK","734":"OK","735":"OK","736":"OK","737":"OK","738":"OK","739":"OK",
  "740":"OK","741":"OK","743":"OK","744":"OK","745":"OK","746":"OK","747":"OK","748":"OK","749":"OK",
  "750":"TX","751":"TX","752":"TX","753":"TX","754":"TX","755":"TX","756":"TX","757":"TX","758":"TX","759":"TX",
  "760":"TX","761":"TX","762":"TX","763":"TX","764":"TX","765":"TX","766":"TX","767":"TX","768":"TX","769":"TX",
  "770":"TX","771":"TX","772":"TX","773":"TX","774":"TX","775":"TX","776":"TX","777":"TX","778":"TX","779":"TX",
  "780":"TX","781":"TX","782":"TX","783":"TX","784":"TX","785":"TX","786":"TX","787":"TX","788":"TX","789":"TX",
  "790":"TX","791":"TX","792":"TX","793":"TX","794":"TX","795":"TX","796":"TX","797":"TX","798":"TX","799":"TX",
  "800":"CO","801":"CO","802":"CO","803":"CO","804":"CO","805":"CO","806":"CO","807":"CO","808":"CO","809":"CO",
  "810":"CO","811":"CO","812":"CO","813":"CO","814":"CO","815":"CO","816":"CO",
  "820":"WY","821":"WY","822":"WY","823":"WY","824":"WY","825":"WY","826":"WY","827":"WY","828":"WY","829":"WY",
  "830":"WY","831":"ID","832":"ID","833":"ID","834":"ID","835":"ID","836":"ID","837":"ID","838":"ID",
  "840":"UT","841":"UT","842":"UT","843":"UT","844":"UT","845":"UT","846":"UT","847":"UT",
  "850":"AZ","851":"AZ","852":"AZ","853":"AZ","855":"AZ","856":"AZ","857":"AZ","859":"AZ","860":"AZ",
  "863":"AZ","864":"AZ","865":"AZ",
  "870":"NM","871":"NM","873":"NM","874":"NM","875":"NM","877":"NM","878":"NM","879":"NM","880":"NM","881":"NM",
  "882":"NM","883":"NM","884":"NM",
  "889":"NV","890":"NV","891":"NV","893":"NV","894":"NV","895":"NV","897":"NV","898":"NV",
  "900":"CA","901":"CA","902":"CA","903":"CA","904":"CA","905":"CA","906":"CA","907":"CA","908":"CA","909":"CA",
  "910":"CA","911":"CA","912":"CA","913":"CA","914":"CA","915":"CA","916":"CA","917":"CA","918":"CA","919":"CA",
  "920":"CA","921":"CA","922":"CA","923":"CA","924":"CA","925":"CA","926":"CA","927":"CA","928":"CA",
  "930":"CA","931":"CA","932":"CA","933":"CA","934":"CA","935":"CA","936":"CA","937":"CA","938":"CA","939":"CA",
  "940":"CA","941":"CA","942":"CA","943":"CA","944":"CA","945":"CA","946":"CA","947":"CA","948":"CA","949":"CA",
  "950":"CA","951":"CA","952":"CA","953":"CA","954":"CA","955":"CA","956":"CA","957":"CA","958":"CA","959":"CA",
  "960":"CA","961":"CA",
  "967":"HI","968":"HI",
  "970":"OR","971":"OR","972":"OR","973":"OR","974":"OR","975":"OR","976":"OR","977":"OR","978":"OR","979":"OR",
  "980":"WA","981":"WA","982":"WA","983":"WA","984":"WA","985":"WA","986":"WA","988":"WA","989":"WA",
  "990":"WA","991":"WA","992":"WA","993":"WA","994":"WA",
  "995":"AK","996":"AK","997":"AK","998":"AK","999":"AK",
};

/** Derive state abbreviation from a 5-digit zip code */
function stateFromZip(zip: string): string | undefined {
  const prefix = zip.replace(/\D/g, "").padStart(5, "0").slice(0, 3);
  return ZIP_PREFIX_TO_STATE[prefix];
}

/**
 * Approximate US state from lat/lng using bounding boxes.
 * Covers all 50 states + DC. For overlapping borders the first match wins,
 * which is fine for Realie search since nearby-state results still return.
 */
const STATE_BOUNDS: { state: string; minLat: number; maxLat: number; minLng: number; maxLng: number }[] = [
  { state: "HI", minLat: 18.5, maxLat: 22.5, minLng: -161, maxLng: -154 },
  { state: "AK", minLat: 51, maxLat: 72, minLng: -180, maxLng: -129 },
  { state: "WA", minLat: 45.5, maxLat: 49, minLng: -125, maxLng: -116.9 },
  { state: "OR", minLat: 41.9, maxLat: 46.3, minLng: -124.7, maxLng: -116.4 },
  { state: "CA", minLat: 32.5, maxLat: 42, minLng: -124.5, maxLng: -114 },
  { state: "NV", minLat: 35, maxLat: 42, minLng: -120, maxLng: -114 },
  { state: "AZ", minLat: 31.3, maxLat: 37, minLng: -115, maxLng: -109 },
  { state: "UT", minLat: 36.9, maxLat: 42, minLng: -114.1, maxLng: -109 },
  { state: "ID", minLat: 42, maxLat: 49, minLng: -117.3, maxLng: -111 },
  { state: "MT", minLat: 44.3, maxLat: 49, minLng: -116.1, maxLng: -104 },
  { state: "WY", minLat: 40.9, maxLat: 45.1, minLng: -111.1, maxLng: -104 },
  { state: "CO", minLat: 36.9, maxLat: 41, minLng: -109.1, maxLng: -102 },
  { state: "NM", minLat: 31.3, maxLat: 37, minLng: -109.1, maxLng: -103 },
  { state: "ND", minLat: 45.9, maxLat: 49, minLng: -104.1, maxLng: -96.5 },
  { state: "SD", minLat: 42.4, maxLat: 46, minLng: -104.1, maxLng: -96.4 },
  { state: "NE", minLat: 39.9, maxLat: 43, minLng: -104.1, maxLng: -95.3 },
  { state: "KS", minLat: 36.9, maxLat: 40.1, minLng: -102.1, maxLng: -94.5 },
  { state: "OK", minLat: 33.6, maxLat: 37, minLng: -103.1, maxLng: -94.4 },
  { state: "TX", minLat: 25.8, maxLat: 36.5, minLng: -106.7, maxLng: -93.5 },
  { state: "MN", minLat: 43.4, maxLat: 49.4, minLng: -97.3, maxLng: -89.4 },
  { state: "IA", minLat: 40.3, maxLat: 43.5, minLng: -96.7, maxLng: -90 },
  { state: "MO", minLat: 35.9, maxLat: 40.6, minLng: -95.8, maxLng: -89 },
  { state: "AR", minLat: 33, maxLat: 36.5, minLng: -94.7, maxLng: -89.6 },
  { state: "LA", minLat: 28.9, maxLat: 33.1, minLng: -94.1, maxLng: -88.8 },
  { state: "WI", minLat: 42.4, maxLat: 47.3, minLng: -92.9, maxLng: -86.2 },
  { state: "IL", minLat: 36.9, maxLat: 42.5, minLng: -91.6, maxLng: -87.4 },
  { state: "MS", minLat: 30, maxLat: 35, minLng: -91.7, maxLng: -88 },
  { state: "MI", minLat: 41.6, maxLat: 48.3, minLng: -90.5, maxLng: -82.1 },
  { state: "IN", minLat: 37.7, maxLat: 41.8, minLng: -88.1, maxLng: -84.7 },
  { state: "KY", minLat: 36.4, maxLat: 39.2, minLng: -89.6, maxLng: -81.9 },
  { state: "TN", minLat: 34.9, maxLat: 36.7, minLng: -90.4, maxLng: -81.6 },
  { state: "AL", minLat: 30, maxLat: 35.1, minLng: -88.5, maxLng: -84.8 },
  { state: "OH", minLat: 38.4, maxLat: 42, minLng: -84.9, maxLng: -80.5 },
  { state: "GA", minLat: 30.3, maxLat: 35.1, minLng: -85.7, maxLng: -80.7 },
  { state: "FL", minLat: 24.3, maxLat: 31.1, minLng: -87.7, maxLng: -79.9 },
  { state: "SC", minLat: 32, maxLat: 35.3, minLng: -83.4, maxLng: -78.5 },
  { state: "NC", minLat: 33.7, maxLat: 36.6, minLng: -84.4, maxLng: -75.4 },
  { state: "VA", minLat: 36.5, maxLat: 39.5, minLng: -83.7, maxLng: -75.2 },
  { state: "WV", minLat: 37.1, maxLat: 40.7, minLng: -82.7, maxLng: -77.7 },
  { state: "PA", minLat: 39.7, maxLat: 42.3, minLng: -80.6, maxLng: -74.6 },
  { state: "NY", minLat: 40.4, maxLat: 45.1, minLng: -79.8, maxLng: -71.8 },
  { state: "VT", minLat: 42.7, maxLat: 45.1, minLng: -73.5, maxLng: -71.4 },
  { state: "NH", minLat: 42.6, maxLat: 45.4, minLng: -72.6, maxLng: -70.6 },
  { state: "ME", minLat: 43, maxLat: 47.5, minLng: -71.1, maxLng: -66.9 },
  { state: "MA", minLat: 41, maxLat: 42.9, minLng: -73.6, maxLng: -69.8 },
  { state: "CT", minLat: 40.9, maxLat: 42.1, minLng: -73.8, maxLng: -71.7 },
  { state: "RI", minLat: 41.1, maxLat: 42.1, minLng: -71.9, maxLng: -71.1 },
  { state: "NJ", minLat: 38.9, maxLat: 41.4, minLng: -75.6, maxLng: -73.8 },
  { state: "DE", minLat: 38.4, maxLat: 39.9, minLng: -75.8, maxLng: -74.9 },
  { state: "MD", minLat: 37.9, maxLat: 39.8, minLng: -79.5, maxLng: -75 },
  { state: "DC", minLat: 38.79, maxLat: 39, minLng: -77.12, maxLng: -76.9 },
];

function stateFromCoords(lat: number, lng: number): string | undefined {
  for (const b of STATE_BOUNDS) {
    if (lat >= b.minLat && lat <= b.maxLat && lng >= b.minLng && lng <= b.maxLng) {
      return b.state;
    }
  }
  return undefined;
}

// ── Response types ──────────────────────────────────────────────────────────
// Realie returns data in a normalized format that we map to our internal
// ATTOM-compatible shape so the rest of the app doesn't need to change.

export interface RealieParcel {
  _id?: string;
  siteId?: string;
  parcelId?: string;
  fipsState?: string;
  fipsCounty?: string;
  county?: string;

  // Address fields (flat)
  address?: string;
  addressFull?: string;
  addressFormal?: string;
  addressFullUSPS?: string;
  addressRaw?: string;
  streetNumber?: string;
  street?: string;
  streetName?: string;
  streetType?: string;
  streetDirectionPrefix?: string;
  streetDirectionSuffix?: string;
  unitNumber?: string;
  city?: string;
  cityUSPS?: string;
  state?: string;
  zipCode?: string;
  zipCodePlusFour?: string;

  // Location
  latitude?: number;
  longitude?: number;
  location?: { type?: string; coordinates?: number[] };

  // Owner
  ownerName?: string;
  ownerAddressLine1?: string;
  ownerAddressFull?: string;
  ownerCity?: string;
  ownerState?: string;
  ownerZipCode?: string;
  ownerZipCodePlusFour?: string;
  ownerResCount?: number;
  ownerComCount?: number;
  ownerParcelCount?: number;
  ownerOriginCode?: string;
  ownershipStartDate?: string;

  // Property characteristics
  residential?: boolean;
  condo?: boolean;
  useCode?: string;
  zoningCode?: string;
  yearBuilt?: number;
  totalBedrooms?: number;
  totalBathrooms?: number;
  buildingArea?: number;
  landArea?: number;
  acres?: number;
  stories?: number;
  buildingCount?: number;
  constructionType?: string;
  wallType?: string;
  roofType?: string;
  roofStyle?: string;
  floorType?: string;
  foundationType?: string;
  basementType?: string;
  garageCount?: number;
  garageType?: string;
  pool?: boolean;
  poolCode?: string;
  fireplace?: boolean | null;
  fireplaceCount?: number | null;
  garage?: boolean;

  // Assessment / Tax
  totalAssessedValue?: number;
  assessedBuildingValue?: number;
  assessedLandValue?: number;
  totalBuildingValue?: number;
  totalLandValue?: number;
  totalMarketValue?: number;
  marketValueYear?: number;
  assessedYear?: number;
  taxValue?: number;
  taxYear?: number;
  taxRateCodeArea?: string;

  // Valuation (AVM)
  modelValue?: number;
  modelValueMin?: number;
  modelValueMax?: number;

  // Sale / Transfer
  transferPrice?: number;
  transferDate?: string;
  transferDateObject?: string;
  recordingDate?: string;
  transferDocNum?: string;
  transferDocType?: string;
  buyerIDCode?: string;
  buyerVestingCode?: string;

  // Mortgage / Liens
  lenderName?: string;
  totalLienCount?: number;
  totalLienBalance?: number;
  totalFinancingHistCount?: number;
  LTVCurrentEstCombined?: number;
  LTVCurrentEstRange?: number;
  equityCurrentEstBal?: number;
  equityCurrentEstRange?: number;
  LTVPurchase?: number;

  // Foreclosure
  forecloseCode?: string | null;
  forecloseRecordDate?: string | null;
  forecloseFileDate?: string | null;
  forecloseCaseNum?: string | null;
  auctionDate?: string | null;

  // Legal description
  legalDesc?: string;
  subdivision?: string | null;
  siteCensusTract?: string;
  bookNum?: string | null;
  pageNum?: string | null;
  blockNum?: string | null;
  lotNum?: string | null;
  lotCode?: string | null;
  phaseNum?: string | null;
  tractNum?: string | null;
  secTwnRng?: string | null;
  jurisdiction?: string | null;
  districtNum?: string | null;
  citySection?: string | null;
  landLot?: string | null;
  neighborhood?: string;
  depthSize?: number;
  frontage?: number;

  // Geometry
  geometry?: {
    type?: string;
    coordinates?: any;
  };

  // Historical data
  assessments?: Array<{
    assessedYear?: number;
    totalAssessedValue?: number;
    totalBuildingValue?: number;
    totalLandValue?: number;
    totalMarketValue?: number;
    marketValueYear?: number;
    taxValue?: number;
    taxYear?: number;
  }>;
  transfers?: Array<{
    transferPrice?: number;
    transferDate?: string;
    buyerName?: string;
    sellerName?: string;
    documentType?: string;
  }>;

  // Composite ID fields
  state_parcelId?: string;
  state_parcelIdSTD?: string;
  countyUSPS?: string;
}

export interface RealieSearchParams {
  // Address search
  address?: string;
  street?: string;
  city?: string;
  state?: string;
  zip?: string;       // mapped to "zipCode" query param (Realie uses camelCase)
  zipCode?: string;   // direct camelCase form

  // Geographic search
  latitude?: number;
  longitude?: number;
  radius?: number; // miles

  // APN/FIPS
  apn?: string;
  fips?: string;

  // Filters
  residential?: boolean;
  property_type?: string;
  min_beds?: number;
  max_beds?: number;
  min_baths?: number;
  max_baths?: number;
  min_sqft?: number;
  max_sqft?: number;
  min_year_built?: number;
  max_year_built?: number;
  min_value?: number;
  max_value?: number;
  owner_occupied?: boolean;
  absentee_owner?: boolean;

  // Sale/transfer filtering
  transferedSince?: string; // Days to look back for transfers (e.g., "30")

  // Comparables
  timeFrame?: number;   // months
  maxResults?: number;

  // Pagination
  page?: number;
  limit?: number;
}

export interface RealieApiResponse {
  properties: RealieParcel[];
  metadata?: {
    limit: number;
    offset: number;
    count: number;
  };
}

// ── Mapper: Realie → ATTOM-compatible shape ─────────────────────────────────
// Our entire UI consumes the ATTOM data shape. Rather than rewriting every
// component, we map Realie's response into the same structure.

export function mapRealieToAttomShape(parcel: RealieParcel): any {
  // Parse owner names — Realie returns "LAST, FIRST; LAST2, FIRST2" in ownerName
  const ownerNames = parcel.ownerName?.split(";").map((n) => n.trim()) || [];
  const owner1 = ownerNames[0];
  const owner2 = ownerNames[1];

  // Build FIPS from state + county codes
  const fips = parcel.fipsState && parcel.fipsCounty
    ? `${parcel.fipsState}${parcel.fipsCounty}`
    : undefined;

  // Determine owner-occupied from address comparison.
  // Realie formats differ between owner and property addresses:
  //   owner: "46-055 MEHEANU PL APT 3451"  vs  property: "46-55 MEHEANU PL"
  // Normalize by stripping leading zeros, unit suffixes, and lowercasing.
  const normalizeAddr = (s: string) =>
    s.toLowerCase()
      .replace(/\bapt\b.*$/i, "")     // strip "APT ..." suffix
      .replace(/\bunit\b.*$/i, "")    // strip "UNIT ..." suffix
      .replace(/\bste\b.*$/i, "")     // strip "STE ..." suffix
      .replace(/\b#\d+.*$/i, "")      // strip "#123" suffix
      .replace(/\b0+(\d)/g, "$1")     // strip leading zeros in numbers
      .replace(/[^a-z0-9]/g, "")      // strip non-alphanumeric
      .trim();
  const ownerAddr = parcel.ownerAddressLine1;
  const propAddr = parcel.address;
  let ownerOccupied: boolean | undefined;
  if (ownerAddr && propAddr) {
    ownerOccupied = normalizeAddr(ownerAddr) === normalizeAddr(propAddr);
  } else if (ownerAddr && parcel.ownerCity && parcel.city) {
    // If we can't compare street, at least check city+state
    ownerOccupied = parcel.ownerCity.toUpperCase() === parcel.city.toUpperCase()
      && parcel.ownerState?.toUpperCase() === parcel.state?.toUpperCase();
  }

  // Calculate price per sqft from transfer
  const pricePerSqft = parcel.transferPrice && parcel.buildingArea
    ? Math.round(parcel.transferPrice / parcel.buildingArea)
    : undefined;

  // Format YYYYMMDD date strings to "YYYY-MM-DD"
  const formatYMD = (d?: string | null) =>
    d?.length === 8 ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}` : d || undefined;

  const transferDate = formatYMD(parcel.transferDate)
    || parcel.transferDateObject || parcel.transferDate;

  // ownershipStartDate is the date the current owner acquired the property.
  // This may differ from transferDate (which is the last recorded transfer).
  const ownershipDate = formatYMD(parcel.ownershipStartDate);

  return {
    identifier: {
      apn: parcel.parcelId,
      fips,
      obPropId: parcel._id || parcel.siteId,
      // Generate a stable numeric attomId from siteId — the frontend cache
      // and deduplication logic keys on identifier.attomId.
      attomId: parcel.siteId ? Number(parcel.siteId) : undefined,
    },
    address: {
      oneLine: parcel.addressFullUSPS || parcel.addressFull || `${parcel.address}, ${parcel.city}, ${parcel.state} ${parcel.zipCode}`,
      line1: parcel.address,
      locality: parcel.cityUSPS || parcel.city,
      countrySubd: parcel.state,
      postal1: parcel.zipCode,
      postal2: parcel.zipCodePlusFour?.split("-")[1],
    },
    location: {
      latitude: parcel.latitude ? String(parcel.latitude) : undefined,
      longitude: parcel.longitude ? String(parcel.longitude) : undefined,
    },
    owner: {
      owner1: owner1 ? { fullName: owner1 } : undefined,
      owner2: owner2 ? { fullName: owner2 } : undefined,
      corporateIndicator: (parcel.ownerComCount && parcel.ownerComCount > 0)
        || parcel.buyerIDCode === "CO" ? "Y" : "N",
      absenteeOwnerStatus: ownerOccupied === false ? "A" : ownerOccupied === true ? "O" : undefined,
      mailingAddressOneLine: parcel.ownerAddressFull
        || (parcel.ownerAddressLine1 ? [
            parcel.ownerAddressLine1,
            parcel.ownerCity,
            parcel.ownerState,
            parcel.ownerZipCode,
          ].filter(Boolean).join(", ") : undefined),
      ownerOccupied: ownerOccupied === true ? "Y" : ownerOccupied === false ? "N" : undefined,
      // Realie's portfolio counts — used for investor detection
      ownerParcelCount: parcel.ownerParcelCount,
      ownerResCount: parcel.ownerResCount,
      ownerComCount: parcel.ownerComCount,
    },
    building: {
      size: {
        livingSize: parcel.buildingArea,
        universalSize: parcel.buildingArea,
      },
      rooms: {
        beds: parcel.totalBedrooms,
        bathsFull: parcel.totalBathrooms,
        bathsTotal: parcel.totalBathrooms,
      },
      summary: {
        yearBuilt: parcel.yearBuilt,
        levels: parcel.stories,
      },
      construction: {
        constructionType: parcel.constructionType,
        roofCover: parcel.roofType,
      },
    },
    lot: {
      lotSize1: parcel.acres,
      lotSize2: parcel.landArea,
    },
    summary: {
      propType: parcel.residential ? "SFR" : parcel.condo ? "CONDO" : undefined,
      propLandUse: parcel.useCode,
      yearBuilt: parcel.yearBuilt,
      // Set absenteeInd so the frontend isAbsenteeOwner() detects it via multiple paths
      absenteeInd: ownerOccupied === false ? "ABSENTEE OWNER" : ownerOccupied === true ? "OWNER OCCUPIED" : undefined,
    },
    assessment: {
      assessed: {
        assdTtlValue: parcel.totalAssessedValue,
        assdImprValue: parcel.assessedBuildingValue || parcel.totalBuildingValue,
        assdLandValue: parcel.assessedLandValue || parcel.totalLandValue,
      },
      market: {
        mktTtlValue: parcel.totalMarketValue,
        mktImprValue: parcel.totalBuildingValue,
        mktLandValue: parcel.totalLandValue,
      },
      tax: {
        taxAmt: parcel.taxValue,
        taxYear: parcel.taxYear,
      },
    },
    avm: parcel.modelValue ? {
      amount: {
        value: parcel.modelValue,
        high: parcel.modelValueMax,
        low: parcel.modelValueMin,
      },
    } : undefined,
    sale: (parcel.transferPrice || parcel.transferDate || parcel.ownershipStartDate) ? {
      amount: {
        saleAmt: parcel.transferPrice || undefined,
        // Use ownershipStartDate as the primary date — it's when the current
        // owner acquired the property. transferDate may be the last recorded
        // transfer which could be an intra-family deed, not a real sale.
        saleTransDate: ownershipDate || transferDate,
        saleRecDate: formatYMD(parcel.recordingDate),
      },
      calculation: {
        pricePerSizeUnit: pricePerSqft,
      },
    } : undefined,
    mortgage: (parcel.totalLienBalance != null || parcel.lenderName || parcel.totalLienCount != null || parcel.totalFinancingHistCount != null) ? {
      amount: parcel.totalLienBalance ?? undefined,
      lender: parcel.lenderName ? { fullName: parcel.lenderName } : undefined,
      lienCount: parcel.totalLienCount ?? undefined,
      financingHistoryCount: parcel.totalFinancingHistCount ?? undefined,
    } : undefined,
    // Realie provides pre-calculated equity and LTV
    homeEquity: (parcel.equityCurrentEstBal != null || parcel.LTVCurrentEstCombined != null) ? {
      equity: parcel.equityCurrentEstBal ?? undefined,
      equityRange: parcel.equityCurrentEstRange ?? undefined,
      estimatedValue: parcel.modelValue ?? undefined,
      // Use AVM - equity for estimated balance (totalLienBalance is original loan amount)
      outstandingBalance: (parcel.modelValue != null && parcel.equityCurrentEstBal != null)
        ? Math.max(0, parcel.modelValue - parcel.equityCurrentEstBal)
        : undefined,
      ltv: parcel.LTVCurrentEstCombined ?? undefined,
      ltvRange: parcel.LTVCurrentEstRange ?? undefined,
      ltvPurchase: parcel.LTVPurchase ?? undefined,
    } : undefined,
    // Realie provides foreclosure status fields
    foreclosure: (parcel.forecloseCode || parcel.forecloseRecordDate || parcel.auctionDate) ? {
      actionType: parcel.forecloseCode ?? undefined,
      filingDate: parcel.forecloseFileDate ?? undefined,
      recordingDate: parcel.forecloseRecordDate ?? undefined,
      auctionDate: parcel.auctionDate ?? undefined,
      caseNumber: parcel.forecloseCaseNum ?? undefined,
    } : undefined,
    // Parcel geometry (for boundary endpoints)
    parcelBoundary: parcel.geometry || undefined,
    // Assessment history from Realie
    assessmenthistory: parcel.assessments?.map((a) => ({
      assessed: {
        assdTtlValue: a.totalAssessedValue,
        assdImprValue: a.totalBuildingValue,
        assdLandValue: a.totalLandValue,
      },
      market: {
        mktTtlValue: a.totalMarketValue,
      },
      tax: {
        taxAmt: a.taxValue,
        taxYear: a.taxYear,
      },
      assessedYear: a.assessedYear,
    })) || undefined,
    // Mark source so we know this came from Realie
    _source: "realie",
  };
}

// ── Client ──────────────────────────────────────────────────────────────────

export class RealieClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(config: { apiKey: string; baseUrl?: string }) {
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl || DEFAULT_BASE_URL).replace(/\/$/, "");
  }

  private async request<T>(
    endpoint: string,
    params?: Record<string, string | number | boolean | undefined>
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`);

    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null && value !== "") {
          url.searchParams.set(key, String(value));
        }
      }
    }

    console.log(`[Realie] API request: ${url.toString()}`);

    const response = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        // Send API key in both headers for compatibility — Realie docs
        // specify x-api-key but some deployments may check Authorization.
        "x-api-key": this.apiKey,
        Authorization: this.apiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `[Realie] API request FAILED (${response.status}) for ${url}:`,
        errorText
      );

      // 404 with a JSON body like {"error":"No comparable properties found"}
      // is a "no results" response, not a real error — return it for normalizeResponse
      if (response.status === 404) {
        // Detect Vercel deployment errors (service is down/undeployed)
        if (errorText.includes("deployment could not be found")) {
          throw new Error(
            "Realie.ai service is currently unavailable (Vercel deployment not found). Property data will fall back to ATTOM."
          );
        }
        // Try to parse as JSON — if it's a "no results" message, return empty
        try {
          const parsed = JSON.parse(errorText);
          if (parsed.error) {
            console.log(`[Realie] No results (404): ${parsed.error}`);
            return parsed; // normalizeResponse will handle { error: "..." }
          }
        } catch {
          // Not JSON — fall through to generic error
        }
      }

      throw new Error(
        `Realie API error: ${response.status} - ${errorText}`
      );
    }

    return response.json();
  }

  /**
   * Normalize any Realie response to our standard RealieApiResponse shape.
   * The API can return either { property: { ... } } (single) or
   * { properties: [...] } (list), so we handle both.
   */
  private normalizeResponse(raw: any): RealieApiResponse {
    // Handle API error responses like { error: "No comparable properties found" }
    if (raw?.error && !raw?.property && !raw?.properties) {
      console.log(`[Realie] API returned error: ${raw.error}`);
      return { properties: [], metadata: { limit: 0, offset: 0, count: 0 } };
    }
    if (raw?.properties && Array.isArray(raw.properties)) {
      return raw as RealieApiResponse;
    }
    if (raw?.property) {
      return {
        properties: [raw.property],
        metadata: { limit: 1, offset: 0, count: 1 },
      };
    }
    return { properties: [], metadata: { limit: 0, offset: 0, count: 0 } };
  }

  /**
   * Search property by address.
   * Endpoint: /property/address/?state=XX&address=...
   */
  async searchByAddress(params: {
    address?: string;
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    page?: number;
    limit?: number;
  }): Promise<RealieApiResponse> {
    // The Realie address endpoint expects state + address (street portion)
    const queryParams: Record<string, string | number | boolean | undefined> = {};

    if (params.state) queryParams.state = params.state;
    // Realie uses "zipCode" (camelCase) as the query param, not "zip"
    if (params.zip) queryParams.zipCode = params.zip;

    // If a full address is given, try to extract state for the query
    if (params.address) {
      // Try to extract state from full address like "123 Main St, City, ST 12345"
      const stateMatch = params.address.match(/,\s*([A-Z]{2})\s*\d{0,5}\s*$/);
      if (stateMatch && !queryParams.state) {
        queryParams.state = stateMatch[1];
        // Remove city/state/zip from address to get just the street
        queryParams.address = params.address.replace(/,\s*[^,]+,\s*[A-Z]{2}\s*\d{0,5}\s*$/, "").trim();
      } else {
        queryParams.address = params.address;
      }
    } else if (params.street) {
      queryParams.address = params.street;
    }

    if (params.city) queryParams.city = params.city;
    // Realie uses offset-based pagination; limit is capped at 100
    const limit = Math.min(params.limit || 100, 100);
    queryParams.limit = limit;
    if (params.page && params.page > 1) queryParams.offset = (params.page - 1) * limit;

    const raw = await this.request<any>("/property/address/", queryParams);
    return this.normalizeResponse(raw);
  }

  /**
   * Search properties by zip code with optional filters.
   * Uses /property/search/ (bulk search) — requires state param.
   * /property/address/ is for single-address lookups only.
   */
  async searchByZip(params: RealieSearchParams): Promise<RealieApiResponse> {
    // Realie /property/search/ limit is 1–100 (default 10).
    const limit = Math.min(params.limit || 100, 100);
    const offset = params.page && params.page > 1 ? (params.page - 1) * limit : 0;

    const zipCode = params.zipCode || params.zip;
    // State is REQUIRED for /property/search/. Derive from zip if not provided.
    const state = params.state || (zipCode ? stateFromZip(zipCode) : undefined);

    if (!state) {
      console.warn(`[Realie] Cannot search: no state and unable to derive from zip "${zipCode}"`);
      return { properties: [], metadata: { limit: 0, offset: 0, count: 0 } };
    }

    const fullParams: Record<string, string | number | boolean | undefined> = {
      state,
      zipCode,
      offset,
      limit,
      // Filter to residential properties only (excludes commercial)
      residential: params.residential !== false ? true : undefined,
      // Property type filter (SFR, CONDO, APARTMENT, MOBILE)
      ...(params.property_type ? { property_type: params.property_type } : {}),
      // Pass transferedSince if set (for "Just Sold" filtering)
      ...(params.transferedSince ? { transferedSince: params.transferedSince } : {}),
    };

    try {
      const raw = await this.request<any>("/property/search/", fullParams);
      return this.normalizeResponse(raw);
    } catch (error: any) {
      // If 400 Bad Request, retry with just state + zipCode + pagination.
      if (error?.message?.includes("Realie API error: 400")) {
        console.warn(`[Realie] 400 error on search — retrying with minimal params`);
        const raw = await this.request<any>("/property/search/", {
          state,
          zipCode,
          offset,
          limit,
        });
        return this.normalizeResponse(raw);
      }
      throw error;
    }
  }

  /**
   * Search properties by lat/lng + radius.
   * Uses /property/search/ with state derived from coordinates.
   * The /property/address/ endpoint only supports single-address lookups
   * and rejects lat/lng params, so we must use the bulk search endpoint.
   */
  async searchByRadius(params: {
    latitude: number;
    longitude: number;
    radius: number;
    page?: number;
    limit?: number;
    property_type?: string;
    residential?: boolean;
  }): Promise<RealieApiResponse> {
    const limit = Math.min(params.limit || 100, 100);
    const offset = params.page && params.page > 1 ? (params.page - 1) * limit : 0;

    const state = stateFromCoords(params.latitude, params.longitude);
    if (!state) {
      console.warn(`[Realie] Cannot determine state from coords (${params.latitude}, ${params.longitude})`);
      return { properties: [], metadata: { limit: 0, offset: 0, count: 0 } };
    }

    try {
      const raw = await this.request<any>("/property/search/", {
        state,
        latitude: params.latitude,
        longitude: params.longitude,
        radius: params.radius,
        residential: params.residential !== false ? true : undefined,
        ...(params.property_type ? { property_type: params.property_type } : {}),
        limit,
        offset,
      });
      return this.normalizeResponse(raw);
    } catch (error: any) {
      if (error?.message?.includes("Realie API error: 400")) {
        console.warn(`[Realie] 400 error with radius params — retrying with minimal params`);
        const raw = await this.request<any>("/property/search/", {
          state,
          latitude: params.latitude,
          longitude: params.longitude,
          radius: params.radius,
          offset,
          limit,
        });
        return this.normalizeResponse(raw);
      }
      throw error;
    }
  }

  /**
   * Get a single property by APN + FIPS
   */
  async getByApn(apn: string, fips: string): Promise<RealieApiResponse> {
    const raw = await this.request<any>("/property/address/", { apn, fips });
    return this.normalizeResponse(raw);
  }

  /**
   * Get property detail by Realie parcel ID
   */
  async getByParcelId(parcelId: string): Promise<RealieApiResponse> {
    const raw = await this.request<any>(`/property/${encodeURIComponent(parcelId)}`);
    return this.normalizeResponse(raw);
  }

  /**
   * Get sales history for a property
   */
  async getSalesHistory(params: {
    address?: string;
    state?: string;
    apn?: string;
    fips?: string;
    parcel_id?: string;
  }): Promise<RealieApiResponse> {
    const raw = await this.request<any>("/property/address/", params);
    return this.normalizeResponse(raw);
  }

  /**
   * Get parcel boundary geometry
   */
  async getParcelBoundary(params: {
    address?: string;
    state?: string;
    apn?: string;
    fips?: string;
  }): Promise<RealieApiResponse> {
    const raw = await this.request<any>("/property/address/", params);
    return this.normalizeResponse(raw);
  }

  /**
   * Get comparable sales for a property.
   * Endpoint: /premium/comparables/?latitude=X&longitude=Y&radius=1&timeFrame=18&maxResults=25
   */
  async getComparables(params: {
    latitude: number;
    longitude: number;
    radius?: number;
    timeFrame?: number;
    maxResults?: number;
    sqftMin?: number;
    sqftMax?: number;
    bedsMin?: number;
    bedsMax?: number;
    bathsMin?: number;
    bathsMax?: number;
    propertyType?: string; // "any" | "condo" | "house"
    priceMin?: number;
    priceMax?: number;
  }): Promise<RealieApiResponse> {
    const reqParams: Record<string, string | number | boolean | undefined> = {
      latitude: params.latitude,
      longitude: params.longitude,
      radius: params.radius ?? 1,
      timeFrame: params.timeFrame ?? 18,
      maxResults: Math.min(params.maxResults ?? 25, 50),
    };
    // Optional filters
    if (params.sqftMin != null) reqParams.sqftMin = params.sqftMin;
    if (params.sqftMax != null) reqParams.sqftMax = params.sqftMax;
    if (params.bedsMin != null) reqParams.bedsMin = params.bedsMin;
    if (params.bedsMax != null) reqParams.bedsMax = params.bedsMax;
    if (params.bathsMin != null) reqParams.bathsMin = params.bathsMin;
    if (params.bathsMax != null) reqParams.bathsMax = params.bathsMax;
    if (params.propertyType && params.propertyType !== "any") reqParams.propertyType = params.propertyType;
    if (params.priceMin != null) reqParams.priceMin = params.priceMin;
    if (params.priceMax != null) reqParams.priceMax = params.priceMax;

    const raw = await this.request<any>("/premium/comparables/", reqParams);
    return this.normalizeResponse(raw);
  }

  /**
   * Test the API connection
   */
  async testConnection(): Promise<{ success: boolean; message: string; serviceDown?: boolean }> {
    try {
      // Use a known address to test
      const raw = await this.request<any>("/property/address/", {
        state: "DC",
        address: "1600 Pennsylvania Avenue NW",
      });

      const result = this.normalizeResponse(raw);
      if (result.properties.length > 0) {
        return {
          success: true,
          message: "Realie.ai API connection successful",
        };
      }

      return {
        success: false,
        message: "Unexpected response from Realie.ai API",
      };
    } catch (error: any) {
      const msg = error.message || "Failed to connect to Realie.ai API";

      // Detect service-down conditions: Vercel deployment errors AND general
      // network failures (DNS, timeout, connection refused, SSL, etc.).
      // Only actual auth errors (401/403 with clear API messages) should
      // prevent saving the key — network issues are transient.
      const isServiceDown =
        msg.includes("service is currently unavailable") ||
        msg.includes("deployment could not be found") ||
        msg.includes("fetch failed") ||
        msg.includes("ENOTFOUND") ||
        msg.includes("ECONNREFUSED") ||
        msg.includes("ECONNRESET") ||
        msg.includes("ETIMEDOUT") ||
        msg.includes("EHOSTUNREACH") ||
        msg.includes("socket hang up") ||
        msg.includes("network") ||
        msg.includes("abort") ||
        msg.includes("SSL") ||
        msg.includes("certificate") ||
        msg.includes("getaddrinfo") ||
        msg.includes("connect ECONNREFUSED") ||
        // Catch-all: if the error doesn't look like an explicit API auth rejection,
        // treat it as a transient failure so the key can still be saved
        (!msg.includes("401") && !msg.includes("403") && !msg.includes("Invalid API") && !msg.includes("Unauthorized"));

      return {
        success: false,
        serviceDown: isServiceDown,
        message: isServiceDown
          ? "Realie.ai service is temporarily unavailable. API key saved — it will activate automatically when the service returns."
          : msg,
      };
    }
  }
}

/**
 * Map ATTOM-style search params to Realie search params
 */
export function mapAttomParamsToRealie(
  endpoint: string,
  params: Record<string, any>
): RealieSearchParams | null {
  // Only handle property data endpoints — neighborhood, schools, risk etc. stay with ATTOM
  const propertyEndpoints = [
    "expanded", "detail", "detailowner", "detailmortgage",
    "detailmortgageowner", "profile", "snapshot",
    "assessment", "assessmentsnapshot",
    "sale", "salesnapshot", "saleshistory", "saleshistorybasic",
    "saleshistoryexpanded", "saleshistorysnapshot",
    "avm", "attomavm", "avmhistory",
    "parcelboundary", "id",
    "comparables",
  ];

  if (!propertyEndpoints.includes(endpoint)) {
    return null; // Not a Realie-compatible endpoint
  }

  const mapped: RealieSearchParams = {};

  // Address — Realie needs state separately for address lookups
  if (params.address1 && params.address2) {
    // address2 is typically "City, ST ZIP" — extract state
    mapped.address = params.address1;
    const stateMatch = params.address2.match(/\b([A-Z]{2})\b/);
    if (stateMatch) mapped.state = stateMatch[1];
  } else if (params.address) {
    // Full address like "123 Main St, City, ST 12345"
    const stateMatch = params.address.match(/,\s*([A-Z]{2})\s*\d{0,5}\s*$/);
    if (stateMatch) {
      mapped.state = stateMatch[1];
      // Strip city/state/zip to get just street for address param
      mapped.address = params.address.replace(/,\s*[^,]+,\s*[A-Z]{2}\s*\d{0,5}\s*$/, "").trim();
    } else {
      mapped.address = params.address;
    }
  }

  // Zip code — Realie uses "zipCode" (camelCase) as query param
  if (params.postalcode || params.postalCode) {
    mapped.zipCode = params.postalcode || params.postalCode;
  }

  // Lat/Lng/Radius
  if (params.latitude && params.longitude) {
    mapped.latitude = Number(params.latitude);
    mapped.longitude = Number(params.longitude);
    if (params.radius) mapped.radius = Number(params.radius);
  }

  // APN / FIPS
  if (params.apn || params.APN) mapped.apn = params.apn || params.APN;
  if (params.fips) mapped.fips = params.fips;

  // Property type
  if (params.propertytype || params.propertyType) {
    mapped.property_type = params.propertytype || params.propertyType;
  }

  // Beds / Baths
  if (params.minBeds) mapped.min_beds = Number(params.minBeds);
  if (params.maxBeds) mapped.max_beds = Number(params.maxBeds);
  if (params.minBathsTotal) mapped.min_baths = Number(params.minBathsTotal);
  if (params.maxBathsTotal) mapped.max_baths = Number(params.maxBathsTotal);

  // Size
  if (params.minUniversalSize) mapped.min_sqft = Number(params.minUniversalSize);
  if (params.maxUniversalSize) mapped.max_sqft = Number(params.maxUniversalSize);

  // Year built
  if (params.minYearBuilt) mapped.min_year_built = Number(params.minYearBuilt);
  if (params.maxYearBuilt) mapped.max_year_built = Number(params.maxYearBuilt);

  // Value filters (use AVM or assessed total)
  if (params.minAVMValue || params.minavmvalue) {
    mapped.min_value = Number(params.minAVMValue || params.minavmvalue);
  }
  if (params.maxAVMValue || params.maxavmvalue) {
    mapped.max_value = Number(params.maxAVMValue || params.maxavmvalue);
  }

  // Comparables
  if (params.timeFrame) mapped.timeFrame = Number(params.timeFrame);
  if (params.maxResults) mapped.maxResults = Number(params.maxResults);

  // Absentee owner
  if (params.absenteeowner === "Y") mapped.absentee_owner = true;
  if (params.absenteeowner === "N") mapped.owner_occupied = true;

  // Sale date filtering — convert ATTOM's startSaleSearchDate/endSaleSearchDate
  // to Realie's transferedSince (days to look back).
  // ATTOM uses "MM/DD/YYYY" or "YYYY-MM-DD" date strings.
  if (params.startSaleSearchDate) {
    const startStr = String(params.startSaleSearchDate);
    // Parse both "MM/DD/YYYY" and "YYYY-MM-DD" formats
    let startDate: Date | null = null;
    if (startStr.includes("/")) {
      const [m, d, y] = startStr.split("/").map(Number);
      startDate = new Date(y, m - 1, d);
    } else {
      startDate = new Date(startStr);
    }
    if (startDate && !isNaN(startDate.getTime())) {
      const daysBack = Math.ceil((Date.now() - startDate.getTime()) / (24 * 60 * 60 * 1000));
      if (daysBack > 0) {
        mapped.transferedSince = String(daysBack);
      }
    }
  }

  // Pagination
  if (params.page) mapped.page = Number(params.page);
  if (params.pagesize) mapped.limit = Number(params.pagesize);

  // Filter residential only (default true unless explicitly set to false)
  mapped.residential = params.residential === "false" || params.residential === false ? false : true;

  return mapped;
}

export function createRealieClient(apiKey?: string): RealieClient {
  const key = apiKey || process.env.REALIE_API_KEY;
  if (!key) {
    throw new Error(
      "Realie.ai API key is required. Set REALIE_API_KEY environment variable or connect via admin settings."
    );
  }
  return new RealieClient({ apiKey: key });
}
