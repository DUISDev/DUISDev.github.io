/**
 * article-content.js — content внутри iframe: сообщает высоту родителю.
 */
(function () {
  'use strict';

  var MESSAGE_TYPE = 'duisdev-article-height';
  var REQUEST_TYPE = 'duisdev-article-request-height';

  function measureHeight() {
    var root = document.documentElement;
    var body = document.body;

    if (!root || !body) {
      return 0;
    }

    return Math.ceil(Math.max(
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
      height: measureHeight()
    }, '*');
  }

  function init() {
    reportHeight();

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
