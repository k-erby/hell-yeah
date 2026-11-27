/**
 * ✏️  ALL THE APP'S WORDS: buttons, headings, hints, pop-ups.
 *
 * Change anything inside the 'quotes'. Leave the {curly} bits alone; the app fills them in.
 * Read src/text/README.md for examples before your first edit.
 *
 * Organised by screen, top to bottom, roughly in the order you see things.
 */
export const ui = {
  // ─────────────────────────────── Bottom nav
  nav: {
    today: 'Today',
    learn: 'Learn',
    tree: 'Tree',
    more: 'More',
    // The dog tab uses the dog's name.
  },

  // ─────────────────────────────── New-user defaults (only used when the app starts fresh)
  defaults: {
    name: 'Sam',
    dogName: 'Bo',
    /**
     * Starter routines. {dog} becomes the dog's name, and any task with {dog}
     * in it is tagged as a dog task (bonus loyalty).
     */
    routines: {
      morning: ['Water before coffee', 'Make the bed', 'Walk {dog}', 'Move for 10 minutes', "Look at today's plan"],
      afternoon: ['Real lunch, not snacks', 'Refill water', 'Get outside for 10', 'Reset one space'],
      night: ['Train {dog}', "Log today's learning", 'Skincare', 'Phone on the charger, away from bed', 'Lights out on time'],
    },
  },

  // ─────────────────────────────── Shared bits used on several screens
  common: {
    xp: '+{xp} XP',
    done: 'Done',
    delete: 'Delete',
    close: 'Close',
    add: 'Add',
    /** Explosion word when the action didn't earn XP. */
    noted: 'NOTED',
  },

  modes: {
    morning: { label: 'Morning', title: 'Morning routine', greet: 'Morning' },
    afternoon: { label: 'Afternoon', title: 'Afternoon reset', greet: 'Afternoon' },
    night: { label: 'Night', title: 'Night shutdown', greet: 'Evening' },
  },

  branches: {
    body: { label: 'Body', blurb: 'Strength, movement, food, sleep' },
    mind: { label: 'Mind', blurb: 'Knowledge, focus, languages' },
    craft: { label: 'Craft', blurb: 'Making things, creative skills' },
    money: { label: 'Money', blurb: 'Career, finance, business' },
    social: { label: 'Social', blurb: 'People, voice, confidence' },
  },

  /** How you made a weekly lock-in stick. */
  methods: {
    practiced: 'Practiced it',
    taught: 'Taught someone',
    wrote: 'Wrote it out',
    built: 'Built something',
  },

  /** A skill's progress steps, first to last. The last one means mastered. */
  skillLevels: {
    dayOne: 'Day one',
    gettingIt: 'Getting it',
    decent: 'Decent',
    solid: 'Solid',
    nailedIt: 'Nailed it',
  },

  // ─────────────────────────────── Today
  today: {
    greeting: '{greet},<br>{name}.',
    xp: '{xp} XP',
    streak: { one: '{n}-day streak', other: '{n}-day streak' },
    toNextRank: '{xp} XP to <b>{rank}</b>',
    toNextRankPlain: '{xp} XP to {rank}',
    topRank: 'Top rank. Obviously.',
    maxRank: 'Max rank',
    routinePicker: 'Routine',
    now: 'now',
    allDone: 'Handled. Every single one.',
    toGo: '{n} to go',
    edit: 'Edit {title}',
    editing: 'Editing',
    emptyList: 'Nothing here yet.',
    addSome: 'Add some tasks',
    editHint: '<b>Every day</b> tasks come back each morning. <b>One-offs</b> stay until you check them off, then they’re gone. Changes save instantly.',
    /** Tag on a one-off task in the checklist. */
    onceTag: 'One-off',
    nudges: {
      today: 'Today',
      daily: 'Daily',
      weekly: 'Weekly',
      monthly: 'Monthly',
      learned: 'Learned: <b>{text}</b>',
      notLearned: 'Nothing learned yet today. <b>Fix that →</b>',
      lockIn: { one: '{n} day left to lock something in. <b>Do it →</b>', other: '{n} days left to lock something in. <b>Do it →</b>' },
      noSkill: 'No skill planted for {month}. <b>Pick one →</b>',
    },
  },

  /** The edit side of a routine card. */
  editor: {
    taskName: 'Task name',
    moveUp: 'Move up',
    moveDown: 'Move down',
    empty: 'Empty. Add something below.',
    addPlaceholder: 'Add a task',
    /** Every task either repeats daily or happens once. */
    daily: 'Every day',
    once: 'One-off',
    /** Tooltip on the row button that switches between the two. */
    switchRepeat: 'Switch between every day and one-off',
  },

  // ─────────────────────────────── Learn
  learn: {
    title: 'Level up.',
    tagline: 'Every day, learn something. Every week, lock it in. Every month, a new skill.',
    countsToward: 'Counts toward',
    nothingSpecific: 'Nothing specific',

    plant: {
      eyebrow: 'Every month',
      heading: 'Plant a new skill',
      prompt: "What are you going to be able to do by the end of {month} that you can't do now?",
      placeholder: 'e.g. Deadlift form, basic Spanish, budgeting',
      button: 'Plant it',
    },

    skill: {
      eyebrow: "This month's skill · {branch}",
      hint: "Where are you at? Tap a step, or level up when you've earned it.",
      levelUp: 'Level up → {next} · +{xp} XP',
      master: 'Nailed it. Mastered · +{xp} XP',
      learnedHeading: "What you've learned for it",
      learnedCount: { one: '{n} thing', other: '{n} things' },
      learnedEmpty: 'Nothing yet. Every time you log a learning about {skill}, it lands here and grows its branch on the tree.',
      quickPlaceholder: 'Learned something about {skill}?',
      quickButton: 'Log',
      drop: 'Drop this skill',
    },

    daily: {
      eyebrow: 'Every day',
      heading: 'Learn something new',
      placeholder: "One thing. Doesn't have to be deep.",
      placeholderAgain: 'Another one? Look at you.',
      branch: 'Branch',
      branchHint: "(skill learnings grow on that skill's branch)",
      button: 'Log it · +{xp} XP',
      buttonAgain: 'Log another',
    },

    weekly: {
      eyebrow: 'Every week',
      heading: 'Solidify something',
      intro: "Learning it once is cute. Making it stick is the flex. Pick something from this week and prove you've got it.",
      nothingThisWeek: 'Nothing logged this week yet. You can still lock in something from earlier.',
      placeholder: "How'd you make it stick?",
      button: 'Lock it in · +{xp} XP',
      doneHeading: 'Locked in',
      nextOpens: 'Next lock-in opens Monday.',
    },

    unfinished: {
      eyebrow: 'Unfinished business',
      heading: "Where'd you land?",
      nailedIt: 'Nailed it',
      letGo: 'Let it go',
    },

    history: {
      eyebrow: 'The receipts',
      heading: 'Recently learned',
      count: { one: '{n} thing', other: '{n} things' },
    },
  },

  // ─────────────────────────────── Tree
  tree: {
    title: 'The tree.',
    tagline: "Every skill you've earned, grown out of every day you showed up.",
    label: 'Skill tree',
    empty: 'Nothing planted yet.',
    plantButton: "Plant this month's skill",
    legend: { skill: 'Skill', week: 'Week locked in', day: 'Day learned' },

    detail: {
      eyebrow: '{branch} · {month}',
      mastered: 'Mastered',
      progress: 'progress',
      thingsLearned: { one: 'thing learned', other: 'things learned' },
      lockedIn: 'locked in',
      lockInTag: 'Locked in · {method}',
    },

    branches: {
      eyebrow: 'Branches',
      heading: "Where you're growing",
      row: '{mastered}/{total} skills · {leaves}',
      leaves: { one: '{n} leaf', other: '{n} leaves' },
      hint: 'Tap a skill on the tree for the full story.',
    },
  },

  // ─────────────────────────────── Settings ("More")
  settings: {
    title: 'Settings.',
    tagline: 'Make it yours.',
    crew: {
      eyebrow: 'Crew',
      heading: 'Accountability',
      name: 'Your name',
      dogName: "Dog's name",
      buddy: 'Accountability buddy',
      buddyPlaceholder: "Who's keeping you honest?",
      share: 'Send my status',
      shareTo: 'Send my status to {buddy}',
      shareHint: 'Live buddy sync is coming. For now, this sends a status card over text or anything else on your phone.',
    },
    vibe: {
      eyebrow: 'Vibe',
      heading: 'Look & feel',
      explosions: 'Explosions',
      classy: 'Classy',
      stupid: 'Stupid',
      sound: 'Sound',
      vibration: 'Vibration',
      on: 'On',
      off: 'Off',
      theme: 'Theme',
      auto: 'Auto',
      morning: 'AM',
      afternoon: 'PM',
      night: 'Night',
      test: 'Test an explosion',
    },
    data: {
      eyebrow: 'Data',
      heading: 'Backup',
      hint: "Everything's saved on this phone. Export now and then so you can't lose it.",
      export: 'Export',
      import: 'Import',
      reset: 'Reset everything',
    },
    ideas: {
      eyebrow: 'Ideas',
      heading: 'Drop an idea',
      placeholder: 'What should this app do?',
      button: 'Send it',
      hint: 'Opens GitHub with your idea filled in. Tap <b>Create</b> and it’s in.',
      /** The title of the GitHub issue. */
      issueTitle: '💡 {idea}',
      /** The GitHub issue's description. "\n" starts a new line. Keep these headings matching .github/ISSUE_TEMPLATE/idea.yml. */
      issueBody: '### What should the app do?\n{idea}\n\n### Why do you want it to do that?\n\n\n### Anything else?\n',
    },
    footer: 'Hell Yeah · v0.1',
  },

  // ─────────────────────────────── Pop-ups, little messages, and "are you sure?" questions
  toasts: {
    xp: '+{xp} XP',
    routineDone: '<b>{routine}: done.</b> {dog} approves.',
    skillLevel: '<b>{skill}</b>: {level}.',
    skillDown: 'Moved back to <b>{level}</b>. Honesty is hot.',
    dropped: 'Dropped. Onward.',
    planted: '<b>{skill}</b> is planted. Feed it every day.',
    fresh: 'Fresh start.',
    copied: 'Status copied. Paste it to your buddy.',
    shareFailed: "Couldn't share. Try again.",
    restored: 'Backup restored.',
    badBackup: "That file isn't a Hell Yeah backup.",
    ideaOpened: 'Opened GitHub. Tap <b>Create</b> and it’s in.',
    missedDay: { one: '{dog} noticed you were gone a day. Loyalty −{loss}.', other: '{dog} noticed you were gone {n} days. Loyalty −{loss}.' },
  },

  /** Plain text only in these (no <b>). */
  confirm: {
    master: 'Nailed "{skill}"? That marks it mastered. Be honest.',
    drop: 'Drop "{skill}"? No shame. Not every skill deserves you.',
    deleteEntry: 'Delete this entry?',
    reset: 'Reset EVERYTHING? Routines, XP, the tree, the dog. All of it.',
    resetAgain: 'Seriously. This cannot be undone. Export first if you want a backup.',
    import: 'Replace everything on this phone with this backup?',
  },

  /** The big full-screen celebrations. */
  celebrate: {
    ok: 'Obviously.',
    rankEyebrow: 'New rank',
    rankSub: '{xp} XP and climbing. Act like you expected it.',
    dogEyebrow: '{dog} leveled up',
    dogButton: 'Good boy.',
    masteredEyebrow: 'Skill mastered',
    masteredSub: 'Another branch on the tree. That one is yours forever.',
    masteredButton: 'Next.',
    masteredBoom: 'MASTERED',
    weekEyebrow: 'Week locked in.',
    weekTitle: 'Solidified.',
    weekSub: "That one's not going anywhere. Neither are you.",
    planted: 'PLANTED',
    /** Explosion word for "Test an explosion" in Classy mode. */
    classyBoom: 'DONE.',
  },

  /** The text that gets sent to your buddy. Emoji welcome. */
  share: {
    title: 'Hell Yeah status',
    heading: "{name}'s status:",
    streak: '🔥 {n}-day streak',
    rank: '👑 {rank} · {xp} XP',
    skill: '🌱 {month} skill: {skill}',
    noSkill: 'not planted yet',
    dog: '🐕 {dog}: {mood} ({loyalty}% loyal)',
  },
};
