// Demo data z basketbalu (ilustrativní – výsledky a statistiky jsou vymyšlené).
import type { Team } from "../types";

export const DEMO_TEAMS: Omit<Team, "id">[] = [
  { name: "Basket Brno", short: "BRN", aliases: ["Brno"], color: "#1C2D6B", color2: "#E30613" },
  { name: "USK Praha", short: "USK", aliases: ["Basketbal USK Praha", "USK"], color: "#1E2A5A", color2: "#9FB4FF" },
  { name: "Sluneta Ústí nad Labem", short: "ÚST", aliases: ["Sluneta", "Ústí", "Ústí n. L."], color: "#F5A800", color2: "#1B3F8B" },
  { name: "BK Kvis Pardubice", short: "PAR", aliases: ["Pardubice", "Kvis Pardubice"], color: "#1F3F99", color2: "#FFFFFF" },
  { name: "BK Armex Energy Děčín", short: "DĚČ", aliases: ["Děčín", "Decin"], color: "#1E6FB5", color2: "#FFFFFF" },
  { name: "BK Opava", short: "OPA", aliases: ["Opava"], color: "#0B7A3E", color2: "#F2C300" },
  { name: "BK Olomoucko", short: "OLO", aliases: ["Olomoucko", "Olomouc"], color: "#1B2D5B", color2: "#6CC4E8" },
  { name: "NH Ostrava", short: "OST", aliases: ["Ostrava", "Nová huť Ostrava"], color: "#0077C8", color2: "#FFFFFF" },
  { name: "BK Lokomotiva Plzeň", short: "PLZ", aliases: ["Plzeň", "Plzen", "Lokomotiva Plzeň"], color: "#5B2D8E", color2: "#FFFFFF" },
  { name: "Sršni Písek", short: "PÍS", aliases: ["Písek", "Sršni"], color: "#F6C400", color2: "#111111" },
  { name: "BK GAPA Hradec Králové", short: "HKR", aliases: ["Hradec Králové", "Hradec", "GAPA"], color: "#6B2C91", color2: "#FFFFFF" },
  { name: "Slavia Praha", short: "SLA", aliases: ["Slavia", "Slavia Praha ERA NBK"], color: "#E30613", color2: "#FFFFFF" },
];

export const DEMO_REPRE_TEAMS: Omit<Team, "id">[] = [
  { name: "Česko", short: "CZE", aliases: ["Czechia", "ČR", "Česká republika"], color: "#D7141A", color2: "#11457E" },
  { name: "Slovensko", short: "SVK", aliases: ["Slovakia"], color: "#0B4EA2", color2: "#EE1C25" },
  { name: "Polsko", short: "POL", aliases: ["Poland"], color: "#DC143C", color2: "#FFFFFF" },
  { name: "Německo", short: "GER", aliases: ["Germany"], color: "#111111", color2: "#FFCE00" },
  { name: "Srbsko", short: "SRB", aliases: ["Serbia"], color: "#C6363C", color2: "#0C4076" },
  { name: "Litva", short: "LTU", aliases: ["Lithuania"], color: "#006A44", color2: "#FDB913" },
];

export const PROGRAM_3_KOLO = [
  { home: "USK Praha", away: "Sluneta Ústí nad Labem", date: "2026-09-26", time: "17:30", venue: "Hala USK, Praha" },
  { home: "Basket Brno", away: "BK Opava", date: "2026-09-26", time: "18:00", venue: "Hala Vodova, Brno" },
  { home: "BK GAPA Hradec Králové", away: "BK Kvis Pardubice", date: "2026-09-26", time: "18:00", venue: "Hala Třebeš" },
  { home: "Slavia Praha", away: "BK Armex Energy Děčín", date: "2026-09-26", time: "18:00", venue: "Folimanka" },
  { home: "BK Olomoucko", away: "NH Ostrava", date: "2026-09-27", time: "17:00", venue: "Prostějov" },
  { home: "BK Lokomotiva Plzeň", away: "Sršni Písek", date: "2026-09-27", time: "18:00", venue: "Plzeň" },
];

export const RESULTS_2_KOLO = [
  { home: "Slavia Praha", away: "Basket Brno", home_score: 92, away_score: 78, detail: "24:18 | 22:20 | 25:21 | 21:19" },
  { home: "BK Opava", away: "BK Armex Energy Děčín", home_score: 81, away_score: 76, detail: "18:22 | 23:17 | 20:19 | 20:18" },
  { home: "BK Kvis Pardubice", away: "Sluneta Ústí nad Labem", home_score: 88, away_score: 84, detail: "20:21 | 25:19 | 19:24 | 24:20" },
  { home: "BK Armex Energy Děčín", away: "USK Praha", home_score: 74, away_score: 57, detail: "19:12 | 18:16 | 20:14 | 17:15" },
  { home: "NH Ostrava", away: "BK Lokomotiva Plzeň", home_score: 69, away_score: 72, detail: "15:20 | 19:17 | 18:16 | 17:19" },
  { home: "Sršni Písek", away: "BK GAPA Hradec Králové", home_score: 90, away_score: 83, detail: "22:21 | 24:18 | 20:25 | 24:19" },
  { home: "Slavia Praha", away: "BK Olomoucko", home_score: 79, away_score: 80, detail: "21:19 | 17:22 | 22:20 | 19:19" },
  { home: "Basket Brno", away: "BK Kvis Pardubice", home_score: 85, away_score: 77, detail: "23:17 | 19:20 | 22:21 | 21:19" },
];

export const STANDINGS = [
  { pos: 1, team: "BK Kvis Pardubice", g: 3, w: 3, l: 0, pct: "1.000" },
  { pos: 2, team: "Slavia Praha", g: 3, w: 3, l: 0, pct: "1.000" },
  { pos: 3, team: "Sršni Písek", g: 3, w: 3, l: 0, pct: "1.000" },
  { pos: 4, team: "Sluneta Ústí nad Labem", g: 3, w: 2, l: 1, pct: "0.667" },
  { pos: 5, team: "BK Armex Energy Děčín", g: 3, w: 2, l: 1, pct: "0.667" },
  { pos: 6, team: "NH Ostrava", g: 3, w: 2, l: 1, pct: "0.667" },
  { pos: 7, team: "BK GAPA Hradec Králové", g: 3, w: 1, l: 2, pct: "0.333" },
  { pos: 8, team: "BK Opava", g: 3, w: 1, l: 2, pct: "0.333" },
  { pos: 9, team: "BK Olomoucko", g: 3, w: 1, l: 2, pct: "0.333" },
  { pos: 10, team: "Basket Brno", g: 3, w: 0, l: 3, pct: "0.000" },
  { pos: 11, team: "USK Praha", g: 3, w: 0, l: 3, pct: "0.000" },
  { pos: 12, team: "BK Lokomotiva Plzeň", g: 3, w: 0, l: 3, pct: "0.000" },
];

export const ROSTER_CSV = `player,number,position,height,age,nationality
Jan Novák,8,PG,188,24,CZE
Petr Svoboda,12,SF,198,21,CZE
Martin Dvořák,4,SG,192,27,CZE
Jermaine Webb,22,C,206,28,USA
Tomáš Kříž,15,PF,203,25,CZE
Ondřej Veselý,7,SG,190,19,CZE`;

export const PLAYERS = ROSTER_CSV.split("\n")
  .slice(1)
  .map((l) => {
    const [player, number, position, height, age, nationality] = l.split(",");
    return { player, number, position, height, age, nationality };
  });
