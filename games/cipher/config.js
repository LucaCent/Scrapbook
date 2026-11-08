// Cipher Dial — configuration.
//
// Each round is a Caesar-shift message. The page encrypts `plain` with `shift`
// (0-25) at runtime. Rounds with live: true show the decoded text as the dial
// turns and only need the dial set correctly. Rounds with live: false hide the
// decoded text; the player must read the message off the dial and type it.
window.GAME_CONFIG = {
  title: 'Cipher Dial',
  subtitle: 'Drag the inner ring to decode each secret message.',

  image: '../../assets/images/cipher-1.jpg',    // shown in the middle of the dial

  rounds: [
    { plain: 'I FOUND YOU',        shift: 3,  live: true,
      hint: 'Line the inner A up under the outer D.' },
    { plain: 'BERLIN PRAGUE VIENNA', shift: 7, live: true,
      hint: 'Line the inner A up under the outer H.' },
    { plain: 'ALWAYS AND FOREVER', shift: 4,  live: false,
      hint: 'The key is the number of letters in the word LOVE. Type what you decode.' },
  ],

  winMessage: 'All three messages decoded.',
};
