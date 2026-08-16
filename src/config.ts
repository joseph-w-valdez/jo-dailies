/** App-wide knobs — flip here, no localStorage / URL juggling. */
export const appConfig = {
  /** Arcade hotseat chooser, extra debug UI, etc. */
  debug: true,
  /**
   * TEMP Guess Who solo board: force hotseat + seed a playing round
   * so you can poke the UI / upcoming 3D board without waiting on P2.
   * Set both this and `debug` back to false before shipping.
   */
  debugGuessWho: true,
} as const
