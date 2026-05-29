/**
 * include-modules.js — include HTML-modules из directory modules/.
 *
 * Analog SSI/Jekyll {% include %}, but for default HTML на GitHub Pages:
 * one раз edit modules/menu.html — changes на all pages.
 *
 * Разметка страницы (корень сайта):
 *   <html lang="ru" data-site-root="">
 *   <header class="site-header">
 *     <div data-duisdev-module="logo"></div>
 *     <div data-duisdev-module="menu"></div>
 *   </header>
 *   <footer id="footer" data-duisdev-module="footer"></footer>
 *   <script src="js/include-modules.js" defer></script>
 *
 * Страница в подпапке (например, _articles/page.html):
 *   data-site-root="../"
 *   script src="../js/include-modules.js"
 *
 * In modules use {{ROOT}} for paths to resources (home: {{ROOT}} or {{ROOT}}#section).
 */
(function () {
  'use strict';

  var MODULE_ATTR = 'data-duisdev-module';
  var MODULE_PATTERN = /^[a-z0-9-]+$/;

  /** Вычисляет {{ROOT}} по URL, если data-site-root не задан на странице. */
  function detectSiteRootFromPath() {
    var segments = (window.location.pathname || '/').split('/').filter(function (segment) {
      return segment;
    });

    if (segments.length && /\.html$/i.test(segments[segments.length - 1])) {
      segments.pop();
    }

    if (!segments.length) {
      return '';
    }

    return new Array(segments.length + 1).join('../');
  }

  /**
   * Base путь of текущей page to корня site.
   * @returns {string}
   */
  function getSiteRoot() {
    var html = document.documentElement;

    if (html.hasAttribute('data-site-root')) {
      var root = html.getAttribute('data-site-root');
      if (root == null || root === '' || root === '.' || root === './') {
        return '';
      }
      return root.endsWith('/') ? root : root + '/';
    }

    return detectSiteRootFromPath();
  }

  /**
   * Извлекает фрагмент между маркерами предпросмотра модуля.
   * @param {string} html
   * @returns {string}
   */
  function extractModuleFragment(html) {
    var startMarker = '<!-- duisdev-module:start -->';
    var endMarker = '<!-- duisdev-module:end -->';
    var start = html.indexOf(startMarker);
    var end = html.indexOf(endMarker);

    if (start !== -1 && end !== -1 && end > start) {
      return html.slice(start + startMarker.length, end).trim();
    }

    return html;
  }

  /**
   * Give base путь вместо {{ROOT}} in HTML-фрагменте.
   * @param {string} html
   * @param {string} siteRoot
   * @returns {string}
   */
  function applySiteRoot(html, siteRoot) {
    return html.split('{{ROOT}}').join(siteRoot);
  }

  /**
   * Load HTML-фрагмент of module.
   * @param {string} name
   * @param {string} siteRoot
   * @returns {Promise<string>}
   */
  function loadModule(name, siteRoot) {
    if (!MODULE_PATTERN.test(name)) {
      return Promise.reject(new Error('Недопустимое имя модуля: ' + name));
    }

    var url = siteRoot + 'modules/' + name + '.html';

    return fetch(url, { credentials: 'same-origin' }).then(function (response) {
      if (!response.ok) {
        throw new Error('Не удалось загрузить модуль "' + name + '": ' + response.status);
      }
      return response.text();
    }).then(function (html) {
      return applySiteRoot(extractModuleFragment(html), siteRoot);
    });
  }

  /**
   * Paste загруженный фрагмент в placeholder на page.
   * @param {HTMLElement} element
   * @param {string} html
   * @param {string} name
   */
  function insertModule(element, html, name) {
    element.innerHTML = html;
    element.removeAttribute(MODULE_ATTR);
    element.setAttribute('data-duisdev-loaded', name);
    updateSiteHeaderStickyOffset();
  }

  function updateSiteHeaderStickyOffset() {
    var header = document.querySelector('.site-header');
    if (!header) {
      return;
    }

    document.documentElement.style.setProperty(
      '--site-header-sticky-offset',
      Math.ceil(header.getBoundingClientRect().height) + 'px'
    );
  }

  function watchSiteHeaderHeight() {
    var header = document.querySelector('.site-header');
    if (!header) {
      return;
    }

    updateSiteHeaderStickyOffset();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateSiteHeaderStickyOffset);
      return;
    }

    var observer = new ResizeObserver(updateSiteHeaderStickyOffset);
    observer.observe(header);
  }

  function initModules() {
    var siteRoot = getSiteRoot();
    var placeholders = Array.prototype.slice.call(
      document.querySelectorAll('[' + MODULE_ATTR + ']')
    );

    if (!placeholders.length) {
      return;
    }

    placeholders.forEach(function (element) {
      var name = element.getAttribute(MODULE_ATTR);
      if (!name) {
        return;
      }

      loadModule(name, siteRoot)
        .then(function (html) {
          insertModule(element, html, name);
        })
        .catch(function (error) {
          console.error('[DUISDev modules]', error.message);
          element.setAttribute('data-duisdev-error', 'true');
        });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      watchSiteHeaderHeight();
      initModules();
    });
  } else {
    watchSiteHeaderHeight();
    initModules();
  }
})();
