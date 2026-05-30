/**
 * article.js — высота iframe: content-страница сообщает размер через postMessage.
 */
(function () {
  'use strict';

  var FRAME_SELECTOR = '.article-frame';
  var MESSAGE_TYPE = 'duisdev-article-height';
  var REQUEST_TYPE = 'duisdev-article-request-height';
  var SCROLL_TYPE = 'duisdev-article-scroll';
  var HEIGHT_PADDING = 8;
  var frameByWindow = new Map();
  var messageBound = false;

  function forgetFrameWindow(frame) {
    if (frame._duisdevArticleWindow) {
      frameByWindow.delete(frame._duisdevArticleWindow);
      frame._duisdevArticleWindow = null;
    }
  }

  function rememberFrameWindow(frame) {
    forgetFrameWindow(frame);
    frame._duisdevArticleWindow = frame.contentWindow;
    frameByWindow.set(frame._duisdevArticleWindow, frame);
  }

  function applyFrameHeight(frame, height) {
    if (frame.dataset.articleFrameMode === 'fixed') {
      frame.setAttribute('scrolling', 'yes');
      return;
    }

    if (!(height > 0)) {
      return;
    }

    var nextHeight = Math.ceil(height + HEIGHT_PADDING);
    if (Math.abs(frame.offsetHeight - nextHeight) > 1) {
      frame.style.height = nextHeight + 'px';
    }
    frame.setAttribute('scrolling', 'no');
  }

  function onFrameMessage(event) {
    var frame = frameByWindow.get(event.source);

    if (!frame || !event.data) {
      return;
    }

    if (event.data.type === MESSAGE_TYPE) {
      applyFrameHeight(frame, Number(event.data.height));
      return;
    }

    if (event.data.type === SCROLL_TYPE) {
      if (frame.dataset.articleFrameMode === 'fixed') {
        try {
          frame.contentWindow.scrollTo({
            top: Number(event.data.top || 0),
            behavior: 'smooth'
          });
        } catch (e) {
          frame.setAttribute('scrolling', 'yes');
        }
        return;
      }

      window.scrollTo({
        top: frame.getBoundingClientRect().top + window.pageYOffset + Number(event.data.top || 0),
        behavior: 'smooth'
      });
    }
  }

  function requestFrameHeight(frame) {
    if (!frame || !frame.contentWindow) {
      return;
    }

    if (frame.dataset.articleFrameMode === 'fixed') {
      frame.setAttribute('scrolling', 'yes');
      return;
    }

    try {
      frame.contentWindow.postMessage({ type: REQUEST_TYPE }, '*');
    } catch (e) {
      frame.setAttribute('scrolling', 'yes');
    }
  }

  function getStickyOffset() {
    var value = getComputedStyle(document.documentElement)
      .getPropertyValue('--site-header-sticky-offset');
    return parseInt(value, 10) || 0;
  }

  function scrollFixedFrameIntoView(frame) {
    var rect = frame.getBoundingClientRect();
    var stickyOffset = getStickyOffset();
    var topLimit = stickyOffset + 12;
    var bottomLimit = window.innerHeight - 12;

    if (rect.top < topLimit || rect.bottom > bottomLimit) {
      window.scrollTo({
        top: window.pageYOffset + rect.top - topLimit,
        behavior: 'smooth'
      });
    }
  }

  function bindFixedFrameAutoScroll(frame) {
    if (frame.dataset.articleFrameMode !== 'fixed') {
      return;
    }

    frame.addEventListener('mouseenter', function () {
      scrollFixedFrameIntoView(frame);
    });

    frame.addEventListener('focus', function () {
      scrollFixedFrameIntoView(frame);
    });

    frame.addEventListener('touchstart', function () {
      scrollFixedFrameIntoView(frame);
    }, { passive: true });
  }

  function registerFrame(frame) {
    if (!frame || frame.dataset.articleFrameBound === 'true') {
      return;
    }

    frame.dataset.articleFrameBound = 'true';
    if (frame.dataset.articleFrameMode === 'fixed') {
      frame.setAttribute('scrolling', 'yes');
    }
    bindFixedFrameAutoScroll(frame);

    frame.addEventListener('load', function () {
      try {
        rememberFrameWindow(frame);
        if (frame.dataset.articleFrameMode === 'fixed') {
          frame.setAttribute('scrolling', 'yes');
          return;
        }
        requestFrameHeight(frame);
        setTimeout(function () {
          requestFrameHeight(frame);
        }, 250);
        setTimeout(function () {
          requestFrameHeight(frame);
        }, 1000);
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
