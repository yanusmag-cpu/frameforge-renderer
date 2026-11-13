/** FrameForge — The Great Emu War (1932). Absolute 40-second timeline (1,200 frames, four 300-frame chunks).
 * Every function is a pure function of absolute time, so independently rendered chunks join seamlessly.
 * Shot boundaries and story beats are locked to the measured Dan Dan narration (seconds from frame 0).
 * World: metres, x east, y up, z south. */
export type V3=[number,number,number];
export const clamp=(v:number,a=0,b=1)=>Math.max(a,Math.min(b,v));
export const smooth=(a:number,b:number,t:number)=>{const u=clamp((t-a)/(b-a));return u*u*u*(u*(u*6-15)+10);};
export const ease=(a:number,b:number,t:number)=>{const u=clamp((t-a)/(b-a));return u*u*(3-2*u);};
export const lerp=(a:number,b:number,u:number)=>a+(b-a)*u;
export const mix=(a:V3,b:V3,u:number):V3=>[a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u,a[2]+(b[2]-a[2])*u];
export const add=(a:V3,b:V3):V3=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]];
export const sub=(a:V3,b:V3):V3=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
export const scale=(a:V3,k:number):V3=>[a[0]*k,a[1]*k,a[2]*k];
export const dot=(a:V3,b:V3)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
export const cross=(a:V3,b:V3):V3=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
export const len=(a:V3)=>Math.hypot(a[0],a[1],a[2]);
export const norm=(a:V3):V3=>{const l=len(a)||1;return [a[0]/l,a[1]/l,a[2]/l];};
export const dist=(a:V3,b:V3)=>len(sub(a,b));
export const hash=(i:number)=>{const v=Math.sin(i*127.1+311.7)*43758.5453;return v-Math.floor(v);};
export const noise=(x:number)=>{const i=Math.floor(x),f=x-i,u=f*f*(3-2*f);return (hash(i)*(1-u)+hash(i+1)*u)*2-1;};
const h2=(x:number,z:number)=>hash(x*157.31+z*311.77);
export function vnoise(x:number,z:number){const ix=Math.floor(x),iz=Math.floor(z),fx=x-ix,fz=z-iz,ux=fx*fx*(3-2*fx),uz=fz*fz*(3-2*fz);
 return lerp(lerp(h2(ix,iz),h2(ix+1,iz),ux),lerp(h2(ix,iz+1),h2(ix+1,iz+1),ux),uz)*2-1;}
/** spring-like overshoot used for comic pops (0→1 with a bounce). */
export const pop=(a:number,d:number,t:number)=>{const u=(t-a)/d;if(u<=0)return 0;if(u>=3)return 1;return 1-Math.exp(-4*u)*Math.cos(6*u);};

export const FPS=30,FRAMES=1200,DURATION=40;
/** Measured narration (Dan Dan, 39.0 s file). Phrase starts and stressed syllables, seconds. */
export const VO={army:.11,birds:2.68,lost:4.09,y1932:4.78,twenty:8.12,soldiers:11.24,guns:13.0,but:15.13,aim:16.53,scattered:17.18,direction:19.09,ambush:21.63,gun:23.53,jammed:24.66,truck:25.44,faster:27.75,bullets:29.22,fewer:31.73,home:33.52,emusKept:34.57,wheat:36.65,speechEnd:37.32};

export type SetId='paddock'|'farm'|'road'|'dam'|'chase'|'rest'|'hill';
export type Look='day'|'gold'|'sunset';
export interface Shot{id:string;start:number;end:number;set:SetId;look:Look;label:string}
export const SHOTS:Shot[]=[
 {id:'E01',start:0,end:1.6,set:'paddock',look:'day',label:'Hook: emu legs thunder past the lens; a soldier stumbles'},
 {id:'E02',start:1.6,end:3.3,set:'paddock',look:'day',label:'Crane reveal: three soldiers chase a flock that is outrunning them'},
 {id:'E03',start:3.3,end:4.7,set:'paddock',look:'day',label:'"…and LOST!" the gunner face-plants; his hat lands on an emu'},
 {id:'E04',start:4.7,end:6.6,set:'farm',look:'gold',label:'Rewind to 1932: aerial over the Campion wheat farm'},
 {id:'E05',start:6.6,end:8.1,set:'farm',look:'gold',label:'Low in the wheat: emu heads pop up one after another'},
 {id:'E06',start:8.1,end:9.7,set:'farm',look:'gold',label:'"Twenty thousand emus" pour over the fence line'},
 {id:'E07',start:9.7,end:11.2,set:'farm',look:'gold',label:'The farmer panics; an emu gulps a wheat head'},
 {id:'E08',start:11.2,end:13.0,set:'road',look:'day',label:'The army truck rolls in; three soldiers hop down'},
 {id:'E09',start:13.0,end:15.1,set:'road',look:'day',label:'Hero line-up: the Major points, the Lewis gun goes down'},
 {id:'E10',start:15.1,end:17.1,set:'paddock',look:'day',label:'Over the gunner\'s shoulder: every emu head pops up'},
 {id:'E11',start:17.1,end:19.0,set:'paddock',look:'day',label:'Top-down: the flock explodes in every direction'},
 {id:'E12',start:19.0,end:20.3,set:'paddock',look:'day',label:'The gunner swings left-right-left; emus zig-zag'},
 {id:'E13',start:20.3,end:21.6,set:'paddock',look:'day',label:'Shocked faces — whip pan — an emu blinks an inch away'},
 {id:'E14',start:21.6,end:23.5,set:'dam',look:'day',label:'The ambush by the dam: a thousand emus walk in'},
 {id:'E15',start:23.5,end:25.4,set:'dam',look:'day',label:'"…and the gun JAMMED!"'},
 {id:'E16',start:25.4,end:27.7,set:'chase',look:'day',label:'Truck chase: the gunner bounces, the gun points at the sky'},
 {id:'E17',start:27.7,end:29.2,set:'chase',look:'day',label:'The emus pull away; the truck flies off a rut'},
 {id:'E18',start:29.2,end:31.6,set:'rest',look:'gold',label:'An empty pan magazine; one cartridge case falls out'},
 {id:'E19',start:31.6,end:34.2,set:'rest',look:'gold',label:'Exhausted soldiers under a gum tree; the army goes home'},
 {id:'E20',start:34.2,end:35.7,set:'hill',look:'sunset',label:'Wide: the army drives away below the victor\'s hill'},
 {id:'E21',start:35.7,end:37.4,set:'hill',look:'sunset',label:'Low push-in: the victor raises a wheat stalk'},
 {id:'E22',start:37.4,end:40,set:'hill',look:'sunset',label:'Smug close-up: EMUS 1 · ARMY 0'}];
export function shotAt(t:number):Shot{const s=SHOTS.find(x=>t>=x.start&&t<x.end);if(!s)throw new Error('No shot at '+t);return s;}
export const local=(t:number)=>t-shotAt(t).start;

// ---------------------------------------------------------------- key action times (also read by the sound script)
export const EV={stumble1:1.05,trip:3.42,faceplant:3.72,hatLands:VO.lost,rewind:4.7,popHeads:[6.95,7.2,7.42,7.62,7.8],gulp:10.45,truckStop:12.15,hop:[12.35,12.6,12.85],
 tripodClank:13.62,thumbs:14.35,headsUp:VO.aim,scatter:17.15,swings:[19.15,19.55,19.95],blink:21.25,whip:20.95,burst:23.62,jam:VO.jammed,yank:24.95,spring:25.12,
 bump:28.82,land:29.05,casing:30.25,standUp:33.45,stalk:36.35,turn:37.55,smug:37.85,stamp:38.15,fade:39.35};

// ---------------------------------------------------------------- world layout
export const PADDOCK:V3=[120,0,-10];
export const FARM={house:[-150,0,-128] as V3,shed:[-182,0,-120] as V3,mill:[-118,0,-131] as V3,tank:[-132,0,-136] as V3,fieldX:[-260,-48] as [number,number],fieldZ:[-96,38] as [number,number]};
export const DAM:V3=[330,0,-40],DAM_R=17;
export const REST:V3=[742,0,26],OUTCROP:V3=[812,0,-24];
export const roadZ=(x:number)=>58+7*Math.sin(x*.009)+3*Math.sin(x*.023+1);
export const inField=(x:number,z:number)=>x>FARM.fieldX[0]&&x<FARM.fieldX[1]&&z>FARM.fieldZ[0]&&z<FARM.fieldZ[1];
/** Height field shared by the terrain mesh, feet, wheels and props. */
export function ground(x:number,z:number){
 let h=.6*vnoise(x*.011,z*.011)+.2*vnoise(x*.047+11,z*.047+3)+.05*vnoise(x*.23,z*.23);
 const dr=Math.hypot(x-OUTCROP[0],z-OUTCROP[2]);h+=1.4*Math.exp(-((dr/38)**2));
 const dd=Math.hypot(x-DAM[0],z-DAM[2]);h-=1.3*smooth(DAM_R+5,DAM_R-3,dd);
 const rz=Math.abs(z-roadZ(x));h=lerp(h,h*.35-.04,smooth(5.5,2.2,rz));
 if(x>380&&x<720){const k=smooth(380,420,x)*(1-smooth(690,720,x));h+=k*(.07*Math.sin(x*1.7+z*.6)+.05*Math.sin(x*2.9-z*1.1)+.3*Math.exp(-(((x-EV_BUMP_X)/1.0)**2))*Math.exp(-((z/7)**2)));}
 return h;}
export const CHASE={x0:430,v:10.5,t0:25.4};
export const EV_BUMP_X=CHASE.x0+CHASE.v*(28.82-CHASE.t0);
export function groundNormal(x:number,z:number):V3{const e=.3,hx=ground(x+e,z)-ground(x-e,z),hz=ground(x,z+e)-ground(x,z-e);return norm([-hx,2*e,-hz]);}
export const onGround=(x:number,z:number,y=0):V3=>[x,ground(x,z)+y,z];

/** Scene lighting per look. */
export interface Sky{zenith:string;horizon:string;sun:string;sunDir:V3;haze:string;hazeD:number;ambient:string;ground:string;exposure:number;cloudLit:string;cloudShade:string}
export const SKY:Record<Look,Sky>={
 day:{zenith:'#2d6dc2',horizon:'#c9dbe6',sun:'#fff0d2',sunDir:norm([-.55,.52,.62]),haze:'#d9c7ae',hazeD:.0019,ambient:'#b8cde0',ground:'#9a5a3a',exposure:1.2,cloudLit:'#fffaf0',cloudShade:'#a7a9b8'},
 gold:{zenith:'#3a6fb3',horizon:'#f2cf9a',sun:'#ffd9a0',sunDir:norm([-.7,.3,.55]),haze:'#e5bf8e',hazeD:.0021,ambient:'#c7b9a4',ground:'#8c4f32',exposure:1.2,cloudLit:'#fff1d8',cloudShade:'#a49a9e'},
 sunset:{zenith:'#36457a',horizon:'#ff9a55',sun:'#ffb066',sunDir:norm([-.92,.07,.36]),haze:'#d4855a',hazeD:.0026,ambient:'#8a6f8a',ground:'#6b3826',exposure:1.15,cloudLit:'#ffc08a',cloudShade:'#6a4a6e'}};
