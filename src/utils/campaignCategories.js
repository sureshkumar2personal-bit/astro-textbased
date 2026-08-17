const createBlankCategory = (overrides = {}) => ({
  name: '',
  normalPrice: 200,
  discountPercent: 0,
  compulsoryQuestions: 150,
  ...overrides,
})

export const defaultCampaignCategories = () => [
  createBlankCategory({ name: 'Marriage', discountPercent: 70 }),
  createBlankCategory({ name: 'Career', discountPercent: 80 }),
  createBlankCategory({ name: 'Love', discountPercent: 90 }),
  createBlankCategory({ name: 'Study', discountPercent: 40 }),
]

export { createBlankCategory }
