import BaseMessageOutgoing from './base-message.out';

export default class CloseGuessMessage extends BaseMessageOutgoing {
    public event: 'close-guess' = 'close-guess';
    public playerId: string = '';

    constructor() {
        super();
    }
}
