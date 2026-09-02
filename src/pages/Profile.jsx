import { useState } from 'react'

import {
  ArrowLeft,
  Camera,
  Mail,
  Phone,
  Users,
  Star,
  CalendarDays,
  MapPin,
  Clock3,
  ShieldCheck,
} from 'lucide-react'

import { useNavigate } from 'react-router-dom'

import { useAuth } from '../state/AuthContext.jsx'
import { getRoleRoutes, ROLES } from '../utils/roleRoutes.js'

export default function Profile() {
  const navigate = useNavigate()

  const { currentUser, updateProfile } = useAuth()

  const routes = getRoleRoutes(
    currentUser?.role || ROLES.USER
  )

  const [editing, setEditing] = useState(false)

  const [saving, setSaving] = useState(false)

  const [error, setError] = useState('')

  const [saved, setSaved] = useState(false)

  const getInitialForm = () => ({
    name: currentUser?.name || '',
    email: currentUser?.email || '',
    phone: currentUser?.phone || '',

    bio: currentUser?.bio || '',

    dob: currentUser?.dob || '',
    birthTime: currentUser?.birthTime || '',

    birthPlace: currentUser?.birthPlace || '',

    city: currentUser?.city || '',
    state: currentUser?.state || '',
    country: currentUser?.country || 'India',

    pinCode: currentUser?.pinCode || '',
    address: currentUser?.address || '',

    saveHoroscope:
      currentUser?.saveHoroscope ?? true,
  })

  const [form, setForm] = useState(getInitialForm)

  const [profileImage, setProfileImage] = useState(
    currentUser?.profileImage || ''
  )

  const initials =
    currentUser?.name
      ?.split(' ')
      .map((part) => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'U'

  const updateField = (field, value) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }))

    setSaved(false)
    setError('')
  }

  const startEditing = () => {
    setForm(getInitialForm())
    setProfileImage(currentUser?.profileImage || '')
    setEditing(true)
    setSaved(false)
    setError('')
  }

  const cancelEditing = () => {
    setForm(getInitialForm())
    setProfileImage(currentUser?.profileImage || '')
    setEditing(false)
    setError('')
  }

  const handleImageChange = (event) => {
    const file = event.target.files?.[0]

    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image.')
      return
    }

    const reader = new FileReader()

    reader.onload = () => {
      setProfileImage(reader.result)
    }

    reader.readAsDataURL(file)
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setSaved(false)

    try {
      updateProfile({
        ...form,
        profileImage,
      })

      setEditing(false)
      setSaved(true)

      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      })
    } catch (err) {
      setError(
        err?.message ||
          'Unable to save profile.'
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl pb-10">

      {/* HEADER */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

        <div>
          <div className="text-sm font-semibold text-[color:var(--primary)]">
            User Portal
          </div>

          <h1 className="mt-1 text-3xl font-bold text-[color:var(--text-primary)]">
            My Profile
          </h1>

          <p className="mt-1 text-sm text-[color:var(--muted)]">
            Manage your personal profile and horoscope details.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">

          {!editing ? (
            <>
              <button
                type="button"
                className="btn btn-primary"
                onClick={startEditing}
              >
                Edit Profile
              </button>

              <button
                type="button"
                className="btn btn-ghost"
                onClick={() =>
                  navigate(routes.dashboard)
                }
              >
                <ArrowLeft size={17} />
                Back
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={cancelEditing}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSave}
                disabled={saving}
              >
                {saving
                  ? 'Saving...'
                  : 'Save Changes'}
              </button>
            </>
          )}

        </div>
      </div>

      {error && (
        <div className="mb-5 rounded-[14px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
          {error}
        </div>
      )}

      {saved && (
        <div className="mb-5 rounded-[14px] border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-600">
          Profile updated successfully.
        </div>
      )}

      {/* PROFILE CARD */}
      <section className="rounded-[24px] border border-[color:var(--surface-border)] bg-[color:var(--surface)] p-6 shadow-sm">

        <div className="flex flex-col items-center gap-6 md:flex-row">

          {/* PHOTO */}
          <div className="relative shrink-0">

            <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border-4 border-[color:var(--surface)] bg-[linear-gradient(135deg,var(--violet-500),var(--violet-700))] text-3xl font-bold text-white shadow-md">

              {profileImage ? (
                <img
                  src={profileImage}
                  alt="Profile"
                  className="h-full w-full object-cover"
                />
              ) : (
                initials
              )}

            </div>

            {editing && (
              <label
                htmlFor="profile-photo"
                className="absolute bottom-1 right-1 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-2 border-white bg-[color:var(--primary)] text-white shadow-md"
              >
                <Camera size={18} />

                <input
                  id="profile-photo"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleImageChange}
                />
              </label>
            )}

          </div>

          {/* NAME */}
          <div className="min-w-0 flex-1">

            {editing ? (
              <div className="max-w-md">
                <label className="field-group">
                  <span className="field-label-top">
                    Name
                  </span>

                  <input
                    type="text"
                    className="text-input"
                    value={form.name}
                    onChange={(e) =>
                      updateField(
                        'name',
                        e.target.value
                      )
                    }
                  />
                </label>
              </div>
            ) : (
              <h2 className="text-2xl font-bold text-[color:var(--text-primary)]">
                {currentUser?.name || 'User'}
              </h2>
            )}

            <div className="mt-1 text-sm font-medium text-[color:var(--muted)]">
              User
            </div>

            {editing ? (
              <label className="field-group mt-4">
                <span className="field-label-top">
                  About You
                </span>

                <textarea
                  className="text-input min-h-[90px] resize-none"
                  value={form.bio}
                  onChange={(e) =>
                    updateField(
                      'bio',
                      e.target.value
                    )
                  }
                  placeholder="Write a short description about yourself..."
                />
              </label>
            ) : (
              <p className="mt-3 max-w-xl text-sm leading-6 text-[color:var(--muted)]">
                {currentUser?.bio ||
                  'Add a short introduction about yourself.'}
              </p>
            )}

          </div>

        </div>

        {/* STATS */}
        <div className="mt-8 grid grid-cols-1 gap-4 border-t border-[color:var(--surface-border)] pt-6 sm:grid-cols-3">

          <ProfileStat
  icon={Users}
  value="0"
  label="Following"
  onClick={() => navigate('/user/following')}
/>

<ProfileStat
  icon={Star}
  value="0"
  label="Subscriptions"
  onClick={() => navigate('/user/subscriptions')}
/>

<ProfileStat
  icon={CalendarDays}
  value="0"
  label="Consultations"
  onClick={() => navigate('/user/consultations')}
/>
        </div>

      </section>

      {/* ACCOUNT */}
      <section className="mt-6 rounded-[24px] border border-[color:var(--surface-border)] bg-[color:var(--surface)] p-6 shadow-sm">

        <h2 className="text-xl font-bold text-[color:var(--text-primary)]">
          Account Information
        </h2>

        <p className="mt-1 text-sm text-[color:var(--muted)]">
          Your registered account details.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">

          <ProfileField
            label="Email Address"
            icon={Mail}
            editing={editing}
            value={form.email}
            onChange={(value) =>
              updateField('email', value)
            }
            type="email"
          />

          <ProfileField
            label="Phone Number"
            icon={Phone}
            editing={editing}
            value={form.phone}
            onChange={(value) =>
              updateField('phone', value)
            }
            type="tel"
          />

        </div>

      </section>

      {/* HOROSCOPE */}
      <section className="mt-6 rounded-[24px] border border-[color:var(--surface-border)] bg-[color:var(--surface)] p-6 shadow-sm">

        <div className="flex items-start gap-3">

          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[color:var(--violet-100)] text-[color:var(--primary)]">
            <Star size={20} />
          </div>

          <div>
            <h2 className="text-xl font-bold text-[color:var(--text-primary)]">
              My Horoscope Details
            </h2>

            <p className="mt-1 text-sm text-[color:var(--muted)]">
              Save your birth details for faster astrology consultations.
            </p>
          </div>

        </div>

        {/* BIRTH DETAILS */}
        <div className="mt-7">

          <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-[color:var(--text-primary)]">
            Birth Details
          </h3>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

            {/* DATE */}
            <DateField
              label="Date of Birth"
              value={form.dob}
              editing={editing}
              onChange={(value) =>
                updateField('dob', value)
              }
            />

            {/* TIME */}
            <TimeField
              label="Time of Birth"
              value={form.birthTime}
              editing={editing}
              onChange={(value) =>
                updateField(
                  'birthTime',
                  value
                )
              }
            />

            <ProfileField
              label="Place of Birth"
              icon={MapPin}
              editing={editing}
              value={form.birthPlace}
              onChange={(value) =>
                updateField(
                  'birthPlace',
                  value
                )
              }
              placeholder="Enter place of birth"
            />

            <ProfileField
              label="City"
              icon={MapPin}
              editing={editing}
              value={form.city}
              onChange={(value) =>
                updateField('city', value)
              }
              placeholder="Enter city"
            />

            <ProfileField
              label="State"
              editing={editing}
              value={form.state}
              onChange={(value) =>
                updateField('state', value)
              }
              placeholder="Enter state"
            />

            <ProfileField
              label="Country"
              editing={editing}
              value={form.country}
              onChange={(value) =>
                updateField(
                  'country',
                  value
                )
              }
              placeholder="Enter country"
            />

            {/* PIN */}
            <ProfileField
              label="PIN Code"
              editing={editing}
              value={form.pinCode}
              onChange={(value) =>
                updateField(
                  'pinCode',
                  value.replace(/\D/g, '').slice(0, 6)
                )
              }
              placeholder="Enter 6-digit PIN"
              inputMode="numeric"
              maxLength={6}
            />

          </div>
        </div>

        {/* ADDRESS */}
        <div className="mt-5">

          <label className="field-group">

            <span className="field-label-top">
              Address
            </span>

            {editing ? (
              <textarea
                className="text-input min-h-[100px] resize-none"
                value={form.address}
                onChange={(e) =>
                  updateField(
                    'address',
                    e.target.value
                  )
                }
                placeholder="Enter your address"
              />
            ) : (
              <div className="flex min-h-[70px] items-start gap-3 rounded-[14px] border border-[color:var(--surface-border)] bg-[color:var(--surface-soft)] px-4 py-3">

                <MapPin
                  size={18}
                  className="mt-1 shrink-0 text-[color:var(--primary)]"
                />

                <span className="text-sm leading-6 text-[color:var(--text-primary)]">
                  {currentUser?.address ||
                    'Not added'}
                </span>

              </div>
            )}

          </label>

        </div>

        {/* SAVE HOROSCOPE */}
        <div className="mt-6 rounded-[18px] border border-[color:var(--surface-border)] bg-[color:var(--surface-soft)] p-5">

          <div className="flex items-start justify-between gap-4">

            <div className="flex gap-3">

              <ShieldCheck
                size={21}
                className="mt-0.5 text-[color:var(--primary)]"
              />

              <div>
                <div className="font-semibold text-[color:var(--text-primary)]">
                  Save my horoscope details
                </div>

                <p className="mt-1 text-sm leading-5 text-[color:var(--muted)]">
                  Your saved birth details can be used automatically when you choose “Use my saved horoscope”.
                </p>
              </div>

            </div>

            <button
              type="button"
              disabled={!editing}
              onClick={() =>
                updateField(
                  'saveHoroscope',
                  !form.saveHoroscope
                )
              }
              className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                form.saveHoroscope
                  ? 'bg-[color:var(--primary)]'
                  : 'bg-[color:var(--surface-border)]'
              }`}
            >
              <span
                className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition ${
                  form.saveHoroscope
                    ? 'left-6'
                    : 'left-1'
                }`}
              />
            </button>

          </div>

        </div>

        {/* PRIVACY */}
        <div className="mt-4 flex gap-3 rounded-[16px] bg-[color:var(--surface-soft)] px-4 py-3">

          <ShieldCheck
            size={18}
            className="mt-0.5 shrink-0 text-[color:var(--primary)]"
          />

          <p className="text-xs leading-5 text-[color:var(--muted)]">
            Your horoscope details are private and will only be shared with an astrologer when you choose to use your saved horoscope.
          </p>

        </div>

      </section>

      {!editing && (
        <div className="mt-6 flex justify-center">

          <button
            type="button"
            className="btn btn-outline"
            onClick={() =>
              navigate(routes.dashboard)
            }
          >
            Back to Dashboard
          </button>

        </div>
      )}

    </div>
  )
}


/* ---------------- STAT ---------------- */

function ProfileStat({
  icon: Icon,
  value,
  label,
  onClick,
}) {
  return (
    <div
  role="button"
  tabIndex={0}
  onClick={onClick}
  onKeyDown={(event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onClick?.()
    }
  }}
  className="cursor-pointer rounded-[18px] bg-[color:var(--surface-soft)] p-5 text-center transition hover:-translate-y-0.5 hover:shadow-md"
>

      <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--violet-100)] text-[color:var(--primary)]">
        <Icon size={19} />
      </div>

      <div className="text-2xl font-bold text-[color:var(--text-primary)]">
        {value}
      </div>

      <div className="mt-1 text-sm text-[color:var(--muted)]">
        {label}
      </div>

    </div>
  )
}


/* ---------------- DATE FIELD ---------------- */

function DateField({
  label,
  value,
  editing,
  onChange,
}) {
  const openPicker = (event) => {
    if (!editing) return

    const input = event.currentTarget

    if (typeof input.showPicker === 'function') {
      try {
        input.showPicker()
      } catch {
        // Browser may already have opened the picker.
      }
    }
  }

  return (
    <div className="field-group" style={{ margin: 0 }}>

      <span className="field-label-top">
        {label}
      </span>

      {editing ? (
        <div className="relative w-full">

          <CalendarDays
            size={17}
            className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-[color:var(--primary)]"
          />

          <input
            type="date"
            value={value || ''}
            onChange={(event) =>
              onChange(event.target.value)
            }
            onClick={openPicker}
            onFocus={openPicker}
            className="text-input w-full"
            style={{
              paddingLeft: 44,
              minHeight: 48,
              cursor: 'pointer',
              colorScheme: 'light',
            }}
          />

        </div>
      ) : (
        <div className="flex min-h-[48px] items-center gap-3 rounded-[14px] border border-[color:var(--surface-border)] bg-[color:var(--surface-soft)] px-4">

          <CalendarDays
            size={18}
            className="text-[color:var(--primary)]"
          />

          <span className="text-sm text-[color:var(--text-primary)]">
            {value || 'Not added'}
          </span>

        </div>
      )}

    </div>
  )
}


/* ---------------- TIME FIELD ---------------- */

function TimeField({
  label,
  value,
  editing,
  onChange,
}) {
  const openPicker = (event) => {
    if (!editing) return

    const input = event.currentTarget

    if (typeof input.showPicker === 'function') {
      try {
        input.showPicker()
      } catch {
        // Browser may already have opened the picker.
      }
    }
  }

  return (
    <div className="field-group" style={{ margin: 0 }}>

      <span className="field-label-top">
        {label}
      </span>

      {editing ? (
        <div className="relative w-full">

          <Clock3
            size={17}
            className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-[color:var(--primary)]"
          />

          <input
            type="time"
            value={value || ''}
            onChange={(event) =>
              onChange(event.target.value)
            }
            onClick={openPicker}
            onFocus={openPicker}
            className="text-input w-full"
            style={{
              paddingLeft: 44,
              minHeight: 48,
              cursor: 'pointer',
              colorScheme: 'light',
            }}
          />

        </div>
      ) : (
        <div className="flex min-h-[48px] items-center gap-3 rounded-[14px] border border-[color:var(--surface-border)] bg-[color:var(--surface-soft)] px-4">

          <Clock3
            size={18}
            className="text-[color:var(--primary)]"
          />

          <span className="text-sm text-[color:var(--text-primary)]">
            {value || 'Not added'}
          </span>

        </div>
      )}

    </div>
  )
}


/* ---------------- PROFILE FIELD ---------------- */

function ProfileField({
  label,
  icon: Icon,
  editing,
  value,
  onChange,
  type = 'text',
  placeholder = '',
  inputMode,
  maxLength,
}) {
  return (
    <div
      className="field-group"
      style={{ margin: 0 }}
    >

      <span className="field-label-top">
        {label}
      </span>

      {editing ? (
        <div className="relative w-full">

          {Icon && (
            <Icon
              size={17}
              className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-[color:var(--primary)]"
            />
          )}

          <input
            type={type}
            value={value || ''}
            onChange={(event) =>
              onChange(event.target.value)
            }
            placeholder={placeholder}
            inputMode={inputMode}
            maxLength={maxLength}
            className="text-input w-full"
            style={
              Icon
                ? {
                    paddingLeft: 44,
                    minHeight: 48,
                  }
                : {
                    minHeight: 48,
                  }
            }
          />

        </div>
      ) : (
        <div className="flex min-h-[48px] items-center gap-3 rounded-[14px] border border-[color:var(--surface-border)] bg-[color:var(--surface-soft)] px-4">

          {Icon && (
            <Icon
              size={18}
              className="shrink-0 text-[color:var(--primary)]"
            />
          )}

          <span className="text-sm text-[color:var(--text-primary)]">
            {value || 'Not added'}
          </span>

        </div>
      )}

    </div>
  )
}