/**
 * article.js — высота iframe: content-страница сообщает размер через postMessage.
 */
(function () {
  'use strict';

  var FRAME_SELECTOR = '.article-frame';
  var MESSAGE_TYPE = 'duisdev-article-height';
  var REQUEST_TYPE = 'duisdev-article-request-height';
  var frameByWindow = new Map();
  var messageBound = false;

  function applyFrameHeight(frame, height) {
    if (!(height > 0)) {
      return;
    }

    frame.style.height = Math.ceil(height) + 'px';
    frame.setAttribute('scrolling', 'no');
  }

  function onFrameMessage(event) {
    var frame = frameByWindow.get(event.source);

    if (!frame || !event.data || event.data.type !== MESSAGE_TYPE) {
      return;
    }

    applyFrameHeight(frame, Number(event.data.height));
  }

  function requestFrameHeight(frame) {
    if (!frame || !frame.contentWindow) {
      return;
    }

    try {
      frame.contentWindow.postMessage({ type: REQUEST_TYPE }, '*');
    } catch (e) {
      frame.setAttribute('scrolling', 'yes');
    }
  }

  function registerFrame(frame) {
    if (!frame || frame.dataset.articleFrameBound === 'true') {
      return;
    }

    frame.dataset.articleFrameBound = 'true';

    frame.addEventListener('load', function () {
      try {
        frameByWindow.set(frame.contentWindow, frame);
        requestFrameHeight(frame);
      } catch (e) {
        frame.setAttribute('scrolling', 'yes');
      }
    });
  }

  function bindMessageListener() {
    if (messageBound) {
      return;
    }

    window.addEventListener('message', onFrameMessage);
    messageBound = true;
  }

  function initArticleFrames(root) {
    bindMessageListener();
    (root || document).querySelectorAll(FRAME_SELECTOR).forEach(registerFrame);
  }

  window.DUISDevArticleFrames = {
    init: initArticleFrames,
    register: registerFrame,
    requestHeight: requestFrameHeight
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      initArticleFrames();
    });
  } else {
    initArticleFrames();
  }
})();
