/**
 * videos-page.js — каталог видеоплатформы.
 */
(function () {
  'use strict';

  var homePanel = document.getElementById('videos-home-panel');
  var homeDefault = document.getElementById('videos-home-default');
  var channelView = document.getElementById('videos-channel-view');
  var channelHeader = document.getElementById('videos-channel-header');
  var channelTabs = document.getElementById('videos-channel-tabs');
  var channelAllGrid = document.getElementById('videos-channel-all-grid');
  var channelPlaylistsRoot = document.getElementById('videos-channel-playlists-root');
  var playlistsPanel = document.getElementById('videos-playlists-panel');
  var authorsPanel = document.getElementById('videos-authors-panel');
  var homeGrid = document.getElementById('videos-home-grid');
  var playlistsRoot = document.getElementById('videos-playlists-root');
  var authorsRoot = document.getElementById('videos-authors-root');
  var panelTitle = document.getElementById('videos-panel-title');
  var panelDescription = document.getElementById('videos-panel-description');
  var sidebarAuthors = document.getElementById('videos-sidebar-authors');
  var navButtons = document.querySelectorAll('[data-videos-view]');
  var channelTabButtons = document.querySelectorAll('[data-channel-tab]');

  var manifest = null;
  var activeAuthor = null;

  function getQueryParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  function setActiveView(view) {
    navButtons.forEach(function (button) {
      button.classList.toggle('is-active', button.getAttribute('data-videos-view') === view);
    });

    homePanel.hidden = view !== 'home';
    playlistsPanel.hidden = view !== 'playlists';
    authorsPanel.hidden = view !== 'authors';
  }

  function showHomeDefault() {
    homeDefault.hidden = false;
    channelView.hidden = true;
    activeAuthor = null;
  }

  function showChannelView(author) {
    activeAuthor = author;
    homeDefault.hidden = true;
    channelView.hidden = false;
    renderChannelHeader(author);
    setChannelTab('all');
    renderChannelAll(author.id);
    renderChannelPlaylists(author.id);
  }

  function renderChannelHeader(author) {
    channelHeader.innerHTML =
      VideosData.renderAuthorAvatar(author, 'videos-channel-header__avatar') +
      '<div class="videos-channel-header__info">' +
      '<h2>' + VideosData.escapeHtml(author.name) + '</h2>' +
      '<p class="videos-channel-header__handle">' + VideosData.escapeHtml(author.handle || '') + '</p>' +
      '<p class="videos-channel-header__description videos-text-description">' + VideosData.escapeHtml(author.description || '') + '</p>' +
      '</div>';
  }

  function setChannelTab(tab) {
    channelTabButtons.forEach(function (button) {
      var isActive = button.getAttribute('data-channel-tab') === tab;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    var showAll = tab === 'all';
    channelAllGrid.hidden = !showAll;
    channelPlaylistsRoot.hidden = showAll;
  }

  function renderSidebarAuthors(data) {
    sidebarAuthors.innerHTML = data.authors.map(function (author) {
      return '<li><a href="' + VideosData.authorUrl(author.id) + '">' + VideosData.escapeHtml(author.name) + '</a></li>';
    }).join('');
  }

  function renderVideoGrid(container, videos) {
    if (!videos.length) {
      container.innerHTML = '<p class="videos-empty">Пока нет видео.</p>';
      return;
    }

    container.innerHTML = videos.map(function (video) {
      return VideosData.renderVideoCard(video, manifest.authorsById);
    }).join('');

    VideosData.applyDurationBadges(container, videos);
  }

  function renderHome(videos, title, description) {
    panelTitle.textContent = title;
    panelDescription.textContent = description || '';
    renderVideoGrid(homeGrid, videos);
  }

  function renderChannelAll(authorId) {
    renderVideoGrid(channelAllGrid, videosForAuthor(authorId));
  }

  function renderChannelPlaylists(authorId) {
    var playlists = playlistsForAuthor(authorId);

    if (!playlists.length) {
      channelPlaylistsRoot.innerHTML = '<p class="videos-empty">У канала пока нет плейлистов.</p>';
      return;
    }

    channelPlaylistsRoot.innerHTML = playlists.map(function (playlist) {
      return VideosData.renderPlaylistCard(playlist, manifest.authorsById);
    }).join('');
  }

  function renderPlaylists() {
    if (!manifest.playlists.length) {
      playlistsRoot.innerHTML = '<p class="videos-empty">Плейлистов пока нет.</p>';
      return;
    }

    playlistsRoot.innerHTML = manifest.playlists.map(function (playlist) {
      return VideosData.renderPlaylistCard(playlist, manifest.authorsById);
    }).join('');
  }

  function renderAuthorsList() {
    authorsRoot.innerHTML = manifest.authors.map(function (author) {
      var links = Object.keys(author.links || {}).map(function (key) {
        return '<a href="' + author.links[key] + '" target="_blank" rel="noopener noreferrer">' + key.toUpperCase() + '</a>';
      }).join('');

      return '<article class="videos-author-card">' +
        VideosData.renderAuthorAvatar(author, 'videos-author-card__avatar') +
        '<div class="videos-author-card__info">' +
        '<h3><a href="' + VideosData.authorUrl(author.id) + '">' + VideosData.escapeHtml(author.name) + '</a></h3>' +
        '<p class="videos-author-card__handle">' + VideosData.escapeHtml(author.handle || '') + '</p>' +
        '<p class="videos-text-description">' + VideosData.escapeHtml(author.description || '') + '</p>' +
        (links ? '<div class="videos-author-card__links">' + links + '</div>' : '') +
        '</div></article>';
    }).join('');
  }

  function videosForPlaylist(playlistId) {
    var playlist = manifest.playlistsById[playlistId];
    if (!playlist) {
      return [];
    }
    return (playlist.videoIds || []).map(function (videoId) {
      return manifest.videosById[videoId];
    }).filter(Boolean);
  }

  function videosForAuthor(authorId) {
    return manifest.videos.filter(function (video) {
      return video.authorId === authorId;
    });
  }

  function playlistsForAuthor(authorId) {
    return manifest.playlists.filter(function (playlist) {
      return playlist.authorId === authorId;
    });
  }

  function applyRoute() {
    var playlistId = getQueryParam('playlist');
    var authorId = getQueryParam('author');

    if (authorId) {
      var author = manifest.authorsById[authorId];
      if (author) {
        setActiveView('home');
        showChannelView(author);
        return;
      }
    }

    showHomeDefault();

    if (playlistId) {
      var playlist = manifest.playlistsById[playlistId];
      if (playlist) {
        setActiveView('home');
        renderHome(
          videosForPlaylist(playlistId),
          playlist.title,
          playlist.description
        );
        return;
      }
    }

    setActiveView('home');
    renderHome(manifest.videos, 'Главная', 'Видео, уроки и записи DUISDev.');
  }

  function bindNavigation() {
    navButtons.forEach(function (button) {
      button.addEventListener('click', function () {
        var view = button.getAttribute('data-videos-view');
        if (view === 'home') {
          window.location.href = 'index.html';
          return;
        }
        setActiveView(view);
        if (view === 'playlists') {
          renderPlaylists();
        }
        if (view === 'authors') {
          renderAuthorsList();
        }
      });
    });

    channelTabButtons.forEach(function (button) {
      button.addEventListener('click', function () {
        setChannelTab(button.getAttribute('data-channel-tab'));
      });
    });
  }

  VideosData.loadManifest()
    .then(function (data) {
      manifest = data;
      renderSidebarAuthors(data);
      renderPlaylists();
      renderAuthorsList();
      bindNavigation();
      applyRoute();
    })
    .catch(function (error) {
      homeGrid.innerHTML = '<p class="videos-empty">' + VideosData.escapeHtml(error.message) + '</p>';
    });
})();
