import { Length } from 'class-validator';

export default class BaseMessage {
    @Length(1)
    public event: string;
}
