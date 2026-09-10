/* ==========================================================================
   IEDILETA - Core Logic & Wheel Engine
   ========================================================================== */

// --- PRELOADED IMMUTABLE MASTER DATA ---
const MASTER_DATA = [
  {
    id: "g_leitza",
    name: "Leitza",
    color: "#ff007f", // vibrant magenta
    members: [
      { id: "m_dan", name: "Dan" },
      { id: "m_sophie", name: "Sophie" },
      { id: "m_charo", name: "Charo" },
      { id: "m_valen", name: "Valen" },
      { id: "m_niki", name: "Niki" },
      { id: "m_toto", name: "Toto" }
    ]
  },
  {
    id: "g_jokrim",
    name: "Jokrim",
    color: "#7000ff", // purple
    members: [
      { id: "m_cate", name: "Cate" },
      { id: "m_agus_m", name: "Agus M" },
      { id: "m_sebi", name: "Sebi" },
      { id: "m_manu", name: "Manu" },
      { id: "m_juana", name: "Juana" }
    ]
  },
  {
    id: "g_nitza",
    name: "Nitza",
    color: "#00f0ff", // cyan
    members: [
      { id: "m_viole", name: "Viole" },
      { id: "m_gina", name: "Gina" },
      { id: "m_lara", name: "Lara" },
      { id: "m_bebe", name: "Bebe" }
    ]
  },
  {
    id: "g_jolma",
    name: "Jolma",
    color: "#ffb703", // amber gold
    members: [
      { id: "m_tomi", name: "Tomi" },
      { id: "m_mica", name: "Mica" },
      { id: "m_maia_m", name: "Maia M" },
      { id: "m_meli", name: "Meli" }
    ]
  },
  {
    id: "g_nesha",
    name: "Nesha",
    color: "#00f5d4", // emerald green
    members: [
      { id: "m_jano", name: "Jano" },
      { id: "m_maia_t", name: "Maia T" },
      { id: "m_delfi_l", name: "Delfi L" },
      { id: "m_felix", name: "Felix" },
      { id: "m_alu", name: "Alu" }
    ]
  },
  {
    id: "g_ietzira",
    name: "Ietzira",
    color: "#ff4d6d", // coral red
    members: [
      { id: "m_delfi_c", name: "Delfi C" },
      { id: "m_uma", name: "Uma" },
      { id: "m_alan", name: "Alan" },
      { id: "m_agus_w", name: "Agus W" },
      { id: "m_millie", name: "Millie" },
      { id: "m_sofi", name: "Sofi" },
      { id: "m_juli", name: "Juli" }
    ]
  }
];

// Slice Palette for Member wheels (high contrast vibrant colors)
const PALETTE_MEMBERS = [
  "#ff007f", "#7000ff", "#00f0ff", "#ffb703", "#00f5d4", 
  "#ff4d6d", "#9d4edd", "#ff758f", "#4cc9f0", "#7209b7", 
  "#3a0ca3", "#f72585", "#480ca8", "#4361ee", "#4895ef"
];

// --- APP STATE ---
const state = {
  // Sets of IDs that are disabled
  manualDisabled: new Set(), // Manually toggled OFF by user in ⚙ Disponibilidad
  drawnDisabled: new Set(),  // Removed automatically after winning a spin

  // Navigation & Current Mode
  currentView: "view-home",
  currentMode: null, // "GROUPS", "GROUP_MEMBERS", "ALL_MEMBERS"
  selectedGroupId: null, // For GROUP_MEMBERS mode

  // Sound
  isSoundMuted: false,

  // Wheel Engine
  currentWheelItems: [], // Objects: { id, label, color, subtitle, type, originalObj }
  currentAngle: 0,
  isSpinning: false,
  autoRemoveAfterSpin: false
};

// --- AUDIO SYNTHESIZER (Web Audio API) ---
let audioCtx = null;

function initAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function playTickSound() {
  if (state.isSoundMuted || !audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, audioCtx.currentTime + 0.03);

    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.03);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.03);
  } catch (e) {
    // Ignore audio context errors
  }
}

function playVictorySound() {
  if (state.isSoundMuted || !audioCtx) return;
  try {
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, index) => {
      const startTime = audioCtx.currentTime + (index * 0.09);
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.4, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.3);
    });
  } catch (e) {
    // Ignore audio context errors
  }
}

// --- AVAILABILITY LOGIC HELPERS ---
function isGroupActive(groupId) {
  return !state.manualDisabled.has(groupId) && !state.drawnDisabled.has(groupId);
}

function isMemberActive(memberId, groupId) {
  if (!isGroupActive(groupId)) return false;
  return !state.manualDisabled.has(memberId) && !state.drawnDisabled.has(memberId);
}

function getActiveGroups() {
  return MASTER_DATA.filter(g => isGroupActive(g.id));
}

function getActiveGroupMembers(groupId) {
  const group = MASTER_DATA.find(g => g.id === groupId);
  if (!group || !isGroupActive(groupId)) return [];
  return group.members.filter(m => !state.manualDisabled.has(m.id) && !state.drawnDisabled.has(m.id));
}

function getAllActiveMembers() {
  const activeMembers = [];
  MASTER_DATA.forEach(group => {
    if (isGroupActive(group.id)) {
      group.members.forEach(member => {
        if (!state.manualDisabled.has(member.id) && !state.drawnDisabled.has(member.id)) {
          activeMembers.push({ member, group });
        }
      });
    }
  });
  return activeMembers;
}

function getTotalActiveCounts() {
  const activeGroups = getActiveGroups().length;
  const activeMembers = getAllActiveMembers().length;
  const totalMembers = MASTER_DATA.reduce((acc, g) => acc + g.members.length, 0);
  return { activeGroups, activeMembers, totalMembers, totalGroups: MASTER_DATA.length };
}

// --- DOM ELEMENTS ---
let canvas, ctx;
let btnSpin;

document.addEventListener("DOMContentLoaded", () => {
  canvas = document.getElementById("wheel-canvas");
  ctx = canvas.getContext("2d");
  btnSpin = document.getElementById("btn-spin");

  initEventListeners();
  updateHeaderBadges();
  showView("view-home");
});

// --- NAVIGATION & VIEWS ---
function showView(viewId) {
  document.querySelectorAll(".view").forEach(v => v.classList.remove("view-active"));
  const targetView = document.getElementById(viewId);
  if (targetView) {
    targetView.classList.add("view-active");
    state.currentView = viewId;
  }
  updateHeaderBadges();
}

function setupGroupWheelMode() {
  state.currentMode = "GROUPS";
  state.selectedGroupId = null;
  document.getElementById("wheel-stage-title").textContent = "Ruleta de Grupos";
  document.getElementById("wheel-stage-subtitle").textContent = "Girá para decidir qué grupo lo hace.";
  
  const activeGroups = getActiveGroups();
  state.currentWheelItems = activeGroups.map((g) => ({
    id: g.id,
    label: g.name,
    color: g.color,
    subtitle: `${g.members.filter(m => !state.manualDisabled.has(m.id) && !state.drawnDisabled.has(m.id)).length} madrijim`,
    type: "GROUP",
    originalObj: g
  }));

  showView("view-wheel-stage");
  drawWheel();
}

function setupGroupSelectView() {
  state.currentMode = "GROUP_MEMBERS";
  renderGroupSelectGrid();
  showView("view-group-select");
}

function setupGroupMemberWheelMode(groupId) {
  state.selectedGroupId = groupId;
  const group = MASTER_DATA.find(g => g.id === groupId);
  if (!group) return;

  document.getElementById("wheel-stage-title").textContent = `Ruleta de ${group.name}`;
  document.getElementById("wheel-stage-subtitle").textContent = `Girá para decidir quién se hace cargo dentro de ${group.name}.`;

  const activeMembers = getActiveGroupMembers(groupId);
  state.currentWheelItems = activeMembers.map((m, idx) => ({
    id: m.id,
    label: m.name,
    color: group.color || PALETTE_MEMBERS[idx % PALETTE_MEMBERS.length],
    subtitle: group.name,
    type: "MEMBER",
    originalObj: m,
    groupObj: group
  }));

  showView("view-wheel-stage");
  drawWheel();
}

function setupAllMembersWheelMode() {
  state.currentMode = "ALL_MEMBERS";
  state.selectedGroupId = null;
  document.getElementById("wheel-stage-title").textContent = "Ruleta de Todos los Madrijim";
  document.getElementById("wheel-stage-subtitle").textContent = "Que la IediLeta decida entre todos los integrantes disponibles.";

  const activePairs = getAllActiveMembers();
  state.currentWheelItems = activePairs.map((pair, idx) => ({
    id: pair.member.id,
    label: pair.member.name,
    color: pair.group.color || PALETTE_MEMBERS[idx % PALETTE_MEMBERS.length],
    subtitle: pair.group.name,
    type: "MEMBER",
    originalObj: pair.member,
    groupObj: pair.group
  }));

  showView("view-wheel-stage");
  drawWheel();
}

// --- RENDER GROUP SELECT GRID ---
function renderGroupSelectGrid() {
  const container = document.getElementById("group-select-grid");
  container.innerHTML = "";

  MASTER_DATA.forEach(group => {
    const isGActive = isGroupActive(group.id);
    const activeMem = group.members.filter(m => !state.manualDisabled.has(m.id) && !state.drawnDisabled.has(m.id));
    
    const card = document.createElement("div");
    card.className = `group-select-card ${(!isGActive || activeMem.length === 0) ? 'disabled' : ''}`;
    
    card.innerHTML = `
      <div class="group-card-header">
        <span class="group-card-name" style="color: ${group.color}">${group.name}</span>
        <span class="group-card-count">${activeMem.length} / ${group.members.length} activos</span>
      </div>
      <div class="group-card-members">
        ${group.members.map(m => m.name).join(", ")}
      </div>
    `;

    card.addEventListener("click", () => {
      if (!isGActive) {
        openAvailabilityModal();
        return;
      }
      setupGroupMemberWheelMode(group.id);
    });

    container.appendChild(card);
  });
}

// --- CANVAS WHEEL RENDERER & PHYSICS ---
function drawWheel() {
  if (!ctx || !canvas) return;

  const width = canvas.width;
  const height = canvas.height;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(centerX, centerY) - 15;

  ctx.clearRect(0, 0, width, height);

  const items = state.currentWheelItems;
  const emptyWarning = document.getElementById("wheel-empty-warning");

  if (!items || items.length === 0) {
    // Empty state rendering
    btnSpin.disabled = true;
    btnSpin.style.opacity = "0.5";
    emptyWarning.classList.remove("hidden");
    updateEmptyWarningText();

    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.fillStyle = "#a0a5c0";
    ctx.font = "bold 20px Outfit, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Sin elementos disponibles", centerX, centerY - 20);
    ctx.font = "14px Outfit, sans-serif";
    ctx.fillText("Revisá la disponibilidad (⚙)", centerX, centerY + 15);
    ctx.restore();
    return;
  }

  // Active state
  btnSpin.disabled = state.isSpinning;
  btnSpin.style.opacity = state.isSpinning ? "0.8" : "1";
  emptyWarning.classList.add("hidden");

  const numSlices = items.length;
  const sliceAngle = (2 * Math.PI) / numSlices;

  ctx.save();
  ctx.translate(centerX, centerY);

  for (let i = 0; i < numSlices; i++) {
    const startAngle = state.currentAngle + (i * sliceAngle);
    const endAngle = startAngle + sliceAngle;
    const item = items[i];

    // Draw Slice Fill
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, startAngle, endAngle);
    ctx.closePath();

    // Use item color or fallback palette
    ctx.fillStyle = item.color || PALETTE_MEMBERS[i % PALETTE_MEMBERS.length];
    ctx.fill();

    // Slice Border
    ctx.strokeStyle = "rgba(10, 10, 20, 0.6)";
    ctx.lineWidth = 3;
    ctx.stroke();

    // Draw Slice Label Text
    ctx.save();
    const midAngle = startAngle + (sliceAngle / 2);
    ctx.rotate(midAngle);

    // Text Alignment & Styling
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#ffffff";
    
    // Scale font size based on slice count
    let fontSize = 22;
    if (numSlices > 12) fontSize = 16;
    if (numSlices > 20) fontSize = 13;
    if (numSlices > 28) fontSize = 11;

    ctx.font = `bold ${fontSize}px Outfit, sans-serif`;
    ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
    ctx.shadowBlur = 6;

    // Draw main label
    const textRadius = radius - 25;
    ctx.fillText(item.label, textRadius, 0);

    ctx.restore();
  }

  // Draw Outer Decorative Ring
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, 2 * Math.PI);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
  ctx.lineWidth = 8;
  ctx.stroke();

  ctx.restore();
}

function updateEmptyWarningText() {
  const title = document.getElementById("empty-warning-title");
  const desc = document.getElementById("empty-warning-desc");

  if (state.currentMode === "GROUPS") {
    title.textContent = "No hay grupos disponibles para girar";
    desc.textContent = "Todos los grupos están desactivados o fueron sorteados.";
  } else if (state.currentMode === "GROUP_MEMBERS") {
    const group = MASTER_DATA.find(g => g.id === state.selectedGroupId);
    const gName = group ? group.name : "este grupo";
    title.textContent = `No hay madrijim disponibles en ${gName}`;
    desc.textContent = "Todos los integrantes de este grupo están desactivados o ya fueron elegidos.";
  } else {
    title.textContent = "No hay madrijim disponibles en la ruleta general";
    desc.textContent = "Todos los grupos o madrijim están desactivados temporalmente.";
  }
}

// --- SPIN ANIMATION & DECELERATION PHYSICS ---
let lastSliceIndex = -1;

function spinWheel() {
  if (state.isSpinning) return;
  const items = state.currentWheelItems;
  if (!items || items.length === 0) return;

  initAudioContext();

  state.isSpinning = true;
  btnSpin.classList.add("spinning");
  btnSpin.disabled = true;

  const numSlices = items.length;
  const sliceAngle = (2 * Math.PI) / numSlices;

  // Pick random winner slice
  const winnerIndex = Math.floor(Math.random() * numSlices);
  
  // Pointer is at TOP (angle = 270deg = 1.5 * Math.PI or -Math.PI / 2)
  // Target position for slice index i: pointerAngle - (i + 0.5)*sliceAngle
  const pointerAngle = 1.5 * Math.PI; // 270 degrees
  const winnerSliceCenter = (winnerIndex + 0.5) * sliceAngle;
  
  // Calculate base target angle (with 5 to 7 full rotations)
  const fullRotations = 5 + Math.floor(Math.random() * 3);
  let targetAngle = state.currentAngle + (fullRotations * 2 * Math.PI);

  // Adjust so winnerSliceCenter aligns exactly under pointerAngle
  // currentAngle % 2PI + winnerSliceCenter === pointerAngle
  const currentNormalized = targetAngle % (2 * Math.PI);
  let offsetNeeded = (pointerAngle - winnerSliceCenter) - currentNormalized;
  
  // Normalize offset to range [0, 2PI)
  while (offsetNeeded < 0) offsetNeeded += 2 * Math.PI;
  
  const finalTargetAngle = targetAngle + offsetNeeded;
  const startAngle = state.currentAngle;
  const totalRotation = finalTargetAngle - startAngle;

  const duration = 4500 + Math.random() * 1000; // 4.5 to 5.5 seconds
  const startTime = performance.now();

  lastSliceIndex = -1;

  function animate(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Ease-Out Cubic formula for smooth deceleration physics
    const easeOut = 1 - Math.pow(1 - progress, 3);
    state.currentAngle = startAngle + (totalRotation * easeOut);

    // Detect when slice crosses top pointer to trigger click sound
    const normAngle = (state.currentAngle % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
    const pointerRelative = (pointerAngle - normAngle + 2 * Math.PI) % (2 * Math.PI);
    const currentSliceUnderPointer = Math.floor(pointerRelative / sliceAngle) % numSlices;

    if (currentSliceUnderPointer !== lastSliceIndex) {
      playTickSound();
      lastSliceIndex = currentSliceUnderPointer;
    }

    drawWheel();

    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      // Spin finished!
      state.isSpinning = false;
      btnSpin.classList.remove("spinning");
      btnSpin.disabled = false;
      
      const winningItem = items[winnerIndex];
      onWheelSpinComplete(winningItem);
    }
  }

  requestAnimationFrame(animate);
}

function onWheelSpinComplete(winningItem) {
  playVictorySound();

  // Handle auto-remove option
  let autoRemoved = false;
  if (state.autoRemoveAfterSpin) {
    state.drawnDisabled.add(winningItem.id);
    autoRemoved = true;
  }

  // Show Result Modal
  showResultModal(winningItem, autoRemoved);
  updateHeaderBadges();

  // Refresh wheel data if item was auto-removed
  if (autoRemoved) {
    if (state.currentMode === "GROUPS") setupGroupWheelMode();
    else if (state.currentMode === "GROUP_MEMBERS") setupGroupMemberWheelMode(state.selectedGroupId);
    else if (state.currentMode === "ALL_MEMBERS") setupAllMembersWheelMode();
  }
}

// --- RESULT MODAL & CONFETTI ---
function showResultModal(item, isAutoRemoved) {
  const modal = document.getElementById("modal-result");
  const winnerName = document.getElementById("result-winner-name");
  const winnerGroup = document.getElementById("result-winner-group");
  const removedTag = document.getElementById("result-auto-removed-tag");

  winnerName.textContent = `¡${item.label.toUpperCase()}!`;
  
  if (item.type === "MEMBER" && item.groupObj) {
    winnerGroup.textContent = `Grupo: ${item.groupObj.name}`;
    winnerGroup.classList.remove("hidden");
  } else {
    winnerGroup.classList.add("hidden");
  }

  if (isAutoRemoved) {
    removedTag.classList.remove("hidden");
  } else {
    removedTag.classList.add("hidden");
  }

  modal.classList.remove("hidden");
  launchConfetti();
}

function closeResultModal() {
  document.getElementById("modal-result").classList.add("hidden");
}

let confettiAnimationId = null;

function launchConfetti() {
  const confettiCanvas = document.getElementById("confetti-canvas");
  if (!confettiCanvas) return;
  
  const cCtx = confettiCanvas.getContext("2d");
  confettiCanvas.width = confettiCanvas.clientWidth || 480;
  confettiCanvas.height = confettiCanvas.clientHeight || 480;

  const particles = [];
  const colors = ["#ff007f", "#7000ff", "#00f0ff", "#ffb703", "#00f5d4", "#ffffff"];

  for (let i = 0; i < 90; i++) {
    particles.push({
      x: confettiCanvas.width / 2,
      y: confettiCanvas.height / 2,
      vx: (Math.random() - 0.5) * 14,
      vy: (Math.random() - 0.7) * 16,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      rSpeed: (Math.random() - 0.5) * 10,
      opacity: 1
    });
  }

  if (confettiAnimationId) cancelAnimationFrame(confettiAnimationId);

  const startTime = performance.now();
  function renderConfetti(now) {
    cCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.35; // Gravity
      p.rotation += p.rSpeed;
      p.opacity -= 0.008;

      if (p.opacity > 0) {
        cCtx.save();
        cCtx.translate(p.x, p.y);
        cCtx.rotate((p.rotation * Math.PI) / 180);
        cCtx.globalAlpha = Math.max(0, p.opacity);
        cCtx.fillStyle = p.color;
        cCtx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        cCtx.restore();
      }
    });

    if (now - startTime < 2500) {
      confettiAnimationId = requestAnimationFrame(renderConfetti);
    }
  }

  requestAnimationFrame(renderConfetti);
}

// --- AVAILABILITY MODAL & SYSTEM ---
function openAvailabilityModal() {
  renderAvailabilityGroupsList();
  document.getElementById("modal-availability").classList.remove("hidden");
}

function closeAvailabilityModal() {
  document.getElementById("modal-availability").classList.add("hidden");
  
  // Refresh active wheel upon closing availability dialog
  if (state.currentMode === "GROUPS") setupGroupWheelMode();
  else if (state.currentMode === "GROUP_MEMBERS" && state.selectedGroupId) setupGroupMemberWheelMode(state.selectedGroupId);
  else if (state.currentMode === "ALL_MEMBERS") setupAllMembersWheelMode();
  else if (state.currentView === "view-group-select") renderGroupSelectGrid();

  updateHeaderBadges();
}

function renderAvailabilityGroupsList() {
  const container = document.getElementById("availability-groups-list");
  container.innerHTML = "";

  MASTER_DATA.forEach(group => {
    const isGManuallyActive = !state.manualDisabled.has(group.id);
    const isGDrawnActive = !state.drawnDisabled.has(group.id);
    const isGOverallActive = isGManuallyActive && isGDrawnActive;

    const groupCard = document.createElement("div");
    groupCard.className = `avail-group-card ${!isGOverallActive ? 'disabled-group' : ''}`;

    let membersHtml = "";
    group.members.forEach(member => {
      const isMManuallyActive = !state.manualDisabled.has(member.id);
      const isMDrawnDisabled = state.drawnDisabled.has(member.id);
      const isMActive = isMManuallyActive && !isMDrawnDisabled;

      membersHtml += `
        <div class="avail-member-item ${isMDrawnDisabled ? 'drawn-off' : ''}">
          <span class="avail-member-name">${member.name}</span>
          ${isMDrawnDisabled ? '<span class="tag-drawn" title="Eliminado temporalmente por un giro previo">Sorteado</span>' : ''}
          <label class="switch">
            <input type="checkbox" data-member-id="${member.id}" ${isMManuallyActive ? 'checked' : ''}>
            <span class="slider"></span>
          </label>
        </div>
      `;
    });

    groupCard.innerHTML = `
      <div class="avail-group-header">
        <div class="avail-group-title" style="color: ${group.color}">
          <span>${group.name}</span>
          ${!isGDrawnActive ? '<span class="tag-drawn">Sorteado</span>' : ''}
        </div>
        <label class="switch">
          <input type="checkbox" data-group-id="${group.id}" ${isGManuallyActive ? 'checked' : ''}>
          <span class="slider"></span>
        </label>
      </div>
      <div class="avail-members-grid">
        ${membersHtml}
      </div>
    `;

    // Event listeners for group switch
    const groupSwitch = groupCard.querySelector(`input[data-group-id="${group.id}"]`);
    groupSwitch.addEventListener("change", (e) => {
      const enabled = e.target.checked;
      if (enabled) {
        state.manualDisabled.delete(group.id);
        // Also enable all its members
        group.members.forEach(m => state.manualDisabled.delete(m.id));
      } else {
        state.manualDisabled.add(group.id);
        // Also disable all its members
        group.members.forEach(m => state.manualDisabled.add(m.id));
      }
      renderAvailabilityGroupsList();
      updateHeaderBadges();
    });

    // Event listeners for member switches
    groupCard.querySelectorAll('input[data-member-id]').forEach(memSwitch => {
      memSwitch.addEventListener("change", (e) => {
        const memId = e.target.getAttribute("data-member-id");
        if (e.target.checked) {
          state.manualDisabled.delete(memId);
          // If group was manually disabled, re-enable group
          state.manualDisabled.delete(group.id);
        } else {
          state.manualDisabled.add(memId);
        }
        renderAvailabilityGroupsList();
        updateHeaderBadges();
      });
    });

    container.appendChild(groupCard);
  });

  const counts = getTotalActiveCounts();
  document.getElementById("avail-status-summary").textContent = `${counts.activeGroups} grupos y ${counts.activeMembers} madrijim activos`;
}

function enableAllAvailability() {
  state.manualDisabled.clear();
  state.drawnDisabled.clear();
  renderAvailabilityGroupsList();
  updateHeaderBadges();
}

function disableAllAvailability() {
  MASTER_DATA.forEach(g => {
    state.manualDisabled.add(g.id);
    g.members.forEach(m => state.manualDisabled.add(m.id));
  });
  renderAvailabilityGroupsList();
  updateHeaderBadges();
}

function resetAvailabilityToDefault() {
  state.manualDisabled.clear();
  state.drawnDisabled.clear();
  renderAvailabilityGroupsList();
  updateHeaderBadges();
}

function restoreDrawnResults() {
  state.drawnDisabled.clear();
  updateHeaderBadges();
  
  if (state.currentMode === "GROUPS") setupGroupWheelMode();
  else if (state.currentMode === "GROUP_MEMBERS" && state.selectedGroupId) setupGroupMemberWheelMode(state.selectedGroupId);
  else if (state.currentMode === "ALL_MEMBERS") setupAllMembersWheelMode();
}

function updateHeaderBadges() {
  const counts = getTotalActiveCounts();
  
  // Header badge
  const headerBadge = document.getElementById("badge-active-count");
  if (headerBadge) {
    headerBadge.textContent = `${counts.activeMembers}/${counts.totalMembers}`;
  }

  // Home card metas
  const metaGroups = document.getElementById("meta-groups-count");
  if (metaGroups) metaGroups.textContent = `${counts.activeGroups} de ${counts.totalGroups} grupos disponibles`;

  const metaAll = document.getElementById("meta-all-count");
  if (metaAll) metaAll.textContent = `${counts.activeMembers} de ${counts.totalMembers} madrijim disponibles`;

  // Drawn badge
  const drawnBadge = document.getElementById("badge-drawn-count");
  if (drawnBadge) {
    drawnBadge.textContent = state.drawnDisabled.size;
  }
}

// --- EVENT LISTENERS ---
function initEventListeners() {
  // Navigation Logo -> Home
  document.getElementById("btn-header-home").addEventListener("click", () => {
    showView("view-home");
  });

  // Sound Toggle
  document.getElementById("btn-sound-toggle").addEventListener("click", () => {
    state.isSoundMuted = !state.isSoundMuted;
    document.getElementById("icon-sound-symbol").textContent = state.isSoundMuted ? "🔇" : "🔊";
  });

  // Home Mode Cards
  document.getElementById("card-mode-groups").addEventListener("click", () => {
    setupGroupWheelMode();
  });

  document.getElementById("card-mode-group-members").addEventListener("click", () => {
    setupGroupSelectView();
  });

  document.getElementById("card-mode-all-members").addEventListener("click", () => {
    setupAllMembersWheelMode();
  });

  // Back Buttons
  document.getElementById("btn-back-from-group-select").addEventListener("click", () => {
    showView("view-home");
  });

  document.getElementById("btn-back-from-wheel").addEventListener("click", () => {
    if (state.currentMode === "GROUP_MEMBERS") {
      setupGroupSelectView();
    } else {
      showView("view-home");
    }
  });

  // Wheel Spin Button
  btnSpin.addEventListener("click", spinWheel);

  // Auto-remove Checkbox
  const chkAutoRemove = document.getElementById("chk-auto-remove");
  chkAutoRemove.addEventListener("change", (e) => {
    state.autoRemoveAfterSpin = e.target.checked;
  });

  // Restore Drawn Button
  document.getElementById("btn-restore-drawn").addEventListener("click", restoreDrawnResults);

  // Empty state fix button
  document.getElementById("btn-fix-availability").addEventListener("click", openAvailabilityModal);

  // Availability Modal Controls
  document.getElementById("btn-open-availability").addEventListener("click", openAvailabilityModal);
  document.getElementById("btn-close-availability").addEventListener("click", closeAvailabilityModal);
  document.getElementById("btn-done-availability").addEventListener("click", closeAvailabilityModal);

  document.getElementById("btn-avail-enable-all").addEventListener("click", enableAllAvailability);
  document.getElementById("btn-avail-disable-all").addEventListener("click", disableAllAvailability);
  document.getElementById("btn-avail-reset").addEventListener("click", resetAvailabilityToDefault);

  // Result Modal Buttons
  document.getElementById("btn-result-close").addEventListener("click", closeResultModal);
  document.getElementById("btn-result-spin-again").addEventListener("click", () => {
    closeResultModal();
    spinWheel();
  });
}
