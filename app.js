const playlistUrlInput = document.getElementById("playlist-url");
const playlistNameInput = document.getElementById("playlist-name");
const addPlaylistButton = document.getElementById("add-playlist");
const playlistFileInput = document.getElementById("playlist-file");
const playlistList = document.getElementById("playlist-list");
const categoryChips = document.getElementById("category-chips");
const searchInput = document.getElementById("search");
const toggleFavorites = document.getElementById("toggle-favorites");
const toggleLive = document.getElementById("toggle-live");
const favoritesList = document.getElementById("favorites-list");
const recentList = document.getElementById("recent-list");
const channelGrid = document.getElementById("channel-grid");
const channelCount = document.getElementById("channel-count");
const nowPlaying = document.getElementById("now-playing");
const nowMeta = document.getElementById("now-meta");
const player = document.getElementById("player");
const qualitySelect = document.getElementById("quality-select");
const playerStatus = document.getElementById("player-status");
const toggleFavoriteButton = document.getElementById("toggle-favorite");
const copyLinkButton = document.getElementById("copy-link");
const modal = document.getElementById("modal");
const modalContent = document.getElementById("modal-content");
const closeModalButton = document.getElementById("close-modal");
const openHelp = document.getElementById("open-help");
const openSettings = document.getElementById("open-settings");

const STORAGE_KEY = "neon-iptv-state";

const state = {
  playlists: [],
  activePlaylistId: null,
  selectedCategory: "Todos",
  favorites: {},
  recents: [],
  currentChannel: null,
};

const defaultPlaylists = [
  {
    id: "demo",
    name: "Lista de demonstração",
    source: "demo",
    entries: [
      {
        id: "demo-1",
        name: "Canal Cultura",
        group: "Cultura",
        logo: "https://images.unsplash.com/photo-1524253482453-3fed8d2fe12b?auto=format&fit=crop&w=200&q=60",
        url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
        isLive: true,
        tvgId: "cultura",
      },
      {
        id: "demo-2",
        name: "Esportes ao Vivo",
        group: "Esportes",
        logo: "https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=200&q=60",
        url: "https://test-streams.mux.dev/test_001/stream.m3u8",
        isLive: true,
        tvgId: "esportes",
      },
      {
        id: "demo-3",
        name: "Documentários",
        group: "Informação",
        logo: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=200&q=60",
        url: "https://test-streams.mux.dev/bbb-360p.m3u8",
        isLive: false,
        tvgId: "docs",
      },
    ],
  },
];

const hints = {
  help: `
    <h2>Guia rápido</h2>
    <ul>
      <li>Adicione listas M3U gratuitas e legais usando URL ou arquivo.</li>
      <li>Use filtros para navegar por categorias e favoritos.</li>
      <li>O player suporta links HLS (m3u8) e MP4.</li>
      <li>Use o botão ☆ para favoritar ou o atalho de copiar link.</li>
    </ul>
  `,
  settings: `
    <h2>Configurações</h2>
    <p>Recursos disponíveis nesta versão:</p>
    <ul>
      <li>Persistência local com criptografia leve do estado.</li>
      <li>Modo foco ao vivo para canais marcados como live.</li>
      <li>Carregamento de múltiplas playlists simultâneas.</li>
      <li>Histórico de reprodução e favoritos.</li>
    </ul>
  `,
};

const loadState = () => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    state.playlists = defaultPlaylists;
    state.activePlaylistId = defaultPlaylists[0].id;
    return;
  }
  try {
    const decoded = JSON.parse(atob(raw));
    Object.assign(state, decoded);
  } catch (error) {
    state.playlists = defaultPlaylists;
    state.activePlaylistId = defaultPlaylists[0].id;
  }
};

const persistState = () => {
  const payload = {
    playlists: state.playlists,
    activePlaylistId: state.activePlaylistId,
    selectedCategory: state.selectedCategory,
    favorites: state.favorites,
    recents: state.recents,
    currentChannel: state.currentChannel,
  };
  localStorage.setItem(STORAGE_KEY, btoa(JSON.stringify(payload)));
};

const showModal = (type) => {
  modalContent.innerHTML = hints[type] ?? "";
  modal.classList.remove("hidden");
};

const hideModal = () => {
  modal.classList.add("hidden");
};

const sanitizeName = (value) => value.trim() || "Playlist sem nome";

const parseM3U = (text, sourceName) => {
  const lines = text.split(/\r?\n/);
  const entries = [];
  let current = null;

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("#EXTINF")) {
      const nameMatch = trimmed.match(/,(.*)$/);
      const groupMatch = trimmed.match(/group-title="(.*?)"/i);
      const logoMatch = trimmed.match(/tvg-logo="(.*?)"/i);
      const idMatch = trimmed.match(/tvg-id="(.*?)"/i);
      const liveMatch = trimmed.match(/tvg-shift|catchup|timeshift/i);
      current = {
        id: `${sourceName}-${entries.length + 1}`,
        name: nameMatch ? nameMatch[1].trim() : "Canal sem nome",
        group: groupMatch ? groupMatch[1] : "Outros",
        logo: logoMatch ? logoMatch[1] : "",
        tvgId: idMatch ? idMatch[1] : "",
        isLive: Boolean(liveMatch),
      };
    } else if (trimmed && !trimmed.startsWith("#") && current) {
      current.url = trimmed;
      entries.push(current);
      current = null;
    }
  });

  return entries;
};

const buildPlaylistItem = (playlist) => {
  const item = document.createElement("div");
  item.className = "playlist-item";
  if (playlist.id === state.activePlaylistId) {
    item.classList.add("active");
  }
  const name = document.createElement("span");
  name.textContent = playlist.name;
  const button = document.createElement("button");
  button.className = "ghost";
  button.textContent = "Selecionar";
  button.addEventListener("click", () => {
    state.activePlaylistId = playlist.id;
    state.selectedCategory = "Todos";
    persistState();
    render();
  });
  item.append(name, button);
  return item;
};

const buildChip = (label) => {
  const chip = document.createElement("button");
  chip.className = "chip";
  if (label === state.selectedCategory) {
    chip.classList.add("active");
  }
  chip.textContent = label;
  chip.addEventListener("click", () => {
    state.selectedCategory = label;
    render();
  });
  return chip;
};

const addRecent = (channel) => {
  const existing = state.recents.find((item) => item.id === channel.id);
  if (existing) {
    state.recents = state.recents.filter((item) => item.id !== channel.id);
  }
  state.recents.unshift({ id: channel.id, name: channel.name, logo: channel.logo });
  state.recents = state.recents.slice(0, 8);
};

const getActivePlaylist = () =>
  state.playlists.find((playlist) => playlist.id === state.activePlaylistId);

const getFilteredChannels = () => {
  const playlist = getActivePlaylist();
  if (!playlist) return [];
  const query = searchInput.value.toLowerCase();
  return playlist.entries
    .filter((channel) =>
      state.selectedCategory === "Todos"
        ? true
        : channel.group === state.selectedCategory
    )
    .filter((channel) => (toggleFavorites.checked ? state.favorites[channel.id] : true))
    .filter((channel) => (toggleLive.checked ? channel.isLive : true))
    .filter((channel) =>
      query ? channel.name.toLowerCase().includes(query) : true
    );
};

const renderPlaylists = () => {
  playlistList.innerHTML = "";
  state.playlists.forEach((playlist) => {
    playlistList.append(buildPlaylistItem(playlist));
  });
};

const renderCategories = () => {
  categoryChips.innerHTML = "";
  const playlist = getActivePlaylist();
  if (!playlist) return;
  const categories = new Set(["Todos"]);
  playlist.entries.forEach((channel) => categories.add(channel.group || "Outros"));
  categories.forEach((category) => categoryChips.append(buildChip(category)));
};

const renderChannels = () => {
  const channels = getFilteredChannels();
  channelGrid.innerHTML = "";
  channelCount.textContent = `${channels.length} canais`;
  channels.forEach((channel) => {
    const card = document.createElement("div");
    card.className = "channel-card";
    if (state.currentChannel && state.currentChannel.id === channel.id) {
      card.classList.add("active");
    }
    const logo = document.createElement("img");
    logo.src =
      channel.logo ||
      "https://images.unsplash.com/photo-1520558043562-112b9d6df961?auto=format&fit=crop&w=80&q=60";
    logo.alt = channel.name;
    const info = document.createElement("div");
    info.className = "channel-info";
    const title = document.createElement("strong");
    title.textContent = channel.name;
    const meta = document.createElement("span");
    meta.textContent = `${channel.group || "Outros"} • ${
      channel.isLive ? "Ao vivo" : "Arquivo"
    }`;
    info.append(title, meta);
    card.append(logo, info);
    card.addEventListener("click", () => selectChannel(channel));
    channelGrid.append(card);
  });
};

const renderMiniList = (container, items, emptyText) => {
  container.innerHTML = "";
  if (items.length === 0) {
    const empty = document.createElement("span");
    empty.textContent = emptyText;
    empty.className = "muted";
    container.append(empty);
    return;
  }
  items.forEach((item) => {
    const row = document.createElement("div");
    row.className = "mini-item";
    const image = document.createElement("img");
    image.src = item.logo || "https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&w=60&q=60";
    image.alt = item.name;
    image.width = 32;
    image.height = 32;
    const label = document.createElement("span");
    label.textContent = item.name;
    row.append(image, label);
    row.addEventListener("click", () => {
      const playlist = getActivePlaylist();
      if (!playlist) return;
      const channel = playlist.entries.find((entry) => entry.id === item.id);
      if (channel) {
        selectChannel(channel);
      }
    });
    container.append(row);
  });
};

const renderFavorites = () => {
  const playlist = getActivePlaylist();
  const favorites = playlist
    ? playlist.entries.filter((channel) => state.favorites[channel.id])
    : [];
  renderMiniList(favoritesList, favorites, "Nenhum favorito ainda.");
};

const renderRecents = () => {
  renderMiniList(recentList, state.recents, "Nenhuma reprodução recente.");
};

const setStatus = (text, isError = false) => {
  playerStatus.textContent = text;
  playerStatus.style.color = isError ? "var(--danger)" : "var(--accent)";
};

const selectChannel = (channel) => {
  state.currentChannel = channel;
  addRecent(channel);
  nowPlaying.textContent = channel.name;
  nowMeta.textContent = `${channel.group || "Outros"} • ${
    channel.isLive ? "Ao vivo" : "Conteúdo sob demanda"
  }`;
  toggleFavoriteButton.textContent = state.favorites[channel.id]
    ? "★ Favorito"
    : "☆ Favoritar";
  setStatus("Carregando stream...");

  if (Hls.isSupported() && channel.url.includes(".m3u8")) {
    const hls = new Hls();
    hls.loadSource(channel.url);
    hls.attachMedia(player);
    hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
      qualitySelect.innerHTML = "";
      const autoOption = document.createElement("option");
      autoOption.value = "auto";
      autoOption.textContent = "Auto";
      qualitySelect.append(autoOption);
      data.levels.forEach((level, index) => {
        const option = document.createElement("option");
        option.value = index;
        option.textContent = `${level.height || "?"}p`;
        qualitySelect.append(option);
      });
      qualitySelect.onchange = () => {
        hls.currentLevel = qualitySelect.value === "auto" ? -1 : Number(qualitySelect.value);
      };
      player.play().catch(() => {
        setStatus("Clique para iniciar o vídeo.");
      });
    });
    hls.on(Hls.Events.ERROR, (_, data) => {
      if (data.fatal) {
        setStatus("Erro ao carregar o stream.", true);
      }
    });
  } else {
    player.src = channel.url;
    qualitySelect.innerHTML = "<option>Auto</option>";
    player.play().catch(() => {
      setStatus("Clique para iniciar o vídeo.");
    });
  }

  persistState();
  render();
};

const addPlaylist = (name, content) => {
  const playlistId = `${name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`;
  const entries = parseM3U(content, playlistId);
  if (entries.length === 0) {
    setStatus("Não foi possível ler a playlist.", true);
    return;
  }
  state.playlists.push({ id: playlistId, name, source: "m3u", entries });
  state.activePlaylistId = playlistId;
  state.selectedCategory = "Todos";
  persistState();
  render();
};

const handleUrlPlaylist = async () => {
  const url = playlistUrlInput.value.trim();
  if (!url) return;
  setStatus("Baixando playlist...");
  try {
    const response = await fetch(url);
    const content = await response.text();
    addPlaylist(sanitizeName(playlistNameInput.value || url.split("/").pop()), content);
    playlistUrlInput.value = "";
    playlistNameInput.value = "";
  } catch (error) {
    setStatus("Falha ao baixar a playlist.", true);
  }
};

const handleFilePlaylist = async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const content = await file.text();
  addPlaylist(sanitizeName(file.name.replace(/\.m3u8?$/, "")), content);
  event.target.value = "";
};

const handleCopyLink = async () => {
  if (!state.currentChannel) return;
  try {
    await navigator.clipboard.writeText(state.currentChannel.url);
    setStatus("Link copiado para a área de transferência.");
  } catch (error) {
    setStatus("Não foi possível copiar o link.", true);
  }
};

const handleFavoriteToggle = () => {
  if (!state.currentChannel) return;
  const channelId = state.currentChannel.id;
  state.favorites[channelId] = !state.favorites[channelId];
  toggleFavoriteButton.textContent = state.favorites[channelId]
    ? "★ Favorito"
    : "☆ Favoritar";
  persistState();
  renderFavorites();
};

const render = () => {
  renderPlaylists();
  renderCategories();
  renderChannels();
  renderFavorites();
  renderRecents();
  persistState();
};

addPlaylistButton.addEventListener("click", handleUrlPlaylist);
playlistFileInput.addEventListener("change", handleFilePlaylist);
searchInput.addEventListener("input", renderChannels);
toggleFavorites.addEventListener("change", renderChannels);
toggleLive.addEventListener("change", renderChannels);
copyLinkButton.addEventListener("click", handleCopyLink);
toggleFavoriteButton.addEventListener("click", handleFavoriteToggle);
openHelp.addEventListener("click", () => showModal("help"));
openSettings.addEventListener("click", () => showModal("settings"));
closeModalButton.addEventListener("click", hideModal);
modal.addEventListener("click", (event) => {
  if (event.target === modal) hideModal();
});

loadState();
render();

if (state.currentChannel) {
  const playlist = getActivePlaylist();
  const channel = playlist?.entries.find((entry) => entry.id === state.currentChannel.id);
  if (channel) {
    selectChannel(channel);
  }
}
