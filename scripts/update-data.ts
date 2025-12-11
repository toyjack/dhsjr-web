// Rewritten script to use Supabase instead of Prisma
import fs from "fs";
import path from "path";
import { parse } from "papaparse";
import { createClient } from "@supabase/supabase-js";
import type { Database, TablesInsert } from "@/types/supabase.type";

console.log("Updating Dhsjr data...");

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
  );
}

const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
  },
});

const dataFolderPath = path.resolve(process.cwd(), "contents/data/");

// Type for dhsjr insert - using Japanese column names
type DhsjrInsert = TablesInsert<"dhsjr">;

// Header mapping configuration - maps Japanese headers to Japanese column names
const HEADER_MAPPING: Record<string, keyof DhsjrInsert> = {
  ID: "ID",
  資料番号: "資料番号",
  資料名: "資料名",
  資料内漢字番号: "資料内漢字番号",
  資料内漢語番号: "資料内漢語番号",
  単字_見出し: "単字_見出し",
  単字_出現形: "単字_出現形",
  漢語_見出し: "漢語_見出し",
  漢語_出現形: "漢語_出現形",
  漢語_alphabet: "漢語_alphabet",
  語種: "語種",
  位置: "漢語内位置",
  単字長さ: "単字長",
  声点: "声点",
  声点型: "声点型",
  仮名注: "仮名注",
  仮名型: "仮名型",
  反切: "反切",
  類音: "類音",
  節博士: "節博士",
  その他: "その他",
  出現位置: "出現位置",
  備考: "備考",
} as const;

const INTEGER_FIELDS = new Set(["資料内漢語番号", "資料内漢字番号", "漢語内位置"]);

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
      .filter((file) => !file.startsWith(".")) // Filter out hidden files
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
function parseDataFile(filePath: string): DhsjrInsert[] {
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
          const parsed = Number.parseInt(value, 10);
          return Number.isNaN(parsed) ? null : parsed;
        }
        // Return null for empty strings to maintain database consistency
        return value === "" ? null : value;
      },
    });

    if (parseResult.errors.length > 0) {
      console.warn("Parse errors:", parseResult.errors);
    }

    return parseResult.data as unknown as DhsjrInsert[];
  } catch (error) {
    console.error("Error parsing data file:", error);
    throw error;
  }
}

/**
 * Updates database with parsed data using batch operations for better performance
 */
async function updateDhsjrData(data: DhsjrInsert[]): Promise<void> {
  const BATCH_SIZE = 100;
  let processed = 0;

  try {
    // Process data in batches for better performance
    for (let i = 0; i < data.length; i += BATCH_SIZE) {
      const batch = data.slice(i, i + BATCH_SIZE);

      // Use upsert for batch operations
      const { error } = await supabase.from("dhsjr").upsert(batch, {
        onConflict: "ID",
      });

      if (error) {
        console.error(`Error at batch ${i}-${i + batch.length}:`, error);
        throw error;
      }

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
