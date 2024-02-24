import BaseMessageOutgoing from './base-message.out';

export default class NextWordMessage extends BaseMessageOutgoing {
    public event: 'next-word' = 'next-word';
    public drawerId: string = '';
    public word: string = '';
    public reason: 'everyone-correct' | 'time-up' | 'drawer-left' = 'everyone-correct';
    public prev_word: string = '';
    public seconds_in_timer: number = 90;
    public game_started_time: Date = undefined;

    constructor() {
        super();
    }
}
