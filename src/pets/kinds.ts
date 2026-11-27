import { HUBBLE, MONTY } from './cat/art';
import { BO, HUDSON, type DogLook } from './dog/looks';
import { PIGEON } from './pigeon/art';
import type { PoseArt } from './poses';
import { RAT } from './rat/art';

/** Every pet you can pick (More tab). Names and blurbs live in src/text/pets.ts → kinds. */
export const PET_KINDS = ['bo', 'hudson', 'monty', 'hubble', 'rat', 'pigeon'] as const;
export type PetKind = (typeof PET_KINDS)[number];

/** Dogs share the full dog body and animations; everyone else is drawn from poses. */
export const KIND: Record<PetKind, { dog: DogLook } | { poses: PoseArt }> = {
  bo: { dog: BO },
  hudson: { dog: HUDSON },
  monty: { poses: MONTY },
  hubble: { poses: HUBBLE },
  rat: { poses: RAT },
  pigeon: { poses: PIGEON },
};

export const isPetKind = (k: unknown): k is PetKind => PET_KINDS.includes(k as PetKind);
