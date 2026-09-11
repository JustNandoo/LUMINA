export type ManagedUser = {
  id: string
  username: string
  email: string
  role: string
  createdAt: string
  updatedAt: string
}

export const managedUsers: ManagedUser[] = Array.from(
  { length: 38 },
  (_, index) => ({
    id: String(index + 1).padStart(2, '0'),
    username: `User Luminaaaa`,
    email: 'usr@gmail.com',
    role: index % 7 === 0 ? 'Admin' : index % 5 === 0 ? 'Partner' : 'User',
    createdAt: '11 -1-2021',
    updatedAt: '1-1-2022',
  }),
)

export const userRoles = ['User', 'Admin', 'Partner']

export type ManagedRole = {
  no: string
  name: string
  users: string
  createdAt: string
  updatedAt: string
}

export const managedRoles: ManagedRole[] = [
  {
    no: '01',
    name: 'User Lumina',
    users: '1.200',
    createdAt: '1 -1-2021',
    updatedAt: '1-1-2022',
  },
]

export const b2bPackages: ManagedRole[] = [
  {
    no: '01',
    name: 'Eksplorer',
    users: '1.000',
    createdAt: '1 -1-2021',
    updatedAt: '1-1-2022',
  },
]

export type B2BPartner = {
  id: string
  company: string
  email: string
  packet: string
  quota: string
  status: string
}

export const b2bPartners: B2BPartner[] = Array.from(
  { length: 38 },
  (_, index) => ({
    id: `partner-${index + 1}`,
    company: 'Nama/Perusahaan',
    email: 'Email',
    packet: 'Paket',
    quota: 'Kuota Ekspor',
    status: 'Status',
  }),
)

export type SurveyPoint = {
  no: number
  station: string
  time: string
  date: string
  score: string
  status: 'On Review' | 'Valid'
  stationDetail: string
  pickupTime: string
  coordinate: string
  h3Cell: string
  crowdSize: string
  officer: string
  note: string
  photoCaption: string
}

export const surveyPoints: SurveyPoint[] = [
  {
    no: 1,
    station: 'Manggarai',
    time: '16.00–19.00',
    date: 'Minggu, 6 Sep 2026',
    score: '5/5',
    status: 'On Review',
    stationDetail: 'Manggarai (Peron 3 Jalur Timur)',
    pickupTime: '16:15',
    coordinate: '-6.2098, 106.8501',
    h3Cell: '892f3a64d77fff',
    crowdSize: 'Very Heavy (Level 5/5)',
    officer: 'Tim Radiant (Alif)',
    note: 'The line for the escalator on Platform 3 stretches all the way to the platform\'s safety boundary. The flow of passengers from Cikarang is massive.',
    photoCaption:
      '[Platform Photo] Condition of the Stairs & Platform 3 at Manggarai',
  },
  {
    no: 2,
    station: 'Duri',
    time: '16.00–19.00',
    date: 'Minggu, 6 Sep 2026',
    score: '5/5',
    status: 'Valid',
    stationDetail: 'Duri (Peron 1 Jalur Barat)',
    pickupTime: '16:40',
    coordinate: '-6.1625, 106.7968',
    h3Cell: '892f3a64d1bfff',
    crowdSize: 'Heavy (Level 4/5)',
    officer: 'Tim Radiant (Alif)',
    note: 'Antrean menuju pintu keluar utara padat merata sepanjang peron.',
    photoCaption: '[Platform Photo] Condition of Platform 1 at Duri',
  },
  {
    no: 3,
    station: 'Manggarai',
    time: '12.00–15.00',
    date: 'Minggu, 6 Sep 2026',
    score: '5/5',
    status: 'Valid',
    stationDetail: 'Manggarai (Peron 3 Jalur Timur)',
    pickupTime: '12:20',
    coordinate: '-6.2098, 106.8501',
    h3Cell: '892f3a64d77fff',
    crowdSize: 'Moderate (Level 3/5)',
    officer: 'Tim Radiant (Alif)',
    note: 'Kepadatan menurun dibanding jam sore, sirkulasi penumpang lancar.',
    photoCaption: '[Platform Photo] Midday condition at Manggarai',
  },
  {
    no: 4,
    station: 'Duri',
    time: '12.00–15.00',
    date: 'Minggu, 6 Sep 2026',
    score: '5/5',
    status: 'Valid',
    stationDetail: 'Duri (Peron 1 Jalur Barat)',
    pickupTime: '12:45',
    coordinate: '-6.1625, 106.7968',
    h3Cell: '892f3a64d1bfff',
    crowdSize: 'Light (Level 2/5)',
    officer: 'Tim Radiant (Alif)',
    note: 'Peron relatif lengang, hanya ramai di dekat pintu masuk.',
    photoCaption: '[Platform Photo] Midday condition at Duri',
  },
  {
    no: 5,
    station: 'Manggarai',
    time: '06.00–09.00',
    date: 'Minggu, 6 Sep 2026',
    score: '5/5',
    status: 'Valid',
    stationDetail: 'Manggarai (Peron 3 Jalur Timur)',
    pickupTime: '07:10',
    coordinate: '-6.2098, 106.8501',
    h3Cell: '892f3a64d77fff',
    crowdSize: 'Very Heavy (Level 5/5)',
    officer: 'Tim Radiant (Alif)',
    note: 'Puncak arus pagi, penumpang menumpuk di area tangga penghubung.',
    photoCaption: '[Platform Photo] Morning peak at Manggarai',
  },
  {
    no: 6,
    station: 'Duri',
    time: '06.00–09.00',
    date: 'Minggu, 6 Sep 2026',
    score: '5/5',
    status: 'Valid',
    stationDetail: 'Duri (Peron 1 Jalur Barat)',
    pickupTime: '07:35',
    coordinate: '-6.1625, 106.7968',
    h3Cell: '892f3a64d1bfff',
    crowdSize: 'Heavy (Level 4/5)',
    officer: 'Tim Radiant (Alif)',
    note: 'Arus pagi padat, terutama dari arah Tangerang.',
    photoCaption: '[Platform Photo] Morning peak at Duri',
  },
]
