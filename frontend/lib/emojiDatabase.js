// frontend/lib/emojiDatabase.js
// Safe, sanitized Unicode codepoint emoji catalog organized into standard WhatsApp families.
// Prevents any arbitrary HTML or script injection by strictly mapping known safe codepoints.

export const EMOJI_CATEGORIES = [
  { id: "smileys", name: "Smileys & Emotion" },
  { id: "gestures", name: "People & Gestures" },
  { id: "animals", name: "Animals & Nature" },
  { id: "food", name: "Food & Drink" },
  { id: "travel", name: "Travel & Places" },
  { id: "activities", name: "Activities & Sports" },
  { id: "objects", name: "Objects" },
  { id: "symbols", name: "Symbols" },
];

export const EMOJI_DATABASE = [
  // ─── Smileys & Emotion ───
  { category: "smileys", char: "😀", name: "grinning face", tags: ["smile", "happy", "grin"] },
  { category: "smileys", char: "😃", name: "grinning face with big eyes", tags: ["smile", "joy", "happy"] },
  { category: "smileys", char: "😄", name: "grinning face with smiling eyes", tags: ["smile", "laugh", "happy"] },
  { category: "smileys", char: "😁", name: "beaming face with smiling eyes", tags: ["grin", "proud", "happy"] },
  { category: "smileys", char: "😆", name: "grinning squinting face", tags: ["laugh", "haha", "lol"] },
  { category: "smileys", char: "😅", name: "grinning face with sweat", tags: ["nervous", "sweat", "relief"] },
  { category: "smileys", char: "🤣", name: "rolling on the floor laughing", tags: ["rofl", "lol", "laugh"] },
  { category: "smileys", char: "😂", name: "face with tears of joy", tags: ["cry", "tears", "laugh", "joy", "lol"] },
  { category: "smileys", char: "🙂", name: "slightly smiling face", tags: ["smile", "kind", "fine"] },
  { category: "smileys", char: "😉", name: "winking face", tags: ["wink", "flirt", "joke"] },
  { category: "smileys", char: "😊", name: "smiling face with smiling eyes", tags: ["blush", "warm", "happy"] },
  { category: "smileys", char: "😇", name: "smiling face with halo", tags: ["angel", "innocent", "pure"] },
  { category: "smileys", char: "🥰", name: "smiling face with hearts", tags: ["love", "crush", "adore"] },
  { category: "smileys", char: "😍", name: "smiling face with heart-eyes", tags: ["love", "heart", "crush"] },
  { category: "smileys", char: "🤩", name: "star-struck", tags: ["stars", "amazed", "wow"] },
  { category: "smileys", char: "😘", name: "face blowing a kiss", tags: ["kiss", "love", "heart"] },
  { category: "smileys", char: "😗", name: "kissing face", tags: ["kiss", "whistle"] },
  { category: "smileys", char: "😋", name: "face savoring food", tags: ["yummy", "tasty", "delicious"] },
  { category: "smileys", char: "😛", name: "face with tongue", tags: ["tongue", "playful", "silly"] },
  { category: "smileys", char: "😜", name: "winking face with tongue", tags: ["wink", "crazy", "joke"] },
  { category: "smileys", char: "🤪", name: "zany face", tags: ["crazy", "wild", "goofy"] },
  { category: "smileys", char: "😎", name: "smiling face with sunglasses", tags: ["cool", "kalcer", "shades", "boss"] },
  { category: "smileys", char: "🤓", name: "nerd face", tags: ["nerd", "geek", "glasses"] },
  { category: "smileys", char: "🧐", name: "face with monocle", tags: ["curious", "inspect", "hmmm"] },
  { category: "smileys", char: "😏", name: "smirking face", tags: ["smirk", "flirt", "sly"] },
  { category: "smileys", char: "😒", name: "unamused face", tags: ["meh", "bored", "annoyed"] },
  { category: "smileys", char: "😞", name: "disappointed face", tags: ["sad", "down", "upset"] },
  { category: "smileys", char: "😔", name: "pensive face", tags: ["sad", "thoughtful", "sorrow"] },
  { category: "smileys", char: "😟", name: "worried face", tags: ["worry", "concern", "nervous"] },
  { category: "smileys", char: "😕", name: "confused face", tags: ["puzzled", "confused", "huh"] },
  { category: "smileys", char: "🙁", name: "slightly frowning face", tags: ["sad", "frown"] },
  { category: "smileys", char: "😣", name: "persevering face", tags: ["struggle", "pain", "endure"] },
  { category: "smileys", char: "😖", name: "confounded face", tags: ["annoyed", "frustrated"] },
  { category: "smileys", char: "😫", name: "tired face", tags: ["exhausted", "tired", "sleepy"] },
  { category: "smileys", char: "😩", name: "weary face", tags: ["weary", "tired", "done"] },
  { category: "smileys", char: "🥺", name: "pleading face", tags: ["begging", "puppy", "please", "cry"] },
  { category: "smileys", char: "😢", name: "crying face", tags: ["cry", "tear", "sad", "weep"] },
  { category: "smileys", char: "😭", name: "loudly crying face", tags: ["cry", "tears", "sob", "sad", "weep"] },
  { category: "smileys", char: "😤", name: "face with steam from nose", tags: ["triumph", "proud", "angry"] },
  { category: "smileys", char: "😠", name: "angry face", tags: ["mad", "angry", "annoyed"] },
  { category: "smileys", char: "😡", name: "enraged face", tags: ["rage", "furious", "red"] },
  { category: "smileys", char: "🤯", name: "exploding head", tags: ["mindblown", "shocked", "wow"] },
  { category: "smileys", char: "😳", name: "flushed face", tags: ["blush", "shock", "embarrassed"] },
  { category: "smileys", char: "🥵", name: "hot face", tags: ["heat", "sweat", "spicy"] },
  { category: "smileys", char: "🥶", name: "cold face", tags: ["freezing", "ice", "chilly"] },
  { category: "smileys", char: "😱", name: "face screaming in fear", tags: ["scream", "scared", "omg"] },
  { category: "smileys", char: "🥱", name: "yawning face", tags: ["bored", "sleepy", "tired"] },
  { category: "smileys", char: "😴", name: "sleeping face", tags: ["zzz", "sleep", "night"] },
  { category: "smileys", char: "💀", name: "skull", tags: ["dead", "ded", "skeleton", "rip"] },
  { category: "smileys", char: "🔥", name: "fire", tags: ["flame", "hot", "lit", "burn"] },

  // ─── People & Gestures ───
  { category: "gestures", char: "👋", name: "waving hand", tags: ["wave", "hello", "hi", "bye"] },
  { category: "gestures", char: "🤚", name: "raised back of hand", tags: ["hand", "backhand"] },
  { category: "gestures", char: "🖐️", name: "hand with fingers splayed", tags: ["five", "open"] },
  { category: "gestures", char: "✋", name: "raised hand", tags: ["stop", "highfive", "hand"] },
  { category: "gestures", char: "🖖", name: "vulcan salute", tags: ["spock", "salute"] },
  { category: "gestures", char: "👌", name: "ok hand", tags: ["ok", "perfect", "good"] },
  { category: "gestures", char: "🤌", name: "pinched fingers", tags: ["italian", "what", "chef"] },
  { category: "gestures", char: "🤏", name: "pinching hand", tags: ["little", "tiny", "small"] },
  { category: "gestures", char: "✌️", name: "victory hand", tags: ["peace", "v", "two"] },
  { category: "gestures", char: "🤞", name: "crossed fingers", tags: ["luck", "hope", "wish"] },
  { category: "gestures", char: "🤟", name: "love-you gesture", tags: ["love", "rock", "sign"] },
  { category: "gestures", char: "🤘", name: "sign of the horns", tags: ["metal", "rock", "party"] },
  { category: "gestures", char: "🤙", name: "call me hand", tags: ["call", "shaka", "hangloose"] },
  { category: "gestures", char: "👈", name: "backhand index pointing left", tags: ["point", "left"] },
  { category: "gestures", char: "👉", name: "backhand index pointing right", tags: ["point", "right"] },
  { category: "gestures", char: "👆", name: "backhand index pointing up", tags: ["point", "up"] },
  { category: "gestures", char: "👇", name: "backhand index pointing down", tags: ["point", "down"] },
  { category: "gestures", char: "👍", name: "thumbs up", tags: ["like", "yes", "good", "approve"] },
  { category: "gestures", char: "👎", name: "thumbs down", tags: ["dislike", "no", "bad"] },
  { category: "gestures", char: "✊", name: "raised fist", tags: ["power", "fist"] },
  { category: "gestures", char: "👊", name: "oncoming fist", tags: ["brofist", "punch", "bump"] },
  { category: "gestures", char: "🤛", name: "left-facing fist", tags: ["fistbump", "left"] },
  { category: "gestures", char: "🤜", name: "right-facing fist", tags: ["fistbump", "right"] },
  { category: "gestures", char: "👏", name: "clapping hands", tags: ["applause", "clap", "bravo"] },
  { category: "gestures", char: "🙌", name: "raising hands", tags: ["celebrate", "hooray", "praise"] },
  { category: "gestures", char: "👐", name: "open hands", tags: ["open", "hug"] },
  { category: "gestures", char: "🤲", name: "palms up together", tags: ["prayer", "duo"] },
  { category: "gestures", char: "🤝", name: "handshake", tags: ["deal", "agree", "meet"] },
  { category: "gestures", char: "🙏", name: "folded hands", tags: ["pray", "please", "thanks", "terimakasih"] },
  { category: "gestures", char: "💪", name: "flexed biceps", tags: ["strong", "muscle", "workout"] },

  // ─── Animals & Nature ───
  { category: "animals", char: "🐶", name: "dog face", tags: ["dog", "puppy", "pet"] },
  { category: "animals", char: "🐱", name: "cat face", tags: ["cat", "kitten", "pet"] },
  { category: "animals", char: "🦁", name: "lion", tags: ["lion", "king", "roar"] },
  { category: "animals", char: "🐯", name: "tiger face", tags: ["tiger", "stripes"] },
  { category: "animals", char: "🐻", name: "bear", tags: ["bear", "cuddle"] },
  { category: "animals", char: "🐼", name: "panda", tags: ["panda", "bamboo"] },
  { category: "animals", char: "🐨", name: "koala", tags: ["koala", "australia"] },
  { category: "animals", char: "🐒", name: "monkey", tags: ["monkey", "chimp"] },
  { category: "animals", char: "🦅", name: "eagle", tags: ["eagle", "bird", "fly"] },
  { category: "animals", char: "🐍", name: "snake", tags: ["snake", "slither"] },
  { category: "animals", char: "🌸", name: "cherry blossom", tags: ["flower", "spring", "sakura"] },
  { category: "animals", char: "🌹", name: "rose", tags: ["flower", "romantic", "red"] },
  { category: "animals", char: "🌴", name: "palm tree", tags: ["tree", "beach", "summer"] },
  { category: "animals", char: "🌲", name: "evergreen tree", tags: ["tree", "forest", "pine"] },
  { category: "animals", char: "✨", name: "sparkles", tags: ["shine", "magic", "clean", "star"] },
  { category: "animals", char: "⭐", name: "star", tags: ["star", "favorite", "bright"] },

  // ─── Food & Drink ───
  { category: "food", char: "☕", name: "hot beverage", tags: ["coffee", "tea", "kopi", "cafe"] },
  { category: "food", char: "🍵", name: "teacup without handle", tags: ["tea", "green tea", "matcha"] },
  { category: "food", char: "🥤", name: "cup with straw", tags: ["soda", "drink", "juice"] },
  { category: "food", char: "🍺", name: "beer mug", tags: ["beer", "drink", "party", "cheers"] },
  { category: "food", char: "🍻", name: "clinking beer mugs", tags: ["beer", "cheers", "celebrate"] },
  { category: "food", char: "🍷", name: "wine glass", tags: ["wine", "drink", "alcohol"] },
  { category: "food", char: "🍕", name: "pizza", tags: ["pizza", "cheese", "slice"] },
  { category: "food", char: "🍔", name: "hamburger", tags: ["burger", "fastfood", "beef"] },
  { category: "food", char: "🍟", name: "french fries", tags: ["fries", "potato", "snack"] },
  { category: "food", char: "🍜", name: "steaming bowl", tags: ["ramen", "noodles", "soup", "mie"] },
  { category: "food", char: "🍣", name: "sushi", tags: ["sushi", "japanese", "fish"] },
  { category: "food", char: "🍩", name: "doughnut", tags: ["donut", "sweet", "snack"] },
  { category: "food", char: "🍦", name: "soft ice cream", tags: ["icecream", "dessert", "sweet"] },
  { category: "food", char: "🍎", name: "red apple", tags: ["apple", "fruit", "red"] },
  { category: "food", char: "🍉", name: "watermelon", tags: ["fruit", "melon", "fresh"] },

  // ─── Travel & Places (Automotive culture focused) ───
  { category: "travel", char: "🚗", name: "automobile", tags: ["car", "mobil", "drive", "ride"] },
  { category: "travel", char: "🏎️", name: "racing car", tags: ["car", "racing", "f1", "speed", "drift", "kalcer"] },
  { category: "travel", char: "🏍️", name: "motorcycle", tags: ["motor", "bike", "ride", "sunmori"] },
  { category: "travel", char: "🛵", name: "motor scooter", tags: ["vespa", "scooter", "matic"] },
  { category: "travel", char: "🚙", name: "sport utility vehicle", tags: ["suv", "jeep", "offroad"] },
  { category: "travel", char: "🏁", name: "chequered flag", tags: ["flag", "finish", "race", "circuit"] },
  { category: "travel", char: "⛽", name: "fuel pump", tags: ["gas", "bensin", "fuel", "pertamax", "spbu"] },
  { category: "travel", char: "🚦", name: "traffic light", tags: ["traffic", "stop", "signal"] },
  { category: "travel", char: "💨", name: "dashing away", tags: ["speed", "fast", "gaspol", "smoke", "exhaust"] },
  { category: "travel", char: "✈️", name: "airplane", tags: ["plane", "flight", "travel"] },
  { category: "travel", char: "🚀", name: "rocket", tags: ["space", "launch", "fast", "moon"] },
  { category: "travel", char: "🗺️", name: "world map", tags: ["map", "location", "snapmap", "kalceria"] },
  { category: "travel", char: "📍", name: "round pushpin", tags: ["pin", "location", "titik", "meetup"] },

  // ─── Activities & Sports ───
  { category: "activities", char: "⚽", name: "soccer ball", tags: ["soccer", "football", "ball"] },
  { category: "activities", char: "🏀", name: "basketball", tags: ["basketball", "hoops"] },
  { category: "activities", char: "🏆", name: "trophy", tags: ["winner", "first", "champion", "cup"] },
  { category: "activities", char: "🥇", name: "1st place medal", tags: ["gold", "medal", "champion"] },
  { category: "activities", char: "🎮", name: "video game", tags: ["game", "gaming", "playstation"] },
  { category: "activities", char: "🎲", name: "game die", tags: ["dice", "random", "boardgame"] },
  { category: "activities", char: "🎉", name: "party popper", tags: ["party", "celebrate", "congrats"] },
  { category: "activities", char: "🎸", name: "guitar", tags: ["music", "rock", "acoustic"] },

  // ─── Objects ───
  { category: "objects", char: "📱", name: "mobile phone", tags: ["phone", "smartphone", "hp", "call"] },
  { category: "objects", char: "💻", name: "laptop", tags: ["computer", "pc", "tech"] },
  { category: "objects", char: "📷", name: "camera", tags: ["photo", "picture", "lens"] },
  { category: "objects", char: "📸", name: "camera with flash", tags: ["photo", "flash", "snap"] },
  { category: "objects", char: "📹", name: "video camera", tags: ["video", "camcorder", "record"] },
  { category: "objects", char: "🔑", name: "key", tags: ["lock", "car key", "unlock", "kunci"] },
  { category: "objects", char: "💡", name: "light bulb", tags: ["idea", "bright", "smart"] },
  { category: "objects", char: "💸", name: "money with wings", tags: ["cash", "money", "uang", "gajian"] },
  { category: "objects", char: "🔧", name: "wrench", tags: ["tool", "mechanic", "bengkel", "mod"] },
  { category: "objects", char: "🛠️", name: "hammer and wrench", tags: ["tools", "bengkel", "build"] },

  // ─── Symbols ───
  { category: "symbols", char: "❤️", name: "red heart", tags: ["love", "heart", "like"] },
  { category: "symbols", char: "🖤", name: "black heart", tags: ["dark", "black", "kalcer"] },
  { category: "symbols", char: "💯", name: "hundred points", tags: ["100", "perfect", "full"] },
  { category: "symbols", char: "⚡", name: "high voltage", tags: ["lightning", "zap", "electric", "power"] },
  { category: "symbols", char: "✅", name: "check mark button", tags: ["done", "check", "yes", "correct"] },
  { category: "symbols", char: "❌", name: "cross mark", tags: ["no", "x", "wrong", "cancel"] },
  { category: "symbols", char: "⚠️", name: "warning", tags: ["alert", "caution", "danger"] },
  { category: "symbols", char: "🚨", name: "police car light", tags: ["siren", "emergency", "alert"] },
];

/**
 * Fast keyword resolving algorithm for matching emoji name, family, or tags.
 */
export function searchEmojis(query = "") {
  const clean = String(query || "").trim().toLowerCase();
  if (!clean) return EMOJI_DATABASE;

  return EMOJI_DATABASE.filter((em) => {
    if (em.name.toLowerCase().includes(clean)) return true;
    if (em.tags.some((t) => t.toLowerCase().includes(clean))) return true;
    if (em.char === clean) return true;
    return false;
  });
}

