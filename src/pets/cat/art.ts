import type { PoseArt } from '../poses';

/* ============================================================
   Cats. Monty (fluffy orange) and Hubble (short-haired tuxedo) share
   one set of shapes; Hubble's is sleeker and recoloured.

   Palette: o coat · O dark coat · D darkest · y light coat · c chest/muzzle
            C chest shade · n black · e eye · p nose/inner ear · w eye shine
   ============================================================ */

const HEAD = [
  '.O....O..',
  'OpO..OpO.',
  'OooOoooo.',
  'ooooooooy',
  'ooooowyy.',
  'yoooneyyc',
  'yyoooyccp',
  '.yyocccO.',
  '..c.c.c..',
];
const NAP_HEAD = [
  '.O....O..',
  'OpO..OpO.',
  'OooOoooo.',
  'ooooooooy',
  'ooooOOnyy',
  'yoooooyyc',
  'yyoooyccp',
  '.yyocccO.',
];
const BODY = [
  '...ooOooOooOoo....',
  '.yoOoooOoooOooooo.',
  'yooooooooooooooooo',
  'yooooooooooooooooo',
  'oooooooooooooooooc',
  'oooooooooooooooocc',
  'Ooooooooooooooocc.',
  'OOoooOOOOOOooooOc.',
  '.OOOO......OOOO...',
];
const LEG = ['yo', 'yo', 'yo', 'yo', 'yo', 'cc'];
const LEG_FAR = ['O.', 'O.', 'O.', 'O.', 'O.', 'cc'];
const TAIL = [
  '.yy.....',
  'yooyy...',
  'yoooy...',
  '.oooooy.',
  'yyoooO..',
  '..ooooO.',
  '.yyoooO.',
  '...ooooO',
  '....yooo',
  '.....ooo',
];
const SIT = [
  '....oooOcc.',
  '...ooooOccc',
  '...yoooOccc',
  '..yooooocc.',
  '..yoooooycc',
  '..oooooOyoc',
  '.yooooOOyoc',
  '.oooooOOyoc',
  '.oooooOOyoc',
  '.Oooo.OOyoc',
  '.OOoOOOOyoc',
  '..OOOOO.ccc',
];
const SIT_TAIL = ['......yyoooooooyy...', '.....yoooooooooooooy', '.......OOOOOOOOOOOO.'];
const LOAF = [
  '....ooOooOooOo.....',
  '..yooOoooOoooOooo..',
  '.yoooooooooooooooo.',
  'yooooooooooooooooo.',
  'ooooooooooooooooooo',
  'Oooooooooooooooooo.',
  'OOooooooooooooooOO.',
  '.OOOOOOOOOOOOOOOO..',
];
const LOAF_TAIL = ['..yyooooooooooyy', '.yooooooooooooooy', '..OOOOOOOOOOOOO..'];
const PAW = ['ccc'];

// Short hair: no cheek tufts, no light fluff, a thin tail.
const sleek = (rows: string[]) => rows.map((r) => r.replace(/y(?=o)/g, 'o'));
const SLEEK_HEAD = HEAD.slice(0, 8);
const SLEEK_TAIL = [
  '.yo....',
  'yoo....',
  '.oo....',
  '..oo...',
  '..ooO..',
  '...ooO.',
  '....ooO',
  '.....oo',
];
const SLEEK_LOAF_TAIL = ['..oooooooooooooo.', '...OOOOOOOOOOOO..'];
// Tuxedo socks on the front legs.
const SOCK = ['yo', 'yo', 'yo', 'cc', 'cc', 'cc'];
const SOCK_FAR = ['O.', 'O.', 'O.', 'C.', 'C.', 'CC'];

const CAT_EYE = { eye: 'wn', nose: 'p', shut: { w: 'o', n: 'O', e: 'O' } };

export const MONTY: PoseArt = {
  pal: { o: '#e48a3a', O: '#b85e1e', D: '#8f4214', y: '#f6b76a', c: '#fbe3bb', n: '#1a0f08', e: '#9bd44e', p: '#f19a8a', w: '#ffffff' },
  ...CAT_EYE,
  stand: [[TAIL, 3, 6], [LEG_FAR, 10, 22], [LEG_FAR, 21, 22], [BODY, 7, 14], [LEG, 8, 22], [LEG, 19, 22], [HEAD, 19, 8, 'head']],
  sit: [[SIT, 6, 17], [SIT_TAIL, 2, 26], [HEAD, 9, 10, 'head']],
  lie: [[LOAF, 0, 5], [PAW, 17, 11], [LOAF_TAIL, 3, 10], [SLEEK_HEAD, 14, 2, 'head']],
  sleep: [[LOAF, 0, 5], [PAW, 17, 11], [LOAF_TAIL, 3, 10], [NAP_HEAD, 14, 2, 'head']],
};

export const HUBBLE: PoseArt = {
  pal: { o: '#35313b', O: '#221f27', D: '#141217', y: '#4d4856', c: '#f1eee8', C: '#c7c2ba', n: '#000000', e: '#d6cf3c', p: '#f19a8a', w: '#ffffff' },
  ...CAT_EYE,
  stand: [[SLEEK_TAIL, 3, 8], [SOCK_FAR, 10, 22], [SOCK_FAR, 21, 22], [sleek(BODY), 7, 14], [SOCK, 8, 22], [SOCK, 19, 22], [SLEEK_HEAD, 19, 8, 'head']],
  sit: [[sleek(SIT), 6, 17], [SIT_TAIL, 2, 26], [SLEEK_HEAD, 9, 10, 'head']],
  lie: [[sleek(LOAF), 0, 5], [PAW, 17, 11], [SLEEK_LOAF_TAIL, 3, 11], [sleek(SLEEK_HEAD), 14, 2, 'head']],
  sleep: [[sleek(LOAF), 0, 5], [PAW, 17, 11], [SLEEK_LOAF_TAIL, 3, 11], [sleek(NAP_HEAD), 14, 2, 'head']],
};
