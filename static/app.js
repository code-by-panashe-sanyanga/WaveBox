// WaveBox frontend logic.
// Loads tracks from the API and lets you click one to play it.

const player = document.getElementById('player');
const list = document.getElementById('tracks');
const nowPlaying = document.getElementById('now-playing');
const trackCount = document.getElementById('track-count');

// Keep the full list here so we can highlight the active track later.
let tracks = [];
let currentTrackId = null;

// Small helper that fetches JSON and throws if the server sent an error.
async function api(path) {
  const res = await fetch(path);

  let data = {};
  try {
    data = await res.json();
  } catch (err) {
    data = {};
  }

  if (!res.ok) {
    throw new Error(data.error || 'Something went wrong');
  }

  return data;
}

// Update the "Now playing" text at the top of the page.
function setNowPlaying(track) {
  if (!track) {
    nowPlaying.textContent = 'Pick a track below to start';
    return;
  }

  nowPlaying.textContent = track.title + ' by ' + track.artist;
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

// Build one list row for a track.
function makeTrackRow(track) {
  const li = document.createElement('li');
  li.className = 'track-item';
  li.dataset.id = track.id;

  const info = document.createElement('div');
  info.innerHTML =
    '<p class="track-title">' + track.title + '</p>' +
    '<p class="track-meta">' + track.artist + '</p>';

  const genre = document.createElement('span');
  genre.className = 'track-genre';
  genre.textContent = track.genre;

  li.appendChild(info);
  li.appendChild(genre);

  li.onclick = function () {
    player.src = track.url;
    setNowPlaying(track);
    setActiveTrack(track.id);

    // play() returns a promise. Browsers sometimes block autoplay until you click.
    player.play().catch(function () {
      // If autoplay is blocked the user can still press play on the audio bar.
    });
  };

  return li;
}

// Draw the whole track list on the page.
function renderTracks(items) {
  list.innerHTML = '';

  if (items.length === 0) {
    list.innerHTML = '<li class="empty-message">No tracks found.</li>';
    trackCount.textContent = '0 tracks';
    return;
  }

  if (items.length === 1) {
    trackCount.textContent = '1 track';
  } else {
    trackCount.textContent = items.length + ' tracks';
  }

  for (let i = 0; i < items.length; i++) {
    list.appendChild(makeTrackRow(items[i]));
  }
}

// Ask the server for tracks and show them.
async function loadTracks() {
  tracks = await api('/api/tracks');
  renderTracks(tracks);
}

// If the audio ends, clear the highlight so the UI matches what is happening.
player.addEventListener('ended', function () {
  currentTrackId = null;
  setNowPlaying(null);

  const items = list.querySelectorAll('.track-item');
  for (let i = 0; i < items.length; i++) {
    items[i].classList.remove('active');
  }
});

// Start everything when the page loads.
async function init() {
  try {
    await loadTracks();
  } catch (err) {
    trackCount.textContent = 'Error';
    list.innerHTML = '<li class="status">' + err.message + '</li>';
  }
}

init();
