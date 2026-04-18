// ⚠️ 나중에 GitHub에 올릴 때 이 파일은 .gitignore에 추가해야 함
// API 키가 외부에 노출되면 안 되기 때문

const CONFIG = {
  API_KEY: "",

  // 채널 ID 찾는 법:
  // 유튜브 채널 접속 → 채널 홈 URL 확인
  // youtube.com/@채널명 형식이면 아래 방법으로 ID 확인
  // 채널 홈 → 우클릭 → 페이지 소스 보기 → "channelId" 검색
  CHANNELS: {
    official: "UChhKBlh_wvspTh5n4mL0b5g",  // B그룹 공식 채널 ID
    DAYOUNG: "UC2LP07vrf6V_k6eFIVz37Ow",   // 예: Universe 채널
    LESSERAFIM: "UCs-QBT4qkj_YiQw1ZntDO3g",       // 예: Mnet 채널
  },

  MAX_RESULTS: 50,  // 한 번에 가져올 최대 영상 수 (API 최대값)
  EXCLUDED_VIDEO_IDS: [
    "nAd1x4ml3rw", // 태산 CMR
    "E1A5ZkZZ_WI", // 리우 마잭
    "nxWDWgnOyx0",// 명재현 브라질리언 펑크
    "vWaX4BgfjLA", // 이한 재즈
    "YEQ1Dyk66ZE", // 성호 톡식틸앤
    "67UPb0UawjE", // 운학 끼좀 부리지마

    "n6CKdrTF3so", // 오알럽 일본분이랑 같이부른 그거
    "8D8lyiMOr6g", // 세이치즈
  ],
    CATEGORIES: [
    { name: "댄스 챌린지", keywords: ["챌린지", "challenge"] },
    { name: "비하인드", keywords: ["비하인드", "behind",] },
    { name: "밈", keywords: ["밈", " memes"] },
  ],

  // 채널별 표시 이름 (카드에 출처 표시용)
  CHANNEL_NAMES: {
    official: "보이넥스트도어",
    DAYOUNG: "다영 DAYOUNG",
    LESSERAFIM: "LESSERAFIM",
  },
};