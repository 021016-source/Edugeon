import { supabase } from './supabase-config.js';

// DOM 요소 가져오기 Helper
const getEl = (id) => document.getElementById(id);

let mode = 'login'; // 'login' 또는 'signup'

// 에러 메시지 출력
function showError(msg, isInfo = false) {
  const authError = getEl('auth-error');
  if (!authError) return;
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
  const msg = error.message || '';
  if (msg.includes('Invalid login credentials')) return '이메일 또는 비밀번호가 올바르지 않습니다.';
  if (msg.includes('User already registered')) return '이미 가입된 이메일입니다.';
  if (msg.includes('Password should be at least')) return '비밀번호는 최소 6자리 이상이어야 합니다.';
  return msg || '오류가 발생했습니다. 다시 시도해주세요.';
}

// DB에서 유저 프로필 가져오기 (없으면 자동 생성)
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
    showError('유저 정보를 불러오는 데 실패했습니다.');
  }
}

// 게임 홈 화면 UI 업데이트
function updateUI(player) {
  if (!player) return;
  
  const playerName = getEl('player-name');
  const playerLevel = getEl('player-level');
  const playerExp = getEl('player-exp');
  const expBar = getEl('exp-bar');
  const playerHp = getEl('player-hp');
  const hpBar = getEl('hp-bar');
  const playerKills = getEl('player-kills');
  const playerRuns = getEl('player-runs');
  const authSection = getEl('auth-section');
  const homeSection = getEl('home-section');

  if (playerName) playerName.textContent = player.name || '모험가';
  if (playerLevel) playerLevel.textContent = player.level || 1;
  if (playerExp) playerExp.textContent = `${player.exp || 0} / ${player.exp_to_next || 100}`;
  
  const expPercent = Math.min(100, Math.floor(((player.exp || 0) / (player.exp_to_next || 100)) * 100));
  if (expBar) expBar.style.width = `${expPercent}%`;

  if (playerHp) playerHp.textContent = `${player.hp || 100} / ${player.max_hp || 100}`;
  const hpPercent = Math.min(100, Math.floor(((player.hp || 100) / (player.max_hp || 100)) * 100));
  if (hpBar) hpBar.style.width = `${hpPercent}%`;

  if (playerKills) playerKills.textContent = player.kills || 0;
  if (playerRuns) playerRuns.textContent = player.runs || 0;

  if (authSection) authSection.style.display = 'none';
  if (homeSection) homeSection.style.display = 'flex';
}

// 이벤트 리스너 등록 함수
function initEvents() {
  const loginForm = getEl('login-form');
  const btnToggleMode = getEl('btn-toggle-mode');
  const btnLogout = getEl('btn-logout');

  // 모드 전환 버튼
  if (btnToggleMode) {
    btnToggleMode.onclick = (e) => {
      e.preventDefault();
      setMode(mode === 'login' ? 'signup' : 'login');
    };
  }

  // 폼 제출 (로그인 / 회원가입)
  if (loginForm) {
    loginForm.onsubmit = async (e) => {
      e.preventDefault();
      clearError();

      const email = getEl('login-email')?.value.trim();
      const pw = getEl('login-pw')?.value;
      const btnSubmit = getEl('btn-submit');

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
          const nickname = getEl('login-nickname')?.value.trim() || '모험가';

          const { data, error } = await supabase.auth.signUp({
            email,
            password: pw,
            options: { data: { display_name: nickname } },
          });

          if (error) throw error;

          if (data?.user) {
            showError('모험가 등록 성공! 이동 중...', true);
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
        console.error('Auth Error:', error);
        showError(translateAuthError(error));
      } finally {
        if (btnSubmit) {
          btnSubmit.disabled = false;
          btnSubmit.textContent = mode === 'signup' ? '모험가 등록' : '입장하기';
        }
      }
    };
  }

  // 로그아웃
  if (btnLogout) {
    btnLogout.onclick = async () => {
      await supabase.auth.signOut();
      const authSection = getEl('auth-section');
      const homeSection = getEl('home-section');
      if (homeSection) homeSection.style.display = 'none';
      if (authSection) authSection.style.display = 'flex';
      
      if (getEl('login-email')) getEl('login-email').value = '';
      if (getEl('login-pw')) getEl('login-pw').value = '';
      if (getEl('login-nickname')) getEl('login-nickname').value = '';
      clearError();
    };
  }
}

// DOM 로드 완료 후 실행
document.addEventListener('DOMContentLoaded', () => {
  initEvents();

  // 기존 로그인 세션 체크
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session?.user) {
      fetchOrCreatePlayerProfile(session.user);
    }
  });
});
