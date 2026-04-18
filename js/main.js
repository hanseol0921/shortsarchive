let allVideos = [];
let selectedMember = "전체";
let selectedCategory = "전체";
let selectedChannel = "전체";

document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("card-container");
  container.innerHTML = `<p id="loading">영상 불러오는 중...</p>`;

  // videos.json 읽기
  const response = await fetch("./data/videos.json");
  const rawVideos = await response.json();
  

  // overrides.json 읽기 (없으면 localStorage fallback)
  let overrides = {};
  try {
    const overridesResponse = await fetch("./data/overrides.json");
    overrides = await overridesResponse.json();
  } catch {
    // 파일 없으면 localStorage에서 읽기
    overrides = localStorage.getItem("overrides")
      ? JSON.parse(localStorage.getItem("overrides"))
      : {};
  }

  allVideos = rawVideos.map((v) => ({
    ...v,
    originalTitle: v.originalTitle || v.title,
    members: overrides[v.id]?.members || v.members,
    title: overrides[v.id]?.customTitle || v.title,
    customTitle: overrides[v.id]?.customTitle || null,
    category: overrides[v.id]?.category || v.category,
  }));

  container.innerHTML = "";

  if (allVideos.length === 0) {
    container.innerHTML = `<p>영상을 불러오지 못했습니다.</p>`;
    return;
  }

  renderVideos(getFilteredVideos());
  initFilters();
  initModal();
});

function initFilters() {
  // 멤버 버튼
  document.querySelectorAll(".member-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".member-btn")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      selectedMember = btn.dataset.member;
      renderVideos(getFilteredVideos());
    });
  });

  // 카테고리 드롭다운
  initDropdown(
    "category-dropdown-btn",
    "category-dropdown-list",
    ".category-option",
    "category",
    (value) => { selectedCategory = value; }
  );

  // 채널 드롭다운
  initDropdown(
    "channel-dropdown-btn",
    "channel-dropdown-list",
    ".channel-option",
    "channel",
    (value) => { selectedChannel = value; }
  );
}


// 드롭다운 초기화 공통 함수
// 카테고리, 채널 드롭다운 둘 다 같은 구조라 함수로 묶음
function initDropdown(btnId, listId, optionSelector, dataAttr, onSelect) {
  const btn = document.getElementById(btnId);
  const list = document.getElementById(listId);

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    btn.classList.toggle("open");
    list.classList.toggle("hidden");
  });

  document.addEventListener("click", () => {
    btn.classList.remove("open");
    list.classList.add("hidden");
  });

  document.querySelectorAll(optionSelector).forEach((option) => {
    option.addEventListener("click", (e) => {
      e.stopPropagation();
      document.querySelectorAll(optionSelector)
        .forEach((o) => o.classList.remove("active"));
      option.classList.add("active");

      const value = option.dataset[dataAttr];
      const label = option.textContent.trim();

      btn.innerHTML = `${label} <span class="arrow">▼</span>`;
      btn.classList.remove("open");
      list.classList.add("hidden");

      onSelect(value);
      renderVideos(getFilteredVideos());
    });
  });
}


function getFilteredVideos() {
  return allVideos.filter((v) => {
    const memberMatch = selectedMember === "전체"
      || v.members.includes(selectedMember);
    const categoryMatch = selectedCategory === "전체"
      || v.category === selectedCategory;
    const channelMatch = selectedChannel === "전체"
      || v.channelKey === selectedChannel;
    return memberMatch && categoryMatch && channelMatch;
  });
}


function renderVideos(videos) {
  const container = document.getElementById("card-container");
  container.innerHTML = "";

  if (videos.length === 0) {
    container.innerHTML = `<p style="color:#aaa;">해당하는 영상이 없습니다.</p>`;
    return;
  }

  videos.forEach((video) => {
    container.appendChild(createCard(video));
  });
}


function createCard(video) {
  const card = document.createElement("div");
  card.className = "card";

  const hasCustomTitle = video.customTitle !== null;

  card.innerHTML = `
    <div class="card-thumbnail">
      <img src="${video.thumbnail}" alt="${video.title}" />
      <div class="play-overlay">▶</div>
    </div>
    <div class="card-info">
      <p class="card-title">${video.title}</p>
      ${hasCustomTitle
        ? `<p class="card-original-title">원본: ${video.originalTitle}</p>`
        : ""}
      <div class="card-meta">
        <span class="card-member">${video.members.join(" · ")}</span>
        <span class="card-category">${video.category}</span>
      </div>
      <span class="card-channel">${video.channelLabel}</span>
    </div>
  `;

  // 카드 클릭 시 모달 열기
  card.addEventListener("click", () => openPlayer(video));

  return card;
}


function openPlayer(video) {
  const modal = document.getElementById("player-modal");
  const iframe = document.getElementById("player-iframe");
  const title = document.getElementById("modal-title");
  const link = document.getElementById("modal-youtube-link");
  const member = document.getElementById("modal-member");
  const category = document.getElementById("modal-category");
  const channel = document.getElementById("modal-channel");

  // 임베드 URL — autoplay=1로 바로 재생
  iframe.src = `https://www.youtube.com/embed/${video.id}?autoplay=1`;
  title.textContent = video.title;
  link.href = `https://www.youtube.com/watch?v=${video.id}`;
  member.textContent = video.members.join(" · ");
  category.textContent = video.category;
  channel.textContent = video.channelLabel;

  modal.classList.remove("hidden");
  document.body.style.overflow = "hidden"; // 배경 스크롤 방지
}


function closePlayer() {
  const modal = document.getElementById("player-modal");
  const iframe = document.getElementById("player-iframe");

  // src 비워야 영상 재생 멈춤
  iframe.src = "";
  modal.classList.add("hidden");
  document.body.style.overflow = "";
}


// 모달 닫기 이벤트들 — DOMContentLoaded 안의 initFilters() 호출 아래에 추가
function initModal() {
  document.getElementById("modal-close-btn")
    .addEventListener("click", closePlayer);

  document.querySelector(".modal-backdrop")
    .addEventListener("click", closePlayer);

  // ESC 키로도 닫기
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closePlayer();
  });
}