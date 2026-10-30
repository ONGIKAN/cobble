/** 构建时由 vite define 注入的版本号（取自根 package.json） */
export const APP_VERSION = __COBBLE_VERSION__;

/** 发布通道：stable 为正式版，beta 为测试版在线演示 */
export const APP_CHANNEL = __COBBLE_CHANNEL__;
export const IS_BETA = APP_CHANNEL === 'beta';
