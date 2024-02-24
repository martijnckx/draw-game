import BaseMessageOutgoing from './base-message.out';

export default class JoinedMessage extends BaseMessageOutgoing {
    public event: 'joined';
    public room: string = '';
    public playerId: string = '';
    public players: any;
    public scores: any;

    constructor() {
        super();
        this.event = 'joined';
    }
}
