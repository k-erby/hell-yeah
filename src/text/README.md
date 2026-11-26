# ✏️ Editing the text

Every word lives in this folder. 

| File | What's in it |
|---|---|
| **`vibe.ts`** | Random, vibe-y stuff: pep-talk line under your name, the explosion words, rank names, the dog's levels and moods. |
| **`ui.ts`** | UI element else: buttons, headings, hints, pop-ups, "are you sure?" questions, the starter routines. Organised by screen. |
| **`dog.ts`** | The dog's screen: the buttons, the rules, and the little "what he's doing" labels. |

## The one rule

**Only change what's inside the quotes.** 
The word on the left is the computer's name for that text; leave it alone.

```ts
button: 'Plant it',
//       ^^^^^^^^ change this
```

```ts
button: 'Grow it',         ✅
grow:   'Plant it',        ❌ the app looks for "button" keyword, it won't find this
```

## Examples

### Change a button
In `ui.ts`, find the button by searching (⌘F / Ctrl+F) for its current words:

```ts
plant: {
  ...
  button: 'Plant it',
},
```
→
```ts
  button: 'Put it in the ground',
```

### Add a pep-talk line
In `vibe.ts`, add a line anywhere in the list. Each line ends with a comma.

```ts
morning: [
  'On it.',
  'Up. Ready.',
  'Muk it up.',   // ← new line
],
```

### Add or remove explosion words
Same idea, in `vibe.ts` → `boomWords` (one task) or `bigWords` (whole routine). Keep them short; they're huge on screen.

### Text with `{curly}` bits
`{curly}` words get swapped for real values: your name, the dog's name, a number. You can move them around and change the words around them, but keep the curly word spelled exactly the same.

```ts
planted: '<b>{skill}</b> is planted. Feed it every day.',
```
→
```ts
planted: 'Look at you, planting <b>{skill}</b>. Water that shit.',   ✅
planted: 'Look at you, planting <b>{skil}</b>.',                       ❌ typo: shows "{skil}" on screen
```

Common ones: `{name}` (you), `{dog}` (the dog's name), `{n}` (a number), `{xp}` (an XP amount), `{skill}` (a skill's name).

### Text that changes with a number
Some text has a version for **one** thing and a version for **everything else**:

```ts
count: { one: '{n} thing', other: '{n} things' },
```

`one` is used for exactly 1, `other` for 0, 2, 3… Change both if you change one:

```ts
count: { one: '{n} brain cell', other: '{n} brain cells' },
```

### Bold
`<b>like this</b>` makes words bold where you already see it used. Always close it with `</b>`.

### Apostrophes and quotes
If the text has an apostrophe (`don't`, `you're`), wrap it in **double quotes** instead:

```ts
nextOpens: "Don't worry, it opens Monday.",   ✅
nextOpens: 'Don't worry, it opens Monday.',   ❌ the ' in Don't ends the text early
```

### Starter routines
`ui.ts` → `defaults.routines` is what a brand-new user starts with. (Changing it won't touch routines you already have; edit those in the app.) Any task with `{dog}` in it becomes a dog task automatically.


## Development Specific Stuff for i18n and the like (very important, plz read :<)

- Code should never have user-facing text inline. It asks for a key: `t('learn.plant.button')`. Helpers are in `src/lib/i18n.ts`: `t` (HTML, escapes `{vars}`), `tx` (plain text), `ta` (attributes), `tn` (plurals via `Intl.PluralRules`), `list`.
- Keys are type-checked; a wrong or missing key fails `tsc`. `src/lib/i18n.test.ts` checks for empty text, unbalanced `{}`/`<b>`, and plural forms that disagree.
- Another language = a `src/text/<lang>/` folder with the same shape (type `Messages`), loaded with `setLocale()`. Plurals can add `zero`/`two`/`few`/`many` for languages that need them.
- Dates and numbers are formatted with `Intl` for the current locale, so they don't belong in these files.
