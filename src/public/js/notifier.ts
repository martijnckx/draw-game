interface Message {message: string; type: string; durationSeconds: number; }

export default class Notifier {

    private _app: any;
    private _currentlyVisisble: boolean = false;

    private messageQueue: Message[];

    constructor(app: any) {
        this._app = app;
        this.messageQueue = [];
    }

    public error(m: string, durationSeconds: number = 5) {
        this.messageQueue.push({
            message: m,
            type: 'error',
            durationSeconds,
        });
        if (!this._currentlyVisisble) { this.nextMessage(); }
    }

    public info(m: string, durationSeconds: number = 5) {
        this.messageQueue.push({
            message: m,
            type: 'info',
            durationSeconds,
        });
        if (!this._currentlyVisisble) { this.nextMessage(); }
    }

    public success(m: string, durationSeconds: number = 5) {
        this.messageQueue.push({
            message: m,
            type: 'success',
            durationSeconds,
        });
        if (!this._currentlyVisisble) { this.nextMessage(); }
    }

    private nextMessage() {
        const next: Message | undefined = this.messageQueue.shift();
        if (next !== undefined) {
            this._currentlyVisisble = true;
            this._app.notifyMessage = next.message;
            this._app.notifyStyle = next.type;
            setTimeout((this.nextMessage).bind(this), Math.round(next.durationSeconds * 1000));
        } else {
            this._currentlyVisisble = false;
            this._app.notifyMessage = '';
            this._app.notifyStyle = '';
        }
    }
}
