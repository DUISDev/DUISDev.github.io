/**
 * docs-hub.js — каталог документаций (docs/index.html).
 */
(function () {
  'use strict';

  var grid = document.getElementById('docs-grid');
  var hint = document.getElementById('docs-hint');

  function formatPageCount(count) {
    var mod10 = count % 10;
    var mod100 = count % 100;

    if (mod10 === 1 && mod100 !== 11) {
      return count + ' страница';
    }

    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
      return count + ' страницы';
    }

    return count + ' страниц';
  }

  function renderDocCard(doc) {
    return '<article class="docs-card" style="--docs-accent-hue:' + doc.accentHue + '">' +
      '<div class="docs-card__icon" aria-hidden="true">' +
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="34" height="34" fill="currentColor">' +
      '<path d="M6 2h9l5 5v15a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zm8 1.5V8h4.5L14 3.5zM8 11h8v2H8v-2zm0 4h8v2H8v-2z"/>' +
      '</svg></div>' +
      '<h2 class="docs-card__title">' + DocsData.escapeHtml(doc.title) + '</h2>' +
      '<p class="docs-card__description">' + DocsData.escapeHtml(doc.description || '') + '</p>' +
      '<p class="docs-card__meta">' + formatPageCount(doc.pageCount) + '</p>' +
      '<a class="docs-card__btn" href="' + DocsData.readerUrl(doc.id) + '">Открыть</a>' +
      '</article>';
  }

  DocsData.loadManifest()
    .then(function (data) {
      if (!data.docs.length) {
        hint.textContent = 'Документации пока нет.';
        return;
      }

      hint.hidden = true;
      grid.hidden = false;
      grid.innerHTML = data.docs.map(renderDocCard).join('');
    })
    .catch(function (error) {
      hint.textContent = error.message;
    });
})();
