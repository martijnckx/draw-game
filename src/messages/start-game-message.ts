import BaseMessage from './base-message';

export default class StartGameMessage extends BaseMessage {
    public event: 'start-game' = 'start-game';

    constructor() {
        super();
    }
}
