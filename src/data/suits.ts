export interface IronManSuit {
  id: string
  name: string
  designation: string
  status: 'ACTIVE' | 'DECOMMISSIONED' | 'STANDBY'
  year: string
  capabilities: string[]
  description: string
  specSheet: Array<{ label: string; value: string }>
  variant: 'classic' | 'stealth' | 'hulkbuster'
}

export const IRON_MAN_SUITS: IronManSuit[] = [
  {
    id: 'mark-i',
    name: 'Mark I',
    designation: 'MK-I',
    status: 'DECOMMISSIONED',
    year: '2008',
    capabilities: [
      'Twin wrist flamethrowers',
      'Short-burst escape thrusters',
      'Improvised forearm rockets',
    ],
    description:
      'Built inside the Ten Rings cave from salvaged metal and Stark weapon parts. The Mark I was brutally effective as an escape platform, but it was heavy, crude, and far from a polished flight suit.',
    specSheet: [
      {
        label: 'FRAME',
        value: 'Scrap-plated survival exoskeleton with exposed hydraulics',
      },
      {
        label: 'POWER',
        value: 'Prototype arc reactor feed with minimal onboard regulation',
      },
      {
        label: 'ROLE',
        value: 'One-shot breakout armor engineered for raw survivability',
      },
      {
        label: 'LIMIT',
        value: 'Extremely heavy, unstable, and not built for sustained flight',
      },
    ],
    variant: 'classic',
  },
  {
    id: 'iron-man',
    name: 'Iron Man',
    designation: 'MK-III',
    status: 'DECOMMISSIONED',
    year: '2008',
    capabilities: [
      'Weapon-grade repulsors',
      'Wrist micro-missiles',
      'High-altitude stabilized flight',
    ],
    description:
      'The red-and-gold combat suit that established Iron Man publicly. The Mark III refined the flight systems, solved the icing problem from the Mark II, and introduced the clean combat silhouette associated with Stark’s classic armor.',
    specSheet: [
      {
        label: 'FRAME',
        value: 'Gold-titanium alloy shell with balanced mobility and protection',
      },
      {
        label: 'FLIGHT',
        value: 'Reliable high-altitude performance with improved thermal resilience',
      },
      {
        label: 'WEAPONS',
        value: 'Repulsors, missiles, decoy flares, and integrated targeting HUD',
      },
      {
        label: 'SIGNATURE',
        value: 'First fully realized frontline Iron Man platform',
      },
    ],
    variant: 'classic',
  },
  {
    id: 'mark-85',
    name: 'Mark 85',
    designation: 'MK-LXXXV',
    status: 'ACTIVE',
    year: '2023',
    capabilities: [
      'Nanotech blade and shield synthesis',
      'Adaptive hard-light weapon shaping',
      'Rapid structural reconfiguration',
    ],
    description:
      'Tony Stark’s final and most refined nanotech suit, fielded during the Battle of Earth. The Mark 85 iterated on the Mark L architecture with cleaner deployment, denser protection, and more versatile close-quarters weapon formation.',
    specSheet: [
      {
        label: 'FRAME',
        value: 'Second-generation nanotech armor with reinforced modular density',
      },
      {
        label: 'DEPLOY',
        value: 'Instant body-form assembly from a compact chest housing',
      },
      {
        label: 'WEAPONS',
        value: 'Energy blades, shields, emitters, clamps, and nanotech reshaping',
      },
      {
        label: 'ROLE',
        value: 'Peak battlefield versatility for Endgame-scale combat',
      },
    ],
    variant: 'classic',
  },
  {
    id: 'hulkbuster',
    name: 'Hulkbuster',
    designation: 'MK-XLIV',
    status: 'STANDBY',
    year: '2015',
    capabilities: [
      'Heavy anti-Hulk restraint strength',
      'Modular replacement parts',
      'Massive impact and stabilization systems',
    ],
    description:
      'The Hulkbuster was designed as Stark’s contingency against Banner-level brute force. Built for catastrophic impact tolerance and overwhelming mechanical leverage, it prioritizes strength and redundancy over speed or finesse.',
    specSheet: [
      {
        label: 'FRAME',
        value: 'Oversized siege-class armor built around extreme impact tolerance',
      },
      {
        label: 'POWER',
        value: 'High-output heavy platform tuned for continuous force delivery',
      },
      {
        label: 'ROLE',
        value: 'Containment and counter-bruiser armor for Hulk-scale threats',
      },
      {
        label: 'LIMIT',
        value: 'Massive footprint and lower agility than standard Iron Man suits',
      },
    ],
    variant: 'hulkbuster',
  },
]
