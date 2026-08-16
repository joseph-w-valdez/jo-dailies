import { appConfig } from '../config'

/** Whether debug / hotseat tooling is on — controlled by `src/config.ts`. */
export function isDebugEnabled(): boolean {
  return appConfig.debug
}

/** TEMP Guess Who solo board seeding — see `appConfig.debugGuessWho`. */
export function isGuessWhoDebugEnabled(): boolean {
  return appConfig.debugGuessWho
}
