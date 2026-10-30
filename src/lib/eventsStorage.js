import { supabase, isSupabaseConfigured } from './supabase'

export const DISTRICT_COORDINATES = {
  Ernakulam: { lat: 9.9816, lng: 76.2999, label: 'Kochi / Ernakulam' },
  Kozhikode: { lat: 11.2588, lng: 75.7804, label: 'Calicut / Kozhikode' },
  Thrissur: { lat: 10.5276, lng: 76.2144, label: 'Cultural Capital Thrissur' },
  Malappuram: { lat: 11.0510, lng: 76.0711, label: 'Malappuram' },
  Thiruvananthapuram: { lat: 8.5241, lng: 76.9366, label: 'Trivandrum City' },
  Kannur: { lat: 11.8745, lng: 75.3704, label: 'Kannur' },
  Kottayam: { lat: 9.5916, lng: 76.5222, label: 'Kottayam' },
  Palakkad: { lat: 10.7867, lng: 76.6548, label: 'Palakkad' },
  Kollam: { lat: 8.8932, lng: 76.6141, label: 'Kollam' },
  Alappuzha: { lat: 9.4981, lng: 76.3388, label: 'Alappuzha' },
  Wayanad: { lat: 11.6854, lng: 76.1320, label: 'Wayanad' },
  Idukki: { lat: 9.8500, lng: 76.9700, label: 'Idukki' },
  Pathanamthitta: { lat: 9.2648, lng: 76.7870, label: 'Pathanamthitta' },
  Kasaragod: { lat: 12.4996, lng: 74.9869, label: 'Kasaragod' },
}

export const DEFAULT_SEED_EVENTS = [
  {
    id: 'evt-cc-01',
    title: 'Grand Royal Wedding Reception',
    company_name: 'Al-Saj Conventions & Catering',
    company_contact: '+91 98460 11223',
    event_type: 'wedding',
    event_date: new Date(Date.now() + 86400000 * 1).toISOString().slice(0, 10),
    reporting_time: '16:00:00',
    start_time: '17:30:00',
    end_time: '23:30:00',
    venue_name: 'Cochin Palace Convention Centre',
    place_name: 'Cochin Palace Convention Centre',
    district: 'Ernakulam',
    area: 'Edappally Bypass Road',
    address: 'NH 66, Near Lulu Mall, Edappally, Kochi, Kerala 682024',
    latitude: 10.0261,
    longitude: 76.3082,
    wage_per_boy: 1250,
    boys_needed: 16,
    boys_booked: 11,
    slots_total: 16,
    slots_filled: 11,
    uniform_requirements: ['Black formal shirt', 'Black formal pant', 'Black shoes', 'Clean shave'],
    food_provided: true,
    travel_allowance: true,
    notes: 'Premium wedding reception. VIP guests expected. Punctuality is strictly required.',
    status: 'active',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'evt-cc-02',
    title: 'Arabian Night Corporate Gala Dinner',
    company_name: 'Grand Malabar Events & Banquets',
    company_contact: '+91 97450 44556',
    event_type: 'corporate',
    event_date: new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10),
    reporting_time: '17:00:00',
    start_time: '18:30:00',
    end_time: '23:45:00',
    venue_name: 'Calicut Trade Centre Auditorium',
    place_name: 'Calicut Trade Centre Auditorium',
    district: 'Kozhikode',
    area: 'Beach Road, Calicut',
    address: 'Near Corporation Stadium, Calicut, Kerala 673001',
    latitude: 11.2588,
    longitude: 75.7725,
    wage_per_boy: 1350,
    boys_needed: 12,
    boys_booked: 7,
    slots_total: 12,
    slots_filled: 7,
    uniform_requirements: ['White formal shirt', 'Black formal pant', 'Black shoes', 'Waistcoat'],
    food_provided: true,
    travel_allowance: false,
    notes: 'Dinner buffet serving and VIP table management. English/Malayalam speaking staff preferred.',
    status: 'active',
    created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
  {
    id: 'evt-cc-03',
    title: 'Traditional Mega Sadya Feast',
    company_name: 'Vinayaka Caterers Thrissur',
    company_contact: '+91 94471 88990',
    event_type: 'festival',
    event_date: new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10),
    reporting_time: '08:30:00',
    start_time: '10:00:00',
    end_time: '16:00:00',
    venue_name: 'Thekkinkadu Maidan Mandapam',
    place_name: 'Thekkinkadu Maidan Mandapam',
    district: 'Thrissur',
    area: 'Round South, Thrissur',
    address: 'Swaraj Round, Thrissur, Kerala 680001',
    latitude: 10.5276,
    longitude: 76.2144,
    wage_per_boy: 1150,
    boys_needed: 20,
    boys_booked: 14,
    slots_total: 20,
    slots_filled: 14,
    uniform_requirements: ['White shirt', 'White dhoti / mundu with velcro', 'Neat grooming'],
    food_provided: true,
    travel_allowance: false,
    notes: 'Traditional banana leaf Kerala Sadya service. Fast and courteous service essential.',
    status: 'active',
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: 'evt-cc-04',
    title: 'Kovalam Beachfront Wedding Celebration',
    company_name: 'Capital Royal Caterers & Decorators',
    company_contact: '+91 99462 77881',
    event_type: 'wedding',
    event_date: new Date(Date.now() + 86400000 * 4).toISOString().slice(0, 10),
    reporting_time: '15:30:00',
    start_time: '17:00:00',
    end_time: '23:00:00',
    venue_name: 'Kovalam Beach Resort Banquet Grounds',
    place_name: 'Kovalam Beach Resort Banquet Grounds',
    district: 'Thiruvananthapuram',
    area: 'Kovalam Lighthouse Beach',
    address: 'Kovalam, Thiruvananthapuram, Kerala 695527',
    latitude: 8.4004,
    longitude: 76.9787,
    wage_per_boy: 1400,
    boys_needed: 10,
    boys_booked: 10,
    slots_total: 10,
    slots_filled: 10,
    uniform_requirements: ['Black formal shirt', 'Black formal pant', 'Black shoes'],
    food_provided: true,
    travel_allowance: true,
    notes: 'Slots currently full. Waiting list active.',
    status: 'full',
    created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
  },
  {
    id: 'evt-cc-05',
    title: 'Malabar Nikkah Feast & Welcome Drinks',
    company_name: 'Kottakkal Royale Events',
    company_contact: '+91 97471 22334',
    event_type: 'wedding',
    event_date: new Date(Date.now() + 86400000 * 5).toISOString().slice(0, 10),
    reporting_time: '16:30:00',
    start_time: '18:00:00',
    end_time: '23:30:00',
    venue_name: 'Woodbine Grand Banquet Hall',
    place_name: 'Woodbine Grand Banquet Hall',
    district: 'Malappuram',
    area: 'Kottakkal Byepass',
    address: 'Kottakkal, Malappuram, Kerala 676503',
    latitude: 10.9984,
    longitude: 75.9981,
    wage_per_boy: 1200,
    boys_needed: 14,
    boys_booked: 6,
    slots_total: 14,
    slots_filled: 6,
    uniform_requirements: ['Black formal shirt', 'Black formal pant', 'Black shoes'],
    food_provided: true,
    travel_allowance: false,
    notes: 'Welcome drinks serving and biryani feast service.',
    status: 'active',
    created_at: new Date().toISOString(),
  },
]

// Realistic catering boys with positions for the live Uber radar map
export const SAMPLE_CATERING_BOYS = [
  {
    id: 'b-01',
    worker_code: 'CC-SLV-000619',
    name: 'Muhammed Hashir P',
    phone: '+91 81398 21316',
    whatsapp: '+91 81398 21316',
    tier: 'silver',
    district: 'Ernakulam',
    area: 'Edappally',
    lat: 10.0245,
    lng: 76.3101,
    status: 'en_route', // available, en_route, checked_in
    current_event_id: 'evt-cc-01',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
    rating: 4.9,
    events_completed: 42,
    speed_kmh: 32,
    battery: 88,
  },
  {
    id: 'b-02',
    worker_code: 'CC-SLV-000538',
    name: 'Muhammed Sinan K',
    phone: '+91 81296 97023',
    whatsapp: '+91 81296 97023',
    tier: 'silver',
    district: 'Ernakulam',
    area: 'Kaloor',
    lat: 10.0021,
    lng: 76.2995,
    status: 'available',
    current_event_id: null,
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80',
    rating: 4.8,
    events_completed: 28,
    speed_kmh: 0,
    battery: 95,
  },
  {
    id: 'b-03',
    worker_code: 'CC-DMD-000246',
    name: 'Aswin Babu',
    phone: '+91 62827 55518',
    whatsapp: '+91 62827 55518',
    tier: 'diamond',
    district: 'Ernakulam',
    area: 'Aluva',
    lat: 10.0385,
    lng: 76.3198,
    status: 'checked_in',
    current_event_id: 'evt-cc-01',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80',
    rating: 5.0,
    events_completed: 67,
    speed_kmh: 0,
    battery: 76,
  },
  {
    id: 'b-04',
    worker_code: 'CC-GLD-000307',
    name: 'Muhammed Sinan P K',
    phone: '+91 97440 41593',
    whatsapp: '+91 97440 41593',
    tier: 'golden',
    district: 'Kozhikode',
    area: 'Mavoor Road',
    lat: 11.2612,
    lng: 75.7820,
    status: 'en_route',
    current_event_id: 'evt-cc-02',
    avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=120&q=80',
    rating: 4.9,
    events_completed: 53,
    speed_kmh: 28,
    battery: 82,
  },
  {
    id: 'b-05',
    worker_code: 'CC-SLV-000212',
    name: 'Muhummad Arshad',
    phone: '+91 80754 04090',
    whatsapp: '+91 80754 04090',
    tier: 'silver',
    district: 'Kozhikode',
    area: 'Beach Road',
    lat: 11.2540,
    lng: 75.7690,
    status: 'checked_in',
    current_event_id: 'evt-cc-02',
    avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=120&q=80',
    rating: 4.7,
    events_completed: 19,
    speed_kmh: 0,
    battery: 64,
  },
  {
    id: 'b-06',
    worker_code: 'CC-SLV-000201',
    name: 'Sabin Mishab',
    phone: '+91 73565 58059',
    whatsapp: '+91 73565 58059',
    tier: 'silver',
    district: 'Thrissur',
    area: 'East Fort',
    lat: 10.5250,
    lng: 76.2210,
    status: 'available',
    current_event_id: null,
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=120&q=80',
    rating: 4.8,
    events_completed: 31,
    speed_kmh: 0,
    battery: 91,
  },
  {
    id: 'b-07',
    worker_code: 'CC-DMD-000108',
    name: 'Vishnu Dev',
    phone: '+91 94000 88221',
    whatsapp: '+91 94000 88221',
    tier: 'diamond',
    district: 'Thrissur',
    area: 'Swaraj Round',
    lat: 10.5290,
    lng: 76.2120,
    status: 'en_route',
    current_event_id: 'evt-cc-03',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=120&q=80',
    rating: 5.0,
    events_completed: 85,
    speed_kmh: 22,
    battery: 70,
  },
  {
    id: 'b-08',
    worker_code: 'CC-SLV-000412',
    name: 'Rahul K P',
    phone: '+91 96333 45672',
    whatsapp: '+91 96333 45672',
    tier: 'silver',
    district: 'Thiruvananthapuram',
    area: 'Pattom',
    lat: 8.5290,
    lng: 76.9380,
    status: 'available',
    current_event_id: null,
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=120&q=80',
    rating: 4.9,
    events_completed: 36,
    speed_kmh: 0,
    battery: 84,
  },
]

const STORAGE_KEY = 'catercrew_custom_events'

/**
 * Retrieve all active events unified from localStorage and Supabase.
 * If none stored yet, populates default seeds.
 */
export function getStoredEvents() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
      }
    }
  } catch (err) {
    console.warn('Error reading stored events:', err)
  }

  // First time initialization: populate seed events
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SEED_EVENTS))
  } catch (err) {
    console.warn('Error seeding events in storage:', err)
  }
  return DEFAULT_SEED_EVENTS
}

/**
 * Save or update an event.
 */
export async function saveEvent(event) {
  const current = getStoredEvents()
  const eventId = event.id || `evt-${Date.now()}`

  // Ensure district lat/lng if missing
  let lat = event.latitude ? parseFloat(event.latitude) : null
  let lng = event.longitude ? parseFloat(event.longitude) : null

  if ((!lat || !lng) && event.district && DISTRICT_COORDINATES[event.district]) {
    lat = DISTRICT_COORDINATES[event.district].lat + (Math.random() - 0.5) * 0.04
    lng = DISTRICT_COORDINATES[event.district].lng + (Math.random() - 0.5) * 0.04
  }

  const updatedEvent = {
    ...event,
    id: String(eventId),
    latitude: lat,
    longitude: lng,
    status: event.status || 'active',
    slots_total: parseInt(event.slots_total ?? event.boys_needed, 10) || 10,
    slots_filled: parseInt(event.slots_filled ?? event.boys_booked, 10) || 0,
    boys_needed: parseInt(event.slots_total ?? event.boys_needed, 10) || 10,
    boys_booked: parseInt(event.slots_filled ?? event.boys_booked, 10) || 0,
    created_at: event.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const existingIndex = current.findIndex((e) => String(e.id) === String(eventId))
  let newList = []
  if (existingIndex >= 0) {
    newList = [...current]
    newList[existingIndex] = updatedEvent
  } else {
    newList = [updatedEvent, ...current]
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(newList))

  // Attempt async sync to Supabase if available
  if (isSupabaseConfigured) {
    try {
      await supabase.from('events').upsert({
        id: updatedEvent.id,
        title: updatedEvent.title,
        event_type: updatedEvent.event_type || 'wedding',
        event_date: updatedEvent.event_date,
        reporting_time: updatedEvent.reporting_time || '16:00:00',
        start_time: updatedEvent.start_time || '17:00:00',
        end_time: updatedEvent.end_time || '23:00:00',
        place_name: updatedEvent.place_name || updatedEvent.venue_name || 'Auditorium',
        district: updatedEvent.district || 'Ernakulam',
        area: updatedEvent.area || '',
        address: updatedEvent.address || '',
        latitude: updatedEvent.latitude,
        longitude: updatedEvent.longitude,
        wage_per_boy: updatedEvent.wage_per_boy,
        slots_total: updatedEvent.slots_total,
        status: updatedEvent.status,
      })
    } catch (dbErr) {
      console.warn('Notice: Background database sync for event failed, local storage preserved:', dbErr)
    }
  }

  window.dispatchEvent(new Event('catercrew_events_updated'))
  window.dispatchEvent(new Event('storage'))
  return updatedEvent
}

/**
 * Delete an event.
 */
export async function deleteEvent(eventId) {
  const current = getStoredEvents()
  const filtered = current.filter((e) => String(e.id) !== String(eventId))
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))

  if (isSupabaseConfigured) {
    try {
      await supabase.from('events').delete().eq('id', eventId)
    } catch (err) {
      console.warn('Supabase delete error:', err)
    }
  }

  window.dispatchEvent(new Event('catercrew_events_updated'))
  window.dispatchEvent(new Event('storage'))
  return filtered
}

/**
 * Update single event status (active, full, completed, cancelled)
 */
export async function updateEventStatus(eventId, newStatus) {
  const current = getStoredEvents()
  const target = current.find((e) => String(e.id) === String(eventId))
  if (target) {
    return saveEvent({ ...target, status: newStatus })
  }
}

/**
 * Calculate Great Circle distance in km between two GPS coordinates
 */
export function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0
  const R = 6371 // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(R * c * 10) / 10
}

/**
 * Calculate estimated travel time in minutes based on distance
 */
export function calculateEtaMinutes(distanceKm, averageSpeedKmh = 35) {
  if (!distanceKm) return 5
  const minutes = Math.round((distanceKm / averageSpeedKmh) * 60)
  return Math.max(5, minutes)
}
