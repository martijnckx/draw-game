import BaseMessageOutgoing from './base-message.out';

export default class PlayerChangedVideoStatus extends BaseMessageOutgoing {
    public event: 'player-changed-video-status';
    public playerId: string;
    public active: boolean;

    constructor(playerId: string, active: boolean) {
        super();
        this.event = 'player-changed-video-status';
        this.playerId = playerId;
        this.active = active;
    }
}
