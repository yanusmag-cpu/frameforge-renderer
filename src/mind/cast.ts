// The 72-Hour Mind Game — original FrameForge cast (designed for this film).
import { type Look, HERO } from '../ff2d/rig.ts';

/** MARCUS KESSLER — structural engineer, inmate B-417. Neat dark side parting with a lifted wave, heavy black
 * engineer's glasses, pencil tucked behind the ear, burnt-orange jumpsuit with number patch. Still, economical, precise. */
export const MARCUS: Look = {
  outfit: 'jumpsuit', color: '#d9772b', pants: '#c96c25', shoe: '#e9e6df',
  hairStyle: 'sidepart', hair: '#3b2a20', glasses: 'heavy', patch: 'B-417', pencil: true,
};
/** Marcus in the borrowed maintenance jacket (forest green, hi-vis bands) over the jumpsuit trousers. */
export const MARCUS_MAINT: Look = { ...MARCUS, outfit: 'jacket', color: '#3f6b4a', hiVis: true, patch: undefined };

/** FELIX HART — psychological investigator. Jet-black swept-back wave with silver temples, short goatee,
 * long camel overcoat over a burgundy turtleneck, charcoal trousers, brown shoes. Loose, amused, always watching. */
export const FELIX: Look = {
  outfit: 'coat', color: '#c49a62', pants: '#34363b', shoe: '#6b4227', inner: '#7d1f2e',
  hairStyle: 'slick', hair: '#1d1b20', streak: '#8d939c', beard: 'goatee', beardColor: '#1d1b20',
};

/** WARDEN DALE ORTON — grey suit, navy tie, receding grey hair and moustache. */
export const WARDEN: Look = { outfit: 'suit', color: '#5d636b', pants: '#4c5158', shoe: '#1d1d1d', tie: '#24365e', hairStyle: 'fringe', hair: '#b9bcc0', beard: 'moustache', beardColor: '#a9acb1', badge: false };

/** Blackstone officers — navy uniform, peaked cap, badge, shoulder radio. */
export const GUARD: Look = { outfit: 'uniform', color: '#2d3d57', pants: '#26324a', shoe: '#151515', hat: 'officer', hair: '#1f2a3e', badge: true, radio: true };
export const GUARD2: Look = { ...GUARD, beard: 'moustache', beardColor: '#3a2a1e' };
export const GUARD3: Look = { ...GUARD, glasses: true };

/** Contractor driver — hi-vis jacket and white hard hat. */
export const DRIVER: Look = { outfit: 'jacket', color: '#e8c21f', pants: '#2f3a4a', shoe: '#3a2a1e', hiVis: true, hat: 'hardhat', beard: 'stubble', beardColor: '#4a3a2a' };
/** Infirmary nurse. */
export const NURSE: Look = { outfit: 'lab', color: '#eef3f6', pants: '#7fa7c4', shoe: '#e9e6df', hairStyle: 'bun', hair: '#5a3a26' };
/** Security-room operator. */
export const OPERATOR: Look = { outfit: 'uniform', color: '#3a4a63', pants: '#26324a', shoe: '#151515', hat: 'headset', hairStyle: 'crop', hair: '#2a2420' };
/** Fellow inmates (background). */
export const INMATE: Look = { outfit: 'jumpsuit', color: '#d0732c', pants: '#c06a26', shoe: '#e9e6df', hairStyle: 'crop', hair: '#1f1a16', patch: 'B-233' };
export const INMATE2: Look = { ...INMATE, hairStyle: 'curlyTop', hair: '#2a1d14', patch: 'B-508', beard: 'stubble' };

/** The channel's narrator — unchanged red-hoodie FrameForge stickman. */
export const NARRATOR: Look = HERO;
