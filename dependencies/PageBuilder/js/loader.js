// loader.js — главный файл, который загружает остальные
(function() {
  'use strict';

  // Список скриптов для загрузки (в порядке зависимостей)
  const scriptsToLoad = [
    // 'js/include-modules.js',  // HTML-модули из modules/ (logo, menu, footer) через data-duisdev-module
    // 'js/iframe-resize.js',    // Универсальная подстройка высоты iframe (.pb-auto-height, .module-frame)
    // 'js/utils.js',
    // 'js/menu.js',
    // 'js/slider.js',
    // 'js/main.js'
  ];

  // Функция загрузки одного скрипта
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = false; // Сохраняем порядок выполнения

      script.onload = () => {
        console.log(`✓ Загружен: ${src}`);
        resolve();
      };

      script.onerror = () => {
        console.error(`✗ Ошибка загрузки: ${src}`);
        reject();
      };

      document.head.appendChild(script);
    });
  }

  // Последовательная загрузка всех скриптов
  async function loadAllScripts() {
    try {
      for (const src of scriptsToLoad) {
        await loadScript(src);
      }
      console.log('🎉 Все скрипты успешно загружены!');
    } catch (error) {
      console.error('Критическая ошибка при загрузке скриптов:', error);
    }
  }

  // Запускаем загрузку после готовности DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadAllScripts);
  } else {
    loadAllScripts();
  }
})();
