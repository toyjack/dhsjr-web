-- CreateTable
CREATE TABLE `Dhsjr` (
    `character_id` VARCHAR(191) NOT NULL,
    `book_id` VARCHAR(191) NULL,
    `book_name` VARCHAR(191) NULL,
    `index_in_book` INTEGER NULL,
    `word_index_in_book` INTEGER NULL,
    `character` VARCHAR(191) NULL,
    `character_original` VARCHAR(191) NULL,
    `word` VARCHAR(191) NULL,
    `word_original` VARCHAR(191) NULL,
    `word_alphabet` VARCHAR(191) NULL,
    `word_type` VARCHAR(191) NULL,
    `pos_in_word` INTEGER NULL,
    `len` VARCHAR(191) NULL,
    `shoten` VARCHAR(191) NULL,
    `shoten_word` VARCHAR(191) NULL,
    `kana` VARCHAR(191) NULL,
    `word_kana` VARCHAR(191) NULL,
    `fanqie` VARCHAR(191) NULL,
    `ruion` VARCHAR(191) NULL,
    `hakase` VARCHAR(191) NULL,
    `etc` VARCHAR(191) NULL,
    `position_in_book` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,

    PRIMARY KEY (`character_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
