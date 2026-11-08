// Paint by Numbers — configuration.
//
// The page turns the photo into a numbered grid at load time (no preparation
// needed): it averages the photo into cols x rows cells, then groups the cell
// colours into `colors` palette entries using k-means clustering.
window.GAME_CONFIG = {
  title: 'Paint by Numbers',
  subtitle: 'Pick a colour, then paint every square that carries its number.',

  image: '../../assets/images/paint-1.jpg',

  cols: 16,       // squares across; rows follow the photo's proportions
  colors: 7,      // palette size (5-10 works best)

  winMessage: 'The picture is complete. One last letter.',
};
