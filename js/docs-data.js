/**
 * docs-data.js — каталог документаций и утилиты.
 */
(function (global) {
  'use strict';

  var MANIFEST = {"docs":[{"id":"duisdev","title":"DUISDev","description":"Документация для разработчиков: структура сайта, разделы, модули и видеоплатформа.","sections":[{"title":"Начало","pages":[{"id":"about","title":"О проекте","file":"duisdev/about.html"},{"id":"structure","title":"Структура проекта","file":"duisdev/structure.html"},{"id":"modules","title":"Модули и include","file":"duisdev/modules.html"}]},{"title":"Разделы сайта","pages":[{"id":"sections-home","title":"Главная","file":"duisdev/sections-home.html"},{"id":"sections-blog","title":"Блог","file":"duisdev/sections-blog.html"},{"id":"sections-articles","title":"Статьи","file":"duisdev/sections-articles.html"},{"id":"sections-docs","title":"Документация","file":"duisdev/sections-docs.html"}]},{"title":"Видеоплатформа","pages":[{"id":"videoplatform","title":"Обзор","file":"duisdev/videoplatform.html"},{"id":"videoplatform-manifest","title":"manifest.json","file":"duisdev/videoplatform-manifest.html"}]},{"title":"Для разработчиков","pages":[{"id":"editing","title":"Как править сайт","file":"duisdev/editing.html"},{"id":"local-server","title":"Локальный запуск","file":"duisdev/local-server.html"}]}]},{"id":"page-builder","title":"Page Builder","description":"Полное руководство по CSS-фреймворку DUISDev с живыми демонстрациями.","sections":[{"title":"Начало","pages":[{"id":"intro","title":"Введение","file":"page-builder/intro.html"},{"id":"setup","title":"Подключение","file":"page-builder/setup.html"}]},{"title":"Стили","pages":[{"id":"themes","title":"Темы","file":"page-builder/themes.html"},{"id":"colors","title":"Цвета","file":"page-builder/colors.html"},{"id":"sizes","title":"Размеры","file":"page-builder/sizes.html"},{"id":"properties","title":"Свойства","file":"page-builder/properties.html"},{"id":"custom-class","title":"Класс custom","file":"page-builder/custom-class.html"}]},{"title":"Анимации","pages":[{"id":"animations-loading","title":"При загрузке","file":"page-builder/animations-loading.html"},{"id":"animations-constant","title":"Постоянные","file":"page-builder/animations-constant.html"},{"id":"animations-hover","title":"При наведении","file":"page-builder/animations-hover.html"}]},{"title":"Демонстрации","pages":[{"id":"demo-gallery","title":"Галерея","file":"page-builder/demo-gallery.html"}]}]}]};

  var TRANSLIT_MAP = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i',
    й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't',
    у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '',
    э: 'e', ю: 'yu', я: 'ya'
  };

  function transliterate(text) {
    return String(text || '').replace(/[А-Яа-яЁё]/g, function (char) {
      var mapped = TRANSLIT_MAP[char.toLowerCase()];
      return mapped || char;
    });
  }

  function slugify(text) {
    return transliterate(text)
      .toLowerCase()
      .replace(/@/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'item';
  }

  function uniqueId(base, used) {
    var id = base;
    var suffix = 2;

    while (used[id]) {
      id = base + '-' + suffix;
      suffix += 1;
    }

    used[id] = true;
    return id;
  }

  function pageIdFromFile(file) {
    var name = String(file || '').split('/').pop() || '';
    return slugify(name.replace(/\.html$/i, '')) || 'page';
  }

  function accentHueFromId(id) {
    var hash = 0;
    var source = String(id || '');

    for (var i = 0; i < source.length; i += 1) {
      hash = ((hash << 5) - hash) + source.charCodeAt(i);
      hash |= 0;
    }

    return Math.abs(hash) % 360;
  }

  function prepareManifest(data) {
    var usedDocIds = Object.create(null);

    data.docs = (data.docs || []).map(function (doc) {
      var baseDocId = doc.id || slugify(doc.title);
      doc.id = uniqueId(baseDocId, usedDocIds);
      doc.accentHue = accentHueFromId(doc.id);

      var usedPageIds = Object.create(null);
      doc.sections = (doc.sections || []).map(function (section) {
        section.pages = (section.pages || []).map(function (page) {
          var basePageId = page.id || pageIdFromFile(page.file) || slugify(page.title);
          page.id = uniqueId(basePageId, usedPageIds);
          return page;
        });
        return section;
      });

      doc.pageCount = doc.sections.reduce(function (total, section) {
        return total + section.pages.length;
      }, 0);

      return doc;
    });

    data.docsById = Object.create(null);
    data.docs.forEach(function (doc) {
      data.docsById[doc.id] = doc;
    });

    return data;
  }

  function loadManifest() {
    return Promise.resolve(prepareManifest(JSON.parse(JSON.stringify(MANIFEST))));
  }

  function findPage(doc, pageId) {
    var found = null;

    (doc.sections || []).some(function (section) {
      return section.pages.some(function (page) {
        if (page.id === pageId) {
          found = page;
          return true;
        }
        return false;
      });
    });

    return found;
  }

  function firstPage(doc) {
    var sections = doc.sections || [];

    for (var i = 0; i < sections.length; i += 1) {
      if (sections[i].pages && sections[i].pages.length) {
        return sections[i].pages[0];
      }
    }

    return null;
  }

  function readerUrl(docId, pageId) {
    var url = 'read.html?doc=' + encodeURIComponent(docId);
    if (pageId) {
      url += '&page=' + encodeURIComponent(pageId);
    }
    return url;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  global.DocsData = {
    loadManifest: loadManifest,
    findPage: findPage,
    firstPage: firstPage,
    readerUrl: readerUrl,
    accentHueFromId: accentHueFromId,
    escapeHtml: escapeHtml
  };
})(typeof window !== 'undefined' ? window : globalThis);
