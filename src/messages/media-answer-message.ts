import BaseMessage from './base-message';

export default class MediaAnswerMessage extends BaseMessage {
    public event: 'media-answer' = 'media-answer';
    constructor(public senderId: string, public receiverId: string, public payload: any) {
        super();
    }
}
