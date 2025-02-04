import { Filter } from 'bad-words';


const filter = new Filter();
const additionalFilteredWords: [string] = [
  "fuck",
];
filter.addWords(...additionalFilteredWords);

function filterProfanity(s: string): string {
  return filter.clean(s);
}

export {
  filterProfanity,
};
