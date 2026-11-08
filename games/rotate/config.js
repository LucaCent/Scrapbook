// Twist & Turn — configuration.
window.GAME_CONFIG = {
  title: 'Twist & Turn',
  subtitle: 'Tap a tile to turn it a quarter-turn. Make the photo upright.',

  // One level per entry. Each level may use its own photo and grid size.
  levels: [
    { image: '../../assets/images/rotate-1.jpg', cols: 3, rows: 4 },
    { image: '../../assets/images/rotate-2.jpg', cols: 4, rows: 5 },
  ],

  showCorrect: true,   // outline tiles that are already the right way up
  winMessage: 'Both pictures are the right way up again.',
};
