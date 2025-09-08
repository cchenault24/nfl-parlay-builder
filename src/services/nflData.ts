import axios from 'axios';
import type { NFLGame, TeamStats, NewsItem } from '../types/nfl';

// ESPN API endpoints (free, no key required)
const ESPN_BASE_URL = 'http://site.api.espn.com/apis/site/v2/sports/football/nfl';

export const fetchCurrentWeekGames = async (): Promise<NFLGame[]> => {
  try {
    const response = await axios.get(`${ESPN_BASE_URL}/scoreboard`);
    const events = response.data.events;
    
    return events.map((event: any) => ({
      id: event.id,
      date: event.date,
      week: event.week?.number || 1,
      season: event.season?.year || 2024,
      status: event.status?.type?.name || 'scheduled',
      homeTeam: {
        id: event.competitions[0].competitors[0].id,
        name: event.competitions[0].competitors[0].team.name,
        displayName: event.competitions[0].competitors[0].team.displayName,
        abbreviation: event.competitions[0].competitors[0].team.abbreviation,
        color: event.competitions[0].competitors[0].team.color || '000000',
        alternateColor: event.competitions[0].competitors[0].team.alternateColor || '000000',
        logo: event.competitions[0].competitors[0].team.logo,
      },
      awayTeam: {
        id: event.competitions[0].competitors[1].id,
        name: event.competitions[0].competitors[1].team.name,
        displayName: event.competitions[0].competitors[1].team.displayName,
        abbreviation: event.competitions[0].competitors[1].team.abbreviation,
        color: event.competitions[0].competitors[1].team.color || '000000',
        alternateColor: event.competitions[0].competitors[1].team.alternateColor || '000000',
        logo: event.competitions[0].competitors[1].team.logo,
      },
    }));
  } catch (error) {
    console.error('Error fetching NFL games:', error);
    throw new Error('Failed to fetch NFL games');
  }
};

export const fetchTeamStats = async (teamId: string): Promise<TeamStats> => {
  try {
    const response = await axios.get(`${ESPN_BASE_URL}/teams/${teamId}/statistics`);
    const stats = response.data.statistics;
    
    // Parse ESPN stats structure (this is simplified - you'll need to map actual ESPN stat IDs)
    return {
      teamId,
      passingYards: stats.find((s: any) => s.name === 'passingYards')?.value || 0,
      rushingYards: stats.find((s: any) => s.name === 'rushingYards')?.value || 0,
      totalYards: stats.find((s: any) => s.name === 'totalYards')?.value || 0,
      pointsPerGame: stats.find((s: any) => s.name === 'pointsPerGame')?.value || 0,
      pointsAllowed: stats.find((s: any) => s.name === 'pointsAllowed')?.value || 0,
      turnovers: stats.find((s: any) => s.name === 'turnovers')?.value || 0,
      record: '0-0', // You'll need to calculate this from games
    };
  } catch (error) {
    console.error('Error fetching team stats:', error);
    throw new Error('Failed to fetch team statistics');
  }
};

// NFL.com RSS news feed
export const fetchNFLNews = async (teamIds: string[]): Promise<NewsItem[]> => {
  try {
    // Note: You'll likely need a CORS proxy for this in development
    // For now, this is a placeholder structure
    const mockNews: NewsItem[] = [
      {
        title: "NFL Week Update",
        description: "Latest updates from around the league",
        publishedDate: new Date().toISOString(),
        url: "https://www.nfl.com/news",
        teamIds,
      }
    ];
    
    return mockNews;
  } catch (error) {
    console.error('Error fetching NFL news:', error);
    return []; // Return empty array on error
  }
};