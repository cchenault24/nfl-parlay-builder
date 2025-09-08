import axios from 'axios';
import type { NFLGame, NFLPlayer } from '../types/nfl';

// ESPN API endpoints (free, no key required)
const ESPN_BASE_URL = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl';

export const fetchCurrentWeekGames = async (): Promise<NFLGame[]> => {
  try {
    const response = await axios.get(`${ESPN_BASE_URL}/scoreboard`);
    const events = response.data.events;
    
    return events.map((event: any) => {
      const homeTeam = event.competitions[0].competitors.find((c: any) => c.homeAway === 'home');
      const awayTeam = event.competitions[0].competitors.find((c: any) => c.homeAway === 'away');
      
      return {
        id: event.id,
        date: event.date,
        week: event.week?.number || 1,
        season: event.season?.year || 2024,
        status: event.status?.type?.name || 'scheduled',
        homeTeam: {
          id: homeTeam?.id || '',
          name: homeTeam?.team.name || '',
          displayName: homeTeam?.team.displayName || '',
          abbreviation: homeTeam?.team.abbreviation || '',
          color: homeTeam?.team.color || '000000',
          alternateColor: homeTeam?.team.alternateColor || '000000',
          logo: homeTeam?.team.logo || '',
        },
        awayTeam: {
          id: awayTeam?.id || '',
          name: awayTeam?.team.name || '',
          displayName: awayTeam?.team.displayName || '',
          abbreviation: awayTeam?.team.abbreviation || '',
          color: awayTeam?.team.color || '000000',
          alternateColor: awayTeam?.team.alternateColor || '000000',
          logo: awayTeam?.team.logo || '',
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
    const athletes = response.data.athletes || [];
    
    return athletes.map((athlete: any) => ({
      id: athlete.id,
      name: athlete.name,
      displayName: athlete.displayName,
      position: athlete.position?.abbreviation || athlete.position?.name || 'Unknown',
      jerseyNumber: athlete.jersey || '',
      experience: athlete.experience?.years || 0,
      college: athlete.college?.name || '',
    }));
  } catch (error) {
    console.error(`Error fetching roster for team ${teamId}:`, error);
    return []; // Return empty array on error
  }
};

export const fetchGameRosters = async (game: NFLGame): Promise<{ homeRoster: NFLPlayer[], awayRoster: NFLPlayer[] }> => {
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