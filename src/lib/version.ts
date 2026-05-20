declare const __APP_VERSION__: string;
declare const __APP_BUILD_DATE__: string;

export const APP_VERSION = __APP_VERSION__;
export const APP_BUILD_DATE = __APP_BUILD_DATE__;
export const APP_BUILD_ID = `v${APP_VERSION} · ${APP_BUILD_DATE}`;
