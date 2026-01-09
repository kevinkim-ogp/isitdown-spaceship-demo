import { type IronSession } from 'iron-session'

export type SessionData = {
  userId?: string // User ID is a string in Amplify (email address)
}

export type Session = IronSession<SessionData>
