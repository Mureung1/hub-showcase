import Phaser from "phaser";
import { findNearestInteraction } from "./InteractionManager";
import { InputManager } from "./InputManager";
import { createTransparentSpriteSheet } from "./createTransparentSpriteSheet";
import {
  workspaceAssetKeys,
  workspaceAssets,
  workspaceSpriteSheet,
} from "../model/workspaceAssets";
import {
  WORKSPACE_HEIGHT,
  WORKSPACE_WIDTH,
  workspaceColliders,
  workspaceInteractions,
  workspaceProps,
} from "../model/workspaceMap";
import type {
  WorkspaceEventListener,
  WorkspaceInteraction,
} from "../model/workspace.types";

const PLAYER_SPEED = 190;
const PLAYER_DIRECTION_FRAMES = {
  down: 0,
  left: 4,
  right: 8,
  up: 13,
} as const;
const PLAYER_ANIMATION_FRAMES = {
  down: [0, 1, 2, 1],
  left: [4, 5, 6, 5],
  right: [8, 9, 10, 9],
  up: [13, 14, 15, 14],
} as const;
type PlayerDirection = keyof typeof PLAYER_DIRECTION_FRAMES;

export class WorkspaceScene extends Phaser.Scene {
  private readonly notify: WorkspaceEventListener;
  private inputManager: InputManager | null = null;
  private player: Phaser.Physics.Arcade.Sprite | null = null;
  private activeInteraction: WorkspaceInteraction | null = null;
  private isInputEnabled = true;
  private lastDirection: PlayerDirection = "down";

  constructor(notify: WorkspaceEventListener) {
    super({ key: "PtoPWorkspaceScene" });
    this.notify = notify;
  }

  preload() {
    this.load.image(workspaceAssetKeys.map, workspaceAssets.map);
    this.load.image(workspaceAssetKeys.tileset, workspaceAssets.tileset);
    this.load.image(workspaceAssetKeys.furniture, workspaceAssets.furniture);
    this.load.spritesheet(workspaceAssetKeys.playerSource, workspaceAssets.player, {
      frameWidth: workspaceSpriteSheet.frameSize,
      frameHeight: workspaceSpriteSheet.frameSize,
    });
    this.load.spritesheet(workspaceAssetKeys.poppySource, workspaceAssets.poppy, {
      frameWidth: workspaceSpriteSheet.frameSize,
      frameHeight: workspaceSpriteSheet.frameSize,
    });
  }

  create() {
    createTransparentSpriteSheet(
      this,
      workspaceAssetKeys.playerSource,
      workspaceAssetKeys.player,
      {
        frameSize: workspaceSpriteSheet.frameSize,
        columns: workspaceSpriteSheet.columns,
        rows: workspaceSpriteSheet.playerRows,
      },
    );
    createTransparentSpriteSheet(
      this,
      workspaceAssetKeys.poppySource,
      workspaceAssetKeys.poppy,
      {
        frameSize: workspaceSpriteSheet.frameSize,
        columns: workspaceSpriteSheet.columns,
        rows: workspaceSpriteSheet.poppyRows,
      },
    );

    this.createAnimations();
    this.physics.world.setBounds(0, 0, WORKSPACE_WIDTH, WORKSPACE_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORKSPACE_WIDTH, WORKSPACE_HEIGHT);
    this.cameras.main.setBackgroundColor("#273038");
    this.cameras.main.setZoom(this.getCameraZoom());
    this.cameras.main.centerOn(WORKSPACE_WIDTH / 2, WORKSPACE_HEIGHT / 2);

    this.createMapBackground();
    this.createProps();
    this.createObstacles();
    this.createPlayer();
    this.inputManager = new InputManager(this);
    this.inputManager.setEnabled(this.isInputEnabled);
  }

  update() {
    if (!this.player || !this.inputManager) {
      return;
    }

    const movement = this.inputManager.getMovement();
    const velocity = new Phaser.Math.Vector2(movement.x, movement.y);

    if (velocity.lengthSq() > 0) {
      velocity.normalize().scale(PLAYER_SPEED);
      this.updatePlayerDirection(velocity);
    } else {
      this.player.anims.stop();
      this.player.setFrame(this.getIdleFrame());
    }

    this.player.setVelocity(velocity.x, velocity.y);

    const nextInteraction = findNearestInteraction(
      { x: this.player.x, y: this.player.y },
      workspaceInteractions,
    );

    if (nextInteraction?.id !== this.activeInteraction?.id) {
      this.activeInteraction = nextInteraction;
      this.notify({ type: "interaction-changed", interaction: nextInteraction });
    }

    if (nextInteraction?.kind === "new-analysis" && this.inputManager.didPressInteract()) {
      this.notify({ type: "open-new-analysis" });
    }
  }

  setInputEnabled(isEnabled: boolean) {
    this.isInputEnabled = isEnabled;
    this.inputManager?.setEnabled(isEnabled);

    if (!isEnabled) {
      this.player?.setVelocity(0, 0);
    }
  }

  private getCameraZoom() {
    const viewport = this.scale;
    const widthZoom = viewport.width / WORKSPACE_WIDTH;
    const heightZoom = viewport.height / WORKSPACE_HEIGHT;
    return Math.max(1, Math.max(widthZoom, heightZoom));
  }

  private createMapBackground() {
    this.add
      .image(WORKSPACE_WIDTH / 2, WORKSPACE_HEIGHT / 2, workspaceAssetKeys.map)
      .setDisplaySize(WORKSPACE_WIDTH, WORKSPACE_HEIGHT)
      .setDepth(-100);
  }

  private createProps() {
    for (const prop of workspaceProps) {
      const sprite = this.add
        .sprite(prop.position.x, prop.position.y, workspaceAssetKeys.poppy, prop.variant ?? 0)
        .setScale(workspaceSpriteSheet.displayScale)
        .setDepth(prop.position.y);

      sprite.play("poppy-idle");

      if (prop.interactionId === "new-analysis") {
        sprite.setTint(0xc5f6dd);
      }
    }

    const newAnalysis = workspaceInteractions.find(({ id }) => id === "new-analysis");
    if (newAnalysis) {
      this.add
        .circle(newAnalysis.position.x, newAnalysis.position.y, 30, 0x61d7aa, 0.18)
        .setDepth(100)
        .setStrokeStyle(2, 0x61d7aa, 0.5);
    }
  }

  private createObstacles() {
    for (const obstacle of workspaceColliders) {
      const body = this.add.rectangle(
        obstacle.x,
        obstacle.y,
        obstacle.width,
        obstacle.height,
        0x000000,
        0,
      );
      this.physics.add.existing(body, true);

      if (this.player) {
        this.physics.add.collider(this.player, body);
      }
    }
  }

  private createPlayer() {
    this.player = this.physics.add.sprite(
      WORKSPACE_WIDTH / 2,
      WORKSPACE_HEIGHT - 90,
      workspaceAssetKeys.player,
      PLAYER_DIRECTION_FRAMES.down,
    );
    this.player
      .setScale(workspaceSpriteSheet.displayScale)
      .setDepth(999)
      .setCollideWorldBounds(true);

    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    playerBody.setSize(96, 100).setOffset(80, 120);

    const staticBodies = this.physics.world.staticBodies;
    staticBodies.iterate((body) => {
      if (body?.gameObject) {
        this.physics.add.collider(this.player!, body.gameObject);
      }
      return true;
    });
  }

  private createAnimations() {
    for (const [direction, frames] of Object.entries(PLAYER_ANIMATION_FRAMES)) {
      this.anims.create({
        key: `player-${direction}`,
        frames: frames.map((frame) => ({ key: workspaceAssetKeys.player, frame })),
        frameRate: 7,
        repeat: -1,
      });
    }

    this.anims.create({
      key: "poppy-idle",
      frames: [0, 1, 2, 3].map((frame) => ({ key: workspaceAssetKeys.poppy, frame })),
      frameRate: 4,
      repeat: -1,
    });
  }

  private updatePlayerDirection(velocity: Phaser.Math.Vector2) {
    this.lastDirection =
      Math.abs(velocity.x) > Math.abs(velocity.y)
        ? velocity.x < 0
          ? "left"
          : "right"
        : velocity.y < 0
          ? "up"
          : "down";

    const animationKey = `player-${this.lastDirection}`;
    const playerAnimations = this.player?.anims;
    if (
      playerAnimations &&
      (playerAnimations.currentAnim?.key !== animationKey || !playerAnimations.isPlaying)
    ) {
      playerAnimations.play(animationKey);
    }
  }

  private getIdleFrame() {
    return PLAYER_DIRECTION_FRAMES[this.lastDirection];
  }
}
