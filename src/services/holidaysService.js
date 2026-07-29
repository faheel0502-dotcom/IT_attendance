import api from '../lib/api'

export async function fetchHolidays() {
  const { data } = await api.get('/holidays')
  return data
}

export async function addHoliday({ date, description }) {
  const { data } = await api.post('/holidays', { date, description })
  return data
}

export async function deleteHoliday(id) {
  await api.delete(`/holidays/${id}`)
}
