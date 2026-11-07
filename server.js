
const express = require("express");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.YOUTUBE_API_KEY;

const cache = new Map();

async function searchYouTube(query) {
  if (!API_KEY) {
    throw new Error("YouTube API key is not configured");
  }

  const cached = cache.get(query);

  if (cached && Date.now() - cached.time < 10 * 60 * 1000) {
    return cached.data;
  }

  const params = new URLSearchParams({
    part: "snippet",
    q: query,
    type: "video",
    maxResults: "10",
    regionCode: "IN",
    key: API_KEY
  });

  const response = await fetch(
    "https://www.googleapis.com/youtube/v3/search?" + params
  );

  if (!response.ok) {
    throw new Error("YouTube API request failed");
  }

  const json = await response.json();

  const results = (json.items || []).map(item => ({
    id: item.id.videoId,
    title: item.snippet.title,
    channel: item.snippet.channelTitle,
    thumbnail: item.snippet.thumbnails.high?.url,
    url: "https://www.youtube.com/watch?v=" + item.id.videoId
  }));

  cache.set(query, {
    time: Date.now(),
    data: results
  });

  return results;
}

app.get("/health", (req, res) => {
  res.json({ status: "YT India Server Running" });
});

app.get("/api/search", async (req, res) => {
  try {
    const query = String(req.query.q || "").trim();

    if (!query || query.length > 100) {
      return res.status(400).json({
        error: "Valid search query required"
      });
    }

    const results = await searchYouTube(query);
    res.json({ results });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/home", async (req, res) => {
  try {
    const [songs, movies] = await Promise.all([
      searchYouTube("Hindi Songs"),
      searchYouTube("Hindi Movie Trailers")
    ]);

    res.json({ songs, movies });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log("YT India server running on port " + PORT);
});
