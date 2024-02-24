import BaseMessageOutgoing from './base-message.out';

export default class RejoinedMessage extends BaseMessageOutgoing {
    public event: 'rejoin' = 'rejoin';

    constructor() {
        super();
    }
}
