import { appConfig } from '../config'

/** Whether debug / hotseat tooling is on — controlled by `src/config.ts`. */
export function isDebugEnabled(): boolean {
  return appConfig.debug
}
