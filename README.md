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
- should be a "cheers"-ing people section.
- what if there was an option to like... set up an in-app timer? so then people can encourage you on while working.
- need to add UI breadcrumbs to indicate "reoccuring tasks" from "one-off, daily tasks"
- should there be a feed?
-- should the feed just be pictures of megan thee stallion (haha jk. (not really, only half jk))
- UHM, SKILL ROULETTE???? like what if you have a "bank" of random skills (user-generated, you and/or others) and you can pick certain ones to add into it. 
- there should be like... an export your learnings feature. so it could be an email, or a pdf or something.

## improvements
- i think the pet stuff should be more obvious. maybe a little blurb above the to-do checklist reminding you about the pet?
- the XP/loyalty stuff needs to be stronger, gotta think on that.
- the "share" feature needs soooo much more work, since it kinda just opens your messages and give you some info you may not want to send (like your being a rookie or your XP). I think it would be cool to have it be more like the wordle share - maybe you can cater it to what "daily" "weekly" or "monthly"
- i should make it so you can handle multiple monthly skills (there should be a warning about it, tho)
- also, i'm not a fan of the alert "r u sure?" dialogue pop-ups on laptops. i haven't tested it on mobile with that, but like... ew. so i'll need to fix that (just for myself, tbf)

