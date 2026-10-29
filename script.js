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

// 에러 및 안내 메시지 출력
function showError(msg, isInfo = false) {
  if (!els.authError) return;
  els.authError.textContent = msg;
  els.authError.style.display = 'block';
  els.authError.style.color = isInfo ? '#4caf50' : '#ff4d4d'; // 안내는 초록색, 에러는 빨간색
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
  if
