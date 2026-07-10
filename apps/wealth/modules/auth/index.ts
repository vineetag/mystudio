// Module boundary — import auth functionality from here only.

export { getViewer, isOwnerEmail, requireOwner } from "./session"
export type { Viewer, ViewerMode } from "./session"
export { requestMagicLink, signOut } from "./actions"
export type { RequestMagicLinkResult } from "./actions"
