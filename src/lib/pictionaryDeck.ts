/** Pictionary word cards, themes, and round modifiers. */
import { PICTIONARY_MORE_WORDS } from './pictionaryDeckMore'

export type PictionaryDifficulty = 'easy' | 'medium' | 'hard'

export const PICTIONARY_DIFFICULTIES: readonly PictionaryDifficulty[] = [
  'easy',
  'medium',
  'hard',
]

/** Max points a guesser can earn for each difficulty (instant guess). */
export const PICTIONARY_DIFFICULTY_POINTS: Record<PictionaryDifficulty, number> = {
  easy: 100,
  medium: 200,
  hard: 300,
}

export const PICTIONARY_DIFFICULTY_LABEL: Record<PictionaryDifficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
}

export type PictionaryThemeId =
  | 'objects'
  | 'people'
  | 'actions'
  | 'animals'
  | 'places'
  | 'difficult'
  | 'food'
  | 'household'
  | 'nature'
  | 'vehicles'
  | 'sports'
  | 'music'
  | 'fantasy'
  | 'fairytales'
  | 'space'
  | 'ocean'
  | 'clothing'
  | 'body'
  | 'jobs'
  | 'games'
  | 'disney'
  | 'internet'
  | 'compound'
  | 'superheroes'
  | 'toys'
  | 'spooky'
  | 'countries'
  | 'school'
  | 'anime'
  | 'datenight'
  | 'rooms'
  | 'brands'
  | 'emojis'
  | 'fastfood'
  | 'desserts'
  | 'breakfast'
  | 'medieval'
  | 'pets'
  | 'farm'
  | 'travel'
  | 'hobbies'
  | 'movies'
  | 'holidays'
  | 'cats'
  | 'valorant'
  | 'idioms'

/** `all` mixes every built-in theme (plus custom cards when present). */
export type PictionaryDeckId = 'all' | PictionaryThemeId | 'custom'

export const PICTIONARY_CUSTOM_THEME = 'custom'

export type PictionaryCard = {
  id: string
  word: string
  difficulty: PictionaryDifficulty
  /** Theme id, or `custom`. */
  theme: string
}

type ThemeDef = {
  id: PictionaryThemeId
  label: string
  emoji: string
  words: Record<PictionaryDifficulty, readonly string[]>
}

/**
 * Classic Pictionary categories first (Object, Person, Action, Animal, Place,
 * Difficult), then the extra decks.
 */
const THEMES: readonly ThemeDef[] = [
  {
    id: 'objects',
    label: 'Objects',
    emoji: '📦',
    words: {
      easy: ['hat', 'shoe', 'ball', 'kite', 'pencil', 'glasses', 'sock', 'crown', 'backpack', 'watch', 'ring', 'sword', 'camera', 'paintbrush', 'flashlight', 'magnet', 'envelope', 'button', 'rope', 'map'],
      medium: ['anchor', 'compass', 'hourglass', 'telescope', 'binoculars', 'microscope', 'parachute', 'hammock', 'wheelbarrow', 'padlock', 'trophy', 'treasure chest', 'megaphone', 'snow globe', 'piggy bank', 'traffic cone', 'fire hydrant', 'mailbox', 'stethoscope', 'magnifying glass'],
      hard: ["Rubik's cube", 'metronome', 'sundial', 'periscope', 'boomerang', 'kaleidoscope', 'slingshot', 'pogo stick', 'jack-in-the-box', 'Swiss Army knife', 'whoopee cushion', 'lightsaber', 'dreamcatcher', 'record player', 'typewriter', 'abacus', 'Slinky', 'rotary phone', 'crystal ball', 'time machine'],
    },
  },
  {
    id: 'people',
    label: 'People',
    emoji: '🧑',
    words: {
      easy: ['baby', 'king', 'queen', 'pirate', 'clown', 'doctor', 'chef', 'cowboy', 'firefighter', 'police officer', 'teacher', 'robot', 'princess', 'wizard', 'ninja', 'mermaid', 'astronaut', 'farmer', 'superhero', 'zombie'],
      medium: ['lifeguard', 'magician', 'mail carrier', 'referee', 'scuba diver', 'DJ', 'ballerina', 'knight', 'caveman', 'lumberjack', 'mime', 'scientist', 'barber', 'detective', 'plumber', 'pilot', 'dentist', 'cheerleader', 'construction worker', 'beekeeper'],
      hard: ['Albert Einstein', 'Mona Lisa', 'Cleopatra', 'Abraham Lincoln', 'Elvis Presley', 'Michael Jackson', 'Taylor Swift', 'Napoleon', 'Shakespeare', 'Mr. Bean', 'Sherlock Holmes', 'Robin Hood', 'Tarzan', 'Pinocchio', 'Dracula', 'Frankenstein', 'Medusa', 'Charlie Chaplin', 'Darth Vader', 'Mario'],
    },
  },
  {
    id: 'actions',
    label: 'Actions',
    emoji: '🏃',
    words: {
      easy: ['run', 'jump', 'sleep', 'swim', 'eat', 'cry', 'laugh', 'sing', 'dance', 'read', 'wave', 'fly', 'walk', 'kick', 'clap', 'throw', 'sit', 'hug', 'climb', 'cook'],
      medium: ['juggling', 'skateboarding', 'fishing', 'sneezing', 'yawning', 'painting', 'bowling', 'surfing', 'knitting', 'hiking', 'brushing teeth', 'taking a selfie', 'rowing', 'ice skating', 'sweeping', 'whistling', 'tiptoeing', 'hula hooping', 'shoveling snow', 'blowing bubbles'],
      hard: ['sleepwalking', 'procrastinating', 'moonwalking', 'photobombing', 'parallel parking', 'eavesdropping', 'daydreaming', 'binge-watching', 'tightrope walking', 'hiccuping', 'ghosting', 'meditating', 'speed dating', 'crowd surfing', 'doom scrolling', 'singing karaoke', 'sunbathing', 'sleep talking', 'skydiving', 'brainstorming'],
    },
  },
  {
    id: 'animals',
    label: 'Animals',
    emoji: '🐾',
    words: {
      easy: ['cat', 'dog', 'fish', 'bird', 'snake', 'cow', 'pig', 'duck', 'frog', 'bee', 'spider', 'turtle', 'horse', 'sheep', 'rabbit', 'chicken', 'lion', 'bear', 'monkey', 'butterfly'],
      medium: ['giraffe', 'elephant', 'penguin', 'octopus', 'kangaroo', 'flamingo', 'crab', 'bat', 'owl', 'snail', 'jellyfish', 'peacock', 'zebra', 'camel', 'shark', 'dolphin', 'gorilla', 'koala', 'parrot', 'skunk'],
      hard: ['platypus', 'chameleon', 'narwhal', 'sloth', 'armadillo', 'seahorse', 'porcupine', 'axolotl', 'hedgehog', 'walrus', 'moth', 'anteater', 'pufferfish', 'praying mantis', 'hammerhead shark', 'manta ray', 'star-nosed mole', 'blobfish', 'pangolin', 'mantis shrimp'],
    },
  },
  {
    id: 'places',
    label: 'Places',
    emoji: '🗺️',
    words: {
      easy: ['house', 'beach', 'school', 'park', 'castle', 'farm', 'island', 'cave', 'bridge', 'mountain', 'desert', 'tent', 'city', 'forest', 'river', 'jungle', 'igloo', 'church', 'garden', 'ocean'],
      medium: ['airport', 'hospital', 'library', 'zoo', 'lighthouse', 'volcano', 'waterfall', 'playground', 'gas station', 'museum', 'bowling alley', 'movie theater', 'skyscraper', 'carnival', 'aquarium', 'swamp', 'train station', 'ski resort', 'campsite', 'haunted house'],
      hard: ['Eiffel Tower', 'Statue of Liberty', 'pyramids', 'Great Wall of China', 'Golden Gate Bridge', 'Stonehenge', 'Leaning Tower of Pisa', 'Mount Rushmore', 'Disneyland', 'Las Vegas', 'Venice', 'Hollywood sign', 'Big Ben', 'Taj Mahal', 'Sydney Opera House', 'Colosseum', 'Machu Picchu', 'Times Square', 'Niagara Falls', 'Mount Everest'],
    },
  },
  {
    id: 'difficult',
    label: 'Difficult',
    emoji: '🧠',
    words: {
      easy: ['happy', 'angry', 'cold', 'loud', 'fast', 'tired', 'scared', 'hungry', 'rich', 'old', 'tall', 'upside down', 'hot', 'broken', 'quiet', 'empty', 'lucky', 'dizzy', 'sticky', 'shy'],
      medium: ['gravity', 'echo', 'shadow', 'jealousy', 'freedom', 'wisdom', 'magic', 'peace', 'secret', 'gossip', 'invisible', 'balance', 'history', 'success', 'deadline', 'teamwork', 'homesick', 'sarcasm', 'password', 'emergency'],
      hard: ['déjà vu', 'nostalgia', 'karma', 'infinity', 'democracy', 'inflation', 'irony', 'evolution', 'time travel', 'artificial intelligence', 'the internet', 'cryptocurrency', 'global warming', 'jet lag', "writer's block", 'conspiracy theory', 'midlife crisis', 'butterfly effect', "Murphy's law", 'FOMO'],
    },
  },
  {
    id: 'food',
    label: 'Food',
    emoji: '🍕',
    words: {
      easy: ['pizza', 'apple', 'banana', 'egg', 'cake', 'ice cream', 'cookie', 'carrot', 'cheese', 'bread', 'donut', 'cherry', 'grapes', 'strawberry', 'orange', 'cupcake', 'lollipop', 'french fries', 'sandwich', 'lemon'],
      medium: ['sushi', 'taco', 'hamburger', 'spaghetti', 'pancakes', 'popcorn', 'hot dog', 'watermelon', 'pineapple', 'croissant', 'burrito', 'corn on the cob', 'broccoli', 'cotton candy', 'pie', 'milkshake', 'nachos', 'waffle', 'onion rings', 'mushroom'],
      hard: ['dumplings', 'boba tea', 'fondue', 'gingerbread house', 'ramen', 'lasagna', "s'mores", 'charcuterie board', 'fortune cookie', 'kebab', 'pretzel', 'avocado toast', 'spring rolls', 'paella', 'tiramisu', 'crème brûlée', 'eggs Benedict', 'banana split', 'poke bowl', 'baked Alaska'],
    },
  },
  {
    id: 'household',
    label: 'Household',
    emoji: '🏠',
    words: {
      easy: ['chair', 'lamp', 'bed', 'door', 'clock', 'cup', 'key', 'spoon', 'window', 'book', 'phone', 'toothbrush', 'fork', 'plate', 'pillow', 'towel', 'soap', 'broom', 'table', 'bucket'],
      medium: ['toaster', 'umbrella', 'ladder', 'vacuum', 'couch', 'bathtub', 'mirror', 'fridge', 'scissors', 'candle', 'remote control', 'laundry basket', 'washing machine', 'microwave', 'kettle', 'stapler', 'alarm clock', 'light bulb', 'trash can', 'dishwasher'],
      hard: ['ceiling fan', 'smoke alarm', 'ironing board', 'doorbell', 'thermostat', 'coat hanger', 'power strip', 'blender', 'mousetrap', 'rocking chair', 'extension cord', 'shower curtain', 'lava lamp', 'air fryer', 'robot vacuum', 'welcome mat', 'junk drawer', 'bunk bed', 'dish rack', 'wind chime'],
    },
  },
  {
    id: 'nature',
    label: 'Nature & Weather',
    emoji: '🌿',
    words: {
      easy: ['sun', 'moon', 'star', 'cloud', 'rain', 'snow', 'tree', 'flower', 'leaf', 'rainbow', 'lightning', 'grass', 'rock', 'wave', 'fire', 'wind', 'cactus', 'palm tree', 'snowflake', 'puddle'],
      medium: ['tornado', 'earthquake', 'avalanche', 'iceberg', 'sunset', 'eclipse', 'glacier', 'coral reef', 'sunflower', 'pinecone', 'acorn', 'seashell', 'thunderstorm', 'fog', 'hail', 'meteor', 'comet', 'quicksand', 'bonfire', 'tide pool'],
      hard: ['northern lights', 'photosynthesis', 'hurricane', 'tsunami', 'erosion', 'food chain', 'fossil', 'geyser', 'constellation', 'solar system', 'ecosystem', 'sand dune', 'stalactite', 'Venus flytrap', 'evaporation', 'mirage', 'hibernation', 'migration', 'the water cycle', 'monsoon'],
    },
  },
  {
    id: 'vehicles',
    label: 'Vehicles',
    emoji: '🚗',
    words: {
      easy: ['car', 'bus', 'train', 'boat', 'airplane', 'bicycle', 'truck', 'rocket', 'helicopter', 'tractor', 'ship', 'scooter', 'taxi', 'canoe', 'motorcycle', 'fire truck', 'school bus', 'submarine', 'skateboard', 'ambulance'],
      medium: ['hot air balloon', 'cable car', 'monster truck', 'sailboat', 'tank', 'jet ski', 'limousine', 'double-decker bus', 'ice cream truck', 'garbage truck', 'forklift', 'golf cart', 'roller coaster', 'unicycle', 'steamroller', 'bulldozer', 'dump truck', 'hovercraft', 'gondola', 'Segway'],
      hard: ['space shuttle', 'zeppelin', 'tandem bicycle', 'rickshaw', 'monorail', 'pedal boat', 'jetpack', 'Mars rover', 'magic carpet', 'Batmobile', 'UFO', 'covered wagon', 'chariot', 'snowmobile', 'tugboat', 'DeLorean', "Noah's Ark", 'dog sled', 'paper airplane', 'pirate ship'],
    },
  },
  {
    id: 'sports',
    label: 'Sports',
    emoji: '⚽',
    words: {
      easy: ['soccer', 'basketball', 'tennis', 'golf', 'baseball', 'football', 'hockey', 'boxing', 'skiing', 'karate', 'ping pong', 'volleyball', 'frisbee', 'yoga', 'cycling', 'gymnastics', 'darts', 'trampoline', 'cartwheel', 'push-up'],
      medium: ['archery', 'fencing', 'wrestling', 'sumo', 'rugby', 'cricket', 'lacrosse', 'badminton', 'water polo', 'figure skating', 'snowboarding', 'pole vault', 'high jump', 'marathon', 'relay race', 'rock climbing', 'kayaking', 'slam dunk', 'home run', 'touchdown'],
      hard: ['curling', 'bobsled', 'synchronized swimming', 'triathlon', 'hat trick', 'photo finish', 'Hail Mary', 'penalty kick', 'bicycle kick', 'wipeout', 'Tour de France', 'Super Bowl', 'Wimbledon', 'World Cup', 'ski jump', 'parkour', 'Olympic torch', 'hole in one', 'tug of war', 'instant replay'],
    },
  },
  {
    id: 'music',
    label: 'Music',
    emoji: '🎵',
    words: {
      easy: ['guitar', 'drum', 'piano', 'trumpet', 'violin', 'microphone', 'headphones', 'radio', 'harp', 'flute', 'maracas', 'xylophone', 'tambourine', 'saxophone', 'music note', 'speaker', 'concert', 'singer', 'band', 'banjo'],
      medium: ['accordion', 'cello', 'bagpipes', 'harmonica', 'triangle', 'conductor', 'choir', 'rock star', 'air guitar', 'boombox', 'jukebox', 'opera', 'lullaby', 'ukulele', 'trombone', 'tuba', 'music video', 'encore', 'mosh pit', 'marching band'],
      hard: ['Beethoven', 'Mozart', 'The Beatles', 'BTS', 'Lady Gaga', 'Bohemian Rhapsody', 'Thriller', 'Baby Shark', 'one-man band', 'beatboxing', 'a cappella', 'rap battle', 'vinyl record', 'Spotify Wrapped', 'Grammy Awards', 'Woodstock', 'heavy metal', 'K-pop', 'Coachella', 'Mamma Mia'],
    },
  },
  {
    id: 'fantasy',
    label: 'Fantasy & Myths',
    emoji: '🐉',
    words: {
      easy: ['dragon', 'unicorn', 'fairy', 'troll', 'giant', 'magic wand', 'potion', 'goblin', 'ogre', 'witch hat', 'broomstick', 'treasure', 'gem', 'spell book', 'cauldron', 'castle tower', 'crown jewels', 'genie', 'dwarf', 'wings'],
      medium: ['griffin', 'phoenix', 'centaur', 'cyclops', 'minotaur', 'Pegasus', 'werewolf', 'kraken', 'yeti', 'Bigfoot', 'Loch Ness Monster', 'gargoyle', 'sphinx', 'magic mirror', 'dragon egg', 'enchanted forest', 'golem', 'mummy', 'troll bridge', 'genie lamp'],
      hard: ['Zeus', "Thor's hammer", 'Poseidon', 'Trojan horse', 'Excalibur', 'Holy Grail', "Pandora's box", "Achilles' heel", 'Hercules', 'King Arthur', 'Merlin', 'Anubis', 'hydra', 'chimera', 'basilisk', 'Valhalla', 'Mount Olympus', 'fountain of youth', "philosopher's stone", 'Atlantis'],
    },
  },
  {
    id: 'fairytales',
    label: 'Fairy Tales',
    emoji: '📖',
    words: {
      easy: ['Cinderella', 'Snow White', 'Rapunzel', 'glass slipper', 'poisoned apple', 'magic beans', 'beanstalk', 'big bad wolf', 'Three Little Pigs', 'Goldilocks', 'Little Red Riding Hood', 'frog prince', 'fairy godmother', 'pumpkin carriage', 'Humpty Dumpty', 'Jack and Jill', 'Hansel and Gretel', 'Sleeping Beauty', 'Tooth Fairy', 'seven dwarfs'],
      medium: ['Beauty and the Beast', 'Jack and the Beanstalk', 'The Ugly Duckling', 'The Tortoise and the Hare', 'Rumpelstiltskin', 'Thumbelina', 'The Princess and the Pea', 'The Boy Who Cried Wolf', 'Three Blind Mice', 'Old MacDonald', 'Hickory Dickory Dock', 'Little Bo Peep', 'Mother Goose', 'Pied Piper', 'Tin Man', 'Cowardly Lion', 'Mad Hatter', 'White Rabbit', 'Captain Hook', 'Tinker Bell'],
      hard: ['Alice in Wonderland', "The Emperor's New Clothes", 'The Little Match Girl', 'The Snow Queen', 'the goose that laid the golden eggs', 'Three Billy Goats Gruff', 'Bluebeard', 'Rip Van Winkle', 'Chicken Little', 'Twinkle Twinkle Little Star', 'Itsy Bitsy Spider', 'yellow brick road', 'happily ever after', 'once upon a time', "true love's kiss", 'evil stepmother', 'mirror mirror on the wall', 'The Sword in the Stone', 'Jack Frost', 'The Velveteen Rabbit'],
    },
  },
  {
    id: 'space',
    label: 'Space',
    emoji: '🚀',
    words: {
      easy: ['planet', 'alien', 'satellite', 'Saturn', 'Earth', 'Mars', 'Jupiter', 'astronaut helmet', 'spaceship', 'space station', 'crater', 'galaxy', 'asteroid', 'space suit', 'launch pad', 'countdown', 'half moon', 'blast off', 'moon boots', 'little green men'],
      medium: ['black hole', 'moon landing', 'zero gravity', 'Milky Way', 'Big Dipper', 'lunar eclipse', 'spacewalk', 'mission control', 'alien abduction', 'wormhole', 'Pluto', 'Neptune', 'nebula', 'supernova', 'crop circle', 'space junk', 'meteor shower', 'rings of Saturn', 'Hubble telescope', 'light-year'],
      hard: ['Big Bang', 'Apollo 11', 'Neil Armstrong', 'Area 51', "Halley's Comet", 'event horizon', 'dark matter', 'red giant', 'Andromeda', 'SpaceX', 'Sputnik', 'space race', 'terraforming', 'Death Star', 'Houston, we have a problem', 'Laika the space dog', "Orion's Belt", 'space tourism', 'alien invasion', 'parallel universe'],
    },
  },
  {
    id: 'ocean',
    label: 'Under the Sea',
    emoji: '🌊',
    words: {
      easy: ['sandcastle', 'seagull', 'beach ball', 'surfboard', 'sand bucket', 'whale', 'clam', 'pearl', 'beach towel', 'sea turtle', 'goldfish', 'seaweed', 'beach chair', 'snorkel', 'pier', 'life jacket', 'flippers', 'coconut', 'tropical fish', 'fishing rod'],
      medium: ['shipwreck', 'treasure map', 'scuba gear', 'message in a bottle', 'sea lion', 'stingray', 'killer whale', 'clownfish', 'sea urchin', 'lobster trap', 'diving board', 'sunburn', 'beach volleyball', 'jellyfish sting', 'riptide', 'high tide', 'boardwalk', 'deep sea diver', 'sea monster', 'buried treasure'],
      hard: ['Mariana Trench', 'Great Barrier Reef', 'Bermuda Triangle', 'anglerfish', 'giant squid', 'sea cucumber', 'hermit crab', 'otters holding hands', 'bioluminescence', 'coral bleaching', 'plankton', 'whale shark', 'nudibranch', 'walking the plank', "Davy Jones' locker", 'Shark Week', 'beached whale', 'ocean cleanup', 'moray eel', 'sea glass'],
    },
  },
  {
    id: 'clothing',
    label: 'Clothing',
    emoji: '👗',
    words: {
      easy: ['shirt', 'pants', 'dress', 'skirt', 'jacket', 'scarf', 'gloves', 'boots', 'sandals', 'belt', 'tie', 'sweater', 'shorts', 'pajamas', 'baseball cap', 'raincoat', 'mittens', 'earrings', 'necklace', 'swimsuit'],
      medium: ['tuxedo', 'flip-flops', 'bow tie', 'high heels', 'overalls', 'apron', 'bathrobe', 'cowboy boots', 'leg warmers', 'beanie', 'poncho', 'kimono', 'toga', 'onesie', 'tutu', 'wedding dress', 'suspenders', 'fanny pack', 'crop top', 'hoodie'],
      hard: ['Hawaiian shirt', 'Crocs', 'fashion show', 'red carpet', 'socks with sandals', 'tie-dye', 'monocle', 'top hat', 'beret', 'kilt', 'sombrero', 'Met Gala', 'wardrobe malfunction', 'hand-me-downs', 'runway model', 'mullet', 'man bun', 'fashion police', 'shoulder pads', 'platform shoes'],
    },
  },
  {
    id: 'body',
    label: 'Body & Health',
    emoji: '🦴',
    words: {
      easy: ['eye', 'nose', 'ear', 'mouth', 'hand', 'foot', 'tooth', 'hair', 'finger', 'knee', 'elbow', 'tongue', 'lips', 'belly button', 'toes', 'bone', 'muscle', 'bandage', 'beard', 'mustache'],
      medium: ['skeleton', 'sneeze', 'brain', 'broken arm', 'x-ray', 'cast', 'crutches', 'thermometer', 'braces', 'freckles', 'goosebumps', 'headache', 'toothache', 'flu shot', 'eye patch', 'wheelchair', 'first aid kit', 'lungs', 'sore throat', 'black eye'],
      hard: ['funny bone', 'heartburn', 'growing pains', 'wisdom teeth', 'allergies', 'CPR', 'DNA', 'immune system', 'insomnia', 'pins and needles', 'pulled muscle', 'bad hair day', 'double chin', 'dimples', 'six-pack abs', 'sprained ankle', 'chickenpox', 'stomach growl', 'laughing gas', 'adrenaline rush'],
    },
  },
  {
    id: 'jobs',
    label: 'Jobs & Work',
    emoji: '💼',
    words: {
      easy: ['office', 'desk', 'computer', 'laptop', 'coffee mug', 'boss', 'meeting', 'calendar', 'paycheck', 'briefcase', 'keyboard', 'printer', 'sticky note', 'paper clip', 'email', 'name tag', 'lunch break', 'whiteboard', 'elevator', 'office chair'],
      medium: ['job interview', 'coffee break', 'Zoom call', 'promotion', 'overtime', 'resume', 'handshake', 'water cooler', 'conference room', 'spreadsheet', 'presentation', 'cubicle', 'pay raise', 'team building', 'work from home', 'dress code', 'business card', 'intern', "two weeks' notice", 'payday'],
      hard: ['office party', 'Monday morning', 'burnout', 'reply all', 'out of office', "you're on mute", 'performance review', 'casual Friday', 'corner office', 'networking', 'multitasking', 'micromanaging', 'synergy', 'retirement', 'side hustle', 'rush hour commute', 'group project', 'jury duty', 'career ladder', 'quiet quitting'],
    },
  },
  {
    id: 'games',
    label: 'Video Games',
    emoji: '🎮',
    words: {
      easy: ['game controller', 'joystick', 'Pac-Man', 'Tetris', 'Minecraft', 'Sonic', 'Pikachu', 'coins', 'power-up', 'high score', 'level up', 'game over', 'arcade', 'headset', 'Nintendo Switch', 'health bar', 'extra life', 'Angry Birds', 'Space Invaders', 'checkpoint'],
      medium: ['boss fight', 'Fortnite', 'Among Us', 'Animal Crossing', 'The Legend of Zelda', 'Donkey Kong', 'Kirby', 'Yoshi', 'Luigi', 'Poké Ball', 'Mario Kart', 'Roblox', 'Candy Crush', 'Frogger', 'speedrun', 'loading screen', 'respawn', 'rage quit', 'cheat code', 'lag'],
      hard: ['League of Legends', 'Overwatch', 'Stardew Valley', 'Overcooked', 'It Takes Two', 'Portal', 'Halo', 'Grand Theft Auto', 'Call of Duty', 'Street Fighter', 'Super Smash Bros.', 'The Sims', 'Dark Souls', 'Elden Ring', 'Konami code', 'final boss', 'button mashing', 'glitch', 'noob', 'victory royale'],
    },
  },
  {
    id: 'disney',
    label: 'Disney & Cartoons',
    emoji: '🏰',
    words: {
      easy: ['Mickey Mouse', 'Minnie Mouse', 'Donald Duck', 'Goofy', 'Stitch', 'Winnie the Pooh', 'Simba', 'Nemo', 'Olaf', 'Dumbo', 'Bambi', 'Tigger', 'Mike Wazowski', 'Buzz Lightyear', 'Woody', 'Elmo', 'Snoopy', 'Scooby-Doo', 'Bugs Bunny', 'Peppa Pig'],
      medium: ['Lightning McQueen', 'Ariel', 'Belle', 'Mulan', 'Jasmine', 'Maui', 'Baymax', 'Sully', 'Dory', 'Pumbaa', 'Eeyore', 'Cruella de Vil', 'Ursula', 'Maleficent', 'Scar', 'Jessie', 'Rex', 'Mr. Potato Head', 'Tiana', 'Hei Hei'],
      hard: ['Steamboat Willie', 'Fantasia', 'Hakuna Matata', 'Let It Go', 'Circle of Life', "We Don't Talk About Bruno", 'Up house with balloons', 'Magic Kingdom', 'Pixar lamp', 'Sorcerer Mickey', 'Kronk', 'Lilo', 'Pocahontas', 'Kuzco as a llama', 'Rafiki lifting Simba', 'Toy Story aliens', 'Phineas and Ferb', 'Gravity Falls', 'Mickey ears', 'Bibbidi-Bobbidi-Boo'],
    },
  },
  {
    id: 'internet',
    label: 'Internet & Memes',
    emoji: '📱',
    words: {
      easy: ['Wi-Fi', 'emoji', 'selfie', 'hashtag', 'like button', 'smartphone', 'text message', 'YouTube', 'TikTok', 'Instagram', 'Google', 'selfie stick', 'laughing emoji', 'thumbs up', 'notification', 'low battery', 'phone charger', 'download', 'QR code', 'video call'],
      medium: ['viral video', 'influencer', 'meme', 'podcast', 'livestream', 'unboxing video', 'group chat', 'online shopping', 'spam', 'pop-up ad', 'CAPTCHA', 'buffering', 'comment section', 'subscribe button', 'airplane mode', 'screenshot', 'dark mode', 'autocorrect', 'followers', 'blue check mark'],
      hard: ['rickroll', 'Doge', 'distracted boyfriend', 'this is fine', 'trollface', 'Harambe', 'touch grass', 'ratio', 'main character energy', 'the algorithm', 'clickbait', 'catfishing', '404 error', 'cancel culture', 'woman yelling at a cat', 'screaming goat', 'stonks', 'keyboard warrior', 'two-factor authentication', 'dancing baby'],
    },
  },
  {
    id: 'compound',
    label: 'Compound Words',
    emoji: '🧩',
    words: {
      easy: ['firefly', 'starfish', 'doghouse', 'toothpaste', 'snowball', 'keyhole', 'eyeball', 'bookshelf', 'sandbox', 'fishbowl', 'bedroom', 'footprint', 'teapot', 'sunglasses', 'hairbrush', 'lipstick', 'cupboard', 'doorknob', 'flashcard', 'ladybug'],
      medium: ['butterfly', 'dragonfly', 'peanut', 'moonlight', 'honeymoon', 'jellybean', 'catfish', 'bulldog', 'horseshoe', 'nightmare', 'toothpick', 'eggplant', 'copycat', 'pigtail', 'carpool', 'heartbreak', 'rattlesnake', 'turtleneck', 'wallflower', 'scarecrow'],
      hard: ['brainstorm', 'bookkeeper', 'hamstring', 'earwig', 'cocktail', 'honeycomb', 'breakfast', 'understand', 'pigeonhole', 'mastermind', 'handwriting', 'pillowcase', 'backfire', 'brainwash', 'showdown', 'bedbug', 'starstruck', 'buttercup', 'trapdoor', 'landlord'],
    },
  },
  {
    id: 'superheroes',
    label: 'Superheroes',
    emoji: '🦸',
    words: {
      easy: ['Superman', 'Batman', 'Spider-Man', 'Wonder Woman', 'Hulk', 'Iron Man', 'Captain America', 'Thor', 'the Flash', 'Aquaman', 'Black Panther', 'Robin', 'Joker', 'cape', 'mask', 'shield', 'utility belt', 'Bat-Signal', 'spider web', 'laser eyes', 'super strength', 'flying', 'invisibility', 'villain', 'sidekick', 'superhero landing', 'secret identity', 'phone booth', 'kryptonite', 'evil lair', 'hero pose', 'Supergirl', 'Green Lantern'],
      medium: ['Wolverine', 'Deadpool', 'Black Widow', 'Hawkeye', 'Doctor Strange', 'Ant-Man', 'Scarlet Witch', 'Groot', 'Rocket Raccoon', 'Thanos', 'Venom', 'Magneto', 'Storm', 'Professor X', 'Harley Quinn', 'the Riddler', 'Lex Luthor', 'Green Goblin', 'Doctor Octopus', 'Batcave', 'the Avengers', 'Justice League', 'X-Men', 'Fantastic Four', 'shrink ray', 'freeze ray', 'force field', 'telekinesis', 'x-ray vision', 'mind control', 'Captain Marvel', 'Loki', 'Ms. Marvel'],
      hard: ['Infinity Gauntlet', 'Mjolnir', 'vibranium shield', 'arc reactor', 'Spider-Verse', 'Bane', 'Two-Face', 'Poison Ivy', 'Mr. Freeze', 'Ultron', 'Galactus', 'Silver Surfer', 'Moon Knight', 'Daredevil', 'Nightcrawler', 'Mystique', 'Shazam', 'Mr. Incredible', 'Invincible', 'Homelander', 'Watchmen', 'multiverse', 'origin story', 'post-credits scene', 'with great power comes great responsibility', 'I am Iron Man', 'Wakanda Forever', 'the Thanos snap', 'Hulk smash', 'Avengers assemble', 'Gotham City', 'Daily Bugle', 'Stark Tower', 'Fortress of Solitude'],
    },
  },
  {
    id: 'toys',
    label: 'Toys & Board Games',
    emoji: '🧸',
    words: {
      easy: ['yo-yo', 'doll', 'toy car', 'building blocks', 'Lego', 'Play-Doh', 'bubbles', 'marbles', 'spinning top', 'rubber duck', 'water gun', 'toy train', 'dollhouse', 'slime', 'jigsaw puzzle', 'crayons', 'action figure', 'deck of cards', 'dominoes', 'checkers', 'Uno', 'toy robot', 'stuffed animal', 'bouncy ball', 'swing set', 'slide', 'seesaw', 'sidewalk chalk', 'coloring book', 'toy box', 'toy soldier', 'bubble wand', 'paper doll'],
      medium: ['Monopoly', 'Scrabble', 'Jenga', 'Twister', 'Connect Four', 'Battleship', 'Clue', 'Candy Land', 'Chutes and Ladders', 'Operation', 'Guess Who', 'Hungry Hungry Hippos', 'Mouse Trap', 'Lite-Brite', 'Hot Wheels', 'Nerf gun', 'Furby', 'Beanie Babies', 'Barbie Dreamhouse', 'View-Master', 'remote control car', 'Magna-Tiles', 'Lincoln Logs', 'Tonka truck', 'Easy-Bake Oven', "Slip 'N Slide", 'Bop It', 'Simon', 'Spirograph', 'Pogs', 'trading cards', 'Pictionary', 'Uno reverse card'],
      hard: ['Catan', 'Ticket to Ride', 'Dungeons & Dragons', 'Codenames', 'Exploding Kittens', 'Risk', 'Trivial Pursuit', 'Boggle', 'Yahtzee', 'Stratego', 'Sorry!', 'Apples to Apples', 'Pandemic', 'Carcassonne', 'Magic: The Gathering', 'Pokémon cards', 'Tickle Me Elmo', 'Cabbage Patch Kids', 'Polly Pocket', 'Teddy Ruxpin', 'Stretch Armstrong', 'Ouija board', "Rock 'Em Sock 'Em Robots", 'KerPlunk', 'Perfection', "Don't Break the Ice", 'Pie Face', 'Hedbanz', 'Throw Throw Burrito', 'go directly to jail', 'Mancala', 'backgammon', 'Bingo', 'you sank my battleship'],
    },
  },
  {
    id: 'spooky',
    label: 'Spooky & Halloween',
    emoji: '🎃',
    words: {
      easy: ['ghost', 'witch', 'bat', 'skeleton', 'mummy', 'vampire', 'zombie', 'monster', 'pumpkin', 'black cat', 'spider', 'cobweb', 'haunted house', 'graveyard', 'tombstone', 'coffin', 'broom', 'cauldron', 'candy corn', 'trick-or-treat bag', 'costume', 'scary mask', 'owl', 'scarecrow', 'werewolf', 'eyeball', 'fangs', 'skull', 'crow', 'full moon', 'flashlight', 'candle', 'ghost story'],
      medium: ["jack-o'-lantern", "Frankenstein's monster", "Dracula's castle", 'creepy doll', 'séance', 'haunted mirror', 'monster under the bed', 'bobbing for apples', 'hayride', 'costume contest', 'zombie apocalypse', "witch's brew", 'Headless Horseman', 'Grim Reaper', 'creaky door', 'secret passage', 'ghost town', 'tarot cards', 'voodoo doll', 'slasher movie', 'fog machine', 'fake blood', 'glow sticks', 'candy apple', 'skeleton dance', 'poltergeist', 'spooky forest', 'ghost hunter', 'jump scare', 'boogeyman', 'chainsaw', 'scream', 'bloody handprint'],
      hard: ['The Exorcist', 'The Conjuring', 'Ghostface', 'Michael Myers', 'Freddy Krueger', 'Jason Voorhees', 'Chucky', 'Annabelle', 'Pennywise', 'The Ring', 'Saw', 'Hocus Pocus', 'The Nightmare Before Christmas', 'Beetlejuice', 'The Addams Family', 'Casper the Friendly Ghost', 'Salem witch trials', 'Bloody Mary', 'Sleepy Hollow', 'Count Dracula', 'Transylvania', 'zombie walk', 'graveyard shift', 'skeleton key', 'Edgar Allan Poe', 'The Raven', 'the Upside Down', 'werewolf transformation', 'Monster Mash', 'trick or treat smell my feet', 'haunted asylum', 'vampire hunter', 'Halloweentown', 'Coraline'],
    },
  },
  {
    id: 'countries',
    label: 'Countries & Landmarks',
    emoji: '🌍',
    words: {
      easy: ['USA', 'Canada', 'Mexico', 'Japan', 'China', 'France', 'Italy', 'Egypt', 'Australia', 'Brazil', 'India', 'England', 'Germany', 'Spain', 'Russia', 'Greece', 'Hawaii', 'Africa', 'Alaska', 'Ireland', 'Philippines', 'South Korea', 'Jamaica', 'Switzerland', 'Netherlands', 'Scotland', 'Peru', 'Thailand', 'Vietnam', 'Kenya', 'Iceland', 'Cuba', 'Argentina'],
      medium: ['Mount Kilimanjaro', 'Arc de Triomphe', 'Brandenburg Gate', 'Neuschwanstein Castle', 'Sagrada Família', 'Acropolis', 'Petronas Towers', 'Burj Khalifa', 'CN Tower', 'Space Needle', 'Gateway Arch', 'Angkor Wat', 'Chichén Itzá', 'Forbidden City', 'the Kremlin', 'Tower Bridge', 'Buckingham Palace', 'Edinburgh Castle', 'Cliffs of Moher', 'Table Mountain', 'Victoria Falls', 'Ha Long Bay', 'Uluru', 'Santorini', 'Dubrovnik', 'Bali', 'Galápagos Islands', 'Amsterdam canals', 'Swiss Alps', 'Kyoto temple', 'Red Square', 'Great Sphinx of Giza', 'Grand Bazaar'],
      hard: ['Union Jack', 'Japanese flag', 'Canadian flag', 'Brazilian flag', 'South Korean flag', 'Greek flag', 'Mexican flag', 'Mongolia', 'Nepal', 'New Zealand', 'Norwegian fjords', 'Finland', 'Morocco', 'Turkey', 'Portugal', 'Poland', 'Ukraine', 'Sweden', 'Denmark', 'Belgium', 'Chile', 'Colombia', 'Venezuela', 'Nigeria', 'South Africa', 'Ethiopia', 'Saudi Arabia', 'Israel', 'Pakistan', 'Indonesia', 'Singapore', 'Taiwan', 'Monaco', 'Vatican City'],
    },
  },
  {
    id: 'school',
    label: 'School',
    emoji: '🏫',
    words: {
      easy: ['chalkboard', 'homework', 'pencil sharpener', 'glue stick', 'crayon box', 'notebook', 'textbook', 'recess', 'school bell', 'hall pass', 'report card', 'spelling bee', 'art class', 'gym class', 'cafeteria', 'locker', 'library book', 'field trip', 'class pet', 'apple for the teacher', 'pop quiz', 'science fair', 'show and tell', 'nap time', 'snack time', 'school play', 'principal', 'lunch lady', 'raise your hand', 'gold star', 'school uniform', 'ABCs', 'times tables'],
      medium: ['detention', 'yearbook', 'prom', 'homecoming', 'class clown', "teacher's pet", 'substitute teacher', 'cheat sheet', 'study group', 'summer vacation', 'snow day', 'fire drill', 'permission slip', 'dissecting a frog', 'chemistry lab', 'volcano project', 'book report', 'parent-teacher conference', 'school dance', 'kindergarten', 'valedictorian', 'dorm room', 'college', 'diploma', 'pencil case', 'lab goggles', 'algebra', 'geography', 'homeschool', 'school nurse', 'student council', 'the dog ate my homework', 'honor roll'],
      hard: ['Pythagorean theorem', 'periodic table', 'E = mc²', 'standardized test', 'SATs', 'final exam', 'student loans', 'senior prank', 'class reunion', 'spirit week', 'pep rally', 'debate club', 'exchange student', 'freshman', 'sorority', 'fraternity', 'commencement speech', 'scholarship', 'tuition', "dean's list", 'plagiarism', 'essay deadline', 'shop class', 'home economics', 'theater kid', 'lab partner', 'lost and found', 'The Magic School Bus', 'long division', 'cursive writing', 'Bunsen burner', 'school spirit', 'class president', 'back to school'],
    },
  },
  {
    id: 'anime',
    label: 'Anime',
    emoji: '🌸',
    words: {
      easy: ['Naruto', 'Goku', 'Sailor Moon', 'Totoro', 'Doraemon', 'Luffy', 'Ash Ketchum', 'Astro Boy', 'ninja headband', 'Dragon Balls', 'Catbus', 'giant robot', 'katana', 'cherry blossom', 'sailor uniform', 'bento box', 'onigiri', 'anime eyes', 'big sweat drop', 'chibi', 'magical girl', 'mecha', 'samurai', 'kitsune mask', 'Pikachu', 'Studio Ghibli', 'No-Face', "Kiki's Delivery Service", 'Ponyo', 'Jigglypuff', 'Charmander', 'Squirtle', 'Bulbasaur'],
      medium: ['One Piece', 'Dragon Ball Z', 'Attack on Titan', 'Demon Slayer', 'My Hero Academia', 'Death Note', 'Naruto run', 'Super Saiyan', 'Kamehameha', 'Sharingan', 'Rasengan', 'Spirit Bomb', 'Colossal Titan', 'Straw Hat Pirates', 'Pokédex', 'Team Rocket', 'Vegeta', 'Sasuke', 'Kakashi', 'All Might', 'Deku', 'Tanjiro', 'Nezuko', 'Gojo', 'Jujutsu Kaisen', 'Spy x Family', 'Chainsaw Man', 'Tuxedo Mask', "Howl's Moving Castle", 'Princess Mononoke', 'Calcifer', 'Light Yagami', 'Haku the dragon'],
      hard: ['Neon Genesis Evangelion', 'Cowboy Bebop', 'Fullmetal Alchemist', 'Hunter x Hunter', 'Sword Art Online', 'Tokyo Ghoul', 'One Punch Man', 'Mob Psycho 100', 'Haikyuu!!', 'Fruits Basket', 'Ouran High School Host Club', 'Bleach', 'Inuyasha', 'Yu-Gi-Oh!', 'Digimon', 'Cardcaptor Sakura', 'Akira', 'Ghost in the Shell', 'Your Name', 'Frieren', 'Bocchi the Rock!', 'Lelouch', 'Zoro', 'Itachi', 'Levi Ackerman', 'Ryuk', 'isekai', 'tsundere', 'power of friendship', 'beach episode', 'transformation sequence', 'Weathering with You', 'Kaguya-sama', 'Senku'],
    },
  },
  {
    id: 'datenight',
    label: 'Date Night',
    emoji: '💕',
    words: {
      easy: ['rose', 'holding hands', 'love letter', 'box of chocolates', 'picnic', 'movie night', 'engagement ring', 'bouquet', 'couple selfie', 'pizza night', 'cuddle', 'blanket fort', 'slow dance', 'sunset walk', 'ice cream date', 'cooking together', 'game night', 'photo booth', 'coffee date', 'breakfast in bed', 'Ferris wheel', 'bubble bath', 'puppy love', 'heart eyes', 'xoxo', 'kissy face', 'lovebirds', 'first kiss', 'wedding cake', "Cupid's arrow", 'spooning', 'pillow talk', 'handwritten note'],
      medium: ['candlelit dinner', 'first date', 'double date', 'blind date', 'long-distance call', 'road trip', 'drive-in movie', 'karaoke duet', 'cooking class', 'paint and sip', 'wine tasting', 'dinner reservation', 'anniversary', 'love lock bridge', 'serenade', 'proposal', 'bouquet toss', 'first dance', 'takeout on the couch', 'Netflix and chill', 'matching tattoos', 'love language', 'couples costume', 'spa day', 'dancing in the rain', 'hot air balloon ride', 'mixtape', 'rom-com marathon', 'love note in a lunchbox', 'airport reunion', 'meeting the parents', 'sharing dessert', 'playing footsie'],
      hard: ['love at first sight', 'head over heels', 'third wheel', 'friend zone', 'soulmate', 'honeymoon phase', 'Romeo and Juliet', 'love triangle', 'meet-cute', 'PDA', 'red flag', 'green flag', 'situationship', 'love bombing', 'pick-up line', 'wingman', 'vow renewal', 'eloping', 'Vegas wedding', 'promise ring', 'couple goals', 'our song', 'inside joke', 'pinky promise', 'secret admirer', 'long walks on the beach', 'Bonnie and Clyde', 'Jack and Rose', 'Mr. and Mrs. Smith', 'the one that got away', 'good morning text', 'staying up all night talking', 'falling asleep on the phone', "first 'I love you'"],
    },
  },
  {
    id: 'rooms',
    label: 'Rooms of the House',
    emoji: '🚪',
    words: {
      easy: ['kitchen', 'bathroom', 'bedroom', 'garage', 'living room', 'attic', 'basement', 'closet', 'shower', 'toilet paper', 'bath mat', 'nightstand', 'bedside lamp', 'bed sheets', 'fridge magnet', 'cookie jar', 'dish soap', 'oven mitt', 'spatula', 'frying pan', 'garden hose', 'lawn mower', 'tool bench', 'porch', 'front door', 'laundry room', 'dining table', 'kitchen sink', 'bath towel', 'rubber ducky', 'hallway', 'backyard', 'patio'],
      medium: ['walk-in closet', 'home office', 'game room', 'mudroom', 'pantry', 'guest room', 'nursery', 'man cave', 'laundry pile', 'unmade bed', 'messy room', 'dirty dishes', 'shower cap', 'loofah', 'bathroom scale', 'medicine cabinet', 'clogged toilet', 'leaky faucet', 'squeaky floorboard', 'creaky stairs', 'workbench', 'pegboard', 'paint cans', 'storage boxes', 'garage sale', 'kitchen island', 'breakfast nook', 'toaster oven', 'fogged-up mirror', 'shoe rack', 'coat closet', 'laundry chute', 'playroom'],
      hard: ['she shed', 'panic room', 'wine cellar', 'home theater', 'sunroom', "butler's pantry", 'secret bookcase door', 'dumbwaiter', 'crawl space', 'boiler room', 'open floor plan', 'spiral staircase', 'loft bed', 'heated floors', 'rain shower head', 'jacuzzi tub', 'double vanity', 'smart fridge', 'garage band', 'junk room', 'home gym', 'craft room', 'reading nook', 'window seat', 'midnight snack raid', 'singing in the shower', 'folding a fitted sheet', 'loading the dishwasher', 'garage door opener', 'fridge light', 'toilet seat left up', 'dust bunnies', 'lint trap', 'morning bathroom line'],
    },
  },
  {
    id: 'brands',
    label: 'Brands & Logos',
    emoji: '🏷️',
    words: {
      easy: ['Apple logo', 'Nike swoosh', 'golden arches', 'Starbucks', 'Coca-Cola', 'Pepsi', 'Target', 'Amazon', 'Disney castle logo', 'IKEA', 'Walmart', 'Burger King', 'Subway', 'Pizza Hut', 'KFC', 'Taco Bell', "Domino's", "Dunkin'", 'Twitter bird', "M&M's", 'Skittles', 'Oreo', 'Doritos', 'Cheetos', 'Pringles', 'Kit Kat', "Hershey's Kiss", 'Toyota', 'Tesla', 'Ford', "Lay's", 'Cheerios', 'Spotify'],
      medium: ['Michelin Man', 'Pillsbury Doughboy', 'Mr. Peanut', 'Kool-Aid Man', 'Tony the Tiger', 'Energizer Bunny', 'Geico gecko', 'Colonel Sanders', 'Ronald McDonald', 'Jolly Green Giant', 'Mr. Clean', 'Chester Cheetah', 'Trix rabbit', 'Lucky Charms leprechaun', "Wendy's", 'Red Bull', 'Mercedes logo', 'Ferrari horse', 'Lamborghini bull', 'Adidas stripes', 'Shell logo', 'Olympic rings', 'PlayStation logo', 'Mastercard circles', 'Chick-fil-A cows', 'Duolingo owl', 'Jumpman logo', 'Puma', 'Monster Energy', 'Quaker Oats man', 'Mr. Monopoly', 'Gerber baby', 'Pringles man'],
      hard: ['Volkswagen logo', 'Audi rings', 'BMW logo', 'Mitsubishi logo', 'Airbnb', 'Uber', 'DoorDash', 'Shake Shack', 'In-N-Out', "Trader Joe's", 'Costco', 'Lululemon', 'Patagonia', 'The North Face', 'Supreme', 'Gucci', 'Louis Vuitton', 'Chanel', 'Rolex crown', 'Tiffany blue box', 'Vans', 'Converse', 'Dr Pepper', 'Mountain Dew', 'Gatorade', 'Pinterest', 'LinkedIn', 'Slack', 'Discord', 'WhatsApp', 'Tinder flame', 'Firefox', 'Chrome', 'Peloton'],
    },
  },
  {
    id: 'emojis',
    label: 'Emojis',
    emoji: '😀',
    words: {
      easy: ['grinning face', 'winking face', 'crying face', 'angry face', 'sleeping face', 'thumbs down', 'red heart', 'broken heart', 'fire emoji', 'poop emoji', 'skull emoji', '100', 'peace sign', 'OK hand', 'clapping hands', 'praying hands', 'waving hand', 'flexed biceps', 'eyes emoji', 'sunglasses face', 'sparkles', 'star-struck', 'crown emoji', 'rocket emoji', 'sun with face', 'pizza slice', 'cat face', 'dog face', 'see-no-evil monkey', 'kiss mark', 'sweat smile', 'tongue out', 'upside-down face'],
      medium: ['facepalm', 'shrug', 'eye roll', 'zipper-mouth face', 'nerd face', 'cowboy face', 'clown face', 'robot face', 'alien emoji', 'money-mouth face', 'mind blown', 'hugging face', 'thinking face', 'shushing face', 'nauseated face', 'sneezing face', 'hot face', 'cold face', 'woozy face', 'pleading face', 'smirking face', 'raised eyebrow', 'melting face', 'saluting face', 'nail polish emoji', 'dancing woman', 'lightning bolt emoji', 'sweat droplets', 'zzz', 'speech bubble', 'face with tears of joy', 'rolling on the floor laughing', 'handshake emoji'],
      hard: ["chef's kiss", 'side eye', 'pinched fingers', 'face holding back tears', 'dotted line face', 'face with spiral eyes', 'flushed face', 'grimacing face', 'expressionless face', 'face with monocle', 'lying face', 'smiling imp', 'two hearts', 'GOAT emoji', 'cap emoji', 'heart hands', 'writing hand', 'call me hand', 'Vulcan salute', 'crossed fingers', 'bowing person', 'person tipping hand', 'zombie emoji', 'genie emoji', 'ninja emoji', 'moai', 'face exhaling', 'shaking face', 'face with hand over mouth', 'partying face', 'disguised face', 'steam from nose', 'drooling face', 'face without mouth'],
    },
  },
  {
    id: 'fastfood',
    label: 'Fast Food & Restaurants',
    emoji: '🍔',
    words: {
      easy: ['cheeseburger', 'drive-thru', 'Happy Meal', 'chicken wings', 'soda cup', 'ketchup', 'mustard', 'drinking straw', 'pizza box', 'hot dog stand', 'menu', 'waiter tray', 'tip jar', "kids' menu", 'ice cream cone', 'Slurpee', 'burrito bowl', 'sub sandwich', 'salad bar', 'buffet', 'chopsticks', 'takeout box', 'booth', 'high chair', 'the check', 'breadsticks', 'corn dog', 'chili dog', 'fish and chips', 'chicken sandwich', 'combo meal', 'toy prize', 'paper hat'],
      medium: ['Big Mac', 'Whopper', 'Frosty', 'Crunchwrap', 'McFlurry', 'Blizzard', 'animal style fries', 'dipping sauce', 'secret menu', 'value menu', 'Taco Tuesday', 'all-you-can-eat', 'sushi conveyor belt', 'hibachi chef', 'onion volcano', 'pizza delivery', 'food court', 'diner', 'five-star restaurant', "maître d'", 'sommelier', 'tasting menu', 'birthday song at a restaurant', 'tableside guacamole', 'soda fountain', 'ball pit', 'Baconator', 'drive-thru speaker', 'wrong order', 'dine and dash', 'McRib', 'Doritos Locos Taco', 'Shamrock Shake'],
      hard: ['Michelin star', "Hell's Kitchen", 'food critic', 'farm-to-table', 'molecular gastronomy', 'omakase', 'pop-up restaurant', 'speakeasy', 'Waffle House', 'Cracker Barrel', 'Olive Garden', 'Red Lobster', "Applebee's", 'Chuck E. Cheese', 'Rainforest Cafe', 'Medieval Times', "Denny's", 'Five Guys', 'Chipotle', 'Panda Express', 'Sonic Drive-In', 'Jack in the Box', "Raising Cane's", 'Popeyes', 'White Castle', "Arby's", 'Dairy Queen', 'Cold Stone', 'Benihana', 'Wingstop', 'Panera', 'Jollibee', 'Kitchen Nightmares', "Steak 'n Shake"],
    },
  },
  {
    id: 'desserts',
    label: 'Desserts & Sweets',
    emoji: '🍰',
    words: {
      easy: ['brownie', 'chocolate chip cookie', 'cupcake', 'sprinkle donut', 'swirly lollipop', 'candy bar', 'gummy worm', 'cotton candy', 'popsicle', 'ice cream sandwich', 'sundae', 'cherry on top', 'sprinkles', 'whipped cream', 'chocolate bar', 'marshmallow', 'jelly beans', 'candy cane', 'gumball machine', 'bubble gum', 'licorice', 'pudding', 'Jell-O', 'cinnamon roll', 'apple pie', 'layer cake', 'cheesecake', 'muffin', 'banana split', 'caramel', 'hot fudge', 'frosting', 'cake slice'],
      medium: ['flan', 'baklava', 'cannoli', 'éclair', 'mochi', 'gelato', 'rocky road', 'peanut brittle', 'fudge', 'chocolate truffle', 'pavlova', 'trifle', 'Boston cream pie', 'red velvet cake', 'carrot cake', 'key lime pie', 'pecan pie', 'peach cobbler', 'apple strudel', 'profiteroles', 'sorbet', 'frozen yogurt', 'chocolate fountain', 'rock candy', 'saltwater taffy', 'gingerbread cookie', 'Pop Rocks', 'Twinkie', 'Pop-Tart', 'Rice Krispies treat', 'funnel cake', 'snow cone', 'affogato'],
      hard: ['croquembouche', 'mille-feuille', 'Black Forest cake', 'Sachertorte', 'tres leches cake', 'halo-halo', 'dango', 'taiyaki', 'bingsu', 'kulfi', 'gulab jamun', 'panna cotta', 'soufflé', 'opera cake', 'Swiss roll', 'kouign-amann', 'beignets', 'zeppole', 'sfogliatella', 'Basque cheesecake', 'Dubai chocolate bar', 'smash cake', 'piñata cake', 'drip cake', 'chocolate lava cake', 'ice cream cake', 'Neapolitan ice cream', 'candy necklace', 'Nerds Rope', 'Ring Pop', 'Fun Dip', 'Warheads', 'Pixy Stix', "Dippin' Dots"],
    },
  },
  {
    id: 'breakfast',
    label: 'Breakfast',
    emoji: '🥞',
    words: {
      easy: ['pancakes', 'waffles', 'fried egg', 'bacon', 'buttered toast', 'cereal bowl', 'orange juice', 'coffee', 'blueberry muffin', 'bagel with cream cheese', 'glazed donut', 'oatmeal', 'yogurt', 'sliced banana', 'syrup', 'butter', 'jam', 'sausage', 'hash browns', 'omelet', 'scrambled eggs', 'glass of milk', 'croissant', 'toaster', 'cup of tea', 'morning alarm', 'breakfast tray', 'fruit bowl', 'grapefruit', 'strawberries', 'honey drizzle', 'peanut butter toast', 'pancake stack'],
      medium: ['breakfast burrito', 'huevos rancheros', 'biscuits and gravy', 'steak and eggs', 'granola', 'smoothie bowl', 'açaí bowl', 'latte art', 'cappuccino', 'espresso shot', 'chai latte', 'iced coffee', 'cold brew', 'mimosa', 'brunch', 'continental breakfast', 'breakfast buffet', 'room service', 'drive-thru coffee', 'cinnamon toast', 'Belgian waffle', 'crêpes', 'quiche', 'frittata', 'breakfast sandwich', 'Egg McMuffin', 'toaster strudel', 'cereal mascot', 'milk mustache', 'burnt toast', 'sunny-side up', 'soft-boiled egg', 'egg cup'],
      hard: ['full English breakfast', 'shakshuka', 'congee', 'dim sum', 'chilaquiles', 'kaya toast', 'tamagoyaki', 'khachapuri', 'Dutch baby pancake', 'pain au chocolat', 'IHOP', 'Grand Slam breakfast', 'Lucky Charms', 'Froot Loops', 'Frosted Flakes', "Cap'n Crunch", 'Cinnamon Toast Crunch', 'Count Chocula', 'breakfast of champions', 'most important meal of the day', 'rise and shine', 'early bird special', 'bottomless mimosas', 'eggs over easy', 'pancake flip', 'Wheaties box', 'toast landing butter-side down', 'natto', 'menemen', 'Turkish breakfast', 'loco moco', 'Spam and eggs', 'huevos divorciados', 'pancake art'],
    },
  },
  {
    id: 'medieval',
    label: 'Medieval & Knights',
    emoji: '⚔️',
    words: {
      easy: ['knight', 'castle', 'shield', 'crown', 'king', 'queen', 'princess', 'prince', 'horse', 'armor', 'helmet', 'catapult', 'drawbridge', 'moat', 'castle tower', 'throne', 'jester', 'royal banner', 'torch', 'goblet', 'scroll', 'royal feast', 'battle axe', 'spear', 'lance', 'castle gate', 'dungeon', 'chain mail', 'sword', 'bow and arrow', 'dragon', 'wizard', 'peasant'],
      medium: ['jousting', 'trebuchet', 'battering ram', 'knighting ceremony', 'round table', 'archer', 'blacksmith', 'anvil', 'executioner', 'guillotine', 'stocks', 'castle siege', 'tournament', 'squire', 'minstrel', 'lute', 'friar', 'town crier', 'plague doctor', 'village market', 'tavern', 'mead', 'royal decree', 'wax seal', 'coat of arms', 'turkey leg', 'crusade', 'longbow', 'crossbow', 'mace', 'morning star', 'flail', 'secret tunnel'],
      hard: ['Magna Carta', 'Black Death', 'Richard the Lionheart', 'William the Conqueror', 'Battle of Hastings', 'Bayeux Tapestry', 'Knights Templar', 'Holy Roman Empire', 'Vikings', 'Genghis Khan', 'feudalism', 'serfs', 'lord of the manor', 'chivalry', 'damsel in distress', 'trial by combat', 'Renaissance faire', 'illuminated manuscript', 'stained glass window', 'Gothic cathedral', 'Notre-Dame', 'Canterbury Tales', 'Beowulf', 'Marco Polo', 'Gutenberg press', "Hundred Years' War", 'witch hunt', 'alchemist', 'castle keep', 'portcullis', 'arrow slit', 'murder holes', 'siege tower', 'Monty Python'],
    },
  },
  {
    id: 'pets',
    label: 'Pets',
    emoji: '🐶',
    words: {
      easy: ['dog', 'cat', 'puppy', 'hamster', 'bunny', 'guinea pig', 'goldfish', 'parrot', 'pet turtle', 'pet mouse', 'dog bone', 'leash', 'dog collar', 'dog bowl', 'fish tank', 'bird cage', 'kennel', 'chew toy', 'tennis ball', 'pet bed', 'dog treat', 'muddy paws', 'wagging tail', 'fetch', 'belly rub', 'bath time', 'dog walk', 'vet', 'pet store', 'adopt a pet', 'puppy eyes', 'sit', 'roll over'],
      medium: ['dog park', 'dog groomer', 'pet sitter', 'dog walker with many dogs', 'hamster wheel', 'hamster ball', 'ferret', 'hedgehog', 'chinchilla', 'gecko', 'bearded dragon', 'axolotl', 'hermit crab', 'cockatiel', 'budgie', 'canary', 'betta fish', 'pet rock', 'Chihuahua', 'pug', 'poodle', 'golden retriever', 'dachshund', 'corgi', 'husky', 'German shepherd', 'Dalmatian', 'bulldog', 'beagle', 'dog sweater', 'shake paw', 'dog bark', 'squeaky toy'],
      hard: ['service dog', 'therapy dog', 'police dog', 'guide dog', 'herding sheepdog', 'dog show', 'Best in Show', 'agility course', 'puppy training class', 'litter of puppies', 'pet insurance', 'microchip', 'doggy daycare', 'pet portrait', 'dog birthday party', 'dog that looks like its owner', 'Lassie', 'Clifford the Big Red Dog', 'Air Bud', 'Marley & Me', 'Hachiko', 'Balto', 'Toto', 'Old Yeller', 'Odie', 'Gromit', 'Brian Griffin', 'Bolt', 'dog shaking off water', "who's a good boy", 'pet tax', 'Shiba Inu', 'Bernese mountain dog', 'Cavalier King Charles spaniel'],
    },
  },
  {
    id: 'farm',
    label: 'Farm',
    emoji: '🚜',
    words: {
      easy: ['cow', 'pig', 'chicken', 'horse', 'sheep', 'goat', 'duck', 'rooster', 'barn', 'tractor', 'hay bale', 'farmer', 'scarecrow', 'chicken egg', 'corn field', 'milk pail', 'fence', 'pitchfork', 'farmhouse', 'silo', 'windmill', 'apple tree', 'carrot patch', 'lamb', 'piglet', 'calf', 'baby chick', 'pony', 'donkey', 'cowbell', 'barn door', 'pig in mud', 'vegetable garden'],
      medium: ['milking a cow', 'sheep shearing', 'egg basket', 'chicken coop', 'pig pen', 'horse stable', 'horse saddle', 'combine harvester', 'sprinkler', 'crop duster', 'weather vane', 'hay loft', 'corn maze', "farmers' market", 'beehive', 'orchard', 'vineyard', 'rice paddy', 'wheat field', 'sunflower field', 'strawberry picking', 'petting zoo', 'county fair', 'blue ribbon', 'tractor pull', 'goat yoga', 'alpaca', 'border collie', 'barn owl', 'plow', 'wheelbarrow', 'rooster crowing at dawn', 'cow tipping'],
      hard: ['crop rotation', 'Animal Farm', "Charlotte's Web", 'Babe the pig', 'Shaun the Sheep', 'Chicken Run', 'Green Acres', 'American Gothic', 'organic produce', 'free-range chickens', 'harvest festival', 'planting season', 'the farmer in the dell', 'barn raising', '4-H club', 'rodeo', 'bull riding', 'lasso', 'branding iron', 'cattle drive', 'counting sheep', 'cow jumping over the moon', 'FarmVille', 'Harvest Moon', 'John Deere', 'crows on a scarecrow', 'fresh eggs sign', 'pick your own pumpkins', 'mechanical bull', 'pig race', 'chicken dance', 'hay fever', 'early to bed, early to rise', 'till the cows come home'],
    },
  },
  {
    id: 'travel',
    label: 'Travel & Vacation',
    emoji: '✈️',
    words: {
      easy: ['suitcase', 'passport', 'plane ticket', 'hotel room', 'beach vacation', 'sunglasses', 'sunscreen', 'postcard', 'souvenir', 'backpacking', 'camping trip', 'road trip', 'airport security', 'boarding pass', 'luggage cart', 'carry-on', 'tour bus', 'cruise', 'tropical island', 'snorkeling', 'hammock', 'room key', 'do not disturb sign', 'travel pillow', 'packing', 'vacation selfie', 'snow globe', 'map pin', 'train ride', 'airplane window', 'seatbelt sign', 'luggage tag', 'vacation'],
      medium: ['lost luggage', 'layover', 'delayed flight', 'window seat', 'middle seat', 'turbulence', 'baggage claim', 'passport stamp', 'customs', 'currency exchange', 'hostel', 'all-inclusive resort', 'ski trip', 'safari jeep', 'hiking trail', 'national park', 'theme park', 'water park', 'road trip snacks', 'carsick', 'are we there yet', 'travel itinerary', 'overpacking', 'duty free', 'first class', 'economy class', 'red-eye flight', 'staycation', 'time zone', 'tourist trap', 'foreign language', 'hotel breakfast', 'tan lines'],
      hard: ['bucket list', 'wanderlust', 'culture shock', 'frequent flyer miles', 'TSA PreCheck', 'passport photo', 'International Date Line', 'backpacking through Europe', 'gap year', 'digital nomad', 'glamping', 'van life', 'cruise buffet', 'travel influencer', 'Eurail pass', 'Grand Tour', 'Orient Express', 'Around the World in 80 Days', 'Cloud Gate', 'gondola ride in Venice', 'Bondi Beach', 'Vegas Strip', 'Serengeti', 'Iceland road trip', 'cherry blossom season', 'hot springs', 'Inca Trail', 'Camino de Santiago', 'spring break', 'senior trip', 'lost in translation', 'jet-setter', 'hotel minibar', 'airport sprint'],
    },
  },
  {
    id: 'hobbies',
    label: 'Hobbies & Crafts',
    emoji: '🎨',
    words: {
      easy: ['painting', 'drawing', 'knitting', 'reading a book', 'gardening', 'baking', 'cooking', 'fishing', 'hiking', 'camping', 'photography', 'doing puzzles', 'gaming', 'singing', 'dancing', 'sewing', 'crochet', 'pottery', 'origami', 'coloring', 'scrapbooking', 'bird watching', 'stamp collecting', 'coin collecting', 'Lego building', 'chess club', 'yoga', 'journaling', 'writing poetry', 'playing guitar', 'bike riding', 'skateboarding', 'kite flying'],
      medium: ['candle making', 'soap making', 'woodworking', 'embroidery', 'cross-stitch', 'quilting', 'calligraphy', 'beadwork', 'jewelry making', 'glassblowing', 'metal detecting', 'geocaching', 'cosplay', 'model trains', 'model airplanes', 'ham radio', 'amateur astronomy', 'beekeeping', 'bonsai', 'terrarium', 'flower arranging', 'home brewing', 'bread baking', 'podcasting', 'vlogging', 'stand-up comedy', 'improv', 'magic tricks', 'card tricks', 'rock collecting', 'fly fishing', 'sailing', 'pottery wheel'],
      hard: ['taxidermy', 'blacksmithing', 'leather crafting', 'macramé', 'needle felting', 'paint by numbers', 'diamond painting', 'resin art', 'decoupage', 'papier-mâché', 'pyrography', 'lockpicking', 'speedcubing', 'competitive eating', 'extreme ironing', 'LARPing', 'tabletop gaming', 'trainspotting', 'urban exploring', 'storm chasing', 'cloud watching', 'escape rooms', 'axe throwing', 'falconry', 'ballroom dancing', 'tap dancing', 'ventriloquism', 'puppetry', 'sourdough starter', 'cake decorating', 'coffee roasting', 'wine making', 'crossword puzzles', 'sudoku'],
    },
  },
  {
    id: 'movies',
    label: 'Movies & TV',
    emoji: '🎬',
    words: {
      easy: ['Frozen', 'Cars', 'Shrek', 'Batman', 'Spider-Man', 'Toy Story', 'Finding Nemo', 'Star Wars', 'Harry Potter', 'Jaws', 'Up', 'The Lion King', 'Moana', 'Encanto', 'Coco', 'Aladdin', 'Kung Fu Panda', 'Monsters, Inc.', 'Barbie', 'Superman'],
      medium: ['Titanic', 'Jurassic Park', 'Ghostbusters', 'The Wizard of Oz', 'Ratatouille', 'Minions', 'Stranger Things', 'Inside Out', 'Pirates of the Caribbean', 'SpongeBob', 'The Simpsons', 'Avatar', 'Jumanji', 'King Kong', 'E.T.', 'The Little Mermaid', 'Peter Pan', 'WALL-E', 'Pokémon', 'The Incredibles'],
      hard: ['Inception', 'The Matrix', 'Back to the Future', 'Squid Game', 'Breaking Bad', 'The Office', 'Everything Everywhere All at Once', 'Spirited Away', 'Groundhog Day', 'Home Alone', 'Get Out', 'The Truman Show', 'Interstellar', 'The Godfather', 'Parasite', 'Wednesday', 'Friends', 'Game of Thrones', 'The Sixth Sense', 'The Lord of the Rings'],
    },
  },
  {
    id: 'holidays',
    label: 'Holidays',
    emoji: '🎉',
    words: {
      easy: ['Christmas tree', 'pumpkin', 'snowman', 'present', 'candy cane', 'Easter egg', 'fireworks', 'heart', 'birthday cake', 'ghost', 'turkey', 'balloon', 'wreath', 'gift bow', 'Easter basket', 'party hat', 'confetti', 'flag', 'cupid', 'sparkler'],
      medium: ["jack-o'-lantern", 'Santa Claus', 'reindeer', 'mistletoe', 'Easter bunny', 'menorah', 'piñata', "New Year's Eve", 'trick-or-treat', 'stocking', 'valentine', 'four-leaf clover', 'nutcracker', 'sleigh', 'elf', 'egg hunt', 'costume party', 'cornucopia', 'leprechaun', 'dreidel'],
      hard: ['Day of the Dead', 'Lunar New Year', 'Thanksgiving dinner', 'ugly sweater', "New Year's resolution", 'Mardi Gras', 'gingerbread man', 'Fourth of July', 'Hanukkah', 'Diwali', 'Secret Santa', "April Fools' Day", 'Boxing Day', 'Cinco de Mayo', 'Earth Day', 'Labor Day', 'Kwanzaa', 'Oktoberfest', 'Pi Day', 'white elephant'],
    },
  },
  {
    id: 'cats',
    label: 'Cats',
    emoji: '🐱',
    words: {
      easy: ['kitten', 'yarn ball', 'mouse', 'fish bone', 'litter box', 'whiskers', 'paw', 'cat tail', 'collar', 'catnip', 'scratching post', 'cat bed', 'feather toy', 'food bowl', 'cat treat', 'bell', 'cat door', 'sunbeam', 'cat carrier', 'tuna can'],
      medium: ['cat nap', 'tabby', 'cat tree', 'laser pointer', 'hairball', 'cardboard box', 'Cheshire Cat', 'cat café', 'Garfield', 'Hello Kitty', 'cat burglar', 'cone of shame', 'Puss in Boots', 'Tom and Jerry', 'black cat', 'Grumpy Cat', 'Sphynx cat', 'cat stretching', 'cat hissing', 'Pink Panther'],
      hard: ['zoomies', 'making biscuits', 'catloaf', 'if I fits I sits', 'nine lives', 'curiosity killed the cat', 'purring', "Schrödinger's cat", 'cat ears', 'crazy cat lady', 'knocking things off the table', 'cat-astrophe', 'Nyan Cat', 'Keyboard Cat', 'cat yoga', 'chirping at birds', 'cat in a sweater', 'cat sitting on a laptop', 'slow blink', 'cat ignoring you'],
    },
  },
  {
    id: 'valorant',
    label: 'Valorant',
    emoji: '🎯',
    words: {
      easy: ['Spike', 'Vandal', 'Operator', 'Sheriff', 'smoke', 'wall', 'knife', 'shield', 'headshot', 'sniper', 'grenade', 'Phantom', 'Classic', 'Ghost', 'Spectre', 'Judge', 'Odin', 'Bulldog', 'Marshal', 'ultimate'],
      medium: ['Jett', 'Sova', 'Sage', 'Killjoy', 'Reyna', 'Viper', 'Phoenix', 'Cypher', 'Ascent', 'Icebox', 'Bind', 'Haven', 'Brimstone', 'Omen', 'Raze', 'Breach', 'Split', 'Lotus', 'Breeze', 'Fracture'],
      hard: ['Ace', 'clutch', 'eco round', 'defuse', 'ninja defuse', 'one tap', 'Thrifty', 'flank', 'lurk', 'rotate', 'spray transfer', 'Spike plant', 'retake', 'wallbang', 'jiggle peek', 'entry frag', 'pre-aim', 'crosshair placement', 'smurfing', 'tilted'],
    },
  },
  {
    id: 'idioms',
    label: 'Idioms',
    emoji: '💡',
    words: {
      easy: ['piece of cake', 'cold feet', 'couch potato', 'night owl', 'fish out of water', 'top dog', 'hot potato', 'big cheese', 'early bird', 'bookworm', 'butterflies in your stomach', 'green thumb', 'on cloud nine', 'sweet tooth', 'all ears', 'busy bee', 'hothead', 'chicken out', 'apple of my eye', 'brain freeze'],
      medium: ['break the ice', 'raining cats and dogs', 'spill the beans', 'under the weather', 'elephant in the room', 'hit the sack', 'cry over spilled milk', 'cost an arm and a leg', 'let the cat out of the bag', 'head in the clouds', 'once in a blue moon', 'bite the bullet', 'break a leg', 'hold your horses', 'sit on the fence', 'in hot water', 'tip of the iceberg', 'cat got your tongue', 'cool as a cucumber', 'go bananas'],
      hard: ['kill two birds with one stone', 'the ball is in your court', 'burn the midnight oil', 'a penny for your thoughts', 'beat around the bush', 'bite off more than you can chew', 'barking up the wrong tree', 'the last straw', 'jump on the bandwagon', 'a blessing in disguise', "steal someone's thunder", 'wild goose chase', 'when pigs fly', 'add fuel to the fire', 'actions speak louder than words', "don't count your chickens", 'a picture is worth a thousand words', 'the early bird gets the worm', 'put all your eggs in one basket', 'every cloud has a silver lining'],
    },
  },
]

export function pictionaryCardSlug(word: string): string {
  return word
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
}

function buildCards(theme: ThemeDef): PictionaryCard[] {
  const out: PictionaryCard[] = []
  const seen = new Set<string>()
  for (const difficulty of PICTIONARY_DIFFICULTIES) {
    const words = [
      ...theme.words[difficulty],
      ...PICTIONARY_MORE_WORDS[theme.id][difficulty],
    ]
    for (const word of words) {
      const id = `${theme.id}:${pictionaryCardSlug(word)}`
      if (seen.has(id)) continue
      seen.add(id)
      out.push({ id, word, difficulty, theme: theme.id })
    }
  }
  return out
}

export type PictionaryTheme = {
  id: PictionaryThemeId
  label: string
  emoji: string
  cards: readonly PictionaryCard[]
}

export const PICTIONARY_THEMES: readonly PictionaryTheme[] = THEMES.map(
  (theme) => ({
    id: theme.id,
    label: theme.label,
    emoji: theme.emoji,
    cards: buildCards(theme),
  }),
)

const THEME_BY_ID = new Map(PICTIONARY_THEMES.map((t) => [t.id, t]))

export function isPictionaryThemeId(raw: unknown): raw is PictionaryThemeId {
  return typeof raw === 'string' && THEME_BY_ID.has(raw as PictionaryThemeId)
}

export function isPictionaryDeckId(raw: unknown): raw is PictionaryDeckId {
  return raw === 'all' || raw === PICTIONARY_CUSTOM_THEME || isPictionaryThemeId(raw)
}

export function pictionaryThemeLabel(theme: string): string {
  if (theme === PICTIONARY_CUSTOM_THEME) return 'Custom'
  return THEME_BY_ID.get(theme as PictionaryThemeId)?.label ?? 'Mixed'
}

export function pictionaryThemeEmoji(theme: string): string {
  if (theme === PICTIONARY_CUSTOM_THEME) return '✏️'
  return THEME_BY_ID.get(theme as PictionaryThemeId)?.emoji ?? '🎲'
}

export function pictionaryDeckLabel(deck: PictionaryDeckId | null): string {
  if (deck == null) return 'No deck'
  if (deck === 'all') return 'All themes'
  return pictionaryThemeLabel(deck)
}

/** Every card the deck can deal from. */
export function pictionaryDeckPool(
  deck: PictionaryDeckId,
  customCards: readonly PictionaryCard[],
): PictionaryCard[] {
  if (deck === 'all') {
    return [...PICTIONARY_THEMES.flatMap((t) => t.cards), ...customCards]
  }
  if (deck === PICTIONARY_CUSTOM_THEME) return [...customCards]
  return [...(THEME_BY_ID.get(deck)?.cards ?? [])]
}

/**
 * Opt-in drawer challenges. Every rule here is enforced by the canvas — no
 * honor-system rules — and each tier pays a points multiplier for both players.
 */
export type PictionaryChallengeTier = 'mild' | 'spicy' | 'wild'

export const PICTIONARY_CHALLENGE_TIERS: readonly PictionaryChallengeTier[] = [
  'mild',
  'spicy',
  'wild',
]

export const PICTIONARY_TIER_MULTIPLIER: Record<PictionaryChallengeTier, number> = {
  mild: 1.25,
  spicy: 1.5,
  wild: 2,
}

export const PICTIONARY_TIER_LABEL: Record<PictionaryChallengeTier, string> = {
  mild: 'Mild',
  spicy: 'Spicy',
  wild: 'Wild',
}

export type PictionaryModifier = {
  id: string
  /** Variants of one rule (e.g. each one-color ink) share a family; dealing picks a family first. */
  family: string
  tier: PictionaryChallengeTier
  label: string
  blurb: string
  /** Tools the canvas locks while this challenge is active. */
  locks?: {
    eraser?: boolean
    fill?: boolean
    color?: string
    size?: number
    /** Strokes (including fills) allowed for the whole round. */
    maxStrokes?: number
  }
  /** The drawer can't see their own ink. */
  blind?: boolean
  /** Round length override (ms). */
  turnMs?: number
}

const MONO_INKS: readonly { id: string; name: string; color: string }[] = [
  { id: 'black', name: 'Black', color: '#111827' },
  { id: 'red', name: 'Red', color: '#dc2626' },
  { id: 'blue', name: 'Blue', color: '#2563eb' },
  { id: 'green', name: 'Green', color: '#16a34a' },
  { id: 'purple', name: 'Purple', color: '#9333ea' },
  { id: 'orange', name: 'Orange', color: '#ea580c' },
  { id: 'brown', name: 'Brown', color: '#8b5a2b' },
  { id: 'pink', name: 'Pink', color: '#f472b6' },
]

export const PICTIONARY_MODIFIERS: readonly PictionaryModifier[] = [
  // Mild ×1.25
  { id: 'noeraser', family: 'noeraser', tier: 'mild', label: 'No eraser', blurb: 'Eraser, undo and clear are locked.', locks: { eraser: true } },
  { id: 'nofill', family: 'nofill', tier: 'mild', label: 'No fill', blurb: 'The fill bucket is locked.', locks: { fill: true } },
  { id: 'tiny', family: 'tiny', tier: 'mild', label: 'Fine tip', blurb: 'Thinnest brush only.', locks: { size: 3 } },
  ...MONO_INKS.map(
    (ink): PictionaryModifier => ({
      id: `mono-${ink.id}`,
      family: 'mono',
      tier: 'mild',
      label: `${ink.name} ink only`,
      blurb: `One color — ${ink.name.toLowerCase()}.`,
      locks: { color: ink.color },
    }),
  ),
  // Spicy ×1.5
  { id: 'speed', family: 'speed', tier: 'spicy', label: 'Speed round', blurb: '30 seconds instead of 60.', turnMs: 30_000 },
  { id: 'bigbrush', family: 'bigbrush', tier: 'spicy', label: 'Fat marker', blurb: 'Thickest brush only.', locks: { size: 28 } },
  { id: 'strokes12', family: 'strokes12', tier: 'spicy', label: '12 strokes', blurb: 'Only 12 strokes for the whole drawing — no undo.', locks: { maxStrokes: 12, eraser: true } },
  // Wild ×2
  { id: 'oneline', family: 'oneline', tier: 'wild', label: 'One line', blurb: 'A single stroke — once you lift the pen, you’re done.', locks: { maxStrokes: 1, eraser: true } },
  { id: 'blind', family: 'blind', tier: 'wild', label: 'Blindfold', blurb: 'You can’t see your own drawing. The guesser can.', blind: true },
  { id: 'strokes5', family: 'strokes5', tier: 'wild', label: '5 strokes', blurb: 'Only 5 strokes for the whole drawing — no undo.', locks: { maxStrokes: 5, eraser: true } },
]

const MODIFIER_BY_ID = new Map(PICTIONARY_MODIFIERS.map((m) => [m.id, m]))

export function pictionaryModifier(
  id: string | null | undefined,
): PictionaryModifier | null {
  if (!id) return null
  return MODIFIER_BY_ID.get(id) ?? null
}

export function pictionaryModifierMultiplier(id: string | null | undefined): number {
  const modifier = pictionaryModifier(id)
  return modifier ? PICTIONARY_TIER_MULTIPLIER[modifier.tier] : 1
}
