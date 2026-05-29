/**
 * post-iframe-resize.js — подстройка высоты .blog-post-text-frame на странице блога.
 */
(function () {
  'use strict';

  var MESSAGE_TYPE = 'duisdev-blog-post-height';
  var REQUEST_TYPE = 'duisdev-blog-post-request-height';
  var MIN_HEIGHT = 56;

  function resizeFrame(frame, height) {
    if (!frame) {
      return;
    }
    frame.style.height = Math.max(MIN_HEIGHT, Math.ceil(height)) + 'px';
  }

  function requestHeight(frame) {
    if (!frame || !frame.contentWindow) {
      return;
    }
    frame.contentWindow.postMessage({ type: REQUEST_TYPE }, '*');
  }

  function scheduleHeightRequests(frame) {
    if (!frame) {
      return;
    }
    requestHeight(frame);
    [0, 80, 200, 500, 1000].forEach(function (delay) {
      setTimeout(function () {
        requestHeight(frame);
      }, delay);
    });
  }

  function bindFrame(frame) {
    if (!frame || frame.dataset.postFrameBound === '1') {
      return;
    }
    frame.dataset.postFrameBound = '1';

    frame.addEventListener('load', function () {
      scheduleHeightRequests(frame);
    });

    if (frame.contentDocument && frame.contentDocument.readyState === 'complete') {
      scheduleHeightRequests(frame);
    }
  }

  function findFrameBySource(source) {
    var frames = document.querySelectorAll('iframe.blog-post-text-frame');
    for (var i = 0; i < frames.length; i++) {
      if (frames[i].contentWindow === source) {
        return frames[i];
      }
    }
    return null;
  }

  window.addEventListener('message', function (event) {
    if (!event.data || event.data.type !== MESSAGE_TYPE) {
      return;
    }

    var height = Number(event.data.height);
    if (!height || height < 1) {
      return;
    }

    var frame = null;
    if (event.data.frameId) {
      frame = document.querySelector('iframe.blog-post-text-frame[name="' + event.data.frameId + '"]');
      if (frame && frame.contentWindow !== event.source) {
        frame = null;
      }
    }
    if (!frame) {
      frame = findFrameBySource(event.source);
    }
    if (frame) {
      resizeFrame(frame, height);
    }
  });

  function init() {
    document.querySelectorAll('iframe.blog-post-text-frame').forEach(bindFrame);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.addEventListener('load', init);
})();
