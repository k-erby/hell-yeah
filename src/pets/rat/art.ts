import type { PoseArt } from '../poses';

/* ============================================================
   The rat. Palette: a fur · A dark fur · h light fur · c belly
                     p pink (ears, feet, tail, nose) · P dark pink · n black · w eye shine
   ============================================================ */

const BODY = [
  '......haaaaaa.....',
  '...hhaaaaaaaaaaa..',
  '.haaaaaaaaaaaaaaa.',
  'haaaaaaaaaaaaaaaaa',
  'aaaaaaaaaaaaaaaaaa',
  'Aaaaaaaaaaaaaaaaac',
  'AAaaaaaaaaaaaaaacc',
  '.AAAaaaaaaaaaaccc.',
  '...AAAAAAAAAccc...',
];
const HEAD = [
  '...PP........',
  '..PppP.......',
  '..PppPhh.....',
  '.aaPPaaahh...',
  'aaaaaanwaahh.',
  'aaaaaaaaaaahpn',
  'Aaaaaaaccccpp.',
  '.AAccccccc....',
];
const TAIL = [
  '..............pP',
  '...........pppP.',
  '........pppP....',
  '.....pppP.......',
  '..pppP..........',
  'ppP.............',
];
const FOOT = ['aa', 'Aa', 'pp'];
const FOOT_FAR = ['Aa.', 'Aa.', 'ppp'];
// Up on his haunches, front paws held together.
const SIT = [
  '....haaa....',
  '...haaaac...',
  '..haaaaacc..',
  '.haaaaaaccpp',
  '.aaaaaaaccp.',
  'haaaaaaacc..',
  'aaaaaaaaccc.',
  'aaaaaaaaccc.',
  'Aaaaaaaaccc.',
  'AAaaaaaacc..',
  '.AAAaaaacc..',
  '..ppAAApp...',
];
const HEAD_UP = [
  '.PP.......',
  'PppP......',
  'PppPhh....',
  'aPPaaahh..',
  'aaaanwaahh',
  'aaaaaaaahhp',
  'aaaaaacccpn',
  'Aaaaccccc..',
];
const CURL = [
  '.......PP.........',
  '.....hPppPaaa.....',
  '...haaPPaaaaaaa...',
  '..haaaaaaaaaaaaa..',
  '.haaaaaaaaaaaannhh',
  'haaaaaaaaaaaaaaahpn',
  'aaaaaaaaaaaaaaccpp.',
  'AAaaaaaaaaaacccc...',
  '.AAAAAAAAAAAAA.....',
  'ppPPPPppppppPPpp...',
];

const STAND: PoseArt['stand'] = [[TAIL, 0, 21], [FOOT_FAR, 13, 25], [FOOT_FAR, 25, 25], [BODY, 10, 17], [FOOT, 14, 25], [FOOT, 24, 25], [HEAD, 24, 14, 'head']];

export const RAT: PoseArt = {
  pal: { a: '#9a8572', A: '#6e5b4b', h: '#c2ae98', c: '#e8ddcf', p: '#eba3a0', P: '#c47774', n: '#120c0a', w: '#ffffff' },
  eye: 'wn',
  nose: 'n',
  shut: { w: 'A', n: 'A' },
  stand: STAND,
  sit: [[TAIL, 0, 20], [SIT, 12, 14], [HEAD_UP, 13, 7, 'head']],
  lie: STAND,
  sleep: [[CURL, 0, 0, 'head']],
};
