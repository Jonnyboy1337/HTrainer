import type { Girl, Preference } from './types';

const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];
const fill = (s: string, name: string) => s.replace(/\{n\}/g, name);

const SUCCESS: Record<string, string[]> = {
  talk: [
    'You sit with {n} and talk for a while. She relaxes and even laughs at your jokes.',
    '{n} tells you about her past. She seems glad someone is listening.',
  ],
  gift: [
    'You hand {n} a small wrapped box. Her eyes light up when she opens it.',
    '{n} turns the gift over in her hands and gives you a shy smile.',
  ],
  kiss: [
    'You pull {n} close and kiss her. After a moment she kisses you back.',
    '{n} closes her eyes as your lips meet, her breath quickening.',
  ],
  scold: [
    'You list every one of {n}\'s failings in a cold voice. She stares at the floor.',
    '{n} flinches as you raise your voice. She will remember this.',
  ],
  spank: [
    'You bend {n} over your knee. Each smack leaves her rear a little redder.',
    '{n} yelps with every swat, and by the end she is trembling.',
  ],
  collar: [
    'You buckle a leather collar around {n}\'s neck and lead her around on a leash.',
    '{n} crawls beside you on all fours, the leash pulled taut.',
  ],
  lingerie: [
    '{n} models a set of lacy lingerie for you, turning slowly.',
    'You watch {n} pose in silk and lace. She knows exactly where your eyes are.',
  ],
  undress: [
    '{n} removes her clothes piece by piece until she stands bare before you.',
    'You have {n} strip completely. She hesitates only once.',
  ],
  masturbate: [
    'You have {n} lie back and touch herself while you watch.',
    '{n}\'s fingers move faster and faster until she gasps your name.',
  ],
  oral: [
    '{n} kneels before you and practices with her lips and tongue.',
    'You guide {n}\'s head as she takes you deeper into her mouth.',
  ],
  hands: [
    '{n} wraps her fingers around you and learns the rhythm you like.',
    'You teach {n} how to use both hands, slow and then fast.',
  ],
  breasts: [
    '{n} squeezes her breasts together around you and starts moving.',
    'You show {n} how to use her chest to please a man.',
  ],
  vaginal: [
    'You take {n} to bed and train her body to please you.',
    '{n} moans beneath you as you push into her again and again.',
  ],
  anal: [
    'You take your time preparing {n}, then claim her from behind.',
    '{n} grips the sheets as you slowly work your way into her ass.',
  ],
  fetish: [
    'You bind {n} tightly with rope and explore just how much she can take.',
    '{n} struggles against her restraints, completely at your mercy.',
  ],
  lesbian: [
    'You bring in another girl and have {n} learn to please her.',
    '{n} and her partner tangle together on the bed while you give instructions.',
  ],
};

const REFUSED = [
  '{n} pulls away. "No. I won\'t do that."',
  '{n} crosses her arms and refuses outright.',
  '{n} shakes her head, eyes wide. She isn\'t ready for this.',
];

const EXHAUSTED = ['{n} is too exhausted to do anything but sleep.', '{n} can barely keep her eyes open.'];

const PUNISHED = [
  'You won\'t accept defiance. {n} is bent over and punished until she apologizes.',
  '{n} learns the price of saying no. She sobs a promise to obey next time.',
];

const LIKE = ['She seems to genuinely enjoy this.', 'She can\'t hide how much she loves it.', 'Her body responds eagerly.'];
const DISLIKE = ['She clearly hates this.', 'She grits her teeth through every moment.', 'Her face says she would rather be anywhere else.'];

export function sceneText(actionId: string, girl: Girl, pref: Preference | null, discovered: boolean): string[] {
  const n = girl.ref.name.split(' ')[0];
  const lines = [fill(pick(SUCCESS[actionId] ?? ['{n} does as she is told.']), n)];
  if (pref === 1) lines.push(pick(LIKE) + (discovered ? ' (She likes this!)' : ''));
  if (pref === -1) lines.push(pick(DISLIKE) + (discovered ? ' (She dislikes this.)' : ''));
  lines.push(attitude(girl));
  return lines;
}

function attitude(g: Girl): string {
  const { affection, fear } = g.stats;
  if (affection >= 60 && affection > fear) return 'Afterwards she looks at you with open adoration.';
  if (fear >= 60 && fear > affection) return 'Afterwards she keeps her eyes down, afraid to displease you.';
  if (affection >= 40 && fear >= 40) return 'She clings to you, half in love and half in terror.';
  if (affection >= 30) return 'She gives you a small, warm smile.';
  if (fear >= 30) return 'She watches you warily.';
  return 'She is still getting used to you.';
}

export const refusedText = (g: Girl) => fill(pick(REFUSED), g.ref.name.split(' ')[0]);
export const exhaustedText = (g: Girl) => fill(pick(EXHAUSTED), g.ref.name.split(' ')[0]);
export const punishedText = (g: Girl) => fill(pick(PUNISHED), g.ref.name.split(' ')[0]);
