import { supabase } from './supabase-config.js';

let mode = 'login';

let player = {
  id: null,
  name: '모험가',
  level: 1,
  exp: 0,
  exp_to_next: 100,
  hp: 100,
  max_hp: 100,
  atk: 15,
  kills: 0,
  stage: 1
};

let monster = {
  name: '슬라임',
  hp: 40,
  max_hp: 40,
  atk: 10,
  exp_reward: 30,
  icon: '👾'
};

let quizList = [];
let currentQuiz = null;

const MONSTER_TYPES = [
  { name: '슬라임', icon: '👾', hpBase: 40, atkBase: 8, expBase: 25 },
  { name: '고블린', icon: '👺', hpBase: 70, atkBase: 12, expBase: 45 },
  { name: '해골 전사', icon: '💀', hpBase: 120, atkBase: 18, expBase: 80 },
  { name: '드래곤', icon: '🐉', hpBase: 220, atkBase: 28, expBase: 150 }
];

const getEl = (id) => document.getElementById(id);

function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  getEl(screenId).classList.add('active');
}

function showAuthError(msg) {
  const el = getEl('auth-error');
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}

function clearAuthError() {
  const el = getEl('auth-error');
  if (el) { el.textContent = ''; el.style.display = 'none'; }
}

function addLog(msg) {
  const logEl = getEl('ui-log');
  if (logEl) logEl.textContent = msg;
}

function renderUI() {
  getEl('ui-name').textContent = player.name;
  getEl('ui-level').textContent = player.level;
  getEl('ui-atk').textContent = player.atk;
  getEl('ui-kills').textContent = player.kills;
  getEl('ui-stage').textContent = `STAGE ${player.stage}`;

  getEl('ui-hp-text').textContent = `${player.hp} / ${player.max_hp}`;
  const hpPct = Math.max(0, Math.min(100, (player.hp / player.max_hp) * 100));
  getEl('ui-hp-fill').style.width = `${hpPct}%`;

  getEl('ui-exp-text').textContent = `${player.exp} / ${player.exp_to_next}`;
  const expPct = Math.max(0, Math.min(100, (player.exp / player.exp_to_next) * 100));
  getEl('ui-exp-fill').style.width = `${expPct}%`;

  getEl('ui-monster-name').textContent = monster.name;
  getEl('ui-monster-icon').textContent = monster.icon;
  getEl('ui-monster-hp-text').textContent = `${monster.hp} / ${monster.max_hp}`;
  const mHpPct = Math.max(0, Math.min(100, (monster.hp / monster.max_hp) * 100));
  getEl('ui-monster-hp-fill').style.width = `${mHpPct}%`;
}

// 퀴즈 불러오기 및 출제
async function fetchQuizzes() {
  try {
    const { data, error } = await supabase.from('quizzes').select('*');
    if (error) throw error;
    if (data && data.length > 0) {
      quizList = data;
      loadNextQuiz();
    } else {
      getEl('ui-quiz-question').textContent = '등록된 퀴즈가 없습니다. 퀴즈를 직접 등록해주세요!';
    }
  } catch (err) {
    console.error('퀴즈 로드 실패:', err);
  }
}

function loadNextQuiz() {
  if (quizList.length === 0) return;
  const randIdx = Math.floor(Math.random() * quizList.length);
  currentQuiz = quizList[randIdx];

  getEl('ui-quiz-question').textContent = `Q. ${currentQuiz.question}`;
  getEl('opt-1').textContent = `1. ${currentQuiz.option_a}`;
  getEl('opt-2').textContent = `2. ${currentQuiz.option_b}`;
  getEl('opt-3').textContent = `3. ${currentQuiz.option_c}`;
  getEl('opt-4').textContent = `4. ${currentQuiz.option_d}`;
}

// 퀴즈 정답 검증 및 전투 처리
function handleAnswer(selectedOpt) {
  if (player.hp <= 0) {
    addLog('체력이 없습니다. 휴식하기를 누르세요!');
    return;
  }
  if (!currentQuiz) return;

  if (selectedOpt === currentQuiz.answer) {
    // 정답: 몬스터 공격
    monster.hp -= player.atk;
    addLog(`⭕ 정답입니다! ${monster.name}에게 ${player.atk}의 피해!`);

    if (monster.hp <= 0) {
      monster.hp = 0;
      player.kills += 1;
      player.exp += monster.exp_reward;
      addLog(`🎉 ${monster.name} 처치 완료! (EXP +${monster.exp_reward})`);

      if (player.exp >= player.exp_to_next) {
        player.level += 1;
        player.exp -= player.exp_to_next;
        player.exp_to_next = Math.floor(player.exp_to_next * 1.5);
        player.max_hp += 20;
        player.hp = player.max_hp;
        player.atk += 5;
        addLog(`✨ 레벨업! Lv.${player.level} 달성!`);
      }

      if (player.kills % 2 === 0) player.stage += 1;

      savePlayerData();
      setTimeout(spawnMonster, 800);
    }
  } else {
    // 오답: 플레이어 체력 차감
    player.hp -= monster.atk;
    addLog(`❌ 오답입니다! (정답: ${currentQuiz.answer}번) HP -${monster.atk}`);
    if (player.hp <= 0) {
      player.hp = 0;
      addLog(`💥 체력이 0이 되어 쓰러졌습니다. 휴식을 취하세요.`);
    }
  }

  renderUI();
  loadNextQuiz();
}

function spawnMonster() {
  const typeIdx = Math.min(Math.floor((player.stage - 1) / 2), MONSTER_TYPES.length - 1);
  const base = MONSTER_TYPES[typeIdx];
  const scale = 1 + (player.stage - 1) * 0.3;

  monster = {
    name: base.name,
    icon: base.icon,
    max_hp: Math.floor(base.hpBase * scale),
    hp: Math.floor(base.hpBase * scale),
    atk: Math.floor(base.atkBase * scale),
    exp_reward: Math.floor(base.expBase * scale)
  };

  renderUI();
}

async function savePlayerData() {
  if (!player.id) return;
  try {
    await supabase.from('players').update({
      level: player.level,
      exp: player.exp,
      exp_to_next: player.exp_to_next,
      hp: player.hp,
      max_hp: player.max_hp,
      atk: player.atk,
      kills: player.kills,
      stage: player.stage,
      updated_at: new Date()
    }).eq('id', player.id);
  } catch (err) {
    console.error('저장 에러:', err);
  }
}

function handleRest() {
  if (player.hp >= player.max_hp) {
    addLog('이미 체력이 완쾌된 상태입니다.');
    return;
  }
  player.hp = player.max_hp;
  addLog('🩹 휴식을 취해 체력을 완전히 회복했습니다.');
  savePlayerData();
  renderUI();
}

async function loadOrCreateProfile(user) {
  try {
    let { data, error } = await supabase.from('players').select('*').eq('id', user.id).single();

    if (error && error.code === 'PGRST116') {
      const displayName = user.user_metadata?.display_name || '모험가';
      const { data: newP, error: insErr } = await supabase.from('players').insert([{ id: user.id, name: displayName }]).select().single();
      if (insErr) throw insErr;
      data = newP;
    }

    player = { ...player, ...data };
    spawnMonster();
    await fetchQuizzes();
    showScreen('game-section');
  } catch (err) {
    console.error('프로필 에러:', err);
    showAuthError('유저 정보를 가져오지 못했습니다.');
  }
}

// 퀴즈 신규 추가 처리
async function handleAddQuizSubmit(e) {
  e.preventDefault();
  const q = getEl('quiz-input-q').value.trim();
  const a1 = getEl('quiz-input-1').value.trim();
  const a2 = getEl('quiz-input-2').value.trim();
  const a3 = getEl('quiz-input-3').value.trim();
  const a4 = getEl('quiz-input-4').value.trim();
  const ans = parseInt(getEl('quiz-input-ans').value, 10);

  try {
    const { error } = await supabase.from('quizzes').insert([
      { question: q, option_a: a1, option_b: a2, option_c: a3, option_d: a4, answer: ans }
    ]);
    if (error) throw error;

    alert('과학 퀴즈가 성공적으로 추가되었습니다!');
    getEl('quiz-form').reset();
    getEl('quiz-modal').style.display = 'none';
    fetchQuizzes();
  } catch (err) {
    alert('퀴즈 등록 실패: ' + err.message);
  }
}

async function openRanking() {
  try {
    const { data, error } = await supabase.from('players').select('name, level, stage, kills').order('level', { ascending: false }).order('stage', { ascending: false }).limit(10);
    if (error) throw error;

    const tbody = getEl('ui-ranking-list');
    tbody.innerHTML = '';
    data.forEach((item, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${idx + 1}</td><td>${item.name}</td><td>${item.level}</td><td>${item.stage}</td><td>${item.kills}</td>`;
      tbody.appendChild(tr);
    });
    getEl('ranking-modal').style.display = 'flex';
  } catch (err) {
    console.error('랭킹 로드 에러:', err);
  }
}

function initEvents() {
  getEl('btn-toggle-auth').addEventListener('click', () => {
    clearAuthError();
    if (mode === 'login') {
      mode = 'signup';
      getEl('nickname-field').style.display = 'flex';
      getEl('btn-auth-submit').textContent = '모험가 등록';
      getEl('btn-toggle-auth').textContent = '이미 계정이 있으신가요? 입장하기';
    } else {
      mode = 'login';
      getEl('nickname-field').style.display = 'none';
      getEl('btn-auth-submit').textContent = '입장하기';
      getEl('btn-toggle-auth').textContent = '새 모험가 등록하기';
    }
  });

  getEl('auth-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAuthError();

    const email = getEl('input-email').value.trim();
    const pw = getEl('input-pw').value;
    const btn = getEl('btn-auth-submit');

    btn.disabled = true;
    btn.textContent = '처리 중...';

    try {
      if (mode === 'signup') {
        const nickname = getEl('input-nickname').value.trim() || '모험가';
        const { data, error } = await supabase.auth.signUp({
          email, password: pw, options: { data: { display_name: nickname } }
        });
        if (error) throw error;
        if (data?.user) await loadOrCreateProfile(data.user);
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password: pw });
        if (error) throw error;
        if (data?.user) await loadOrCreateProfile(data.user);
      }
    } catch (err) {
      showAuthError(err.message || '인증에 실패했습니다.');
    } finally {
      btn.disabled = false;
      btn.textContent = mode === 'signup' ? '모험가 등록' : '입장하기';
    }
  });

  // 보기 버튼 선택 시 정답 검증
  document.querySelectorAll('.quiz-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const optNum = parseInt(e.target.getAttribute('data-opt'), 10);
      handleAnswer(optNum);
    });
  });

  getEl('btn-rest').addEventListener('click', handleRest);
  getEl('btn-logout').addEventListener('click', async () => {
    await supabase.auth.signOut();
    showScreen('auth-section');
  });

  getEl('btn-add-quiz').addEventListener('click', () => { getEl('quiz-modal').style.display = 'flex'; });
  getEl('btn-close-quiz-modal').addEventListener('click', () => { getEl('quiz-modal').style.display = 'none'; });
  getEl('quiz-form').addEventListener('submit', handleAddQuizSubmit);

  getEl('btn-ranking').addEventListener('click', openRanking);
  getEl('btn-close-ranking').addEventListener('click', () => { getEl('ranking-modal').style.display = 'none'; });

  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session?.user) loadOrCreateProfile(session.user);
  });
}

document.addEventListener('DOMContentLoaded', initEvents);
