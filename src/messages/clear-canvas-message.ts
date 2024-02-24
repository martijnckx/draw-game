import BaseMessage from './base-message';

export default class ClearCanvasMessage extends BaseMessage {
    public event: 'clear-canvas' = 'clear-canvas';

    constructor() {
        super();
    }
}
