import BaseMessageOutgoing from './base-message.out';

export default class PlayerLeftMessage extends BaseMessageOutgoing {
    public event: 'player-left';
    public playerId: string;

    constructor(playerId: string) {
        super();
        this.event = 'player-left';
        this.playerId = playerId;
    }
}
