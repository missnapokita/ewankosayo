import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';

// PALITAN MO ITO NG FIREBASE WEB CONFIG MO
const firebaseConfig = {
  apiKey: 'PASTE_FIREBASE_API_KEY',
  authDomain: 'zenmax-a5026.firebaseapp.com',
  databaseURL: 'https://zenmax-a5026-default-rtdb.firebaseio.com',
  projectId: 'zenmax-a5026',
  storageBucket: 'zenmax-a5026.appspot.com',
  messagingSenderId: 'PASTE_SENDER_ID',
  appId: 'PASTE_APP_ID'
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
let currentUser = null;
let currentMovieId = '';

const $ = id => document.getElementById(id);
const api = async (url, body, authRequired = true) => {
  const headers = { 'Content-Type': 'application/json' };
  if (authRequired && currentUser) headers.Authorization = 'Bearer ' + await currentUser.getIdToken(true);
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body || {}) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || JSON.stringify(data));
  return data;
};

function setMsg(id, text, error=false){ const el=$(id); el.textContent=text; el.className='msg'+(error?' error':''); }

onAuthStateChanged(auth, user => {
  currentUser = user;
  $('loginPanel').classList.toggle('hidden', !!user);
  $('adminPanel').classList.toggle('hidden', !user);
  if (user) $('userChip').textContent = user.email;
});

$('loginBtn').onclick = async () => {
  try { await signInWithEmailAndPassword(auth, $('email').value.trim(), $('password').value); setMsg('loginMsg','Login success'); }
  catch(e){ setMsg('loginMsg', e.message, true); }
};
$('logoutBtn').onclick = () => signOut(auth);

document.querySelectorAll('.nav[data-tab]').forEach(btn => btn.onclick = () => {
  document.querySelectorAll('.nav').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  $(btn.dataset.tab).classList.add('active');
  $('pageTitle').textContent = btn.textContent;
});

$('tmdbBtn').onclick = async () => {
  const q = $('tmdbQuery').value.trim(); if(!q) return;
  $('tmdbResults').innerHTML = 'Searching...';
  try {
    const r = await fetch(`/api/tmdb-search?q=${encodeURIComponent(q)}&type=${$('tmdbType').value}`);
    const data = await r.json();
    $('tmdbResults').innerHTML = '';
    (data.results || []).slice(0,8).forEach(item => {
      const title = item.name || item.title || 'Untitled';
      const poster = item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : '';
      const backdrop = item.backdrop_path ? `https://image.tmdb.org/t/p/w780${item.backdrop_path}` : '';
      const div = document.createElement('div'); div.className='result-item';
      div.innerHTML = `<img src="${poster}" onerror="this.style.display='none'"/><div class="grow"><b>${title}</b><br><small>TMDB ID: ${item.id}</small><p>${(item.overview||'').slice(0,130)}</p></div><button class="primary">Use</button>`;
      div.querySelector('button').onclick = () => {
        $('movieTitle').value = title; $('tmdbId').value = item.id; $('posterUrl').value = poster; $('backdropUrl').value = backdrop; $('movieDesc').value = item.overview || '';
      };
      $('tmdbResults').appendChild(div);
    });
  } catch(e){ $('tmdbResults').innerHTML = e.message; }
};

$('saveMovieBtn').onclick = async () => {
  try {
    const data = await api('/api/admin-save', {
      mode:'movie', title:$('movieTitle').value, description:$('movieDesc').value, posterUrl:$('posterUrl').value,
      backdropUrl:$('backdropUrl').value, category:$('movieCategory').value || 'Uncategorized', type:$('movieType').value, tmdb_id:$('tmdbId').value
    });
    currentMovieId = data.id; $('episodeMovieId').value = data.id;
    setMsg('movieMsg', 'Saved! Movie ID: ' + data.id);
  } catch(e){ setMsg('movieMsg', e.message, true); }
};

$('saveEpisodeBtn').onclick = async () => {
  try {
    const provider = $('episodeProvider').value;
    const body = {
      mode:'episode', movieId:$('episodeMovieId').value || currentMovieId, season:$('episodeSeason').value,
      episode:$('episodeNumber').value, title:$('episodeTitle').value, description:$('episodeDesc').value,
      thumbnail:$('episodeThumb').value, runtime:$('episodeRuntime').value, provider,
      originalUrl: provider === 'terabox' ? $('episodeUrl').value : '', bunnyUrl: provider === 'bunny' ? $('episodeUrl').value : ''
    };
    const data = await api('/api/admin-save', body);
    setMsg('episodeMsg', 'Episode saved! ID: ' + data.episodeId);
  } catch(e){ setMsg('episodeMsg', e.message, true); }
};

$('teraBtn').onclick = async () => {
  $('teraResults').innerHTML = 'Loading...';
  try {
    const data = await api('/api/terabox-preview', { url:$('teraUrl').value });
    $('teraResults').innerHTML = '';
    if(data.status !== 'success') { $('teraResults').textContent = JSON.stringify(data); return; }
    data.list.forEach(item => {
      const div = document.createElement('div'); div.className='result-item';
      div.innerHTML = `<img src="${item.thumbnail||''}" onerror="this.style.display='none'"/><div class="grow"><b>${item.name}</b><br><small>${item.duration||''} • ${item.quality||''} • ${item.size_formatted||''}</small><p>${item.file_path||''}</p></div>`;
      $('teraResults').appendChild(div);
    });
  } catch(e){ $('teraResults').innerHTML = e.message; }
};
