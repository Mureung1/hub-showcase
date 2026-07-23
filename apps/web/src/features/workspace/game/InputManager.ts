import Phaser from "phaser";

type Movement = {
  x: number;
  y: number;
};

export class InputManager {
  private readonly cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private readonly keys: Record<"up" | "down" | "left" | "right" | "interact", Phaser.Input.Keyboard.Key>;
  private isEnabled = true;

  constructor(scene: Phaser.Scene) {
    const keyboard = scene.input.keyboard;

    if (!keyboard) {
      throw new Error("Workspace keyboard input is not available.");
    }

    this.cursors = keyboard.createCursorKeys();
    this.keys = keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      interact: Phaser.Input.Keyboard.KeyCodes.E,
    }) as typeof this.keys;
  }

  getMovement(): Movement {
    if (!this.isEnabled) {
      return { x: 0, y: 0 };
    }

    return {
      x: Number(this.cursors.right.isDown || this.keys.right.isDown)
        - Number(this.cursors.left.isDown || this.keys.left.isDown),
      y: Number(this.cursors.down.isDown || this.keys.down.isDown)
        - Number(this.cursors.up.isDown || this.keys.up.isDown),
    };
  }

  didPressInteract() {
    return this.isEnabled && Phaser.Input.Keyboard.JustDown(this.keys.interact);
  }

  setEnabled(isEnabled: boolean) {
    this.isEnabled = isEnabled;
  }
}
