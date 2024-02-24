import BaseMessageOutgoing from './base-message.out';

export default class CoordsMessage extends BaseMessageOutgoing {
    public event: 'coords' = 'coords';
    public fromX: number;
    public fromY: number;
    public toX: number;
    public toY: number;

    constructor(fromX: number, fromY: number, toX: number, toY: number) {
        super();
        this.fromX = fromX;
        this.fromY = fromY;
        this.toX = toX;
        this.toY = toY;
    }
}
