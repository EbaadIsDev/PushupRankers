// This template can be used as a starting point for creating new Netlify functions

exports.handler = async function(event, context) {
  // Set up CORS for cross-origin requests
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    // Extract request information
    const path = event.path;
    const httpMethod = event.httpMethod;
    const queryStringParameters = event.queryStringParameters || {};
    const body = event.body ? JSON.parse(event.body) : {};

    // Sample logic for different HTTP methods
    let responseBody = {};
    let statusCode = 200;

    switch (httpMethod) {
      case 'GET':
        responseBody = {
          success: true,
          message: 'GET request successful',
          data: {
            timestamp: new Date().toISOString(),
            query: queryStringParameters
          }
        };
        break;
        
      case 'POST':
        responseBody = {
          success: true,
          message: 'POST request successful',
          data: {
            timestamp: new Date().toISOString(),
            receivedData: body
          }
        };
        break;
        
      default:
        statusCode = 405;
        responseBody = {
          success: false,
          message: 'Method not allowed'
        };
    }

    // Return the response
    return {
      statusCode,
      headers,
      body: JSON.stringify(responseBody)
    };
    
  } catch (error) {
    console.error('Function error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        message: 'Internal server error',
        error: error.message
      })
    };
  }
};