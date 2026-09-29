import { getUserTxnTypeLabel, parseUserTxn } from './userWallet.js'

// Pure selectors for the Admin -> Payments & Finance module.
//
// The app currently keeps ONE wallet (astroconnect-app-data-user-wallet) with no
// owner on the wallet and none on its transactions. There is therefore no
// user-linked transaction record anywhere in the project today.
//
// Nothing here invents that link. selectUserLinkedTransactions() returns only
// records that genuinely carry a user reference, so this module stays correct
// the moment transactions are stored per user, and stays honestly empty until
// then. Wallet maths, running balances and settlement are not reimplemented.

function transactionUserReference(transaction) {
  return transaction?.userId || transaction?.userEmail || transaction?.accountId || ''
}

export function getTransactionUserName(transaction) {
  return transaction?.userName || transaction?.userEmail || transactionUserReference(transaction)
}

// Existing wallet records store a formatted amount string; parseUserTxn also
// normalises the type label using the same helper the user wallet pages use.
export function normalizeTransaction(transaction) {
  return parseUserTxn(transaction)
}

export function getTransactionStatus(transaction) {
  return String(transaction?.status || '').trim()
}

export function selectUserLinkedTransactions(userWallet) {
  const transactions = Array.isArray(userWallet?.transactions) ? userWallet.transactions : []
  return transactions
    .filter((transaction) => Boolean(transactionUserReference(transaction)))
    .map(normalizeTransaction)
}

export function selectTransactionStatusFilters(transactions) {
  const statuses = new Set()
  for (const transaction of Array.isArray(transactions) ? transactions : []) {
    const status = getTransactionStatus(transaction)
    if (status) statuses.add(status)
  }
  return ['All', ...Array.from(statuses).sort((a, b) => a.localeCompare(b))]
}

export function matchesTransactionQuery(transaction, query) {
  const search = String(query || '').trim().toLowerCase()
  if (!search) return true
  return [transaction?.id, transaction?.label, getTransactionUserName(transaction)].some((field) =>
    String(field || '').toLowerCase().includes(search),
  )
}

export function filterAdminTransactions(transactions, { query = '', status = 'All' } = {}) {
  return (Array.isArray(transactions) ? transactions : []).filter((transaction) => {
    if (!matchesTransactionQuery(transaction, query)) return false
    if (status && status !== 'All' && getTransactionStatus(transaction) !== status) return false
    return true
  })
}

export function findAdminTransaction(transactions, transactionId) {
  return (Array.isArray(transactions) ? transactions : []).find((transaction) => transaction.id === transactionId) || null
}

export { getUserTxnTypeLabel }
