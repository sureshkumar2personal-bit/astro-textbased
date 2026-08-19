export const dashboardStats = [
  { label: 'active campaigns', value: '05' },
  { label: 'purchase questions', value: null },
  { label: 'answered question', value: null },
  { label: 'dispute question', value: null },
  { label: 'avg response time', value: '4 hours' },
]

export const campaignList = [
  'Career Campaign',
  'New User Offer',
  'Marriage Special',
  'Business Consultation',
  'VIP Subscribers',
]

export const questionList = [
  { id: 'Q1001', user: 'Priya', category: 'Marriage', type: 'Personal', status: 'Pending', time: '3 hrs', action: 'Open' },
  { id: 'Q1002', user: 'Kannan', category: 'Business', type: 'General', status: 'In Progress', time: '1 hr', action: 'View' },
  { id: 'Q1003', user: 'Devi', category: 'Job / Health', type: 'Personal', status: 'Disputed', time: '2 days', action: 'Resolve' },
]

export const myQuestions = [
  {
    id: 'QTN-1001',
    tags: 'Marriage | Individual | Paid',
    status: '🟡 Pending',
    raised: '21-Jul-2026 10:30 AM',
    actions: ['View', 'Edit', 'Revoke'],
  },
  {
    id: 'QTN-1002',
    tags: 'Business | General | Free',
    status: '🔵 In Progress',
    raised: '20-Jul-2026 05:15 PM',
    actions: ['View', 'Edit', 'Delete'],
  },
  {
    id: 'QTN-1003',
    tags: 'Health | Individual | Paid',
    status: '🟢 Answered',
    raised: '18-Jul-2026',
    actions: ['View Answer', 'Raise Dispute'],
  },
  {
    id: 'QTN-1004',
    tags: 'Finance | General | Paid',
    status: '🔴 Disputed',
    raised: '15-Jul-2026',
    actions: ['View Dispute'],
  },
]

export const categories = [
  'Marriage', 'Business', 'Job', 'Finance', 'Health', 'Education', 'Property', 'Divorce', 'Career', 'Others',
]

export const disputeReasons = [
  'The answer is incomplete',
  'The answer is not relevant to the question asked',
  'The main points of the question were not addressed',
  'The response is too generic and lacks personalization',
  'The horoscope or provided details do not appear to have been considered',
  'Unprofessional or inappropriate language was used',
  'Other service-related reason',
]

export const platformDisputeReasons = [
  'Unable to submit the question',
  'Payment was successful, but question credits were not added',
  "Unable to view the astrologer's answer",
  'Question was assigned to the wrong campaign or astrologer',
  'Other reason',
]

export const disputeHistory = [
  { date: '21-Jul-2026', event: 'User Raised Dispute' },
  { date: '22-Jul-2026', event: 'Astrologer Viewed' },
  { date: '22-Jul-2026', event: 'Waiting for Reply' },
]

export const salesHistory = []
