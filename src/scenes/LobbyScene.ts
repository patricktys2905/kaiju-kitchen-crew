// Online lobby: host a room (4-letter code) or join one. Same networking as Kitchen Kaiju:
// direct link first, public relay as the backup route.
import * as Phaser from 'phaser';
import { sfx } from '../audio';
import { clearTaps, consumeTap } from '../input';
import { MAX_GUESTS, NetGuest, NetHost, type LobbySeat, type NetMsg } from '../net/net';
import { SPECIES } from '../sim/constants';
import { LEVELS } from '../sim/levels';
import { setTouchMode } from '../touch';
import { cycleSpecies, esc, kaijuGrid, levelGrid, mountPanel, seatRow } from '../ui';
import { drawMenuBackdrop } from './MenuScene';
import { playMusic } from '../music';

export class LobbyScene extends Phaser.Scene {
  private root: HTMLElement | null = null;
  private host: NetHost | null = null;
  private guest: NetGuest | null = null;
  private seats: LobbySeat[] = [];
  private mySeat = 0;
  private level = 0;
  private status = '';
  private statusOk = true;
  private view: 'choose' | 'host' | 'join' = 'choose';
  private leaving = false;

  constructor() {
    super('lobby');
  }

  init(data: { reopen?: { host: NetHost; seats: LobbySeat[]; level: number } }): void {
    this.view = 'choose';
    this.host = this.guest = null;
    this.seats = [];
    this.status = '';
    this.leaving = false;
    this.level = 0;
    if (data?.reopen) {
      // back from a game as host: keep the room open
      this.host = data.reopen.host;
      this.seats = data.reopen.seats;
      this.level = data.reopen.level;
      this.view = 'host';
      this.status = `Room ${this.host.code} is open.`;
    }
  }

  create(): void {
    clearTaps();
    setTouchMode('off');
    drawMenuBackdrop(this);
    playMusic('menu');
    this.root = mountPanel('lobby');
    const root = this.root;
    this.events.once('shutdown', () => { root.remove(); this.root = null; });
    if (this.host) this.wireHost(this.host);
    this.render();
  }

  update(): void {
    if (consumeTap('Escape')) this.back();
    clearTaps();
  }

  private back(): void {
    if (this.leaving) return;
    this.leaving = true;
    this.host?.close();
    this.guest?.close();
    this.scene.start('menu');
  }

  private wireHost(host: NetHost): void {
    host.onStatus = (t, ok) => { this.status = t; this.statusOk = ok; this.render(); };
    host.onGuestJoin = (g, name, route) => {
      const taken = new Set(this.seats.map(s => s.species));
      const free = SPECIES.map((_, k) => k).filter(k => !taken.has(k));
      this.seats.push({ who: 'guest', guest: g, name, species: free[0] ?? 0, route });
      sfx.join(this.seats.length);
      this.syncLobby();
    };
    host.onGuestLeave = g => { this.seats = this.seats.filter(s => s.guest !== g); sfx.leave(); this.syncLobby(); };
    host.onPick = (g, dir) => { const i = this.seats.findIndex(s => s.guest === g); if (i >= 0) this.cycle(i, dir); };
    host.onChoose = (g, sp) => { const i = this.seats.findIndex(s => s.guest === g); if (i >= 0) this.choose(i, sp); };
  }

  private startHosting(): void {
    const host = new NetHost();
    this.host = host;
    this.view = 'host';
    this.mySeat = 0;
    const myName = (this.root?.querySelector<HTMLInputElement>('#lb-hostname')?.value ?? '').trim() || localStorage.getItem('kkc-name') || 'Host';
    localStorage.setItem('kkc-name', myName);
    this.seats = [{ who: 'host', name: myName, species: 0 }];
    this.wireHost(host);
    this.status = 'Opening a room…';
    host.open();
    this.render();
  }

  private joinRoom(code: string, name: string): void {
    if (!/^[A-Z]{4}$/i.test(code)) { this.status = 'Room codes are 4 letters.'; this.statusOk = false; this.render(); return; }
    localStorage.setItem('kkc-name', name);
    this.guest?.close();
    const guest = new NetGuest();
    this.guest = guest;
    guest.onStatus = (t, ok) => { this.status = t; this.statusOk = ok; this.render(); };
    guest.onClosed = reason => { this.status = reason; this.statusOk = false; this.seats = []; this.guest = null; this.render(); };
    guest.onMsg = (m: NetMsg) => {
      if (m.t === 'lobby') { this.seats = m.seats; this.mySeat = m.you; this.level = m.level; this.render(); }
      if (m.t === 'start') this.launchGuest(m);
    };
    guest.join(code, name || 'Friend');
  }

  private choose(i: number, sp: number): void {
    if (sp < 0 || sp >= SPECIES.length || this.seats.some((s, k) => k !== i && s.species === sp)) return;
    this.seats[i].species = sp;
    sfx.pickup();
    this.syncLobby();
  }

  private cycle(i: number, dir: number): void {
    const taken = new Set(this.seats.filter((_, k) => k !== i).map(s => s.species));
    this.seats[i].species = cycleSpecies(this.seats[i].species, dir, taken);
    sfx.pickup();
    this.syncLobby();
  }

  private syncLobby(): void {
    if (!this.host) return;
    this.seats.forEach((s, i) => {
      if (s.who === 'guest' && s.guest !== undefined) this.host!.send(s.guest, { t: 'lobby', seats: this.seats, you: i, level: this.level });
    });
    this.render();
  }

  private startGame(): void {
    const host = this.host;
    if (!host || this.seats.length < 2) return;
    const species = this.seats.map(s => s.species);
    const names = this.seats.map(s => s.name);
    this.seats.forEach((s, i) => { if (s.who === 'guest' && s.guest !== undefined) host.send(s.guest, { t: 'start', species, names, seat: i, level: this.level }); });
    this.leaving = true;
    this.scene.start('game', { mode: 'host', species, names, level: this.level, host, seats: this.seats });
  }

  private launchGuest(m: Extract<NetMsg, { t: 'start' }>): void {
    if (!this.guest) return;
    this.leaving = true;
    this.scene.start('game', { mode: 'guest', species: m.species, names: m.names, level: m.level, guest: this.guest, seat: m.seat });
  }

  private render(): void {
    const root = this.root;
    if (!root) return;
    const statusHtml = this.status ? `<div class="status ${this.statusOk ? '' : 'bad'}">${esc(this.status)}</div>` : '';
    const seatsHtml = this.seats.map((s, i) => {
      const mine = this.host ? s.who === 'host' : i === this.mySeat;
      const route = s.route === 'backup' ? ' · backup route (slower)' : s.route === 'direct' ? ' · direct link' : '';
      return seatRow(s.species, s.name, mine, `${mine ? ' (you)' : ''}${s.who === 'host' ? ' · host' : ''}${route}`);
    }).join('');
    const meIdx = this.host ? 0 : this.mySeat;
    const takenBy = new Map(this.seats.filter((_, k) => k !== meIdx).map(s => [s.species, s.name.slice(0, 6)] as [number, string]));
    const grid = this.seats[meIdx] ? kaijuGrid(this.seats[meIdx].species, takenBy) : '';
    let html = '';
    if (this.view === 'choose') {
      html = `<h1>Play online</h1>
        <p>Play with friends on their own phones or computers, from anywhere. One person hosts and shares a 4-letter room code. Everyone needs the game open (2–6 kaiju).</p>
        <p class="muted">Uses free public servers to connect you; if a direct link is blocked it switches to a slower backup route automatically.</p>
        <div class="row"><input id="lb-hostname" class="name" maxlength="12" placeholder="Your name" value="${esc(localStorage.getItem('kkc-name') ?? '')}"></div>
        <div class="row"><button class="go" data-act="host">Host a game</button><button data-act="joinview">Join a game</button><button data-act="back">Back</button></div>`;
    } else if (this.view === 'host') {
      const guests = this.seats.filter(s => s.who === 'guest').length;
      html = `<h1>Your kitchen</h1>
        <div class="code">${this.host?.code || '····'}</div>
        <p class="muted">Friends tap PLAY ONLINE → Join a game and type this code. Up to ${MAX_GUESTS} friends.</p>
        ${seatsHtml}
        ${grid}
        <h2>Level</h2>
        ${levelGrid(this.level)}
        <div class="row"><button class="go" data-act="start" ${guests ? '' : 'disabled'}>Start cooking ▶</button><button data-act="back">Close room</button></div>
        ${guests ? '' : '<p class="muted">Waiting for at least one friend to join…</p>'}
        ${statusHtml}`;
    } else {
      const saved = localStorage.getItem('kkc-name') ?? '';
      html = this.seats.length
        ? `<h1>You're in!</h1>${seatsHtml}${grid}
           <p class="muted">Pick your kaiju with ◀ ▶. Level: <b>${esc(LEVELS[this.level]?.name ?? '')}</b>. The host starts the game.</p>${statusHtml}
           <div class="row"><button data-act="back">Leave</button></div>`
        : `<h1>Join a game</h1>
           <p>Room code from your host:</p>
           <div class="row"><input id="lb-code" maxlength="4" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="ABCD">
             <input id="lb-name" class="name" maxlength="12" placeholder="Your name" value="${esc(saved)}"></div>
           <div class="row"><button class="go" data-act="join">Join</button><button data-act="back">Back</button></div>${statusHtml}`;
    }
    root.innerHTML = `<div class="panel">${html}</div>`;
    root.querySelectorAll<HTMLButtonElement>('button[data-act]').forEach(b => b.addEventListener('click', () => this.act(b.dataset.act!)));
    root.querySelectorAll<HTMLButtonElement>('button[data-pick]').forEach(b => b.addEventListener('click', () => {
      const dir = Number(b.dataset.pick);
      if (this.host) this.cycle(0, dir);
      else this.guest?.send({ t: 'pick', dir });
    }));
    root.querySelectorAll<HTMLButtonElement>('button[data-kaiju]').forEach(b => b.addEventListener('click', () => {
      const sp = Number(b.dataset.kaiju);
      if (this.host) this.choose(0, sp);
      else this.guest?.send({ t: 'choose', species: sp });
    }));
    root.querySelectorAll<HTMLButtonElement>('button[data-level]').forEach(b => b.addEventListener('click', () => { this.level = Number(b.dataset.level); sfx.ui(); this.syncLobby(); }));
    root.querySelector<HTMLInputElement>('#lb-code')?.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') this.act('join'); });
    root.querySelectorAll<HTMLInputElement>('#lb-name, #lb-hostname').forEach(i => i.addEventListener('keydown', e => e.stopPropagation()));
  }

  private act(a: string): void {
    sfx.ui();
    if (a === 'back') { this.back(); return; }
    if (a === 'host') this.startHosting();
    if (a === 'joinview') { this.view = 'join'; this.status = ''; this.render(); setTimeout(() => this.root?.querySelector<HTMLInputElement>('#lb-code')?.focus(), 50); }
    if (a === 'join') {
      const code = (this.root?.querySelector<HTMLInputElement>('#lb-code')?.value ?? '').trim().toUpperCase();
      const name = (this.root?.querySelector<HTMLInputElement>('#lb-name')?.value ?? '').trim();
      this.joinRoom(code, name);
    }
    if (a === 'start') this.startGame();
  }
}
