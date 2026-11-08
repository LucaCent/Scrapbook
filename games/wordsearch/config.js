// Word Search — configuration.
//
// words: plain strings, or { word, clue }. With showClues: true the list shows
// the clue instead of the word, which turns the puzzle into a riddle hunt.
// Every word must fit inside the grid (length <= max(cols, rows)).
window.GAME_CONFIG = {
  title: 'Word Search',
  subtitle: 'Each clue hides a word. Drag across the letters to circle it.',

  image: '../../assets/images/wordsearch-1.jpg',
  caption: '',                       // optional line under the photo; empty = none

  // Banner shape. The photo is cropped to this ratio; bannerFocus chooses which
  // part is kept ("50% 40%" = centred sideways, a little above the middle).
  bannerAspect: '3 / 2',
  bannerFocus: '50% 40%',

  cols: 10,
  rows: 11,
  showClues: true,

  words: [
    { word: 'ITALIA',   clue: 'Written on the blue shirt' },
    { word: 'STATUE',   clue: 'Made of stone, standing behind' },
    { word: 'STAIRS',   clue: 'You climb these to reach the door' },
    { word: 'SHORTS',   clue: 'Denim, and perfect for a hot day' },
    { word: 'THUMB',    clue: 'The red one on the end of the stick' },
    { word: 'SUNSHINE', clue: 'Why the shadows are so sharp' },
  ],

  winMessage: 'Every word found.',
};
