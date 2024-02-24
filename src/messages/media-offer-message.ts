import BaseMessage from './base-message';

export default class MediaOfferMessage extends BaseMessage {
    public event: 'media-offer' = 'media-offer';

    constructor(public senderId: string, public receiverId: string, public payload: any) {
        super();
    }
}
