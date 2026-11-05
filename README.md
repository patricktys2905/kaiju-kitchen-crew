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

## Develop
```
npm install
npm run dev          # http://localhost:5195
npm run phone        # same, reachable from phones on your Wi-Fi
npm test             # simulation tests, including playthroughs of each level for 2-6 kaiju
npm run build
npm run smoke        # real-browser check of the menu and every level
npm run smoke:online # host + phone over the real matchmaking server (needs internet)
```
Code: `src/sim` is the Phaser-free simulation (physics, gadgets, recipe, levels in `levels.ts`),
`src/scenes` the screens, `src/render` the drawing, `src/net` online play.
Kaiju art is shared with Kitchen Kaiju (`public/art`). Icons: `node scripts/make-icons.mjs`.
