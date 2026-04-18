let allVideos = [];
let selectedMember = "전체";
let selectedCategory = "전체";
let selectedChannel = "전체";

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

    renderVideos(getFilteredVideos());
    initFilters();
    initModal();

  } catch (error) {
    console.error("데이터 로드 실패:", error);
    container.innerHTML = `<p>영상을 불러오지 못했습니다.</p>`;
  }
});


function initFilters() {
  document.querySelectorAll(".member-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".member-btn")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      selectedMember = btn.dataset.member;
      renderVideos(getFilteredVideos());
    });
  });

  initDropdown(
    "category-dropdown-btn",
    "category-dropdown-list",
    ".category-option",
    "category",
    (value) => { selectedCategory = value; }
  );

  initDropdown(
    "channel-dropdown-btn",
    "channel-dropdown-list",
    ".channel-option",
    "channel",
    (value) => { selectedChannel = value; }
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
      renderVideos(getFilteredVideos());
    });
  });
}


function initModal() {
  const closeBtn = document.getElementById("modal-close-btn");
  const backdrop = document.querySelector(".modal-backdrop");

  if (closeBtn) closeBtn.addEventListener("click", closePlayer);
  if (backdrop) backdrop.addEventListener("click", closePlayer);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closePlayer();
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

  iframe.src = `https://www.youtube.com/embed/${video.id}?autoplay=1`;
  title.textContent = video.title;
  link.href = `https://www.youtube.com/watch?v=${video.id}`;
  member.textContent = video.members.join(" · ");
  category.textContent = video.category;
  channel.textContent = video.channelLabel;

  modal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}


function closePlayer() {
  const modal = document.getElementById("player-modal");
  const iframe = document.getElementById("player-iframe");

  iframe.src = "";
  modal.classList.add("hidden");
  document.body.style.overflow = "";
}