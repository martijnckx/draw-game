import BaseMessage from './base-message';

export default class LeaveMessage extends BaseMessage {
    public event: 'leave';

    constructor() {
        super();
        this.event = 'leave';
    }
}
