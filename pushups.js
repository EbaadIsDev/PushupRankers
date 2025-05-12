// Import required functions and constants from calculate-rank
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

// Get difficulty modifier
function getDifficultyModifier(difficultyLevel) {
  const DIFFICULTY_LEVELS = [
    { value: 'standard', label: 'Standard', modifier: 1.0 },
    { value: 'knee', label: 'Knee Pushups', modifier: 0.5 },
    { value: 'incline', label: 'Incline', modifier: 0.7 },
    { value: 'decline', label: 'Decline', modifier: 1.3 },
    { value: 'diamond', label: 'Diamond', modifier: 1.5 },
    { value: 'oneArm', label: 'One Arm', modifier: 2.0 },
  ];
  
  const difficulty = DIFFICULTY_LEVELS.find(d => d.value === difficultyLevel);
  return difficulty ? difficulty.modifier : 1.0;
}

exports.handler = async function(event, context) {
  // Only allow POST requests
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ success: false, message: "Method not allowed" })
    };
  }
  
  try {
    // Parse the request body
    const data = JSON.parse(event.body);
    
    // Validate required fields
    if (!data.count || !data.difficultyLevel) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, message: "Missing required fields" })
      };
    }
    
    // Get user data from the request body (or initialize if not provided)
    const userData = data.userData || {
      totalPushups: 0,
      maxSet: 0,
      currentRankTier: 'bronze',
      currentRankLevel: 1,
      currentProgress: 0,
      history: [],
      settings: {
        soundEnabled: true,
        notificationsEnabled: true,
        animationsEnabled: true,
        darkModeEnabled: true
      }
    };
    
    // Calculate the effective count based on difficulty
    const modifier = getDifficultyModifier(data.difficultyLevel);
    const effectiveCount = Math.round(data.count * modifier);
    
    // Update the user data
    const oldRankTier = userData.currentRankTier;
    const oldRankLevel = userData.currentRankLevel;
    
    // Update the user data
    userData.totalPushups += effectiveCount;
    userData.maxSet = Math.max(userData.maxSet, effectiveCount);
    
    // Add to history
    userData.history.unshift({
      date: new Date().toISOString(),
      count: effectiveCount,
      rawCount: data.count,
      difficultyLevel: data.difficultyLevel
    });
    
    // Calculate the new rank
    const rankInfo = calculateRank(userData.totalPushups, userData.maxSet);
    userData.currentRankTier = rankInfo.tier;
    userData.currentRankLevel = rankInfo.level;
    userData.currentProgress = rankInfo.progress;
    
    // Determine if the user ranked up
    const rankedUp = 
      oldRankTier !== userData.currentRankTier || 
      oldRankLevel !== userData.currentRankLevel;
    
    // Return the updated user data and rank information
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        userData,
        effectiveCount,
        rankedUp
      })
    };
  } catch (error) {
    console.error('Error processing pushup data:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, message: "Internal server error" })
    };
  }
};