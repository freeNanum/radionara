import { RADIO_KOREA_CBS_CHANNELS } from "./cbsRadioKorea.js";

const SEOUL_URL = "https://sradio365.com/province/%EC%84%9C%EC%9A%B8%ED%8A%B9%EB%B3%84%EC%8B%9C";
const SUPPLEMENTAL_SEARCH_URLS = [
  "https://sradio365.com/?s=KBS",
  "https://sradio365.com/?s=SBS"
];
const SOURCE_HEADERS = {
  "user-agent": "Mozilla/5.0 (compatible; radionara-bot/1.0)",
  "accept-language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7"
};
const EXCLUDED_IMAGE_URLS = new Set([
  "https://sradio365.com/upload/7527-2022-12-15.png",
  "https://sradio365.com/upload/gwanak.jpg",
  "https://sradio365.com/upload/donga.jpg",
  "https://sradio365.com/upload/4915-2022-05-30.png",
  "https://sradio365.com/upload/7246-2022-10-18.png",
  "https://sradio365.com/upload/1352-2022-10-18.png",
  "https://sradio365.com/upload/2263-2022-10-18.png",
  "https://sradio365.com/upload/3739-2022-10-18.png",
  "https://sradio365.com/upload/7671-2022-12-16.png",
  "https://sradio365.com/upload/9912-2022-12-16.png",
  "https://sradio365.com/upload/6112-2022-12-16.png",
  "https://sradio365.com/upload/1051-2022-12-16.png",
  "https://sradio365.com/upload/3049-2022-12-16.png",
  "https://sradio365.com/upload/8288-2022-12-16.png",
  "https://sradio365.com/upload/0477-2022-12-16.png",
  "https://sradio365.com/upload/1468-2022-12-16.jpg",
  "https://sradio365.com/upload/0032-2022-12-16.png",
  "https://sradio365.com/upload/kbs_world_24.jpg",
  "https://sradio365.com/upload/2159-2024-01-06.jpg",
  "https://sradio365.com/upload/sbs.jpg",
  "https://sradio365.com/upload/6553-2022-12-16.png",
  "https://sradio365.com/upload/7400-2022-12-16.png",
  "https://sradio365.com/upload/3560-2022-12-16.png",
  "https://sradio365.com/upload/7396-2022-12-16.png",
  "https://sradio365.com/upload/7253-2022-12-16.png",
  "https://sradio365.com/upload/9974-2022-12-16.png",
  "https://sradio365.com/upload/2952-2022-12-16.png",
  "https://sradio365.com/upload/8034-2022-12-16.png",
  "https://sradio365.com/upload/6856-2022-12-21.png",
  "https://sradio365.com/upload/0766-2022-12-16.png",
  "https://sradio365.com/upload/9074-2024-02-29.png",
  "https://sradio365.com/upload/wbs.jpg",
  "https://sradio365.com/upload/4275-2023-11-07.jpg"
]);
const EXCLUDED_STATION_IDS = new Set(["r1414", "r1420", "r1421", "r2366", "r2379", "r1386", "r1397"]);
const EXCLUDED_STATION_KEYWORDS = [
  "공동체라디오",
  "community radio",
  "관악fm",
  "동아방송",
  "donga",
  "dong-a",
  "라디오서울",
  "라디오 서울",
  "radio seoul",
  "서울코리아",
  "bbs",
  "불교방송",
  "cpbc",
  "평화방송",
  "가톨릭평화방송"
];

function parseAttributes(tag) {
  const attributes = {};
  const regex = /([\w-]+)="([^"]*)"/g;
  let match = regex.exec(tag);

  while (match) {
    attributes[match[1]] = match[2];
    match = regex.exec(tag);
  }

  return attributes;
}

function absoluteUrl(url) {
  if (!url) {
    return "";
  }
  if (url.startsWith("//")) {
    return `https:${url}`;
  }
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  if (url.startsWith("/")) {
    return `https://sradio365.com${url}`;
  }
  return `https://sradio365.com/${url}`;
}

function parseStations(html) {
  const entries = [];
  const anchorRegex = /<a class="play-icon"[^>]*>/g;

  let match = anchorRegex.exec(html);
  while (match) {
    const attrs = parseAttributes(match[0]);

    if (attrs.id && /^r\d+$/.test(attrs.id)) {
      entries.push({
        id: attrs.id,
        station: attrs["data-station"] ?? "",
        title: attrs["data-title"] ?? "",
        image: absoluteUrl(attrs["data-image"] ?? ""),
        source: attrs["data-source"] ?? "",
        category: attrs["data-category"] ?? ""
      });
    }

    match = anchorRegex.exec(html);
  }

  return entries;
}

function isExcludedStation(station) {
  if (EXCLUDED_IMAGE_URLS.has(station.image) || EXCLUDED_STATION_IDS.has(station.id)) {
    return true;
  }

  const merged = `${station.station} ${station.title}`.toLowerCase();
  return EXCLUDED_STATION_KEYWORDS.some((keyword) => merged.includes(keyword));
}

function isSupplementalStation(station) {
  const mergedRaw = `${station.station} ${station.title}`;
  const merged = mergedRaw.toLowerCase();
  return merged.includes("kbs") || merged.includes("sbs") || mergedRaw.includes("한국방송") || mergedRaw.includes("서울방송");
}

function isCbsStation(station) {
  const merged = `${station.station} ${station.title}`.toLowerCase();
  return merged.includes("cbs");
}

function dedupeStationsById(stations) {
  const seen = new Set();
  return stations.filter((station) => {
    if (!station.id || seen.has(station.id)) {
      return false;
    }
    seen.add(station.id);
    return true;
  });
}

async function loadSupplementalStations() {
  const settled = await Promise.allSettled(
    SUPPLEMENTAL_SEARCH_URLS.map(async (url) => {
      const response = await fetch(url, {
        headers: SOURCE_HEADERS
      });

      if (!response.ok) {
        return [];
      }

      const html = await response.text();
      return parseStations(html);
    })
  );

  return settled
    .flatMap((result) => (result.status === "fulfilled" ? result.value : []))
    .filter(isSupplementalStation);
}

export default async function handler(_, response) {
  try {
    const sourceResponse = await fetch(SEOUL_URL, {
      headers: SOURCE_HEADERS
    });

    if (!sourceResponse.ok) {
      response.status(sourceResponse.status).json({
        error: "Failed to fetch source page"
      });
      return;
    }

    const html = await sourceResponse.text();
    const seoulStations = parseStations(html)
      .filter((station) => !isCbsStation(station))
      .filter((station) => !isExcludedStation(station));
    const supplementalStations = (await loadSupplementalStations())
      .filter((station) => !isCbsStation(station))
      .filter((station) => !isExcludedStation(station));
    const cbsStations = RADIO_KOREA_CBS_CHANNELS.map(({ streamUrl, ...station }) => station);
    const stations = dedupeStationsById([...seoulStations, ...supplementalStations, ...cbsStations]);

    response.setHeader("Cache-Control", "s-maxage=600, stale-while-revalidate=86400");
    response.status(200).json({
      province: "서울특별시",
      sourceUrl: SEOUL_URL,
      updatedAt: new Date().toISOString(),
      count: stations.length,
      stations
    });
  } catch {
    response.status(500).json({
      error: "Failed to load channels"
    });
  }
}
