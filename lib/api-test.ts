// API Test Utility
const TRACKING_API_ENDPOINT = "http://myyachtservices.itwservices.local:8020"

export async function testApiConnection() {
  console.log("🔍 Testing API connection to:", TRACKING_API_ENDPOINT)
  
  // Test 1: Basic connectivity
  try {
    const response = await fetch(TRACKING_API_ENDPOINT, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    console.log("✅ Server is reachable!")
    console.log("Status:", response.status)
    console.log("Headers:", Object.fromEntries(response.headers.entries()))
    
    if (response.ok) {
      const data = await response.text()
      console.log("Response data:", data)
    }
  } catch (error) {
    console.error("❌ Server is not reachable:", error)
    return false
  }
  
  // Test 2: Common API endpoints (including the correct one from tracking engine)
  const endpoints = [
    '/Track/GetItems/', // The correct endpoint from tracking engine
    '/',
    '/api',
    '/api/v1',
    '/health',
    '/status',
    '/info',
    '/docs',
    '/swagger',
    '/openapi',
    '/tracking',
    '/wristbands',
    '/guests',
    '/devices',
    '/locations',
    '/positions',
    '/data',
    '/live',
    '/realtime',
  ]
  
  console.log("🔍 Testing common endpoints...")
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${TRACKING_API_ENDPOINT}${endpoint}`, {
        method: endpoint === '/Track/GetItems/' ? 'POST' : 'GET', // Use POST for the tracking endpoint
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (response.ok) {
        console.log(`✅ Found working endpoint: ${endpoint}`)
        try {
          const data = await response.json()
          console.log(`📡 Data from ${endpoint}:`, data)
        } catch {
          const text = await response.text()
          console.log(`📡 Text from ${endpoint}:`, text)
        }
      } else {
        console.log(`❌ ${endpoint}: ${response.status} ${response.statusText}`)
      }
    } catch (error) {
      console.log(`❌ ${endpoint}: Network error`)
    }
  }
  
  // Test 3: Different HTTP methods
  console.log("🔍 Testing different HTTP methods...")
  const methods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
  
  for (const method of methods) {
    try {
      const response = await fetch(TRACKING_API_ENDPOINT, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      console.log(`${method}: ${response.status} ${response.statusText}`)
    } catch (error) {
      console.log(`${method}: Network error`)
    }
  }
  
  return true
}

// Test CORS and preflight
export async function testCors() {
  console.log("🔍 Testing CORS...")
  
  try {
    const response = await fetch(TRACKING_API_ENDPOINT, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:3004',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Content-Type',
      },
    })
    
    console.log("CORS preflight response:", response.status)
    console.log("CORS headers:", Object.fromEntries(response.headers.entries()))
  } catch (error) {
    console.error("CORS test failed:", error)
  }
}
