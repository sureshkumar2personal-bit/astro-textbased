// User side Perks & Benefits data for 12 Zodiac Signs and Jyotish Panchangam Specializations
// Structured Bento-Grid Data with Pillars, Lucky Tokens, and Sacred Remedy Checklists

export const ZODIACS = [
  { sign: 'Aries', symbol: '♈', en: 'Aries', rasi: 'Mesham', element: 'Fire', dates: 'Mar 21 - Apr 19', ruler: 'Mars', luckyColor: 'Red', luckyHex: '#ef4444', luckyNumber: 9, direction: 'East', muhurta: '08:30 AM - 10:15 AM' },
  { sign: 'Taurus', symbol: '♉', en: 'Taurus', rasi: 'Rishabam', element: 'Earth', dates: 'Apr 20 - May 20', ruler: 'Venus', luckyColor: 'Emerald Green', luckyHex: '#10b981', luckyNumber: 6, direction: 'North-East', muhurta: '11:15 AM - 01:00 PM' },
  { sign: 'Gemini', symbol: '♊', en: 'Gemini', rasi: 'Mithunam', element: 'Air', dates: 'May 21 - Jun 20', ruler: 'Mercury', luckyColor: 'Golden Yellow', luckyHex: '#f59e0b', luckyNumber: 5, direction: 'North', muhurta: '09:00 AM - 10:45 AM' },
  { sign: 'Cancer', symbol: '♋', en: 'Cancer', rasi: 'Kadagam', element: 'Water', dates: 'Jun 21 - Jul 22', ruler: 'Moon', luckyColor: 'Pearl Silver', luckyHex: '#cbd5e1', luckyNumber: 2, direction: 'North-West', muhurta: '07:15 PM - 08:45 PM' },
  { sign: 'Leo', symbol: '♌', en: 'Leo', rasi: 'Simmam', element: 'Fire', dates: 'Jul 23 - Aug 22', ruler: 'Sun', luckyColor: 'Radiant Gold', luckyHex: '#eab308', luckyNumber: 1, direction: 'East', muhurta: '06:30 AM - 08:00 AM' },
  { sign: 'Virgo', symbol: '♍', en: 'Virgo', rasi: 'Kanni', element: 'Earth', dates: 'Aug 23 - Sep 22', ruler: 'Mercury', luckyColor: 'Royal Navy', luckyHex: '#1e3a8a', luckyNumber: 5, direction: 'South', muhurta: '10:00 AM - 11:30 AM' },
  { sign: 'Libra', symbol: '♎', en: 'Libra', rasi: 'Thulam', element: 'Air', dates: 'Sep 23 - Oct 22', ruler: 'Venus', luckyColor: 'Rose Pink', luckyHex: '#ec4899', luckyNumber: 7, direction: 'West', muhurta: '04:00 PM - 05:30 PM' },
  { sign: 'Scorpio', symbol: '♏', en: 'Scorpio', rasi: 'Viruchigam', element: 'Water', dates: 'Oct 23 - Nov 21', ruler: 'Pluto & Mars', luckyColor: 'Deep Maroon', luckyHex: '#991b1b', luckyNumber: 8, direction: 'North', muhurta: '08:00 PM - 09:30 PM' },
  { sign: 'Sagittarius', symbol: '♐', en: 'Sagittarius', rasi: 'Dhanusu', element: 'Fire', dates: 'Nov 22 - Dec 21', ruler: 'Jupiter', luckyColor: 'Royal Purple', luckyHex: '#8b5cf6', luckyNumber: 3, direction: 'North-East', muhurta: '10:30 AM - 12:15 PM' },
  { sign: 'Capricorn', symbol: '♑', en: 'Capricorn', rasi: 'Magaram', element: 'Earth', dates: 'Dec 22 - Jan 19', ruler: 'Saturn', luckyColor: 'Slate Brown', luckyHex: '#78350f', luckyNumber: 4, direction: 'South', muhurta: '02:00 PM - 03:45 PM' },
  { sign: 'Aquarius', symbol: '♒', en: 'Aquarius', rasi: 'Kumbam', element: 'Air', dates: 'Jan 20 - Feb 18', ruler: 'Saturn & Uranus', luckyColor: 'Electric Cyan', luckyHex: '#06b6d4', luckyNumber: 11, direction: 'West', muhurta: '03:15 PM - 05:00 PM' },
  { sign: 'Pisces', symbol: '♓', en: 'Pisces', rasi: 'Meenam', element: 'Water', dates: 'Feb 19 - Mar 20', ruler: 'Jupiter & Neptune', luckyColor: 'Sea Green', luckyHex: '#059669', luckyNumber: 7, direction: 'North-East', muhurta: '06:00 AM - 07:30 AM' },
]

export const RASI_MAP = {
  mesham: 'Aries', mesha: 'Aries', aries: 'Aries',
  rishabam: 'Taurus', vrishabha: 'Taurus', taurus: 'Taurus',
  mithunam: 'Gemini', mithuna: 'Gemini', gemini: 'Gemini',
  kadagam: 'Cancer', karka: 'Cancer', cancer: 'Cancer',
  simmam: 'Leo', simha: 'Leo', leo: 'Leo',
  kanni: 'Virgo', virgo: 'Virgo',
  thulam: 'Libra', tula: 'Libra', libra: 'Libra',
  viruchigam: 'Scorpio', vrischika: 'Scorpio', scorpio: 'Scorpio',
  dhanusu: 'Sagittarius', dhanus: 'Sagittarius', sagittarius: 'Sagittarius',
  magaram: 'Capricorn', makara: 'Capricorn', capricorn: 'Capricorn',
  kumbam: 'Aquarius', kumbha: 'Aquarius', aquarius: 'Aquarius',
  meenam: 'Pisces', meena: 'Pisces', pisces: 'Pisces',
}

export function resolveUserZodiac(userRasi) {
  if (!userRasi) return ZODIACS[1] // Default to Taurus
  const key = String(userRasi).trim().toLowerCase()
  const matchedSign = RASI_MAP[key]
  return ZODIACS.find((z) => z.sign === matchedSign) || ZODIACS.find((z) => z.sign.toLowerCase() === key) || ZODIACS[1]
}

export const SPECIALIZATIONS = [
  {
    name: 'Guru Peyarchi',
    deity: 'Lord Dakshinamurthy',
    planet: 'Jupiter (Brihaspati)',
    temple: 'Alangudi Guru Sthalam',
    location: 'Kumbakonam, Tamil Nadu',
    category: 'Planetary Transits',
    day: 'Thursday',
    mantra: 'Om Gram Greem Graum Sah Gurave Namaha',
    mantraCount: '108x during Guru Hora',
    summary: 'Jupiter’s planetary transit illuminates wisdom, fortune, and spiritual dharma across key houses.',
    checklist: [
      'Offer yellow chickpeas (channa dal) garland to Lord Dakshinamurthy.',
      'Light two pure cow ghee deepams at home or temple during Guru Hora.',
      'Wear yellow or cream silk attire and donate books or study materials to students.'
    ]
  },
  {
    name: 'Sani Peyarchi',
    deity: 'Lord Shani Dev',
    planet: 'Saturn (Shanaischaraya)',
    temple: 'Tirunallar Saneeswaran',
    location: 'Karaikal, Puducherry',
    category: 'Planetary Transits',
    day: 'Saturday',
    mantra: 'Om Sham Shanaishcharaya Namaha',
    mantraCount: '108x after sunset on Saturdays',
    summary: 'Saturn balances karmic obligations, instilling profound resilience, humility, and duty.',
    checklist: [
      'Light sesame oil lamps (Ellu Vilakku) in coconut shells on Saturday evenings.',
      'Feed black crows with cooked rice mixed with black sesame seeds before eating.',
      'Donate warm blankets, black umbrellas, or footwear to elderly underprivileged individuals.'
    ]
  },
  {
    name: 'Rahu-Ketu Peyarchi',
    deity: 'Naga Devatas & Ganesha',
    planet: 'Rahu & Ketu (Lunar Nodes)',
    temple: 'Keezhperumpallam & Thirunageswaram',
    location: 'Mayiladuthurai, Tamil Nadu',
    category: 'Planetary Transits',
    day: 'Saturday / Tuesday',
    mantra: 'Om Raam Rahave Namaha · Om Kem Ketave Namaha',
    mantraCount: '108x during Rahu Kalam',
    summary: 'Karmic node transits dissolve illusion and unlock sudden intuitive breakthroughs.',
    checklist: [
      'Offer milk abhishekam to Rahu idol at Thirunageswaram temple during Rahu Kalam.',
      'Donate multi-colored blankets and horse gram (kollu) on Saturday mornings.',
      'Worship Lord Ganesha with Durva grass to neutralize Ketu afflictions.'
    ]
  },
  {
    name: 'Chevvai Dosham (Manglik)',
    deity: 'Lord Murugan (Karthikeya)',
    planet: 'Mars (Angaraka)',
    temple: 'Vaitheeswaran Koil',
    location: 'Nagapattinam, Tamil Nadu',
    category: 'Doshams & Pariharams',
    day: 'Tuesday',
    mantra: 'Om Kram Kreem Kroum Sah Bhaumaya Namah',
    mantraCount: '108x on Tuesday sunrise facing south',
    summary: 'Angaraka energy influences marital compatibility and internal fiery drive.',
    checklist: [
      'Perform Angaraka Parihara Archana with red oleander (sevvarali) flowers at Vaitheeswaran Koil.',
      'Donate red lentils (toor dal) and red cloths to Murugan devotees on Tuesdays.',
      'Chant Subrahmanya Bhujangam or Skanda Sashti Kavasam every Tuesday evening.'
    ]
  },
  {
    name: 'Kala Sarpa Dosham',
    deity: 'Lord Shiva & Naga Devata',
    planet: 'All Planets Hemmed',
    temple: 'Srikalahasti Temple',
    location: 'Tirupati, Andhra Pradesh',
    category: 'Doshams & Pariharams',
    day: 'Sunday / Amavasya',
    mantra: 'Om Namah Shivaya · Maha Mrityunjaya Mantra',
    mantraCount: '108x daily at Brahma Muhurta',
    summary: 'Planets hemmed between nodal axes create oscillating delays until transformed by sankalpa.',
    checklist: [
      'Perform Rahu-Ketu Sarpa Dosha Nivarana Puja with silver serpent idols at Srikalahasti.',
      'Offer holy water (Gangajal) and raw milk abhishekam to Shiva Lingam.',
      'Practice regular meditation during early morning sunrise to cultivate mental stability.'
    ]
  },
  {
    name: 'Pithru Dosham & Tarpanam',
    deity: 'Pitru Devatas & Lord Surya',
    planet: 'Sun (Surya Bhagavan)',
    temple: 'Rameswaram Agni Theertham',
    location: 'Rameswaram, Tamil Nadu',
    category: 'Doshams & Pariharams',
    day: 'Amavasya (New Moon)',
    mantra: 'Om Pithrubhyo Namaha · Gayatri Mantra',
    mantraCount: '28x facing East at noon',
    summary: 'Ancestral remembrance unlocks deep familial peace, prosperity, and progeny blessings.',
    checklist: [
      'Perform sacred Tarpanam using black sesame seeds, darbha grass, and holy river water.',
      'Perform Go-Seva (feed green grass, bananas, or soaked grains to holy cows).',
      'Provide food (Annadhanam) to at least three hungry individuals on Amavasya day.'
    ]
  },
  {
    name: 'Naga Dosham',
    deity: 'Nagaraja & Goddess Manasa',
    planet: 'Serpent Energies',
    temple: 'Mannarasala Nagaraja Temple',
    location: 'Alappuzha, Kerala',
    category: 'Doshams & Pariharams',
    day: 'Ayilyam Nakshatra',
    mantra: 'Om Sarparajaya Vidmahe Padmahastaya Dheemahi Tanno Vasuki Prachodayat',
    mantraCount: '108x on Ayilyam Star day',
    summary: 'Purifies subtle energetic afflictions, restoring family health and reproductive wellness.',
    checklist: [
      'Offer pure cow milk and turmeric powder abhishekam at a consecrated snake shrine.',
      'Support conservation of natural groves and avoid harming any living serpent.',
      'Keep a clean copper vessel with water at the northeast corner of your home.'
    ]
  },
  {
    name: 'Kalathra Dosham',
    deity: 'Parvati Parameshwara',
    planet: 'Venus (Shukra)',
    temple: 'Thirumanancheri Kalyanasundareswarar',
    location: 'Mayiladuthurai, Tamil Nadu',
    category: 'Doshams & Pariharams',
    day: 'Friday',
    mantra: 'Om Shum Shukraya Namaha',
    mantraCount: '108x on Friday during Shukra Hora',
    summary: 'Dissolves delays in finding a life partner and nurtures lifelong matrimonial harmony.',
    checklist: [
      'Offer garland to Goddess Parvati and Lord Kalyanasundareswarar at Thirumanancheri.',
      'Present sweet payasam or milk sweets prepared in cow milk to temple visitors.',
      'Maintain pure thoughts, peaceful speech, and graceful understanding in partnerships.'
    ]
  },
  {
    name: 'Pradosham & Sani Pradosham',
    deity: 'Lord Shiva & Nandi Devar',
    planet: 'Cosmic Twilight Window',
    temple: 'Thiruvannamalai Arunachaleswarar',
    location: 'Thiruvannamalai, Tamil Nadu',
    category: 'Panchangam Rituals',
    day: 'Trayodashi (13th Lunar Day)',
    mantra: 'Om Namah Shivaya',
    mantraCount: 'Continuous between 04:30 PM and 06:00 PM',
    summary: 'The golden twilight of Lord Shiva’s ecstatic dance washes away karmic obstacles.',
    checklist: [
      'Witness the holy Pradosha Abhishekam with milk, curd, honey, and Bilva leaves.',
      'Light cow ghee lamps between the horns of the sacred Nandi bull.',
      'Fast from sunrise until sunset twilight, breaking fast with temple prasad.'
    ]
  },
  {
    name: 'Amavasya & Pournami Rituals',
    deity: 'Chandra Dev & Sri Satyanarayana',
    planet: 'Moon (Chandra Bhagavan)',
    temple: 'Rameswaram Jyotirlinga',
    location: 'Rameswaram, Tamil Nadu',
    category: 'Panchangam Rituals',
    day: 'New Moon / Full Moon',
    mantra: 'Om Shram Shreem Shroum Sah Chandraya Namaha',
    mantraCount: '108x under the full moon',
    summary: 'Lunar cycles regulate psychological calm, intuitive clarity, and prana flow.',
    checklist: [
      'Perform Sri Satyanarayana Swamy Vratam with family on Pournami evenings.',
      'Take a holy dip in the sea or sacred theertham and meditate in silence.',
      'Avoid heavy meals and engage in tranquil chanting or scripture reading.'
    ]
  },
  {
    name: 'Navagraha Shanti Homam',
    deity: 'The Nine Celestial Grahas',
    planet: 'All Nine Planetary Deities',
    temple: 'Suriyanar Koil',
    location: 'Thanjavur, Tamil Nadu',
    category: 'Panchangam Rituals',
    day: 'Sunday',
    mantra: 'Complete Navagraha Stotram by Sage Vyasa',
    mantraCount: 'Daily at sunrise facing east',
    summary: 'Harmonizes all nine celestial forces, protecting against planetary imbalances.',
    checklist: [
      'Offer Navadhanyam (nine sacred grains) and corresponding colored cloths at Navagraha shrine.',
      'Perform circumambulation (Pradakshina) 9 times clockwise around the planetary altar.',
      'Recite the Navagraha Stotram with devotion at sunrise.'
    ]
  },
  {
    name: 'Janma Nakshatra Shanti',
    deity: 'Presiding Birth Star Deity',
    planet: 'Birth Star Lord (Nakshatradhipathi)',
    temple: 'Thirunallar Kshetra',
    location: 'Karaikal, Puducherry',
    category: 'Panchangam Rituals',
    day: 'Janma Nakshatra Day (Monthly)',
    mantra: 'Nakshatra Gayatri Mantra & Ishta Devata Stotram',
    mantraCount: '108x on your star day',
    summary: 'Honoring your birth constellation re-energizes vital life prana and dissolves karmic fatigue.',
    checklist: [
      'Perform Archana with your birth name, gotra, and nakshatra at your ancestral temple.',
      'Light a pure cow ghee deepam and distribute sweet prasadam to loved ones.',
      'Avoid disputes and engage in charitable acts to honor your birth constellation.'
    ]
  },
]

export const PERIODS = ['Daily', 'Weekly', 'Monthly']
export const SPECIALIZATION_TABS = ['Transit & Event Impact', 'Remedies & Pariharam', 'Mantra & Ritual Timings']

// Astrologer definitions catalog
export const ASTROLOGERS_CATALOG = [
  {
    id: 'astrologer-demo',
    name: 'Dr. Rani',
    specialty: 'Vedic Astrology',
    rating: '4.9',
    initials: 'DR',
    experience: '18+ yrs',
    tone: 'Classical Vedic & Pariharams',
    alignmentScore: 94,
    specializations: ['Guru Peyarchi', 'Sani Peyarchi', 'Rahu-Ketu Peyarchi', 'Pradosham & Sani Pradosham', 'Navagraha Shanti Homam'],
    forecasts: {
      Taurus: {
        Daily: {
          lead: 'Venus casts a gentle protective aspect over your ascendant today, amplifying creative harmony and inner tranquility.',
          alignment: 95,
          pillars: {
            career: { status: 'High Momentum', tip: 'Venus stimulates diplomatic negotiations. Ideal for presenting creative or financial proposals.' },
            love: { status: 'Harmonious', tip: 'Gentle conversations deepen affection. An ideal evening for a serene family dinner.' },
            wealth: { status: 'Favorable', tip: 'Prudent asset allocations yield lasting security. Avoid impulse luxury splurges.' },
            health: { status: 'Rejuvenating', tip: 'Vitality is high; incorporate mindful breathing and evening chamomile tea.' },
          }
        },
        Weekly: {
          lead: 'The Moon and Jupiter form a beneficial Gaja-Kesari alignment this week, bringing sustained career elevation and family joy.',
          alignment: 92,
          pillars: {
            career: { status: 'Expanding', tip: 'Mid-week brings recognition from senior executives and progress on ongoing ventures.' },
            love: { status: 'Deepening', tip: 'Honest emotional discussions melt lingering doubts before Friday.' },
            wealth: { status: 'Solid Inflow', tip: 'Past investments or pending settlements show positive momentum by Thursday.' },
            health: { status: 'Steady', tip: 'Maintain regular sleep schedules and take midday strolls in natural sunlight.' },
          }
        },
        Monthly: {
          lead: 'Venus transits through your auspicious kendra this month, opening prosperous doors in property, relationships, and spiritual wellness.',
          alignment: 96,
          pillars: {
            career: { status: 'Breakthrough', tip: 'Key milestones achieved around mid-month. Auspicious for long-term contract signings.' },
            love: { status: 'Blessed', tip: 'A memorable month for deepening long-term commitments and family milestones.' },
            wealth: { status: 'Prosperous', tip: 'Excellent muhurtas for real estate or diversified savings schemes.' },
            health: { status: 'Vibrant', tip: 'Spiritual practices and sacred temple visits amplify physical vitality.' },
          }
        },
      },
    },
  },
  {
    id: 'acharya-meena',
    name: 'Acharya Meena',
    specialty: 'Family & Remedies',
    rating: '4.8',
    initials: 'AM',
    experience: '15+ yrs',
    tone: 'Family Harmony & Marital Blessings',
    alignmentScore: 91,
    specializations: ['Chevvai Dosham (Manglik)', 'Kalathra Dosham', 'Pithru Dosham & Tarpanam', 'Amavasya & Pournami Rituals', 'Janma Nakshatra Shanti'],
    forecasts: {
      Taurus: {
        Daily: {
          lead: 'Family harmony is favored under Venusian grace today. Listening to elders with patience attracts supreme Lakshmi blessings.',
          alignment: 91,
          pillars: {
            career: { status: 'Balanced', tip: 'Collaborative teamwork dissolves friction. Emphasize shared goals with coworkers.' },
            love: { status: 'Sweet & Warm', tip: 'A thoughtful home gesture or homemade sweet brings heartfelt smiles.' },
            wealth: { status: 'Stable', tip: 'Auspicious day for setting aside savings for household welfare.' },
            health: { status: 'Calm', tip: 'Light a cow ghee lamp at your home altar to clear subtle energetic heaviness.' },
          }
        },
        Weekly: {
          lead: 'This week encourages deep emotional healing within relationships. Resolving an old misunderstanding brings peace to your home by Friday.',
          alignment: 89,
          pillars: {
            career: { status: 'Steady Growth', tip: 'Support from colleagues strengthens your position on challenging tasks.' },
            love: { status: 'Reconciled', tip: 'Friday is exceptionally favorable for open-hearted reconciliations.' },
            wealth: { status: 'Mindful', tip: 'Plan home renovations or family gifts with sensible budgeting.' },
            health: { status: 'Restful', tip: 'Dedicate evenings to family relaxation and calming bedtime routines.' },
          }
        },
        Monthly: {
          lead: 'An auspicious month for solemnizing engagements, family milestones, and performing sacred ancestral Tarpanam remedies.',
          alignment: 93,
          pillars: {
            career: { status: 'Harmonious', tip: 'Work environment becomes notably more supportive and predictable.' },
            love: { status: 'Auspicious', tip: 'Auspicious muhurtas support matrimonial decisions and celebrations.' },
            wealth: { status: 'Family Inflow', tip: 'Joint family assets and investments show favorable appreciation.' },
            health: { status: 'Peaceful', tip: 'Practicing regular gratitude rituals enhances mental serenity.' },
          }
        },
      },
    },
  },
  {
    id: 'astrologer-10',
    name: 'Nandini Kapoor',
    specialty: 'KP Astrology',
    rating: '4.8',
    initials: 'NK',
    experience: '12+ yrs',
    tone: 'KP Stellar Sub-Lord Timing',
    alignmentScore: 93,
    specializations: ['Janma Nakshatra Shanti', 'Kala Sarpa Dosham', 'Guru Peyarchi', 'Navagraha Shanti Homam', 'Sani Peyarchi'],
    forecasts: {
      Taurus: {
        Daily: {
          lead: 'Your 2nd and 11th KP sub-lords indicate fruitful professional discussions. The window between 11:30 AM and 1:30 PM is most auspicious.',
          alignment: 93,
          pillars: {
            career: { status: 'High Accuracy', tip: 'Focus on strategic negotiations and technical contracts during the midday hora.' },
            love: { status: 'Pragmatic', tip: 'Clear, direct communication prevents any minor misinterpretations.' },
            wealth: { status: 'Active Inflow', tip: 'Double-check banking and invoicing details for optimal yields.' },
            health: { status: 'Alert', tip: 'Maintain hydration and take short breaks from computer screens.' },
          }
        },
        Weekly: {
          lead: 'Planetary sub-lord transits highlight contract breakthroughs and recognition. Wednesday holds high probability for signing agreements.',
          alignment: 94,
          pillars: {
            career: { status: 'Accelerating', tip: 'Wednesday is your peak power day for pitching ideas or scheduling reviews.' },
            love: { status: 'Stable', tip: 'Support your partner with practical assistance on upcoming plans.' },
            wealth: { status: 'Calculated Gains', tip: 'A strategic reallocation of investments yields promising returns.' },
            health: { status: 'Energetic', tip: 'Morning yoga or brisk walking optimizes your physical rhythm.' },
          }
        },
        Monthly: {
          lead: 'KP transit charts show accelerated professional advancement and lucrative collaborative ventures this month. Focus on exact timing.',
          alignment: 95,
          pillars: {
            career: { status: 'Prominent Lift', tip: 'A major career transition or expansion materializes mid-month.' },
            love: { status: 'Cohesive', tip: 'Joint planning for future travels or home goals brings deep alignment.' },
            wealth: { status: 'Profitable', tip: 'Multiple income channels or bonuses register positive updates.' },
            health: { status: 'Peak Fitness', tip: 'Consistent wellness discipline rewards you with boundless stamina.' },
          }
        },
      },
    },
  },
  {
    id: 'astrologer-4',
    name: 'Kavitha Iyer',
    specialty: 'Prashna & Vedic Rituals',
    rating: '4.8',
    initials: 'KI',
    experience: '16+ yrs',
    tone: 'Prashna Horary & Sacred Pariharams',
    alignmentScore: 90,
    specializations: ['Naga Dosham', 'Sani Peyarchi', 'Kala Sarpa Dosham', 'Pradosham & Sani Pradosham', 'Chevvai Dosham (Manglik)'],
    forecasts: {
      Taurus: {
        Daily: {
          lead: 'Prashna horary charts reflect clarity in personal dilemmas today. Trust your inner calm and avoid hasty commitments with strangers.',
          alignment: 90,
          pillars: {
            career: { status: 'Intuitive', tip: 'Follow your gut instinct during team meetings; quiet observation reveals key answers.' },
            love: { status: 'Protected', tip: 'A spiritual connection with loved ones brings profound reassurance.' },
            wealth: { status: 'Preserved', tip: 'Exercise cautious patience; avoid speculative trading today.' },
            health: { status: 'Restorative', tip: 'Spend time near green foliage or natural water to center your mind.' },
          }
        },
        Weekly: {
          lead: 'Sacred rituals performed this week provide immense spiritual shielding. Visiting a sacred Devi temple on Friday brings special grace.',
          alignment: 92,
          pillars: {
            career: { status: 'Protected', tip: 'Obstacles at work dissolve as colleagues recognize your dedication.' },
            love: { status: 'Faithful', tip: 'Shared spiritual activities or prayers fortify your emotional bond.' },
            wealth: { status: 'Steady Flow', tip: 'Expenses remain within planned parameters; security improves.' },
            health: { status: 'Purified', tip: 'Friday temple visit and herbal teas revitalize subtle life prana.' },
          }
        },
        Monthly: {
          lead: 'A deeply purifying month for removing stubborn obstacles. Sincere devotional practices in the first half will yield visible relief.',
          alignment: 94,
          pillars: {
            career: { status: 'Unburdened', tip: 'Lingering disputes or delays clear out completely by the third week.' },
            love: { status: 'Renewed', tip: 'Fresh optimism and trust rejuvenate long-term relationships.' },
            wealth: { status: 'Grounded', tip: 'Sound financial counsel from trusted mentors proves highly beneficial.' },
            health: { status: 'Robust', tip: 'Pariharams performed on auspicious tithis bestow radiant vitality.' },
          }
        },
      },
    },
  },
  {
    id: 'astrologer-demo-3',
    name: 'Arjun Sharma',
    specialty: 'Numerology & Vastu',
    rating: '4.5',
    initials: 'AS',
    experience: '10+ yrs',
    tone: 'Numerical Vibrations & Cosmic Energy',
    alignmentScore: 88,
    specializations: ['Navagraha Shanti Homam', 'Janma Nakshatra Shanti', 'Amavasya & Pournami Rituals', 'Guru Peyarchi'],
    forecasts: {
      Taurus: {
        Daily: {
          lead: 'Number 6 vibrates strongly for you today, fostering creative partnerships and financial luck. Wear emerald or green tones.',
          alignment: 88,
          pillars: {
            career: { status: 'Creative', tip: 'Incorporate harmonious color palettes and clean desk orientation.' },
            love: { status: 'Attractive', tip: 'Venusian charm is high; social encounters leave pleasant impressions.' },
            wealth: { status: 'Fortunate', tip: 'Transactions involving numbers 6, 15, or 24 carry extra luck.' },
            health: { status: 'Balanced', tip: 'Maintain balanced posture and deep rhythmic breathing throughout the day.' },
          }
        },
        Weekly: {
          lead: 'A high-vibration week for creative work and property discussions. Keep your workspace organized and north-facing for positive flow.',
          alignment: 90,
          pillars: {
            career: { status: 'Vibrant', tip: 'Thursday brings breakthrough ideas for marketing or design projects.' },
            love: { status: 'Harmonious', tip: 'Celebrate personal achievements with your partner in inspiring surroundings.' },
            wealth: { status: 'Expanding', tip: 'Favorable timing for signing residential or commercial leases.' },
            health: { status: 'Energized', tip: 'Keep living spaces clean and open to allow fresh morning prana.' },
          }
        },
        Monthly: {
          lead: 'A pivotal month of material growth and balanced vibrations. Numbers 6, 15, and 24 bring auspicious turns in ongoing projects.',
          alignment: 92,
          pillars: {
            career: { status: 'Structured', tip: 'Systematic organization transforms chaotic tasks into successful deliverables.' },
            love: { status: 'Inspiring', tip: 'Mutually supportive goals strengthen domestic and partnership harmony.' },
            wealth: { status: 'Multiplying', tip: 'Wise asset investments show positive trajectory by month-end.' },
            health: { status: 'Harmonized', tip: 'Vastu realignment in your sleeping quarters delivers deep, peaceful rest.' },
          }
        },
      },
    },
  },
]

// Fallback generic pillars for other signs
export function getSignPillars(sign, period) {
  return {
    career: { status: 'Favorable', tip: 'Planetary alignments favor focused work and collaborative discussions.' },
    love: { status: 'Harmonious', tip: 'Honest communication nurtures warmth and mutual understanding.' },
    wealth: { status: 'Prudent', tip: 'Mindful budgeting and safe asset management ensure long-term stability.' },
    health: { status: 'Steady', tip: 'Balance active physical routines with calming evening mindfulness.' },
  }
}

// Helper to get astrologer forecast with full Bento pillars & scores
export function getAstrologerForecastData(astrologerId, sign, period) {
  const astro = ASTROLOGERS_CATALOG.find((a) => a.id === astrologerId) || ASTROLOGERS_CATALOG[0]
  const specific = astro?.forecasts?.[sign]?.[period]

  if (specific) {
    return {
      lead: specific.lead,
      alignment: specific.alignment || astro.alignmentScore || 92,
      pillars: specific.pillars,
    }
  }

  // Fallback realistic forecast
  const zodiac = ZODIACS.find((z) => z.sign === sign) || ZODIACS[1]
  return {
    lead: `${astro.name} notes: ${zodiac.ruler} casts a favorable influence over ${zodiac.en} (${zodiac.rasi}) during this ${period.toLowerCase()} period, fostering steady progress and clarity.`,
    alignment: astro.alignmentScore || 90,
    pillars: getSignPillars(sign, period),
  }
}

// Helper to get astrologer specializations
export function getAstrologerSpecializations(astrologerId) {
  const astro = ASTROLOGERS_CATALOG.find((a) => a.id === astrologerId)
  if (astro?.specializations?.length) {
    const matched = SPECIALIZATIONS.filter((s) => astro.specializations.includes(s.name))
    if (matched.length) return matched
  }
  return SPECIALIZATIONS.slice(0, 5)
}
