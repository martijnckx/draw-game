import BaseMessageOutgoing from './base-message.out';

export default class CorrectGuessMessage extends BaseMessageOutgoing {
    public event: 'correct-guess' = 'correct-guess';
    public playerId: string = '';
    public scores: any = {};

    constructor() {
        super();
    }
}
