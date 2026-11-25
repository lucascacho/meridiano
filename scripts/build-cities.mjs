import { writeFileSync } from "node:fs";
import { getTimeZones } from "@vvo/tzdb";

const FRI_SAT = new Set([
  "SA", "EG", "KW", "QA", "BH", "OM", "IQ", "YE", "LY", "DZ", "SD", "JO", "PS", "SY",
]);

function weekendFor(country) {
  if (country === "AF") return [4, 5];
  if (country === "IR") return [5];
  if (country === "IL" || FRI_SAT.has(country)) return [5, 6];
  return [0, 6];
}

function slug(value) {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const ES_NAME = {
  "new york city": "Nueva York",
  "mexico city": "Ciudad de México",
  "são paulo": "São Paulo",
  "rio de janeiro": "Río de Janeiro",
  london: "Londres",
  paris: "París",
  rome: "Roma",
  milan: "Milán",
  naples: "Nápoles",
  venice: "Venecia",
  florence: "Florencia",
  lisbon: "Lisboa",
  athens: "Atenas",
  warsaw: "Varsovia",
  prague: "Praga",
  vienna: "Viena",
  brussels: "Bruselas",
  copenhagen: "Copenhague",
  stockholm: "Estocolmo",
  munich: "Múnich",
  cologne: "Colonia",
  hamburg: "Hamburgo",
  frankfurt: "Fráncfort",
  geneva: "Ginebra",
  zurich: "Zúrich",
  zürich: "Zúrich",
  amsterdam: "Ámsterdam",
  "the hague": "La Haya",
  moscow: "Moscú",
  "saint petersburg": "San Petersburgo",
  "st. petersburg": "San Petersburgo",
  kyiv: "Kiev",
  kiev: "Kiev",
  istanbul: "Estambul",
  cairo: "El Cairo",
  alexandria: "Alejandría",
  "cape town": "Ciudad del Cabo",
  johannesburg: "Johannesburgo",
  algiers: "Argel",
  tunis: "Túnez",
  dubai: "Dubái",
  "abu dhabi": "Abu Dabi",
  riyadh: "Riad",
  jeddah: "Yeda",
  mecca: "La Meca",
  muscat: "Mascate",
  tehran: "Teherán",
  baghdad: "Bagdad",
  damascus: "Damasco",
  amman: "Amán",
  jerusalem: "Jerusalén",
  mumbai: "Bombay",
  kolkata: "Calcuta",
  calcutta: "Calcuta",
  bengaluru: "Bangalore",
  bangalore: "Bangalore",
  "new delhi": "Nueva Delhi",
  dhaka: "Daca",
  kathmandu: "Katmandú",
  beijing: "Pekín",
  shanghai: "Shanghái",
  guangzhou: "Cantón",
  taipei: "Taipéi",
  seoul: "Seúl",
  tokyo: "Tokio",
  kyoto: "Kioto",
  singapore: "Singapur",
  jakarta: "Yakarta",
  hanoi: "Hanói",
  "ho chi minh city": "Ciudad Ho Chi Minh",
  "phnom penh": "Nom Pen",
  yangon: "Rangún",
  sydney: "Sídney",
  adelaide: "Adelaida",
  reykjavík: "Reikiavik",
  reykjavik: "Reikiavik",
  dublin: "Dublín",
  edinburgh: "Edimburgo",
  manchester: "Mánchester",
  marseille: "Marsella",
  nice: "Niza",
  bordeaux: "Burdeos",
  seville: "Sevilla",
  malaga: "Málaga",
  málaga: "Málaga",
  havana: "La Habana",
  "panama city": "Ciudad de Panamá",
  "guatemala city": "Ciudad de Guatemala",
  "san jose": "San José",
  "san josé": "San José",
  brasilia: "Brasilia",
  brasília: "Brasilia",
  bogotá: "Bogotá",
  bogota: "Bogotá",
  medellín: "Medellín",
  medellin: "Medellín",
  asunción: "Asunción",
  asuncion: "Asunción",
  valparaíso: "Valparaíso",
  concepción: "Concepción",
  "los angeles": "Los Ángeles",
  "new orleans": "Nueva Orleans",
  philadelphia: "Filadelfia",
  bucharest: "Bucarest",
  belgrade: "Belgrado",
  sofia: "Sofía",
  krakow: "Cracovia",
  kraków: "Cracovia",
  lviv: "Leópolis",
  kharkiv: "Járkov",
  odesa: "Odesa",
  odessa: "Odesa",
  vilnius: "Vilna",
  tallinn: "Tallin",
  tbilisi: "Tiflis",
  yerevan: "Ereván",
  baku: "Bakú",
  almaty: "Almatý",
  tashkent: "Taskent",
  ulaanbaatar: "Ulán Bator",
  yekaterinburg: "Ekaterimburgo",
  kaliningrad: "Kaliningrado",
  skopje: "Skopie",
  "cape verde": "Cabo Verde",
  accra: "Acra",
  "addis ababa": "Adís Abeba",
  khartoum: "Jartum",
  tripoli: "Trípoli",
  abuja: "Abuya",
  marrakesh: "Marrakech",
  marrakech: "Marrakech",
  turin: "Turín",
  genoa: "Génova",
  bologna: "Bolonia",
  porto: "Oporto",
  florence: "Florencia",
  naples: "Nápoles",
  cancun: "Cancún",
  cancún: "Cancún",
  "las palmas de gran canaria": "Las Palmas de Gran Canaria",
  "santa cruz de tenerife": "Santa Cruz de Tenerife",
};

const EXTRA_ALIASES = {
  "new-york-city-us": ["new york", "nyc", "ny", "nueva york", "est", "edt", "et"],
  "los-angeles-us": ["la", "pst", "pdt", "pt"],
  "san-francisco-us": ["sf", "bay area"],
  "chicago-us": ["cst", "cdt", "ct"],
  "denver-us": ["mst", "mdt"],
  "mexico-city-mx": ["cdmx", "ciudad de mexico", "mexico df", "df"],
  "madrid-es": ["cet", "cest"],
  "barcelona-es": ["bcn"],
  "london-gb": ["gmt", "bst", "uk"],
  "buenos-aires-ar": ["bsas", "caba"],
  "sao-paulo-br": ["sampa", "sao paulo"],
  "rio-de-janeiro-br": ["rio"],
  "tokyo-jp": ["jst"],
  "dubai-ae": ["gst"],
  "mumbai-in": ["ist", "bombay"],
  "delhi-in": ["nueva delhi", "new delhi"],
  "singapore-sg": ["sg"],
  "hong-kong-hk": ["hk"],
  "sydney-au": ["aest", "aedt"],
  "utc": ["gmt", "zulu", "universal", "tiempo universal"],
  "washington-us": ["washington dc", "dc", "washington d.c."],
  "cusco-pe": ["cuzco"],
  "palma-es": ["palma de mallorca", "mallorca"],
  "las-palmas-de-gran-canaria-es": ["gran canaria", "canarias"],
  "santa-cruz-de-tenerife-es": ["tenerife", "canarias"],
  "sevilla-es": ["seville"],
  "malaga-es": ["malaga"],
  "a-coruna-es": ["coruna", "la coruna"],
  "gijon-es": ["gijon"],
  "san-sebastian-es": ["donostia", "san sebastian"],
  "cordoba-es": ["cordoba"],
  "medellin-co": ["medellin"],
  "valparaiso-cl": ["valparaiso"],
  "concepcion-cl": ["concepcion"],
  "los-cabos-mx": ["cabo", "cabo san lucas"],
  "brasilia-br": ["brasilia"],
  "belem-br": ["belem"],
  "ho-chi-minh-city-vn": ["saigon", "sai gon", "ho chi minh"],
};

const POPULAR = new Set([
  "madrid-es",
  "barcelona-es",
  "sevilla-es",
  "mexico-city-mx",
  "guadalajara-mx",
  "monterrey-mx",
  "cancun-mx",
  "new-york-city-us",
  "los-angeles-us",
  "chicago-us",
  "miami-us",
  "bogota-co",
  "medellin-co",
  "lima-pe",
  "santiago-cl",
  "buenos-aires-ar",
  "sao-paulo-br",
  "rio-de-janeiro-br",
  "london-gb",
  "paris-fr",
  "berlin-de",
  "rome-it",
  "lisbon-pt",
  "amsterdam-nl",
  "dublin-ie",
  "tokyo-jp",
  "seoul-kr",
  "shanghai-cn",
  "hong-kong-hk",
  "singapore-sg",
  "sydney-au",
  "dubai-ae",
  "mumbai-in",
  "cairo-eg",
  "johannesburg-za",
  "lagos-ng",
  "toronto-ca",
  "vancouver-ca",
  "istanbul-tr",
  "utc",
]);

/** [name, country, timeZone, spanishName?, aliases?] */
const EXTRAS = [
  ["Sevilla", "ES", "Europe/Madrid"],
  ["Málaga", "ES", "Europe/Madrid"],
  ["Bilbao", "ES", "Europe/Madrid"],
  ["Palma", "ES", "Europe/Madrid"],
  ["Alicante", "ES", "Europe/Madrid"],
  ["Murcia", "ES", "Europe/Madrid"],
  ["Granada", "ES", "Europe/Madrid"],
  ["Valladolid", "ES", "Europe/Madrid"],
  ["Vigo", "ES", "Europe/Madrid"],
  ["A Coruña", "ES", "Europe/Madrid"],
  ["Gijón", "ES", "Europe/Madrid"],
  ["San Sebastián", "ES", "Europe/Madrid"],
  ["Pamplona", "ES", "Europe/Madrid"],
  ["Santander", "ES", "Europe/Madrid"],
  ["Córdoba", "ES", "Europe/Madrid"],
  ["Guadalajara", "MX", "America/Mexico_City"],
  ["Monterrey", "MX", "America/Mexico_City"],
  ["León", "MX", "America/Mexico_City"],
  ["Querétaro", "MX", "America/Mexico_City"],
  ["Mérida", "MX", "America/Mexico_City"],
  ["Oaxaca", "MX", "America/Mexico_City"],
  ["Acapulco", "MX", "America/Mexico_City"],
  ["Morelia", "MX", "America/Mexico_City"],
  ["Toluca", "MX", "America/Mexico_City"],
  ["Veracruz", "MX", "America/Mexico_City"],
  ["Aguascalientes", "MX", "America/Mexico_City"],
  ["San Luis Potosí", "MX", "America/Mexico_City"],
  ["Los Cabos", "MX", "America/Mazatlan"],
  ["La Paz", "MX", "America/Mazatlan"],
  ["Medellín", "CO", "America/Bogota"],
  ["Cali", "CO", "America/Bogota"],
  ["Barranquilla", "CO", "America/Bogota"],
  ["Cartagena", "CO", "America/Bogota"],
  ["Mendoza", "AR", "America/Argentina/Mendoza"],
  ["La Plata", "AR", "America/Argentina/Buenos_Aires"],
  ["Valparaíso", "CL", "America/Santiago"],
  ["Concepción", "CL", "America/Santiago"],
  ["Arequipa", "PE", "America/Lima"],
  ["Cusco", "PE", "America/Lima"],
  ["Trujillo", "PE", "America/Lima"],
  ["Guayaquil", "EC", "America/Guayaquil"],
  ["Brasília", "BR", "America/Sao_Paulo"],
  ["Curitiba", "BR", "America/Sao_Paulo"],
  ["Porto Alegre", "BR", "America/Sao_Paulo"],
  ["Recife", "BR", "America/Recife"],
  ["Fortaleza", "BR", "America/Fortaleza"],
  ["Manaus", "BR", "America/Manaus"],
  ["Belém", "BR", "America/Belem"],
  ["Miami", "US", "America/New_York"],
  ["Atlanta", "US", "America/New_York"],
  ["Boston", "US", "America/New_York"],
  ["Washington", "US", "America/New_York"],
  ["Orlando", "US", "America/New_York"],
  ["Detroit", "US", "America/Detroit"],
  ["Houston", "US", "America/Chicago"],
  ["Dallas", "US", "America/Chicago"],
  ["Austin", "US", "America/Chicago"],
  ["San Antonio", "US", "America/Chicago"],
  ["Minneapolis", "US", "America/Chicago"],
  ["New Orleans", "US", "America/Chicago"],
  ["Seattle", "US", "America/Los_Angeles"],
  ["Portland", "US", "America/Los_Angeles"],
  ["Las Vegas", "US", "America/Los_Angeles"],
  ["Salt Lake City", "US", "America/Denver"],
  ["Montreal", "CA", "America/Toronto"],
  ["Ottawa", "CA", "America/Toronto"],
  ["Calgary", "CA", "America/Edmonton"],
  ["Edinburgh", "GB", "Europe/London"],
  ["Manchester", "GB", "Europe/London"],
  ["Glasgow", "GB", "Europe/London"],
  ["Birmingham", "GB", "Europe/London"],
  ["Frankfurt", "DE", "Europe/Berlin"],
  ["Hamburg", "DE", "Europe/Berlin"],
  ["Munich", "DE", "Europe/Berlin"],
  ["Cologne", "DE", "Europe/Berlin"],
  ["Zurich", "CH", "Europe/Zurich"],
  ["Geneva", "CH", "Europe/Zurich"],
  ["Lyon", "FR", "Europe/Paris"],
  ["Marseille", "FR", "Europe/Paris"],
  ["Toulouse", "FR", "Europe/Paris"],
  ["Nice", "FR", "Europe/Paris"],
  ["Milan", "IT", "Europe/Rome"],
  ["Naples", "IT", "Europe/Rome"],
  ["Turin", "IT", "Europe/Rome"],
  ["Florence", "IT", "Europe/Rome"],
  ["Porto", "PT", "Europe/Lisbon"],
];

const zones = getTimeZones({ includeUtc: true });
const canonicalOf = new Map();
for (const zone of zones) {
  canonicalOf.set(zone.name, zone.name);
  for (const alias of zone.group) canonicalOf.set(alias, zone.name);
}

function canonical(name) {
  return canonicalOf.get(name) ?? null;
}

const zoneMeta = new Map(zones.map((zone) => [zone.name, zone]));

function spanishName(name, country) {
  if (country === "CA" && name.toLowerCase() === "sydney") return "Sydney";
  return ES_NAME[name.toLowerCase()] ?? name;
}

const cities = [];
const seen = new Set();

function addCity(name, country, timeZone, continent, primary = false) {
  const tz = canonical(timeZone);
  if (!tz) {
    console.warn("skip unknown zone", timeZone, name);
    return;
  }
  const id = country ? `${slug(name)}-${country.toLowerCase()}` : slug(name);
  if (seen.has(id)) return;
  seen.add(id);
  const meta = zoneMeta.get(tz);
  const aliases = new Set(EXTRA_ALIASES[id] ?? []);
  if (meta?.abbreviation) aliases.add(meta.abbreviation.toLowerCase());
  if (meta?.dstAbbreviation) aliases.add(meta.dstAbbreviation.toLowerCase());
  const nameEs = spanishName(name, country);
  if (nameEs !== name) aliases.add(name);
  const weekend = weekendFor(country);
  const city = {
    id,
    name,
    tz,
    country,
    continent: continent || meta?.continentCode || "",
  };
  if (nameEs !== name) city.nameEs = nameEs;
  const aliasList = [...aliases].map((alias) => alias.toLowerCase()).filter((alias) => alias && alias !== name.toLowerCase() && alias !== nameEs.toLowerCase());
  if (aliasList.length) city.aliases = aliasList.sort();
  if (weekend.join() !== "0,6") city.weekend = weekend;
  if (POPULAR.has(id)) city.popular = true;
  if (primary) city.primary = true;
  cities.push(city);
}

for (const zone of zones) {
  if (zone.name === "Etc/UTC") continue;
  zone.mainCities.forEach((city, index) => {
    addCity(city, zone.countryCode, zone.name, zone.continentCode, index === 0);
  });
}

for (const [name, country, timeZone] of EXTRAS) {
  addCity(name, country, timeZone);
}

addCity("UTC", "", "Etc/UTC", "");
const utc = cities.find((city) => city.id === "utc");
if (utc) {
  utc.nameEs = "UTC";
  utc.popular = true;
  utc.primary = true;
}

cities.sort((a, b) => a.name.localeCompare(b.name, "en") || a.country.localeCompare(b.country));

const zoneAlias = {};
for (const [alias, canon] of canonicalOf) {
  if (alias !== canon) zoneAlias[alias] = canon;
}

const payload = { cities, zoneAlias };
writeFileSync(new URL("../src/data/cities.json", import.meta.url), JSON.stringify(payload));
console.log(`wrote ${cities.length} cities, ${Object.keys(zoneAlias).length} zone aliases`);
