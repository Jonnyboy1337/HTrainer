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

You start with one trainee and a 10,000 gold debt due in 60 days. Each day, assign every
character one activity:

- **Rest** recovers energy and mood.
- **Training** raises stats (obedience, lust, charm, service, sex, fetish) and some sessions cost gold.
- **Jobs** earn gold based on the character's skills and your reputation.

A character refuses an activity when her willingness (mostly obedience and lust) is too low for it.
New characters show up at the market every week.

## Content rules (non-negotiable)

- Every API search excludes tags for minors, photos and real people, and every returned post is
  re-checked client-side ([src/api/contentFilter.ts](src/api/contentFilter.ts)). These checks cannot be
  turned off.
- The built-in roster ([src/game/characters.ts](src/game/characters.ts)) only contains canonically
  adult characters.
- Players can hide any image permanently and add their own extra blacklist tags.
- The Rule34 API terms forbid ads and paywalls in projects that use it.

## Project layout

- `src/api/`: the Rule34 client, content filter and settings
- `src/game/`: types, character roster, activities, engine (reducer, day simulation, save/load)
- `src/components/`: the React UI
