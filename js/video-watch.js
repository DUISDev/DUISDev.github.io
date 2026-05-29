/**
 * video-watch.js — страница просмотра видео.
 */
(function () {
  'use strict';

  var playerRoot = document.getElementById('videos-player');
  var titleEl = document.getElementById('videos-watch-title');
  var authorBlock = document.getElementById('videos-watch-author');
  var descriptionEl = document.getElementById('videos-watch-description');
  var relatedRoot = document.getElementById('videos-related-list');

  function getVideoId() {
    return new URLSearchParams(window.location.search).get('id');
  }

  function renderPlayer(video) {
    var source = video.source || {};

    if (source.type === 'file' && source.url) {
      playerRoot.innerHTML = '<video controls preload="metadata" playsinline id="videos-watch-video">' +
        '<source src="' + VideosData.escapeHtml(source.url) + '" type="video/mp4">' +
        'Ваш браузер не поддерживает видео.</video>';

      var videoEl = document.getElementById('videos-watch-video');
      if (videoEl) {
        videoEl.addEventListener('loadedmetadata', function () {
          if (!videoEl.duration) {
            return;
          }
          document.querySelectorAll('[data-watch-duration]').forEach(function (node) {
            node.textContent = VideosData.formatDuration(videoEl.duration);
          });
        });
      }
      return;
    }

    if (source.type === 'embed' && source.url) {
      playerRoot.innerHTML = '<iframe src="' + VideosData.escapeHtml(source.url) + '" title="' + VideosData.escapeHtml(video.title) + '" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>';
      return;
    }

    var externalUrl = source.url || '#';
    playerRoot.innerHTML = '<div class="videos-player__placeholder">' +
      '<strong>' + VideosData.escapeHtml(video.title) + '</strong>' +
      '<p>Видео размещено на внешней площадке. Откройте просмотр по кнопке ниже.</p>' +
      '<a class="videos-player__external" href="' + VideosData.escapeHtml(externalUrl) + '" target="_blank" rel="noopener noreferrer">Смотреть на площадке</a>' +
      '</div>';
  }

  function renderAuthor(author) {
    authorBlock.innerHTML = '<a class="videos-watch-author" href="' + VideosData.authorUrl(author.id) + '">' +
      VideosData.renderAuthorAvatar(author, 'videos-watch-author__avatar') +
      '<span class="videos-watch-author__handle">' + VideosData.escapeHtml(author.handle || '@channel') + '</span>' +
      '</a>';
  }

  function relatedVideos(currentVideo, manifest) {
    var samePlaylist = [];
    (currentVideo.playlistIds || []).forEach(function (playlistId) {
      var playlist = manifest.playlistsById[playlistId];
      if (!playlist) {
        return;
      }
      (playlist.videoIds || []).forEach(function (videoId) {
        if (videoId !== currentVideo.id) {
          samePlaylist.push(manifest.videosById[videoId]);
        }
      });
    });

    var merged = samePlaylist.concat(
      manifest.videos.filter(function (video) {
        return video.authorId === currentVideo.authorId && video.id !== currentVideo.id;
      })
    );

    var unique = [];
    var seen = Object.create(null);
    merged.forEach(function (video) {
      if (!video || seen[video.id]) {
        return;
      }
      seen[video.id] = true;
      unique.push(video);
    });

    return unique.slice(0, 8);
  }

  VideosData.loadManifest()
    .then(function (manifest) {
      var videoId = getVideoId();
      var video = manifest.videosById[videoId];

      if (!video) {
        titleEl.textContent = 'Видео не найдено';
        descriptionEl.innerHTML = '<p>Такого ролика нет в каталоге. <a href="index.html">Вернуться на главную видеоплатформы</a>.</p>';
        relatedRoot.innerHTML = '';
        playerRoot.innerHTML = '<div class="videos-player__placeholder"><p>Выберите другое видео из каталога.</p></div>';
        return;
      }

      document.title = video.title + ' — Видеоплатформа DUISDev';
      titleEl.textContent = video.title;
      renderPlayer(video);
      renderAuthor(manifest.authorsById[video.authorId] || { id: '', name: 'Автор', handle: '@channel', avatarColor: '#0055ff' });
      descriptionEl.innerHTML = '<p>' + VideosData.escapeHtml(video.description || '') + '</p>';

      var related = relatedVideos(video, manifest);
      relatedRoot.innerHTML = related.length
        ? related.map(function (item) {
          return VideosData.renderRelatedItem(item, manifest.authorsById);
        }).join('')
        : '<p class="videos-empty">Пока нет похожих видео.</p>';
    })
    .catch(function (error) {
      titleEl.textContent = 'Ошибка загрузки';
      descriptionEl.innerHTML = '<p>' + VideosData.escapeHtml(error.message) + '</p>';
    });
})();
