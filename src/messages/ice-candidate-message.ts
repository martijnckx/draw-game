import BaseMessage from './base-message';

export default class ICECandidateMessage extends BaseMessage {
    public event: 'new-ice-candidate' = 'new-ice-candidate';
    constructor(public senderId: string, public receiverId: string, public payload: any) {
        super();
    }
}
