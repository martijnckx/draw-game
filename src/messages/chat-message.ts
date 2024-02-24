import { Length } from 'class-validator';
import BaseMessage from './base-message';

export default class ChatMessage extends BaseMessage {
    public event: 'chat' = 'chat';

    @Length(1, 100)
    public content: string = '';

    constructor() {
        super();
    }
}
