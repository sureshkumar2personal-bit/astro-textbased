import { ArrowLeft, Heart, Star, MapPin } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const followedAstrologers = [
  {
    id: 'astro-rani',
    name: 'Dr. Rani',
    specialization: 'Marriage, Career & Business',
    experience: '8 Years Experience',
    rating: '4.9',
    reviews: '128',
    location: 'Chennai, Tamil Nadu',
    image: '',
  },
  {
    id: 'astro-arun',
    name: 'Dr. Arun Kumar',
    specialization: 'Career & Finance',
    experience: '6 Years Experience',
    rating: '4.8',
    reviews: '96',
    location: 'Madurai, Tamil Nadu',
    image: '',
  },
  {
    id: 'astro-meena',
    name: 'Dr. Meena',
    specialization: 'Love, Marriage & Family',
    experience: '10 Years Experience',
    rating: '4.9',
    reviews: '174',
    location: 'Coimbatore, Tamil Nadu',
    image: '',
  },
]

export default function Following() {
  const navigate = useNavigate()

  return (
    <div className="mx-auto w-full max-w-6xl pb-10">

      {/* HEADER */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

        <div>
          <div className="text-sm font-semibold text-[color:var(--primary)]">
            My Astrology
          </div>

          <h1 className="mt-1 text-3xl font-bold text-[color:var(--text-primary)]">
            Following
          </h1>

          <p className="mt-1 text-sm text-[color:var(--muted)]">
            Astrologers you are following.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => navigate('/user/profile')}
        >
          <ArrowLeft size={17} />
          Back to Profile
        </button>

      </div>

      {/* COUNT */}
      <div className="mb-5 rounded-[18px] border border-[color:var(--surface-border)] bg-[color:var(--surface)] px-5 py-4 shadow-sm">
        <div className="flex items-center gap-3">

          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--violet-100)] text-[color:var(--primary)]">
            <Heart size={19} />
          </div>

          <div>
            <div className="font-semibold text-[color:var(--text-primary)]">
              {followedAstrologers.length} Astrologers
            </div>

            <div className="text-sm text-[color:var(--muted)]">
              You are currently following these astrologers.
            </div>
          </div>

        </div>
      </div>

      {/* ASTROLOGER LIST */}
      {followedAstrologers.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

          {followedAstrologers.map((astrologer) => (
            <AstrologerCard
              key={astrologer.id}
              astrologer={astrologer}
              onClick={() =>
                navigate(
                  `/user/astrologers/${astrologer.id}`
                )
              }
            />
          ))}

        </div>
      ) : (
        <div className="rounded-[24px] border border-[color:var(--surface-border)] bg-[color:var(--surface)] p-10 text-center">

          <Heart
            size={36}
            className="mx-auto text-[color:var(--muted)]"
          />

          <h2 className="mt-4 text-lg font-bold text-[color:var(--text-primary)]">
            No astrologers followed yet
          </h2>

          <p className="mt-2 text-sm text-[color:var(--muted)]">
            Explore astrologers and follow the ones you like.
          </p>

        </div>
      )}

    </div>
  )
}


/* ASTROLOGER CARD */

function AstrologerCard({
  astrologer,
  onClick,
}) {
  const initials = astrologer.name
    .replace('Dr. ', '')
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full rounded-[24px] border border-[color:var(--surface-border)] bg-[color:var(--surface)] p-5 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
    >

      <div className="flex gap-4">

        {/* PHOTO */}
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[linear-gradient(135deg,var(--violet-500),var(--violet-700))] text-xl font-bold text-white">

          {astrologer.image ? (
            <img
              src={astrologer.image}
              alt={astrologer.name}
              className="h-full w-full object-cover"
            />
          ) : (
            initials
          )}

        </div>

        {/* DETAILS */}
        <div className="min-w-0 flex-1">

          <div className="flex items-start justify-between gap-3">

            <div>
              <h2 className="text-lg font-bold text-[color:var(--text-primary)]">
                {astrologer.name}
              </h2>

              <p className="mt-1 text-sm text-[color:var(--muted)]">
                {astrologer.specialization}
              </p>
            </div>

            <Heart
              size={19}
              className="shrink-0 fill-current text-red-400"
            />

          </div>

          {/* RATING */}
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">

            <span className="flex items-center gap-1 font-semibold text-[color:var(--text-primary)]">
              <Star
                size={16}
                className="fill-current text-yellow-500"
              />
              {astrologer.rating}
            </span>

            <span className="text-[color:var(--muted)]">
              ({astrologer.reviews} reviews)
            </span>

          </div>

          {/* LOCATION */}
          <div className="mt-2 flex items-center gap-1.5 text-xs text-[color:var(--muted)]">

            <MapPin size={14} />

            {astrologer.location}

          </div>

          <div className="mt-3 text-xs font-medium text-[color:var(--primary)]">
            {astrologer.experience}
          </div>

        </div>

      </div>

      <div className="mt-4 border-t border-[color:var(--surface-border)] pt-3 text-sm font-semibold text-[color:var(--primary)]">
        View Astrologer Profile →
      </div>

    </button>
  )
}