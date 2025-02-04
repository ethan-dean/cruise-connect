import { Filter } from 'bad-words';


const filter = new Filter();
const additionalFilteredWords: [string] = [
  "fuck",
];
filter.addWords(...additionalFilteredWords);

export default function filterProfanity(s: string): string {
  return filter.clean(s);
}
