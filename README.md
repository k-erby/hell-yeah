# Hell Yeah

A phone-first routine tracker with a game layer, built for Sam (and Bo).

## Run it

```bash
npm install
npm run dev     
npm test 
npm run build   
```

## Test it

Playwright runs the built app on an emulated **iPhone 15** (Safari/WebKit) and **Pixel 7** (Chrome).

```sh
npx playwright install chromium webkit   # once: downloads the test browsers
npm run test:e2e                         # run everything on both phones, headless
npm run test:e2e -- --project=Pixel      # just one phone
npm run test:e2e:ui                      # watch it, not headless
```

Tests live in `e2e/`. `e2e/fixtures.ts` gives every test a fresh phone, a clock frozen at a
Wednesday morning, and sound off. They also run in the deploy workflow; a failure blocks the deploy
and uploads a report (with step-by-step traces) to the run's artifacts.


## REMINDERS FOR ME (kaitlin)
i need to pay for the sprite i'm using for Bo, or make my own (ugh).
omg i just learned about a push notification thing for iOS called "Bark" - brilliant. i should add that. 

## TODO
- gotta add supabase to actually save things
- i need to make an account system so i can like... cheer people (aka Sam) on and vice-versa
-- account setup should let you pick your pet (german shep, golden ret, siberian cat, ragdoll, rat, fish, idk)

## improvements
- i think the pet stuff should be more obvious. maybe a little blurb above the to-do checklist reminding you about the pet?
- the XP/loyalty stuff needs to be stronger, gotta think on that.
- also, the "how the pet thing" works should be higher up - it feels disjointed right now and i'm too lazy to copy and paste (future kaitlin problem)
- the "share" feature needs soooo much more work, since it kinda just opens your messages and give you some info you may not want to send (like your being a rookie or your XP). I think it would be cool to have it be more like the wordle share - maybe you can cater it to what "daily" "weekly" or "monthly"

## Changing the app's words

All user-facing text lives in [`src/text/`](src/text/README.md): pep talks and explosion words in `vibe.ts`, everything else in `ui.ts` and `dog.ts`. That README has a beginner-friendly guide with examples.

