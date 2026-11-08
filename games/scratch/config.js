// Scratch Card — configuration (edit freely; no code changes needed).
window.GAME_CONFIG = {
  title: 'Scratch Card',
  subtitle: 'Scratch away the foil to uncover each photo.',

  // One round per image. Add or remove entries to change the number of rounds.
  rounds: [
    { image: '../../assets/images/scratch-1.jpg' },
    { image: '../../assets/images/scratch-2.jpg' },
    { image: '../../assets/images/scratch-3.jpg' },
  ],

  brushRadius: 26,        // CSS pixels; a finger is roughly 20–30
  revealThreshold: 0.6,   // fraction of foil that must be cleared (0–1)
  winMessage: 'Every photo uncovered. Here is your first letter.',
};
