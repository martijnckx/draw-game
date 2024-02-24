import BaseMessageOutgoing from './base-message.out';

export default class NewPlayerMessage extends BaseMessageOutgoing {
    public event: 'new-player';
    public player: any;

    constructor(player: any) {
        super();
        this.event = 'new-player';
        this.player = player;
    }
}
