import BaseMessageOutgoing from './base-message.out';

export default class ClearCanvasOut extends BaseMessageOutgoing {
    public event: 'clear-canvas-out' = 'clear-canvas-out';

    constructor() {
        super();
    }
}
