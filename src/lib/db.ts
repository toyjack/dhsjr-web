import { BookList, Inputs } from "@/types";
import { prisma } from "./prisma";

const PAGE = 1;
const PER_PAGE = 100;

export async function getBookList() {
  const results = await prisma.dhsjr.groupBy({
    by: ["book_id", "book_name"],
    orderBy: {
      book_id: "asc",
    },
  });

  return results as BookList;
}

export async function searchAll(term: string, page = PAGE, perPage = PER_PAGE) {
  const where = {
    OR: [
      {
        character: {
          contains: term,
        },
      },
      {
        kana: {
          contains: term,
        },
      },
      {
        word: {
          contains: term,
        },
      },
      {
        shoten: {
          contains: term,
        },
      },
      {
        shoten_word: {
          contains: term,
        },
      },
      {
        word_kana: {
          contains: term,
        },
      },
      {
        book_name: {
          contains: term,
        },
      },
      {
        word_alphabet: {
          contains: term,
        },
      },
      {
        word_type: {
          contains: term,
        },
      },
      {
        fanqie: {
          contains: term,
        },
      },
      {
        ruion: {
          contains: term,
        },
      },
      {
        etc: {
          contains: term,
        },
      },
      {
        notes: {
          contains: term,
        },
      },
    ],
  };

  const [results, resultsCount] = await Promise.all([
    prisma.dhsjr.findMany({
      skip: (page - 1) * perPage,
      take: perPage,
      where,
    }),
    prisma.dhsjr.count({
      where,
    }),
  ]);

  return {
    meta: {
      query: { term },
      count: resultsCount,
      page,
      perPage,
    },
    data: results,
  };
}

export async function search(params: Inputs, page = PAGE, perPage = PER_PAGE) {
  const where = {
    character: params.character || undefined,
    word: {
      contains: params.word || undefined,
    },
    book_name: {
      contains: params.book_name || undefined,
    },
    shoten: {
      contains: params.shoten || undefined,
    },
    kana: {
      contains: params.kana || undefined,
    },
    shoten_word: {
      contains: params.shoten_word || undefined,
    },
    word_kana: {
      contains: params.word_kana || undefined,
    },
    fanqie: {
      contains: params.fanqie || undefined,
    },
    ruion: {
      contains: params.ruion || undefined,
    },
    etc:{
      contains: params.etc || undefined,
    },
    notes:{
      contains: params.notes || undefined,
    },
    book_id: params.book_id || undefined,
  };

  const [results, resultsCount] = await Promise.all([
    prisma.dhsjr.findMany({
      skip: (page - 1) * perPage,
      take: perPage,
      where,
    }),
    prisma.dhsjr.count({
      where,
    }),
  ]);

  return {
    meta: {
      query: params,
      count: resultsCount,
      page,
      perPage,
    },
    data: results,
  };
}
