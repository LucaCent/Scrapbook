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
      image: '../../assets/images/hunt-1.jpg',
      targets: [
        { x: 22, y: 28, r: 7, label: 'The red kite',    clue: 'Something that flies on a string' },
        { x: 71, y: 41, r: 7, label: 'The golden star', clue: 'It shines, but it is not the sun' },
        { x: 48, y: 76, r: 7, label: 'The heart stone', clue: 'Hidden near the ground, shaped like love' },
      ],
    },
    {
      image: '../../assets/images/hunt-2.jpg',
      targets: [
        { x: 15, y: 70, r: 7, label: 'The blue boat',   clue: 'It floats' },
        { x: 80, y: 22, r: 7, label: 'The little moon', clue: 'Up high, curved like a smile' },
        { x: 55, y: 50, r: 7, label: 'The key',         clue: 'It opens something' },
      ],
    },
  ],

  winMessage: 'Everything found, hiding place by hiding place.',
};
