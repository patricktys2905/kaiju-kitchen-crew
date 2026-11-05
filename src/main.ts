import * as Phaser from 'phaser';
import { unlockAudio } from './audio';
import { initInput, injectTap } from './input';
import { initPwa } from './pwa';
import { RES } from './render/art';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { LobbyScene } from './scenes/LobbyScene';
import { LocalScene } from './scenes/LocalScene';
import { MenuScene } from './scenes/MenuScene';
import { VIEW } from './sim/constants';
import { initTouch } from './touch';

initInput(unlockAudio);
initTouch(injectTap);
initPwa();

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'app',
  backgroundColor: '#140e0a',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: VIEW.w * RES, height: VIEW.h * RES },
  render: { antialias: true },
  scene: [BootScene, MenuScene, LocalScene, LobbyScene, GameScene],
});

// Handy for debugging and the automated smoke tests.
(window as unknown as { __game: Phaser.Game }).__game = game;
