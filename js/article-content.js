/**
 * article-content.js — content внутри iframe: сообщает высоту родителю.
 */
(function () {
  'use strict';

  var MESSAGE_TYPE = 'duisdev-article-height';
  var REQUEST_TYPE = 'duisdev-article-request-height';
  var SCROLL_TYPE = 'duisdev-article-scroll';

  function measureHeight() {
    var body = document.body;
    var content = document.querySelector('.article-content') || body;

    if (!body || !content) {
      return 0;
    }

    var contentRect = content.getBoundingClientRect();
    return Math.ceil(contentRect.bottom + window.pageYOffset);
  }

  function reportHeight() {
    if (window.parent === window) {
      return;
    }

    window.parent.postMessage({
      type: MESSAGE_TYPE,
      height: measureHeight()
    }, '*');
  }

  function getTargetTop(target) {
    var rect = target.getBoundingClientRect();
    return Math.max(0, Math.round(rect.top + window.pageYOffset));
  }

  function decodeHash(hash) {
    var value = String(hash || '').replace(/^#/, '');

    try {
      return decodeURIComponent(value);
    } catch (e) {
      return value;
    }
  }

  function scrollToHash(hash) {
    var id = decodeHash(hash);
    var target = id ? document.getElementById(id) : null;

    if (!target) {
      return false;
    }

    reportHeight();
    window.scrollTo({
      top: getTargetTop(target),
      behavior: 'smooth'
    });
    window.parent.postMessage({
      type: SCROLL_TYPE,
      top: getTargetTop(target)
    }, '*');
    return true;
  }

  function currentHashTargetExists() {
    var id = decodeHash(window.location.hash);
    return !!(id && document.getElementById(id));
  }

  function findAnchorLink(target) {
    while (target && target !== document) {
      if (target.tagName && target.tagName.toLowerCase() === 'a') {
        return target;
      }

      target = target.parentNode;
    }

    return null;
  }

  function slugify(text) {
    return String(text || '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9\u0400-\u04ff-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  function ensureHeadingAnchors() {
    var used = {};

    document.querySelectorAll('[id]').forEach(function (element) {
      used[element.id] = true;
    });

    document.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(function (heading) {
      var baseId;
      var nextId;
      var suffix = 2;

      if (heading.id) {
        return;
      }

      baseId = slugify(heading.textContent);
      if (!baseId) {
        return;
      }

      nextId = baseId;
      while (used[nextId]) {
        nextId = baseId + '-' + suffix;
        suffix += 1;
      }

      heading.id = nextId;
      used[nextId] = true;
    });
  }

  function bindAnchorLinks() {
    document.addEventListener('click', function (event) {
      var link = findAnchorLink(event.target);
      var href = link ? link.getAttribute('href') : '';

      if (!href || href.charAt(0) !== '#') {
        return;
      }

      event.preventDefault();
      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, '', href);
      }
      scrollToHash(href);
    });

    window.addEventListener('hashchange', function () {
      if (document.hasFocus() && currentHashTargetExists()) {
        scrollToHash(window.location.hash);
      }
    });
  }

  function ensureContentStyles() {
    var href = '../../css/article-content.css';
    var hasStyles = Array.prototype.some.call(document.styleSheets, function (sheet) {
      return sheet.href && sheet.href.indexOf('/css/article-content.css') !== -1;
    });

    if (hasStyles || document.querySelector('link[href="' + href + '"]')) {
      return;
    }

    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  }

  function normalizeStandaloneArticle() {
    if (document.querySelector('.article-content') || !document.body) {
      return;
    }

    document.body.classList.add('duisdev-normalized-article');
  }

  function init() {
    ensureContentStyles();
    normalizeStandaloneArticle();
    ensureHeadingAnchors();
    reportHeight();
    bindAnchorLinks();

    if (typeof ResizeObserver !== 'undefined') {
      var observer = new ResizeObserver(reportHeight);
      observer.observe(document.documentElement);
      observer.observe(document.body);
    }

    window.addEventListener('resize', reportHeight);
    window.addEventListener('load', reportHeight);

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(reportHeight);
    }

    window.addEventListener('message', function (event) {
      if (event.data && event.data.type === REQUEST_TYPE) {
        reportHeight();
      }
    });

  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
