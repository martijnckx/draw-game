import Player from './player';
import words from './words';
import JoinedMessage from '../messages/outgoing/joined-message.out';
import BaseMessage from '../messages/base-message';
import NewPlayerMessage from '../messages/outgoing/new-player.out';
import ChatMessage from '../messages/chat-message';
import NewChatMessage from '../messages/outgoing/new-chat-message.out';
import NextWordMessage from '../messages/outgoing/next-word.out';
import CorrectGuessMessage from '../messages/outgoing/correct-guess.out';
import CloseGuessMessage from '../messages/outgoing/close-guess.out';
import SpoilerAlertMessage from '../messages/outgoing/spoiler-alert.out';
import AlreadyCorrectMessage from '../messages/outgoing/already-correct.out';
import NewDrawingSettingsMessage from '../messages/outgoing/drawing-settings.out';
import DrawingSettings from '../messages/drawing-settings';
import PlayerNotFoundError from '../logic/player-not-found.error';
import MediaOfferMessage from '../messages/media-offer-message';
import MediaAnswerMessage from '../messages/media-answer-message';
import ICECandidateMessage from '../messages/ice-candidate-message';
import StartGameMessage from '../messages/start-game-message';
import PlayerLeftMessage from '../messages/outgoing/player-left.out';
import ChangeVideoStatusMessage from '../messages/change-video-status';
import PlayerChangedVideoStatus from '../messages/outgoing/player-changed-video-status.out';
import ClearCanvasMessage from '../messages/clear-canvas-message';
import ClearCanvasOut from '../messages/outgoing/clear-canvas.out';

export default class Game {

    get id(): string {
        return this._id;
    }
    private _id: string;
    private _started: boolean = false;
    private _players: Player[];
    private _prevWord: string = '';
    private _currentWord: string = '';
    private _secondsInTimer: number = 90;
    private _gameStartedTime: Date = undefined;
    private _amountOfPlayersGuessing: number = 0;
    private _notGuessingPlayerIds: string[] = [];
    private _usedWords: number[] = [];
    private _guessedCorrectly: string[] = [];
    private _currentDrawerIndex: number = undefined;
    private _timerInterval: NodeJS.Timeout = undefined;
    private _drawerScores: any = {};
    private _guesserScores: any = {};
    private _finishedCallback?: () => void;

    constructor(id: string) {
        this._id = id;
        this._players = [];
        this._timerInterval = setInterval((this.checkTimer).bind(this), 1000);
    }

    public secondsLeft(): number {
        if (this._gameStartedTime === undefined) { return 1; }
        return this._secondsInTimer - this.secondsBetweenDates(this._gameStartedTime, new Date());
    }

    public getPlayer(id: string): Player {
        for (const player of this._players) {
            if (player.id === id) {
                return player;
            }
        }

        throw new PlayerNotFoundError();
    }

    public onFinished(callback: () => void): void {
        this._finishedCallback = callback;
    }

    public addPlayer(player: Player): void {

        this._players.push(player);
        this._notGuessingPlayerIds.push(player.id);

        this.listenToPlayerEvents(player);

        const joined = new JoinedMessage();
        joined.playerId = player.id;
        joined.room = this.id;
        joined.players = this._players;
        joined.scores = this.getScoresTable();
        player.send(joined);

        this.notifyOthers(player, new NewPlayerMessage(player));
    }

    private listenToPlayerEvents(player: Player) {
        player.on('chat', ((source: Player, m: ChatMessage) => {
            if (this._currentDrawerIndex !== undefined &&
                this.normalizeString(m.content) === this.normalizeString(this._currentWord)) {
                this.playerGuessedCorrectly(source);
            } else if (this._currentDrawerIndex !== undefined && this.isSimilarWord(m.content, this._currentWord)) {
                this.playerGuessedClose(source);
            } else {
                const newChat = new NewChatMessage();
                newChat.senderId = source.id;
                newChat.content = m.content;
                this.notifyOthers(source, newChat);
            }
        }).bind(this));
        player.on('clear-canvas', ((source: Player, m: ClearCanvasMessage) => {
            if (this._currentDrawerIndex !== undefined && this._players[this._currentDrawerIndex].id === source.id) {
                this.notifyOthers(source, new ClearCanvasOut());
            }
        }).bind(this));
        player.on('start-game', ((source: Player, m: StartGameMessage) => {
            if (!this._started && this._players && this._players.length >= 2) {
                this._started = true;
                this.startNextRound();
            }
        }).bind(this));
        player.on('coordinates', ((source: Player, c: Uint16Array) => {
            if (source.id !== this._players[this._currentDrawerIndex].id) { return; }
            this.broadcastCoordinates(source, c);
        }).bind(this));
        player.on('drawing-settings', ((source: Player, m: DrawingSettings) => {
            if (source.id !== this._players[this._currentDrawerIndex].id) { return; }
            const d = new NewDrawingSettingsMessage();
            d.colour = m.colour;
            d.eraser = m.eraser;
            d.fillBucket = m.fillBucket;
            this.notifyOthers(source, d);
        }).bind(this));

        player.on('media-offer', this.webrtcFoward.bind(this));
        player.on('media-answer', this.webrtcFoward.bind(this));
        player.on('new-ice-candidate', this.webrtcFoward.bind(this));

        player.on('change-video-status', ((source: Player, m: ChangeVideoStatusMessage) => {
            const messageOut = new PlayerChangedVideoStatus(source.id, m.active);
            this.notifyOthers(source, messageOut);
        }).bind(this));

        player.on('player-left', ((source: Player) => {
            if (this._players.length <= 1) {
                if (this._finishedCallback) {
                    clearInterval(this._timerInterval);
                    this._finishedCallback();
                }
                return;
            }

            this.notifyOthers(player, new PlayerLeftMessage(player.id));

            const playerIndex = this._players.indexOf(player);

            if (playerIndex >= 0) {
                this._players.splice(playerIndex, 1);
            }

            if (playerIndex === this._currentDrawerIndex) {
                this.startNextRound('drawer-left');
            }
        }));
    }

    private webrtcFoward(from: Player, m: MediaOfferMessage | MediaAnswerMessage | ICECandidateMessage): void {
        const to = this.getPlayer(m.receiverId);
        to.send(m);
    }

    private getScoresTable(): any {
        return {
            drawer_scores: this._drawerScores,
            guesser_scores: this._guesserScores,
        };
    }

    private secondsBetweenDates(t1: Date, t2: Date) {
        const dif = t1.getTime() - t2.getTime();
        const seconds = dif / 1000;
        const secondsAbs = Math.abs(seconds);
        return Math.round(secondsAbs);
    }

    private normalizeString(s: string): string {
        const lower = s.toLowerCase();
        let out = '';
        const allowed = 'abcdefghijklmnopqrstuvwxyz012346789';
        for (const c of lower) {
            if (allowed.includes(c)) {
                out += c;
            }
        }
        return out;
    }

    private isSimilarWord(guess: string, correct: string): boolean {
        const g = this.normalizeString(guess);
        const c = this.normalizeString(correct);
        if (g.includes(c)) { return true; }
        if (c.substr(0, c.length - 2) === g) { return true; }
        if (c.substr(0, c.length - 1) === g) { return true; }
        if (c.substr(1, c.length - 1) === g) { return true; }
        return false;
    }

    private sendSpoilerAlert(p: Player) {
        const m = new SpoilerAlertMessage();
        p.send(m);
    }

    private sendAlreadyCorrect(p: Player) {
        const m = new AlreadyCorrectMessage();
        p.send(m);
    }

    private isCheater(p: Player) {
        if (p.id === this._players[this._currentDrawerIndex].id) {
            this.sendSpoilerAlert(p);
            return true;
        }
        if (this._notGuessingPlayerIds.includes(p.id)) {
            this.sendSpoilerAlert(p);
            return true;
        }
        if (this._guessedCorrectly.includes(p.id)) {
            this.sendAlreadyCorrect(p);
            return true;
        }
        return false;
    }

    private playerGuessedCorrectly(p: Player) {
        if (this.isCheater(p)) { return; }
        const guesserScore = this._amountOfPlayersGuessing - this._guessedCorrectly.length;
        if (!(this._guesserScores as any)[p.id]) {
            (this._guesserScores as any)[p.id] = guesserScore;
        } else {
            (this._guesserScores as any)[p.id] += guesserScore;
        }
        if (!(this._drawerScores as any)[this._players[this._currentDrawerIndex].id]) {
            (this._drawerScores as any)[this._players[this._currentDrawerIndex].id] = 1;
        } else {
            (this._drawerScores as any)[this._players[this._currentDrawerIndex].id] += 1;
        }
        this._guessedCorrectly.push(p.id);
        const m = new CorrectGuessMessage();
        m.playerId =  p.id;
        m.scores = this.getScoresTable();
        this.notifyEveryone(m);
        if (this._guessedCorrectly.length >= this._amountOfPlayersGuessing) { this.startNextRound(); }
    }

    private playerGuessedClose(p: Player) {
        if (this.isCheater(p)) { return; }
        const m = new CloseGuessMessage();
        m.playerId =  p.id;
        this.notifyEveryone(m);
    }

    private randInt(min: number, max: number) {
        return Math.floor(Math.random() * (max - min + 1) + min);
    }

    private checkTimer() {
        if (this.secondsLeft() < 0) {
            this.startNextRound('time-up');
        }
    }

    private startNextRound(reason?: 'everyone-correct' | 'time-up' | 'drawer-left') {
        if (!reason) { reason = 'everyone-correct'; }
        this._guessedCorrectly = [];
        this.nextWord();
        this.nextDrawer();
        this._gameStartedTime = new Date();
        this.broadcastRound(reason);
    }

    private broadcastRound(reason: 'everyone-correct' | 'time-up' | 'drawer-left') {
        let drawer: Player;
        const m: NextWordMessage = new NextWordMessage();
        m.drawerId = this._players[this._currentDrawerIndex].id;
        m.prev_word = this._prevWord;
        m.game_started_time = this._gameStartedTime;
        m.seconds_in_timer = this._secondsInTimer;
        m.reason = reason;
        for (const player of this._players) {
            if (player.id === this._players[this._currentDrawerIndex].id) {
                drawer = player;
            } else {
                player.send(m);
            }
        }
        m.word = this._currentWord;
        drawer.send(m);
    }

    private nextDrawer() {
        if (!this._players || this._players.length <= 0) { this._currentDrawerIndex = undefined; } else {
            if (this._currentDrawerIndex === undefined) { this._currentDrawerIndex = -1; }
            this._currentDrawerIndex++;
            this._currentDrawerIndex %= this._players.length;
            this._amountOfPlayersGuessing = this._players.length - 1;
            this._notGuessingPlayerIds = [];
        }
    }

    private nextWord() {
        this._prevWord = this._currentWord;
        let index;
        do {
            index = this.randInt(0, words.nl.length - 1);
        } while (this._usedWords.includes(index));
        this._usedWords.push(index);
        this._currentWord = words.nl[index];
    }

    private notifyOthers(thisPlayer: Player, message: BaseMessage): void {
        for (const player of this._players) {
            if (player === thisPlayer) {
                continue;
            }

            player.send(message);
        }
    }
    private notifyEveryone(message: BaseMessage): void {
        for (const player of this._players) {
            player.send(message);
        }
    }
    private broadcastCoordinates(source: Player, c: Uint16Array) {
        for (const player of this._players) {
            if (player === source) {
                continue;
            }

            player.sendCoordinates(c);
        }
    }
}
