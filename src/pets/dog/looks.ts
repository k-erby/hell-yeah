import { HEAD, T_HANG, T_LIE, T_OUT, T_SIT, T_UP, type Part } from './parts';

/* ============================================================
   What a dog looks like on top of the shared dog body.
   Every dog uses the same body, legs and poses (parts.ts); a look swaps
   the colours, the head and the tail.

   Palette letters: t coat · d dark coat · l light coat · k/g saddle
                    b far-side leg · n black · p ear · r tongue · w eye shine
   ============================================================ */

export interface DogLook {
  pal: Record<string, string>;
  /** Head rows, drawn with the top-left at the head spot. The eye is the 'w'. */
  head: string[];
  /** Row swaps on the head for each expression (row number → new row). */
  patch: Partial<Record<'pant' | 'pant2' | 'bark' | 'yawn' | 'chew' | 'earsBack' | 'tilt', Record<number, string>>>;
  tails: { hang: Part; sit: Part; lie: Part; up: Part; out: Part };
}

const recolor = (p: Part, map: Record<string, string>): Part => ({ ...p, rows: p.rows.map((r) => r.replace(/./g, (c) => map[c] ?? c)) });

/** Bo: German shepherd. */
export const BO: DogLook = {
  pal: {
    t: '#ca9654', d: '#af6b32', l: '#d0ab7b', k: '#322a29', g: '#4a403f',
    b: '#783a22', n: '#000000', p: '#ed9261', r: '#ff614d', w: '#ffffff',
  },
  head: [...HEAD.rows, '............', '............'],
  patch: {
    pant: { 8: 'gkdttltkkd..', 9: '........krk.', 10: '.........r..' },
    pant2: { 8: 'gkdttltkkd..', 9: '........kr..', 10: '........rr..' },
    bark: { 8: 'gkdttltrr...', 9: '.....dkkk...' },
    yawn: { 8: 'gkdttltrrr..', 9: '.....dkkkk..' },
    chew: { 8: 'gkdttlt.kkk.' },
    earsBack: { 0: '............', 1: '............', 2: 'ddddd.......', 3: '..pppd......' },
    tilt: { 0: '....d.......', 1: '...dd.......', 2: '...dpd......' },
  },
  tails: { hang: T_HANG, sit: T_SIT, lie: T_LIE, up: T_UP, out: T_OUT },
};

/** Hudson: golden retriever. All gold, floppy ears, feathery tail. */
const GOLD = { n: 'f', k: 't', g: 't' };
export const HUDSON: DogLook = {
  pal: {
    t: '#d9a04a', d: '#b27a30', l: '#f0cb85', k: '#c98f3e', g: '#d39a48',
    b: '#8e5a22', n: '#1c120a', p: '#a5672a', P: '#87521f', r: '#ff614d', w: '#ffffff', f: '#f6dca4',
  },
  head: [
    '............',
    '............',
    '............',
    '....tttl....',
    '...tttttl...',
    '..ppttnwlll.',
    '.ppPttttllln',
    'gpPPdtllllnn',
    'gpPPddtlld..',
    '.pPP........',
    '..P.........',
  ],
  patch: {
    pant: { 8: 'gpPPddtllld.', 9: '.pPP....rr..', 10: '..P.....r...' },
    pant2: { 8: 'gpPPddtllld.', 9: '.pPP....r...', 10: '..P.....rr..' },
    bark: { 8: 'gpPPddtrr...', 9: '.pPPddlll...' },
    yawn: { 8: 'gpPPddtrrr..', 9: '.pPPddllll..' },
    chew: { 8: 'gpPPddtl.ll.' },
  },
  tails: {
    hang: { ...T_HANG, rows: ['....ltd', '...lltd', '..flltd', '.fflld.', 'fffld..', 'ffld...', 'ff.....', 'f......'] },
    sit: { ...T_SIT, rows: ['tg.....', 'ttg....', 'fttg...', 'fftl...', '.fftl..', '.fflll.', '..fftll', '.......'] },
    lie: { ...T_LIE, rows: ['t....', 'ttt..', 'tttll', 'fftt.', '.ffd.'] },
    up: recolor(T_UP, GOLD),
    out: recolor(T_OUT, GOLD),
  },
};
