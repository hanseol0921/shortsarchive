// Node.js 환경에서 실행되는 스크립트
// 브라우저 JS랑 거의 동일하지만 fetch 대신 https 모듈 사용
// Node 18 이상은 fetch 내장이라 그냥 사용 가능

const fs = require("fs");

// 환경변수에서 API 키 읽기
// GitHub Secrets에 저장한 값이 여기로 들어옴 (코드에 키 노출 없음)
const API_KEY = process.env.YOUTUBE_API_KEY;

const CONFIG = {
  CHANNELS: {
    official: "UChhKBlh_wvspTh5n4mL0b5g",
    // 추가 채널 있으면 여기도 동일하게
  },
  CHANNEL_NAMES: {
    official: "BND 공식",
  },
  CATEGORIES: [
    { name: "챌린지", keywords: ["챌린지", "challenge"] },
    { name: "비하인드", keywords: ["비하인드", "behind"] },
    { name: "직캠", keywords: ["직캠", "fancam", "focus"] },
    { name: "댄스", keywords: ["dance", "댄스"] },
    { name: "커버", keywords: ["cover", "커버"] },
  ],
  EXCLUDED_VIDEO_IDS: [],
};

function cleanTitle(title) {
  const removeHashtags = ["#BOYNEXTDOOR", "#보이넥스트도어", "#BND", "#Shorts", "#shorts"];
  let cleaned = title;
  removeHashtags.forEach((tag) => {
    cleaned = cleaned.replace(new RegExp(tag, "gi"), "");
  });
  return cleaned.trim();
}

function detectMember(title, description) {
  const text = (title + " " + description).toLowerCase();
  const members = [
    { name: "성호", keywords: ["성호", "sungho", "sung ho"] },
    { name: "리우", keywords: ["리우", "riwoo", "ri woo"] },
    { name: "명재현", keywords: ["명재현", "재현", "jaehyun", "jae hyun"] },
    { name: "태산", keywords: ["태산", "taesan", "tae san"] },
    { name: "이한", keywords: ["이한", "leehan", "lee han"] },
    { name: "운학", keywords: ["운학", "woonhak", "woon hak"] },
  ];
  const matched = [];
  for (const member of members) {
    for (const keyword of member.keywords) {
      if (text.includes(keyword)) {
        matched.push(member.name);
        break;
      }
    }
  }
  return matched.length > 0 ? matched : ["미분류"];
}

function detectCategory(title, description) {
  const text = (title + " " + description).toLowerCase();
  for (const category of CONFIG.CATEGORIES) {
    for (const keyword of category.keywords) {
      if (text.includes(keyword)) return category.name;
    }
  }
  return "기타";
}

function parseDuration(duration) {
  if (!duration) return 999;
  const hours = (duration.match(/(\d+)H/) || [])[1] || 0;
  const minutes = (duration.match(/(\d+)M/) || [])[1] || 0;
  const seconds = (duration.match(/(\d+)S/) || [])[1] || 0;
  return parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseInt(seconds);
}

function isBNDRelated(title, description) {
  const text = (title + " " + description).toLowerCase();
  const keywords = [
    "boynextdoor", "boy next door", "보이넥스트도어", "bnd",
    "성호", "sungho", "리우", "riwoo",
    "명재현", "jaehyun", "태산", "taesan",
    "이한", "leehan", "운학", "woonhak",
  ];
  return keywords.some((k) => text.includes(k));
}

async function getUploadPlaylistId(channelId) {
  const url = `https://www.googleapis.com/youtube/v3/channels`
    + `?part=contentDetails&id=${channelId}&key=${API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  return data.items[0].contentDetails.relatedPlaylists.uploads;
}

async function getVideosFromPlaylist(playlistId) {
  let allItems = [];
  let nextPageToken = null;

  do {
    const url = `https://www.googleapis.com/youtube/v3/playlistItems`
      + `?part=snippet&playlistId=${playlistId}&maxResults=50&key=${API_KEY}`
      + (nextPageToken ? `&pageToken=${nextPageToken}` : "");
    const res = await fetch(url);
    const data = await res.json();
    allItems = [...allItems, ...data.items];
    nextPageToken = data.nextPageToken || null;
    console.log(`  ${allItems.length}개 수집 중...`);
  } while (nextPageToken);

  const allVideos = [];
  for (let i = 0; i < allItems.length; i += 50) {
    const chunk = allItems.slice(i, i + 50);
    const ids = chunk.map((item) => item.snippet.resourceId.videoId).join(",");
    const url = `https://www.googleapis.com/youtube/v3/videos`
      + `?part=contentDetails,snippet&id=${ids}&key=${API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    data.items.forEach((item) => {
      allVideos.push({
        id: item.id,
        title: cleanTitle(item.snippet.title),
        originalTitle: item.snippet.title,
        thumbnail: item.snippet.thumbnails.medium.url,
        description: item.snippet.description,
        publishedAt: item.snippet.publishedAt,
        duration: item.contentDetails.duration,
        members: detectMember(item.snippet.title, item.snippet.description),
        category: detectCategory(item.snippet.title, item.snippet.description),
      });
    });
  }
  return allVideos;
}

async function fetchChannelShorts(channelId, isOfficial) {
  const playlistId = await getUploadPlaylistId(channelId);
  const videos = await getVideosFromPlaylist(playlistId);
  return videos.filter((v) => {
    if (parseDuration(v.duration) > 180) return false;
    if (CONFIG.EXCLUDED_VIDEO_IDS.includes(v.id)) return false;
    if (!isOfficial && !isBNDRelated(v.title, v.description)) return false;
    return true;
  });
}

async function main() {
  console.log("영상 데이터 수집 시작...");
  const allVideos = [];

  for (const [key, channelId] of Object.entries(CONFIG.CHANNELS)) {
    if (!channelId || channelId === "채널ID") continue;
    console.log(`[${CONFIG.CHANNEL_NAMES[key]}] 수집 중...`);
    const videos = await fetchChannelShorts(channelId, key === "official");
    videos.forEach((v) => {
      allVideos.push({
        ...v,
        channelKey: key,
        channelLabel: CONFIG.CHANNEL_NAMES[key] || key,
      });
    });
  }

  allVideos.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

  // data/videos.json으로 저장
  if (!fs.existsSync("data")) fs.mkdirSync("data");
  fs.writeFileSync("data/videos.json", JSON.stringify(allVideos, null, 2));
  console.log(`완료! 총 ${allVideos.length}개 영상 저장됨`);
}

main().catch(console.error);