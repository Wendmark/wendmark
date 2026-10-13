/** Static demo data. No backend, no persistence. */

export type Roast = 'Light' | 'Medium' | 'Dark'

export interface Coffee {
  id: string
  name: string
  origin: string
  roast: Roast
  notes: string[]
  /** Price of the smallest bag, in kronor. */
  priceSek: number
  /** The bag's colour in the illustrations. */
  color: string
  description: string
  rating: number
  reviews: number
  badge?: 'New' | 'Bestseller' | 'Limited'
  decaf?: boolean
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
    color: '#ff5d73',
    description: 'Big, juicy and bright. A pour-over favourite from the hills north of Nairobi.',
    rating: 4.8,
    reviews: 214,
    badge: 'Bestseller',
  },
  {
    id: 'huila',
    name: 'Huila Castillo',
    origin: 'Colombia',
    roast: 'Medium',
    notes: ['caramel', 'red apple'],
    priceSek: 139,
    color: '#ffb703',
    description: 'Sweet and easy-going. The cup we reach for first thing in the morning.',
    rating: 4.6,
    reviews: 188,
  },
  {
    id: 'yirgacheffe',
    name: 'Yirgacheffe Kochere',
    origin: 'Ethiopia',
    roast: 'Light',
    notes: ['jasmine', 'bergamot'],
    priceSek: 169,
    color: '#7b61ff',
    description: 'Floral and tea-like, with a long citrus finish. Washed at the Kochere station.',
    rating: 4.9,
    reviews: 156,
    badge: 'Limited',
  },
  {
    id: 'cerrado',
    name: 'Cerrado Mineiro',
    origin: 'Brazil',
    roast: 'Dark',
    notes: ['cocoa', 'hazelnut'],
    priceSek: 119,
    color: '#ff8c42',
    description: 'Chocolatey and round. Made for espresso, and forgiving in a moka pot.',
    rating: 4.4,
    reviews: 302,
  },
  {
    id: 'antigua',
    name: 'Antigua Pastoral',
    origin: 'Guatemala',
    roast: 'Medium',
    notes: ['milk chocolate', 'orange'],
    priceSek: 145,
    color: '#2ec4b6',
    description: 'Grown between three volcanoes. Balanced, with a little orange-peel zing.',
    rating: 4.5,
    reviews: 97,
  },
  {
    id: 'tarrazu',
    name: 'Tarrazú Honey',
    origin: 'Costa Rica',
    roast: 'Light',
    notes: ['honey', 'peach'],
    priceSek: 155,
    color: '#ffd23f',
    description: 'Honey-processed, so some of the fruit stays on while it dries. Silky and sweet.',
    rating: 4.7,
    reviews: 74,
    badge: 'New',
  },
  {
    id: 'sumatra',
    name: 'Sumatra Gayo',
    origin: 'Indonesia',
    roast: 'Dark',
    notes: ['cedar', 'dark chocolate'],
    priceSek: 135,
    color: '#3a86ff',
    description: 'Earthy, heavy and low in acidity. Lovely with milk.',
    rating: 4.3,
    reviews: 121,
  },
  {
    id: 'nyamasheke',
    name: 'Nyamasheke',
    origin: 'Rwanda',
    roast: 'Light',
    notes: ['red currant', 'hibiscus'],
    priceSek: 165,
    color: '#ff006e',
    description: 'From the shores of Lake Kivu. Tart, bright and very easy to like.',
    rating: 4.8,
    reviews: 63,
    badge: 'New',
  },
  {
    id: 'cajamarca',
    name: 'Cajamarca',
    origin: 'Peru',
    roast: 'Medium',
    notes: ['almond', 'brown sugar'],
    priceSek: 129,
    color: '#06d6a0',
    description: 'Nutty and mellow, from a cooperative of 400 small farms in the Andes.',
    rating: 4.5,
    reviews: 88,
  },
  {
    id: 'house',
    name: 'Fika House Blend',
    origin: 'Brazil & Ethiopia',
    roast: 'Medium',
    notes: ['chocolate', 'berries'],
    priceSek: 109,
    color: '#fb5607',
    description: 'Our everyday blend. Chocolate from Brazil, a splash of berry from Ethiopia.',
    rating: 4.6,
    reviews: 541,
    badge: 'Bestseller',
  },
  {
    id: 'decaf',
    name: 'Swiss Water Decaf',
    origin: 'Colombia',
    roast: 'Medium',
    notes: ['toffee', 'plum'],
    priceSek: 139,
    color: '#8338ec',
    description: 'All the flavour, none of the jitters. Decaffeinated with water alone.',
    rating: 4.4,
    reviews: 132,
    decaf: true,
  },
  {
    id: 'midnight',
    name: 'Midnight Espresso',
    origin: 'Brazil & India',
    roast: 'Dark',
    notes: ['molasses', 'cocoa'],
    priceSek: 125,
    color: '#ef476f',
    description: 'Dark, syrupy and bold. Built to cut through milk in a flat white.',
    rating: 4.5,
    reviews: 209,
  },
]

export const sizes = [
  { id: '250g', label: '250 g', multiplier: 1 },
  { id: '500g', label: '500 g', multiplier: 1.9 },
  { id: '1kg', label: '1 kg', multiplier: 3.6 },
] as const

export type SizeId = (typeof sizes)[number]['id']

export const grinds = ['Whole bean', 'Filter', 'Espresso', 'French press'] as const

export type Grind = (typeof grinds)[number]

export function priceFor(coffee: Coffee, size: SizeId): number {
  const multiplier = sizes.find((s) => s.id === size)?.multiplier ?? 1
  return Math.round(coffee.priceSek * multiplier)
}

export function findCoffee(id: string): Coffee | undefined {
  return coffees.find((c) => c.id === id)
}

export const shippingOptions = [
  { id: 'standard', label: 'Standard', detail: '2–3 working days', priceSek: 0 },
  { id: 'express', label: 'Express', detail: 'Next working day', priceSek: 49 },
  { id: 'pickup', label: 'Pickup point', detail: 'Collect at your nearest shop', priceSek: 0 },
] as const

export const plans = [
  { id: 'one', label: 'One bag / month', priceSek: 149 },
  { id: 'two', label: 'Two bags / month', priceSek: 279 },
  { id: 'four', label: 'Four bags / month', priceSek: 519 },
] as const

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
  {
    id: 'FK-10655',
    date: '2026-10-02',
    items: ['Fika House Blend', 'Tarrazú Honey', 'Nyamasheke'],
    totalSek: 429,
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
  {
    id: 't3',
    coffeeId: 'cerrado',
    date: '2026-09-21',
    rating: 4,
    comment: 'Great in the moka pot, a bit flat as filter.',
  },
]

export const profile = {
  name: 'Alex Lindqvist',
  email: 'alex@example.com',
  plan: 'Two bags / month',
  grind: 'Whole bean',
  address: 'Storgatan 12, 111 22 Stockholm',
}
