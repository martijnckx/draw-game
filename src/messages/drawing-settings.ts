import BaseMessage from './base-message';

export default class DrawingSettings extends BaseMessage {
    public event: 'drawing-settings' = 'drawing-settings';

    public colour: string = 'black';
    public eraser: boolean = false;
    public fillBucket: boolean = false;

    constructor(colour: string, eraser: boolean, fillBucket: boolean) {
        super();
        this.colour = colour;
        this.eraser = eraser;
        this.fillBucket = fillBucket;
    }
}
