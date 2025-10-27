import { transliterateLyrics } from './transliterate';

export type LyricsResult = { 
  lyrics: string | null; 
  provider: string | null; 
  synced: boolean;
  timestamps?: Array<{ time: number; text: string }> 
};

let cache = new Map<string, { data: LyricsResult; ts: number }>();

export async function fetchLyrics(title: string, artist: string): Promise<LyricsResult> {
  const key = `${title}::${artist}`;
  const hit = cache.get(key);
  const now = Date.now();
  if (hit && now - hit.ts < 10 * 60 * 1000) return hit.data;

  // Try LRCLIB first (free synced lyrics)
  try {
    const searchRes = await fetch(
      `https://lrclib.net/api/search?q=${encodeURIComponent(title)}%20${encodeURIComponent(artist)}&limit=5`
    );
    const searchJson = await searchRes.json();
    
    if (searchJson && searchJson.length > 0) {
      // Find the best matching track
      const track = searchJson.find((t: any) => 
        t.name?.toLowerCase().includes(title.toLowerCase()) ||
        t.artist?.toLowerCase().includes(artist.toLowerCase())
      ) || searchJson[0];
      
      console.log("LRCLIB found track:", track.name, "-", track.artist);
      
      // Get the full track details with lyrics
      if (track.id) {
        const trackRes = await fetch(`https://lrclib.net/api/get/${track.id}`);
        const trackData = await trackRes.json();
        
        console.log("LRCLIB track data:", JSON.stringify(trackData).substring(0, 500));
        
        const lrcText = trackData.lrcContent || trackData.syncedLyrics || trackData.plainLyrics;
        
        if (lrcText) {
          const timestamps = parseLRC(lrcText);
          
          console.log("LRCLIB found lyrics with", timestamps.length, "timestamps");
          
               if (timestamps.length > 0) {
                 // Transliterate timestamps if needed
                 const transliteratedTimestamps = timestamps.map(item => ({
                   time: item.time,
                   text: transliterateLyrics(item.text)
                 }));
                 
                 const data = { 
                   lyrics: lrcText, 
                   provider: "LRCLIB", 
                   synced: true,
                   timestamps: transliteratedTimestamps
                 };
                 cache.set(key, { data, ts: now });
                 console.log("Returning synced lyrics with first few timestamps:", transliteratedTimestamps.slice(0, 3));
                 return data;
               } else {
                 console.log("No timestamps parsed from LRC text");
               }
        }
      }
    }
  } catch (error) {
    console.error("LRCLIB error:", error);
  }

  // Fallback to AudD
  const token = process.env.AUDD_API_TOKEN;
  if (!token) {
    console.error("No lyrics API configured");
    return { lyrics: null, provider: null, synced: false };
  }

  try {
    const body = new URLSearchParams({ api_token: token, q: `${title} ${artist}`, method: "findLyrics" });
    const res = await fetch("https://api.audd.io/", { method: "POST", body });
    const json = await res.json().catch(() => ({}));
    
    console.log("AudD response for", title, "-", artist);
    
    const result = json?.result;
    if (!result || !Array.isArray(result) || result.length === 0) {
      console.log("No results found from AudD");
      const data = { lyrics: null, provider: "AudD", synced: false };
      cache.set(key, { data, ts: now });
      return data;
    }
    
         const firstResult = result[0];
         const lyrics = firstResult?.lyrics ?? null;
         
         // Transliterate if needed
         const transliteratedLyrics = lyrics ? transliterateLyrics(lyrics) : null;
         
         const data = { lyrics: transliteratedLyrics, provider: "AudD", synced: false };
         cache.set(key, { data, ts: now });
         return data;
  } catch (error) {
    console.error("Error fetching lyrics:", error);
    return { lyrics: null, provider: null, synced: false };
  }
}

function parseLRC(lrcText: string): Array<{ time: number; text: string }> {
  const lines = lrcText.split('\n');
  const timestamps: Array<{ time: number; text: string }> = [];
  
  console.log("Parsing LRC text:", lrcText.substring(0, 200));
  
  for (const line of lines) {
    // Try to match [hh:mm:ss.xx] first (with hours)
    let timeMatch = line.match(/\[(\d{2}):(\d{2}):(\d{2})[:\.](\d{2,3})\]/);
    
    if (timeMatch) {
      // Format with hours
      const hours = parseInt(timeMatch[1]);
      const minutes = parseInt(timeMatch[2]);
      const seconds = parseInt(timeMatch[3]);
      const centiseconds = parseInt(timeMatch[4].padEnd(2, '0'));
      const time = hours * 3600 + minutes * 60 + seconds + (centiseconds / 100);
      
      // Remove all timestamp brackets to get the text
      const text = line.replace(/\[.*?\]/g, '').trim();
      if (text) {
        timestamps.push({ time, text });
      }
    } else {
      // Try to match [mm:ss.xx] (without hours)
      timeMatch = line.match(/\[(\d{2}):(\d{2})[:\.](\d{2,3})\]/);
      
      if (timeMatch) {
        const minutes = parseInt(timeMatch[1]);
        const seconds = parseInt(timeMatch[2]);
        const centiseconds = parseInt(timeMatch[3].padEnd(2, '0'));
        const time = minutes * 60 + seconds + (centiseconds / 100);
        
        // Remove all timestamp brackets to get the text
        const text = line.replace(/\[.*?\]/g, '').trim();
        if (text) {
          timestamps.push({ time, text });
        }
      }
    }
  }
  
  // Sort by time to ensure proper order
  timestamps.sort((a, b) => a.time - b.time);
  
  console.log("Parsed", timestamps.length, "timestamps");
  if (timestamps.length > 0) {
    console.log("First timestamp:", timestamps[0]);
    console.log("Last timestamp:", timestamps[timestamps.length - 1]);
  }
  
  return timestamps;
}

