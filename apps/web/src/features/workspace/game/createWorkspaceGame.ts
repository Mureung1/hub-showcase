import Phaser from "phaser";
import { WorkspaceScene } from "./WorkspaceScene";
import type {
  WorkspaceEventListener,
  WorkspaceGameHandle,
} from "../model/workspace.types";

export function createWorkspaceGame(
  parent: HTMLElement,
  notify: WorkspaceEventListener,
): WorkspaceGameHandle {
  const scene = new WorkspaceScene(notify);
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: 960,
    height: 540,
    backgroundColor: "#e6fbf2",
    pixelArt: true,
    roundPixels: false,
    fps: {
      target: 60,
      forceSetTimeOut: false,
      smoothStep: true,
    },
    physics: {
      default: "arcade",
      arcade: {
        debug: false,
      },
    },
    scale: {
      mode: Phaser.Scale.RESIZE,
    },
    scene,
  });

  game.canvas.setAttribute("aria-label", "PtoP 프로젝트 작업실");
  game.canvas.setAttribute("tabindex", "0");

  return {
    destroy: () => game.destroy(true),
    focus: () => game.canvas.focus(),
    setInputEnabled: (isEnabled) => scene.setInputEnabled(isEnabled),
    setRepositoryInteractions: (interactions) => scene.setRepositoryInteractions(interactions),
  };
}
