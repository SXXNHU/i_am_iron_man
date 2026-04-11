export type DriverArchetype =
  | 'precision'
  | 'tempo'
  | 'aggression'
  | 'endurance'
  | 'judgement'
  | 'recovery'

export type DriverProfile = {
  name: string
  team: string
  number: number
  nationality: string
  tier: number
  title: string
  summary: string
  archetypes: DriverArchetype[]
}

export const CURRENT_F1_DRIVERS: DriverProfile[] = [
  { name: 'Lando Norris', team: 'McLaren', number: 1, nationality: 'United Kingdom', tier: 5, title: 'Tempo specialist', summary: '긴장한 구간에서도 리듬을 유지하며 세션 전체 템포를 잃지 않는 타입입니다.', archetypes: ['tempo', 'precision'] },
  { name: 'Oscar Piastri', team: 'McLaren', number: 81, nationality: 'Australia', tier: 5, title: 'Ice-cold precision', summary: '작은 실수 없이 깔끔하게 누적하는 정확도 중심 세션과 잘 맞는 프로필입니다.', archetypes: ['precision', 'judgement'] },
  { name: 'Max Verstappen', team: 'Red Bull Racing', number: 3, nationality: 'Netherlands', tier: 5, title: 'Aggressive snap reaction', summary: '아주 짧은 창에서 과감하게 치고 들어가는 폭발형 반응 스타일에 가깝습니다.', archetypes: ['aggression', 'tempo'] },
  { name: 'Charles Leclerc', team: 'Ferrari', number: 16, nationality: 'Monaco', tier: 4, title: 'Qualifying needle', summary: '짧은 순간의 집중력과 날카로운 첫 입력이 강한 퀄리파잉형 감각입니다.', archetypes: ['precision', 'aggression'] },
  { name: 'Lewis Hamilton', team: 'Ferrari', number: 44, nationality: 'United Kingdom', tier: 4, title: 'Recovery master', summary: '초반보다 후반에 더 깔끔해지는 적응형 러너로 긴 세션에서 진가가 드러납니다.', archetypes: ['recovery', 'endurance'] },
  { name: 'George Russell', team: 'Mercedes', number: 63, nationality: 'United Kingdom', tier: 4, title: 'Measured attack', summary: '무작정 빠르기보다 계산된 공격성을 유지하는 밸런스형 움직임과 닮았습니다.', archetypes: ['tempo', 'judgement'] },
  { name: 'Kimi Antonelli', team: 'Mercedes', number: 12, nationality: 'Italy', tier: 4, title: 'Raw launch pace', summary: '스타트 반응과 첫 입력이 빠른 신예형 프로필로 순간 폭발력이 핵심입니다.', archetypes: ['aggression', 'tempo'] },
  { name: 'Fernando Alonso', team: 'Aston Martin', number: 14, nationality: 'Spain', tier: 4, title: 'Endurance tactician', summary: '오래 버티면서 판단 품질을 유지하는 스타일이라 Survival과 판단형 모드에 잘 맞습니다.', archetypes: ['endurance', 'judgement'] },
  { name: 'Carlos Sainz', team: 'Williams', number: 55, nationality: 'Spain', tier: 3, title: 'Methodical builder', summary: '한 번의 화려한 히트보다 세션 전체를 안정적으로 조립하는 정돈된 타입입니다.', archetypes: ['judgement', 'recovery'] },
  { name: 'Alexander Albon', team: 'Williams', number: 23, nationality: 'Thailand', tier: 3, title: 'Adaptive improvisor', summary: '흐름이 흔들려도 빠르게 적응하는 후반 추격형 러너와 비슷합니다.', archetypes: ['recovery', 'tempo'] },
  { name: 'Pierre Gasly', team: 'Alpine', number: 10, nationality: 'France', tier: 3, title: 'Sharp reset pace', summary: '실수 후 리셋이 빠르고 다시 템포를 올려 회복하는 패턴과 닮았습니다.', archetypes: ['recovery', 'aggression'] },
  { name: 'Oliver Bearman', team: 'Haas F1 Team', number: 87, nationality: 'United Kingdom', tier: 3, title: 'Fearless rookie snap', summary: '판단이 빠르고 대담합니다. 빠른 반응은 강하지만 정확도 관리가 중요할 때 이 프로필에 가까워집니다.', archetypes: ['aggression', 'judgement'] },
  { name: 'Sergio Perez', team: 'Cadillac', number: 11, nationality: 'Mexico', tier: 3, title: 'Long-run stabilizer', summary: '한 번의 폭발보다 전체 흐름을 오래 안정적으로 끌고 가는 타입입니다.', archetypes: ['endurance', 'recovery'] },
  { name: 'Valtteri Bottas', team: 'Cadillac', number: 77, nationality: 'Finland', tier: 3, title: 'Calm single-lap focus', summary: '잡음이 적고 첫 입력이 단정합니다. 군더더기 없는 반응 패턴과 가장 비슷합니다.', archetypes: ['precision', 'tempo'] },
]
