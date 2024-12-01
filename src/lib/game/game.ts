import Phaser from "phaser";

export class GameScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private otherPlayers: Map<string, Phaser.Physics.Arcade.Sprite> = new Map();
  private socket!: WebSocket;
  // private playerId: string = "";
  private lastPosition = { x: 0, y: 0 };
  private lastDirection = "down";
  private audioStarted = false;

  constructor() {
    super({ key: "GameScene" });
  }

  init() {
    this.socket = new WebSocket(`ws://${window.location.host}/`);
    this.setupSocketListeners();
  }

  preload() {
    this.load.spritesheet("character", "/assets/character.png", {
      frameWidth: 32,
      frameHeight: 48,
    });
    this.load.image("tiles", "/assets/terrain.png");
    this.load.tilemapTiledJSON("map", "/assets/map.json");
  }

  create() {
    // Create map
    if (!this.audioStarted) {
      this.sound.pauseOnBlur = false;
      this.game.canvas.addEventListener("click", () => {
        if (!this.audioStarted) {
          if ("context" in this.sound) {
            (this.sound as Phaser.Sound.WebAudioSoundManager).context.resume();
          }
          this.audioStarted = true;
        }
      });
    }

    const mapData = {
      width: 30,
      height: 20,
      tilewidth: 32,
      tileheight: 32,
      layers: [
        {
          name: "ground",
          type: "tilelayer",
          width: 30,
          height: 20,
          data: Array(600).fill(1), // Creates a 30x20 map filled with tile index 1
        },
      ],
      tilesets: [
        {
          name: "terrain",
          firstgid: 1,
          tilewidth: 32,
          tileheight: 32,
          image: "terrain",
          columns: 10,
          tilecount: 100,
        },
      ],
    };

    const map = this.make.tilemap({ key: "map" });
    const tileset = map.addTilesetImage("terrain", "tiles");
    if (tileset) {
      const groundLayer = map.createLayer(0, tileset, 0, 0);

      if (groundLayer) {
        groundLayer.setCollisionByProperty({ collides: true });
        this.physics.add.collider(this.player, groundLayer);
      }
    }
    const obstaclesLayer = map.createLayer("obstacles", tileset!);
    obstaclesLayer?.setCollisionByProperty({ collides: true });

    // Create player
    this.player = this.physics.add.sprite(100, 100, "character");
    this.physics.add.collider(this.player, obstaclesLayer!);

    // Create animations
    this.createAnimations();

    // Set up camera
    this.cameras.main.startFollow(this.player);

    // Set up controls
    this.setupControls();
  }

  private setupSocketListeners() {
    this.socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      switch (data.type) {
        case "playerList":
          data.players.forEach((player: any) => this.addOtherPlayer(player));
          break;
        case "newPlayer":
          this.addOtherPlayer(data.player);
          break;
        case "playerLeft":
          this.removeOtherPlayer(data.playerId);
          break;
        case "playerMove":
          this.handlePlayerMove(data);
          break;
      }
    };
  }

  private createAnimations() {
    const directions = ["down", "up", "left", "right"];
    directions.forEach((direction, index) => {
      this.anims.create({
        key: `walk-${direction}`,
        frames: this.anims.generateFrameNumbers("character", {
          start: index * 4,
          end: index * 4 + 3,
        }),
        frameRate: 10,
        repeat: -1,
      });
    });
  }

  private setupControls() {
    this.input?.keyboard?.on("keydown", (event: KeyboardEvent) => {
      const position = { x: this.player.x, y: this.player.y };
      let direction = this.lastDirection;

      switch (event.key) {
        case "ArrowUp":
          direction = "up";
          break;
        case "ArrowDown":
          direction = "down";
          break;
        case "ArrowLeft":
          direction = "left";
          break;
        case "ArrowRight":
          direction = "right";
          break;
      }

      if (
        position.x !== this.lastPosition.x ||
        position.y !== this.lastPosition.y ||
        direction !== this.lastDirection
      ) {
        this.lastPosition = position;
        this.lastDirection = direction;

        this.socket.send(
          JSON.stringify({
            type: "playerMove",
            position,
            direction,
          })
        );
      }
    });
  }

  private addOtherPlayer(playerData: any) {
    const sprite = this.physics.add.sprite(
      playerData.position.x,
      playerData.position.y,
      "character"
    );
    this.otherPlayers.set(playerData.id, sprite);
  }

  private removeOtherPlayer(playerId: string) {
    const player = this.otherPlayers.get(playerId);
    if (player) {
      player.destroy();
      this.otherPlayers.delete(playerId);
    }
  }

  private handlePlayerMove(data: any) {
    const otherPlayer = this.otherPlayers.get(data.playerId);
    if (otherPlayer) {
      otherPlayer.setPosition(data.position.x, data.position.y);
      otherPlayer.play(`walk-${data.direction}`, true);
    }
  }

  update() {
    const cursors = this.input?.keyboard?.createCursorKeys();
    const speed = 160;

    if (cursors?.left.isDown) {
      this.player.setVelocityX(-speed);
      this.player.anims.play("walk-left", true);
    } else if (cursors?.right.isDown) {
      this.player.setVelocityX(speed);
      this.player.anims.play("walk-right", true);
    } else {
      this.player.setVelocityX(0);
    }

    if (cursors?.up.isDown) {
      this.player.setVelocityY(-speed);
      this.player.anims.play("walk-up", true);
    } else if (cursors?.down.isDown) {
      this.player.setVelocityY(speed);
      this.player.anims.play("walk-down", true);
    } else {
      this.player.setVelocityY(0);
    }

    if (
      this.player?.body?.velocity.x === 0 &&
      this.player.body.velocity.y === 0
    ) {
      this.player.anims.stop();
    }
  }
}
