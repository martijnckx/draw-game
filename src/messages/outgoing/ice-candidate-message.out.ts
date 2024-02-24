import BaseMessageOutgoing from './base-message.out';

export default class ICECandidateOutMessage extends BaseMessageOutgoing {
    public event: 'new-ice-candidate' = 'new-ice-candidate';
    constructor(public senderId: string, public receiverId: string, public payload: any) {
        super();
    }
}
