import fs from "node:fs";
import path from "node:path";

type Book = {
  id: string;
  title: string;
  age: string;
  owner: string;
  pictures: string[];
  guide: string[];
  information: string[];
  inputor: string[];
  bibs?: string[];
  etc?: string[];
};

type BookSection = {
  heading: string;
  lines: string[];
};

type BookBlock = {
  id: string;
  heading: string;
  sections: BookSection[];
};

const sourceFile = path.join(process.cwd(), "contents", "Bibliography.md");
const outputFile = path.join(process.cwd(), "contents", "books.json");

const headingPattern = /^#\s+(\d{2}-\d{3}-\d{2})(?:[-,].*)?$/;
const sectionPattern = /^##\s+(.+)$/;

function cleanValue(line: string) {
  return line.trim().replace(/^-\s+/, "");
}

function parseBibliography(markdown: string) {
  const blocks: BookBlock[] = [];
  let currentBook: BookBlock | null = null;
  let currentSection: BookSection | null = null;

  for (const rawLine of markdown.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line === "[↑トップへ](#top)") {
      continue;
    }

    const headingMatch = line.match(headingPattern);
    if (headingMatch) {
      currentBook = {
        id: headingMatch[1],
        heading: line.replace(/^#\s+/, ""),
        sections: [],
      };
      blocks.push(currentBook);
      currentSection = null;
      continue;
    }

    if (!currentBook) {
      continue;
    }

    const sectionMatch = line.match(sectionPattern);
    if (sectionMatch) {
      currentSection = {
        heading: sectionMatch[1].trim(),
        lines: [],
      };
      currentBook.sections.push(currentSection);
      continue;
    }

    if (currentSection) {
      currentSection.lines.push(cleanValue(line));
    }
  }

  return blocks;
}

function toBook(block: BookBlock) {
  const book: Book = {
    id: block.id,
    title: "",
    age: "",
    owner: "",
    pictures: [],
    guide: [],
    information: [],
    inputor: [],
  };

  for (const section of block.sections) {
    const values = section.lines.filter(Boolean);

    if (section.heading === "資料名") {
      book.title = values.join("");
    } else if (section.heading === "時代") {
      book.age = values.join("");
    } else if (section.heading === "原本所蔵") {
      book.owner = values.join("");
    } else if (section.heading.startsWith("影印・")) {
      book.pictures = values;
    } else if (section.heading === "入力凡例") {
      book.guide = values;
    } else if (section.heading === "字音情報") {
      book.information = values;
    } else if (section.heading.startsWith("参考文献")) {
      book.bibs = values;
    } else if (section.heading === "入力責任者") {
      book.inputor = values;
    } else if (section.heading === "その他") {
      book.etc = values;
    } else {
      console.warn(`Unknown section "${section.heading}" in ${block.heading}`);
    }
  }

  return book;
}

const markdown = fs.readFileSync(sourceFile, "utf-8");
const books = parseBibliography(markdown).map(toBook);

fs.writeFileSync(outputFile, `${JSON.stringify(books, null, 2)}\n`);

console.log(`Generated ${books.length} books in ${path.relative(process.cwd(), outputFile)}`);
