/**
 * post-iframe-content.js — высота iframe с заголовком и текстом поста.
 */
(function () {
  'use strict';

  var MESSAGE_TYPE = 'duisdev-blog-post-height';
  var REQUEST_TYPE = 'duisdev-blog-post-request-height';

  function measureHeight() {
    var root = document.documentElement;
    var body = document.body;
    var content = document.querySelector('.blog-post-iframe-content');

    if (!root || !body) {
      return 0;
    }

    var contentBottom = 0;
    if (content) {
      var rect = content.getBoundingClientRect();
      contentBottom = rect.bottom + window.scrollY;
    }

    return Math.ceil(Math.max(
      contentBottom,
      root.scrollHeight,
      body.scrollHeight,
      root.offsetHeight,
      body.offsetHeight
    ));
  }

  function reportHeight() {
    if (window.parent === window) {
      return;
    }

    window.parent.postMessage({
      type: MESSAGE_TYPE,
      height: measureHeight(),
      frameId: window.name || ''
    }, '*');
  }

  function scheduleReports() {
    reportHeight();
    [0, 50, 150, 350, 700, 1200].forEach(function (delay) {
      setTimeout(reportHeight, delay);
    });
  }

  function init() {
    scheduleReports();

    if (typeof ResizeObserver !== 'undefined') {
      var observer = new ResizeObserver(scheduleReports);
      observer.observe(document.documentElement);
      if (document.body) {
        observer.observe(document.body);
      }
      var content = document.querySelector('.blog-post-iframe-content');
      if (content) {
        observer.observe(content);
      }
    }

    window.addEventListener('resize', scheduleReports);
    window.addEventListener('load', scheduleReports);

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(scheduleReports);
    }

    window.addEventListener('message', function (event) {
      if (event.data && event.data.type === REQUEST_TYPE) {
        scheduleReports();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
