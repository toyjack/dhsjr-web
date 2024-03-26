import fs from "fs";

export async function getBookData(bookId: string) {
  const filename = process.cwd() + "/contents/books/" + bookId + ".md";
  if (!fs.existsSync(filename)) {
    return null;
  }
  const bookContents = fs.readFileSync(filename, "utf-8");

  return bookContents;
}
