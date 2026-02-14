export const RADIO_KOREA_CBS_CHANNELS = [
  {
    id: "rk-cbs-fm-music",
    station: "CBS 음악FM",
    title: "음악FM CBS 라디오 (Music FM)",
    image: "https://static.mytuner.mobi/media/tvos_radios/593/eumagfm-cbs-radio-music-fm.0f29a25a.png",
    source: "radio-korea",
    category: "CBS",
    streamUrl: "https://m-aac.cbs.co.kr/mweb_cbs939/_definst_/cbs939.stream/chunklist.m3u8"
  },
  {
    id: "rk-cbs-fm-standard",
    station: "CBS 표준FM",
    title: "표준FM CBS 라디오 (Standard FM)",
    image: "https://static.mytuner.mobi/media/tvos_radios/017/pyojunfm-cbs-radio-standard-fm.982d4655.png",
    source: "radio-korea",
    category: "CBS",
    streamUrl: "https://m-aac.cbs.co.kr/mweb_cbs981/_definst_/cbs981.stream/chunklist.m3u8"
  },
  {
    id: "rk-cbs-fm-joy4u",
    station: "CBS Joy4U",
    title: "CBS Joy4U-CBS 라디오",
    image: "https://static.mytuner.mobi/media/tvos_radios/888/cbs-joy4u-cbs-radio.851e9d2a.png",
    source: "radio-korea",
    category: "CBS",
    streamUrl: "https://m-aac.cbs.co.kr/mweb_cbscmc/_definst_/cbscmc.stream/playlist.m3u8"
  },
  {
    id: "rk-cbs-gwangju",
    station: "CBS 광주",
    title: "광주CBS (CBS Gwangju)",
    image: "https://static.mytuner.mobi/media/tvos_radios/935/gwangjucbs-cbs-gwangju.b3e2a776.png",
    source: "radio-korea",
    category: "CBS",
    streamUrl: "https://m-aac.cbs.co.kr/gwangju/_definst_/gwangju.stream/playlist.m3u8"
  }
];

export function getRadioKoreaCbsStreamById(stationId) {
  return RADIO_KOREA_CBS_CHANNELS.find((station) => station.id === stationId)?.streamUrl ?? "";
}
