import axios from 'axios';
import { NFLGame, NFLPlayer, GameRosters } from '../types';

const ESPN_BASE_URL = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl';

interface ESPNGameEvent {
  id: string;
  date: string;
  week?: { number: number };
  season?: { year: number };
  status?: { type?: { name: string } };
  competitions: Array<{
    competitors: Array<{
      id: string;
      homeAway: 'home' | 'away';
      team: {
        id: string;
        name: string;
        displayName: string;
        abbreviation: string;
        color: string;
        alternateColor: string;
        logo: string;
      };
    }>;
  }>;
}

interface ESPNRosterAthlete {
  id: string;
  name: string;
  displayName: string;
  jersey: string;
  position: { abbreviation: string };
  experience?: { years: number };
  college?: { name: string };
}

export const fetchCurrentWeekGames = async (): Promise<NFLGame[]> => {
  try {
    const response = await axios.get(`${ESPN_BASE_URL}/scoreboard`);
    const events: ESPNGameEvent[] = response.data.events;
    
    return events.map((event) => {
      const competition = event.competitions[0];
      const homeTeam = competition.competitors.find(c => c.homeAway === 'home');
      const awayTeam = competition.competitors.find(c => c.homeAway === 'away');
      
      if (!homeTeam || !awayTeam) {
        throw new Error(`Missing team data for game ${event.id}`);
      }

      return {
        id: event.id,
        date: event.date,
        week: event.week?.number || 1,
        season: event.season?.year || 2024,
        status: mapStatus(event.status?.type?.name),
        homeTeam: {
          id: homeTeam.team.id,
          name: homeTeam.team.name,
          displayName: homeTeam.team.displayName,
          abbreviation: homeTeam.team.abbreviation,
          color: homeTeam.team.color || '000000',
          alternateColor: homeTeam.team.alternateColor || '000000',
          logo: homeTeam.team.logo,
        },
        awayTeam: {
          id: awayTeam.team.id,
          name: awayTeam.team.name,
          displayName: awayTeam.team.displayName,
          abbreviation: awayTeam.team.abbreviation,
          color: awayTeam.team.color || '000000',
          alternateColor: awayTeam.team.alternateColor || '000000',
          logo: awayTeam.team.logo,
        },
      };
    });
  } catch (error) {
    console.error('Error fetching NFL games:', error);
    throw new Error('Failed to fetch NFL games');
  }
};

export const fetchTeamRoster = async (teamId: string): Promise<NFLPlayer[]> => {
  try {
    const response = await axios.get(`${ESPN_BASE_URL}/teams/${teamId}/roster`);
    const athletes: ESPNRosterAthlete[][] = response.data.athletes || [];
    
    // Flatten the athletes array (ESPN groups by position)
    const allAthletes = athletes.flat();
    
    return allAthletes.map((athlete) => ({
      id: athlete.id,
      name: athlete.name,
      displayName: athlete.displayName,
      position: athlete.position.abbreviation || 'Unknown',
      jerseyNumber: athlete.jersey || '',
      experience: athlete.experience?.years || 0,
      college: athlete.college?.name,
    }));
  } catch (error) {
    console.error(`Error fetching roster for team ${teamId}:`, error);
    return []; // Return empty array on error
  }
};

export const fetchGameRosters = async (game: NFLGame): Promise<GameRosters> => {
  try {
    const [homeRoster, awayRoster] = await Promise.all([
      fetchTeamRoster(game.homeTeam.id),
      fetchTeamRoster(game.awayTeam.id)
    ]);
    
    return { homeRoster, awayRoster };
  } catch (error) {
    console.error('Error fetching game rosters:', error);
    return { homeRoster: [], awayRoster: [] };
  }
};

// Simple helper function
function mapStatus(status?: string): NFLGame['status'] {
  switch (status) {
    case 'STATUS_SCHEDULED': return 'scheduled';
    case 'STATUS_IN_PROGRESS': return 'in_progress';
    case 'STATUS_FINAL': return 'final';
    case 'STATUS_POSTPONED': return 'postponed';
    default: return 'scheduled';
  }
}