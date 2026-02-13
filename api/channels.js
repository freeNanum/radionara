const SEOUL_URL = "https://sradio365.com/province/%EC%84%9C%EC%9A%B8%ED%8A%B9%EB%B3%84%EC%8B%9C";

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

export default async function handler(_, response) {
  try {
    const sourceResponse = await fetch(SEOUL_URL, {
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; radionara-bot/1.0)",
        "accept-language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7"
      }
    });

    if (!sourceResponse.ok) {
      response.status(sourceResponse.status).json({
        error: "Failed to fetch source page"
      });
      return;
    }

    const html = await sourceResponse.text();
    const stations = parseStations(html);

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
