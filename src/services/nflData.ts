import axios from "axios";
import { NFLGame, NFLPlayer } from "../types";
import { ESPNScoreboardResponse, ESPNRosterResponse, ESPNAthlete } from "../types/espn";
import { API_CONFIG } from "../config/constants";

export const fetchCurrentWeekGames = async (): Promise<NFLGame[]> => {
  try {
    const response = await axios.get(`${API_CONFIG.ESPN_BASE_URL}/scoreboard`);
    const data: ESPNScoreboardResponse = response.data;

    if (!data.events || data.events.length === 0) {
      console.warn('No events found in ESPN response');
      return [];
    }

    const games: NFLGame[] = data.events.map((event) => {
      const competition = event.competitions[0];
      if (!competition) {
        throw new Error(`No competition data for event ${event.id}`);
      }

      const homeCompetitor = competition.competitors.find(c => c.homeAway === 'home');
      const awayCompetitor = competition.competitors.find(c => c.homeAway === 'away');

      if (!homeCompetitor || !awayCompetitor) {
        console.error('Missing competitor data:', {
          eventId: event.id,
          competitors: competition.competitors.map(c => ({ id: c.id, homeAway: c.homeAway }))
        });
        throw new Error(`Missing team data for game ${event.id}`);
      }

      const game: NFLGame = {
        id: event.id,
        date: event.date,
        week: event.week.number,
        season: event.season.year,
        status: mapESPNStatus(event.status.type.name),
        homeTeam: {
          id: homeCompetitor.team.id,
          name: homeCompetitor.team.name,
          displayName: homeCompetitor.team.displayName,
          abbreviation: homeCompetitor.team.abbreviation,
          color: homeCompetitor.team.color || '000000',
          alternateColor: homeCompetitor.team.alternateColor || '000000',
          logo: homeCompetitor.team.logo,
        },
        awayTeam: {
          id: awayCompetitor.team.id,
          name: awayCompetitor.team.name,
          displayName: awayCompetitor.team.displayName,
          abbreviation: awayCompetitor.team.abbreviation,
          color: awayCompetitor.team.color || '000000',
          alternateColor: awayCompetitor.team.alternateColor || '000000',
          logo: awayCompetitor.team.logo,
        },
      };

      return game;
    });

    return games;

  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Axios error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });
    }
    throw new Error('Failed to fetch NFL games from ESPN API');
  }
};

export const fetchTeamRoster = async (teamId: string): Promise<NFLPlayer[]> => {
  try {
    const response = await axios.get(`${API_CONFIG.ESPN_BASE_URL}/teams/${teamId}/roster`);
    const data: ESPNRosterResponse = response.data;

    if (!data.athletes || data.athletes.length === 0) {
      console.warn(`No athletes found for team ${teamId}`);
      return [];
    }

    const allAthletes: ESPNAthlete[] = data.athletes.flatMap(group =>
      group.items || []
    );

    const players: NFLPlayer[] = allAthletes.map((athlete) => {
      return {
        id: athlete.id,
        name: athlete.fullName || athlete.displayName || 'Unknown Player',
        displayName: athlete.displayName || athlete.fullName || 'Unknown Player',
        position: athlete.position?.abbreviation || athlete.position?.name || 'Unknown',
        jerseyNumber: athlete.jersey || '',
        experience: athlete.experience?.years || 0,
        college: athlete.college?.name,
      };
    });
    return players;

  } catch (error) {
    console.error(`Error fetching roster for team ${teamId}:`, error);
    if (axios.isAxiosError(error)) {
      console.error('Axios error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        url: error.config?.url
      });
    }
    return [];
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

function mapESPNStatus(espnStatus: string): NFLGame['status'] {
  switch (espnStatus) {
    case 'STATUS_SCHEDULED':
      return 'scheduled';
    case 'STATUS_IN_PROGRESS':
      return 'in_progress';
    case 'STATUS_FINAL':
      return 'final';
    case 'STATUS_POSTPONED':
      return 'postponed';
    case 'STATUS_CANCELED':
    case 'STATUS_CANCELLED':
      return 'postponed';
    default:
      console.warn(`Unknown ESPN status: ${espnStatus}, defaulting to 'scheduled'`);
      return 'scheduled';
  }
}