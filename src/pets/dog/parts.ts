/* TODO: change this to an actual sprite */

export interface Part { x: number; y: number; rows: string[] }

export const HEAD: Part = { x: 30, y: 8, rows: [
  '...d........',
  '...dd.......',
  '..dpd.......',
  '..dppd......',
  '..dptkgg....',
  '...dttnng...',
  '..gttnwnkggn',
  'ggktklllkkkk',
  'gkdttlttkkk.',
]};

export const TORSO: Part = { x: 12, y: 16, rows: [
  '....ggggggggggggggg.......',
  '...ggggggggggggkkkkdddttt.',
  '..ggggkgggkkkkkkddddtttd..',
  '.ggktttkkkkkkkddttttttd...',
  '.gkktttlkkkkkkkkdttlttd...',
  'ggdddttllkkkkkkttttltdd...',
  'gtdddttlldkkkttdtttlld....',
  '....dtttlddddddttttll.....',
]};

export const SIT: Part = { x: 5, y: 16, rows: [
  '..........................',
  '..........................',
  '..................ggdttt..',
  '.................gggddt...',
  '................gggkdttd..',
  '...............gggkkdttd..',
  '..............gggkkdtttd..',
  '.............ggggkkttldd..',
  '............ggggkkdtlldd..',
  '...........gggkgkkttlld...',
  '..........gggkkkkktttld...',
  '.........gggglkkkkdttld...',
  '.........gggttlkkddttl....',
  '.......ggggtttlddd.tt.....',
  '....dtttkkktttlld..tt.....',
  '....dddddkkddttttt..tt....',
]};

export const LIE: Part = { x: 4, y: 23, rows: [
  '...................................',
  '....................gggggg.........',
  '.............ggggggggggkkkkkddttt..',
  '............ggkgggkkkkkkkkddtttd...',
  '..........gggtlkkkkkkkkdddttttl....',
  '........ggggttllkkkkkkkkdttttll....',
  '.....lllttdttttllkkkkkktttttlld....',
  '.....ttttdddtttlldkkkttdtttlllllll.',
  '.....ttddd.dttttttttddddttttttttttl',
]};

export const BOW: Part = { x: 10, y: 19, rows: [
  '......ggg......................',
  '......kgggg....................',
  '.....dtggggggg.................',
  '......ttlkgggggggg.............',
  '.....tttllkkkkkggggg...........',
  '.....dttllkkkkkkkkkk...........',
  '.....dttlllkkkkkdkkk...........',
  '...tlddttllkkkkkkdddkkdtttt....',
  '...ttldtttldkkkkdtttddtttd.....',
  '...ttldttlddddtttttttlld.......',
  '....ttttl...dddtttttlll........',
  '....tt........dddttlll.........',
  '.....tt..........tttttttttt....',
]};

export const T_HANG: Part = { x: 8, y: 23, rows: [
  '....ltd',
  '...lltd',
  '...lltd',
  '...lldd',
  '..lltdd',
  '..lld..',
  '.kldd..',
  'knnd...',
]};

export const T_SIT: Part = { x: 5, y: 23, rows: [
  'kg.....',
  'kkg....',
  'nkg....',
  'ntl....',
  '.dtl...',
  '.ddlll.',
  '..dtlll',
  '.......',
]};

export const T_LIE: Part = { x: 4, y: 27, rows: [
  'k....',
  'kkk..',
  'kkkll',
  '.nkkt',
  '..nnd',
]};

export const T_UP: Part = { x: 10, y: 8, rows: [
  '..k....',
  '.kk....',
  '.kk....',
  'nkl....',
  'ltl....',
  'dtl....',
  'dttl...',
  'ddtl...',
  '.dttl..',
  '.ddtt..',
  '..ddttt',
  '...ddt.',
  '....dd.',
  '.....d.',
]};

export const T_OUT: Part = { x: 4, y: 16, rows: [
  '.....lllll..',
  '...llltttttg',
  '..llltttdd..',
  '.kttttdd....',
  'kknddd......',
  'kn..........',
]};
