import OutgoingPictionaryMessage from '../../messages/outgoing/outgoing-messages.out';
import JoinMessage from '../../messages/join-message';
import CreateMessage from '../../messages/create-message';
import { deserialize } from 'class-transformer';
import BaseMessage from '../../messages/base-message';
import DrawingSettings from '../../messages/drawing-settings';
import ChatMessage from '../../messages/chat-message';
import BaseMessageOutgoing from '../../messages/outgoing/base-message.out';
import CoordsMessage from '../../messages/outgoing/coords.out';
import RejoinMessage from '../../messages/rejoin-message';
import JoinedMessage from '../../messages/outgoing/joined-message.out';
import DisconnectedMessage from '../../messages/outgoing/disconnected.out';
import StartGameMessage from '../../messages/start-game-message';
import ClearCanvasMessage from '../../messages/clear-canvas-message';

type ServerMessageListerner = (message: BaseMessageOutgoing) => void;

export default class PictionaryServerConnection {
    private ws?: WebSocket;
    private subscribers: { [event: string]: ServerMessageListerner[] };
    private playerId?: string;
    private room?: string;
    private rejoinCounter: number;

    constructor() {
        this.subscribers = { joined: []};
        this.rejoinCounter = 0;
    }

    public joinRoom(room: string, name: string) {
        this.room = room;
        this.createWs(() => {
            const joinMessage = new JoinMessage();
            joinMessage.name = name;
            joinMessage.room = room;
            this.sendMessage(joinMessage);
        });
    }

    public createRoom(name: string) {
        this.createWs(() => {
            const createMessage = new CreateMessage();
            createMessage.name = name;
            this.sendMessage(createMessage);
        });
    }

    public sendClearCanvas() {
        this.sendMessage(new ClearCanvasMessage());
    }

    public sendChatMessage(content: string) {
        const chatMessage = new ChatMessage();
        chatMessage.content = content;
        this.sendMessage(chatMessage);
    }

    public sendDrawingSettings(colour: string, eraser: boolean, fillBucket: boolean) {
        const drawingSettings = new DrawingSettings(colour, eraser, fillBucket);
        this.sendMessage(drawingSettings);
    }

    public startGame() {
        this.sendMessage(new StartGameMessage());
    }

    public sendCoordinates(fromX: number, fromY: number, toX: number, toY: number) {
        const coords = new Uint16Array(4);
        coords[0] = fromX;
        coords[1] = fromY;
        coords[2] = toX;
        coords[3] = toY;
        this.ws!.send(coords);
    }

    public on(event: string, listener: ServerMessageListerner) {
        if (this.subscribers[event] === undefined) {
            this.subscribers[event] = [];
        }

        this.subscribers[event].push(listener);

    }

    public sendMessage(message: BaseMessage) {
        this.ws!.send(JSON.stringify({message}));
    }

    private createWs(onOpen: () => void): void {
        this.ws = new WebSocket(`wss://${window.location.host}/socket`);

        this.ws.onmessage = (message: MessageEvent) => {
            if (message.data instanceof Blob) {
                new Response(message.data).arrayBuffer().then(((a: ArrayBuffer) => {
                    const c: Uint16Array = new Uint16Array(a);
                    const cm: CoordsMessage = new CoordsMessage(c[0], c[1], c[2], c[3]);
                    const m: OutgoingPictionaryMessage = new OutgoingPictionaryMessage();
                    m.message = cm;
                    this.notify('coords', m);
                }).bind(this));
                return;
            }
            const mess = deserialize(OutgoingPictionaryMessage, message.data);
            this.notify(mess.message.event, mess);

            if (mess.message.event === 'joined') {
                const m = mess.message as JoinedMessage;
                this.playerId = m.playerId;
                this.room = m.room;
            }

            if (mess.message.event === 'rejoin') {
                this.rejoinCounter = 0;
            }
        };

        this.ws.onopen = () => {
            onOpen();
        };

        this.ws.onclose = (ev: CloseEvent) => {
            this.onClose(ev);
        };
    }

    private onClose(ev: CloseEvent) {
        console.log(ev);
        this.notify('disconnected', { message: new DisconnectedMessage() });

        if (this.rejoinCounter < 10) {
            this.reJoin();
        }
    }

    private reJoin() {
        this.rejoinCounter++;
        this.createWs(() => {
            this.sendMessage(new RejoinMessage(this.playerId!, this.room!));
        });
    }

    private notify(event: string, message: OutgoingPictionaryMessage) {
        if (this.subscribers[event] !== undefined) {
            for (const listener of this.subscribers[event]) {
                listener(message.message);
            }
        }
    }
}
