// WaveBox library page logic.
// Requires login, shows 10 equal tiles, then routes into /player.

const albumGrid = document.getElementById('album-grid');
const albumCount = document.getElementById('album-count');

function artClass(index) {
  return 'album-art-' + (index + 1);
}

function openTrack(track) {
  window.location.href = '/player?track=' + encodeURIComponent(String(track.id));
}

function makeAlbumCard(track) {
  const btn = document.createElement('button');
  btn.className = 'album-card';
  btn.type = 'button';
  btn.onclick = function () {
    openTrack(track);
  };

  btn.innerHTML =
    '<div class="album-card-art ' + artClass(track.colorIndex) + '">' +
      '<span class="album-card-art-label">' + track.title + '</span>' +
    '</div>' +
    '<div class="album-card-body">' +
      '<p class="album-card-title">' + track.title + '</p>' +
      '<p class="album-card-meta">' + track.artist + ' · ' + track.genre + '</p>' +
    '</div>';

  return btn;
}

function buildTenTiles(tracks) {
  const names = [
    'Night Drive',
    'Soft Rain',
    'City Lights',
    'Study Session',
    'Late Night Code',
    'Blue Hour Mix',
    'Lo-Fi Lab',
    'Focus Loop',
    'Midnight Build',
    'Calm Commute'
  ];

  const tiles = [];
  for (let i = 0; i < 10; i++) {
    const base = tracks[i % tracks.length];
    tiles.push({
      id: base.id,
      title: names[i],
      artist: base.artist,
      genre: base.genre,
      colorIndex: i
    });
  }
  return tiles;
}

async function initLibrary() {
  const user = await requireAuth();
  if (!user) return;

  setUserPill(user);
  wireLogoutButton();

  try {
    const tracks = await apiAuth('/api/tracks');
    const tiles = buildTenTiles(tracks);

    albumGrid.innerHTML = '';
    for (let i = 0; i < tiles.length; i++) {
      albumGrid.appendChild(makeAlbumCard(tiles[i]));
    }

    albumCount.textContent = '10 tiles';
  } catch (err) {
    albumCount.textContent = 'Error';
    albumGrid.innerHTML = '<p class="status">' + err.message + '</p>';
  }
}

initLibrary();
