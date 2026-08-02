/**
 * iframe-resize.js — универсальная подстройка высоты iframe под содержимое (Page Builder).
 *
 * Подключение на родительской странице:
 *   <script src="dependencies/PageBuilder/js/iframe-resize.js" defer></script>
 *
 * Разметка iframe:
 *   <iframe src="..." class="pb-auto-height" scrolling="no"></iframe>
 *
 * Селектор по умолчанию: .pb-auto-height, .module-frame
 */
(function () {
  'use strict';

  var FRAME_SELECTOR = '.pb-auto-height, .module-frame';

  /**
   * Возвращает фактическую высоту документа внутри iframe.
   * @param {Document} doc
   * @returns {number}
   */
  function measureDocumentHeight(doc) {
    var root = doc.documentElement;
    var body = doc.body;
    if (!root || !body) {
      return 0;
    }

    var bodyRect = body.getBoundingClientRect();
    var rootRect = root.getBoundingClientRect();

    return Math.ceil(Math.max(
      body.scrollHeight,
      root.scrollHeight,
      body.offsetHeight,
      root.offsetHeight,
      bodyRect.bottom - bodyRect.top,
      rootRect.bottom - rootRect.top
    ));
  }

  /**
   * Подстраивает высоту одного iframe под его содержимое.
   * @param {HTMLIFrameElement} frame
   */
  function resizeFrame(frame) {
    try {
      var doc = frame.contentDocument || frame.contentWindow.document;
      if (!doc) {
        return;
      }

      var height = measureDocumentHeight(doc);
      if (height > 0) {
        frame.style.height = height + 'px';
      }
    } catch (e) {
      /* file:// или cross-origin — min-height из CSS остаётся запасным */
    }
  }

  /**
   * Наблюдает за изменениями размеров содержимого iframe.
   * @param {HTMLIFrameElement} frame
   */
  function observeFrameContent(frame) {
    try {
      var doc = frame.contentDocument || frame.contentWindow.document;
      if (!doc || !doc.body) {
        return;
      }

      if (typeof ResizeObserver !== 'undefined') {
        var observer = new ResizeObserver(function () {
          resizeFrame(frame);
        });
        observer.observe(doc.body);
        observer.observe(doc.documentElement);
      }

      doc.querySelectorAll('img').forEach(function (img) {
        if (!img.complete) {
          img.addEventListener('load', function () {
            resizeFrame(frame);
          }, { once: true });
        }
      });
    } catch (e) {
      /* недоступно вне same-origin */
    }
  }

  /**
   * Инициализирует авто-подстройку для всех iframe по селектору FRAME_SELECTOR.
   */
  function initAutoHeightFrames() {
    document.querySelectorAll(FRAME_SELECTOR).forEach(function (frame) {
      function scheduleResize() {
        requestAnimationFrame(function () {
          resizeFrame(frame);
          requestAnimationFrame(function () {
            resizeFrame(frame);
          });
        });
      }

      frame.addEventListener('load', function () {
        scheduleResize();
        observeFrameContent(frame);
      });

      window.addEventListener('resize', scheduleResize);

      if (frame.contentDocument && frame.contentDocument.readyState === 'complete') {
        scheduleResize();
        observeFrameContent(frame);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAutoHeightFrames);
  } else {
    initAutoHeightFrames();
  }
})();
