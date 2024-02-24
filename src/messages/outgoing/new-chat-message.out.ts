import BaseMessageOutgoing from './base-message.out';

export default class NewChatMessage extends BaseMessageOutgoing {
    public event: 'new-chat' = 'new-chat';
    public content: string = '';
    public senderId: string = '';

    constructor() {
        super();
    }
}
