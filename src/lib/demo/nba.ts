// Týmy NBA (pro grafiky „Čech v NBA“) – loga v /public/nba/{key}.png a bílá verze {key}-w.png
// (barevná loga z balíčku nba-team-logos, bílé verze dopočítané; Portland od Petra).
import type { Team } from "../types";

const T: [string, string, string, string[], string, string][] = [
  ["atl", "Atlanta Hawks", "ATL", ["Atlanta", "Hawks"], "#E03A3E", "#26282A"],
  ["bos", "Boston Celtics", "BOS", ["Boston", "Celtics"], "#007A33", "#BA9653"],
  ["bk", "Brooklyn Nets", "BKN", ["Brooklyn", "Nets"], "#000000", "#FFFFFF"],
  ["cha", "Charlotte Hornets", "CHA", ["Charlotte", "Hornets"], "#1D1160", "#00788C"],
  ["chi", "Chicago Bulls", "CHI", ["Chicago", "Bulls"], "#CE1141", "#000000"],
  ["cle", "Cleveland Cavaliers", "CLE", ["Cleveland", "Cavaliers", "Cavs"], "#860038", "#FDBB30"],
  ["dal", "Dallas Mavericks", "DAL", ["Dallas", "Mavericks", "Mavs"], "#00538C", "#B8C4CA"],
  ["den", "Denver Nuggets", "DEN", ["Denver", "Nuggets"], "#0E2240", "#FEC524"],
  ["det", "Detroit Pistons", "DET", ["Detroit", "Pistons"], "#C8102E", "#1D42BA"],
  ["gsw", "Golden State Warriors", "GSW", ["Golden State", "Warriors", "GS Warriors"], "#1D428A", "#FFC72C"],
  ["hou", "Houston Rockets", "HOU", ["Houston", "Rockets"], "#CE1141", "#000000"],
  ["ind", "Indiana Pacers", "IND", ["Indiana", "Pacers"], "#002D62", "#FDBB30"],
  ["lac", "Los Angeles Clippers", "LAC", ["LA Clippers", "Clippers"], "#C8102E", "#1D428A"],
  ["lal", "Los Angeles Lakers", "LAL", ["LA Lakers", "Lakers"], "#552583", "#FDB927"],
  ["mem", "Memphis Grizzlies", "MEM", ["Memphis", "Grizzlies"], "#5D76A9", "#12173F"],
  ["mia", "Miami Heat", "MIA", ["Miami", "Heat"], "#98002E", "#F9A01B"],
  ["mil", "Milwaukee Bucks", "MIL", ["Milwaukee", "Bucks"], "#00471B", "#EEE1C6"],
  ["min", "Minnesota Timberwolves", "MIN", ["Minnesota", "Timberwolves", "Wolves"], "#0C2340", "#78BE20"],
  ["no", "New Orleans Pelicans", "NOP", ["New Orleans", "Pelicans"], "#0C2340", "#C8102E"],
  ["nyk", "New York Knicks", "NYK", ["New York", "Knicks"], "#006BB6", "#F58426"],
  ["okc", "Oklahoma City Thunder", "OKC", ["Oklahoma City", "Thunder", "Oklahoma"], "#007AC1", "#EF3B24"],
  ["orl", "Orlando Magic", "ORL", ["Orlando", "Magic"], "#0077C0", "#C4CED4"],
  ["phi", "Philadelphia 76ers", "PHI", ["Philadelphia", "76ers", "Sixers"], "#006BB6", "#ED174C"],
  ["phx", "Phoenix Suns", "PHX", ["Phoenix", "Suns"], "#1D1160", "#E56020"],
  ["por", "Portland Trail Blazers", "POR", ["Portland", "Trail Blazers", "Blazers"], "#E03A3E", "#C4CED4"],
  ["sac", "Sacramento Kings", "SAC", ["Sacramento", "Kings"], "#5A2D81", "#63727A"],
  ["sas", "San Antonio Spurs", "SAS", ["San Antonio", "Spurs"], "#C4CED4", "#000000"],
  ["tor", "Toronto Raptors", "TOR", ["Toronto", "Raptors"], "#CE1141", "#000000"],
  ["uta", "Utah Jazz", "UTA", ["Utah", "Jazz"], "#4E008E", "#FFF21F"],
  ["was", "Washington Wizards", "WAS", ["Washington", "Wizards"], "#002B5C", "#E31837"],
];

/** Týmy NBA pro projekt Evropské poháry (loga jako URL na /nba/…, není potřeba je ukládat do assetů). */
export function nbaTeams(): Team[] {
  return T.map(([k, name, short, aliases, color, color2]) => ({ id: `p-bcl-nba-${k}`, name, short, aliases, color, color2, logo: `/nba/${k}.png`, logoWhite: `/nba/${k}-w.png` }));
}
export const NBA_LOGO = "/nba/nba.png";
export const NBA_LOGO_WHITE = "/nba/nba-w.png";
