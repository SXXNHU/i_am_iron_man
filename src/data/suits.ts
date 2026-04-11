export interface IronManSuit {
  id: string
  name: string
  designation: string
  status: 'ACTIVE' | 'DECOMMISSIONED' | 'STANDBY'
  year: string
  capabilities: string[]
  description: string
  specSheet: Array<{ label: string; value: string }>
  variant: 'classic' | 'warmachine' | 'stealth' | 'hulkbuster'
  accentHue: string
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
      'Arm-mounted micro-missiles',
      'Short-burst leg thrusters',
    ],
    description:
      'Tony Stark and Ho Yinsen built the Mark I from salvaged cave hardware and Stark weapons parts. It was brutally durable and strong enough to break out of captivity, but it was never engineered for sustained flight or refined maneuvering.',
    specSheet: [
      {
        label: 'FRAME',
        value: 'Scrap-built exoskeleton with exposed mechanical joints',
      },
      {
        label: 'FLIGHT',
        value: 'Single-burst escape propulsion only; not sustained-flight capable',
      },
      {
        label: 'WEAPONS',
        value: 'Dual flamethrowers and improvised micro-missiles',
      },
      {
        label: 'LIMIT',
        value: 'Heavy mass, low articulation, minimal onboard systems',
      },
    ],
    variant: 'classic',
    accentHue: '160deg',
  },
  {
    id: 'mark-ii',
    name: 'Mark II',
    designation: 'MK-II',
    status: 'DECOMMISSIONED',
    year: '2008',
    capabilities: [
      'First full repulsor flight platform',
      'Integrated J.A.R.V.I.S. HUD',
      'Prototype high-altitude test frame',
    ],
    description:
      'The Mark II transformed the crude Mark I into a sleek, fully articulated flight suit. It introduced the polished silver frame, proper repulsor-assisted flight, and a far more advanced control stack, but suffered from a severe high-altitude icing problem.',
    specSheet: [
      {
        label: 'FRAME',
        value: 'Sleek titanium prototype with full articulation',
      },
      {
        label: 'FLIGHT',
        value: 'First true high-speed sustained flight testbed',
      },
      {
        label: 'SYSTEMS',
        value: 'J.A.R.V.I.S.-assisted HUD and refined control response',
      },
      {
        label: 'LIMIT',
        value: 'Surface icing and shutdown risk at extreme altitude',
      },
    ],
    variant: 'classic',
    accentHue: '175deg',
  },
  {
    id: 'mark-iii',
    name: 'Mark III',
    designation: 'MK-III',
    status: 'DECOMMISSIONED',
    year: '2008',
    capabilities: [
      'Weapon-grade repulsors',
      'Shoulder machine guns',
      'Hip-mounted flares and wrist missiles',
    ],
    description:
      'The Mark III was Stark’s first combat-ready red-and-gold armor. Its gold-titanium alloy solved the Mark II icing issue while adding concealed weapons, better survivability, and the polished silhouette that defined Iron Man publicly.',
    specSheet: [
      {
        label: 'FRAME',
        value: 'Gold-titanium alloy shell with improved survivability',
      },
      {
        label: 'FLIGHT',
        value: 'Stable high-altitude performance without freeze lock',
      },
      {
        label: 'WEAPONS',
        value: 'Repulsors, wrist missiles, shoulder guns, and decoy flares',
      },
      {
        label: 'SIGNATURE',
        value: 'First fully realized red-and-gold frontline armor',
      },
    ],
    variant: 'classic',
    accentHue: '180deg',
  },
  {
    id: 'mark-vii',
    name: 'Mark VII',
    designation: 'MK-VII',
    status: 'DECOMMISSIONED',
    year: '2012',
    capabilities: [
      'Bracelet-guided pod deployment',
      'Expanded laser and missile loadout',
      'Heavy battle-thruster package',
    ],
    description:
      'Built for the Battle of New York era, the Mark VII emphasized emergency deployment and heavier battlefield ordnance. Its cylindrical pod could rocket to Stark and assemble around him in mid-air via bracelet guidance.',
    specSheet: [
      {
        label: 'DEPLOY',
        value: 'Remote pod launch with bracelet-targeted auto-assembly',
      },
      {
        label: 'FLIGHT',
        value: 'Boosted thrusters tuned for urban combat mobility',
      },
      {
        label: 'WEAPONS',
        value: 'Broader missile, laser, and anti-personnel package',
      },
      {
        label: 'ROLE',
        value: 'Rapid-response Avengers battlefield armor',
      },
    ],
    variant: 'classic',
    accentHue: '185deg',
  },
  {
    id: 'mark-xlii',
    name: 'Mark XLII',
    designation: 'MK-XLII',
    status: 'STANDBY',
    year: '2013',
    capabilities: [
      'Segmented autonomous assembly',
      'Gesture-based remote summoning',
      'Telepresence-assisted control',
    ],
    description:
      'The Mark XLII, the Autonomous Prehensile Propulsion Suit, was designed to fly to Stark in separate pieces and assemble itself around him. It was brilliantly flexible and remotely callable, but still unstable because it was fielded before final testing was complete.',
    specSheet: [
      {
        label: 'DEPLOY',
        value: 'Piece-by-piece autonomous assembly from remote range',
      },
      {
        label: 'CONTROL',
        value: 'Impulse-triggered summon with telepresence support',
      },
      {
        label: 'STRENGTH',
        value: 'High versatility even when individual parts deploy alone',
      },
      {
        label: 'LIMIT',
        value: 'Prototype instability and unreliable combat performance',
      },
    ],
    variant: 'stealth',
    accentHue: '170deg',
  },
  {
    id: 'mark-l',
    name: 'Mark L',
    designation: 'MK-L',
    status: 'ACTIVE',
    year: '2018',
    capabilities: [
      'Nanotech body deployment',
      'On-demand blades, cannons, and shields',
      'Self-reconfiguring combat geometry',
    ],
    description:
      'The Mark L introduced full nanotechnology deployment from the arc reactor housing. Instead of fixed hardware, it could rebuild itself continuously into blades, shields, cannons, restraints, and repair structures during combat.',
    specSheet: [
      {
        label: 'FRAME',
        value: 'Nanotech exosuit with fluid, muscle-like surface geometry',
      },
      {
        label: 'DEPLOY',
        value: 'Instant body-form assembly from chest-mounted nanite reservoir',
      },
      {
        label: 'WEAPONS',
        value: 'Adaptive shields, blades, missiles, clamps, and heavy emitters',
      },
      {
        label: 'ROLE',
        value: 'Most versatile pre-Endgame armor for Infinity War combat',
      },
    ],
    variant: 'classic',
    accentHue: '190deg',
  },
]
