import Game from './game';
import GameNotFoundError from './game-not-found.error';
import cryptoRandomString from 'crypto-random-string';

export default class PictionaryServer {
    private games: { [id: string]: Game; };

    constructor() {
        this.games = {};
    }

    public find(id: string): Game {
        id = id.trim().toUpperCase();
        const game = this.games[id];

        if (game === undefined) {
            throw new GameNotFoundError();
        }

        return game;
    }

    public create(): Game {
        const id = this.generateNewGameId();
        this.games[id] = new Game(id);
        this.games[id].onFinished(() => {
            delete this.games[id];
        });

        return this.games[id];
    }

    private generateNewGameId(): string {
        let id;

        while (id === undefined || this.games[id] !== undefined) {
            id = cryptoRandomString({length: 4, characters: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'});
        }

        return id;
    }
}
