import BaseMessageOutgoing from './base-message.out';

export default class MediaAnswerOutMessage extends BaseMessageOutgoing {
    public event: 'media-answer' = 'media-answer';
    constructor(public senderId: string, public receiverId: string, public payload: any) {
        super();
    }
}
