/* ============================================================
   던전 오브 앎 — 2단계: Supabase 연동
   회원가입 / 로그인 / 로그아웃 + 플레이어 데이터(레벨,EXP 등)를
   Supabase(Postgres)에 저장하고 불러옵니다.
   ============================================================ */
import { supabase } from "./supabase-config.js";

// ---- 새 계정 생성 시 기본 스탯 ------------------------------------------
function defaultPlayerData(id, name){
  return {
    id,
    name,
    level: 1,
    exp: 0,
    exp_to_next: 100,
    hp: 100,
    max_hp: 100,
    kills: 0,
    runs: 0,
    weapon: "낡은 단검",
    armor: "천 방어구",
  };
}

// ---- 현재 로그인한 플레이어의 데이터 (players 테이블에서 불러온 값) ----
let currentPlayer = null;

const els = {
  loginForm: document.getElementById('login-form'),
  fieldNickname: document.getElementById('field-nickname'),
  loginNickname: document.getElementById('login-nickname'),
  loginEmail: document.getElementById('login-email'),
  loginPw: document.getElementById('login-pw'),
  loginError: document.getElementById('login-error'),
  btnSubmit: document.getElementById('btn-submit'),
  btnToggleMode: document.getElementById('btn-toggle-mode'),

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

// ---- 로그인 / 회원가입 모드 전환 ----------------------------------------
let mode = 'login'; // 'login' | 'signup'

function setMode(nextMode){
  mode = nextMode;
  clearError();
  if (mode === 'signup'){
    els.fieldNickname.hidden = false;
    els.btnSubmit.textContent = '모험가 등록';
    els.btnToggleMode.textContent = '이미 계정이 있다면? 로그인';
  } else {
    els.fieldNickname.hidden = true;
    els.btnSubmit.textContent = '입장하기';
    els.btnToggleMode.textContent = '계정이 없다면? 새 모험가 등록';
  }
}

els.btnToggleMode.addEventListener('click', () => {
  setMode(mode === 'login' ? 'signup' : 'login');
});

function showError(message){
  els.loginError.textContent = message;
}
function clearError(){
  els.loginError.textContent = '';
}

// Supabase 에러 메시지를 한국어 안내로 변환
function translateAuthError(error){
  const msg = error && error.message ? error.message : '';
  if (msg.includes('already registered') || msg.includes('already been registered')) {
    return '이미 등록된 이메일이에요. 로그인을 시도해보세요.';
  }
  if (msg.includes('Invalid login credentials')) {
    return '이메일 또는 비밀번호가 올바르지 않아요.';
  }
  if (msg.includes('Password should be at least')) {
    return '비밀번호는 6자 이상이어야 해요.';
  }
  if (msg.includes('Unable to validate email address') || msg.includes('invalid')) {
    return '이메일 형식이 올바르지 않아요.';
  }
  if (msg.includes('Email not confirmed')) {
    return '이메일 인증이 필요해요. 받은 메일함의 인증 링크를 확인해주세요.';
  }
  return '문제가 발생했어요. 잠시 후 다시 시도해주세요.';
}

// ---- 폼 제출: 로그인 또는 회원가입 --------------------------------------
els.loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearError();

  const email = els.loginEmail.value.trim();
  const pw = els.loginPw.value;

  if (!email || !pw){
    showError('이메일과 비밀번호를 입력해주세요.');
    return;
  }

  els.btnSubmit.disabled = true;
  els.btnSubmit.textContent = '처리 중...';

  try {
    if (mode === 'signup'){
      const nickname = els.loginNickname.value.trim() || '모험가';
      const { data, error } = await supabase.auth.signUp({
        email,
        password: pw,
        options: { data: { display_name: nickname } },
      });
      if (error) throw error;

      if (data.session){
        // 이메일 인증이 꺼져 있어 가입 즉시 로그인된 경우: 플레이어 행 생성
        const { error: insertError } = await supabase
          .from('players')
          .insert(defaultPlayerData(data.user.id, nickname));
        if (insertError) throw insertError;
        // onAuthStateChange가 이어서 홈 화면 진입을 처리합니다.
      } else {
        showError('가입 완료! 이메일함의 인증 링크를 확인한 뒤 로그인해주세요.');
        setMode('login');
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
      if (error) throw error;
      // onAuthStateChange가 이어서 홈 화면 진입을 처리합니다.
    }
  } catch (error){
    showError(translateAuthError(error));
    setMode(mode); // 버튼 텍스트 원복
  } finally {
    els.btnSubmit.disabled = false;
  }
});

// ---- 로그인 상태 변화 감지: 앱 진입점 ------------------------------------
supabase.auth.onAuthStateChange(async (_event, session) => {
  if (session && session.user){
    await loadPlayerData(session.user);
    els.loginForm.reset();
    els.screenLogin.classList.remove('active');
    els.screenHome.classList.add('active');
    renderHud();
  } else {
    currentPlayer = null;
    els.screenHome.classList.remove('active');
    els.screenLogin.classList.add('active');
    setMode('login');
  }
});

// ---- players 테이블에서 플레이어 데이터 불러오기 -------------------------
async function loadPlayerData(user){
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (error){
    console.error(error);
    return;
  }

  if (data){
    currentPlayer = data;
  } else {
    // 행이 없는 예외 상황(예: 가입 중 중단) 대비 기본값 생성
    const fallback = defaultPlayerData(user.id, user.user_metadata?.display_name || '모험가');
    await supabase.from('players').insert(fallback);
    currentPlayer = fallback;
  }
}

// ---- HUD 렌더링 ----------------------------------------------------------
function renderHud(){
  if (!currentPlayer) return;
  els.hudName.textContent = currentPlayer.name;
  els.hudLevel.textContent = `Lv.${currentPlayer.level}`;
  els.hudExpFill.style.width = `${(currentPlayer.exp / currentPlayer.exp_to_next) * 100}%`;
  els.hudHpFill.style.width = `${(currentPlayer.hp / currentPlayer.max_hp) * 100}%`;
  els.hudHpValue.textContent = `${currentPlayer.hp}/${currentPlayer.max_hp}`;
}

function renderProfileModal(){
  if (!currentPlayer) return;
  els.modalName.textContent = currentPlayer.name;
  els.modalLevel.textContent = `Lv.${currentPlayer.level} · 견습 학도`;
  els.modalExp.textContent = `${currentPlayer.exp} / ${currentPlayer.exp_to_next} EXP`;
  els.modalKills.textContent = `${currentPlayer.kills}마리`;
  els.modalRuns.textContent = `${currentPlayer.runs}회`;
  els.modalAccuracy.textContent = currentPlayer.runs === 0
    ? '—'
    : `${Math.round((currentPlayer.kills / (currentPlayer.runs * 10)) * 100)}%`;
}

// ---- 모달 열기/닫기 --------------------------------------------------------
function openModal(modalEl){ modalEl.classList.add('active'); }
function closeModal(modalEl){ modalEl.classList.remove('active'); }

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

// ---- 설정: 로그아웃 --------------------------------------------------------
els.btnLogout.addEventListener('click', async () => {
  closeModal(els.modalSettings);
  await supabase.auth.signOut();
  // onAuthStateChange가 로그인 화면 전환을 처리합니다.
});

// ---- 초기 모드 세팅 ---------------------------------------------------------
setMode('login');
