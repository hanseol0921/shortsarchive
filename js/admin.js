const ADMIN_PASSWORD = "1800213";
const MEMBER_LIST = ["성호", "리우", "명재현", "태산", "이한", "운학"];
const CATEGORY_LIST = ["챌린지", "비하인드", "직캠", "댄스", "커버", "기타"];

function loadOverrides() {
  const saved = localStorage.getItem("overrides");
  return saved ? JSON.parse(saved) : {};
}

function saveOverrides(overrides) {
  localStorage.setItem("overrides", JSON.stringify(overrides));
}

document.getElementById("pw-btn").addEventListener("click", () => {
  const input = document.getElementById("pw-input").value;
  if (input === ADMIN_PASSWORD) {
    document.getElementById("auth-screen").style.display = "none";
    document.getElementById("admin-screen").style.display = "block";
    loadAdminPage();
  } else {
    document.getElementById("pw-error").style.display = "block";
  }
});

document.getElementById("pw-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter") document.getElementById("pw-btn").click();
});


// 선택된 영상 ID 추적 (카테고리 일괄 지정용)
let selectedVideoIds = new Set();

async function loadAdminPage() {
  const container = document.getElementById("admin-card-container");
  container.innerHTML = "<p>영상 불러오는 중...</p>";

  // fetchAllChannels() 대신 videos.json에서 읽기
  const response = await fetch("./data/videos.json");
  const videos = await response.json();

  const overrides = loadOverrides();

  const applied = videos.map((v) => ({
    ...v,
    originalTitle: v.originalTitle || v.title,
    members: overrides[v.id]?.members || v.members,
    customTitle: overrides[v.id]?.customTitle || "",
    category: overrides[v.id]?.category || v.category,
  }));

  // 나머지 코드는 그대로 유지
  const sorted = [
    ...applied.filter((v) => v.members.includes("미분류")),
    ...applied.filter((v) => !v.members.includes("미분류")),
  ];

  const untaggedCount = applied.filter((v) => v.members.includes("미분류")).length;
  document.getElementById("untagged-count").textContent =
    `미분류: ${untaggedCount}개 / 전체: ${applied.length}개`;

  // 미분류 먼저
  const sorted = [
    ...applied.filter((v) => v.members.includes("미분류")),
    ...applied.filter((v) => !v.members.includes("미분류")),
  ];

  const untaggedCount = applied.filter((v) => v.members.includes("미분류")).length;
  document.getElementById("untagged-count").textContent =
    `미분류: ${untaggedCount}개 / 전체: ${applied.length}개`;

  container.innerHTML = "";

  // 카테고리 일괄 지정 툴바
  const toolbar = document.createElement("div");
  toolbar.id = "bulk-toolbar";
  toolbar.innerHTML = `
    <span id="selected-count">0개 선택됨</span>
    <select id="bulk-category-select">
      <option value="">카테고리 선택</option>
      ${CATEGORY_LIST.map((c) => `<option value="${c}">${c}</option>`).join("")}
    </select>
    <button id="bulk-apply-btn">선택 영상에 적용</button>
  `;
  container.appendChild(toolbar);

  sorted.forEach((video) => {
    const card = document.createElement("div");
    card.className = "admin-card";
    card.dataset.id = video.id;

    card.innerHTML = `
      <!-- 선택 체크박스 (카테고리 일괄 지정용) -->
      <input type="checkbox" class="video-select-checkbox" />

      <a href="https://www.youtube.com/watch?v=${video.id}" target="_blank">
        <img src="${video.thumbnail}" alt="${video.originalTitle}" />
      </a>
      <div class="admin-card-info">
        <p class="original-title">원본: ${video.originalTitle}</p>

        <label>커스텀 제목</label>
        <input
          type="text"
          class="custom-title-input"
          placeholder="비워두면 원본 사용"
          value="${video.customTitle}"
        />

        <label>멤버 (여러 명 선택 가능)</label>
        <div class="member-checkbox-group">
          ${MEMBER_LIST.map((m) => `
            <label class="checkbox-label">
              <input
                type="checkbox"
                class="member-checkbox"
                value="${m}"
                ${video.members.includes(m) ? "checked" : ""}
              />
              ${m}
            </label>
          `).join("")}
        </div>

        <label>카테고리</label>
        <p class="current-category">현재: ${video.category}</p>
      </div>
    `;

    // 멤버 체크박스 이벤트 — 하나라도 선택되면 미분류 자동 해제
    card.querySelectorAll(".member-checkbox").forEach((cb) => {
      cb.addEventListener("change", () => {
        const anyChecked = [...card.querySelectorAll(".member-checkbox")]
          .some((c) => c.checked);
        // 미분류는 별도 체크박스가 없으므로 아무것도 안 체크되면 미분류 처리
        // 여기서는 시각적 피드백만 (저장 시 처리)
      });
    });

    // 영상 선택 체크박스 이벤트
    card.querySelector(".video-select-checkbox").addEventListener("change", (e) => {
      if (e.target.checked) {
        selectedVideoIds.add(video.id);
      } else {
        selectedVideoIds.delete(video.id);
      }
      document.getElementById("selected-count").textContent =
        `${selectedVideoIds.size}개 선택됨`;
    });

    container.appendChild(card);
  });

  // 카테고리 일괄 적용
  document.getElementById("bulk-apply-btn").addEventListener("click", () => {
    if (selectedVideoIds.size === 0) {
      alert("영상을 먼저 선택해주세요.");
      return;
    }
    const category = document.getElementById("bulk-category-select").value;
    if (!category) {
      alert("카테고리를 선택해주세요.");
      return;
    }

    // 선택된 카드의 현재 카테고리 표시 업데이트
    selectedVideoIds.forEach((id) => {
      const card = document.querySelector(`.admin-card[data-id="${id}"]`);
      if (card) {
        card.querySelector(".current-category").textContent = `현재: ${category}`;
      }
    });

    alert(`${selectedVideoIds.size}개 영상에 "${category}" 적용됨\n전체 저장 버튼을 눌러야 최종 저장됩니다.`);
  });
}


// 전체 저장
document.getElementById("save-all-btn").addEventListener("click", () => {
  const overrides = loadOverrides();

  document.querySelectorAll(".admin-card").forEach((card) => {
    const id = card.dataset.id;
    const customTitle = card.querySelector(".custom-title-input").value.trim();

    // 체크된 멤버 수집
    const checkedMembers = [...card.querySelectorAll(".member-checkbox:checked")]
      .map((cb) => cb.value);

    // 아무도 선택 안 됐으면 미분류
    const finalMembers = checkedMembers.length > 0 ? checkedMembers : ["미분류"];

    // 카테고리는 현재 표시된 텍스트에서 파싱
    const categoryText = card.querySelector(".current-category").textContent;
    const category = categoryText.replace("현재: ", "").trim();

    overrides[id] = {
      members: finalMembers,
      customTitle: customTitle || null,
      category,
    };
  });

  saveOverrides(overrides);

  // 선택 초기화
  selectedVideoIds.clear();
  document.getElementById("selected-count").textContent = "0개 선택됨";

  alert(`저장 완료! ${Object.keys(overrides).length}개 영상 태깅됨`);
});

// 기존 save-all-btn 이벤트 아래에 추가
document.getElementById("save-all-btn").addEventListener("click", () => {
  const overrides = loadOverrides();

  document.querySelectorAll(".admin-card").forEach((card) => {
    const id = card.dataset.id;
    const customTitle = card.querySelector(".custom-title-input").value.trim();
    const checkedMembers = [...card.querySelectorAll(".member-checkbox:checked")]
      .map((cb) => cb.value);
    const finalMembers = checkedMembers.length > 0 ? checkedMembers : ["미분류"];
    const categoryText = card.querySelector(".current-category").textContent;
    const category = categoryText.replace("현재: ", "").trim();

    overrides[id] = {
      members: finalMembers,
      customTitle: customTitle || null,
      category,
    };
  });

  saveOverrides(overrides);
  alert(`저장 완료! ${Object.keys(overrides).length}개 영상 태깅됨`);
});

// 다운로드 버튼 이벤트 (새로 추가)
document.getElementById("download-btn").addEventListener("click", () => {
  const overrides = loadOverrides();

  // JSON 파일로 다운로드
  const blob = new Blob(
    [JSON.stringify(overrides, null, 2)],
    { type: "application/json" }
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "overrides.json";
  a.click();
  URL.revokeObjectURL(url);
});