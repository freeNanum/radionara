const SOURCE_HEADERS = {
  "user-agent": "Mozilla/5.0 (compatible; radionara-bot/1.0)",
  "accept-language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
  accept: "application/vnd.apple.mpegurl, application/x-mpegURL, */*",
  referer: "https://sradio365.com/",
  origin: "https://sradio365.com"
};

const ALLOWED_HOST_PATTERN = /(^|\.)cbs\.co\.kr$/i;

function getTargetUrl(request) {
  const raw = request.query?.url;
  if (Array.isArray(raw)) {
    return raw[0] ?? "";
  }
  return typeof raw === "string" ? raw : "";
}

function isAllowedUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    const isHttp = parsed.protocol === "http:" || parsed.protocol === "https:";
    return isHttp && ALLOWED_HOST_PATTERN.test(parsed.hostname);
  } catch {
    return false;
  }
}

function toProxyUrl(rawUrl) {
  return `/api/hls?url=${encodeURIComponent(rawUrl)}`;
}

function resolveUrl(value, baseUrl) {
  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return "";
  }
}

function getFetchCandidates(rawUrl) {
  const parsed = new URL(rawUrl);
  if (parsed.protocol !== "http:") {
    return [rawUrl];
  }

  const secure = new URL(rawUrl);
  secure.protocol = "https:";
  return [secure.toString(), rawUrl];
}

async function fetchUpstream(rawUrl) {
  const candidates = getFetchCandidates(rawUrl);
  let lastError = null;
  let lastResponse = null;

  for (const candidate of candidates) {
    try {
      const upstream = await fetch(candidate, {
        headers: SOURCE_HEADERS,
        redirect: "follow"
      });

      if (upstream.ok) {
        return upstream;
      }

      lastResponse = upstream;
    } catch (error) {
      lastError = error;
    }
  }

  if (lastResponse) {
    return lastResponse;
  }

  throw (lastError instanceof Error ? lastError : new Error("Upstream fetch failed"));
}

function rewriteTagUris(line, baseUrl) {
  return line.replace(/URI="([^"]+)"/g, (_, uri) => {
    const resolved = resolveUrl(uri, baseUrl);
    if (!resolved) {
      return `URI="${uri}"`;
    }
    return `URI="${toProxyUrl(resolved)}"`;
  });
}

function rewriteManifest(manifest, baseUrl) {
  return manifest
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) {
        return line;
      }

      if (trimmed.startsWith("#")) {
        return rewriteTagUris(line, baseUrl);
      }

      const resolved = resolveUrl(trimmed, baseUrl);
      if (!resolved) {
        return line;
      }
      return toProxyUrl(resolved);
    })
    .join("\n");
}

function isManifestContent(contentType, url) {
  const loweredType = (contentType ?? "").toLowerCase();
  return (
    loweredType.includes("mpegurl") ||
    loweredType.includes("application/vnd.apple.mpegurl") ||
    url.toLowerCase().includes(".m3u8")
  );
}

export default async function handler(request, response) {
  const targetUrl = getTargetUrl(request);
  if (!targetUrl || !isAllowedUrl(targetUrl)) {
    response.status(400).json({
      error: "Invalid target URL"
    });
    return;
  }

  try {
    const upstream = await fetchUpstream(targetUrl);

    if (!upstream.ok) {
      response.status(upstream.status).json({
        error: "Failed to fetch upstream stream"
      });
      return;
    }

    const finalUrl = upstream.url;
    if (!isAllowedUrl(finalUrl)) {
      response.status(502).json({
        error: "Upstream redirect is not allowed"
      });
      return;
    }

    const contentType = upstream.headers.get("content-type") ?? "application/octet-stream";
    response.setHeader("Access-Control-Allow-Origin", "*");

    if (isManifestContent(contentType, finalUrl)) {
      const text = await upstream.text();
      const rewrittenManifest = rewriteManifest(text, finalUrl);
      response.setHeader("Content-Type", "application/vnd.apple.mpegurl; charset=utf-8");
      response.setHeader("Cache-Control", "s-maxage=5, stale-while-revalidate=20");
      response.status(200).send(rewrittenManifest);
      return;
    }

    const payload = Buffer.from(await upstream.arrayBuffer());
    response.setHeader("Content-Type", contentType);
    response.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=60");
    response.status(200).send(payload);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown error";
    response.status(500).json({
      error: "Failed to proxy stream",
      detail
    });
  }
}
