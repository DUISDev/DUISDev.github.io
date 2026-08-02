/**
 * videos-data.js — общие утилиты каталога видео.
 */
(function (global) {
  'use strict';

  var MANIFEST_URL = 'manifest.json';
  var durationCache = Object.create(null);

  function formatDuration(seconds) {
    var total = Math.round(Number(seconds) || 0);
    if (total <= 0) {
      return '';
    }

    var hours = Math.floor(total / 3600);
    var minutes = Math.floor((total % 3600) / 60);
    var secs = total % 60;

    if (hours > 0) {
      return hours + ':' + String(minutes).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
    }

    return minutes + ':' + String(secs).padStart(2, '0');
  }

  function initials(name) {
    return String(name || '?')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(function (part) { return part.charAt(0).toUpperCase(); })
      .join('');
  }

  function indexById(items) {
    var map = Object.create(null);
    (items || []).forEach(function (item) {
      map[item.id] = item;
    });
    return map;
  }

  var TRANSLIT_MAP = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i',
    й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't',
    у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '',
    э: 'e', ю: 'yu', я: 'ya'
  };

  function transliterate(text) {
    return String(text || '').replace(/[А-Яа-яЁё]/g, function (char) {
      var mapped = TRANSLIT_MAP[char.toLowerCase()];
      if (!mapped) {
        return char;
      }
      return mapped;
    });
  }

  function slugify(text) {
    return transliterate(text)
      .toLowerCase()
      .replace(/@/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'item';
  }

  function normalizeHandle(handle) {
    return String(handle || '').trim().replace(/^@/, '').toLowerCase();
  }

  function uniqueId(base, used) {
    var id = base;
    var suffix = 2;

    while (used[id]) {
      id = base + '-' + suffix;
      suffix += 1;
    }

    used[id] = true;
    return id;
  }

  function normalizeKey(value) {
    return String(value || '').trim().toLowerCase();
  }

  function coverHueFromId(id) {
    var hash = 0;
    var source = String(id || '');

    for (var i = 0; i < source.length; i += 1) {
      hash = ((hash << 5) - hash) + source.charCodeAt(i);
      hash |= 0;
    }

    return Math.abs(hash) % 360;
  }

  function prepareAuthors(authors) {
    var used = Object.create(null);
    var byHandle = Object.create(null);

    (authors || []).forEach(function (author) {
      var baseId = author.id || slugify(normalizeHandle(author.handle) || author.name);
      author.id = uniqueId(baseId, used);

      if (author.handle) {
        byHandle[normalizeHandle(author.handle)] = author;
      }

      byHandle[author.id] = author;
      byHandle[normalizeKey(author.name)] = author;
    });

    return byHandle;
  }

  function resolveAuthorId(ref, authorsByHandle) {
    if (!ref) {
      return '';
    }

    var handleKey = normalizeHandle(ref);
    if (authorsByHandle[handleKey]) {
      return authorsByHandle[handleKey].id;
    }

    var slugKey = slugify(ref);
    if (authorsByHandle[slugKey]) {
      return authorsByHandle[slugKey].id;
    }

    var nameKey = normalizeKey(ref);
    if (authorsByHandle[nameKey]) {
      return authorsByHandle[nameKey].id;
    }

    return slugKey;
  }

  function prepareVideos(videos, authorsByHandle) {
    var used = Object.create(null);
    var byTitle = Object.create(null);

    (videos || []).forEach(function (video) {
      var baseId = video.id || slugify(video.title);
      video.id = uniqueId(baseId, used);
      byTitle[normalizeKey(video.title)] = video;
      byTitle[video.id] = video;

      var authorRef = video.author || video.authorHandle || video.authorId;
      video.authorId = resolveAuthorId(authorRef, authorsByHandle);
    });

    return byTitle;
  }

  function resolveVideoId(ref, videosByTitle) {
    if (!ref) {
      return '';
    }

    var titleKey = normalizeKey(ref);
    if (videosByTitle[titleKey]) {
      return videosByTitle[titleKey].id;
    }

    var slugKey = slugify(ref);
    if (videosByTitle[slugKey]) {
      return videosByTitle[slugKey].id;
    }

    return slugKey;
  }

  function preparePlaylists(playlists, authorsByHandle, videosByTitle) {
    var used = Object.create(null);
    var byTitle = Object.create(null);

    (playlists || []).forEach(function (playlist) {
      var baseId = playlist.id || slugify(playlist.title);
      playlist.id = uniqueId(baseId, used);
      byTitle[normalizeKey(playlist.title)] = playlist;
      byTitle[playlist.id] = playlist;

      var authorRef = playlist.author || playlist.authorHandle || playlist.authorId;
      playlist.authorId = resolveAuthorId(authorRef, authorsByHandle);

      var videoRefs = playlist.videoIds || playlist.videos || [];
      playlist.videoIds = videoRefs.map(function (ref) {
        return resolveVideoId(ref, videosByTitle);
      }).filter(Boolean);
    });

    return byTitle;
  }

  function resolvePlaylistId(ref, playlistsByTitle) {
    if (!ref) {
      return '';
    }

    var titleKey = normalizeKey(ref);
    if (playlistsByTitle[titleKey]) {
      return playlistsByTitle[titleKey].id;
    }

    var slugKey = slugify(ref);
    if (playlistsByTitle[slugKey]) {
      return playlistsByTitle[slugKey].id;
    }

    return slugKey;
  }

  function linkVideosToPlaylists(videos, playlistsByTitle) {
    (videos || []).forEach(function (video) {
      var playlistRefs = video.playlistIds || video.playlists || [];
      video.playlistIds = playlistRefs.map(function (ref) {
        return resolvePlaylistId(ref, playlistsByTitle);
      }).filter(Boolean);
    });
  }

  function prepareManifest(data) {
    data.authors = data.authors || [];
    data.playlists = data.playlists || [];
    data.videos = data.videos || [];

    var authorsByHandle = prepareAuthors(data.authors);
    var videosByTitle = prepareVideos(data.videos, authorsByHandle);
    var playlistsByTitle = preparePlaylists(data.playlists, authorsByHandle, videosByTitle);

    linkVideosToPlaylists(data.videos, playlistsByTitle);

    data.authorsById = indexById(data.authors);
    data.playlistsById = indexById(data.playlists);
    data.videosById = indexById(data.videos);
    return data;
  }

  function loadManifest() {
    return fetch(MANIFEST_URL, { cache: 'no-store' })
      .then(function (response) {
        if (!response.ok) {
          throw new Error('Не удалось загрузить manifest.json');
        }
        return response.json();
      })
      .then(prepareManifest);
  }

  function videoSourceUrl(video) {
    var source = video && video.source;
    if (!source || source.type !== 'file' || !source.url) {
      return '';
    }
    return source.url;
  }

  function probeVideoDuration(url) {
    if (!url) {
      return Promise.resolve(0);
    }

    if (durationCache[url]) {
      return Promise.resolve(durationCache[url]);
    }

    return new Promise(function (resolve) {
      var video = document.createElement('video');
      video.preload = 'metadata';

      function cleanup() {
        video.removeAttribute('src');
        video.load();
      }

      video.addEventListener('loadedmetadata', function () {
        durationCache[url] = video.duration || 0;
        cleanup();
        resolve(durationCache[url]);
      });

      video.addEventListener('error', function () {
        cleanup();
        resolve(0);
      });

      video.src = url;
    });
  }

  function applyDurationBadges(root, videos) {
    if (!root || !videos || !videos.length) {
      return;
    }

    videos.forEach(function (video) {
      var url = videoSourceUrl(video);
      if (!url) {
        return;
      }

      probeVideoDuration(url).then(function (duration) {
        if (!duration) {
          return;
        }

        root.querySelectorAll('[data-video-id="' + video.id + '"] .video-card__duration').forEach(function (badge) {
          badge.textContent = formatDuration(duration);
        });
      });
    });
  }

  function videoWatchUrl(videoId) {
    return 'watch.html?id=' + encodeURIComponent(videoId);
  }

  function authorUrl(authorId) {
    return 'index.html?author=' + encodeURIComponent(authorId);
  }

  function playlistUrl(playlistId) {
    return 'index.html?playlist=' + encodeURIComponent(playlistId);
  }

  function authorLabel(author) {
    return author.handle || author.name || 'Автор';
  }

  function formatVideoCount(count) {
    var total = Number(count) || 0;
    return total + ' видео';
  }

  function avatarStyle(author) {
    if (author.avatarUrl) {
      return '';
    }
    return ' style="background:' + escapeHtml(author.avatarColor || '#0055ff') + '"';
  }

  function renderAuthorAvatar(author, className) {
    var name = author.name || 'Автор';
    var classes = escapeHtml(className);

    if (author.avatarUrl) {
      return '<span class="' + classes + ' videos-avatar videos-avatar--image">' +
        '<img src="' + escapeHtml(author.avatarUrl) + '" alt="' + escapeHtml(name) + '" loading="lazy">' +
        '</span>';
    }

    return '<span class="' + classes + ' videos-avatar"' + avatarStyle(author) + '>' +
      initials(name) +
      '</span>';
  }

  function renderPlaylistCover(playlist) {
    if (playlist.coverUrl) {
      return '<div class="playlist-card__cover playlist-card__cover--image">' +
        '<img src="' + escapeHtml(playlist.coverUrl) + '" alt="" loading="lazy">' +
        '</div>';
    }

    return '<div class="playlist-card__cover" style="--cover-hue:' + coverHueFromId(playlist.id) + '"></div>';
  }

  function renderVideoCard(video, authorsById) {
    var author = authorsById[video.authorId] || { id: '', name: 'Автор', handle: '@author', avatarColor: '#0055ff' };
    var hue = video.thumbnailHue || 205;

    return '<article class="video-card" data-video-id="' + escapeHtml(video.id) + '">' +
      '<a class="video-card__thumb-link" href="' + videoWatchUrl(video.id) + '">' +
      '<div class="video-card__thumb" style="--thumb-hue:' + hue + '">' + initials(video.title) + '</div>' +
      '<span class="video-card__duration"></span>' +
      '</a>' +
      '<div class="video-card__body">' +
      renderAuthorAvatar(author, 'video-card__avatar') +
      '<div class="video-card__meta">' +
      '<h3 class="video-card__title"><a href="' + videoWatchUrl(video.id) + '">' + escapeHtml(video.title) + '</a></h3>' +
      '<p class="video-card__subtitle"><a href="' + authorUrl(author.id) + '">' + escapeHtml(authorLabel(author)) + '</a></p>' +
      '</div></div></article>';
  }

  function renderRelatedItem(video, authorsById) {
    var author = authorsById[video.authorId] || { handle: '@author' };
    var hue = video.thumbnailHue || 205;

    return '<a class="videos-related-item" href="' + videoWatchUrl(video.id) + '">' +
      '<div class="videos-related-item__thumb" style="--thumb-hue:' + hue + '">' + initials(video.title) + '</div>' +
      '<div>' +
      '<h3>' + escapeHtml(video.title) + '</h3>' +
      '<p>' + escapeHtml(authorLabel(author)) + '</p>' +
      '</div></a>';
  }

  function renderPlaylistCard(playlist, authorsById) {
    var author = authorsById[playlist.authorId] || { handle: '@author' };
    var count = (playlist.videoIds || []).length;

    return '<article class="playlist-card">' +
      '<div class="playlist-card__stack">' +
      '<span></span><span></span>' +
      renderPlaylistCover(playlist) +
      '</div>' +
      '<div class="playlist-card__body">' +
      '<h3><a href="' + playlistUrl(playlist.id) + '">' + escapeHtml(playlist.title) + '</a></h3>' +
      '<p>' + escapeHtml(playlist.description || '') + '</p>' +
      '<div class="playlist-card__meta">' + escapeHtml(authorLabel(author)) + ' · ' + formatVideoCount(count) + '</div>' +
      '</div></article>';
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  global.VideosData = {
    MANIFEST_URL: MANIFEST_URL,
    loadManifest: loadManifest,
    formatDuration: formatDuration,
    probeVideoDuration: probeVideoDuration,
    applyDurationBadges: applyDurationBadges,
    videoSourceUrl: videoSourceUrl,
    initials: initials,
    videoWatchUrl: videoWatchUrl,
    authorUrl: authorUrl,
    playlistUrl: playlistUrl,
    authorLabel: authorLabel,
    formatVideoCount: formatVideoCount,
    renderAuthorAvatar: renderAuthorAvatar,
    renderPlaylistCover: renderPlaylistCover,
    renderVideoCard: renderVideoCard,
    renderRelatedItem: renderRelatedItem,
    renderPlaylistCard: renderPlaylistCard,
    escapeHtml: escapeHtml
  };
})(typeof window !== 'undefined' ? window : globalThis);
