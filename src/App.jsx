import { useEffect, useMemo, useRef, useState } from "react";
import Hls from "hls.js";

const FAVORITES_KEY = "radionara:favorites";
const TIMER_OPTIONS = [0, 10, 30, 60];

function readFavorites() {
  try {
    const saved = localStorage.getItem(FAVORITES_KEY);
    if (!saved) {
      return [];
    }
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function absoluteImage(url) {
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

async function loadStreamUrl(stationId) {
  const response = await fetch(`/api/stream?radio=${encodeURIComponent(stationId)}`);
  if (!response.ok) {
    throw new Error("스트림 주소를 불러오지 못했습니다.");
  }

  const payload = await response.json();
  if (!payload?.streamUrl) {
    throw new Error("유효한 스트림 주소가 없습니다.");
  }

  return payload.streamUrl;
}

export default function App() {
  const audioRef = useRef(new Audio());
  const hlsRef = useRef(null);
  const sleepTimerRef = useRef(null);

  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [isPlaying, setIsPlaying] = useState(false);
  const [isResolvingStream, setIsResolvingStream] = useState(false);
  const [streamError, setStreamError] = useState("");
  const [currentStation, setCurrentStation] = useState(null);
  const [currentStreamUrl, setCurrentStreamUrl] = useState("");

  const [volume, setVolume] = useState(0.8);
  const [favorites, setFavorites] = useState(() => readFavorites());

  const [sleepMinutes, setSleepMinutes] = useState(0);
  const [sleepEndsAt, setSleepEndsAt] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    audio.preload = "none";
    audio.volume = volume;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onError = () => {
      setStreamError("재생 중 오류가 발생했습니다. 다른 채널을 선택해보세요.");
      setIsPlaying(false);
    };

    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("error", onError);

    return () => {
      audio.pause();
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("error", onError);
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
      clearTimeout(sleepTimerRef.current);
    };
  }, []);

  useEffect(() => {
    audioRef.current.volume = volume;
  }, [volume]);

  useEffect(() => {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    async function fetchStations() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch("/api/channels");
        if (!response.ok) {
          throw new Error("채널 목록을 불러오지 못했습니다.");
        }
        const payload = await response.json();
        setStations(Array.isArray(payload?.stations) ? payload.stations : []);
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : "채널 목록 조회 실패");
      } finally {
        setLoading(false);
      }
    }

    fetchStations();
  }, []);

  const filteredStations = useMemo(() => {
    const normalized = search.trim().toLowerCase();

    return stations
      .filter((station) => {
        if (!normalized) {
          return true;
        }
        return (
          station.station.toLowerCase().includes(normalized) ||
          station.title.toLowerCase().includes(normalized)
        );
      })
      .sort((a, b) => {
        const aFav = favorites.includes(a.id);
        const bFav = favorites.includes(b.id);
        if (aFav === bFav) {
          return a.station.localeCompare(b.station, "ko");
        }
        return aFav ? -1 : 1;
      });
  }, [favorites, search, stations]);

  function buildPlaybackCandidates(streamUrl) {
    if (!streamUrl.startsWith("http://")) {
      return [streamUrl];
    }

    const secureUrl = `https://${streamUrl.slice("http://".length)}`;
    if (window.location.protocol === "https:") {
      return [secureUrl];
    }

    return [secureUrl, streamUrl];
  }

  async function attachStreamAndPlay(streamUrl) {
    const audio = audioRef.current;
    const candidates = buildPlaybackCandidates(streamUrl);
    let lastError = null;

    for (const candidate of candidates) {
      try {
        if (hlsRef.current) {
          hlsRef.current.destroy();
          hlsRef.current = null;
        }

        const isHls = candidate.includes(".m3u8");
        if (isHls && !audio.canPlayType("application/vnd.apple.mpegurl") && Hls.isSupported()) {
          const hls = new Hls({ enableWorker: true });
          hlsRef.current = hls;
          await new Promise((resolve, reject) => {
            const onManifestParsed = () => {
              hls.off(Hls.Events.MANIFEST_PARSED, onManifestParsed);
              hls.off(Hls.Events.ERROR, onError);
              resolve();
            };

            const onError = (_, data) => {
              if (!data.fatal) {
                return;
              }

              hls.off(Hls.Events.MANIFEST_PARSED, onManifestParsed);
              hls.off(Hls.Events.ERROR, onError);
              reject(new Error(data.details || "HLS stream failed"));
            };

            hls.on(Hls.Events.MANIFEST_PARSED, onManifestParsed);
            hls.on(Hls.Events.ERROR, onError);
            hls.loadSource(candidate);
            hls.attachMedia(audio);
          });
        } else {
          audio.src = candidate;
        }

        await audio.play();
        return candidate;
      } catch (error) {
        lastError = error;
      }
    }

    throw (lastError instanceof Error ? lastError : new Error("HLS stream failed"));
  }

  async function onSelectStation(station) {
    if (isResolvingStream) {
      return;
    }

    setStreamError("");
    setCurrentStation(station);
    setIsResolvingStream(true);

    try {
      const streamUrl = await loadStreamUrl(station.id);
      const activeStreamUrl = await attachStreamAndPlay(streamUrl);
      setCurrentStreamUrl(activeStreamUrl);
    } catch (playError) {
      setStreamError(playError instanceof Error ? playError.message : "재생에 실패했습니다.");
      setIsPlaying(false);
    } finally {
      setIsResolvingStream(false);
    }
  }

  async function onTogglePlay() {
    const audio = audioRef.current;

    if (!currentStation) {
      if (filteredStations.length > 0) {
        await onSelectStation(filteredStations[0]);
      }
      return;
    }

    if (audio.paused) {
      try {
        await audio.play();
      } catch {
        setStreamError("브라우저 정책으로 자동 재생이 차단되었습니다. 채널을 다시 눌러주세요.");
      }
      return;
    }

    audio.pause();
  }

  function onToggleFavorite(stationId) {
    setFavorites((prev) => {
      if (prev.includes(stationId)) {
        return prev.filter((value) => value !== stationId);
      }
      return [...prev, stationId];
    });
  }

  function onSetSleepTimer(minutes) {
    clearTimeout(sleepTimerRef.current);
    setSleepMinutes(minutes);

    if (minutes === 0) {
      setSleepEndsAt(0);
      return;
    }

    const endsAt = Date.now() + minutes * 60 * 1000;
    setSleepEndsAt(endsAt);
    sleepTimerRef.current = setTimeout(() => {
      audioRef.current.pause();
      setSleepMinutes(0);
      setSleepEndsAt(0);
    }, minutes * 60 * 1000);
  }

  const timerLabel = sleepMinutes === 0
    ? "꺼짐"
    : `${sleepMinutes}분 후 종료 (${new Date(sleepEndsAt).toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit"
      })})`;

  return (
    <div className="app-shell">
      <div className="aurora aurora-a" />
      <div className="aurora aurora-b" />

      <header className="hero">
        <p className="chip">SEOUL LIVE RADIO</p>
        <h1>라디오나라</h1>
        <p className="hero-copy">
          한국 채널을 기반으로 실시간 라디오를 재생합니다.
          즐겨찾기와 취침 타이머를 포함한 웹 전용 플레이어입니다.
        </p>

        <div className="hero-controls">
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="방송국 또는 채널명을 검색하세요"
            className="search-input"
          />

          <label className="timer-select-wrap" htmlFor="sleep-timer">
            취침 타이머
            <select
              id="sleep-timer"
              className="timer-select"
              value={sleepMinutes}
              onChange={(event) => onSetSleepTimer(Number(event.target.value))}
            >
              {TIMER_OPTIONS.map((minutes) => (
                <option key={minutes} value={minutes}>
                  {minutes === 0 ? "사용 안 함" : `${minutes}분`}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="stats">
          <div>
            <span>채널 수</span>
            <strong>{stations.length}</strong>
          </div>
          <div>
            <span>즐겨찾기</span>
            <strong>{favorites.length}</strong>
          </div>
          <div>
            <span>타이머</span>
            <strong>{timerLabel}</strong>
          </div>
        </div>
      </header>

      {error && <p className="status error">{error}</p>}
      {streamError && <p className="status error">{streamError}</p>}
      {loading && <p className="status">채널 목록을 가져오는 중...</p>}

      <main className="station-grid" aria-live="polite">
        {filteredStations.map((station) => {
          const active = currentStation?.id === station.id;
          const favorite = favorites.includes(station.id);

          return (
            <article key={station.id} className={`station-card ${active ? "active" : ""}`}>
              <button
                type="button"
                className="thumb-wrap"
                onClick={() => onSelectStation(station)}
                disabled={isResolvingStream}
              >
                <img src={absoluteImage(station.image)} alt={station.station} loading="lazy" />
                <span className="live-pill">LIVE</span>
              </button>

              <div className="station-content">
                <p className="station-name">{station.station}</p>
                <p className="station-title">{station.title}</p>
                <div className="station-actions">
                  <button
                    type="button"
                    className="play-btn"
                    onClick={() => onSelectStation(station)}
                    disabled={isResolvingStream}
                  >
                    {active && isPlaying ? "재생 중" : "재생"}
                  </button>
                  <button
                    type="button"
                    className={`fav-btn ${favorite ? "is-favorite" : ""}`}
                    onClick={() => onToggleFavorite(station.id)}
                  >
                    {favorite ? "★" : "☆"}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </main>

      <footer className="player-dock">
        <div className="dock-now">
          <p>현재 재생</p>
          <strong>{currentStation ? currentStation.title : "채널을 선택하세요"}</strong>
        </div>

        <div className="dock-actions">
          <button type="button" className="dock-play" onClick={onTogglePlay}>
            {isPlaying ? "일시정지" : "재생"}
          </button>

          <label htmlFor="volume" className="volume-wrap">
            볼륨
            <input
              id="volume"
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(event) => setVolume(Number(event.target.value))}
            />
          </label>
        </div>

        <small className="dock-meta">
          {currentStreamUrl ? `스트림: ${currentStreamUrl}` : "스트림 URL은 채널 선택 시 로드됩니다."}
        </small>
      </footer>
    </div>
  );
}
