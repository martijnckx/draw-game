import BaseMessageOutgoing from './base-message.out';

export default class NewDrawingSettingsMessage extends BaseMessageOutgoing {
    public event: 'new-drawing-settings' = 'new-drawing-settings';
    public colour: string = '';
    public eraser: boolean = false;
    public fillBucket: boolean = false;

    constructor() {
        super();
    }
}
