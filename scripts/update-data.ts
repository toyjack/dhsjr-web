import fs from "fs";
import path from "path";
import { parse } from "papaparse";
import { Dhsjr } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const dataFolderPath = path.resolve(process.cwd(), "contents/data/");

// Get a list of all files in the data folder
const files = fs.readdirSync(dataFolderPath);

// Sort the files by their last modified time in descending order
const sortedFiles = files.sort((a, b) => {
  const filePathA = path.join(dataFolderPath, a);
  const filePathB = path.join(dataFolderPath, b);
  return (
    fs.statSync(filePathB).mtime.getTime() -
    fs.statSync(filePathA).mtime.getTime()
  );
});

// Get the newest file that is not a hidden file
const newestFile = sortedFiles.find((file) => !file.startsWith("."));
if (!newestFile) {
  console.error("No files found");
  process.exit(1);
}

// Read the contents of the newest file
const newestFileContents = fs.readFileSync(
  path.join(dataFolderPath, newestFile),
  "utf-8"
);

const headers = (header: string) => {
  const allHeaders: { [key: string]: string } = {
    ID: "character_id",
    資料番号: "book_id",
    資料名: "book_name",
    資料内漢字番号: "index_in_book",
    資料内漢語番号: "word_index_in_book",
    単字_見出し: "character",
    単字_出現形: "character_original",
    漢語_見出し: "word",
    漢語_出現形: "word_original",
    漢語_alphabet: "word_alphabet",
    語種: "word_type",
    位置: "pos_in_word",
    単字長さ: "len",
    声点: "shoten",
    声点型: "shoten_word",
    仮名注: "kana",
    仮名型: "word_kana",
    反切: "fanqie",
    類音: "ruion",
    節博士: "hakase",
    その他: "etc",
    出現位置: "position_in_book",
    備考: "notes",
  };
  return allHeaders[header];
};

// Parse the CSV file
const data = parse<Dhsjr>(newestFileContents, {
  delimiter: "\t",
  header: true,
  transformHeader: (header) => headers(header),
  transform: (value, header) => {
    if (
      header === "word_index_in_book" ||
      header === "index_in_book" ||
      header === "pos_in_word" 
    ) {
      return parseInt(value);
    }
    return value;
  },
});

// use prisma update Dhsjr data
const updateData = async () => {
  for (const row of data.data) {
    await prisma.dhsjr.upsert({
      where: { character_id: row.character_id },
      update: row,
      create: row,
    });
  }
};

updateData()
  .then(() => {
    console.log("Data updated successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
