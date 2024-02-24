import BaseMessageOutgoing from './base-message.out';

export default class SpoilerAlertMessage extends BaseMessageOutgoing {
    public event: 'spoiler-alert' = 'spoiler-alert';

    constructor() {
        super();
    }
}
