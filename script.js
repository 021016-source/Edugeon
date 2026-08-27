/* ============================================================
   던전 오브 앎 — 1단계: 화면 레이아웃 데모 스크립트
   ※ 아직 백엔드(Firebase)가 없으므로 모든 데이터는 메모리(변수)에만
     존재합니다. 새로고침하면 초기화됩니다. 2단계에서 실제 로그인/
     저장 로직으로 교체될 부분들에는 TODO 표시를 남겨두었습니다.
   ============================================================ */

// ---- 임시 플레이어 데이터 (2단계에서 Firebase에서 불러오도록 교체) ----
const mockPlayer = {
  name: "모험가",
  level: 1,
  exp: 0,
  expToNext: 100,
  hp: 100,
  maxHp: 100,
  kills: 0,
  runs: 0,
};

const els = {
  loginForm: document.getElementById('login-form'),
  loginId: document.getElementById('login-id'),
  btnSignup: document.getElementById('btn-signup'),

  screenLogin: document.getElementById('screen-login'),
  screenHome: document.getElementById('screen-home'),

  btnProfile: document.getElementById('btn-profile'),
  btnSettings: document.getElementById('btn-settings'),
  btnDungeon: document.getElementById('btn-dungeon'),
  btnLogout: document.getElementById('btn-logout'),

  modalProfile: document.getElementById('modal-profile'),
  modalSettings: document.getElementById('modal-settings'),
  modalDungeonStub: document.getElementById('modal-dungeon-stub'),

  hudName: document.getElementById('hud-name'),
  hudLevel: document.getElementById('hud-level'),
  hudExpFill: document.getElementById('hud-exp-fill'),
  hudHpFill: document.getElementById('hud-hp-fill'),
  hudHpValue: document.getElementById('hud-hp-value'),

  modalName: document.getElementById('modal-name'),
  modalLevel: document.getElementById('modal-level'),
  modalExp: document.getElementById('modal-exp'),
  modalKills: document.getElementById('modal-kills'),
  modalRuns: document.getElementById('modal-runs'),
  modalAccuracy: document.getElementById('modal-accuracy'),
};

// ---- 화면 전환: 로그인 → 홈 -------------------------------------------
function goToHome(playerName){
  mockPlayer.name = playerName && playerName.trim() ? playerName.trim() : "모험가";
  els.screenLogin.classList.remove('active');
  els.screenHome.classList.add('active');
  renderHud();
}

els.loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  // TODO(2단계): Firebase Authentication 로그인 요청으로 교체
  goToHome(els.loginId.value);
});

els.btnSignup.addEventListener('click', () => {
  // TODO(2단계): 회원가입 화면/모달 연결
  alert('회원가입 기능은 2단계(Firebase 연동)에서 추가될 예정이에요.');
});

// ---- HUD 렌더링 --------------------------------------------------------
function renderHud(){
  els.hudName.textContent = mockPlayer.name;
  els.hudLevel.textContent = `Lv.${mockPlayer.level}`;
  els.hudExpFill.style.width = `${(mockPlayer.exp / mockPlayer.expToNext) * 100}%`;
  els.hudHpFill.style.width = `${(mockPlayer.hp / mockPlayer.maxHp) * 100}%`;
  els.hudHpValue.textContent = `${mockPlayer.hp}/${mockPlayer.maxHp}`;
}

function renderProfileModal(){
  els.modalName.textContent = mockPlayer.name;
  els.modalLevel.textContent = `Lv.${mockPlayer.level} · 견습 학도`;
  els.modalExp.textContent = `${mockPlayer.exp} / ${mockPlayer.expToNext} EXP`;
  els.modalKills.textContent = `${mockPlayer.kills}마리`;
  els.modalRuns.textContent = `${mockPlayer.runs}회`;
  els.modalAccuracy.textContent = mockPlayer.runs === 0 ? '—' : `${Math.round((mockPlayer.kills / (mockPlayer.runs * 10)) * 100)}%`;
}

// ---- 모달 열기/닫기 -----------------------------------------------------
function openModal(modalEl){
  modalEl.classList.add('active');
}
function closeModal(modalEl){
  modalEl.classList.remove('active');
}

els.btnProfile.addEventListener('click', () => {
  renderProfileModal();
  openModal(els.modalProfile);
});
els.btnSettings.addEventListener('click', () => openModal(els.modalSettings));
els.btnDungeon.addEventListener('click', () => {
  // TODO(3단계): 과목별 던전 선택 화면으로 이동
  openModal(els.modalDungeonStub);
});

document.querySelectorAll('[data-close]').forEach(btn => {
  btn.addEventListener('click', (e) => {
    closeModal(e.target.closest('.modal-overlay'));
  });
});
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal(overlay);
  });
});

// ---- 설정: 로그아웃 -----------------------------------------------------
els.btnLogout.addEventListener('click', () => {
  // TODO(2단계): Firebase 로그아웃 처리로 교체
  closeModal(els.modalSettings);
  els.screenHome.classList.remove('active');
  els.screenLogin.classList.add('active');
  els.loginId.value = '';
});

// ---- 초기 렌더 ----------------------------------------------------------
renderHud();
