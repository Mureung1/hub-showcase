import { defaultOpenWindowIds, type WindowId } from "../data/windowRegistry";

export type RestartTargetScreen = "wizard";

export interface RestartServiceTarget {
  screen: RestartTargetScreen;
  openWindows: WindowId[];
}

export function getRestartServiceTarget(): RestartServiceTarget {
  return {
    screen: "wizard",
    openWindows: [...defaultOpenWindowIds],
  };
}
