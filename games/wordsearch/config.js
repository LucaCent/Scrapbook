// Word Search — configuration.
//
// words: plain strings, or { word, clue }. With showClues: true the list shows
// the clue instead of the word, which turns the puzzle into a riddle hunt.
// Every word must fit inside the grid (length <= max(cols, rows)).
window.GAME_CONFIG = {
  title: 'Word Search',
  subtitle: 'Drag across the letters to circle each hidden word.',

  image: '../../assets/images/wordsearch-1.jpg',
  caption: 'Words from this page',

  cols: 10,
  rows: 11,
  showClues: false,

  words: [
    { word: 'SUNSET',   clue: 'End of a golden day' },
    { word: 'KITE',     clue: 'Flies on a string' },
    { word: 'PICNIC',   clue: 'Lunch on the grass' },
    { word: 'LAUGHTER', clue: 'The best sound' },
    { word: 'ADVENTURE', clue: 'Where we went' },
    { word: 'FOREVER',  clue: 'How long, ideally' },
  ],

  winMessage: 'Every word found.',
};
