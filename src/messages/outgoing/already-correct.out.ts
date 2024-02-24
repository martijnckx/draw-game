import BaseMessageOutgoing from './base-message.out';

export default class AlreadyCorrectMessage extends BaseMessageOutgoing {
    public event: 'already-correct' = 'already-correct';

    constructor() {
        super();
    }
}
