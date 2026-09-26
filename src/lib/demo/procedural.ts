// Demo obrázky kreslené kódem (žádné cizí fotky ani loga).
import { loadFonts } from "../fonts";

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")!] as const;
}

/** Hala s palubovkou a světly – univerzální pozadí */
export function makeArena(w = 1600, h = 2000, seed = 7, tint = "#2a1458") {
  const [c, x] = canvas(w, h);
  const r = rng(seed);
  const g = x.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#07070f");
  g.addColorStop(0.45, tint);
  g.addColorStop(1, "#0a0710");
  x.fillStyle = g;
  x.fillRect(0, 0, w, h);
  // světla pod stropem
  for (let i = 0; i < 7; i++) {
    const cx = (w / 6) * i + (r() - 0.5) * 80;
    const cy = h * 0.08 + r() * h * 0.05;
    const rg = x.createRadialGradient(cx, cy, 0, cx, cy, w * 0.22);
    rg.addColorStop(0, "rgba(255,245,230,0.55)");
    rg.addColorStop(0.2, "rgba(255,230,200,0.15)");
    rg.addColorStop(1, "rgba(255,230,200,0)");
    x.fillStyle = rg;
    x.fillRect(0, 0, w, h);
  }
  // publikum – rozmazané body
  for (let i = 0; i < 900; i++) {
    const px = r() * w;
    const py = h * 0.22 + r() * h * 0.36;
    const rad = 3 + r() * 16;
    const hue = [20, 35, 260, 280, 0, 210][Math.floor(r() * 6)];
    x.fillStyle = `hsla(${hue},${40 + r() * 40}%,${40 + r() * 35}%,${0.12 + r() * 0.25})`;
    x.beginPath();
    x.arc(px, py, rad, 0, Math.PI * 2);
    x.fill();
  }
  // palubovka v perspektivě
  const top = h * 0.6;
  const fg = x.createLinearGradient(0, top, 0, h);
  fg.addColorStop(0, "#6b4323");
  fg.addColorStop(1, "#c98a4b");
  x.fillStyle = fg;
  x.beginPath();
  x.moveTo(-w * 0.2, h);
  x.lineTo(w * 0.1, top);
  x.lineTo(w * 0.9, top);
  x.lineTo(w * 1.2, h);
  x.closePath();
  x.fill();
  x.save();
  x.clip();
  for (let i = 0; i < 40; i++) {
    const t = i / 40;
    x.strokeStyle = `rgba(60,30,10,${0.08 + r() * 0.08})`;
    x.lineWidth = 2;
    x.beginPath();
    x.moveTo(w * 0.1 + t * w * 0.8, top);
    x.lineTo(-w * 0.2 + t * w * 1.4, h);
    x.stroke();
  }
  // odlesk světel na palubovce
  const sh = x.createRadialGradient(w / 2, top + h * 0.1, 0, w / 2, top + h * 0.1, w * 0.6);
  sh.addColorStop(0, "rgba(255,240,220,0.35)");
  sh.addColorStop(1, "rgba(255,240,220,0)");
  x.fillStyle = sh;
  x.fillRect(0, top, w, h - top);
  // čáry hřiště
  x.strokeStyle = "rgba(255,255,255,0.75)";
  x.lineWidth = 6;
  x.beginPath();
  x.ellipse(w / 2, top + (h - top) * 0.55, w * 0.34, (h - top) * 0.3, 0, Math.PI, 0);
  x.stroke();
  x.beginPath();
  x.moveTo(w * 0.38, top);
  x.lineTo(w * 0.33, top + (h - top) * 0.45);
  x.lineTo(w * 0.67, top + (h - top) * 0.45);
  x.lineTo(w * 0.62, top);
  x.stroke();
  x.restore();
  // vinětace
  const v = x.createRadialGradient(w / 2, h / 2, w * 0.3, w / 2, h / 2, w * 0.95);
  v.addColorStop(0, "rgba(0,0,0,0)");
  v.addColorStop(1, "rgba(0,0,0,0.6)");
  x.fillStyle = v;
  x.fillRect(0, 0, w, h);
  return c.toDataURL("image/jpeg", 0.9);
}

function drawBall(x: CanvasRenderingContext2D, cx: number, cy: number, R: number) {
  const g = x.createRadialGradient(cx - R * 0.35, cy - R * 0.35, R * 0.1, cx, cy, R);
  g.addColorStop(0, "#ffa65c");
  g.addColorStop(0.6, "#e8661f");
  g.addColorStop(1, "#8a300a");
  x.fillStyle = g;
  x.beginPath();
  x.arc(cx, cy, R, 0, Math.PI * 2);
  x.fill();
  x.save();
  x.beginPath();
  x.arc(cx, cy, R, 0, Math.PI * 2);
  x.clip();
  x.strokeStyle = "rgba(30,10,0,0.85)";
  x.lineWidth = R * 0.045;
  x.beginPath();
  x.moveTo(cx - R, cy);
  x.lineTo(cx + R, cy);
  x.moveTo(cx, cy - R);
  x.lineTo(cx, cy + R);
  x.stroke();
  x.beginPath();
  x.ellipse(cx - R * 0.95, cy, R * 0.55, R, 0, -Math.PI / 2, Math.PI / 2);
  x.stroke();
  x.beginPath();
  x.ellipse(cx + R * 0.95, cy, R * 0.55, R, 0, Math.PI / 2, (Math.PI * 3) / 2);
  x.stroke();
  x.restore();
}

/** Míč v detailu na palubovce */
export function makeBallPhoto(w = 1600, h = 2000) {
  const src = makeArena(w, h, 11, "#1b1540");
  const [c, x] = canvas(w, h);
  return new Promise<string>((resolve) => {
    const img = new Image();
    img.onload = () => {
      x.filter = "blur(6px)";
      x.drawImage(img, 0, 0);
      x.filter = "none";
      drawBall(x, w * 0.58, h * 0.66, w * 0.26);
      resolve(c.toDataURL("image/jpeg", 0.9));
    };
    img.src = src;
  });
}

/** Silueta hráče s průhledným pozadím – zástupná "vyříznutá" fotka */
export function makePlayerCutout(number = "22", jersey = "#3b1b86", trim = "#ff6a13") {
  const w = 1000;
  const h = 1300;
  const [c, x] = canvas(w, h);
  const skin = "#2a2130";
  // stín
  x.fillStyle = "rgba(0,0,0,0.25)";
  // hlava
  x.fillStyle = skin;
  x.beginPath();
  x.ellipse(500, 250, 105, 128, 0, 0, Math.PI * 2);
  x.fill();
  // krk
  x.fillRect(450, 340, 100, 90);
  // paže
  x.beginPath();
  x.moveTo(250, 470);
  x.quadraticCurveTo(170, 700, 190, 900);
  x.lineTo(270, 910);
  x.quadraticCurveTo(280, 720, 330, 560);
  x.closePath();
  x.moveTo(750, 470);
  x.quadraticCurveTo(840, 690, 820, 880);
  x.lineTo(740, 890);
  x.quadraticCurveTo(730, 720, 670, 560);
  x.closePath();
  x.fill();
  // dres
  const jg = x.createLinearGradient(0, 400, 0, 1300);
  jg.addColorStop(0, jersey);
  jg.addColorStop(1, "#1b0d3d");
  x.fillStyle = jg;
  x.beginPath();
  x.moveTo(330, 410);
  x.quadraticCurveTo(500, 520, 670, 410);
  x.lineTo(760, 470);
  x.quadraticCurveTo(700, 560, 700, 640);
  x.lineTo(730, 1300);
  x.lineTo(270, 1300);
  x.lineTo(300, 640);
  x.quadraticCurveTo(300, 560, 240, 470);
  x.closePath();
  x.fill();
  // lemy
  x.strokeStyle = trim;
  x.lineWidth = 14;
  x.beginPath();
  x.moveTo(340, 418);
  x.quadraticCurveTo(500, 520, 660, 418);
  x.stroke();
  // číslo
  x.fillStyle = "#ffffff";
  x.font = `400 300px "Bebas Neue", "Arial Narrow", sans-serif`;
  x.textAlign = "center";
  x.textBaseline = "middle";
  x.fillText(number, 500, 820);
  // obrysové světlo
  x.globalCompositeOperation = "source-atop";
  const rim = x.createLinearGradient(0, 0, w, 0);
  rim.addColorStop(0, "rgba(255,255,255,0.18)");
  rim.addColorStop(0.2, "rgba(255,255,255,0)");
  rim.addColorStop(0.85, "rgba(255,255,255,0)");
  rim.addColorStop(1, "rgba(255,150,80,0.25)");
  x.fillStyle = rim;
  x.fillRect(0, 0, w, h);
  return c.toDataURL("image/png");
}

/** Jednoduchý textový logotyp pro demo projekt (nahraďte vlastním logem v Brand kitu) */
export async function makeWordmark(text: string, color = "#ffffff", accent = "#ff6a13") {
  await loadFonts([`italic 800 100px "Barlow Condensed"`]);
  const [m, mx] = canvas(10, 10);
  void m;
  mx.font = `italic 800 120px "Barlow Condensed", "Arial Narrow", sans-serif`;
  const tw = mx.measureText(text).width;
  const h = 160;
  const w = Math.ceil(tw + h + 30);
  const [c, x] = canvas(w, h);
  drawBall(x, h / 2, h / 2, h * 0.42);
  x.font = mx.font;
  x.fillStyle = color;
  x.textBaseline = "middle";
  x.fillText(text, h + 10, h / 2 + 6);
  x.fillStyle = accent;
  x.fillRect(h + 10, h - 16, Math.min(tw, 120), 8);
  return c.toDataURL("image/png");
}
