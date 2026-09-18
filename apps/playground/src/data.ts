/** Static demo data. No backend, no persistence. */

export interface Coffee {
  id: string
  name: string
  origin: string
  roast: 'Light' | 'Medium' | 'Dark'
  notes: string[]
  priceSek: number
}

export interface Order {
  id: string
  date: string
  items: string[]
  totalSek: number
  status: 'Delivered' | 'Shipped' | 'Processing'
}

export interface Tasting {
  id: string
  coffeeId: string
  date: string
  rating: 1 | 2 | 3 | 4 | 5
  comment: string
}

export const coffees: Coffee[] = [
  {
    id: 'kiambu',
    name: 'Kiambu AA',
    origin: 'Kenya',
    roast: 'Light',
    notes: ['blackcurrant', 'grapefruit'],
    priceSek: 159,
  },
  {
    id: 'huila',
    name: 'Huila Castillo',
    origin: 'Colombia',
    roast: 'Medium',
    notes: ['caramel', 'red apple'],
    priceSek: 139,
  },
  {
    id: 'yirgacheffe',
    name: 'Yirgacheffe Kochere',
    origin: 'Ethiopia',
    roast: 'Light',
    notes: ['jasmine', 'bergamot'],
    priceSek: 169,
  },
  {
    id: 'cerrado',
    name: 'Cerrado Mineiro',
    origin: 'Brazil',
    roast: 'Dark',
    notes: ['cocoa', 'hazelnut'],
    priceSek: 119,
  },
]

export const orders: Order[] = [
  {
    id: 'FK-10421',
    date: '2026-09-01',
    items: ['Kiambu AA', 'Huila Castillo'],
    totalSek: 298,
    status: 'Delivered',
  },
  {
    id: 'FK-10588',
    date: '2026-09-15',
    items: ['Yirgacheffe Kochere'],
    totalSek: 169,
    status: 'Shipped',
  },
  {
    id: 'FK-10602',
    date: '2026-09-17',
    items: ['Cerrado Mineiro'],
    totalSek: 119,
    status: 'Processing',
  },
]

export const tastings: Tasting[] = [
  {
    id: 't1',
    coffeeId: 'kiambu',
    date: '2026-09-04',
    rating: 5,
    comment: 'Bright and juicy as a pour-over.',
  },
  {
    id: 't2',
    coffeeId: 'huila',
    date: '2026-09-08',
    rating: 4,
    comment: 'Sweet, easy morning cup.',
  },
]

export const profile = {
  name: 'Alex Lindqvist',
  email: 'alex@example.com',
  plan: 'Two bags / month',
  grind: 'Whole bean',
  address: 'Storgatan 12, 111 22 Stockholm',
}
