/**
 * Copy for account management and password flows.
 *
 * Two deliberate choices run through this file.
 *
 * **The forgot-password confirmation never says whether the address was
 * found.** "If that email address has an account..." is not vagueness; a
 * message that distinguished the two cases would let anyone use the form to
 * discover who holds an account here, and on an oversight platform the users
 * are named regulators and businesses.
 *
 * **Nothing here offers to create your own account.** Accounts are issued by
 * an administrator. The login page has no sign-up link because there is no
 * sign-up, and pretending otherwise would send people down a dead end.
 */

export const ACCOUNTS = {
  forgot: {
    title: 'Reset your password',
    intro:
      'Enter the email address for your account. If it has one, we will send a link to set a new password.',
    submit: 'Send reset link',
    // Identical to the server response, and identical for every outcome.
    sent: 'If that email address has an account, a reset link is on its way. The link works once and expires in an hour.',
    backToLogin: 'Back to sign in',
  },
  reset: {
    title: 'Choose a new password',
    intro: 'This link can be used once.',
    newPassword: 'New password',
    confirmPassword: 'Confirm new password',
    submit: 'Set password',
    done: 'Your password has been set. You can sign in now.',
    invalidLink:
      'That reset link is invalid or has expired. Request a new one from the sign-in page.',
    mismatch: 'Those two passwords do not match.',
  },
  change: {
    title: 'Password',
    detail:
      'Changing your password signs you out everywhere else. Any other browser or device using this account will need to sign in again.',
    current: 'Current password',
    next: 'New password',
    confirm: 'Confirm new password',
    submit: 'Change password',
    done: 'Your password has been changed.',
  },
  users: {
    title: 'People',
    detail:
      'Accounts are issued, not requested — there is no public sign-up. Creating one here records who issued it.',
    add: 'Add a person',
    email: 'Email',
    name: 'Name',
    role: 'Role',
    password: 'First password',
    passwordHint:
      'Share this with them directly. They can change it once they sign in.',
    business: 'Business',
    businessHint: 'Required for a business operator, so they only see their own takings.',
    create: 'Create account',
    cancel: 'Cancel',
    deactivate: 'Deactivate',
    reactivate: 'Reactivate',
    inactive: 'Inactive',
    neverSignedIn: 'Never signed in',
    empty: 'No other accounts yet.',
  },
  /** Human labels for the role codes seeded in type_definitions. */
  roleLabel: {
    admin: 'Administrator',
    regulator: 'Regulator',
    merchant: 'Business operator',
  } as Record<string, string>,
  errors: {
    generic: 'Something went wrong. Try again.',
    network: 'Could not reach the server. Check your connection and try again.',
  },
} as const;

/** Mirrors MIN_PASSWORD_LENGTH in backend/app/core/security.py. */
export const MIN_PASSWORD_LENGTH = 12;
