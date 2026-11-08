# Kaiju Kitchen Crew

A co-op cooking platformer for **2–6 players**, starring the food kaiju from Kitchen Kaiju.
Each level is a recipe: stack on each other to reach high places, carry ingredients to the pot
**in recipe order**, then get **everyone** onto the plate. One splat and the whole team goes back
to the last checkpoint. Everyone shares one screen, so nobody can run off alone.

## Play
- **Online** (main mode): one person hosts and shares a 4-letter room code; friends join on their own
  phones or computers. Same networking as Kitchen Kaiju: direct link first, public relay as backup.
- **Same screen**: keyboards (WASD + arrows), gamepads and touch. Any device you use takes a kaiju;
  **SWAP** jumps into a snoozing one, so you can practise a level alone.

Controls: move A/D or ←/→ · jump W/Space or ↑ · grab/throw S/E or ↓/Enter (next to the pot = drop it in;
standing still tosses up to a friend, moving lobs forward) · swap Q or Right-Shift · retry R · menu Esc.

## World 1: Counter Top
1. **Shelf Help**: stacking, levers, the spatula lift
2. **Weigh-In**: the kitchen scale needs everyone; its timer holds the door
3. **Sugar Cubes**: push cubes (big ones need a team), weigh down a scale
4. **Pop-Up**: the toaster launches whoever is standing on it
5. **Hot Hob**: hobs that heat up on a cycle, a shuttle spatula, checkpoints
6. **Sandwich Rush**: everything together, a 4-step recipe

## World 2: The Fridge
Snacks float a little off the ground: jump into them. Cookies make you BIG (heavier, pushes like two,
smashes crackers, a taller step for friends, too big for mouse holes); lemon drops shrink you back;
chili melts ice walls; soda gives one huge jump. Ice floors slide, jelly bounces (frozen while the
freezer is on), icicles splat.
7. **Cookie Monster** 8. **Heavy Snack** 9. **Slippery Slope** 10. **Deep Freeze** 11. **Hot Stuff** 12. **Fridge Raid**

## World 3: The Pantry
The **noodle tether** ties neighbouring kaiju together (standing kaiju hold, airborne ones are pulled: dangle,
swing, get hauled up, get caught when you miss). The **Pot Mech**: GRAB next to it to climb in; crew seats are
legs, jump, arm (GRAB again to hop out); it weighs 6, smashes crackers, jumps ~4 tiles, carries riders on its
head and is the only thing that can carry a watermelon. **Order tickets** change a rule once the whole team is
past them (moon gravity, backwards controls, lights out, rush order, noodle snapped). Mousetraps splat.
13. **Noodle Buddies** 14. **Swing Shift** 15. **Pot Mech** 16. **Mech Arm** 17. **Order Chaos** 18. **Pantry Panic**

## World 4: Stove & Oven
Chocolate platforms melt after ~1.6 s of standing and set again; steam vents puff you up; the Pot Mech's metal
feet can walk on hot hobs. 19. **Melting Point** 20. **Steam Room** 21. **Grill Marks** 22. **Oven Mitts** 23. **Flambé** 24. **Sunday Roast**

## World 5: The Sink
Plug levers fill/drain sinks (kaiju and ingredients float, JUMP underwater swims), soap bubbles rise from
drains and carry you up, tap jets push you sideways. 25. **Bath Time** 26. **Bubble Bath** 27. **Tap Dance** 28. **Drain Plan** 29. **Suds Express** 30. **Washing Up**

## World 6: Dinner Service
The Chef's Hand slams down where the team is (hide under a shelf when its shadow appears), balance pans,
conveyor belts, and everything mixed together. 31. **Watch the Hand** 32. **Balancing Act** 33. **Conveyor Chaos** 34. **Rush Hour** 35. **Head Chef** 36. **Grand Banquet**

## World 7: The Bakery
Sticky **sprinkle walls** (cling and wall-jump up), **proofing dough** that rises while someone stands on it
(leave a snoozer on it to keep it up) and **oven timers** (GRAB to wind; their doors stay open until they ring).
37. **Sprinkle Climb** 38. **Rising Dough** 39. **Oven Timer** 40. **Sprinkle Shaft** 41. **Proofing Drawer** 42. **Wedding Cake**

## Stars, worlds and hats
Every level has 3 stars: ★ clear it, ★ clear it with no splats, ★ find its hidden **golden spoon**
(touch it, then finish). The level picker is a world map: a world opens once 4 levels of the previous one
are cleared (add `?unlock` to the address to open everything). Stars unlock **10 hats**; each kaiju
wears its own, online too. Beat the last level for the ending celebration.

Extras: kaiju picker grid, "NEW!" cards the first time you meet a mechanic, background music per world
(M / ♪ to mute), full screen any time (F / ⛶).

## Develop
```
npm install
npm run dev          # http://localhost:5195
npm run phone        # same, reachable from phones on your Wi-Fi
npm test             # simulation tests, incl. a bot that plays every level start to finish solo-style
                     # (tests/play.ts + tests/playthrough-w*.test.ts) with 2 and 6 kaiju
npm run build
npm run smoke        # real-browser check of the menu and every level
npm run smoke:online # host + phone over the real matchmaking server (needs internet)
```
Code: `src/sim` is the Phaser-free simulation (physics, gadgets, recipe, levels in `levels.ts`),
`src/scenes` the screens, `src/render` the drawing, `src/net` online play.
Kaiju art is shared with Kitchen Kaiju; the kitchen and fridge art is from Gemini
(`art-src/jobs-*.json` → `node scripts/gem-gen.mjs <jobs>` with the Gemini Chrome on port 9333 → `npm run art`). Icons: `node scripts/make-icons.mjs`.
