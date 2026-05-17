export async function fetchJson(endpoint) {
  const response = await fetch(endpoint)
  if (!response.ok) {
    throw new Error(`Error fetching ${endpoint}: ${response.statusText}`)
  }
  return response.json()
}

// Agrega aquí las funciones de acceso a datos específicas de tu API.
// Ejemplo:
// export function fetchWindField() {
//   return fetchJson('/api/wind-field')
// }
