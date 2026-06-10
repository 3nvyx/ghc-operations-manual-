/**
 * A lightweight utility to compile Markdown to HTML and decompile HTML to Markdown
 * to support disk-based operations manual editing with TipTap.
 */

export function markdownToHtml(md: string): string {
  if (!md) return "<p></p>";

  let html = md;

  // Normalize newlines
  html = html.replace(/\r\n/g, "\n");

  // Escape HTML tags to protect text formatting
  // Except for specific html tags we allow like <u> or <img>
  html = html
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/&lt;u&gt;/g, "<u>")
    .replace(/&lt;\/u&gt;/g, "</u>")
    .replace(/&lt;img (.*?)&gt;/g, "<img $1>")
    .replace(/&lt;table(.*?)&gt;/g, "<table$1>")
    .replace(/&lt;\/table&gt;/g, "</table>")
    .replace(/&lt;thead(.*?)&gt;/g, "<thead$1>")
    .replace(/&lt;\/thead&gt;/g, "</thead>")
    .replace(/&lt;tbody(.*?)&gt;/g, "<tbody$1>")
    .replace(/&lt;\/tbody&gt;/g, "</tbody>")
    .replace(/&lt;tr(.*?)&gt;/g, "<tr$1>")
    .replace(/&lt;\/tr&gt;/g, "</tr>")
    .replace(/&lt;th(.*?)&gt;/g, "<th$1>")
    .replace(/&lt;\/th&gt;/g, "</th>")
    .replace(/&lt;td(.*?)&gt;/g, "<td$1>")
    .replace(/&lt;\/td&gt;/g, "</td>");

  // Headings
  html = html.replace(/^# (.*?)$/gm, "<h1>$1</h1>");
  html = html.replace(/^## (.*?)$/gm, "<h2>$1</h2>");
  html = html.replace(/^### (.*?)$/gm, "<h3>$1</h3>");

  // Blockquotes
  html = html.replace(/^> (.*?)$/gm, "<blockquote>$1</blockquote>");

  // Horizontal rules
  html = html.replace(/^---$/gm, "<hr />");

  // Bold (**text** or __text__)
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/__(.*?)__/g, "<strong>$1</strong>");

  // Italic (*text* or _text_)
  html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");
  html = html.replace(/_(.*?)_/g, "<em>$1</em>");

  // Strikethrough (~~text~~)
  html = html.replace(/~~(.*?)~~/g, "<s>$1</s>");

  // Links ([text](url))
  html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>');

  // Parse lists (unordered and ordered)
  // First, group contiguous list lines
  const lines = html.split("\n");
  let inList = false;
  let listType: "ul" | "ol" | null = null;
  const resultLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Check for bullet list
    const isBullet = line.startsWith("- ") || line.startsWith("* ") || line.startsWith("+ ");
    // Check for ordered list (e.g. 1. )
    const isOrdered = /^\d+\.\s/.test(line);

    if (isBullet) {
      if (!inList || listType !== "ul") {
        if (inList) resultLines.push(listType === "ul" ? "</ul>" : "</ol>");
        resultLines.push("<ul>");
        inList = true;
        listType = "ul";
      }
      const itemContent = line.replace(/^[-*+]\s+/, "");
      resultLines.push(`<li>${itemContent}</li>`);
    } else if (isOrdered) {
      if (!inList || listType !== "ol") {
        if (inList) resultLines.push(listType === "ul" ? "</ul>" : "</ol>");
        resultLines.push("<ol>");
        inList = true;
        listType = "ol";
      }
      const itemContent = line.replace(/^\d+\.\s+/, "");
      resultLines.push(`<li>${itemContent}</li>`);
    } else {
      if (inList) {
        resultLines.push(listType === "ul" ? "</ul>" : "</ol>");
        inList = false;
        listType = null;
      }
      resultLines.push(lines[i]);
    }
  }

  if (inList) {
    resultLines.push(listType === "ul" ? "</ul>" : "</ol>");
  }

  html = resultLines.join("\n");

  // Wrap loose paragraph texts (lines that are not in blocks: h1-3, ul, ol, blockquote, table, hr)
  const paragraphs = html.split("\n\n");
  html = paragraphs
    .map((p) => {
      const trimmed = p.trim();
      if (!trimmed) return "";
      
      // If it's already wrapped in block elements, return as-is
      if (
        trimmed.startsWith("<h1") ||
        trimmed.startsWith("<h2") ||
        trimmed.startsWith("<h3") ||
        trimmed.startsWith("<ul") ||
        trimmed.startsWith("<ol") ||
        trimmed.startsWith("<blockquote") ||
        trimmed.startsWith("<table") ||
        trimmed.startsWith("<hr") ||
        trimmed.startsWith("<p")
      ) {
        return trimmed;
      }
      return `<p>${trimmed}</p>`;
    })
    .filter(Boolean)
    .join("\n\n");

  return html;
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)));
}

function stripBrowserEditingMarkup(value: string) {
  return value
    .replace(/<\/?(span|font)\b[^>]*>/gi, "")
    .replace(/<meta\b[^>]*>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
}

export function htmlToMarkdown(html: string): string {
  if (!html) return "";

  let md = stripBrowserEditingMarkup(decodeHtmlEntities(html));

  md = md
    .replace(/\r\n/g, "\n")
    .replace(/<div\b[^>]*><br\s*\/?><\/div>/gi, "\n")
    .replace(/<div\b[^>]*>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n");

  // Convert headings
  md = md.replace(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi, "# $1\n\n");
  md = md.replace(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi, "## $1\n\n");
  md = md.replace(/<h3\b[^>]*>([\s\S]*?)<\/h3>/gi, "### $1\n\n");

  // Blockquotes
  md = md.replace(/<blockquote\b[^>]*>([\s\S]*?)<\/blockquote>/gi, "> $1\n\n");

  // HRs
  md = md.replace(/<hr\b[^>]*\/?>/gi, "---\n\n");

  // Inline styling
  md = md.replace(/<strong\b[^>]*>([\s\S]*?)<\/strong>/gi, "**$1**");
  md = md.replace(/<b\b[^>]*>([\s\S]*?)<\/b>/gi, "**$1**");
  md = md.replace(/<em\b[^>]*>([\s\S]*?)<\/em>/gi, "*$1*");
  md = md.replace(/<i\b[^>]*>([\s\S]*?)<\/i>/gi, "*$1*");
  md = md.replace(/<s\b[^>]*>([\s\S]*?)<\/s>/gi, "~~$1~~");
  md = md.replace(/<strike\b[^>]*>([\s\S]*?)<\/strike>/gi, "~~$1~~");
  md = md.replace(/<del\b[^>]*>([\s\S]*?)<\/del>/gi, "~~$1~~");

  // Links
  md = md.replace(/<a\s+(?:[^>]*?\s+)?href="([^"]*)"[^>]*>(.*?)<\/a>/gi, "[$2]($1)");

  // Unordered lists
  // Since we might have multiple lists, we can parse them using matches
  md = md.replace(/<ul\b[^>]*>([\s\S]*?)<\/ul>/gi, (_match, listContent) => {
    return (
      listContent
        .replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, "- $1\n")
        .trim() + "\n\n"
    );
  });

  // Ordered lists
  md = md.replace(/<ol\b[^>]*>([\s\S]*?)<\/ol>/gi, (_match, listContent) => {
    let index = 1;
    return (
      listContent
        .replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, (_itemMatch: string, itemContent: string) => {
          return `${index++}. ${itemContent}\n`;
        })
        .trim() + "\n\n"
    );
  });

  // Paragraph tags
  md = md.replace(/<p\b[^>]*>([\s\S]*?)<\/p>/gi, "$1\n\n");

  md = stripBrowserEditingMarkup(md);

  // Strip remaining editor-only markup while preserving table markup for existing docs.
  md = md.replace(
    /<(?!\/?(table|thead|tbody|tr|td|th|img|u)\b)[^>]+>/gi,
    ""
  );

  // Clean empty paragraphs or spacing issues
  md = md
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n");

  return md.trim();
}
