// Rewritten script with Claude Sonnet 4
import fs from "fs";
import path from "path";
import { parse } from "papaparse";
import { Dhsjr } from "@prisma/client";
import { prisma } from "@/lib/prisma";

console.log("Updating Dhsjr data...");

const dataFolderPath = path.resolve(process.cwd(), "contents/data/");

// Header mapping configuration
const HEADER_MAPPING: Record<string, keyof Dhsjr> = {
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
} as const;

const INTEGER_FIELDS = new Set(["word_index_in_book", "index_in_book", "pos_in_word"]);

/**
 * Gets the newest non-hidden file from the data directory
 */
function getNewestDataFile(): string {
  try {
    const files = fs.readdirSync(dataFolderPath);
    
    if (files.length === 0) {
      throw new Error("No files found in data directory");
    }

    console.log(`Found ${files.length} files in the data folder.`);

    // Sort files by modification time (newest first)
    const sortedFiles = files
      .filter(file => !file.startsWith(".")) // Filter out hidden files
      .sort((a, b) => {
        const statsA = fs.statSync(path.join(dataFolderPath, a));
        const statsB = fs.statSync(path.join(dataFolderPath, b));
        return statsB.mtime.getTime() - statsA.mtime.getTime();
      });

    if (sortedFiles.length === 0) {
      throw new Error("No non-hidden files found in data directory");
    }

    return sortedFiles[0];
  } catch (error) {
    console.error("Error reading data directory:", error);
    throw error;
  }
}

/**
 * Parses CSV file and transforms data
 */
function parseDataFile(filePath: string): Dhsjr[] {
  try {
    const fileContents = fs.readFileSync(filePath, "utf-8");
    
    const parseResult = parse<Record<string, string>>(fileContents, {
      delimiter: "\t",
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => HEADER_MAPPING[header] || header,
      transform: (value: string, field: string) => {
        // Convert integer fields
        if (INTEGER_FIELDS.has(field) && value) {
          const parsed = parseInt(value, 10);
          return isNaN(parsed) ? null : parsed;
        }
        // Return null for empty strings to maintain database consistency
        return value === "" ? null : value;
      },
    });

    if (parseResult.errors.length > 0) {
      console.warn("Parse errors:", parseResult.errors);
    }
    // @ts-ignore
    return parseResult.data as Dhsjr[];
  } catch (error) {
    console.error("Error parsing data file:", error);
    throw error;
  }
}

/**
 * Updates database with parsed data using batch operations for better performance
 */
async function updateDhsjrData(data: Dhsjr[]): Promise<void> {
  const BATCH_SIZE = 100;
  let processed = 0;

  try {
    // Process data in batches for better performance
    for (let i = 0; i < data.length; i += BATCH_SIZE) {
      const batch = data.slice(i, i + BATCH_SIZE);
      
      // Use transaction for batch operations
      await prisma.$transaction(
        batch.map(row => 
          prisma.dhsjr.upsert({
            where: { character_id: row.character_id },
            update: row,
            create: row,
          })
        )
      );

      processed += batch.length;
      console.log(`Processed ${processed}/${data.length} records...`);
    }

    console.log(`Successfully processed all ${data.length} records`);
  } catch (error) {
    console.error(`Error updating data at record ${processed + 1}:`, error);
    throw error;
  }
}

/**
 * Main execution function
 */
async function main(): Promise<void> {
  try {
    // Get newest file
    const newestFile = getNewestDataFile();
    const filePath = path.join(dataFolderPath, newestFile);
    
    console.log(`Processing file: ${newestFile}`);

    // Parse data
    const data = parseDataFile(filePath);
    console.log(`Parsed ${data.length} rows from the file.`);

    if (data.length === 0) {
      console.warn("No data to process");
      return;
    }

    // Update database
    await updateDhsjrData(data);
    console.log("Data updated successfully");

  } catch (error) {
    console.error("Fatal error:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute main function
main()
  .then(() => {
    console.log("Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Script failed:", error);
    process.exit(1);
  });
