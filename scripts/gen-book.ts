import fs from "node:fs";

const bibFile = process.cwd() + "/contents/Bibliography_20240515.md";
const bibContents = fs.readFileSync(bibFile, "utf-8");
const bibLines = bibContents.split("\n");

const bookBlocks = convertBlock(bibLines, "# ");

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

function convertBlock(lines: string[], startsWith: string) {
  let results = [];

  for (const line of lines) {
    if (line === "") {
      continue;
    }
    if (line.startsWith(startsWith)) {
      results.push({
        title: line.replace(startsWith, ""),
        lines: [] as string[],
      });
    } else {
      results[results.length - 1].lines.push(line);
    }
  }

  return results;
}

// console.log(JSON.stringify(bookBlocks, null, 2));

let results = [];

for (const bookBlock of bookBlocks) {
  if (bookBlock.title === "更新情報" || bookBlock.title === "目次") {
    continue;
  }

  const book: Book = {
    id: "",
    title: "",
    age: "",
    owner: "",
    pictures: [],
    guide: [],
    information: [],
    inputor: [],
  };

  const titleLine = bookBlock.title.trim();

  if (titleLine.match(/^(\d\d-\d\d\d-\d\d).+/g)) {
    book.id = titleLine.replace(/^(\d\d-\d\d\d-\d\d).+/g, "$1");
  } else {
    console.error(`Invalid title: ${titleLine}`);
  }

  const titleBlocks = convertBlock(bookBlock.lines, "## ");
  // console.log(JSON.stringify(titleBlocks, null, 2));

  for (const block of titleBlocks) {
    const title = block.title.trim();
    const lines = block.lines.map((line) => line.trim().replace("- ", ""));

    if (title === "資料名") {
      book.title = lines.join("");
    } else if (title === "時代") {
      book.age = lines.join("");
    } else if (title === "原本所蔵") {
      book.owner = lines.join("");
    } else if (title.startsWith("影印・")) {
      book.pictures = lines;
    } else if (title === "入力凡例") {
      book.guide = lines;
    } else if (title === "字音情報") {
      book.information = lines;
    } else if (title.startsWith("参考文献")) {
      book.bibs = lines;
    } else if (title === "入力責任者") {
      book.inputor = lines;
    } else if (title === "その他") {
      book.etc = lines;
    } else {
      console.error(`Invalid title: ${title}`);
    }
  }

  // console.log(JSON.stringify(book, null, 2));
  results.push(book);
}

const jsonFile = process.cwd() + "/contents/books.json";
fs.writeFileSync(jsonFile, JSON.stringify(results, null, 2));
console.log("Results written to books.json");