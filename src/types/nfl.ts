export interface NFLTeam {
  id: string;
  name: string;
  displayName: string;
  abbreviation: string;
  color: string;
  alternateColor: string;
  logo: string;
}

export interface NFLGame {
  id: string;
  date: string;
  homeTeam: NFLTeam;
  awayTeam: NFLTeam;
  week: number;
  season: number;
  status: string;
}

export interface TeamStats {
  teamId: string;
  passingYards: number;
  rushingYards: number;
  totalYards: number;
  pointsPerGame: number;
  pointsAllowed: number;
  turnovers: number;
  record: string;
}

export interface PlayerStats {
  playerId: string;
  name: string;
  position: string;
  teamId: string;
  passingYards?: number;
  rushingYards?: number;
  receivingYards?: number;
  touchdowns: number;
  receptions?: number;
}

export interface NewsItem {
  title: string;
  description: string;
  publishedDate: string;
  url: string;
  teamIds: string[];
}

export interface NFLPlayer {
  id: string;
  name: string;
  displayName: string;
  position: string;
  jerseyNumber: string;
  experience: number;
  college?: string;
}

export interface NFLRoster {
  teamId: string;
  players: NFLPlayer[];
}