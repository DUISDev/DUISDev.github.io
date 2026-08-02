/**
 * articles-page.js — категории → список статей → просмотр (articles/manifest.json).
 */
(function () {
  'use strict';

  var MANIFEST_URL = 'manifest.json';
  var ALL_CATEGORY_ID = 'all';
  var categoriesRoot = document.getElementById('articles-categories');
  var hint = document.getElementById('articles-hint');
  var listScreen = document.getElementById('articles-list-screen');
  var listTitle = document.getElementById('articles-list-title');
  var listRoot = document.getElementById('articles-list');
  var reader = document.getElementById('articles-reader');
  var backButton = document.getElementById('articles-back');
  var frame = document.getElementById('articles-frame');

  var manifest = null;
  var activeCategoryId = null;

  function slugify(text) {
    return String(text || '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9\u0400-\u04ff-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  function articleIdFromFile(file) {
    return String(file || '').replace(/\.html$/i, '') || 'article';
  }

  function isAutoCategory(category) {
    return category.auto === true || category.id === ALL_CATEGORY_ID;
  }

  function ensureUniqueId(preferred, used) {
    var id = preferred || 'item';
    var suffix = 2;

    while (used[id]) {
      id = preferred + '-' + suffix;
      suffix += 1;
    }

    used[id] = true;
    return id;
  }

  function normalizeManifest(data) {
    var categories = data.categories || [];
    var usedCategoryIds = {};

    categories.forEach(function (category, categoryIndex) {
      if (isAutoCategory(category)) {
        category.id = category.id || ALL_CATEGORY_ID;
        usedCategoryIds[category.id] = true;
        return;
      }

      if (!category.id) {
        var baseCategoryId = slugify(category.title) || ('category-' + (categoryIndex + 1));
        category.id = ensureUniqueId(baseCategoryId, usedCategoryIds);
        return;
      }

      category.id = ensureUniqueId(category.id, usedCategoryIds);
    });

    categories.forEach(function (category) {
      if (isAutoCategory(category)) {
        return;
      }

      var usedArticleIds = {};

      (category.articles || []).forEach(function (article, articleIndex) {
        if (article.id) {
          article.id = ensureUniqueId(article.id, usedArticleIds);
          return;
        }

        var baseArticleId = articleIdFromFile(article.file) || ('article-' + (articleIndex + 1));
        article.id = ensureUniqueId(baseArticleId, usedArticleIds);
      });
    });

    return data;
  }

  function collectAllArticles(categories) {
    var seen = {};
    var articles = [];

    categories.forEach(function (category) {
      if (isAutoCategory(category)) {
        return;
      }

      (category.articles || []).forEach(function (article) {
        if (!seen[article.id]) {
          seen[article.id] = true;
          articles.push(article);
        }
      });
    });

    return articles;
  }

  function findAutoCategory() {
    return manifest.categories.find(function (category) {
      return isAutoCategory(category);
    });
  }

  function resolveManifest(data) {
    normalizeManifest(data);
    var categories = data.categories || [];

    categories.forEach(function (category) {
      if (isAutoCategory(category)) {
        category.articles = collectAllArticles(categories);
      }
    });

    return data;
  }

  function loadManifest() {
    return fetch(MANIFEST_URL, { credentials: 'same-origin' }).then(function (response) {
      if (!response.ok) {
        throw new Error(MANIFEST_URL + ': ' + response.status);
      }
      return response.json();
    });
  }

  function findCategory(categoryId) {
    return manifest.categories.find(function (category) {
      return category.id === categoryId;
    });
  }

  function showHint() {
    hint.hidden = false;
    listScreen.hidden = true;
    reader.hidden = true;
  }

  function showListScreen() {
    hint.hidden = true;
    listScreen.hidden = false;
    reader.hidden = true;
  }

  function showReader() {
    hint.hidden = true;
    listScreen.hidden = true;
    reader.hidden = false;
  }

  function setActiveCategory(categoryId) {
    activeCategoryId = categoryId;

    categoriesRoot.querySelectorAll('.articles-category').forEach(function (button) {
      var isActive = button.dataset.category === categoryId;
      button.setAttribute('aria-selected', isActive ? 'true' : 'false');
      button.tabIndex = isActive ? 0 : -1;
    });
  }

  function renderArticleList(category) {
    listTitle.textContent = category.title;
    listRoot.innerHTML = '';

    (category.articles || []).forEach(function (article, index) {
      var item = document.createElement('li');
      item.className = 'articles-list__entry';

      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'articles-list__item';
      button.dataset.article = article.id;
      button.setAttribute('role', 'option');
      button.tabIndex = index === 0 ? 0 : -1;
      button.textContent = article.title;

      button.addEventListener('click', function () {
        openArticle(article);
      });

      item.appendChild(button);
      listRoot.appendChild(item);
    });
  }

  function openCategory(categoryId) {
    var category = findCategory(categoryId);

    if (!category) {
      return;
    }

    setActiveCategory(categoryId);
    renderArticleList(category);
    showListScreen();
  }

  function openArticle(article) {
    showReader();
    frame.src = 'content/' + article.file;
    frame.title = article.title;
  }

  function renderCategories() {
    categoriesRoot.innerHTML = '';

    manifest.categories.forEach(function (category, index) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'articles-category';
      button.id = 'articles-category-' + category.id;
      button.dataset.category = category.id;
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-selected', 'false');
      button.tabIndex = index === 0 ? 0 : -1;
      button.textContent = category.title;

      button.addEventListener('click', function () {
        openCategory(category.id);
      });

      categoriesRoot.appendChild(button);
    });

    categoriesRoot.addEventListener('keydown', function (event) {
      var tabs = Array.prototype.slice.call(categoriesRoot.querySelectorAll('.articles-category'));
      var currentIndex = tabs.findIndex(function (tab) {
        return tab.getAttribute('aria-selected') === 'true';
      });

      if (currentIndex === -1) {
        currentIndex = 0;
      }

      var nextIndex = currentIndex;

      if (event.key === 'ArrowRight') {
        nextIndex = (currentIndex + 1) % tabs.length;
      } else if (event.key === 'ArrowLeft') {
        nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
      } else {
        return;
      }

      event.preventDefault();
      tabs[nextIndex].focus();
      openCategory(tabs[nextIndex].dataset.category);
    });
  }

  function initArticlesPage() {
    if (!categoriesRoot || !frame) {
      return;
    }

    backButton.addEventListener('click', function () {
      if (activeCategoryId) {
        openCategory(activeCategoryId);
      } else {
        showHint();
      }
    });

    if (window.DUISDevArticleFrames) {
      window.DUISDevArticleFrames.register(frame);
    }

    loadManifest()
      .then(function (data) {
        manifest = resolveManifest(data);

        if (!manifest.categories || !manifest.categories.length) {
          hint.textContent = 'Категорий пока нет.';
          return;
        }

        renderCategories();

        var allCategory = findAutoCategory();
        if (allCategory && allCategory.articles.length) {
          openCategory(allCategory.id);
        } else {
          showHint();
        }
      })
      .catch(function (error) {
        console.error('[DUISDev articles]', error.message);
        hint.textContent = 'Не удалось загрузить каталог статей.';
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initArticlesPage);
  } else {
    initArticlesPage();
  }
})();
