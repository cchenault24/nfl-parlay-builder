import axios from "axios";
import { NFLGame, NFLPlayer } from "../types";
import { ESPNScoreboardResponse, ESPNRosterResponse, ESPNAthlete } from "../types/espn";
import { API_CONFIG } from "../config/constants";

export const fetchCurrentWeekGames = async (): Promise<NFLGame[]> => {
  return fetchGamesByWeek(); // Use current week by default
};

export const fetchGamesByWeek = async (week?: number, year?: number): Promise<NFLGame[]> => {
  try {
    // Build URL with optional week parameter
    let url = `${API_CONFIG.ESPN_BASE_URL}/scoreboard`;
    
    if (week && year) {
      url += `?seasontype=2&week=${week}&year=${year}`;
    } else if (week) {
      // Get current year if not provided
      const currentYear = new Date().getFullYear();
      url += `?seasontype=2&week=${week}&year=${currentYear}`;
    }

    const response = await axios.get(url);
    const data: ESPNScoreboardResponse = response.data;

    if (!data.events || data.events.length === 0) {
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
    throw new Error(`Failed to fetch NFL games from ESPN API for week ${week || 'current'}`);
  }
};

// Helper function to get current NFL week with intelligent advancement logic
export const getCurrentNFLWeek = async (): Promise<number> => {
  try {
    const response = await axios.get(`${API_CONFIG.ESPN_BASE_URL}/scoreboard`);
    const data: ESPNScoreboardResponse = response.data;
    
    if (data.week && data.week.number) {
      const apiWeek = data.week.number;
      
      // Check if all games in the current week are finished
      // If so, advance to next week after Tuesday midnight local time
      const adjustedWeek = await getAdjustedWeekBasedOnCompletion(apiWeek, data.events || []);
      
      return adjustedWeek;
    }
    
    // Fallback: estimate based on date if API doesn't provide week
    return estimateCurrentWeek();
  } catch (error) {
    return estimateCurrentWeek();
  }
};

// Get available weeks for the current season
export const getAvailableWeeks = async (): Promise<number[]> => {
  // Return all regular season weeks (1-18)
  return Array.from({ length: 18 }, (_, i) => i + 1);
};

export const fetchTeamRoster = async (teamId: string): Promise<NFLPlayer[]> => {
  try {
    const response = await axios.get(`${API_CONFIG.ESPN_BASE_URL}/teams/${teamId}/roster`);
    const data: ESPNRosterResponse = response.data;

    if (!data.athletes || data.athletes.length === 0) {
      return [];
    }

    // ESPN groups athletes by position, we need to flatten them
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
    return { homeRoster: [], awayRoster: [] };
  }
};

// Check if we should advance to the next week based on game completion
const getAdjustedWeekBasedOnCompletion = async (currentWeek: number, currentWeekEvents: any[]): Promise<number> => {
  try {
    // If there are no events for the current week, advance to next week
    if (!currentWeekEvents || currentWeekEvents.length === 0) {
      return Math.min(currentWeek + 1, 18);
    }

    // Check if all games in the current week are completed
    const allGamesCompleted = currentWeekEvents.every(event => {
      const status = event.status?.type?.name;
      return status === 'STATUS_FINAL';
    });

    if (allGamesCompleted) {
      // All games are done, check if enough time has passed (Tuesday midnight local time)
      const shouldAdvance = await shouldAdvanceToNextWeek(currentWeekEvents);
      
      if (shouldAdvance) {
        return Math.min(currentWeek + 1, 18);
      }
    }

    // Games are still ongoing or not enough time passed, stay in current week
    return currentWeek;

  } catch (error) {
    return currentWeek;
  }
};

// Check if enough time has passed after games to advance to next week
const shouldAdvanceToNextWeek = async (weekEvents: any[]): Promise<boolean> => {
  try {
    // Find the latest game end time
    let latestGameTime = new Date(0);
    
    weekEvents.forEach(event => {
      const gameDate = new Date(event.date);
      if (gameDate > latestGameTime) {
        latestGameTime = gameDate;
      }
    });

    // Advance at Tuesday midnight in the user's local timezone
    const advanceTime = new Date(latestGameTime);
    advanceTime.setDate(advanceTime.getDate() + 1); // Next day (Tuesday)
    advanceTime.setHours(0, 0, 0, 0); // Midnight in user's local time

    const now = new Date();
    return now >= advanceTime;

  } catch (error) {
    return false;
  }
};

// Enhanced fallback estimation that considers game completion
const estimateCurrentWeek = (): number => {
  const now = new Date();
  const currentYear = now.getFullYear();
  
  // Calculate NFL season start (first Thursday after Labor Day)
  const seasonStart = new Date(currentYear, 8, 5); // September 5th baseline
  
  // Find the first Thursday
  const seasonStartDayOfWeek = seasonStart.getDay();
  const daysUntilThursday = (4 - seasonStartDayOfWeek + 7) % 7;
  if (daysUntilThursday === 0 && seasonStartDayOfWeek !== 4) {
    seasonStart.setDate(seasonStart.getDate() + 7);
  } else {
    seasonStart.setDate(seasonStart.getDate() + daysUntilThursday);
  }
  
  // If we're before the season start, return week 1
  if (now < seasonStart) {
    return 1;
  }
  
  // Calculate weeks since season start
  const diffTime = now.getTime() - seasonStart.getTime();
  const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7)) + 1;
  
  // Add advancement logic for mid-week
  let estimatedWeek = Math.min(Math.max(diffWeeks, 1), 18);
  
  // If it's Tuesday or later, consider advancing to next week
  const currentDayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, 2 = Tuesday, etc.
  const isAdvancementDay = currentDayOfWeek >= 2; // Tuesday (2) or later
  
  if (isAdvancementDay && estimatedWeek < 18) {
    estimatedWeek = Math.min(estimatedWeek + 1, 18);
  }
  
  return estimatedWeek;
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
      return 'postponed'; // Map cancelled to postponed since we don't have a cancelled status
    default:
      return 'scheduled';
  }
}