export const REFERENCE_PROFILE_PHOTOS = {
  'Dr. Rani': '/astrologer-photos/reference/dr-rani.png',
  'Acharya Meena': '/astrologer-photos/reference/acharya-meena.png',
  'Dr. Meena': '/astrologer-photos/reference/acharya-meena.png',
  'Arjun Sharma': '/astrologer-photos/reference/arjun-sharma.png',
  'Nandini Kapoor': '/astrologer-photos/reference/nandini-kapoor.png',
  'Dev Malhotra': '/astrologer-photos/reference/dev-malhotra.png',
  'Priya Sharma': '/astrologer-photos/reference/priya-sharma.png',
  'Meera Desai': '/astrologer-photos/dashboard-reference/meera-desai.png',
  'Ishita Sen': '/astrologer-photos/dashboard-reference/ishita-sen.png',
  'Aditi Menon': '/astrologer-photos/dashboard-reference/aditi-menon.png',
  'Bhavana Joshi': '/astrologer-photos/dashboard-reference/bhavana-j.png',
  'Bhavana J.': '/astrologer-photos/dashboard-reference/bhavana-j.png',
}

export const ASTROLOGER_PHOTO_BY_ID = {
  'astrologer-demo': '/astrologer-photos/reference/dr-rani.png',
  'acharya-meena': '/astrologer-photos/reference/acharya-meena.png',
  'astrologer-demo-3': '/astrologer-photos/reference/arjun-sharma.png',
  'astrologer-10': '/astrologer-photos/reference/nandini-kapoor.png',
  'astrologer-11': '/astrologer-photos/reference/dev-malhotra.png',
  'astrologer-13': '/astrologer-photos/reference/priya-sharma.png',
  'astrologer-14': '/astrologer-photos/dashboard-reference/meera-desai.png',
  'astrologer-15': '/astrologer-photos/dashboard-reference/ishita-sen.png',
  'astrologer-17': '/astrologer-photos/dashboard-reference/aditi-menon.png',
  'astrologer-21': '/astrologer-photos/dashboard-reference/bhavana-j.png',
}

export const ASTROLOGER_PORTRAITS = {
  'astrologer-demo': 'https://randomuser.me/api/portraits/women/25.jpg',
  'acharya-meena': 'https://randomuser.me/api/portraits/women/41.jpg',
  'astrologer-demo-3': 'https://randomuser.me/api/portraits/men/62.jpg',
  'astrologer-4': 'https://randomuser.me/api/portraits/women/19.jpg',
  'astrologer-5': 'https://randomuser.me/api/portraits/men/56.jpg',
  'astrologer-6': 'https://randomuser.me/api/portraits/women/1.jpg',
  'astrologer-7': 'https://randomuser.me/api/portraits/men/44.jpg',
  'astrologer-8': 'https://randomuser.me/api/portraits/women/31.jpg',
  'astrologer-9': 'https://randomuser.me/api/portraits/men/39.jpg',
  'astrologer-10': 'https://randomuser.me/api/portraits/women/27.jpg',
  'astrologer-11': 'https://randomuser.me/api/portraits/men/88.jpg',
  'astrologer-12': 'https://randomuser.me/api/portraits/women/40.jpg',
  'astrologer-13': 'https://randomuser.me/api/portraits/women/9.jpg',
  'astrologer-14': 'https://randomuser.me/api/portraits/women/11.jpg',
  'astrologer-15': 'https://randomuser.me/api/portraits/women/61.jpg',
  'astrologer-16': 'https://randomuser.me/api/portraits/men/91.jpg',
  'astrologer-17': 'https://randomuser.me/api/portraits/women/7.jpg',
  'astrologer-18': 'https://randomuser.me/api/portraits/men/38.jpg',
  'astrologer-19': 'https://randomuser.me/api/portraits/women/91.jpg',
  'astrologer-20': 'https://randomuser.me/api/portraits/men/89.jpg',
  'astrologer-21': 'https://randomuser.me/api/portraits/women/13.jpg',
  'astrologer-22': 'https://randomuser.me/api/portraits/men/99.jpg',
  'astrologer-23': 'https://randomuser.me/api/portraits/women/86.jpg',
  'astrologer-24': 'https://randomuser.me/api/portraits/men/50.jpg',
  'astrologer-25': 'https://randomuser.me/api/portraits/women/55.jpg',
  'astrologer-26': 'https://randomuser.me/api/portraits/men/45.jpg',
}

export function getAstrologerPhoto(target) {
  if (!target) return ''
  if (typeof target === 'string') {
    return (
      REFERENCE_PROFILE_PHOTOS[target] ||
      ASTROLOGER_PHOTO_BY_ID[target] ||
      ASTROLOGER_PORTRAITS[target] ||
      ''
    )
  }
  return (
    target.photo ||
    target.profileImage ||
    target.image ||
    REFERENCE_PROFILE_PHOTOS[target.name] ||
    ASTROLOGER_PHOTO_BY_ID[target.id] ||
    ASTROLOGER_PORTRAITS[target.id] ||
    ''
  )
}
