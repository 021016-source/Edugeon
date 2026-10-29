import { supabase } from './supabase-config.js';

// DOM 요소 모음
const els = {
  authSection: document.getElementById('auth-section'),
  homeSection: document.getElementById('home-section'),
  loginForm: document.getElementById('login-form'),
  loginEmail: document.getElementById('login-email'),
  loginPw: document.getElementById('login-pw'),
  loginNickname: document.getElementById('login-nickname'),
  nicknameGroup: document.getElementById('nickname-group'),
  btnSubmit: document.getElementById('btn-submit'),
  btnToggleMode: document.getElementById('btn-toggle-mode'),
  authError: document.getElementById('auth-error'),
  btnLogout: document.getElementById('btn-logout'),
  
  // 유저 정보 표시 요소
  playerName: document.getElementById('player-name'),
  playerLevel: document.getElementById('player-level'),
  playerExp: document.getElementById('player-exp'),
  expBar: document.getElementById('exp-bar'),
  playerHp: document.getElementById('player-hp'),
  hpBar: document.getElementById('hp-bar'),
  playerKills: document.getElementById('player-kills'),
  playerRuns: document.getElementById('player-runs'),
};

let mode = 'login'; // 'login' 또는 'signup'

// 메시지 출력
function showError(msg, isInfo = false) {
  if (!els.authError) return;
  els.authError.textContent = msg;
  els.authError.style.display = 'block';
  els.authError.style.color = isInfo ? '#4caf50' : '#ff4d4d';
}

function clearError() {
  if (!els.authError) return;
  els.authError.textContent = '';
  els.authError.style.display = 'none';
}

// 모드 전환 (로그인 <-> 회원가입)
function setMode(newMode) {
  mode = newMode;
  clearError();
  if (mode === 'signup') {
    els.nicknameGroup.style.display = 'block';
    els.btnSubmit.textContent = '모험가 등록';
    els.btnToggleMode.textContent = '이미 계정이 있으신가요? 입장하기';
  } else {
    els.nicknameGroup.style.display = 'none';
    els.btnSubmit.textContent = '입장하기';
    els.btnToggleMode.textContent = '새 모험가 등록하기';
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
      // 신규 유저 데이터 등록
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
  
  els.playerName.textContent = player.name || '모험가';
  els.playerLevel.textContent = player.level || 1;
  els.playerExp.textContent = `${player.exp || 0} / ${player.exp_to_next || 100}`;
  
  const expPercent = Math.min(100, Math.floor(((player.exp || 0) / (player.exp_to_next || 100)) * 100));
  els.expBar.style.width = `${expPercent}%`;

  els.playerHp.textContent = `${player.hp || 100} / ${player.max_hp || 100}`;
  const hpPercent = Math.min(100, Math.floor(((player.hp || 100) / (player.max_hp || 100)) * 100));
  els.hpBar.style.width = `${hpPercent}%`;

  els.playerKills.textContent = player.kills || 0;
  els.playerRuns.textContent = player.runs || 0;

  els.authSection.style.display = 'none';
  els.homeSection.style.display = 'flex';
}

// 폼 제출 이벤트
els.loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearError();

  const email = els.loginEmail.value.trim();
  const pw = els.loginPw.value;

  if (!email || !pw) {
    showError('이메일과 비밀번호를 입력해주세요.');
    return;
  }

  els.btnSubmit.disabled = true;
  els.btnSubmit.textContent = '처리 중...';

  try {
    if (mode === 'signup') {
      const nickname = els.loginNickname.value.trim() || '모험가';

      const { data, error } = await supabase.auth.signUp({
        email,
        password: pw,
        options: {
          data: { display_name: nickname }
        },
      });

      if (error) throw error;

      if (data?.user) {
        showError('모험가 등록 완료! 입장합니다...', true);
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
    els.btnSubmit.disabled = false;
    els.btnSubmit.textContent = mode === 'signup' ? '모험가 등록' : '입장하기';
  }
});

// 토글 버튼
els.btnToggleMode.addEventListener('click', () => {
  setMode(mode === 'login' ? 'signup' : 'login');
});

// 로그아웃
els.btnLogout.addEventListener('click', async () => {
  await supabase.auth.signOut();
  els.homeSection.style.display = 'none';
  els.authSection.style.display = 'flex';
  els.loginEmail.value = '';
  els.loginPw.value = '';
  els.loginNickname.value = '';
  clearError();
});

// 기존 세션 자동 로그인
supabase.auth.getSession().then(({ data: { session } }) => {
  if (session?.user) {
    fetchOrCreatePlayerProfile(session.user);
  }
});
