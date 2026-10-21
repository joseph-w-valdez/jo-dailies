/** Pictionary word cards, themes, and round modifiers. */

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
  for (const difficulty of PICTIONARY_DIFFICULTIES) {
    for (const word of theme.words[difficulty]) {
      out.push({
        id: `${theme.id}:${pictionaryCardSlug(word)}`,
        word,
        difficulty,
        theme: theme.id,
      })
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

export type PictionaryModifierId =
  | 'offhand'
  | 'oneline'
  | 'noeraser'
  | 'mono'
  | 'tiny'
  | 'shapes'
  | 'eyesclosed'
  | 'speed'

export type PictionaryModifier = {
  id: PictionaryModifierId
  label: string
  blurb: string
  /** Tools the canvas locks while this modifier is active. */
  locks?: { eraser?: boolean; color?: string; size?: number }
  /** Round length override (ms). */
  turnMs?: number
  /** Multiplier on both players' points. */
  pointsMultiplier?: number
}

export const PICTIONARY_MODIFIERS: readonly PictionaryModifier[] = [
  { id: 'offhand', label: 'Off hand', blurb: 'Draw with your non-dominant hand.' },
  { id: 'oneline', label: 'One line', blurb: 'Try not to lift the pen — one continuous line.' },
  { id: 'noeraser', label: 'No eraser', blurb: 'Eraser, undo and clear are locked.', locks: { eraser: true } },
  { id: 'mono', label: 'Black ink', blurb: 'One color only.', locks: { color: '#111827' } },
  { id: 'tiny', label: 'Fine tip', blurb: 'Thinnest brush only.', locks: { size: 3 } },
  { id: 'shapes', label: 'Shapes only', blurb: 'Only circles, squares and straight lines.' },
  { id: 'eyesclosed', label: 'Eyes closed', blurb: 'Keep your eyes shut for the first 5 seconds.' },
  { id: 'speed', label: 'Speed round', blurb: 'Half the time, double the points.', turnMs: 30_000, pointsMultiplier: 2 },
]

const MODIFIER_BY_ID = new Map(PICTIONARY_MODIFIERS.map((m) => [m.id, m]))

export function pictionaryModifier(
  id: string | null | undefined,
): PictionaryModifier | null {
  if (!id) return null
  return MODIFIER_BY_ID.get(id as PictionaryModifierId) ?? null
}
