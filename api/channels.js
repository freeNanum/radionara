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
  "https://sradio365.com/upload/7527-2022-12-15.png"
]);

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
  return EXCLUDED_IMAGE_URLS.has(station.image);
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
    const supplementalStations = (await loadSupplementalStations()).filter((station) => !isCbsStation(station));
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
