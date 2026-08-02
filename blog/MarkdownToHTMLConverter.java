import javax.swing.*;
import javax.swing.border.*;
import java.awt.*;
import java.awt.event.*;
import java.io.*;
import java.nio.file.*;
import java.util.*;
import java.util.regex.*;

public class MarkdownToHTMLConverter extends JFrame {
    private JTextField dirField, nameField;
    private JRadioButton left, center, right;
    private JCheckBox allowHtml;
    private JButton convertBtn, browseBtn;
    private JLabel status, langLabel, dirLabel, nameLabel, themeLabel;
    private JComboBox<String> themeBox, langBox;
    private JTextArea log;
    private String lang = "ru";
    private Map<String, Map<String, String>> dict = new HashMap<>();
    private final String[] themesRu = {"Светлая","Тёмная","Сепия","Лесная","Океан","Космос","Кофе","Мятная","Лаванда","Закат","Арктика","Пустыня","Вишня","Ночь","Рассвет"};
    private final String[] themesEn = {"Light","Dark","Sepia","Forest","Ocean","Space","Coffee","Mint","Lavender","Sunset","Arctic","Desert","Cherry","Midnight","Dawn"};

    public static void main(String[] args) { SwingUtilities.invokeLater(() -> new MarkdownToHTMLConverter()); }

    MarkdownToHTMLConverter() { loadDict(); initUI(); createDirs(); setVisible(true); log("✅ Запущено"); }

    private void loadDict() {
        dict.put("ru", new HashMap<>()); dict.put("en", new HashMap<>());
        String[][] pairs = {
            {"title","Markdown в HTML Конвертер","Markdown to HTML Converter"},
            {"lang","Язык","Language"},{"left","Левое","Left"},{"center","Центр","Center"},{"right","Правое","Right"},
            {"theme","Тема","Theme"},{"html","Разрешить HTML","Allow HTML"},
            {"convert","Конвертировать","Convert"},{"browse","Обзор","Browse"},{"ready","Готов","Ready"},
            {"reading","Чтение","Reading"},{"conv","Конвертация","Converting"},{"write","Запись","Writing"},
            {"success","Готово","Done"},{"error","Ошибка","Error"},{"empty","Введите имя файла","Enter filename"},
            {"dirNot","Директория не существует","Dir not exist"},{"fileNot","Файл не найден","File not found"},
            {"saved","Файл сохранён","File saved"},{"open","Открыть папку?","Open folder?"},
            {"untitled","Без названия","Untitled"},{"style","Оформление","Style"},{"settings","Настройки","Settings"},
            {"logs","Логи","Logs"},{"folder","Директория с MD","MD directory"},{"filename","Имя файла","Filename"}
        };
        for (String[] p : pairs) { dict.get("ru").put(p[0], p[1]); dict.get("en").put(p[0], p[2]); }
    }
    private String tr(String key) { return dict.get(lang).get(key); }

    private void initUI() {
        setTitle(tr("title")); setDefaultCloseOperation(EXIT_ON_CLOSE);
        setSize(800, 620); setLocationRelativeTo(null);
        setLayout(new GridBagLayout());
        GridBagConstraints c = new GridBagConstraints();
        c.insets = new Insets(5,8,5,8); c.fill = GridBagConstraints.HORIZONTAL;
        int row = 0;

        langLabel = new JLabel(tr("lang")+":"); c.gridy=row; c.gridx=0; add(langLabel, c);
        langBox = new JComboBox<>(new String[]{"Русский","English"});
        langBox.addActionListener(e -> { lang = langBox.getSelectedIndex()==0?"ru":"en"; updateLang(); });
        c.gridx=1; add(langBox, c); row++;

        dirLabel = new JLabel("📁 "+tr("folder")+":"); c.gridy=row; c.gridx=0; add(dirLabel, c);
        dirField = new JTextField(Paths.get("resources").toString()); c.gridx=1; add(dirField, c); row++;
        browseBtn = new JButton(tr("browse")); c.gridy=row; c.gridx=1; add(browseBtn, c); row++;

        nameLabel = new JLabel("📄 "+tr("filename")+":"); c.gridy=row; c.gridx=0; add(nameLabel, c);
        nameField = new JTextField(20); c.gridx=1; add(nameField, c); row++;

        JPanel stylePanel = new JPanel(new GridLayout(2,1));
        left = new JRadioButton(tr("left")); center = new JRadioButton(tr("center")); right = new JRadioButton(tr("right"));
        center.setSelected(true);
        ButtonGroup bg = new ButtonGroup(); bg.add(left); bg.add(center); bg.add(right);
        JPanel alignPanel = new JPanel(new FlowLayout()); alignPanel.add(left); alignPanel.add(center); alignPanel.add(right);
        JPanel themePanel = new JPanel(new FlowLayout()); themeLabel = new JLabel(tr("theme")+":"); themePanel.add(themeLabel);
        themeBox = new JComboBox<>(themesRu); themePanel.add(themeBox);
        stylePanel.add(alignPanel); stylePanel.add(themePanel);
        stylePanel.setBorder(BorderFactory.createTitledBorder(tr("style")));
        c.gridy=row; c.gridx=0; c.gridwidth=2; add(stylePanel, c); row++;

        JPanel settingsPanel = new JPanel(new FlowLayout());
        allowHtml = new JCheckBox(tr("html")); allowHtml.setSelected(true);
        settingsPanel.add(allowHtml);
        settingsPanel.setBorder(BorderFactory.createTitledBorder(tr("settings")));
        c.gridy=row; add(settingsPanel, c); row++;

        convertBtn = new JButton(tr("convert")); convertBtn.setPreferredSize(new Dimension(160,35));
        JPanel btnPanel = new JPanel(); btnPanel.add(convertBtn);
        c.gridy=row; add(btnPanel, c); row++;

        status = new JLabel("✅ "+tr("ready")); status.setForeground(new Color(40,167,69)); c.gridy=row; add(status, c); row++;

        log = new JTextArea(); log.setEditable(false); log.setFont(new Font("Monospaced",0,11));
        log.setBackground(new Color(30,30,30)); log.setForeground(Color.GREEN);
        JScrollPane sp = new JScrollPane(log); sp.setBorder(BorderFactory.createTitledBorder(tr("logs")));
        c.gridy=row; c.fill = GridBagConstraints.BOTH; c.weighty = 1.0; add(sp, c);

        browseBtn.addActionListener(e -> { JFileChooser fc = new JFileChooser(dirField.getText());
            fc.setFileSelectionMode(JFileChooser.DIRECTORIES_ONLY);
            if(fc.showOpenDialog(this)==JFileChooser.APPROVE_OPTION) dirField.setText(fc.getSelectedFile().getAbsolutePath()); });
        convertBtn.addActionListener(e -> convert());
    }

    private void updateLang() {
        setTitle(tr("title"));
        langLabel.setText(tr("lang")+":");
        dirLabel.setText("📁 "+tr("folder")+":");
        nameLabel.setText("📄 "+tr("filename")+":");
        themeLabel.setText(tr("theme")+":");
        left.setText(tr("left")); center.setText(tr("center")); right.setText(tr("right"));
        allowHtml.setText(tr("html"));
        convertBtn.setText(tr("convert")); browseBtn.setText(tr("browse"));
        status.setText("✅ "+tr("ready"));
        String[] th = lang.equals("ru") ? themesRu : themesEn;
        themeBox.removeAllItems(); for(String s:th) themeBox.addItem(s);
        for(Component comp : getContentPane().getComponents()) {
            if(comp instanceof JPanel && ((JPanel)comp).getBorder() instanceof TitledBorder) {
                TitledBorder b = (TitledBorder)((JPanel)comp).getBorder();
                String t = b.getTitle();
                if(t.contains("Оформление")||t.contains("Style")) b.setTitle(tr("style"));
                else if(t.contains("Настройки")||t.contains("Settings")) b.setTitle(tr("settings"));
                else if(t.contains("Логи")||t.contains("Logs")) b.setTitle(tr("logs"));
                ((JPanel)comp).repaint();
            }
        }
    }

    private void createDirs() {
        try { Files.createDirectories(Path.of("resources")); Files.createDirectories(Path.of("converted"));
            dirField.setText(Path.of("resources").toString());
        } catch(IOException e) { log("❌ "+e.getMessage()); }
    }

    private void log(String msg) { SwingUtilities.invokeLater(() -> {
        log.append("["+new java.text.SimpleDateFormat("HH:mm:ss").format(new Date())+"] "+msg+"\n");
        log.setCaretPosition(log.getDocument().getLength());
    });}

    private void convert() {
        String dir = dirField.getText().trim(), name = nameField.getText().trim();
        if(name.isEmpty()) { JOptionPane.showMessageDialog(this, tr("empty")); return; }
        Path md = Path.of(dir, name+".md");
        if(!Files.exists(md)) { JOptionPane.showMessageDialog(this, tr("fileNot")+": "+md); return; }
        new Thread(() -> {
            try {
                log("📖 "+tr("reading")+": "+name+".md");
                SwingUtilities.invokeLater(() -> status.setText("⏳ "+tr("reading")));
                String content = Files.readString(md);
                String title = content.lines().filter(l->l.startsWith("# ")).findFirst().map(l->l.substring(2).trim()).orElse(tr("untitled"));
                String align = left.isSelected()?"left":center.isSelected()?"center":"right";
                int theme = themeBox.getSelectedIndex();
                String html = md2html(content, align, theme, allowHtml.isSelected(), title);
                Path out = Path.of("converted", name+".html");
                Files.writeString(out, html);
                log("✅ "+tr("success"));
                SwingUtilities.invokeLater(() -> {
                    status.setText("✅ "+tr("success"));
                    if(JOptionPane.showConfirmDialog(MarkdownToHTMLConverter.this, tr("saved")+": "+out+"\n"+tr("open"), tr("success"), JOptionPane.YES_NO_OPTION)==0)
                        try { Desktop.getDesktop().open(out.getParent().toFile()); } catch(IOException ex) { log("❌ "+ex.getMessage()); }
                });
            } catch(Exception ex) { log("❌ "+tr("error")+": "+ex.getMessage()); SwingUtilities.invokeLater(() -> status.setText("❌ "+tr("error"))); }
        }).start();
    }

    private String md2html(String md, String align, int theme, boolean allowHtml, String title) {
        StringBuilder out = new StringBuilder();
        out.append("<!DOCTYPE html><html><head><meta charset='UTF-8'><title>").append(escape(title)).append("</title><style>")
           .append(css(align, theme)).append("</style></head><body>\n");
        boolean inCode=false; StringBuilder code=null;
        boolean inList=false; String listTag=null;
        for(String ln : md.split("\n")) {
            String l = ln.trim();
            if(l.startsWith("```")) {
                if(!inCode) { inCode=true; code=new StringBuilder(); }
                else { inCode=false; out.append("<pre><code>").append(escape(code.toString())).append("</code></pre>\n"); }
                continue;
            }
            if(inCode) { code.append(ln).append("\n"); continue; }
            if(l.isEmpty()) { if(inList) { out.append("</").append(listTag).append(">\n"); inList=false; } continue; }
            if(l.matches("^#{1,6}\\s+.*")) {
                if(inList) { out.append("</").append(listTag).append(">\n"); inList=false; }
                int level = l.length() - l.replaceFirst("^#+", "").length();
                level = Math.min(6,Math.max(1,level));
                out.append("<h").append(level).append(">").append(inline(l.substring(level).trim(), allowHtml)).append("</h").append(level).append(">\n");
                continue;
            }
            if(l.startsWith(">")) { if(inList) out.append("</").append(listTag).append(">\n"); inList=false;
                out.append("<blockquote>").append(inline(l.substring(1).trim(), allowHtml)).append("</blockquote>\n"); continue; }
            if(l.matches("^[-*_]{3,}$")) { if(inList) out.append("</").append(listTag).append(">\n"); inList=false; out.append("<hr>\n"); continue; }
            if(l.matches("^[-*+]\\s+.*")) {
                String cont = inline(l.replaceFirst("^[-*+]\\s+", ""), allowHtml);
                if(!inList || !"ul".equals(listTag)) { if(inList) out.append("</").append(listTag).append(">\n"); out.append("<ul class='center-list'>\n"); inList=true; listTag="ul"; }
                out.append("<li>").append(cont).append("</li>\n"); continue;
            }
            if(l.matches("^\\d+\\.\\s+.*")) {
                String cont = inline(l.replaceFirst("^\\d+\\.\\s+", ""), allowHtml);
                if(!inList || !"ol".equals(listTag)) { if(inList) out.append("</").append(listTag).append(">\n"); out.append("<ol class='center-list'>\n"); inList=true; listTag="ol"; }
                out.append("<li>").append(cont).append("</li>\n"); continue;
            }
            if(l.contains("|") && l.split("\\|").length>2 && !l.contains("---")) {
                if(inList) out.append("</").append(listTag).append(">\n"); inList=false;
                String[] cells = l.split("\\|");
                out.append("<table>");
                for(String c: cells) if(!c.trim().isEmpty()) out.append("<td>").append(inline(c.trim(), allowHtml)).append("</td>");
                out.append("</tr>\n"); continue;
            }
            if(inList) { out.append("</").append(listTag).append(">\n"); inList=false; }
            out.append("<p>").append(inline(l, allowHtml)).append("</p>\n");
        }
        if(inList) out.append("</").append(listTag).append(">\n");
        out.append("</body></html>");
        return out.toString();
    }

    private String inline(String s, boolean html) {
        if(!html) s = escape(s);
        s = s.replaceAll("\\*\\*([^\\*]+)\\*\\*", "<strong>$1</strong>").replaceAll("__([^_]+)__", "<strong>$1</strong>")
             .replaceAll("\\*([^\\*]+)\\*", "<em>$1</em>").replaceAll("_([^_]+)_", "<em>$1</em>")
             .replaceAll("~~([^~]+)~~", "<del>$1</del>").replaceAll("`([^`]+)`", "<code>$1</code>");
        s = s.replace("&macr;","̄").replace("&copy;","©").replace("&reg;","®").replace("&trade;","™")
             .replace("&mdash;","—").replace("&ndash;","–").replace("&nbsp;"," ").replace("&lt;","<").replace("&gt;",">").replace("&amp;","&");
        Pattern p = Pattern.compile("\\[([^\\]]+)\\]\\(([^\\)]+)\\)");
        Matcher m = p.matcher(s); StringBuffer sb = new StringBuffer();
        while(m.find()) m.appendReplacement(sb, "<a href=\""+m.group(2)+"\">"+m.group(1)+"</a>");
        m.appendTail(sb); s = sb.toString();
        s = s.replaceAll("<(https?://[^>]+)>", "<a href=\"$1\">$1</a>");
        s = s.replaceAll("<([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,})>", "<a href=\"mailto:$1\">$1</a>");
        s = s.replace(":smile:","😊").replace(":laughing:","😆").replace(":blush:","😊").replace(":heart:","❤️").replace(":rocket:","🚀").replace(":star:","⭐");
        return s;
    }

    private String escape(String s) { return s.replace("&","&amp;").replace("<","&lt;").replace(">","&gt;").replace("\"","&quot;").replace("'","&#39;"); }

    private String css(String align, int th) {
        String ta = align.equals("left")?"left":align.equals("center")?"center":"right";
        String margin = align.equals("center")?"margin:0 auto;max-width:1100px;":"margin:0;";
        String[][] cols = {
            {"#fff","#24292e","#0366d6","#f6f8fa","#1e1e1e","#d4d4d4","#e1e4e8"},
            {"#1e1e1e","#d4d4d4","#3794ff","#2d2d2d","#0a0a0a","#d4d4d4","#404040"},
            {"#fbf7e9","#5b4636","#8b5a2b","#e8e0d0","#d9cdb3","#5b4636","#c9b896"},
            {"#e8f5e9","#2e7d32","#1b5e20","#c8e6c9","#1b5e20","#e8f5e9","#a5d6a7"},
            {"#e3f2fd","#0d47a1","#1976d2","#bbdefb","#0d47a1","#e3f2fd","#90caf9"},
            {"#1a1a2e","#e0e0e0","#4a6fa5","#16213e","#0f0f1a","#e0e0e0","#2a2a3e"},
            {"#efebe9","#4e342e","#8d6e63","#d7ccc8","#4e342e","#efebe9","#bcaaa4"},
            {"#e0f2f1","#00695c","#00897b","#b2dfdb","#00695c","#e0f2f1","#80cbc4"},
            {"#f3e5f5","#4a148c","#7b1fa2","#e1bee7","#4a148c","#f3e5f5","#ce93d8"},
            {"#fff3e0","#e65100","#f57c00","#ffe0b2","#e65100","#fff3e0","#ffcc80"},
            {"#e8eaf6","#1a237e","#3f51b5","#c5cae9","#1a237e","#e8eaf6","#9fa8da"},
            {"#ffebee","#b71c1c","#f44336","#ffcdd2","#b71c1c","#ffebee","#ef9a9a"},
            {"#fce4ec","#880e4f","#e91e63","#f8bbd0","#880e4f","#fce4ec","#f48fb1"},
            {"#0d0d0d","#e0e0e0","#6a1b9a","#1a1a1a","#000","#e0e0e0","#333"},
            {"#fff8e1","#f57f17","#ffb300","#ffecb3","#f57f17","#fff8e1","#ffe082"}
        };
        String[] c = cols[Math.min(th,14)];
        return "body{font-family:'Segoe UI',sans-serif;font-size:17px;line-height:1.7;color:"+c[1]+";background:"+c[0]+";"+margin+"padding:40px 50px;text-align:"+ta+"}"+
               "h1,h2,h3{color:"+c[1]+";margin-top:28px;margin-bottom:20px}"+
               "h1{font-size:2.1em;border-bottom:2px solid "+c[6]+";padding-bottom:10px}"+
               "h2{font-size:1.75em;border-bottom:1px solid "+c[6]+";padding-bottom:8px}"+
               "h3{font-size:1.45em}p{margin-bottom:20px}"+
               "a{color:"+c[2]+";text-decoration:none}a:hover{text-decoration:underline}"+
               "code{font-family:monospace;padding:3px 6px;font-size:15px;background:"+c[3]+";border-radius:4px;color:"+c[1]+"}"+
               "pre{background:"+c[4]+";border-radius:8px;padding:18px;overflow-x:auto;margin:20px 0}"+
               "pre code{color:"+c[5]+";background:0 0;font-size:14px;padding:0}"+
               "blockquote{padding:0 20px;color:#6a737d;border-left:4px solid "+c[6]+";font-style:italic;margin:20px 0}"+
               ".center-list{display:inline-block;text-align:left;margin:0 auto 16px;list-style-position:inside}"+
               "ul,ol{padding-left:0}li{text-align:"+ta+";margin:8px 0}"+
               "table{border-collapse:collapse;width:100%;margin:20px auto}th,td{border:1px solid "+c[6]+";padding:10px 15px}"+
               "th{background:"+c[3]+"}.task{margin:10px 0;text-align:"+ta+"}"+
               "@media(max-width:768px){body{padding:20px;font-size:15px}}";
    }
}
