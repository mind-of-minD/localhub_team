export const SEOUL_DATA_FILES = [
  {
    category: '관광지',
    path: '/data/seoul/서울_관광지.json',
  },
  {
    category: '레포츠',
    path: '/data/seoul/서울_레포츠.json',
  },
  {
    category: '문화시설',
    path: '/data/seoul/서울_문화시설.json',
  },
  {
    category: '쇼핑',
    path: '/data/seoul/서울_쇼핑.json',
  },
  {
    category: '숙박',
    path: '/data/seoul/서울_숙박.json',
  },
  {
    category: '여행코스',
    path: '/data/seoul/서울_여행코스.json',
  },
  {
    category: '축제공연행사',
    path: '/data/seoul/서울_축제공연행사.json',
  },
]

export const ALL_CATEGORIES = '전체'

export const SEOUL_CATEGORIES = [
  ALL_CATEGORIES,
  ...SEOUL_DATA_FILES.map(file => file.category),
]