// Audience records used by the astrologer's own audience views.
// These are deliberately small demo slices; the summary values remain the
// profile statistics already shown on the astrologer account screen.
export const ASTROLOGER_AUDIENCE = {
  followers: {
    label: 'Followers',
    subtitle: 'Users who follow you',
    count: 4,
    description: 'People who follow your public astrology profile.',
    rows: [
      { id: 'follower-nandini', name: 'Nandini Kapoor', username: 'nandini.kapoor', detail: 'Following since 18 Sep 2026', status: 'Active', date: '18 Sep 2026', photo: '/astrologer-photos/reference/nandini-kapoor.png' },
      { id: 'follower-priya', name: 'Priya Sharma', username: 'priya.sharma', detail: 'Following since 11 Sep 2026', status: 'Active', date: '11 Sep 2026', photo: '/astrologer-photos/reference/priya-sharma.png' },
      { id: 'follower-dev', name: 'Dev Malhotra', username: 'dev.malhotra', detail: 'Following since 05 Sep 2026', status: 'Active', date: '05 Sep 2026', photo: '/astrologer-photos/reference/dev-malhotra.png' },
      { id: 'follower-meera', name: 'Meera Desai', username: 'meera.desai', detail: 'Following since 28 Aug 2026', status: 'Active', date: '28 Aug 2026', photo: '/astrologer-photos/dashboard-reference/meera-desai.png' },
    ],
  },
  subscribers: {
    label: 'Subscribers',
    subtitle: 'Users who subscribe to you',
    count: 3,
    description: 'Users with an active subscription to your guidance.',
    rows: [
      { id: 'subscriber-aarav', name: 'Aarav Menon', username: 'aarav.menon', plan: 'Gold', price: '₹999/month', detail: 'Gold plan · ₹999/month', status: 'Active', date: 'Renews 24 Oct 2026', photo: '/astrologer-photos/dashboard-reference/bhavana-j.png' },
      { id: 'subscriber-kavya', name: 'Kavya Iyer', username: 'kavya.iyer', plan: 'Platinum', price: '₹1,499/month', detail: 'Platinum plan · ₹1,499/month', status: 'Active', date: 'Renews 31 Oct 2026', photo: '/astrologer-photos/reference/dr-rani.png' },
      { id: 'subscriber-rohan', name: 'Rohan Verma', username: 'rohan.verma', plan: 'Silver', price: '₹499/month', detail: 'Silver plan · ₹499/month', status: 'Paused', date: 'Paused 02 Oct 2026', photo: '/astrologer-photos/reference/arjun-sharma.png' },
    ],
  },
}
