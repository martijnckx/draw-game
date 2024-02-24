import BaseMessage from './base-message';

export default class ChangeVideoStatusMessage extends BaseMessage {
    public event: 'change-video-status';
    public active: boolean;

    constructor(active: boolean) {
        super();
        this.event = 'change-video-status';
        this.active = active;
    }
}
