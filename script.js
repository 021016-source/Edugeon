/* ============================================================
   던전 오브 앎 — 2단계: Supabase 연동 (오류 완벽 보완)
   ============================================================ */
import { supabase } from "./supabase-config.js";

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

function showError(message, isSuccess = false){
  els.loginError.style.color = isSuccess ? '#4fb0a5' : '#ff6b6b';
  els.loginError.textContent = message;
}
function clearError(){
  els.loginError.textContent = '';
}

function translateAuthError(error){
  if (!error) return '알 수 없는 오류가 발생했습니다.';
  const msg = error.message || String(error);
  
  if (msg.includes('already registered') || msg.includes('already been registered')) {
    return '이미 등록된 이메일이에요. [로그인]을 시도해보세요.';
  }
  if (msg.includes('Invalid login credentials')) {
    return '이메일 또는 비밀번호가 올바르지 않아요.';
  }
  if (msg.includes('Password should be at least')) {
    return '비밀번호는 6자 이상이어야 해요.';
  }
  if (msg.includes('Unable to validate email address') || msg.includes('invalid')) {
    return '올바른 이메일 형식을 입력해주세요.';
  }
  if (msg.includes('Email not confirmed')) {
    return '이메일 인증이 완료되지 않았습니다. 메일함을 확인해주세요.';
  }
  return msg;
}

// 폼 제출 handler (로그인 / 회원가입)
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
        options: { 
          data: { display_name: nickname } 
        },
      });

      if (error) throw error;

      if (data?.session) {
        // 이메일 인증 설정이 꺼져있어 즉시 로그인된 경우
        showError('모험가 등록 성공! 이동 중...', true);
      } else {
        // 이메일 인증 메일이 발송된 경우
        showError('📩 인증 메일이 발송되었습니다! 메일함(스팸함)을 확인한 뒤 로그인해주세요.', true);
        setMode('login'); // 바로 로그인 모드로 전환
      }
    } else {
      // 로그인 처리
      const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
      if (error) throw error;
    }
  } catch (error){
    console.error("Auth Exception:", error);
    showError(translateAuthError(error));
  } finally {
    els.btnSubmit.disabled = false;
    els.btnSubmit.textContent = mode === 'signup' ? '모험가 등록' : '입장하기';
  }
});

// 로그인 상태 감지 (이메일 인증 후 로그인 시에도 작동)
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
  }
});

// 플레이어 데이터 조회 및 미존재 시 자동 생성
async function loadPlayerData(user){
  try {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      console.error("DB 읽기 에러:", error);
    }

    if (data){
      currentPlayer = data;
    } else {
      // 인증 후 최초 로그인 시 DB에 기본 정보 생성
      const nickname = user.user_metadata?.display_name || '모험가';
      const fallback = defaultPlayerData(user.id, nickname);
      
      const { error: insertError } = await supabase.from('players').insert(fallback);
      if (insertError) {
        console.error("DB 생성 에러:", insertError);
      }
      currentPlayer = fallback;
    }
  } catch (err) {
    console.error("loadPlayerData 예외 발생:", err);
  }
}

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

function openModal(modalEl){ modalEl.classList.add('active'); }
function closeModal(modalEl){ modalEl.classList.remove('active'); }

els.btnProfile.addEventListener('click', () => {
  renderProfileModal();
  openModal(els.modalProfile);
});
els.btnSettings.addEventListener('click', () => openModal(els.modalSettings));
els.btnDungeon.addEventListener('click', () => {
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

els.btnLogout.addEventListener('click', async () => {
  closeModal(els.modalSettings);
  await supabase.auth.signOut();
});

setMode('login');
