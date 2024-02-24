import BaseMessageOutgoing from './base-message.out';

export default class ErrorMessage extends BaseMessageOutgoing {
    public event: 'error';
    public code: string;

    constructor() {
        super();
        this.event = 'error';
    }
}
