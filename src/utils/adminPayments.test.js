import { describe, it, expect } from 'vitest'
import {
  getTransactionStatus,
  getTransactionUserName,
  selectUserLinkedTransactions,
  matchesTransactionQuery,
} from './adminPayments.js'

// Mirrors the two shapes that coexist in astroconnect-app-data-user-wallet:
// seeded/legacy records that predate the user reference, and records written by
// a signed-in user, which carry that user's own id.
const unownedTransaction = { id: 'uw34', label: 'General question - Business', amount: '-₹100', time: '04:45 PM', date: '2026-02-14', type: 'purchase' }
const linkedTransaction = { id: 'txn-1', label: 'Wallet top-up', amount: '+₹2,000', time: 'just now', date: '2026-09-01', type: 'topup', userId: 'user_priya' }
const nullOwnerTransaction = { id: 'txn-2', label: 'Call with Dr. Rani', amount: '-₹499', time: 'just now', date: '2026-09-02', type: 'purchase', userId: null }

describe('admin payment ownership', () => {
  it('exposes the real user reference a transaction carries', () => {
    expect(getTransactionUserName(linkedTransaction)).toBe('user_priya')
  })

  it('lists only transactions that genuinely carry a user reference', () => {
    const wallet = { transactions: [unownedTransaction, linkedTransaction, nullOwnerTransaction] }
    const selected = selectUserLinkedTransactions(wallet)

    expect(selected.map((txn) => txn.id)).toEqual(['txn-1'])
    // parseUserTxn is the normalizer the admin list already used; it derives a
    // numeric amount and keeps every stored field, including the user reference.
    expect(selected[0]).toMatchObject({ label: 'Wallet top-up', amount: 2000, date: '2026-09-01', type: 'topup', userId: 'user_priya' })
  })

  it('leaves transactions without a user reference unowned rather than guessing', () => {
    expect(getTransactionUserName(unownedTransaction)).toBe('')
    expect(getTransactionUserName(nullOwnerTransaction)).toBe('')
    expect(getTransactionStatus(unownedTransaction)).toBe('')
  })

  it('keeps a wallet whose transactions are all unowned out of the linked list', () => {
    expect(selectUserLinkedTransactions({ transactions: [unownedTransaction] })).toEqual([])
    expect(selectUserLinkedTransactions(undefined)).toEqual([])
  })

  it('searches by the linked user without matching unowned records on a guess', () => {
    expect(matchesTransactionQuery(linkedTransaction, 'user_priya')).toBe(true)
    expect(matchesTransactionQuery(unownedTransaction, 'user_priya')).toBe(false)
    // The label is still searchable, which is not an ownership claim.
    expect(matchesTransactionQuery(unownedTransaction, 'Business')).toBe(true)
  })
})
