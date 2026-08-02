# DUISDev

Официальный сайт сообщества **DUISDev**: Open Source инструменты, контент и документация для веб-разработки.

Статический сайт на HTML, CSS и JavaScript (GitHub Pages). Разделы: блог, статьи, видеоплатформа, документация. CSS-фреймворк **Page Builder** — в `dependencies/PageBuilder/`.

**Сайт:** [https://duisdev.github.io](https://duisdev.github.io)

---

## Лицензии

| Слой | Документ |
|------|----------|
| **Код и структура** | [MIT License](LICENSE) |
| **Официальный контент** | [CONTENT.md](CONTENT.md) — © DUISDev, все права защищены |
| **Бренд «DUISDev»** | [TRADEMARK.md](TRADEMARK.md) |
| **Участие в проекте** | [CONTRIBUTING.md](CONTRIBUTING.md) |

**Кратко:** инструменты и каркас сайта можно свободно использовать (MIT); статьи, посты, доки и медиа — только по правилам [CONTENT.md](CONTENT.md); имя и бренд — по [TRADEMARK.md](TRADEMARK.md).

---

## Структура

```
css/, js/, modules/     — общие стили, скрипты, HTML-модули
dependencies/           — Page Builder и зависимости
blog/, articles/        — блог и статьи
videoplatform/          — видеокаталог
docs/                   — документация
```

Подробнее — в разделе документации [DUISDev](https://duisdev.github.io/docs/) на сайте.

---

## Локальный запуск

Любой статический HTTP-сервер из корня репозитория, например:

```bash
python3 -m http.server 8080
```

Откройте [http://localhost:8080](http://localhost:8080).
