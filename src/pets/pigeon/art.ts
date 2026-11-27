import type { PoseArt } from '../poses';

/* ============================================================
   The pigeon. Palette: g grey · G dark grey · h light grey · s slate head
                        v/V green/purple neck · k wing bars and tail band
                        o eye ring · n pupil · b beak · c cere · p feet
   ============================================================ */

const HEAD = [
  '..sss....',
  '.sssss...',
  '.sonssc..',
  '.ssssssbb',
  '.sssss...',
  'vvvVVs...',
  'vVvvVVg..',
  'VvVvVvgg.',
  'VVvVVvVgg',
];
const BODY = [
  '......hhhhggggggggg.',
  '....Ghhhhhhggggggggg',
  '..GGhhhhhhhhgggggggg',
  'kGGGhhhhhhhhhggggggg',
  'kkGGkkkkhhhhhgggggggG',
  '.kkGGGhhhhhhhggggggG.',
  '..kkGkkkkGGGGGgggggG.',
  '....kkGGGGGGGGGGgGG..',
  '.........GGGGGGGG....',
];
const LEGS = ['pp..pp', 'p...p.', 'ppp.ppp'];
const HEAD_DOWN = [
  'gg.......',
  'Vvgg.....',
  'vVvVss...',
  '.VvVsss..',
  '..vsonssc',
  '...ssssss',
  '....sss.bb',
  '.........b',
];
// Puffed up, head tucked in.
const HEAD_TUCK = ['..sss..', '.sssss.', 'vsnnssc', 'VvVvVvs', 'vVvVvVg'];

const STAND: PoseArt['stand'] = [[BODY, 0, 9], [LEGS, 10, 18], [HEAD, 10, 0, 'head']];

export const PIGEON: PoseArt = {
  pal: { g: '#9aa1b0', G: '#6d7383', h: '#c3c8d3', s: '#5d6476', v: '#5aa585', V: '#8b5fa8', k: '#25262e', o: '#f08a2a', n: '#111111', b: '#3b3a40', c: '#e9e9ee', p: '#d77a70' },
  eye: 'n',
  nose: 'b',
  shut: { o: 's', n: 'G' },
  stand: STAND,
  sit: STAND,
  lie: STAND,
  peck: [[BODY, 0, 9], [LEGS, 10, 18], [HEAD_DOWN, 15, 12, 'head']],
  sleep: [[BODY, 0, 11], [HEAD_TUCK, 11, 9, 'head']],
};
