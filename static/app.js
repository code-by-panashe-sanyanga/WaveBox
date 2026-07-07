// WaveBox player logic.
// Loads tracks from the API, supports filters, and keeps now-playing/cover art in sync.

// --- DOM references (grabbed once at the top) ---

const player = document.getElementById('player');
const list = document.getElementById('tracks');
const trackCount = document.getElementById('track-count');
const searchInput = document.getElementById('search');
const genreFilters = document.getElementById('genre-filters');

// Now playing panel (left side)
const nowTitle = document.getElementById('now-title');
const nowArtist = document.getElementById('now-artist');
const nowGenre = document.getElementById('now-genre');
const artwork = document.getElementById('artwork');

// Mini copy in the bottom player bar
const barTitle = document.getElementById('bar-title');
const barArtist = document.getElementById('bar-artist');
const miniArt = document.getElementById('mini-art');
const artworkImg = document.getElementById('artwork-img');

// Player controls
const btnPrev = document.getElementById('btn-prev');
const btnPlay = document.getElementById('btn-play');
const btnNext = document.getElementById('btn-next');
const seek = document.getElementById('seek');
const timeCurrent = document.getElementById('time-current');
const timeTotal = document.getElementById('time-total');

// --- App state ---

let tracks = [];           // full list from /api/tracks
let filteredTracks = [];   // what is visible after search + genre filter
let currentTrackId = null;
let activeGenre = 'All';
let isSeeking = false;     // stops the seek bar jumping while you drag it

// Small helper — uses auth token from auth.js.
async function api(path) {
  return apiAuth(path);
}

// Turn seconds (from the audio element) into "m:ss" for the UI.
function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '0:00';
  }

  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return mins + ':' + String(secs).padStart(2, '0');
}

// Pick a CSS fallback class for cases where cover art fails to load.
function genreClass(genre) {
  const key = (genre || '').toLowerCase();
  if (key === 'lofi') return 'artwork-lofi';
  if (key === 'chill') return 'artwork-chill';
  return 'artwork-idle';
}

function setArtworkFallback(genre, playing) {
  artwork.className = 'artwork ' + genreClass(genre);
  if (playing) artwork.classList.add('artwork-playing');
}

// Update cover images in both now-playing panel and footer bar.
function setCover(track, playing) {
  if (!track || !track.cover) {
    artworkImg.removeAttribute('src');
    artworkImg.style.display = 'none';
    miniArt.removeAttribute('src');
    setArtworkFallback('', false);
    return;
  }

  artworkImg.src = track.cover;
  artworkImg.alt = track.title + ' album cover';
  artworkImg.style.display = 'block';

  miniArt.src = track.cover;
  miniArt.alt = track.title + ' cover';
  setArtworkFallback(track.genre, playing);
}

// Sync the now-playing panel and bottom bar with the current track.
function updateNowPlaying(track, playing) {
  if (!track) {
    nowTitle.textContent = 'Nothing playing';
    nowArtist.textContent = 'Pick a track from the library';
    nowGenre.textContent = '—';
    barTitle.textContent = '—';
    barArtist.textContent = '—';
    setCover(null, false);
    btnPlay.textContent = '▶';
    btnPlay.setAttribute('aria-label', 'Play');
    return;
  }

  nowTitle.textContent = track.title;
  nowArtist.textContent = track.artist;
  nowGenre.textContent = track.genre;
  barTitle.textContent = track.title;
  barArtist.textContent = track.artist;
  setCover(track, playing);
  btnPlay.textContent = playing ? '⏸' : '▶';
  btnPlay.setAttribute('aria-label', playing ? 'Pause' : 'Play');
}

// Mark the clicked row as active and remove active from the old one.
function setActiveTrack(trackId) {
  currentTrackId = trackId;

  const items = list.querySelectorAll('.track-item');
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (Number(item.dataset.id) === trackId) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  }
}

// Look up the full track object for whatever is playing right now.
function currentTrack() {
  if (currentTrackId == null) return null;

  for (let i = 0; i < tracks.length; i++) {
    if (tracks[i].id === currentTrackId) return tracks[i];
  }

  return null;
}

// Find where the current track sits inside the filtered list (for prev/next).
function currentIndexInFiltered() {
  for (let i = 0; i < filteredTracks.length; i++) {
    if (filteredTracks[i].id === currentTrackId) return i;
  }
  return -1;
}

// Set the audio source and start playback.
function playTrack(track) {
  if (!track) return;

  player.src = track.url;
  setActiveTrack(track.id);
  updateNowPlaying(track, true);

  // play() returns a promise. Browsers sometimes block autoplay until you click.
  player.play().catch(function () {
    updateNowPlaying(track, false);
  });
}

// Build one list row for a track.
function makeTrackRow(track, index) {
  const li = document.createElement('li');
  li.className = 'track-item';
  li.dataset.id = track.id;

  const num = document.createElement('span');
  num.className = 'track-index';
  num.textContent = String(index + 1);

  const info = document.createElement('div');
  info.className = 'track-info';
  info.innerHTML =
    '<p class="track-title">' + track.title + '</p>' +
    '<p class="track-meta">' + track.artist + '</p>';

  const genre = document.createElement('span');
  genre.className = 'track-genre';
  genre.textContent = track.genre;

  li.appendChild(num);
  li.appendChild(info);
  li.appendChild(genre);

  li.onclick = function () {
    playTrack(track);
  };

  return li;
}

// Pull unique genre names out of the track list for the filter pills.
function uniqueGenres(items) {
  const genres = new Set();
  for (let i = 0; i < items.length; i++) {
    genres.add(items[i].genre);
  }
  return Array.from(genres).sort();
}

// Draw the genre filter buttons (All, Lofi, Chill, etc.).
function renderGenreFilters() {
  const genres = ['All'].concat(uniqueGenres(tracks));
  genreFilters.innerHTML = '';

  for (let i = 0; i < genres.length; i++) {
    const genre = genres[i];
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'genre-btn' + (genre === activeGenre ? ' active' : '');
    btn.textContent = genre;
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', genre === activeGenre ? 'true' : 'false');

    btn.onclick = function () {
      activeGenre = genre;
      renderGenreFilters();
      applyFilters();
    };

    genreFilters.appendChild(btn);
  }
}

// Filter tracks by search box + active genre, then redraw the list.
function applyFilters() {
  const query = searchInput.value.trim().toLowerCase();

  filteredTracks = tracks.filter(function (track) {
    const matchesGenre = activeGenre === 'All' || track.genre === activeGenre;
    const haystack = (track.title + ' ' + track.artist + ' ' + track.genre).toLowerCase();
    const matchesSearch = !query || haystack.indexOf(query) !== -1;
    return matchesGenre && matchesSearch;
  });

  list.innerHTML = '';

  if (filteredTracks.length === 0) {
    list.innerHTML = '<li class="empty-message">No tracks match that filter.</li>';
    trackCount.textContent = '0 tracks';
    return;
  }

  if (filteredTracks.length === 1) {
    trackCount.textContent = '1 track';
  } else {
    trackCount.textContent = filteredTracks.length + ' tracks';
  }

  for (let i = 0; i < filteredTracks.length; i++) {
    list.appendChild(makeTrackRow(filteredTracks[i], i));
  }

  // Keep the highlight if the playing track is still visible.
  if (currentTrackId != null) {
    setActiveTrack(currentTrackId);
  }
}

// Ask the server for tracks and show them.
async function loadTracks() {
  tracks = await api('/api/tracks');
  const params = new URLSearchParams(window.location.search);
  const artistFilter = params.get('artist');
  const trackIdParam = params.get('track');

  if (artistFilter) {
    searchInput.value = artistFilter;
  }

  filteredTracks = tracks.slice();
  renderGenreFilters();
  applyFilters();

  if (trackIdParam) {
    const trackId = Number(trackIdParam);
    for (let i = 0; i < tracks.length; i++) {
      if (tracks[i].id === trackId) {
        searchInput.value = tracks[i].title;
        applyFilters();
        setActiveTrack(trackId);
        updateNowPlaying(tracks[i], false);
        break;
      }
    }
  }
}

// --- Button handlers ---

btnPlay.onclick = function () {
  const track = currentTrack();

  // Nothing selected yet — start with the first visible track.
  if (!track) {
    if (filteredTracks.length > 0) {
      playTrack(filteredTracks[0]);
    }
    return;
  }

  if (player.paused) {
    player.play().catch(function () {});
    updateNowPlaying(track, true);
  } else {
    player.pause();
    updateNowPlaying(track, false);
  }
};

// Previous walks backwards through the filtered list (wraps to the end).
btnPrev.onclick = function () {
  if (filteredTracks.length === 0) return;

  let idx = currentIndexInFiltered();
  if (idx <= 0) idx = filteredTracks.length;
  playTrack(filteredTracks[idx - 1]);
};

// Next walks forwards and loops back to the start.
btnNext.onclick = function () {
  if (filteredTracks.length === 0) return;

  let idx = currentIndexInFiltered();
  if (idx < 0) {
    playTrack(filteredTracks[0]);
    return;
  }

  playTrack(filteredTracks[(idx + 1) % filteredTracks.length]);
};

// Re-filter whenever the user types in the search box.
searchInput.addEventListener('input', applyFilters);

// --- Audio element events ---

// Once metadata loads we know the total duration for the seek bar.
player.addEventListener('loadedmetadata', function () {
  timeTotal.textContent = formatTime(player.duration);
  seek.max = String(Math.floor(player.duration) || 0);
});

// Keep the seek bar and elapsed time in sync while audio plays.
player.addEventListener('timeupdate', function () {
  if (!isSeeking) {
    seek.value = String(Math.floor(player.currentTime) || 0);
    timeCurrent.textContent = formatTime(player.currentTime);
  }
});

player.addEventListener('play', function () {
  updateNowPlaying(currentTrack(), true);
});

player.addEventListener('pause', function () {
  updateNowPlaying(currentTrack(), false);
});

// When a song finishes, auto-advance to the next track in the filtered list.
player.addEventListener('ended', function () {
  btnNext.click();
});

// While dragging the seek bar, update the time label without fighting timeupdate.
seek.addEventListener('input', function () {
  isSeeking = true;
  timeCurrent.textContent = formatTime(Number(seek.value));
});

seek.addEventListener('change', function () {
  player.currentTime = Number(seek.value);
  isSeeking = false;
});

// Start everything when the page loads.
async function init() {
  const user = await requireAuth();
  if (!user) return;

  setUserPill(user);
  wireLogoutButton();

  try {
    await loadTracks();
  } catch (err) {
    trackCount.textContent = 'Error';
    list.innerHTML = '<li class="status">' + err.message + '</li>';
  }
}

init();
