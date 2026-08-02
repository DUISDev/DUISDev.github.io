import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

class BlogIndexGenerator {
    private static final Set<String> IMAGE_EXTENSIONS = new HashSet<>(Arrays.asList(
            "png", "jpg", "jpeg", "gif", "bmp", "webp", "svg", "ico", "avif"
    ));
    private static final Set<String> VIDEO_EXTENSIONS = new HashSet<>(Arrays.asList(
            "mov", "mp4", "mkv", "avi", "webm"
    ));
    private static final Set<String> AUDIO_EXTENSIONS = new HashSet<>(Arrays.asList(
            "mp3", "wav", "aiff", "aac", "ogg", "wma", "flac", "m4a", "alac"
    ));

    public static void main(String[] args) throws IOException {
        String root = args.length > 0 ? args[0] : ".";

        Path projectRoot = Paths.get(root).toRealPath();
        Path postsDir = projectRoot.resolve("posts");
        Path indexPath = projectRoot.resolve("index.html");

        System.out.println("Root folder: " + root);
        System.out.println("Resolved project root: " + projectRoot);
        System.out.println("Posts directory: " + postsDir);
        System.out.println("Index path: " + indexPath);

        if (!Files.exists(postsDir) || !Files.isDirectory(postsDir)) {
            throw new IOException("Folder 'posts' not found: " + postsDir);
        }

        // Filter files matching post*.html
        List<Path> postFiles = Files.list(postsDir)
                .filter(p -> {
                    String fileName = p.getFileName().toString();
                    return fileName.matches("post\\d+\\.html") && Files.isRegularFile(p);
                })
                .sorted((p1, p2) -> {
                    Pattern pattern = Pattern.compile("^post(\\d+)\\.html$");
                    Matcher m1 = pattern.matcher(p1.getFileName().toString());
                    Matcher m2 = pattern.matcher(p2.getFileName().toString());
                    int n1 = -1, n2 = -1;
                    if (m1.matches()) {
                        n1 = Integer.parseInt(m1.group(1));
                    }
                    if (m2.matches()) {
                        n2 = Integer.parseInt(m2.group(1));
                    }
                    return Integer.compare(n2, n1); // Descending order
                })
                .collect(Collectors.toList());

        Path projectRootReal = projectRoot.toRealPath();

        List<String> cards = new ArrayList<>();
        for (Path file : postFiles) {
            String raw = Files.readString(file, StandardCharsets.UTF_8);
            String formatted = applyWhatsappFormattingPreservingIframes(raw.trim());
            formatted = normalizePostCardForIndex(formatted);
            cards.add(buildCardPreview(formatted, projectRootReal));
        }

        String postsHtml;
        if (cards.isEmpty()) {
            postsHtml = "      <p class=\"blog-posts-empty\">Пока нет записей.</p>";
        } else {
            postsHtml = String.join(System.lineSeparator(), cards);
        }

        String indexHtml = "<!DOCTYPE html>\n" +
                "<html lang=\"ru\" data-site-root=\"../\">\n" +
                "<head>\n" +
                "  <meta charset=\"UTF-8\">\n" +
                "  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n" +
                "  <link rel=\"icon\" href=\"../dependencies/X-Coin.ico\">\n" +
                "  <title>Блог — DUISDev</title>\n" +
                "  <link rel=\"stylesheet\" href=\"../css/font.css\">\n" +
                "  <link rel=\"stylesheet\" href=\"../css/footer.css\">\n" +
                "  <link rel=\"stylesheet\" href=\"../css/menu.css\">\n" +
                "  <link rel=\"stylesheet\" href=\"../css/page_home.css\">\n" +
                "  <link rel=\"stylesheet\" href=\"../css/blog-page.css\">\n" +
                "</head>\n" +
                "<body class=\"page-home page-blog\">\n" +
                "\n" +
                "  <header class=\"site-header\">\n" +
                "    <div data-duisdev-module=\"logo\"></div>\n" +
                "    <div data-duisdev-module=\"menu\"></div>\n" +
                "  </header>\n" +
                "\n" +
                "  <main class=\"blog-main\">\n" +
                "    <header class=\"blog-page__header\">\n" +
                "      <h1>Блог</h1>\n" +
                "      <p>Новости и заметки команды DUISDev.</p>\n" +
                "      <a class=\"blog-admin-link\" href=\"admin/index.html\">Админ</a>\n" +
                "    </header>\n" +
                "\n" +
                "    <section class=\"blog-posts posts-list\">\n" +
                postsHtml + "\n" +
                "    </section>\n" +
                "  </main>\n" +
                "\n" +
                "  <footer id=\"footer\" data-duisdev-module=\"footer\"></footer>\n" +
                "\n" +
                "  <script src=\"../js/include-modules.js\" defer></script>\n" +
                "  <script src=\"js/post-iframe-resize.js\" defer></script>\n" +
                "  <script src=\"js/script.js\" defer></script>\n" +
                "</body>\n" +
                "</html>\n";

        Files.writeString(indexPath, indexHtml, StandardCharsets.UTF_8);
        System.out.println("index.html generated: " + postFiles.size() + " posts");
    }

    private static String buildCardPreview(String rawCard, Path projectRootReal) {
        String mediaSrcRaw = extractMediaSrc(rawCard);
        if (mediaSrcRaw == null || mediaSrcRaw.isBlank()) {
            return rawCard;
        }

        String mediaSrc = normalizeAssetHref(projectRootReal, mediaSrcRaw);

        String extension = extractExtension(mediaSrc);
        if (extension.isBlank() || isMediaExtension(extension)) {
            return rawCard;
        }

        String postTitle = extractPostTitle(rawCard);
        String fileName = extractFileName(mediaSrc);
        boolean fileExists = assetExists(projectRootReal, mediaSrc);
        String documentTitle = fileExists && !fileName.isBlank() ? escapeHtml(fileName) : sanitizeAllowedInlineFormatting(postTitle);

        String downloadAttr = fileName.isBlank()
                ? " download"
                : " download=\"" + escapeHtmlAttribute(fileName) + "\"";
        String downloadHtml = fileExists
                ? "<a class=\"doc-download-btn\" href=\"" + escapeHtmlAttribute(mediaSrc) + "\"" + downloadAttr + ">Скачать</a>"
                : "<span class=\"doc-download-btn doc-download-btn-disabled\">Скачать</span>";

        String docMediaHtml = "<div class=\"doc-media\">\n" +
                "        <div class=\"doc-media-main\">\n" +
                "            <span class=\"doc-icon\">DOC</span>\n" +
                "            <div>\n" +
                "                <p class=\"doc-name\">" + documentTitle + "</p>\n" +
                "                <p class=\"doc-subtitle\">Документ</p>\n" +
                "            </div>\n" +
                "        </div>\n" +
                "        " + downloadHtml + "\n" +
                "    </div>";

        return replaceDocumentMediaInCard(rawCard, docMediaHtml);
    }

    private static String replaceDocumentMediaInCard(String rawCard, String docMediaHtml) {
        Pattern docLinkPattern = Pattern.compile(
                "<p>\\s*<a\\s+[^>]*class=\"[^\"]*post-document[^\"]*\"[^>]*>.*?</a>\\s*</p>",
                Pattern.CASE_INSENSITIVE | Pattern.DOTALL);
        Matcher docLinkMatcher = docLinkPattern.matcher(rawCard);
        if (docLinkMatcher.find()) {
            return docLinkMatcher.replaceFirst(Matcher.quoteReplacement(docMediaHtml));
        }

        Pattern iframePattern = Pattern.compile("<iframe\\b", Pattern.CASE_INSENSITIVE);
        Matcher iframeMatcher = iframePattern.matcher(rawCard);
        if (iframeMatcher.find()) {
            return rawCard.substring(0, iframeMatcher.start())
                    + docMediaHtml
                    + "\n    "
                    + rawCard.substring(iframeMatcher.start());
        }

        return rawCard;
    }

    private static String extractMediaSrc(String rawCard) {
        Pattern docLinkPattern = Pattern.compile("<a\\s+[^>]*class=\"[^\"]*post-document[^\"]*\"[^>]*href=\"([^\"]+)\"",
                Pattern.CASE_INSENSITIVE);
        Matcher docLinkMatcher = docLinkPattern.matcher(rawCard);
        if (docLinkMatcher.find()) {
            return docLinkMatcher.group(1).trim();
        }

        Pattern sourcePattern = Pattern.compile("<source\\s+[^>]*src=\"([^\"]+)\"", Pattern.CASE_INSENSITIVE);
        Matcher sourceMatcher = sourcePattern.matcher(rawCard);
        if (sourceMatcher.find()) {
            return sourceMatcher.group(1).trim();
        }

        Pattern imgPattern = Pattern.compile("<img\\s+[^>]*src=\"([^\"]+)\"", Pattern.CASE_INSENSITIVE);
        Matcher imgMatcher = imgPattern.matcher(rawCard);
        if (imgMatcher.find()) {
            return imgMatcher.group(1).trim();
        }

        return null;
    }

    private static String extractExtension(String path) {
        int queryStart = path.indexOf('?');
        String cleanPath = queryStart >= 0 ? path.substring(0, queryStart) : path;
        int dotIndex = cleanPath.lastIndexOf('.');
        if (dotIndex < 0 || dotIndex == cleanPath.length() - 1) {
            return "";
        }
        return cleanPath.substring(dotIndex + 1).toLowerCase(Locale.ROOT);
    }

    private static boolean isMediaExtension(String extension) {
        return IMAGE_EXTENSIONS.contains(extension)
                || VIDEO_EXTENSIONS.contains(extension)
                || AUDIO_EXTENSIONS.contains(extension);
    }

    private static String extractPostTitle(String rawCard) {
        Pattern srcdocPattern = Pattern.compile(
                "<iframe[^>]*\\ssrcdoc=\"([^\"]*)\"",
                Pattern.CASE_INSENSITIVE | Pattern.DOTALL);
        Matcher srcdocMatcher = srcdocPattern.matcher(rawCard);
        if (srcdocMatcher.find()) {
            String decoded = decodeSrcdocAttribute(srcdocMatcher.group(1));
            String fromIframe = extractTitleFromHtmlFragment(decoded);
            if (!fromIframe.isBlank()) {
                return fromIframe;
            }
        }

        return extractTitleFromHtmlFragment(rawCard);
    }

    private static String extractTitleFromHtmlFragment(String html) {
        Pattern postTitlePattern = Pattern.compile(
                "<div[^>]*class=\"[^\"]*post-title[^\"]*\"[^>]*>(.*?)</div>",
                Pattern.CASE_INSENSITIVE | Pattern.DOTALL);
        Matcher postTitleMatcher = postTitlePattern.matcher(html);
        if (postTitleMatcher.find()) {
            String plain = stripHtmlTags(postTitleMatcher.group(1)).trim();
            if (!plain.isBlank()) {
                return plain;
            }
        }

        Pattern h1Pattern = Pattern.compile("<h1[^>]*>(.*?)</h1>", Pattern.CASE_INSENSITIVE | Pattern.DOTALL);
        Matcher h1Matcher = h1Pattern.matcher(html);
        if (h1Matcher.find()) {
            String plain = stripHtmlTags(h1Matcher.group(1)).trim();
            if (!plain.isBlank()) {
                return plain;
            }
        }

        Pattern titlePattern = Pattern.compile("<h2>\\s*(?:<a[^>]*>)?\\s*(.*?)\\s*(?:</a>)?\\s*</h2>",
                Pattern.CASE_INSENSITIVE | Pattern.DOTALL);
        Matcher matcher = titlePattern.matcher(html);
        if (matcher.find()) {
            return stripHtmlTags(matcher.group(1)).trim();
        }
        return "Документ";
    }

    private static String stripHtmlTags(String html) {
        return html.replaceAll("<[^>]+>", " ").replaceAll("\\s+", " ").trim();
    }

    private static String decodeSrcdocAttribute(String value) {
        return value
                .replace("&quot;", "\"")
                .replace("&#39;", "'")
                .replace("&lt;", "<")
                .replace("&gt;", ">")
                .replace("&amp;", "&");
    }

    private static String extractFileName(String src) {
        String normalized = src.replace('\\', '/');
        int slashIndex = normalized.lastIndexOf('/');
        if (slashIndex >= 0 && slashIndex + 1 < normalized.length()) {
            return normalized.substring(slashIndex + 1);
        }
        return normalized;
    }

    private static String normalizeAssetHref(Path projectRootReal, String mediaSrc) {
        if (mediaSrc == null || mediaSrc.isBlank()) {
            return mediaSrc;
        }
        try {
            String s = mediaSrc.trim().replace('\\', '/');
            while (s.startsWith("./")) {
                s = s.substring(2);
            }
            if (s.startsWith("/") && !s.startsWith("//")) {
                s = s.substring(1);
            }

            List<Path> candidates = new ArrayList<>();
            if (s.length() >= 2 && s.charAt(1) == ':') {
                candidates.add(Paths.get(s).normalize());
            } else {
                candidates.add(projectRootReal.resolve(s).normalize());
            }

            for (Path candidate : candidates) {
                if (!candidate.isAbsolute()) {
                    candidate = projectRootReal.resolve(candidate).normalize();
                }

                if (Files.exists(candidate)) {
                    candidate = candidate.toRealPath();
                }

                if (candidate.startsWith(projectRootReal)) {
                    Path rel = projectRootReal.relativize(candidate);
                    String out = rel.toString().replace('\\', '/');
                    if (!out.isEmpty()) {
                        return out;
                    }
                }
            }
        } catch (IOException ignored) {
            // fall through to fallback
        }

        return fallbackRelativeAssetPath(mediaSrc);
    }

    private static String fallbackRelativeAssetPath(String mediaSrc) {
        String s = mediaSrc.trim().replace('\\', '/');
        while (s.startsWith("./")) {
            s = s.substring(2);
        }
        if (s.startsWith("/") && !s.startsWith("//")) {
            s = s.substring(1);
        }
        int idx = s.toLowerCase(Locale.ROOT).indexOf("assets/");
        if (idx >= 0) {
            return s.substring(idx);
        }
        return s;
    }

    private static boolean assetExists(Path projectRootReal, String relativeSrc) {
        Path target = projectRootReal.resolve(relativeSrc).normalize();
        if (!target.startsWith(projectRootReal)) {
            return false;
        }
        return Files.exists(target) && Files.isRegularFile(target);
    }

    private static String applyWhatsappFormattingPreservingIframes(String html) {
        Pattern iframePattern = Pattern.compile(
                "(<iframe\\b[^>]*\\ssrcdoc=\")([^\"]*)(\"[^>]*>)",
                Pattern.CASE_INSENSITIVE | Pattern.DOTALL);
        Matcher matcher = iframePattern.matcher(html);
        StringBuilder out = new StringBuilder();
        int last = 0;
        while (matcher.find()) {
            if (matcher.start() > last) {
                out.append(applyWhatsappFormatting(html.substring(last, matcher.start())));
            }
            out.append(matcher.group(1)).append(matcher.group(2)).append(matcher.group(3));
            last = matcher.end();
        }
        if (last < html.length()) {
            out.append(applyWhatsappFormatting(html.substring(last)));
        }
        return out.toString();
    }

    private static String applyWhatsappFormatting(String html) {
        Pattern tagPattern = Pattern.compile("(<[^>]+>)");
        Matcher matcher = tagPattern.matcher(html);
        StringBuilder out = new StringBuilder();
        int last = 0;
        while (matcher.find()) {
            if (matcher.start() > last) {
                out.append(applyWhatsappFormattingToText(html.substring(last, matcher.start())));
            }
            out.append(matcher.group(1));
            last = matcher.end();
        }
        if (last < html.length()) {
            out.append(applyWhatsappFormattingToText(html.substring(last)));
        }
        return out.toString();
    }

    private static String normalizePostCardForIndex(String card) {
        Pattern iframePattern = Pattern.compile(
                "(<iframe\\b[^>]*\\ssrcdoc=\")([\\s\\S]*?)(\"[^>]*>)",
                Pattern.CASE_INSENSITIVE);
        Matcher matcher = iframePattern.matcher(card);
        StringBuilder out = new StringBuilder();
        int last = 0;
        while (matcher.find()) {
            if (matcher.start() > last) {
                out.append(card, last, matcher.start());
            }
            String decoded = decodeSrcdocAttribute(matcher.group(2).replaceAll("\\s+", " "));
            String normalizedDoc = normalizeIframeDocumentForIndex(decoded);
            out.append(matcher.group(1))
                    .append(escapeSrcdocAttribute(normalizedDoc))
                    .append(matcher.group(3));
            last = matcher.end();
        }
        if (last < card.length()) {
            out.append(card.substring(last));
        }
        return out.toString();
    }

    private static String normalizeIframeDocumentForIndex(String doc) {
        String result = doc;
        result = result.replace("../../css/blog-page.css", "");
        result = result.replace("../../css/font.css", "../css/font.css");
        result = result.replace("../css/post-iframe-content.css", "css/post-iframe-content.css");
        result = result.replace("../css/post-html-content.css", "css/post-html-content.css");
        result = result.replace("../js/post-iframe-content.js", "js/post-iframe-content.js");
        if (!result.contains("post-html-content.css")) {
            result = result.replace(
                    "<link rel=\"stylesheet\" href=\"css/post-iframe-content.css\">",
                    "<link rel=\"stylesheet\" href=\"css/post-iframe-content.css\">\n"
                            + "<link rel=\"stylesheet\" href=\"css/post-html-content.css\">");
        }
        return result.replaceAll(">\\s+<", "><").trim();
    }

    private static String escapeSrcdocAttribute(String value) {
        return value
                .replace("&", "&amp;")
                .replace("\"", "&quot;");
    }

    private static String applyWhatsappFormattingToText(String text) {
        String result = text;
        result = result.replaceAll("<([^<>\\n]+)>", "<code>$1</code>");
        result = result.replaceAll("\\*([^*\\n]+)\\*", "<strong>$1</strong>");
        result = result.replaceAll("_([^_\\n]+)_", "<em>$1</em>");
        result = result.replaceAll("~([^~\\n]+)~", "<del>$1</del>");
        return result;
    }

    private static String escapeHtml(String value) {
        return value
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;");
    }

    private static String escapeHtmlAttribute(String value) {
        return escapeHtml(value).replace("'", "&#39;");
    }

    private static String sanitizeAllowedInlineFormatting(String value) {
        String escaped = escapeHtml(value);
        escaped = escaped.replace("&lt;strong&gt;", "<strong>").replace("&lt;/strong&gt;", "</strong>");
        escaped = escaped.replace("&lt;em&gt;", "<em>").replace("&lt;/em&gt;", "</em>");
        escaped = escaped.replace("&lt;code&gt;", "<code>").replace("&lt;/code&gt;", "</code>");
        escaped = escaped.replace("&lt;del&gt;", "<del>").replace("&lt;/del&gt;", "</del>");
        return escaped;
    }
}