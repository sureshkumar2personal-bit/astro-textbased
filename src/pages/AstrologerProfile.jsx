import {
  ArrowLeft,
  Star,
  MapPin,
  Clock3,
  MessageCircle,
  Phone,
  Users,
  UserCheck,
  Edit3,
  Wallet,
  Landmark,
  ShieldCheck,
} from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

function AstrologerProfile() {
  const navigate = useNavigate()

  const [chatEnabled, setChatEnabled] = useState(true)
  const [audioEnabled, setAudioEnabled] = useState(false)

  const handleChatToggle = () => {
    setChatEnabled(!chatEnabled)

    if (!chatEnabled) {
      setAudioEnabled(false)
    }
  }

  const handleAudioToggle = () => {
    setAudioEnabled(!audioEnabled)

    if (!audioEnabled) {
      setChatEnabled(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl p-6">

      {/* BACK BUTTON */}

      <button
        type="button"
        className="mb-6 flex items-center gap-2 text-sm font-medium text-[color:var(--muted)] hover:text-[color:var(--primary)]"
        onClick={() => navigate('/astrologer')}
      >
        <ArrowLeft size={18} />
        Back to Dashboard
      </button>


      {/* PROFILE HEADER */}

      <div className="rounded-2xl border border-[color:var(--surface-border)] bg-[color:var(--surface)] p-6">

        <div className="flex flex-col gap-6 md:flex-row">

          {/* PROFILE IMAGE */}

          <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-full bg-[color:var(--primary)] text-3xl font-bold text-white">
            DR
          </div>


          {/* BASIC DETAILS */}

          <div className="flex-1">

            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">

              <div>

                <div className="flex flex-wrap items-center gap-3">

                  <h1 className="text-3xl font-bold text-[color:var(--text-primary)]">
                    Dr. Rani
                  </h1>

                  <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                    Verified Astrologer
                  </span>

                </div>

                <p className="mt-2 text-base font-medium text-[color:var(--primary)]">
                  Marriage, Career & Business
                </p>

              </div>


              {/* EDIT PROFILE */}

              <button
                type="button"
                className="flex items-center justify-center gap-2 rounded-xl border border-[color:var(--surface-border)] px-4 py-2 text-sm font-semibold text-[color:var(--text-primary)] hover:bg-[color:var(--surface-soft)]"
                onClick={() =>
                  navigate('/astrologer/account-profile')
                }
              >
                <Edit3 size={16} />
                Edit Profile
              </button>

            </div>


            {/* DETAILS */}

            <div className="mt-5 grid grid-cols-1 gap-3 text-sm text-[color:var(--muted)] sm:grid-cols-2 lg:grid-cols-3">

              <div className="flex items-center gap-2">
                <Star
                  size={17}
                  className="fill-current text-yellow-500"
                />
                <span>
                  <strong className="text-[color:var(--text-primary)]">
                    4.9
                  </strong>{' '}
                  (128 Reviews)
                </span>
              </div>


              <div className="flex items-center gap-2">
                <MapPin size={17} />
                Chennai, Tamil Nadu
              </div>


              <div className="flex items-center gap-2">
                <Clock3 size={17} />
                8 Years Experience
              </div>


              <div className="flex items-center gap-2">
                <MessageCircle size={17} />
                Tamil, English
              </div>

            </div>

          </div>

        </div>


        {/* BIO */}

        <div className="mt-6 border-t border-[color:var(--surface-border)] pt-5">

          <h2 className="font-semibold text-[color:var(--text-primary)]">
            About
          </h2>

          <p className="mt-2 max-w-4xl text-sm leading-6 text-[color:var(--muted)]">
            Experienced astrologer specializing in marriage, career and
            business guidance. Provides personalized astrology
            consultations based on birth details.
          </p>

        </div>

      </div>


      {/* FOLLOWERS / SUBSCRIBERS / EARNINGS */}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

        <StatCard
          icon={Users}
          title="Followers"
          value="1,248"
        />

        <StatCard
          icon={UserCheck}
          title="Subscribers"
          value="356"
        />

        <StatCard
          icon={MessageCircle}
          title="Total Consultations"
          value="842"
        />

        <StatCard
          icon={Wallet}
          title="Total Earnings"
          value="₹48,650"
        />

      </div>


      {/* INSTANT CONSULTATION */}

      <div className="mt-6 rounded-2xl border border-[color:var(--surface-border)] bg-[color:var(--surface)] p-6">

        <div>

          <h2 className="text-xl font-bold text-[color:var(--text-primary)]">
            Instant Consultation
          </h2>

          <p className="mt-1 text-sm text-[color:var(--muted)]">
            Turn ON one consultation mode when you are available.
          </p>

        </div>


        {/* CHAT */}

        <div className="mt-6 flex flex-col gap-4 rounded-xl border border-[color:var(--surface-border)] bg-[color:var(--surface-soft)] p-5 sm:flex-row sm:items-center sm:justify-between">

          <div className="flex items-start gap-4">

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[color:var(--violet-100)] text-[color:var(--primary)]">
              <MessageCircle size={21} />
            </div>

            <div>

              <h3 className="font-bold text-[color:var(--text-primary)]">
                Instant Chat
              </h3>

              <p className="mt-1 text-sm text-[color:var(--muted)]">
                Users can start an instant chat with you.
              </p>

              <p className="mt-2 text-sm font-semibold text-[color:var(--primary)]">
                ₹50 / 5 Minutes
              </p>

            </div>

          </div>


          {/* CHAT TOGGLE */}

          <button
            type="button"
            onClick={handleChatToggle}
            className={`relative h-7 w-12 shrink-0 rounded-full transition ${
              chatEnabled
                ? 'bg-green-500'
                : 'bg-gray-300'
            }`}
            aria-label="Toggle instant chat"
          >

            <span
              className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${
                chatEnabled
                  ? 'left-6'
                  : 'left-1'
              }`}
            />

          </button>

        </div>


        {/* AUDIO */}

        <div className="mt-4 flex flex-col gap-4 rounded-xl border border-[color:var(--surface-border)] bg-[color:var(--surface-soft)] p-5 sm:flex-row sm:items-center sm:justify-between">

          <div className="flex items-start gap-4">

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[color:var(--violet-100)] text-[color:var(--primary)]">
              <Phone size={21} />
            </div>

            <div>

              <h3 className="font-bold text-[color:var(--text-primary)]">
                Instant Audio Call
              </h3>

              <p className="mt-1 text-sm text-[color:var(--muted)]">
                Users can make an instant audio call with you.
              </p>

              <p className="mt-2 text-sm font-semibold text-[color:var(--primary)]">
                ₹50 / 5 Minutes
              </p>

            </div>

          </div>


          {/* AUDIO TOGGLE */}

          <button
            type="button"
            onClick={handleAudioToggle}
            className={`relative h-7 w-12 shrink-0 rounded-full transition ${
              audioEnabled
                ? 'bg-green-500'
                : 'bg-gray-300'
            }`}
            aria-label="Toggle instant audio call"
          >

            <span
              className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${
                audioEnabled
                  ? 'left-6'
                  : 'left-1'
              }`}
            />

          </button>

        </div>


        {/* STATUS */}

        <div className="mt-4 rounded-xl border border-[color:var(--surface-border)] p-4">

          <div className="flex items-center justify-between">

            <span className="text-sm font-semibold text-[color:var(--text-primary)]">
              Current Availability
            </span>

            {chatEnabled || audioEnabled ? (

              <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                Online
              </span>

            ) : (

              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                Offline
              </span>

            )}

          </div>


          <p className="mt-2 text-xs text-[color:var(--muted)]">

            {chatEnabled
              ? 'Instant Chat is currently active.'
              : audioEnabled
                ? 'Instant Audio Call is currently active.'
                : 'Turn ON Chat or Audio Call to become available.'}

          </p>

        </div>

      </div>


      {/* ASTROLOGY METHODS */}

      <div className="mt-6 rounded-2xl border border-[color:var(--surface-border)] bg-[color:var(--surface)] p-6">

        <h2 className="text-xl font-bold text-[color:var(--text-primary)]">
          Astrology Methods
        </h2>

        <div className="mt-4 flex flex-wrap gap-3">

          <span className="rounded-full bg-[color:var(--surface-soft)] px-4 py-2 text-sm font-medium text-[color:var(--text-primary)]">
            Thirukanitham
          </span>

          <span className="rounded-full bg-[color:var(--surface-soft)] px-4 py-2 text-sm font-medium text-[color:var(--text-primary)]">
            Vakkiyam
          </span>

          <span className="rounded-full bg-[color:var(--surface-soft)] px-4 py-2 text-sm font-medium text-[color:var(--text-primary)]">
            KPN System
          </span>

          <span className="rounded-full bg-[color:var(--surface-soft)] px-4 py-2 text-sm font-medium text-[color:var(--text-primary)]">
            DNA Astrology
          </span>

        </div>

      </div>


      {/* PRICING */}

      <div className="mt-6 rounded-2xl border border-[color:var(--surface-border)] bg-[color:var(--surface)] p-6">

        <h2 className="text-xl font-bold text-[color:var(--text-primary)]">
          Instant Consultation Pricing
        </h2>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">

          <PriceCard
            icon={MessageCircle}
            title="Instant Chat"
            duration="5 Minutes"
            price="₹50"
          />

          <PriceCard
            icon={Phone}
            title="Instant Audio Call"
            duration="5 Minutes"
            price="₹50"
          />

        </div>

      </div>


      {/* BANK DETAILS */}

      <div className="mt-6 rounded-2xl border border-[color:var(--surface-border)] bg-[color:var(--surface)] p-6">

        <div className="flex items-center justify-between">

          <div>

            <h2 className="text-xl font-bold text-[color:var(--text-primary)]">
              Bank & Account
            </h2>

            <p className="mt-1 text-sm text-[color:var(--muted)]">
              Account used for wallet withdrawals.
            </p>

          </div>

          <Landmark
            size={24}
            className="text-[color:var(--primary)]"
          />

        </div>


        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">

          <InfoItem
            label="Account Holder"
            value="Dr. Rani"
          />

          <InfoItem
            label="Bank"
            value="State Bank of India"
          />

          <InfoItem
            label="Account Number"
            value="XXXX XXXX 4521"
          />

          <InfoItem
            label="IFSC"
            value="SBIN0001234"
          />

        </div>

      </div>


      {/* PRIVACY */}

      <div className="mt-5 flex gap-3 rounded-xl bg-[color:var(--surface-soft)] p-4">

        <ShieldCheck
          size={19}
          className="mt-0.5 shrink-0 text-[color:var(--primary)]"
        />

        <p className="text-xs leading-5 text-[color:var(--muted)]">
          Your personal and banking information is protected and
          managed securely by the platform.
        </p>

      </div>

    </div>
  )
}


/* =====================================================
   STAT CARD
===================================================== */

function StatCard({
  icon: Icon,
  title,
  value,
}) {
  return (
    <div className="rounded-2xl border border-[color:var(--surface-border)] bg-[color:var(--surface)] p-5">

      <div className="flex items-center gap-3">

        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--violet-100)] text-[color:var(--primary)]">
          <Icon size={19} />
        </div>

        <div>

          <p className="text-xs text-[color:var(--muted)]">
            {title}
          </p>

          <p className="mt-1 text-xl font-bold text-[color:var(--text-primary)]">
            {value}
          </p>

        </div>

      </div>

    </div>
  )
}


/* =====================================================
   PRICE CARD
===================================================== */

function PriceCard({
  icon: Icon,
  title,
  duration,
  price,
}) {
  return (
    <div className="rounded-xl border border-[color:var(--surface-border)] bg-[color:var(--surface-soft)] p-5">

      <div className="flex items-center gap-3">

        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--violet-100)] text-[color:var(--primary)]">
          <Icon size={19} />
        </div>

        <div>

          <h3 className="font-bold text-[color:var(--text-primary)]">
            {title}
          </h3>

          <p className="text-xs text-[color:var(--muted)]">
            {duration}
          </p>

        </div>

      </div>

      <p className="mt-4 text-2xl font-bold text-[color:var(--primary)]">
        {price}
      </p>

    </div>
  )
}


/* =====================================================
   INFO ITEM
===================================================== */

function InfoItem({
  label,
  value,
}) {
  return (
    <div className="rounded-xl bg-[color:var(--surface-soft)] p-4">

      <p className="text-xs text-[color:var(--muted)]">
        {label}
      </p>

      <p className="mt-1 text-sm font-semibold text-[color:var(--text-primary)]">
        {value}
      </p>

    </div>
  )
}


export default AstrologerProfile