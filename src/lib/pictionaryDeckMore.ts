/** Second batch of Pictionary cards — merged into each theme in pictionaryDeck.ts. */
import type { PictionaryDifficulty, PictionaryThemeId } from './pictionaryDeck'

/** Decks written at full size up front have no second batch. */
const NONE: Record<PictionaryDifficulty, readonly string[]> = { easy: [], medium: [], hard: [] }

export const PICTIONARY_MORE_WORDS: Record<
  PictionaryThemeId,
  Record<PictionaryDifficulty, readonly string[]>
> = {
  superheroes: NONE,
  toys: NONE,
  spooky: NONE,
  countries: NONE,
  school: NONE,
  anime: NONE,
  datenight: NONE,
  rooms: NONE,
  brands: NONE,
  emojis: NONE,
  fastfood: NONE,
  desserts: NONE,
  breakfast: NONE,
  medieval: NONE,
  pets: NONE,
  farm: NONE,
  travel: NONE,
  hobbies: NONE,
  objects: {
    easy: ['wallet', 'comb', 'dice', 'teddy bear', 'coin', 'battery', 'bottle', 'basket', 'hammer', 'shovel', 'ruler', 'screw', 'eraser'],
    medium: ['calculator', 'globe', 'saddle', 'lantern', 'chess piece', 'bow and arrow', 'safety pin', 'tape measure', 'toolbox', 'lunchbox', 'music box', 'pocket watch', 'birdhouse'],
    hard: ['fidget spinner', 'Magic 8 Ball', 'rocking horse', 'ship in a bottle', 'Etch A Sketch', 'Polaroid camera', 'quill pen', 'Monopoly money', 'Russian nesting dolls', "Newton's cradle", 'Tamagotchi', 'disco ball', 'gyroscope', 'ventriloquist dummy'],
  },
  people: {
    easy: ['grandma', 'grandpa', 'nurse', 'baker', 'soldier', 'sailor', 'prince', 'twins', 'bride', 'groom', 'student', 'tourist', 'artist'],
    medium: ['stunt double', 'archaeologist', 'surgeon', 'judge', 'chimney sweep', 'tour guide', 'flight attendant', 'waiter', 'janitor', 'photographer', 'librarian', 'zookeeper', 'personal trainer'],
    hard: ['Queen Elizabeth', 'Barack Obama', 'Beyoncé', 'Oprah', 'Elon Musk', 'Gordon Ramsay', 'Bob Ross', 'Frida Kahlo', 'Vincent van Gogh', 'Marie Curie', 'Julius Caesar', 'Joan of Arc', 'Captain Jack Sparrow', 'Willy Wonka'],
  },
  actions: {
    easy: ['push', 'pull', 'dig', 'draw', 'write', 'smile', 'wink', 'think', 'shout', 'drink', 'crawl', 'bow', 'ride'],
    medium: ['tickling', 'arm wrestling', 'skipping rope', 'flipping pancakes', 'high five', 'piggyback ride', 'pillow fight', 'snowball fight', 'stretching', 'texting', 'waving goodbye', 'jumping jacks', 'playing hide and seek'],
    hard: ['Heimlich maneuver', 'ice bucket challenge', 'falling asleep in class', 'running late', 'stepping on a Lego', 'stubbing your toe', 'breakdancing', 'the floss dance', 'the robot dance', 'dabbing', 'pulling an all-nighter', 'tripping over nothing', 'playing dead', 'bungee jumping'],
  },
  animals: {
    easy: ['ant', 'worm', 'goat', 'deer', 'fox', 'mouse', 'whale', 'tiger', 'wolf', 'crocodile', 'puppy', 'goose', 'dinosaur'],
    medium: ['hippo', 'rhino', 'panda', 'polar bear', 'raccoon', 'squirrel', 'swan', 'toucan', 'beaver', 'ostrich', 'llama', 'scorpion', 'seal'],
    hard: ['okapi', 'capybara', 'tapir', 'meerkat', 'lemur', 'wombat', 'iguana', 'vulture', 'Komodo dragon', 'flying squirrel', 'red panda', 'hummingbird', 'tarantula', 'Tasmanian devil'],
  },
  places: {
    easy: ['hotel', 'bank', 'lake', 'hill', 'road', 'pond', 'bakery', 'jail', 'barn', 'treehouse', 'police station', 'swimming pool', 'restaurant'],
    medium: ['casino', 'stadium', 'mall', 'laundromat', 'greenhouse', 'observatory', 'cemetery', 'factory', 'harbor', 'oasis', 'canyon', 'rainforest', 'art gallery'],
    hard: ['Grand Canyon', 'Paris', 'Tokyo', 'New York City', 'London', 'Antarctica', 'Sahara Desert', 'Amazon rainforest', 'Mount Fuji', 'Christ the Redeemer', 'Easter Island', 'Hollywood Walk of Fame', 'Route 66', 'the White House'],
  },
  difficult: {
    easy: ['sad', 'sleepy', 'small', 'big', 'wet', 'dirty', 'clean', 'slow', 'soft', 'heavy', 'sick', 'brave', 'surprised'],
    medium: ['courage', 'boredom', 'confusion', 'curiosity', 'friendship', 'memory', 'opinion', 'trust', 'weekend', 'patience', 'silence', 'future', 'rumor'],
    hard: ['imposter syndrome', 'peer pressure', 'common sense', 'white lie', 'plot twist', 'guilty pleasure', 'comfort zone', 'cabin fever', "beginner's luck", 'second thoughts', 'tunnel vision', 'mixed feelings', 'the meaning of life', 'supply and demand'],
  },
  food: {
    easy: ['pear', 'peach', 'potato', 'tomato', 'milk', 'honey', 'toast', 'soup', 'rice', 'chocolate', 'candy', 'steak', 'peas'],
    medium: ['bagel', 'fried chicken', 'meatballs', 'quesadilla', 'cereal', 'gummy bears', 'chicken nuggets', 'mac and cheese', 'smoothie', 'kiwi', 'avocado', 'garlic', 'fruit salad'],
    hard: ['pho', 'bibimbap', 'churros', 'falafel', 'deviled eggs', 'Spam musubi', 'Philly cheesesteak', 'chicken and waffles', 'lobster roll', 'French toast', 'Caesar salad', 'cake pop', 'macarons', 'kimchi'],
  },
  household: {
    easy: ['sink', 'rug', 'shelf', 'oven', 'pan', 'curtain', 'mop', 'toilet', 'bowl', 'napkin', 'blanket', 'dresser', 'faucet'],
    medium: ['coffee maker', 'iron', 'plunger', 'cutting board', 'rolling pin', 'sponge', 'light switch', 'baby monitor', 'spice rack', 'night light', 'fireplace', 'garage door', 'staircase'],
    hard: ['garbage disposal', 'Murphy bed', 'chandelier', 'grandfather clock', 'futon', 'beanbag chair', 'toilet paper roll', 'can opener', 'pizza cutter', 'salad spinner', 'pressure cooker', 'lazy Susan', 'humidifier', 'smart speaker'],
  },
  nature: {
    easy: ['mud', 'sky', 'bush', 'seed', 'branch', 'icicle', 'sunrise', 'thunder', 'ice', 'storm', 'nest', 'pebble', 'tree stump'],
    medium: ['moss', 'vine', 'fern', 'dandelion', 'maple leaf', 'frost', 'drought', 'flood', 'wildfire', 'heat wave', 'dust storm', 'mudslide', 'redwood tree'],
    hard: ['blizzard', 'ozone layer', 'carbon footprint', 'climate change', 'tectonic plates', 'pollination', 'decomposition', 'petrified forest', 'Old Faithful', 'eye of the storm', 'permafrost', 'Ring of Fire', 'El Niño', 'coral atoll'],
  },
  vehicles: {
    easy: ['van', 'jeep', 'raft', 'jet', 'race car', 'tricycle', 'wagon', 'sled', 'ferry', 'pickup truck', 'speedboat', 'go-kart', 'rowboat'],
    medium: ['tow truck', 'cement mixer', 'crane', 'seaplane', 'glider', 'blimp', 'yacht', 'cruise ship', 'steam train', 'bullet train', 'RV', 'food truck', 'electric scooter'],
    hard: ['lunar module', 'stealth bomber', 'aircraft carrier', 'Viking ship', 'horse and carriage', 'penny-farthing', 'Mystery Machine', 'Hogwarts Express', 'Millennium Falcon', 'Zamboni', 'hang glider', 'sidecar', 'TARDIS', 'Polar Express'],
  },
  sports: {
    easy: ['swimming', 'jump rope', 'kickball', 'dodgeball', 'bowling', 'skating', 'racing', 'diving', 'sit-up', 'handstand', 'gold medal', 'referee whistle', 'soccer goal'],
    medium: ['judo', 'horse racing', 'javelin', 'discus', 'shot put', 'weightlifting', 'water skiing', 'mini golf', 'free throw', 'knockout', 'cheerleading', 'paintball', 'sprint'],
    hard: ['Olympics', 'Michael Jordan', 'Usain Bolt', 'Serena Williams', 'Lionel Messi', 'Tiger Woods', 'Muhammad Ali', 'Kentucky Derby', 'Stanley Cup', 'March Madness', 'ultimate frisbee', 'steeplechase', 'biathlon', 'seventh-inning stretch'],
  },
  music: {
    easy: ['drumsticks', 'recorder', 'kazoo', 'cymbals', 'earbuds', 'CD', 'stage', 'bongos', 'drum set', 'spotlight', 'love song', 'guitar pick', 'whistle'],
    medium: ['orchestra', 'duet', 'lead singer', 'backup dancers', 'lip sync', 'guitar solo', 'headbanging', 'rapper', 'boy band', 'album cover', 'sheet music', 'piano recital', 'battle of the bands'],
    hard: ['Freddie Mercury', 'Ed Sheeran', 'Bruno Mars', 'Bad Bunny', 'Ariana Grande', 'Billie Eilish', 'Drake', 'Eminem', 'Bob Marley', 'Johnny Cash', 'ABBA', 'Macarena', 'YMCA', 'Gangnam Style'],
  },
  fantasy: {
    easy: ['monster', 'witch', 'pixie', 'elf ears', 'gnome', 'imp', 'ghost ship', 'haunted castle', 'magic spell', 'sea serpent', 'wizard staff', 'dragon fire', 'fairy dust'],
    medium: ['banshee', 'siren', 'satyr', 'dragon rider', 'invisibility cloak', 'magic portal', 'wishing well', 'sorcerer', 'warlock', 'phoenix feather', 'shapeshifter', 'fire breathing', 'mermaid tail'],
    hard: ['Odin', 'Loki', 'kitsune', 'Baba Yaga', 'Icarus', 'Narnia', 'Middle-earth', 'Hogwarts', 'Gandalf', 'Smaug', 'Cerberus', 'Krampus', 'labyrinth', 'dragon slayer'],
  },
  fairytales: {
    easy: ['wicked witch', 'Prince Charming', 'spinning wheel', 'golden egg', 'straw house', 'brick house', 'red hood', 'porridge', 'three bears', 'tiara', 'stepsisters', 'fairy tale castle', 'glass coffin'],
    medium: ['Neverland', 'Lost Boys', 'Queen of Hearts', 'Mary Had a Little Lamb', 'Baa Baa Black Sheep', 'London Bridge Is Falling Down', 'Ring Around the Rosie', 'Rock-a-bye Baby', 'Little Miss Muffet', 'Hey Diddle Diddle', 'Little Boy Blue', 'Old Mother Hubbard', 'Pat-a-Cake'],
    hard: ['The Twelve Dancing Princesses', 'Sinbad the Sailor', 'Ali Baba and the Forty Thieves', 'Arabian Nights', 'Peter Rabbit', 'The Elves and the Shoemaker', 'The Owl and the Pussycat', "a wolf in sheep's clothing", 'The Lion and the Mouse', 'The Fox and the Grapes', 'The Little Engine That Could', 'Where the Wild Things Are', 'The Very Hungry Caterpillar', 'Green Eggs and Ham'],
  },
  space: {
    easy: ['Venus', 'Mercury', 'orbit', 'moon rock', 'space food', 'starry sky', 'full moon', 'flag on the moon', 'solar panel', 'space dog', 'shooting star', 'stargazing', 'Uranus'],
    medium: ['asteroid belt', 'planetarium', 'astronomer', 'red planet', 'dwarf planet', 'space capsule', 'moon base', 'solar flare', 'sunspot', 'International Space Station', 'radio telescope', 'meteor crater', 'Mars colony'],
    hard: ['James Webb telescope', 'Buzz Aldrin', 'Yuri Gagarin', 'Star Trek', 'E.T. phone home', 'quasar', 'exoplanet', 'Kuiper Belt', 'Great Red Spot', 'first contact', 'the final frontier', 'cosmic dust', 'Space Force', 'time dilation'],
  },
  ocean: {
    easy: ['beach umbrella', 'sunscreen', 'swim ring', 'sand dollar', 'lobster', 'fishing boat', 'sailor hat', 'pool float', 'volleyball net', 'lifeguard chair', 'shrimp', 'oyster', 'shark fin'],
    medium: ['coral', 'kelp forest', 'sea anemone', 'swordfish', 'manatee', 'barnacle', 'seal pup', 'beach bonfire', 'glass-bottom boat', 'lighthouse keeper', 'sea breeze', 'octopus ink', 'surf shop'],
    hard: ['Moby Dick', 'The Old Man and the Sea', 'deep sea vent', 'leafy sea dragon', "Portuguese man o' war", 'vampire squid', 'goblin shark', 'rogue wave', 'underwater volcano', 'red tide', 'sea foam', 'ocean currents', 'sunken city', 'Jacques Cousteau'],
  },
  clothing: {
    easy: ['coat', 'jeans', 'T-shirt', 'slippers', 'sneakers', 'vest', 'bib', 'uniform', 'cape', 'mask', 'bikini', 'sun hat', 'headband'],
    medium: ['sari', 'trench coat', 'ski goggles', 'rain boots', 'wetsuit', 'lab coat', 'leather jacket', 'hair bow', 'corset', 'fedora', 'flannel shirt', 'graduation cap', "chef's hat"],
    hard: ['pointe shoes', 'bell-bottoms', 'chainmail', 'suit of armor', 'Halloween costume', 'matching outfits', 'power suit', 'cargo shorts', 'denim on denim', 'puffer jacket', 'sequin dress', 'clip-on tie', 'frilly collar', 'pirate outfit'],
  },
  body: {
    easy: ['arm', 'leg', 'head', 'neck', 'chin', 'cheek', 'eyebrow', 'eyelash', 'thumb', 'fingernail', 'shoulder', 'ankle', 'wrist'],
    medium: ['heartbeat', 'stomach', 'skull', 'spine', 'rib cage', 'sweat', 'bruise', 'scab', 'stitches', 'pill', 'eye chart', 'hearing aid', 'earache'],
    hard: ['appendix', 'digestion', 'nervous system', 'blood type', 'food poisoning', 'motion sickness', 'muscle memory', 'fight or flight', 'left-handed', 'photographic memory', 'flat feet', 'split ends', "crow's feet", 'sleep paralysis'],
  },
  jobs: {
    easy: ['phone call', 'folder', 'file cabinet', 'stapler', 'mouse pad', 'ID badge', 'receptionist', 'employee of the month', 'time clock', 'desk lamp', 'office plant', 'copy machine', 'to-do list'],
    medium: ['board meeting', 'sales pitch', 'pie chart', 'hard hat', 'night shift', 'coworker', 'CEO', 'layoff', 'office gossip', 'vacation day', 'sick day', 'business trip', 'conference call'],
    hard: ['Ctrl+Alt+Delete', 'blue screen of death', 'salary negotiation', 'open office plan', 'standing desk', 'elevator pitch', 'glass ceiling', 'Silicon Valley', 'startup', 'hostile takeover', 'stock market crash', 'Shark Tank', 'Wall Street', 'the 9 to 5'],
  },
  games: {
    easy: ['Game Boy', 'VR headset', 'leaderboard', 'pixel art', 'pause button', 'start button', 'player one', 'Pong', 'Galaga', 'game cartridge', 'Wii remote', 'claw machine', 'pinball'],
    medium: ['Splatoon', 'Pokémon Go', 'Wii Sports', 'Just Dance', 'Guitar Hero', 'Flappy Bird', 'Fruit Ninja', 'Subway Surfers', 'Crossy Road', 'Duck Hunt', 'Master Sword', 'Bowser', 'Princess Peach'],
    hard: ['Hollow Knight', 'Celeste', 'Undertale', 'Genshin Impact', "Baldur's Gate", 'Skyrim', 'Red Dead Redemption', 'Resident Evil', "Five Nights at Freddy's", 'Cuphead', 'Untitled Goose Game', 'Breath of the Wild', 'Minecraft creeper', 'Pac-Man ghost'],
  },
  disney: {
    easy: ['Pluto', 'Daisy Duck', 'Piglet', 'Flounder', 'Sebastian the crab', 'Patrick Star', 'Kermit the Frog', 'Big Bird', 'Cookie Monster', 'Bluey', 'Paw Patrol', 'Dora the Explorer', 'Tweety Bird'],
    medium: ['Mufasa', 'Timon', 'Zazu', 'Abu', 'Mushu', 'Pascal', 'Flynn Rider', 'Kristoff', 'Edna Mode', 'Mater', 'Daffy Duck', 'Road Runner', 'Wile E. Coyote'],
    hard: ['A Whole New World', 'Be Our Guest', 'The Jungle Book', 'The Aristocats', 'Lady and the Tramp spaghetti', '101 Dalmatians', 'Haunted Mansion', 'Space Mountain', 'Tower of Terror', "It's a Small World", 'Zootopia', 'Looney Tunes', 'Avatar: The Last Airbender', 'honey pot'],
  },
  internet: {
    easy: ['webcam', 'app', 'tablet', 'chat bubble', 'search bar', 'loading bar', 'playlist', 'skip ad button', 'share button', 'smiley face', 'Facebook', 'Snapchat', 'Netflix'],
    medium: ['online dating', 'password reset', 'fake news', 'trending', 'photo filter', 'streamer', 'screen time', 'read receipt', 'typing bubble', 'Wikipedia', 'Reddit', 'Twitch', 'unsubscribe'],
    hard: ['Charlie bit my finger', 'the dress', 'planking', 'Success Kid', 'Hide the Pain Harold', 'surprised Pikachu', 'Big Chungus', 'deepfake', 'Y2K', 'dial-up internet', 'dark web', 'Leave Britney alone', 'the floor is lava', 'going viral'],
  },
  compound: {
    easy: ['rainbow', 'cupcake', 'popcorn', 'football', 'pancake', 'snowman', 'sunflower', 'raincoat', 'mailbox', 'bathtub', 'seahorse', 'backpack', 'birdhouse'],
    medium: ['sandpaper', 'housefly', 'earthquake', 'lighthouse', 'keyboard', 'waterfall', 'starlight', 'bookmark', 'wheelchair', 'skyscraper', 'drumstick', 'fireworks', 'goldfish'],
    hard: ['underdog', 'forklift', 'eyewitness', 'headquarters', 'nutshell', 'pinwheel', 'hotshot', 'backbone', 'mothball', 'jackpot', 'wishbone', 'blackmail', 'outlaw', 'crossword'],
  },
  movies: {
    easy: ['Elf', 'Godzilla', 'Madagascar', 'Ice Age', 'Despicable Me', 'The Grinch', 'Mary Poppins', 'Sesame Street', 'Wonder Woman', 'The Hulk', 'Iron Man', 'Paddington', 'The Smurfs'],
    medium: ['Top Gun', 'Rocky', 'Grease', 'The Karate Kid', 'Indiana Jones', 'Men in Black', 'Charlie and the Chocolate Factory', 'Mean Girls', 'Legally Blonde', 'Ted Lasso', 'The Mandalorian', 'Wicked', 'Hannah Montana'],
    hard: ['Pulp Fiction', 'Forrest Gump', 'The Shining', 'Psycho', 'Fight Club', 'The Notebook', 'La La Land', 'Oppenheimer', 'Dune', 'Black Mirror', 'The Crown', 'Seinfeld', 'Gilmore Girls', 'The Bear'],
  },
  holidays: {
    easy: ['Christmas lights', 'Santa hat', 'spider web', 'cake candles', 'gift wrap', 'snow angel', 'hot cocoa', 'jingle bells', 'bunny ears', 'Halloween candy', 'chocolate bunny', 'party popper', 'greeting card'],
    medium: ['Rudolph', 'Frosty the Snowman', 'ball drop', 'Easter parade', 'corn maze', 'pumpkin patch', 'pumpkin carving', 'Christmas carols', "St. Patrick's Day", "Valentine's Day", "Mother's Day", "Father's Day", 'surprise party'],
    hard: ['Juneteenth', 'Memorial Day', 'Veterans Day', 'Holi', 'Ramadan', 'Passover', 'Guy Fawkes Night', 'Black Friday', 'Cyber Monday', 'Elf on the Shelf', 'Festivus', 'Chinese zodiac', 'harvest moon', 'summer solstice'],
  },
  cats: {
    easy: ['meow', 'cat nose', 'cat eyes', 'fat cat', 'orange cat', 'Siamese cat', 'cat on a lap', 'cat yawning', 'cat licking its paw', 'paw print', 'kitten pile', 'cat fur', 'cat sneeze'],
    medium: ['vet visit', 'cat bath', 'cat burrito', 'cat hammock', 'cat meme', 'cat stuck in a tree', 'cat chasing its tail', 'cat birthday party', 'litter scoop', 'cat staring at the wall', 'cat window perch', 'cat stealing food', 'cat backpack'],
    hard: ['Felix the Cat', 'Sylvester', 'Salem', 'Catwoman', 'Cats the musical', 'Doja Cat', "the cat's pajamas", "cat's cradle", 'CAT scan', 'cat on a hot tin roof', "I'm not a cat", 'cat person vs dog person', 'ThunderCats', 'Duchess'],
  },
  valorant: {
    easy: ['Stinger', 'Frenzy', 'Shorty', 'Bucky', 'Guardian', 'Ares', 'Outlaw', 'credits', 'ultimate orb', 'teleporter', 'minimap', 'crouch', 'knife kill'],
    medium: ['Astra', 'Yoru', 'KAY/O', 'Chamber', 'Harbor', 'Deadlock', 'Iso', 'Clove', 'Skye', 'Neon', 'Fade', 'Gekko', 'Pearl'],
    hard: ['B site', 'mid control', 'pistol round', 'force buy', 'save round', 'dry peek', 'Spike Rush', 'Deathmatch', 'Radiant rank', 'Iron rank', 'Sunset', 'Abyss', 'overtime', 'team ace'],
  },
  idioms: {
    easy: ['cold shoulder', 'heart of gold', 'monkey business', 'sleep on it', 'black sheep', 'red tape', 'pig out', 'hit the books', 'hang in there', 'in the doghouse', 'on thin ice', 'zip it', 'time flies'],
    medium: ['skeleton in the closet', 'drop the ball', "pull someone's leg", 'a piece of the pie', 'bring home the bacon', 'butter someone up', 'cut corners', 'go the extra mile', 'hit the nail on the head', 'let sleeping dogs lie', 'saved by the bell', 'see eye to eye', 'two peas in a pod'],
    hard: ['the pot calling the kettle black', 'a bird in the hand', "don't judge a book by its cover", "you can't have your cake and eat it too", 'an apple a day keeps the doctor away', 'too many cooks spoil the broth', 'the grass is always greener', "the straw that broke the camel's back", 'throw the baby out with the bathwater', 'you can lead a horse to water', "Rome wasn't built in a day", 'a watched pot never boils', 'every dog has its day', 'the whole nine yards'],
  },
}
