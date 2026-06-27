// API Wrapper for ComercioTech React Frontend

export async function apiCall(endpoint, method = 'GET', body = null, currentUser = null) {
  const headers = {
    'Content-Type': 'application/json'
  };
  
  if (currentUser) {
    headers['X-User-Role'] = currentUser.rol;
    headers['X-User-Username'] = currentUser.username;
    headers['X-User-Name'] = currentUser.nombre;
  }
  
  const options = { method, headers };
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  try {
    const response = await fetch(endpoint, options);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || `Error del servidor: ${response.status}`);
    }
    return data;
  } catch (error) {
    console.error(`API Call failed (${endpoint}):`, error);
    throw error;
  }
}
