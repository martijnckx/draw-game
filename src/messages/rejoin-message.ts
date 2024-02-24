import { Length } from 'class-validator';
import BaseMessage from './base-message';

export default class RejoinMessage extends BaseMessage {
    public event: 'rejoin';

    @Length(36, 36)
    public playerId: string;

    @Length(4)
    public room: string;

    constructor(playerId: string, room: string) {
        super();
        this.event = 'rejoin';
        this.room = room;
        this.playerId = playerId;
    }
}
