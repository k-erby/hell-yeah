/**
 * ✏️  THE FUN STUFF: pep talks, explosion words, rank names, Bo's titles.
 *
 * Change anything inside the 'quotes'. Add or remove lines in the [lists] freely.
 * Read src/text/README.md if you're not sure about something.
 */
export const vibe = {
  /** The big line under "Morning, Sam." Picks one per day, from both lists. */
  lines: {
    morning: [
      "Nobody's coming to do it for you. Good thing you don't need them.",
      'Make the bed like you mean it.',
      'Main character energy.',
      'Up. Ready. Unbothered.',
      'The day works for you.',
      'Get up, bitch. You have an empire to run.',
      'Good morning, your highness!',
      'Rise and grind, motherfucker.',
      'Coffee first. Then world domination.',
      'Wake the fuck up. We have shit to do.',
    ],
    afternoon: [
      "Halfway. Don't get soft now. (hehe)",
      'Refuel. Reset. Keep moving.',
      "The afternoon slump can't afford you.",
      'Hydrate like you have somewhere to be.',
      "Slump? Don't know her.",
      'Fix your crown and get back to it.',
      'Half the day down. Zero fucks given.',
      "Don't you dare get lazy now, bitch.",
    ],
    night: [
      'Shut it down like a pro.',
      'Tomorrow-you is watching. Set her up.',
      'Rest is part of the plan.',
      'Close the day. Lock the door.',
      'Bad bitches sleep eight hours.',
      'Off the clock. Phone down.',
      'Close out the day like the boss bitch you are.',
      'Shut it the fuck down. You earned it.',
    ],
  },

  /** Flash on screen when you check off one task. Keep them short, they're HUGE. */
  boomWords: [
    'BOOM BITCH', 'CRUSHED', 'YES BITCH', 'HELL YES', 'FUCK YEAH', 'BADASS', 'SLAYED',
    'DAMN RIGHT', 'NEXT, BITCH', 'FUCK OFF, TASK', 'SHE ATE', 'GET FUCKED', 'BYE BITCH',
  ],
  /** Flash on screen when you finish a whole routine. */
  bigWords: [
    'DESTROYED', 'BADASS BEHAVIOR', 'BOW DOWN', 'THAT BITCH DID IT', 'OBLITERATED', 'HOLY SHIT',
    'BOSS ASS BITCH', 'UNFUCKWITHABLE', 'FLAWLESS AS FUCK',
  ],

  /** Your rank, from XP. (How much XP each one needs lives in src/app/progress.ts.) */
  ranks: {
    rookie: 'Rookie',
    contender: 'Contender',
    boss: 'Boss',
    heavyHitter: 'Heavy Hitter',
    icon: 'Icon',
    queen: 'Queen',
    untouchable: 'Untouchable',
    legend: 'Legend',
  },

  /** The dog's levels, from bond. `perk` shows once you've reached it. */
  dogStages: {
    pup: { name: 'Pup', perk: 'Fresh recruit. Chews things.' },
    recruit: { name: 'Recruit', perk: 'Knows your schedule better than you do.' },
    partner: { name: 'Partner', perk: 'Fully grown. Fully loyal.' },
    k9: { name: 'K9 Unit', perk: 'Will die for you. Would prefer a treat.' },
    alpha: { name: 'Alpha', perk: 'Runs this house. Lets you think you do.' },
    legend: { name: 'Legend', perk: 'Ride or die, for real.' },
  },

  /** The dog's mood, from loyalty (highest to lowest). */
  moods: {
    'ride-or-die': 'Ride or die',
    'locked-in': 'Locked in',
    'on-watch': 'On watch',
    'side-eye': 'Side-eye',
    sulking: 'Sulking',
  },
};
