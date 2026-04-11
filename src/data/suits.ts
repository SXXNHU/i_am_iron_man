export interface IronManSuit {
  id: string
  name: string
  designation: string
  status: 'ACTIVE' | 'DECOMMISSIONED' | 'STANDBY'
  year: string
  capabilities: string[]
  description: string
  stats: { power: number; speed: number; armor: number; stealth: number }
  variant: 'classic' | 'warmachine' | 'stealth' | 'hulkbuster'
  accentHue: string // CSS hue-rotate value to tint the hologram
}

export const IRON_MAN_SUITS: IronManSuit[] = [
  {
    id: 'mark-i',
    name: 'Mark I',
    designation: 'MK-I',
    status: 'DECOMMISSIONED',
    year: '2008',
    capabilities: ['Crude repulsors', 'Basic flight', 'Flamethrowers'],
    description:
      'Built from scavenged weapons in captivity. The genesis of the Iron Man legacy — raw, brutal, unstoppable.',
    stats: { power: 32, speed: 22, armor: 58, stealth: 5 },
    variant: 'classic',
    accentHue: '160deg',
  },
  {
    id: 'mark-iii',
    name: 'Mark III',
    designation: 'MK-III',
    status: 'DECOMMISSIONED',
    year: '2008',
    capabilities: ['Repulsor blasts', 'Mach 3 flight', 'Weapons array', 'Icing fix'],
    description:
      'First fully functional red and gold powered armor. Defeated Obadiah Stane and proved the concept to the world.',
    stats: { power: 68, speed: 72, armor: 74, stealth: 20 },
    variant: 'classic',
    accentHue: '180deg',
  },
  {
    id: 'war-machine',
    name: 'War Machine',
    designation: 'MK-II/WM',
    status: 'ACTIVE',
    year: '2010',
    capabilities: ['M134 minigun', 'Missile pods', 'Anti-tank rounds', 'EMP'],
    description:
      'Military-grade platform operated by Col. James Rhodes. Maximum firepower over elegance.',
    stats: { power: 85, speed: 58, armor: 92, stealth: 10 },
    variant: 'warmachine',
    accentHue: '200deg',
  },
  {
    id: 'mark-vii',
    name: 'Mark VII',
    designation: 'MK-VII',
    status: 'DECOMMISSIONED',
    year: '2012',
    capabilities: ['Taser repulsors', 'Lateral thrusters', 'Anti-personnel array'],
    description:
      'Deployed mid-freefall during the Chitauri invasion. First suit with bracelet-activated assembly.',
    stats: { power: 78, speed: 82, armor: 80, stealth: 28 },
    variant: 'classic',
    accentHue: '185deg',
  },
  {
    id: 'mark-xlii',
    name: 'Mark XLII',
    designation: 'MK-XLII',
    status: 'STANDBY',
    year: '2013',
    capabilities: ['Telepresence', 'Segmented assembly', 'Long-range deployment'],
    description:
      'Remote-controlled suit capable of autonomous assembly across distance. Worn under extreme emotional duress.',
    stats: { power: 82, speed: 86, armor: 76, stealth: 34 },
    variant: 'stealth',
    accentHue: '170deg',
  },
  {
    id: 'mark-l',
    name: 'Mark L',
    designation: 'MK-L',
    status: 'ACTIVE',
    year: '2018',
    capabilities: ['Nanotech assembly', 'On-demand weapons', 'Adaptive hull', 'Energy blade'],
    description:
      'Nanotechnology-based armor stored in the arc reactor. Weapons and shields synthesized on demand.',
    stats: { power: 96, speed: 94, armor: 88, stealth: 48 },
    variant: 'classic',
    accentHue: '190deg',
  },
]
