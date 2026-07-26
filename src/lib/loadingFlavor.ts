/** One-shot loading lines — pick once per page load. */
export const LOADING_FLAVOR = [
  // General / cozy
  'Waking up the watch party…',
  'Warming the couch cushions…',
  'Almost ready — don\'t blink…',
  'Putting the kettle on…',
  'Opening the shared room…',

  // Calcifer / streaks
  'Lighting Calcifer…',
  'Asking Calcifer to behave…',
  'Telling Calcifer not to set the couch on fire…',
  'Polishing the golden streak…',
  'Counting today\'s tiny wins…',
  'Checking if it\'s a golden day…',

  // Dailies / games
  'Shuffling Connections categories…',
  'Stacking today\'s Stackdown…',
  'Setting up the Chess board…',
  'Buttering the Waffle…',
  'Lining up today\'s dailies…',
  'Marking the calendar squares…',

  // Watchlist
  'Queuing something to watch with Jo…',
  'Flipping to the next episode…',
  'Sorting anime from movies…',
  'Dusting off the watchlist…',
  'Asking "what next?"…',

  // Pets / furniture
  'Herding cats across the wallpaper…',
  'Bribing the pets with treats…',
  'Fluffing the donut bed…',
  'Untangling yarn from the room…',
  'Watering the fountain…',
  'Straightening the cat tree…',
  'Hiding the feather teaser…',
  'Measuring for more furniture…',

  // Notices / banners
  'Checking what\'s coming soon…',
  'Counting down to the next premiere…',
  'Pinning tonight\'s posters…',

  // Sync / login
  'Syncing with Jo…',
  'Catching up the shared room…',
  'Unlocking the door with Google…',
  'Fetching the good vibes…',

  // Soft meta / silly
  'Bribing the wallpaper cats to drift slower…',
  'Finding where Calcifer left the remote…',
  'Convincing a pet to take a bath…',
  'Whispering spoilers to nobody…',

  // Fun day extras
  'Drafting a "just because" text to Jo…',
  'Checking the Valorant store (for science)…',
  'Preparing to ask Jo how her day was…',
  'Warming up the cry corner…',
  'Practicing "gn slep wal"…',
  'Remembering to say hi to Joha…',
] as const

export function pickLoadingFlavor(): string {
  return LOADING_FLAVOR[Math.floor(Math.random() * LOADING_FLAVOR.length)]!
}
