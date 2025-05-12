// Import rank calculation logic
const RANK_THRESHOLDS = {
  BRONZE_1: 0,
  BRONZE_2: 10,
  BRONZE_3: 25,
  SILVER_1: 50,
  SILVER_2: 75,
  GOLD_1: 100,
  GOLD_2: 150,
  PLATINUM_1: 200,
  PLATINUM_2: 250,
  DIAMOND: 300,
};

// Calculate rank from pushup count
function calculateRank(totalPushups, maxSet) {
  // Use the max between total pushups and max set to determine rank
  const count = Math.max(totalPushups, maxSet);
  
  // Default to Bronze 1
  let tier = 'bronze';
  let level = 1;
  let progress = 0;
  let nextThreshold = RANK_THRESHOLDS.BRONZE_2;
  
  if (count < RANK_THRESHOLDS.BRONZE_2) {
    // Beginner: 0-9 pushups
    tier = 'bronze';
    level = 1;
    progress = count * 10; // 0-90% within Bronze level 1
    nextThreshold = RANK_THRESHOLDS.BRONZE_2;
  } else if (count < RANK_THRESHOLDS.BRONZE_3) {
    // Bronze level 2: 10-24 pushups
    tier = 'bronze';
    level = 2;
    progress = (count - RANK_THRESHOLDS.BRONZE_2) * (100 / (RANK_THRESHOLDS.BRONZE_3 - RANK_THRESHOLDS.BRONZE_2));
    nextThreshold = RANK_THRESHOLDS.BRONZE_3;
  } else if (count < RANK_THRESHOLDS.SILVER_1) {
    // Bronze level 3: 25-49 pushups
    tier = 'bronze';
    level = 3;
    progress = (count - RANK_THRESHOLDS.BRONZE_3) * (100 / (RANK_THRESHOLDS.SILVER_1 - RANK_THRESHOLDS.BRONZE_3));
    nextThreshold = RANK_THRESHOLDS.SILVER_1;
  } else if (count < RANK_THRESHOLDS.SILVER_2) {
    // Silver level 1: 50-74 pushups
    tier = 'silver';
    level = 1;
    progress = (count - RANK_THRESHOLDS.SILVER_1) * (100 / (RANK_THRESHOLDS.SILVER_2 - RANK_THRESHOLDS.SILVER_1));
    nextThreshold = RANK_THRESHOLDS.SILVER_2;
  } else if (count < RANK_THRESHOLDS.GOLD_1) {
    // Silver level 2: 75-99 pushups
    tier = 'silver';
    level = 2;
    progress = (count - RANK_THRESHOLDS.SILVER_2) * (100 / (RANK_THRESHOLDS.GOLD_1 - RANK_THRESHOLDS.SILVER_2));
    nextThreshold = RANK_THRESHOLDS.GOLD_1;
  } else if (count < RANK_THRESHOLDS.GOLD_2) {
    // Gold level 1: 100-149 pushups
    tier = 'gold';
    level = 1;
    progress = (count - RANK_THRESHOLDS.GOLD_1) * (100 / (RANK_THRESHOLDS.GOLD_2 - RANK_THRESHOLDS.GOLD_1));
    nextThreshold = RANK_THRESHOLDS.GOLD_2;
  } else if (count < RANK_THRESHOLDS.PLATINUM_1) {
    // Gold level 2: 150-199 pushups
    tier = 'gold';
    level = 2;
    progress = (count - RANK_THRESHOLDS.GOLD_2) * (100 / (RANK_THRESHOLDS.PLATINUM_1 - RANK_THRESHOLDS.GOLD_2));
    nextThreshold = RANK_THRESHOLDS.PLATINUM_1;
  } else if (count < RANK_THRESHOLDS.PLATINUM_2) {
    // Platinum level 1: 200-249 pushups
    tier = 'platinum';
    level = 1;
    progress = (count - RANK_THRESHOLDS.PLATINUM_1) * (100 / (RANK_THRESHOLDS.PLATINUM_2 - RANK_THRESHOLDS.PLATINUM_1));
    nextThreshold = RANK_THRESHOLDS.PLATINUM_2;
  } else if (count < RANK_THRESHOLDS.DIAMOND) {
    // Platinum level 2: 250-299 pushups
    tier = 'platinum';
    level = 2;
    progress = (count - RANK_THRESHOLDS.PLATINUM_2) * (100 / (RANK_THRESHOLDS.DIAMOND - RANK_THRESHOLDS.PLATINUM_2));
    nextThreshold = RANK_THRESHOLDS.DIAMOND;
  } else {
    // Diamond tier: 300+ pushups
    tier = 'diamond';
    level = Math.min(5, 1 + Math.floor((count - RANK_THRESHOLDS.DIAMOND) / 100));
    progress = ((count - RANK_THRESHOLDS.DIAMOND) % 100) * (100 / 100);
    nextThreshold = RANK_THRESHOLDS.DIAMOND + (level * 100);
    
    // Cap at Diamond level 5
    if (level === 5) {
      progress = 100;
      nextThreshold = null;
    }
  }
  
  return {
    tier,
    level,
    progress: Math.min(100, Math.floor(progress)),
    nextThreshold
  };
}

// Format rank name
function formatRankName(tier, level) {
  return `${tier.charAt(0).toUpperCase() + tier.slice(1)} Level ${level}`;
}

exports.handler = async function(event, context) {
  // Only allow GET requests
  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      body: JSON.stringify({ success: false, message: "Method not allowed" })
    };
  }

  // Parse the query parameters
  const params = event.queryStringParameters;
  const totalPushups = parseInt(params.totalPushups) || 0;
  const maxSet = parseInt(params.maxSet) || 0;

  // Calculate the rank
  const rankInfo = calculateRank(totalPushups, maxSet);
  
  // Return the rank info
  return {
    statusCode: 200,
    body: JSON.stringify({
      success: true,
      ...rankInfo,
      formattedRank: formatRankName(rankInfo.tier, rankInfo.level)
    })
  };
};