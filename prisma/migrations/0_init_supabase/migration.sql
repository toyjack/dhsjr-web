-- CreateTable
CREATE TABLE "dhsjr" (
    "character_id" TEXT NOT NULL,
    "資料番号" TEXT,
    "資料名" TEXT,
    "資料内漢字番号" BIGINT NOT NULL,
    "資料内漢語番号" TEXT,
    "単字_見出し" TEXT,
    "単字_出現形" TEXT,
    "漢語_見出し" TEXT,
    "漢語_出現形" TEXT,
    "漢語_alphabet" TEXT,
    "語種" TEXT,
    "漢語内位置" TEXT,
    "単字長" TEXT,
    "声点" TEXT,
    "声点型" TEXT,
    "仮名注" TEXT,
    "仮名型" TEXT,
    "反切" TEXT,
    "類音" TEXT,
    "節博士" TEXT,
    "その他" TEXT,
    "出現位置" TEXT,
    "備考" TEXT,

    CONSTRAINT "dhsjr_pkey" PRIMARY KEY ("character_id")
);

