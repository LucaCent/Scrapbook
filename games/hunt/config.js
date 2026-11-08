// Hot & Cold Hunt — configuration.
//
// Targets are positioned in PERCENT of the photo: x from the left edge, y from
// the top edge, r = size of the "found" zone as a percent of the photo width.
// Percentages stay correct on any screen size.
//
// To place targets on your own photos: open the game with ?calibrate=1 on the
// end of the URL, tap each hiding place and copy the coordinates it prints.
window.GAME_CONFIG = {
  title: 'Hot & Cold Hunt',
  subtitle: 'Tap the photo to search. The warmer the colour, the closer you are.',

  rounds: [
    {
      image: '../../assets/images/hunt-1.jpg',          // the Christmas tree
      targets: [
        { x: 21.8, y: 16.8, r: 9,   label: 'The glowing holly', clue: 'Green neon leaves above the doorway' },
        { x: 75.3, y: 36.5, r: 5.5, label: 'The red heart',     clue: 'A heart on the tree with writing on it' },
        { x: 46.8, y: 46.8, r: 9,   label: 'The cuddle',        clue: 'Small, fluffy and being held' },
      ],
    },
    {
      image: '../../assets/images/hunt-2.jpg',          // the checkpoint in Berlin
      targets: [
        { x: 8.5,  y: 21,   r: 7.5, label: 'The Rock Shop',    clue: 'Somewhere to buy rock and roll souvenirs' },
        { x: 30.3, y: 25.2, r: 6, label: 'The checkpoint sign', clue: 'A sign above the little white hut' },
        { x: 54.5, y: 25,   r: 9, label: 'The flag tree',       clue: 'A fir tree hung with blue and yellow flags' },
      ],
    },
  ],

  winMessage: 'Everything found, hiding place by hiding place.',
};
