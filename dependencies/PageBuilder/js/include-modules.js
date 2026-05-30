/**
 * include-modules.js — подключение HTML-модулей из папки modules/.
 *
 * Аналог SSI/Jekyll {% include %}, но для чистого HTML на GitHub Pages:
 * один раз правите modules/menu.html — изменения на всех страницах.
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
 * В модулях используйте пути от корня сайта: index.html.
 */
(function () {
  'use strict';

  var MODULE_ATTR = 'data-duisdev-module';
  var MODULE_PATTERN = /^[a-z0-9-]+$/;

  /**
   * Базовый путь от текущей страницы до корня сайта.
   * @returns {string}
   */
  function getSiteRoot() {
    var root = document.documentElement.getAttribute('data-site-root');
    if (root == null || root === '' || root === '.' || root === './') {
      return '';
    }
    return root.endsWith('/') ? root : root + '/';
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
   * Загружает HTML-фрагмент модуля.
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
      return extractModuleFragment(html);
    });
  }

  function isStablePath(value) {
    return !value || /^(?:[a-z][a-z0-9+.-]*:|\/\/|#|\/|\.\.\/)/i.test(value);
  }

  function applyBasePath(element, basePath) {
    if (!basePath) {
      return;
    }

    ['href', 'src'].forEach(function (attr) {
      Array.prototype.forEach.call(element.querySelectorAll('[' + attr + ']'), function (node) {
        var value = node.getAttribute(attr);
        if (!isStablePath(value)) {
          node.setAttribute(attr, basePath + value);
        }
      });
    });
  }

  /**
   * Вставляет загруженный фрагмент в placeholder на странице.
   * @param {HTMLElement} element
   * @param {string} html
   * @param {string} name
   */
  function insertModule(element, html, name, siteRoot) {
    element.innerHTML = html;
    applyBasePath(element, siteRoot);
    element.removeAttribute(MODULE_ATTR);
    element.setAttribute('data-duisdev-loaded', name);
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
          insertModule(element, html, name, siteRoot);
        })
        .catch(function (error) {
          console.error('[DUISDev modules]', error.message);
          element.setAttribute('data-duisdev-error', 'true');
        });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initModules);
  } else {
    initModules();
  }
})();
