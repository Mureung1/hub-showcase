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
  formatWorkspaceRepositoryDate,
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
  up: 12,
} as const;
const PLAYER_ANIMATION_FRAMES = {
  down: [0, 1, 2, 3],
  left: [4, 5, 6, 4],
  right: [8, 9, 10, 8],
  up: [12, 13, 14, 12],
} as const;
const PLAYER_SPRITE_ROW_OFFSETS = {
  3: -16,
  2: -20,
} as const;
type PlayerDirection = keyof typeof PLAYER_DIRECTION_FRAMES;

export class WorkspaceScene extends Phaser.Scene {
  private readonly notify: WorkspaceEventListener;
  private inputManager: InputManager | null = null;
  private player: Phaser.Physics.Arcade.Sprite | null = null;
  private activeInteraction: WorkspaceInteraction | null = null;
  private isInputEnabled = true;
  private isPlayerMoving = false;
  private lastDirection: PlayerDirection = "down";
  private interactions: WorkspaceInteraction[] = workspaceInteractions;
  private repositoryMarkerLayer: Phaser.GameObjects.Container | null = null;
  private repositoryMarkerTweens: Phaser.Tweens.Tween[] = [];
  private newAnalysisMarkerTween: Phaser.Tweens.Tween | null = null;

  constructor(notify: WorkspaceEventListener) {
    super({ key: "PtoPWorkspaceScene" });
    this.notify = notify;
  }

  preload() {
    this.load.image(workspaceAssetKeys.map, workspaceAssets.map);
    this.load.image(workspaceAssetKeys.tileset, workspaceAssets.tileset);
    this.load.image(workspaceAssetKeys.furniture, workspaceAssets.furniture);
    this.load.spritesheet(
      workspaceAssetKeys.playerSource,
      workspaceAssets.player,
      {
        frameWidth: workspaceSpriteSheet.frameSize,
        frameHeight: workspaceSpriteSheet.frameSize,
      },
    );
    this.load.spritesheet(
      workspaceAssetKeys.poppySource,
      workspaceAssets.poppy,
      {
        frameWidth: workspaceSpriteSheet.frameSize,
        frameHeight: workspaceSpriteSheet.frameSize,
      },
    );
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
        fitToFrameGrid: true,
        rowOffsets: PLAYER_SPRITE_ROW_OFFSETS,
        removeGroundShadow: true,
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

    const isMoving = velocity.lengthSq() > 0;

    if (isMoving) {
      velocity.normalize().scale(PLAYER_SPEED);
      this.updatePlayerDirection(velocity);
    } else if (this.isPlayerMoving) {
      this.player.anims.stop();
      this.player.setFrame(this.getIdleFrame());
    }

    this.isPlayerMoving = isMoving;
    this.player.setVelocity(velocity.x, velocity.y);

    const nextInteraction = findNearestInteraction(
      { x: this.player.x, y: this.player.y },
      this.interactions,
    );

    if (nextInteraction?.id !== this.activeInteraction?.id) {
      this.activeInteraction = nextInteraction;
      this.notify({
        type: "interaction-changed",
        interaction: nextInteraction,
      });
    }

    if (
      nextInteraction?.kind === "new-analysis" &&
      this.inputManager.didPressInteract()
    ) {
      this.notify({ type: "open-new-analysis" });
    } else if (
      nextInteraction?.kind === "repository" &&
      this.inputManager.didPressInteract()
    ) {
      this.notify({
        type: "open-repository",
        repositoryId: nextInteraction.repositoryId,
      });
    }
  }

  setInputEnabled(isEnabled: boolean) {
    this.isInputEnabled = isEnabled;
    this.inputManager?.setEnabled(isEnabled);

    if (!isEnabled) {
      this.player?.setVelocity(0, 0);
    }
  }

  setRepositoryInteractions(interactions: WorkspaceInteraction[]) {
    this.interactions = [...workspaceInteractions, ...interactions];
    this.activeInteraction = null;
    this.renderRepositoryMarkers(interactions);
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
        .sprite(
          prop.position.x,
          prop.position.y,
          workspaceAssetKeys.poppy,
          prop.variant ?? 0,
        )
        .setScale(workspaceSpriteSheet.displayScale)
        .setDepth(prop.position.y);

      sprite.play("poppy-idle");

      if (prop.interactionId === "new-analysis") {
        sprite.setTint(0xc5f6dd);
      }
    }

    const newAnalysis = workspaceInteractions.find(
      ({ id }) => id === "new-analysis",
    );
    if (newAnalysis) {
      this.add
        .circle(
          newAnalysis.position.x,
          newAnalysis.position.y,
          30,
          0x61d7aa,
          0.18,
        )
        .setDepth(100)
        .setStrokeStyle(2, 0x61d7aa, 0.5);
    }

    this.repositoryMarkerLayer = this.add.container(0, 0).setDepth(1_200);
    this.renderRepositoryMarkers(
      this.interactions.filter(
        (interaction) => interaction.kind === "repository",
      ),
    );
  }

  private renderRepositoryMarkers(interactions: WorkspaceInteraction[]) {
    if (!this.repositoryMarkerLayer) {
      return;
    }

    this.repositoryMarkerLayer.removeAll(true);
    this.repositoryMarkerTweens.forEach((tween) => {
      tween.stop();
      tween.remove();
    });
    this.repositoryMarkerTweens = [];
    this.newAnalysisMarkerTween?.stop();
    this.newAnalysisMarkerTween?.remove();
    this.newAnalysisMarkerTween = null;

    for (const [index, interaction] of interactions.entries()) {
      if (interaction.kind !== "repository") {
        continue;
      }

      const markerX = interaction.position.x + 10;
      const markerY = interaction.position.y - 44;
      const marker = this.add.container(
        markerX,
        markerY,
      );
      const repositoryName = interaction.repositoryName ?? interaction.label;
      const displayRepositoryName =
        Array.from(repositoryName.trim()).length > 20
          ? `${Array.from(repositoryName.trim()).slice(0, 19).join("")}…`
          : repositoryName.trim();
      const dateLabel = formatWorkspaceRepositoryDate(
        interaction.updatedAt ?? "",
      );
      const repositoryLabel = this.add
        .text(0, -8, displayRepositoryName, {
          color: "#f3f8f5",
          fontFamily: "Pretendard, Arial, sans-serif",
          fontSize: "10px",
          fontStyle: "bold",
          align: "center",
          resolution: 3,
        })
        .setOrigin(0.5);
      const date = this.add
        .text(0, 9, dateLabel, {
          color: "#62e0a6",
          fontFamily: "Pretendard, Arial, sans-serif",
          fontSize: "9px",
          fontStyle: "bold",
          align: "center",
          resolution: 3,
        })
        .setOrigin(0.5);
      const bubbleWidth = Math.max(repositoryLabel.width, date.width) + 24;
      const labelBackground = this.add.graphics();
      labelBackground.fillStyle(0x0d1814, 0.78);
      labelBackground.fillRoundedRect(
        -bubbleWidth / 2,
        -23,
        bubbleWidth,
        46,
        9,
      );

      marker.add([labelBackground, repositoryLabel, date]);
      this.repositoryMarkerLayer.add(marker);
      this.repositoryMarkerTweens.push(
        this.tweens.add({
          targets: marker,
          y: markerY - 4,
          duration: 1_450 + (index % 3) * 180,
          delay: (index % 3) * 130,
          ease: "Sine.InOut",
          yoyo: true,
          repeat: -1,
        }),
      );
    }

    this.renderNewAnalysisMarker();
  }

  private renderNewAnalysisMarker() {
    if (!this.repositoryMarkerLayer) {
      return;
    }

    const newAnalysis = this.interactions.find(
      ({ id }) => id === "new-analysis",
    );
    if (!newAnalysis) {
      return;
    }

    const markerY = newAnalysis.position.y - 100;
    const marker = this.add.container(newAnalysis.position.x + 4, markerY);
    const title = this.add
      .text(0, 0, "+ 새 Repository 분석", {
        color: "#062b1c",
        fontFamily: "Pretendard, Arial, sans-serif",
        fontSize: "12px",
        fontStyle: "bold",
        resolution: 3,
      })
      .setOrigin(0.5);
    const key = this.add
      .text(0, 0, "E", {
        color: "#dfffee",
        backgroundColor: "#0c6b4a",
        fontFamily: "Pretendard, Arial, sans-serif",
        fontSize: "12px",
        fontStyle: "bold",
        padding: { left: 6, right: 6, top: 4, bottom: 4 },
        resolution: 3,
      })
      .setOrigin(0.5);
    const contentGap = 10;
    const bubbleWidth = title.width + contentGap + key.width + 28;
    const titleX = -bubbleWidth / 2 + 14 + title.width / 2;
    const keyX = bubbleWidth / 2 - 14 - key.width / 2;
    title.setX(titleX);
    key.setX(keyX);

    const bubble = this.add.graphics();
    bubble.fillStyle(0x67e5a3, 0.98);
    bubble.fillRoundedRect(-bubbleWidth / 2, -24, bubbleWidth, 48, 12);
    bubble.fillTriangle(-10, 24, 10, 24, 0, 35);
    bubble.lineStyle(2, 0x0d3526, 0.55);
    bubble.strokeRoundedRect(-bubbleWidth / 2, -24, bubbleWidth, 48, 12);

    marker.add([bubble, title, key]);
    this.repositoryMarkerLayer.add(marker);
    this.newAnalysisMarkerTween = this.tweens.add({
      targets: marker,
      y: markerY - 6,
      duration: 1_250,
      ease: "Sine.InOut",
      yoyo: true,
      repeat: -1,
    });
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
      WORKSPACE_WIDTH / 2.01,
      145,
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
        frames: frames.map((frame) => ({
          key: workspaceAssetKeys.player,
          frame,
        })),
        frameRate: 7,
        repeat: -1,
      });
    }

    this.anims.create({
      key: "poppy-idle",
      frames: [0, 1, 2, 3].map((frame) => ({
        key: workspaceAssetKeys.poppy,
        frame,
      })),
      frameRate: 4,
      repeat: -1,
    });
  }

  private updatePlayerDirection(velocity: Phaser.Math.Vector2) {
    const nextDirection =
      Math.abs(velocity.x) > Math.abs(velocity.y)
        ? velocity.x < 0
          ? "left"
          : "right"
        : velocity.y < 0
          ? "up"
          : "down";

    if (this.lastDirection !== nextDirection) {
      this.lastDirection = nextDirection;
      this.player?.anims.stop();
    }

    const animationKey = `player-${this.lastDirection}`;
    const playerAnimations = this.player?.anims;
    if (playerAnimations?.currentAnim?.key !== animationKey) {
      playerAnimations?.play(animationKey, true);
    } else if (playerAnimations && !playerAnimations.isPlaying) {
      playerAnimations.play(animationKey, true);
    }
  }

  private getIdleFrame() {
    return PLAYER_DIRECTION_FRAMES[this.lastDirection];
  }
}
