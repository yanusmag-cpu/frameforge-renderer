// YunoWorld v3 overlay graphics (HTML over the WebGL frame, 1080x1920 space). Bold, readable on a phone, safe from the Shorts UI.
const SH = 'text-shadow:0 6px 24px rgba(0,0,0,.55),0 2px 4px rgba(0,0,0,.6)';
/** Location / date title card that punches in. */
export const card = (a: string, b: string, k: number) => k <= .001 ? '' :
  `<div style="position:absolute;left:0;width:1080px;top:330px;text-align:center;opacity:${k};transform:translateY(${(1 - k) * 30}px) scale(${.92 + .08 * k});font-family:Inter;${SH}">
   <div style="display:inline-block;font-weight:900;font-size:92px;letter-spacing:2px;color:#fff;line-height:1">${a}</div>
   <div style="width:${180 * k}px;height:8px;background:#ffd23f;margin:22px auto;border-radius:4px"></div>
   <div style="font-weight:700;font-size:38px;letter-spacing:6px;color:#ffe9a8">${b}</div></div>`;
/** Small fact chip (yellow label on dark glass), centred at x. */
export const chip = (txt: string, x: number, y: number, k: number, col = '#ffd23f') => k <= .001 ? '' :
  `<div style="position:absolute;left:${x}px;top:${y}px;transform:translate(-50%,0) scale(${.85 + .15 * k});opacity:${k};font-family:Inter;font-weight:900;font-size:40px;letter-spacing:1px;color:#fff;white-space:nowrap;
   background:rgba(10,14,24,.62);border-left:10px solid ${col};padding:14px 28px;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.35)">${txt}</div>`;
/** Final outcome card. */
export const endCard = (a: string, b: string, k: number) => k <= .001 ? '' :
  `<div style="position:absolute;left:0;width:1080px;top:300px;text-align:center;opacity:${k};font-family:Inter;${SH}">
   <div style="font-weight:900;font-size:84px;line-height:1.05;color:#fff">${a}</div>
   <div style="width:220px;height:8px;background:#d8262b;margin:26px auto;border-radius:4px"></div>
   <div style="font-weight:800;font-size:44px;line-height:1.25;color:#ffd23f;padding:0 60px">${b}</div></div>`;
/** Big hook word (one or two words). */
export const hookWord = (txt: string, k: number, col = '#ffd23f') => k <= .001 ? '' :
  `<div style="position:absolute;left:0;width:1080px;top:360px;text-align:center;opacity:${k};transform:scale(${1.25 - .25 * k});font-family:Inter;font-weight:900;font-size:128px;color:${col};-webkit-text-stroke:7px #111;paint-order:stroke fill;${SH}">${txt}</div>`;
