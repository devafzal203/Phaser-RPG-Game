<script lang="ts">
  import { onMount } from "svelte";
  import { browser } from "$app/environment";

  let gameContainer: HTMLDivElement;

  onMount(() => {
    if (browser) {
      (async () => {
        const [{ default: Phaser }, { GameScene }] = await Promise.all([
          import("phaser"),
          import("$lib/game/game"),
        ]);

        const config = {
          type: Phaser.AUTO,
          width: 800,
          height: 600,
          parent: gameContainer,
          physics: {
            default: "arcade",
            arcade: {
              gravity: { y: 0, x: 0 },
              debug: false,
            },
          },
          scene: GameScene,
        };

        const game = new Phaser.Game(config);

        // Return a cleanup function to destroy the game instance
        return () => {
          game.destroy(true);
        };
      })();
    }
  });
</script>

<div class="w-full h-screen flex items-center justify-center bg-gray-900">
  <div
    bind:this={gameContainer}
    class="rounded-lg overflow-hidden shadow-lg"
  ></div>
</div>
