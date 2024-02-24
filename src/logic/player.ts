import WebSocket from 'ws';
import PictionaryMessage from '../messages/messages';
import EventEmitter from 'events';
import BaseMessageOutgoing from '../messages/outgoing/base-message.out';
import uuidv4 from 'uuid/v4';

import { validateOrReject } from 'class-validator';
import { onWsMessage } from '../utils';
import OutgoingPictionaryMessage from '../messages/outgoing/outgoing-messages.out';
import ErrorMessage from '../messages/outgoing/error-message.out';
import RejoinedMessage from '../messages/outgoing/rejoined.out';

export default class Player extends EventEmitter {
    private _ws: WebSocket;
    private _name: string;
    private _id: string;
    private _sockedIsOpen: boolean;
    private _sendQueue: Array<OutgoingPictionaryMessage | Uint16Array>;
    private _leaveTimer?: NodeJS.Timeout;
    private _disconnectTimeout = 5000;
    private _left = false;
    private _videoActive = false;
    private _socketIsAlive: boolean;
    private _socketPingInterval?: NodeJS.Timeout;

    constructor(ws: WebSocket, name: string) {
        super();
        this._ws = ws;
        this._name = name;
        this._id = uuidv4();
        this._sockedIsOpen = false;
        this._sendQueue = [];

        if (this._ws) { this.handleSocket(); }
    }

    get name(): string {
        return this._name;
    }

    get id(): string {
        return this._id;
    }

    public toJSON(): string {
        const obj: any = {id: this.id, name: this.name, videoActive: this._videoActive};
        return JSON.stringify(obj);
    }

    public reConnect(ws: WebSocket) {
        if (this._sockedIsOpen || this._left) {
            const err = new ErrorMessage();
            err.code = 'illegal-reconnect';
            ws.send(JSON.stringify({message: err}));
            ws.close();
        } else {
            if (this._leaveTimer !== undefined) {
                clearTimeout(this._leaveTimer);
                this._leaveTimer = undefined;
            }

            this._ws = ws;
            this.handleSocket();
            this.send(new RejoinedMessage());

            while (this._sendQueue.length > 0 && this._sockedIsOpen) {
                this._ws.send(this._sendQueue.shift());
            }
        }
    }

    public send(message: BaseMessageOutgoing) {
        const pictMessage = new OutgoingPictionaryMessage();
        pictMessage.message = message;

        if (this._sockedIsOpen) {
            this._ws.send(JSON.stringify(pictMessage));
        } else {
            this._sendQueue.push(pictMessage);
        }
    }

    public sendCoordinates(c: Uint16Array) {
        if (this._sockedIsOpen) {
            this._ws.send(c);
        } else {
            this._sendQueue.push(c);
        }
    }

    private handleStructuredMessage(m: PictionaryMessage) {
        if (m.message.event === 'change-video-status') {
            this._videoActive = m.message.active;
        }

        this.emit(m.message.event, this, m.message);
    }

    private handleCoordinates(c: Uint16Array) {
        this.emit('coordinates', this, c);
    }

    private handleSocket(): void {
        this._sockedIsOpen = true;
        onWsMessage(this._ws, this.handleStructuredMessage.bind(this), this.handleCoordinates.bind(this));
        this._ws.on('close', (code, reason) => {
            this._sockedIsOpen = false;
            clearInterval(this._socketPingInterval);

            this._leaveTimer = setTimeout(() => {
                this.playerLeft();
            }, this._disconnectTimeout);
        });

        this._socketIsAlive = true;

        this._ws.on('pong', () => {
            this._socketIsAlive = true;
        });

        this._socketPingInterval = setInterval(() => {
            if (!this._socketIsAlive) {
                return this._ws.terminate();
            }

            this._socketIsAlive = false;
            this._ws.ping();
        }, 30000);
    }

    private playerLeft(): void {
        this._left = true;
        this.emit('player-left');
    }
}
