import { Inputs } from "@/types";
import { prisma } from "./prisma";

export async function search(params: Inputs){
  console.log(params);
  const results = await prisma.dhsjr.findMany({
    where:{
      word:{
        contains: params.word
      },
      book_name:{
        contains: params.book_name
      },
      shoten:{
        contains: params.shoten
      },
      kana:{
        contains: params.kana
      },
      shoten_word:{
        contains: params.shoten_word
      },
      word_kana:{
        contains: params.word_kana
      },
    }
  })

  return results;
}