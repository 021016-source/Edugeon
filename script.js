import { supabase } from './supabase-config.js';

// DOM 요소를 안전하게 가져오는 헬퍼 함수
const getEl = (id) => document.getElementById(id);

let mode = 'login'; // 'login' 또는 'signup'

// 에러 및 메시지 출력
function showError(msg, isInfo = false) {
  const authError = getEl('auth-error');
  if (!authError) {
    alert(msg);
    return;
  }
  authError.textContent = msg;
  authError.style.display = 'block';
  authError.style.color = isInfo ? '#4caf50' : '#ff4d4d';
}

function clearError() {
  const authError = getEl('auth-error');
  if (!authError) return;
  authError.textContent = '';
  authError.style.display = 'none';
}

// 모드 전환 (로그인 <-> 회원가입)
function setMode(newMode) {
  mode = newMode;
  clearError();

  const nicknameGroup = getEl('nickname-group');
  const btnSubmit = getEl('btn-submit');
  const btnToggleMode = getEl('btn-toggle-mode');

  if (mode === 'signup') {
    if (nicknameGroup) nicknameGroup.style.display = 'block';
    if (btnSubmit) btnSubmit.textContent = '모험가 등록';
    if (btnToggleMode) btnToggleMode.textContent = '이미 계정이 있으신가요? 입장하기';
  } else {
    if (nicknameGroup) nicknameGroup.style.display = 'none';
    if (btnSubmit) btnSubmit.textContent = '입장하기';
    if (btnToggleMode) btnToggleMode.textContent = '새 모험가 등록하기';
  }
}

// 에러 메시지 한글 변환
function translateAuthError(error) {
  const msg = error?.message || '';
  if (msg.includes('Invalid login credentials')) return '이메일 또는 비밀번호가 올바르지 않습니다.';
  if (msg.includes('User already registered')) return '이미 가입된 이메일입니다.';
  if (msg.includes('Password should be at least')) return '비밀번호는 최소 6자리 이상이어야 합니다.';
  return msg || '오류가 발생했습니다. 다시 시도해주세요.';
}

// DB 프로필 로드 / 생성
async function fetchOrCreatePlayerProfile(user) {
  try {
    let { data: player, error } = await supabase
      .from('players')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error && error.code === 'PGRST116') {
      const displayName = user.user_metadata?.display_name || '모험가';
      const { data: newPlayer, error: insertError } = await supabase
        .from('players')
        .insert([{ id: user.id, name: displayName }])
        .select()
        .single();

      if (insertError) throw insertError;
      player = newPlayer;
    } else if (error) {
      throw error;
    }

    updateUI(player);
  } catch (err) {
    console.error('프로필 로드 에러:', err);
    showError('프로필 데이터를 불러오지 못했습니다. DB RLS 설정을 확인해주세요.');
  }
}

// UI 업데이트
function updateUI(player) {
  if (!player) return;

  const authSection = getEl('auth-section');
  const homeSection = getEl('home-section');

  if (getEl('player-name')) getEl('player-name').textContent = player.name || '모험가';
  if (getEl('player-level')) getEl('player-level').textContent = player.level || 1;
  if (getEl('player-exp')) getEl('player-exp').textContent = `${player.exp || 0} / ${player.exp_to_next || 100}`;
  
  const expPercent = Math.min(100, Math.floor(((player.exp || 0) / (player.exp_to_next || 100)) * 100));
  if (getEl('exp-bar')) getEl('exp-bar').style.width = `${expPercent}%`;

  if (getEl('player-hp')) getEl('player-hp').textContent = `${player.hp || 100} / ${player.max_hp || 100}`;
  const hpPercent = Math.min(100, Math.floor(((player.hp || 100) / (player.max_hp || 100)) * 100));
  if (getEl('hp-bar')) getEl('hp-bar').style.width = `${hpPercent}%`;

  if (getEl('player-kills')) getEl('player-kills').textContent = player.kills || 0;
  if (getEl('player-runs')) getEl('player-runs').textContent = player.runs || 0;

  if (authSection) authSection.style.display = 'none';
  if (homeSection) homeSection.style.display = 'flex';
}

// 이벤트 초기화
function init() {
  const loginForm = getEl('login-form');
  const btnToggleMode = getEl('btn-toggle-mode');
  const btnLogout = getEl('btn-logout');

  // 모드 토글 버튼 이벤트
  if (btnToggleMode) {
    btnToggleMode.addEventListener('click', (e) => {
      e.preventDefault();
      setMode(mode === 'login' ? 'signup' : 'login');
    });
  }

  // 폼 제출 이벤트 (로그인 / 회원가입)
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearError();

      const emailInput = getEl('login-email');
      const pwInput = getEl('login-pw');
      const btnSubmit = getEl('btn-submit');

      const email = emailInput ? emailInput.value.trim() : '';
      const pw = pwInput ? pwInput.value : '';

      if (!email || !pw) {
        showError('이메일과 비밀번호를 입력해주세요.');
        return;
      }

      if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.textContent = '처리 중...';
      }

      try {
        if (mode === 'signup') {
          const nicknameInput = getEl('login-nickname');
          const nickname = nicknameInput ? nicknameInput.value.trim() : '모험가';

          const { data, error } = await supabase.auth.signUp({
            email,
            password: pw,
            options: { data: { display_name: nickname } },
          });

          if (error) throw error;

          if (data?.user) {
            showError('모험가 등록 성공! 입장합니다...', true);
            await fetchOrCreatePlayerProfile(data.user);
          }
        } else {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password: pw,
          });

          if (error) throw error;

          if (data?.user) {
            await fetchOrCreatePlayerProfile(data.user);
          }
        }
      } catch (error) {
        console.error('인증 에러 발생:', error);
        showError(translateAuthError(error));
      } finally {
        if (btnSubmit) {
          btnSubmit.disabled = false;
          btnSubmit.textContent = mode === 'signup' ? '모험가 등록' : '입장하기';
        }
      }
    });
  }

  // 로그아웃 버튼 이벤트
  if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
      await supabase.auth.signOut();
      const authSection = getEl('auth-section');
      const homeSection = getEl('home-section');
      if (homeSection) homeSection.style.display = 'none';
      if (authSection) authSection.style.display = 'flex';

      if (getEl('login-email')) getEl('login-email').value = '';
      if (getEl('login-pw')) getEl('login-pw').value = '';
      if (getEl('login-nickname')) getEl('login-nickname').value = '';
      clearError();
    });
  }

  // 기존 로그인 체크
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session?.user) {
      fetchOrCreatePlayerProfile(session.user);
    }
  });
}

// 스크립트 실행
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
