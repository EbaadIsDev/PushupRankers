exports.handler = async function(event, context) {
  // Only allow GET requests
  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      body: JSON.stringify({ success: false, message: "Method not allowed" })
    };
  }

  // Return the anonymous user data template
  return {
    statusCode: 200,
    body: JSON.stringify({
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
    })
  };
};