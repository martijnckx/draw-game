import BaseMessageOutgoing from './base-message.out';

export default class MediaOfferOutMessage extends BaseMessageOutgoing {
    public event: 'media-offer' = 'media-offer';
    constructor(public senderId: string, public receiverId: string, public payload: any) {
        super();
    }
}
