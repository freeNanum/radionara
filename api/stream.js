const STREAM_API = "https://sradio365.com/ajax/radio.php";

export default async function handler(request, response) {
  const radio = request.query?.radio;

  if (!radio || typeof radio !== "string" || !/^r\d+$/.test(radio)) {
    response.status(400).json({
      error: "Invalid radio id"
    });
    return;
  }

  const apiUrl = `${STREAM_API}?radio=${encodeURIComponent(radio)}`;

  try {
    const sourceResponse = await fetch(apiUrl, {
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; radionara-bot/1.0)",
        "accept-language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7"
      }
    });

    if (!sourceResponse.ok) {
      response.status(sourceResponse.status).json({
        error: "Failed to fetch stream"
      });
      return;
    }

    const payload = await sourceResponse.json();
    const streamUrl = payload?.result;

    if (!streamUrl || typeof streamUrl !== "string") {
      response.status(404).json({
        error: "Stream URL not found"
      });
      return;
    }

    response.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=3600");
    response.status(200).json({ streamUrl });
  } catch {
    response.status(500).json({
      error: "Failed to resolve stream"
    });
  }
}
