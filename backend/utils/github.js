/**
 * GitHub Profile Integration and Scoring
 * Fetches public GitHub data and calculates student score
 */

// Validate GitHub URL format and extract username
export const extractGitHubUsername = (gitHubUrl) => {
  if (!gitHubUrl || typeof gitHubUrl !== 'string') {
    return null;
  }

  const trimmed = gitHubUrl.trim();
  
  // Handle various GitHub URL formats
  const patterns = [
    /github\.com\/([a-zA-Z0-9_-]+)\/?$/,      // https://github.com/username
    /github\.com\/([a-zA-Z0-9_-]+)\/.*$/,     // https://github.com/username/repo
    /^([a-zA-Z0-9_-]+)$/,                      // Just username
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
};

// Validate GitHub URL format
export const isValidGitHubUrl = (url) => {
  if (!url || typeof url !== 'string') {
    return false;
  }

  const trimmed = url.trim();
  
  // Check if it's a valid GitHub URL or username
  return (
    trimmed.startsWith('https://github.com/') ||
    /^[a-zA-Z0-9_-]+$/.test(trimmed)
  );
};

// Fetch GitHub user data from public API
export const fetchGitHubUserData = async (username) => {
  if (!username || typeof username !== 'string') {
    throw new Error('Invalid GitHub username');
  }

  try {
    const response = await fetch(`https://api.github.com/users/${username}`, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        // Optional: Add token for higher rate limits
        // Authorization: `token ${process.env.GITHUB_API_TOKEN}`,
      },
    });

    if (response.status === 404) {
      throw new Error(`GitHub user "${username}" not found`);
    }

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    return {
      username: data.login,
      name: data.name,
      bio: data.bio,
      publicRepos: data.public_repos || 0,
      publicGists: data.public_gists || 0,
      updatedAt: data.updated_at,
      profileUrl: data.html_url,
      avatarUrl: data.avatar_url,
    };
  } catch (error) {
    throw new Error(`Failed to fetch GitHub data: ${error.message}`);
  }
};

// Calculate repository score (max 2 points)
export const calculateRepositoryScore = (repoCount) => {
  const count = Number(repoCount) || 0;
  
  if (count >= 20) return 2.0;
  if (count >= 10) return 1.5;
  if (count >= 5) return 1.0;
  return 0.5;
};

// Calculate activity score (max 3 points)
// Currently based on recent update time (for future: could integrate with commits API)
export const calculateActivityScore = (updatedAt) => {
  if (!updatedAt) {
    return 1.0; // Default low activity if no data
  }

  try {
    const lastUpdate = new Date(updatedAt);
    const now = new Date();
    const daysInactive = (now - lastUpdate) / (1000 * 60 * 60 * 24);

    // Highly active (updated in last 7 days)
    if (daysInactive <= 7) return 3.0;
    
    // Moderate activity (updated in last 30 days)
    if (daysInactive <= 30) return 2.0;
    
    // Low activity (updated more than 30 days ago)
    return 1.0;
  } catch {
    return 1.0; // Default to low activity on parse error
  }
};

// Calculate total GitHub score (max 5 points)
export const calculateGitHubScore = (gitHubData) => {
  if (!gitHubData) {
    return null;
  }

  const repoScore = calculateRepositoryScore(gitHubData.publicRepos);
  const activityScore = calculateActivityScore(gitHubData.updatedAt);

  const totalScore = Math.min(5.0, repoScore + activityScore);

  return {
    totalScore: parseFloat(totalScore.toFixed(2)),
    repoScore: parseFloat(repoScore.toFixed(2)),
    activityScore: parseFloat(activityScore.toFixed(2)),
    repoCount: gitHubData.publicRepos,
    lastUpdated: gitHubData.updatedAt,
  };
};

// Main function to get or update GitHub score for a student
export const getGitHubScore = async (gitHubUrl) => {
  // Validate and extract username
  if (!isValidGitHubUrl(gitHubUrl)) {
    throw new Error('Invalid GitHub URL. Please provide a valid GitHub profile URL or username.');
  }

  const username = extractGitHubUsername(gitHubUrl);
  if (!username) {
    throw new Error('Could not extract GitHub username from provided URL.');
  }

  // Fetch GitHub data
  const gitHubData = await fetchGitHubUserData(username);

  // Calculate score
  const scoreData = calculateGitHubScore(gitHubData);

  return {
    username: gitHubData.username,
    gitHubUrl: gitHubData.profileUrl,
    avatarUrl: gitHubData.avatarUrl,
    ...scoreData,
  };
};
