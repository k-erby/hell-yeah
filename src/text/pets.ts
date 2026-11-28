/**
 * Reminders and one-time tips about the pet, shown above the checklist on Today.
 * Written for any pet: {pet} is the pet's name. <b>bold</b> is fine.
 */
export const pets = {
  /** The pets you can pick in Settings. Picking one renames your pet, unless you've given it your own name. */
  kinds: {
    bo: { name: 'Bo', what: 'German shepherd' },
    hudson: { name: 'Hudson', what: 'Golden retriever' },
    monty: { name: 'Monty', what: 'Fluffy orange cat' },
    hubble: { name: 'Hubble', what: 'Tuxedo cat' },
    rat: { name: 'Ziggy', what: 'Rat' },
    pigeon: { name: 'Pearl', what: 'Pigeon' },
  },
  /** Shown when the pet needs something. Only one at a time; "Not now" hides it until tomorrow. */
  needs: {
    sulking: "<b>{pet}'s sulking.</b> Check something off to win {pet} back.",
    hungry: { one: "<b>{pet}'s hungry.</b> You've got {n} treat.", other: "<b>{pet}'s hungry.</b> You've got {n} treats." },
    play: '<b>{pet} brought you a toy.</b>',
  },
  /** The button next to a need. */
  actions: {
    hungry: 'Feed',
    play: 'Play',
  },
  /** Each shows once, the first time it applies, until you tap "Got it". */
  tips: {
    firstCheck: "<b>That just earned {pet}'s trust.</b> Every check-off does. Slowly.",
    firstTreat: '<b>You earned a treat.</b> Feed {pet} once a day. The first treat is a meal.',
    trust50: "<b>{pet} trusts you now.</b> Throw a toy and {pet}'ll actually go get it.",
    trust70: "<b>{pet}'s warming up.</b> More play, more tail.",
    trust90: '<b>Ride or die.</b> {pet} would follow you anywhere.',
  },
  /** The "How {pet}'s doing" card on the pet's page. */
  status: {
    eyebrow: 'Right now',
    heading: "How {pet}'s doing",
    hunger: 'Hunger',
    hungry: 'Hungry',
    fed: 'Fed today',
    hungryHint: 'Give {pet} a treat. The first one each day is a meal.',
    hungryNoTreats: 'Out of treats. Finish a routine to earn one.',
    fedHint: 'Next meal tomorrow.',
    trust: 'Trust today',
    trustValue: '+{n} of {cap}',
    trustRoom: 'Everything you check off adds a little.',
    trustFull: "That's all {pet} gives in a day. More tomorrow.",
    mood: 'Mood',
    /** Under the mood: makes clear the mood comes from loyalty. */
    moodFrom: 'Set by loyalty: <b>{loyalty}</b>/100.',
    /** What each mood means for how the pet acts. */
    moods: {
      sulking: "Won't play. Won't be petted.",
      'side-eye': 'Ignores the toy. Puts up with pets.',
      'on-watch': 'Plays fetch, sometimes.',
      'locked-in': 'Always up for fetch.',
      'ride-or-die': 'Zoomies. Brings you the toy.',
    },
    nextMood: '{n} more loyalty to <b>{mood}</b>.',
    energy: 'Energy',
    awake: 'Awake',
    asleep: 'Napping',
    awakeHint: 'Naps after {hours} quiet hours.',
    asleepHint: 'Out cold. Wakes up when you do something.',
  },
  gotIt: 'Got it',
  notNow: 'Not now',
};
