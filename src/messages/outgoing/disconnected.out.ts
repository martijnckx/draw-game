import BaseMessageOutgoing from './base-message.out';

export default class DisconnectedMessage extends BaseMessageOutgoing {
    public event: 'disconnected' = 'disconnected';

    constructor() {
        super();
    }
}
