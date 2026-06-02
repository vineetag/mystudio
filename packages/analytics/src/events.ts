export const Events = {
  PAGE_VIEW: "page_view",
  BUTTON_CLICK: "button_click",
  FEATURE_USED: "feature_used",
  FORM_SUBMITTED: "form_submitted",
  ERROR_OCCURRED: "error_occurred",
  AUTH_SIGN_IN: "auth_sign_in",
  AUTH_SIGN_OUT: "auth_sign_out",
  AUTH_SIGN_UP: "auth_sign_up",
  SUBSCRIPTION_STARTED: "subscription_started",
  SUBSCRIPTION_CANCELLED: "subscription_cancelled",
} as const

export type EventName = (typeof Events)[keyof typeof Events]
