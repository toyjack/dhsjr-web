import { Inputs } from "@/types";
import { prisma } from "./prisma";

export async function searchAll(term: string){
  const results = await prisma.dhsjr.findMany({
    where:{
      OR:[
        {
          character:{
            contains: term
          }
        },
        {
          kana:{
            contains:term
          }
        },
        {
          word:{
            contains:term
          }
        },
        {
          shoten:{
            contains:term
          }
        },
        {
          shoten_word:{
            contains:term
          }
        },
        {
          word_kana:{
            contains:term
          }
        },
        {
          book_name:{
            contains:term
          }
        },
        {
          word_alphabet:{
            contains:term
          }
        },
        {
          word_type:{
            contains:term
          }
        },
        {
          fanqie:{
            contains:term
          }
        },
        {
          ruion:{
            contains:term
          }
        },
        {
          etc:{
            contains:term
          }
        },
        {
          notes:{
            contains:term
          }
        }
      ]
    }
  
  })

  return results;
}

export async function search(params: Inputs){
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