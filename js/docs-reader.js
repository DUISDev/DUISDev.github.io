/**
 * docs-reader.js — просмотр документации с боковым оглавлением.
 */
(function () {
  'use strict';

  var sidebarTitle = document.getElementById('docs-sidebar-title');
  var sidebarNav = document.getElementById('docs-sidebar-nav');
  var frame = document.getElementById('docs-frame');
  var emptyState = document.getElementById('docs-empty');

  var manifest = null;
  var activeDoc = null;
  var activePageId = null;

  function getQueryParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  function setActivePage(pageId) {
    activePageId = pageId;

    sidebarNav.querySelectorAll('.docs-nav__link').forEach(function (link) {
      var isActive = link.dataset.page === pageId;
      link.classList.toggle('is-active', isActive);
      link.setAttribute('aria-current', isActive ? 'page' : 'false');
    });
  }

  function openPage(page, updateHistory) {
    if (!page || !frame) {
      return;
    }

    setActivePage(page.id);
    frame.hidden = false;
    emptyState.hidden = true;
    frame.src = 'content/' + page.file;
    frame.title = page.title;

    if (updateHistory !== false) {
      var nextUrl = DocsData.readerUrl(activeDoc.id, page.id);
      if (window.location.href.indexOf(nextUrl) === -1) {
        window.history.replaceState(null, '', nextUrl);
      }
    }

    document.title = page.title + ' — ' + activeDoc.title + ' — Документация DUISDev';
  }

  function renderSidebar(doc) {
    sidebarTitle.textContent = doc.title;
    sidebarNav.innerHTML = (doc.sections || []).map(function (section) {
      var links = (section.pages || []).map(function (page) {
        return '<li><a class="docs-nav__link" href="' + DocsData.readerUrl(doc.id, page.id) + '" data-page="' +
          DocsData.escapeHtml(page.id) + '">' + DocsData.escapeHtml(page.title) + '</a></li>';
      }).join('');

      if (!links) {
        return '';
      }

      return '<section class="docs-nav__section">' +
        '<h3 class="docs-nav__section-title">' + DocsData.escapeHtml(section.title) + '</h3>' +
        '<ul class="docs-nav__list">' + links + '</ul>' +
        '</section>';
    }).join('');

    sidebarNav.querySelectorAll('.docs-nav__link').forEach(function (link) {
      link.addEventListener('click', function (event) {
        event.preventDefault();
        var page = DocsData.findPage(activeDoc, link.dataset.page);
        openPage(page);
      });
    });
  }

  function showEmpty(message) {
    sidebarTitle.textContent = 'Документация';
    sidebarNav.innerHTML = '';
    frame.hidden = true;
    emptyState.hidden = false;
    emptyState.textContent = message;
  }

  DocsData.loadManifest()
    .then(function (data) {
      manifest = data;

      var docId = getQueryParam('doc');
      var pageId = getQueryParam('page');
      var doc = manifest.docsById[docId];

      if (!doc) {
        showEmpty('Документация не найдена.');
        return;
      }

      activeDoc = doc;
      renderSidebar(doc);

      var page = pageId ? DocsData.findPage(doc, pageId) : DocsData.firstPage(doc);

      if (!page) {
        showEmpty('В этой документации пока нет страниц.');
        return;
      }

      openPage(page, false);

      if (window.DUISDevArticleFrames) {
        window.DUISDevArticleFrames.register(frame);
      }
    })
    .catch(function (error) {
      showEmpty(error.message);
    });
})();
