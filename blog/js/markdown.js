/**
 * Markdown → HTML (фрагмент тела), по образцу blog/MarkdownToHTMLConverter.java
 */
(function (global) {
  'use strict';

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function applyInline(s, allowHtml) {
    let text = String(s);
    if (!allowHtml) {
      text = escapeHtml(text);
    }
    text = text
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/__([^_]+)__/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/_([^_]+)_/g, '<em>$1</em>')
      .replace(/~~([^~]+)~~/g, '<del>$1</del>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');
    text = text
      .replace(/&macr;/g, '̄')
      .replace(/&copy;/g, '©')
      .replace(/&reg;/g, '®')
      .replace(/&trade;/g, '™')
      .replace(/&mdash;/g, '—')
      .replace(/&ndash;/g, '–')
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&');
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
    text = text.replace(/<(https?:\/\/[^>]+)>/g, '<a href="$1">$1</a>');
    text = text.replace(
      /<([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})>/g,
      '<a href="mailto:$1">$1</a>'
    );
    text = text
      .replace(/:smile:/g, '😊')
      .replace(/:laughing:/g, '😆')
      .replace(/:blush:/g, '😊')
      .replace(/:heart:/g, '❤️')
      .replace(/:rocket:/g, '🚀')
      .replace(/:star:/g, '⭐');
    return text;
  }

  /**
   * Блочный Markdown → HTML-фрагмент (без обёртки документа).
   */
  function markdownToHtml(md, allowHtml) {
    const htmlAllowed = allowHtml !== false;
    const out = [];
    let inCode = false;
    let code = null;
    let inList = false;
    let listTag = null;

    const lines = String(md).split('\n');

    for (let i = 0; i < lines.length; i++) {
      const ln = lines[i];
      const l = ln.trim();

      if (l.startsWith('```')) {
        if (!inCode) {
          inCode = true;
          code = [];
        } else {
          inCode = false;
          out.push('<pre><code>' + escapeHtml(code.join('\n')) + '</code></pre>\n');
          code = null;
        }
        continue;
      }

      if (inCode) {
        code.push(ln);
        continue;
      }

      if (l.length === 0) {
        if (inList) {
          out.push('</' + listTag + '>\n');
          inList = false;
          listTag = null;
        }
        continue;
      }

      if (/^#{1,6}\s+/.test(l)) {
        if (inList) {
          out.push('</' + listTag + '>\n');
          inList = false;
          listTag = null;
        }
        const hashes = l.match(/^#+/)[0];
        let level = hashes.length;
        level = Math.min(6, Math.max(1, level));
        const headingText = l.slice(level).trim();
        out.push(
          '<h' + level + '>' + applyInline(headingText, htmlAllowed) + '</h' + level + '>\n'
        );
        continue;
      }

      if (l.startsWith('>')) {
        if (inList) {
          out.push('</' + listTag + '>\n');
          inList = false;
          listTag = null;
        }
        out.push(
          '<blockquote>' + applyInline(l.slice(1).trim(), htmlAllowed) + '</blockquote>\n'
        );
        continue;
      }

      if (/^[-*_]{3,}$/.test(l)) {
        if (inList) {
          out.push('</' + listTag + '>\n');
          inList = false;
          listTag = null;
        }
        out.push('<hr>\n');
        continue;
      }

      if (/^[-*+]\s+/.test(l)) {
        const cont = applyInline(l.replace(/^[-*+]\s+/, ''), htmlAllowed);
        if (!inList || listTag !== 'ul') {
          if (inList) {
            out.push('</' + listTag + '>\n');
          }
          out.push("<ul class='center-list'>\n");
          inList = true;
          listTag = 'ul';
        }
        out.push('<li>' + cont + '</li>\n');
        continue;
      }

      if (/^\d+\.\s+/.test(l)) {
        const cont = applyInline(l.replace(/^\d+\.\s+/, ''), htmlAllowed);
        if (!inList || listTag !== 'ol') {
          if (inList) {
            out.push('</' + listTag + '>\n');
          }
          out.push("<ol class='center-list'>\n");
          inList = true;
          listTag = 'ol';
        }
        out.push('<li>' + cont + '</li>\n');
        continue;
      }

      if (l.includes('|') && l.split('|').length > 2 && !l.includes('---')) {
        if (inList) {
          out.push('</' + listTag + '>\n');
          inList = false;
          listTag = null;
        }
        out.push('<table>');
        const cells = l.split('|');
        for (const c of cells) {
          const cell = c.trim();
          if (cell) {
            out.push('<td>' + applyInline(cell, htmlAllowed) + '</td>');
          }
        }
        out.push('</tr>\n');
        continue;
      }

      if (inList) {
        out.push('</' + listTag + '>\n');
        inList = false;
        listTag = null;
      }
      out.push('<p>' + applyInline(l, htmlAllowed) + '</p>\n');
    }

    if (inList) {
      out.push('</' + listTag + '>\n');
    }

    return out.join('');
  }

  function stripHtml(html) {
    const el = document.createElement('div');
    el.innerHTML = html;
    return el.textContent || '';
  }

  global.BlogMarkdown = {
    escapeHtml: escapeHtml,
    inline: applyInline,
    toHtml: markdownToHtml,
    stripHtml: stripHtml
  };
})(typeof window !== 'undefined' ? window : globalThis);
