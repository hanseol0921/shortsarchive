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
    { name: "성호", keywords: ["성호", "SUNGHO"] },
    { name: "리우", keywords: ["리우", "RIWOO"] },
    { name: "명재현", keywords: ["명재현", "JAEHYUN"] },
    { name: "태산", keywords: ["태산", "TAESAN"] },
    { name: "이한", keywords: ["이한", "LEEHAN"] },
    { name: "운학", keywords: ["운학", "WOONHAK"] },
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
      if (text.includes(keyword)) {
        return category.name;
      }
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

async function getUploadPlaylistId(channelId) {
  const url = `https://www.googleapis.com/youtube/v3/channels`
    + `?part=contentDetails`
    + `&id=${channelId}`
    + `&key=${CONFIG.API_KEY}`;
  const response = await fetch(url);
  const data = await response.json();
  return data.items[0].contentDetails.relatedPlaylists.uploads;
}

async function getVideosFromPlaylist(playlistId) {
  let allItems = [];
  let nextPageToken = null;

  // nextPageToken이 없을 때까지 반복 (전체 가져오기)
  // CONFIG에 MAX_PAGES 설정해서 최대 페이지 수 제한 가능
  do {
    const url = `https://www.googleapis.com/youtube/v3/playlistItems`
      + `?part=snippet`
      + `&playlistId=${playlistId}`
      + `&maxResults=50`
      + `&key=${CONFIG.API_KEY}`
      + (nextPageToken ? `&pageToken=${nextPageToken}` : "");

    const response = await fetch(url);
    const data = await response.json();

    allItems = [...allItems, ...data.items];
    nextPageToken = data.nextPageToken || null;

    console.log(`${allItems.length}개 수집 중...`);

  } while (nextPageToken);

  // 50개씩 끊어서 videos.list 호출 (API 제한)
  const allVideos = [];
  for (let i = 0; i < allItems.length; i += 50) {
    const chunk = allItems.slice(i, i + 50);
    const videoIds = chunk.map((item) => item.snippet.resourceId.videoId).join(",");

    const detailUrl = `https://www.googleapis.com/youtube/v3/videos`
      + `?part=contentDetails,snippet`
      + `&id=${videoIds}`
      + `&key=${CONFIG.API_KEY}`;

    const detailResponse = await fetch(detailUrl);
    const detailData = await detailResponse.json();

    detailData.items.forEach((item) => {
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
        channelLabel: "",
      });
    });
  }

  return allVideos;
}

async function fetchChannelShorts(channelId) {
  try {
    const playlistId = await getUploadPlaylistId(channelId);
    const videos = await getVideosFromPlaylist(playlistId);
    const shorts = videos.filter((v) => {
      if (parseDuration(v.duration) > 180) return false;
      if (CONFIG.EXCLUDED_VIDEO_IDS.includes(v.id)) return false;
      return true;
    });
    return shorts;
  } catch (error) {
    console.error("채널 로드 실패:", channelId, error);
    return [];
  }
}

async function fetchAllChannels() {
  try {
    const channelEntries = Object.entries(CONFIG.CHANNELS);
    const promises = channelEntries.map(async ([key, channelId]) => {
      if (!channelId || channelId === "채널ID") return [];

      const videos = await fetchChannelShorts(channelId);

      // 공식 채널은 전체, 다른 채널은 BND 관련 태그 있는 것만
      const filtered = key === "official"
        ? videos
        : videos.filter((v) => isBNDRelated(v.title, v.description));

      return filtered.map((v) => ({
        ...v,
        channelKey: key,
        channelLabel: CONFIG.CHANNEL_NAMES[key] || key,
      }));
    });

    const results = await Promise.all(promises);
    const allVideos = results.flat();
    allVideos.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    console.log(`전체 ${allVideos.length}개 영상 로드 완료`);
    return allVideos;

  } catch (error) {
    console.error("전체 채널 로드 실패:", error);
    return [];
  }
}

// 다른 채널 영상에서 BND 관련 영상만 필터링
function isBNDRelated(title, description) {
  const text = (title + " " + description).toLowerCase();

  // 그룹 태그
  const groupKeywords = [
    "boynextdoor", "BOYNEXTDOOR", "보이넥스트도어", "bnd"
  ];

  // 멤버 이름
  const memberKeywords = [
    "성호", "SUNGHO",
    "리우", "RIWOO",
    "명재현", "JAEHYUN",
    "태산", "TAESAN",
    "이한", "LEEHAN",
    "운학", "WOONHAK",
  ];

  const allKeywords = [...groupKeywords, ...memberKeywords];
  return allKeywords.some((keyword) => text.includes(keyword));
}