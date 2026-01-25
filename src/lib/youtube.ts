/**
 * YouTube Playlist Helper
 * 
 * Fetches videos from a YouTube playlist and randomly selects one.
 * Requires YOUTUBE_API_KEY and YOUTUBE_PLAYLIST_ID environment variables.
 */

const YOUTUBE_API_KEY = import.meta.env.YOUTUBE_API_KEY;
const YOUTUBE_PLAYLIST_ID = import.meta.env.YOUTUBE_PLAYLIST_ID;

interface YouTubePlaylistItem {
  id: string;
  snippet: {
    resourceId: {
      videoId: string;
    };
  };
}

interface YouTubePlaylistResponse {
  items: YouTubePlaylistItem[];
  nextPageToken?: string;
}

/**
 * Get all video IDs from a YouTube playlist
 */
async function getPlaylistVideoIds(playlistId: string): Promise<string[]> {
  if (!YOUTUBE_API_KEY || YOUTUBE_API_KEY.trim() === '') {
    throw new Error(
      'YOUTUBE_API_KEY environment variable is required. ' +
      'Get one at https://console.cloud.google.com/apis/credentials'
    );
  }

  const videoIds: string[] = [];
  let nextPageToken: string | undefined;

  do {
    const url = new URL('https://www.googleapis.com/youtube/v3/playlistItems');
    url.searchParams.set('part', 'snippet');
    url.searchParams.set('playlistId', playlistId);
    url.searchParams.set('maxResults', '50');
    url.searchParams.set('key', YOUTUBE_API_KEY);
    if (nextPageToken) {
      url.searchParams.set('pageToken', nextPageToken);
    }

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`YouTube API request failed: ${response.status} ${response.statusText}`);
    }

    const data: YouTubePlaylistResponse = await response.json();
    
    if (data.items) {
      videoIds.push(...data.items.map(item => item.snippet.resourceId.videoId));
    }

    nextPageToken = data.nextPageToken;
  } while (nextPageToken);

  return videoIds;
}

/**
 * Get a random video ID from a YouTube playlist
 */
export async function getRandomVideoFromPlaylist(playlistId?: string): Promise<string> {
  const targetPlaylistId = playlistId || YOUTUBE_PLAYLIST_ID;

  if (!targetPlaylistId || targetPlaylistId.trim() === '') {
    throw new Error(
      'YOUTUBE_PLAYLIST_ID environment variable is required, ' +
      'or pass playlistId as parameter. ' +
      'Get the playlist ID from the YouTube playlist URL.'
    );
  }

  const videoIds = await getPlaylistVideoIds(targetPlaylistId);

  if (videoIds.length === 0) {
    throw new Error('Playlist is empty or could not be accessed');
  }

  const randomIndex = Math.floor(Math.random() * videoIds.length);
  return videoIds[randomIndex];
}
