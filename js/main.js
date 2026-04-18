let allVideos = [];
let filteredVideos = []; // 현재 필터링된 영상 목록
let currentIndex = 0;   // 모달에서 현재 보고있는 영상 인덱스
let selectedMember = "전체";
let selectedCategory = "전체";
let selectedChannel = "전체";
let searchQuery = "";

// 스와이프 감지용 변수
let touchStartX = 0;
let touchEndX = 0;
let touchStartY = 0;  // ← 추가
let touchEndY = 0;

// 관리자 페이지 단축키 — Shift + A + D 동시에
const keysPressed = new Set();

document.addEventListener("keydown", (e) => {
  keysPressed.add(e.key.toLowerCase());

  if (
    keysPressed.has("shift") &&
    keysPressed.has("a") &&
    keysPressed.has("d")
  ) {
    location.href = "./admin.html";
  }
});

document.addEventListener("keyup", (e) => {
  keysPressed.delete(e.key.toLowerCase());
});

document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("card-container");
  container.innerHTML = `<p id="loading">영상 불러오는 중...</p>`;

  try {
    const response = await fetch("./data/videos.json");
    const rawVideos = await response.json();

    let overrides = {};
    try {
      const overridesResponse = await fetch("./data/overrides.json");
      overrides = await overridesResponse.json();
    } catch {
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

    filteredVideos = getFilteredVideos();
    renderVideos(filteredVideos);
    initFilters();
    initSearch();
    initModal();

  } catch (error) {
    console.error("데이터 로드 실패:", error);
    container.innerHTML = `<p>영상을 불러오지 못했습니다.</p>`;
  }
});


// 검색 초기화
function initSearch() {
  const input = document.getElementById("search-input");
  if (!input) return;

  // 실시간 검색 (타이핑할 때마다)
  input.addEventListener("input", () => {
    searchQuery = input.value.trim().toLowerCase();
    filteredVideos = getFilteredVideos();
    renderVideos(filteredVideos);
  });

  // 엔터키 검색
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      searchQuery = input.value.trim().toLowerCase();
      filteredVideos = getFilteredVideos();
      renderVideos(filteredVideos);
      input.blur(); // 키보드 내리기 (모바일)
    }
  });
}


function initFilters() {
  document.querySelectorAll(".member-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".member-btn")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      selectedMember = btn.dataset.member;
      filteredVideos = getFilteredVideos();
      renderVideos(filteredVideos);
    });
  });

  initDropdown(
    "category-dropdown-btn",
    "category-dropdown-list",
    ".category-option",
    "category",
    (value) => {
      selectedCategory = value;
      filteredVideos = getFilteredVideos();
      renderVideos(filteredVideos);
    }
  );

  initDropdown(
    "channel-dropdown-btn",
    "channel-dropdown-list",
    ".channel-option",
    "channel",
    (value) => {
      selectedChannel = value;
      filteredVideos = getFilteredVideos();
      renderVideos(filteredVideos);
    }
  );
}


function initDropdown(btnId, listId, optionSelector, dataAttr, onSelect) {
  const btn = document.getElementById(btnId);
  const list = document.getElementById(listId);

  if (!btn || !list) return;

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
    });
  });
}


function initModal() {
  const closeBtn = document.getElementById("modal-close-btn");
  const backdrop = document.querySelector(".modal-backdrop");
  const prevBtn = document.getElementById("prev-btn");
  const nextBtn = document.getElementById("next-btn");
  const swipeLayer = document.getElementById("swipe-layer");

  if (closeBtn) closeBtn.addEventListener("click", closePlayer);
  if (backdrop) backdrop.addEventListener("click", closePlayer);
  if (prevBtn) prevBtn.addEventListener("click", () => navigateVideo(-1));
  if (nextBtn) nextBtn.addEventListener("click", () => navigateVideo(1));

  // 키보드 이벤트
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closePlayer();
    if (e.key === "ArrowLeft") navigateVideo(-1);
    if (e.key === "ArrowRight") navigateVideo(1);
  });

  // 스와이프 감지 — iframe 위 투명 레이어에서
  if (swipeLayer) {
    swipeLayer.addEventListener("touchstart", (e) => {
      touchStartX = e.changedTouches[0].screenX;
      touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });

    swipeLayer.addEventListener("touchend", (e) => {
      touchEndX = e.changedTouches[0].screenX;
      touchEndY = e.changedTouches[0].screenY;
      handleSwipe();
    }, { passive: true });
  }
}

function handleSwipe() {
  const diffX = touchStartX - touchEndX;
  const diffY = Math.abs(touchStartY - touchEndY);

  // 세로 움직임이 가로보다 크면 스크롤로 간주, 무시
  if (diffY > Math.abs(diffX)) return;
  // 50px 이상 가로 스와이프해야 반응
  if (Math.abs(diffX) < 50) return;

  if (diffX > 0) {
    navigateVideo(1);   // 왼쪽 스와이프 → 다음
  } else {
    navigateVideo(-1);  // 오른쪽 스와이프 → 이전
  }
}


// 이전/다음 영상으로 이동
function navigateVideo(direction) {
  const newIndex = currentIndex + direction;

  // 범위 벗어나면 무시
  if (newIndex < 0 || newIndex >= filteredVideos.length) return;

  currentIndex = newIndex;
  updatePlayer(filteredVideos[currentIndex]);
}


function getFilteredVideos() {
  return allVideos.filter((v) => {
    const memberMatch = selectedMember === "전체"
      || v.members.includes(selectedMember);
    const categoryMatch = selectedCategory === "전체"
      || v.category === selectedCategory;
    const channelMatch = selectedChannel === "전체"
      || v.channelKey === selectedChannel;

    // 검색어 필터 — 제목, 멤버 이름에서 검색
    const searchMatch = searchQuery === ""
      || v.title.toLowerCase().includes(searchQuery)
      || v.members.some((m) => m.toLowerCase().includes(searchQuery));

    return memberMatch && categoryMatch && channelMatch && searchMatch;
  });
}


function renderVideos(videos) {
  const container = document.getElementById("card-container");
  container.innerHTML = "";

  if (videos.length === 0) {
    container.innerHTML = `<p style="color:#aaa;">해당하는 영상이 없습니다.</p>`;
    return;
  }

  videos.forEach((video, index) => {
    container.appendChild(createCard(video, index));
  });
}


function createCard(video, index) {
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

  // index 저장해서 모달에서 현재 위치 파악
  card.addEventListener("click", () => {
    currentIndex = index;
    openPlayer(video);
  });

  return card;
}


function openPlayer(video) {
  const modal = document.getElementById("player-modal");
  modal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
  updatePlayer(video);
}


// 플레이어 내용 업데이트 (이전/다음 이동 시에도 사용)
function updatePlayer(video) {
  const iframe = document.getElementById("player-iframe");
  const title = document.getElementById("modal-title");
  const link = document.getElementById("modal-youtube-link");
  const member = document.getElementById("modal-member");
  const category = document.getElementById("modal-category");
  const channel = document.getElementById("modal-channel");
  const prevBtn = document.getElementById("prev-btn");
  const nextBtn = document.getElementById("next-btn");

  iframe.src = `https://www.youtube.com/embed/${video.id}?autoplay=1`;
  title.textContent = video.title;
  link.href = `https://www.youtube.com/watch?v=${video.id}`;
  member.textContent = video.members.join(" · ");
  category.textContent = video.category;
  channel.textContent = video.channelLabel;

  // 첫 번째 영상이면 이전 버튼 흐리게
  prevBtn.style.opacity = currentIndex === 0 ? "0.3" : "1";
  prevBtn.style.pointerEvents = currentIndex === 0 ? "none" : "auto";

  // 마지막 영상이면 다음 버튼 흐리게
  nextBtn.style.opacity = currentIndex === filteredVideos.length - 1 ? "0.3" : "1";
  nextBtn.style.pointerEvents = currentIndex === filteredVideos.length - 1 ? "none" : "auto";
}


function closePlayer() {
  const modal = document.getElementById("player-modal");
  const iframe = document.getElementById("player-iframe");
  iframe.src = "";
  modal.classList.add("hidden");
  document.body.style.overflow = "";
}