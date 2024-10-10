import {atom, createStore} from "jotai";

export const store = createStore();

export const perPageAtom = atom(100);
export const themeAtom = atom("light");
export const currentIFFFViewerAtom = atom("tify");