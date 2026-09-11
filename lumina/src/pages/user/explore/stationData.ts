import type { LucideIcon } from 'lucide-react'
import {
  Accessibility,
  ArrowUpDown,
  Banknote,
  Church,
  MoveVertical,
  ShoppingBasket,
  Sofa,
} from 'lucide-react'

// Daftar stasiun kini dipakai sisi user dan admin, jadi tinggal di src/data.
export {
  activeStationId,
  calibrationCorridor,
  stations,
} from '../../../data/stations'
export type { LatLng, Station } from '../../../data/stations'

export type Amenity = {
  id: string
  label: string
  icon: LucideIcon
  wide?: boolean
}

export const amenities: Amenity[] = [
  { id: 'restroom', label: 'Restroom', icon: Accessibility },
  { id: 'prayer-room', label: 'Prayer Room', icon: Church },
  { id: 'atm-center', label: 'ATM Center', icon: Banknote },
  { id: 'elevator', label: 'Elevator', icon: MoveVertical },
  { id: 'escalator', label: 'Escalator', icon: ArrowUpDown },
  { id: 'convenience-store', label: 'Convenience Store', icon: ShoppingBasket },
  { id: 'waiting-area', label: 'Waiting Area', icon: Sofa, wide: true },
]

export type AmenitySpot = {
  name: string
  detail: string
  distance: string
  nearest?: boolean
}

// Data contoh — nanti diganti hasil query dari backend/MapID.
export function amenitySpots(amenity: Amenity): AmenitySpot[] {
  const base = amenity.label
  return [
    {
      name: `Main Hall ${base}`,
      detail: 'Near the South Entrance',
      distance: '45 m',
      nearest: true,
    },
    {
      name: `Platform 3-4 ${base}`,
      detail: 'Central platform area',
      distance: '70 m',
    },
    {
      name: `Transit Area ${base}`,
      detail: 'Level 2, near the connecting area',
      distance: '110 m',
    },
  ]
}

export const nearbyCategories = [
  'All',
  'Food & Drinks',
  'ATM',
  'Healthcare',
] as const

export type NearbyCategory = (typeof nearbyCategories)[number]

export type NearbyPlace = {
  name: string
  type: string
  distance: string
  category: Exclude<NearbyCategory, 'All'> | 'Transport'
}

export const nearbyPlaces: NearbyPlace[] = [
  {
    name: 'Starbucks Manggarai',
    type: 'Cafe',
    distance: '120 m',
    category: 'Food & Drinks',
  },
  {
    name: 'Halte TransJakarta',
    type: 'Bus Stop',
    distance: '80 m',
    category: 'Transport',
  },
  {
    name: 'ATM BCA Manggarai',
    type: 'ATM',
    distance: '95 m',
    category: 'ATM',
  },
  {
    name: 'Klinik Pratama Tebet',
    type: 'Clinic',
    distance: '240 m',
    category: 'Healthcare',
  },
  {
    name: 'Warung Nasi Manggarai',
    type: 'Restaurant',
    distance: '150 m',
    category: 'Food & Drinks',
  },
]
