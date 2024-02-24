import { Length } from 'class-validator';
import BaseMessage from './base-message';

export default class JoinMessage extends BaseMessage {
    public event: 'join';

    @Length(1, 12)
    public name: string;

    @Length(4)
    public room: string;

    constructor() {
        super();
        this.event = 'join';
    }
}
