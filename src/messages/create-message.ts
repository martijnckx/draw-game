import { Length } from 'class-validator';
import BaseMessage from './base-message';

export default class CreateMessage extends BaseMessage {
    public event: 'create';

    @Length(1, 12)
    public name: string;

    constructor() {
        super();
        this.event = 'create';
    }
}
