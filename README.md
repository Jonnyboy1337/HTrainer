# HTrainer

An adults-only (18+) browser management/training game, inspired by Brothel King and SlaveMaker.
Character images are loaded dynamically from the [Rule34 API](https://api.rule34.xxx/).

## Running

```sh
npm install
npm run dev      # dev server at http://localhost:5173
npm run build    # static build in dist/
```

The game runs entirely in the browser. To load images, every player enters their own Rule34
**User ID** and **API key** (rule34.xxx → My Account → Options) in the in-game Settings.
Credentials are kept in that browser's localStorage only. Never commit them.

## Gameplay

You are a trainer. Girls come to you in two ways:

- **Commissions:** a client sends a specific girl and a purpose (e.g. "Obedient pet") with stat
  requirements and a deadline. Deliver her in time for the reward, or pay a penalty.
- **The market:** buy a girl, train her however you like, and sell her to a visiting **buyer**.
  The price depends on how well she matches what the buyer wants. A scout can also find almost
  any character on Rule34 for you.

Each day you have a limited number of **training sessions**. Whether she complies depends on
energy, obedience and lust. She can be trained through **love** (affection) or **fear**, and she
has hidden likes and dislikes for each sex skill (oral, hands, breasts, vaginal, anal, fetish,
lesbian). In the evening every girl works a **shift** in your establishment. Spend the gold on
**upgrades** that unlock new actions, shifts and perks.

### Images

Each girl gets an image pool: two searches for her character tag (top explicit posts and top solo
posts), sorted locally into scenes by tag. Actions are only offered when her pool has enough
fitting images. The player can also pick a variant tag (outfit or version) to keep her look consistent.

## Content rules (non-negotiable)

- Every API search excludes tags for minors, photos and real people, and every returned post is
  re-checked client-side ([src/api/contentFilter.ts](src/api/contentFilter.ts)). These checks cannot be
  turned off.
- The built-in roster ([src/game/characters.ts](src/game/characters.ts)) only contains canonically
  adult characters. Characters added by the player are checked too: if 1% or more of her posts are
  tagged `aged_up` (typical for characters who are minors in canon), she is rejected.
- Players can hide any image permanently and add their own extra blacklist tags.
- The Rule34 API terms forbid ads and paywalls in projects that use it.

## Project layout

- `src/api/`: the Rule34 client, content filter, image pools/scenes and settings
- `src/game/`: types, roster, content (actions, shifts, upgrades, purposes), narration, engine
- `src/components/`: the React UI
